(define-constant ERR_NOT_AUTHORIZED u100)
(define-constant ERR_INVALID_CONTENT u101)
(define-constant ERR_INVALID_TEMPLATE u102)
(define-constant ERR_ALREADY_ISSUED u103)
(define-constant ERR_INVALID_LICENSE u104)
(define-constant ERR_EXPIRED u105)
(define-constant ERR_INVALID_AMOUNT u106)
(define-constant ERR_ESCROW_FAILED u107)
(define-constant ERR_INVALID_RECIPIENT u108)
(define-constant ERR_LICENSE_NOT_FOUND u109)

(define-data-var last-agreement-id uint u0)
(define-data-var last-license-id uint u0)
(define-data-var platform-fee uint u100)

(define-map Agreements
  { agreement-id: uint }
  {
    content-id: uint,
    template-id: uint,
    creator: principal,
    licensee: (optional principal),
    royalty-rate: uint,
    duration: uint,
    start-block: uint,
    status: (string-ascii 20),
    price: uint,
    max-transfers: uint
  }
)

(define-map Licenses
  { license-id: uint }
  {
    agreement-id: uint,
    owner: principal,
    issued-at: uint,
    transfer-count: uint
  }
)

(define-map RoyaltyRecipients
  { agreement-id: uint, recipient: principal }
  { share: uint }
)

(define-public (create-agreement
  (content-id uint)
  (template-id uint)
  (royalty-rate uint)
  (duration uint)
  (price uint)
  (max-transfers uint))
  (let
    (
      (agreement-id (+ (var-get last-agreement-id) u1))
      (creator tx-sender)
    )
    (asserts! (is-content-valid content-id) (err ERR_INVALID_CONTENT))
    (asserts! (is-template-valid template-id) (err ERR_INVALID_TEMPLATE))
    (asserts! (is-creator-registered creator) (err ERR_NOT_AUTHORIZED))
    (asserts! (> price u0) (err ERR_INVALID_AMOUNT))
    (asserts! (<= royalty-rate u10000) (err ERR_INVALID_AMOUNT))
    (map-insert Agreements
      { agreement-id: agreement-id }
      {
        content-id: content-id,
        template-id: template-id,
        creator: creator,
        licensee: none,
        royalty-rate: royalty-rate,
        duration: duration,
        start-block: block-height,
        status: "active",
        price: price,
        max-transfers: max-transfers
      }
    )
    (var-set last-agreement-id agreement-id)
    (ok agreement-id)
  )
)

(define-public (issue-license (agreement-id uint) (licensee principal))
  (let
    (
      (license-id (+ (var-get last-license-id) u1))
      (agreement (unwrap! (map-get? Agreements { agreement-id: agreement-id }) (err ERR_INVALID_LICENSE)))
      (creator (get creator agreement))
    )
    (asserts! (is-eq creator tx-sender) (err ERR_NOT_AUTHORIZED))
    (asserts! (is-eq (get status agreement) "active") (err ERR_INVALID_LICENSE))
    (asserts! (is-none (get licensee agreement)) (err ERR_ALREADY_ISSUED))
    (asserts! (not (is-eq licensee creator)) (err ERR_INVALID_RECIPIENT))
    (map-set Agreements
      { agreement-id: agreement-id }
      (merge agreement { licensee: (some licensee) })
    )
    (map-insert Licenses
      { license-id: license-id }
      {
        agreement-id: agreement-id,
        owner: licensee,
        issued-at: block-height,
        transfer-count: u0
      }
    )
    (var-set last-license-id license-id)
    (try! (contract-call? .PaymentEscrow deposit-escrow agreement-id licensee (get price agreement)))
    (try! (stx-transfer? (var-get platform-fee) licensee (as-contract tx-sender)))
    (ok license-id)
  )
)

(define-public (transfer-license (license-id uint) (new-owner principal))
  (let
    (
      (license (unwrap! (map-get? Licenses { license-id: license-id }) (err ERR_LICENSE_NOT_FOUND)))
      (agreement-id (get agreement-id license))
      (agreement (unwrap! (map-get? Agreements { agreement-id: agreement-id }) (err ERR_INVALID_LICENSE)))
    )
    (asserts! (is-eq (get owner license) tx-sender) (err ERR_NOT_AUTHORIZED))
    (asserts! (< (get transfer-count license) (get max-transfers agreement)) (err ERR_INVALID_LICENSE))
    (asserts! (is-eq (get status agreement) "active") (err ERR_INVALID_LICENSE))
    (asserts! (<= (+ (get start-block agreement) (get duration agreement)) block-height) (err ERR_EXPIRED))
    (map-set Licenses
      { license-id: license-id }
      (merge license { owner: new-owner, transfer-count: (+ (get transfer-count license) u1) })
    )
    (ok true)
  )
)

(define-public (set-royalty-recipient (agreement-id uint) (recipient principal) (share uint))
  (let
    (
      (agreement (unwrap! (map-get? Agreements { agreement-id: agreement-id }) (err ERR_INVALID_LICENSE)))
    )
    (asserts! (is-eq (get creator agreement) tx-sender) (err ERR_NOT_AUTHORIZED))
    (asserts! (> share u0) (err ERR_INVALID_AMOUNT))
    (map-set RoyaltyRecipients
      { agreement-id: agreement-id, recipient: recipient }
      { share: share }
    )
    (ok true)
  )
)

(define-read-only (verify-license (license-id uint))
  (match (map-get? Licenses { license-id: license-id })
    license
      (let
        (
          (agreement (unwrap! (map-get? Agreements { agreement-id: (get agreement-id license) }) (err ERR_INVALID_LICENSE)))
        )
        (if (and
              (is-eq (get status agreement) "active")
              (<= (+ (get start-block agreement) (get duration agreement)) block-height))
          (ok { owner: (get owner license), agreement: agreement })
          (err ERR_EXPIRED)
        )
      )
    (err ERR_LICENSE_NOT_FOUND)
  )
)

(define-read-only (get-agreement-details (agreement-id uint))
  (map-get? Agreements { agreement-id: agreement-id })
)

(define-read-only (get-license-details (license-id uint))
  (map-get? Licenses { license-id: license-id })
)

(define-read-only (get-royalty-recipient (agreement-id uint) (recipient principal))
  (map-get? RoyaltyRecipients { agreement-id: agreement-id, recipient: recipient })
)

(define-read-only (is-content-valid (content-id uint))
  (ok true)
)

(define-read-only (is-template-valid (template-id uint))
  (ok true)
)

(define-read-only (is-creator-registered (creator principal))
  (ok true)
)

(define-public (set-platform-fee (fee uint))
  (begin
    (asserts! (is-eq tx-sender (as-contract tx-sender)) (err ERR_NOT_AUTHORIZED))
    (var-set platform-fee fee)
    (ok true)
  )
)