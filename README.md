# 🎥 Immutable Film and Media Licensing Platform

Welcome to a revolutionary blockchain-based solution for film and media licensing! This project addresses real-world challenges in the entertainment industry, such as opaque royalty distributions, lengthy contract negotiations, intermediary fees, and disputes over usage rights. By leveraging the Stacks blockchain and Clarity smart contracts, creators can register content, automate licensing agreements, ensure transparent royalty payments, and resolve disputes immutably—reducing costs and building trust between creators, distributors, and consumers.

## ✨ Features

🔒 Immutable registration of film/media content with provenance tracking  
📜 Automated creation of customizable licensing agreements  
💰 Smart royalty splitting and instant micropayments  
🛡️ Built-in dispute resolution via on-chain arbitration  
🔍 Transparent verification of licenses and usage rights  
🚀 Marketplace for buying/selling licenses as NFTs  
📈 Analytics for tracking content performance and earnings  
🚫 Anti-piracy measures through hash-based content verification  

## 🛠 How It Works

This platform uses 8 Clarity smart contracts to handle the end-to-end licensing lifecycle. Creators upload content metadata and hashes (off-chain storage like IPFS for actual files), define licenses, and automate payments. Distributors/licensees can browse, purchase, and verify rights seamlessly. All transactions use STX or SIP-10 tokens for payments.

### Core Smart Contracts
1. **CreatorRegistry.clar**: Registers users as creators or licensees, storing profiles and verification status (e.g., KYC hashes). Functions: `register-creator`, `verify-user`.  
2. **ContentRegistry.clar**: Logs film/media assets with unique hashes, titles, descriptions, and metadata. Prevents duplicates and provides timestamped proof of ownership. Functions: `register-content`, `get-content-details`.  
3. **LicenseTemplate.clar**: Defines reusable license templates (e.g., exclusive, non-exclusive, time-bound). Includes terms like duration, territories, and royalty rates. Functions: `create-template`, `get-template`.  
4. **LicensingAgreement.clar**: Generates specific agreements by combining templates with content IDs. Creates NFT-like tokens representing the license. Functions: `create-agreement`, `transfer-license`.  
5. **RoyaltySplitter.clar**: Automates royalty distributions based on agreement terms. Splits payments among creators, producers, and stakeholders using predefined shares. Functions: `distribute-royalties`, `claim-share`.  
6. **PaymentEscrow.clar**: Holds funds in escrow until license conditions are met (e.g., usage verified). Releases payments automatically or refunds on disputes. Functions: `deposit-escrow`, `release-funds`.  
7. **DisputeArbitrator.clar**: Initiates and resolves disputes via on-chain voting by staked arbitrators or oracle integration. Locks funds during arbitration. Functions: `file-dispute`, `resolve-dispute`.  
8. **Marketplace.clar**: A decentralized exchange for listing, bidding on, and trading licenses. Integrates with royalty and escrow contracts for seamless transactions. Functions: `list-license`, `buy-license`.  

**For Creators**  
- Register yourself and your content using `CreatorRegistry` and `ContentRegistry`.  
- Define license templates in `LicenseTemplate`.  
- Create agreements via `LicensingAgreement` and list them on the `Marketplace`.  
- Royalties flow automatically through `RoyaltySplitter` when licenses are used or sold.  

**For Distributors/Licensees**  
- Browse registered content and licenses using query functions across contracts.  
- Purchase via `Marketplace`, with funds held in `PaymentEscrow`.  
- Verify ownership and terms with `get-content-details` and `verify-license`.  
- If issues arise, file a dispute in `DisputeArbitrator` for fair resolution.  

**For Verifiers/Auditors**  
- Use public read functions like `get-agreement-details` or `verify-ownership` to confirm rights instantly.  
- Track royalties and disputes transparently on the blockchain.  

This setup solves inefficiencies in traditional licensing by eliminating middlemen, ensuring payments are fair and timely, and providing immutable records to prevent fraud. Deploy on Stacks for Bitcoin-secured finality! 🚀