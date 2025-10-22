import { describe, it, expect, beforeEach } from "vitest";
import { ClarityValue, stringAsciiCV, uintCV, principalCV, noneCV, someCV, tupleCV } from "@stacks/transactions";

interface Agreement {
  contentId: number;
  templateId: number;
  creator: string;
  licensee: string | null;
  royaltyRate: number;
  duration: number;
  startBlock: number;
  status: string;
  price: number;
  maxTransfers: number;
}

interface License {
  agreementId: number;
  owner: string;
  issuedAt: number;
  transferCount: number;
}

interface RoyaltyRecipient {
  share: number;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class LicensingAgreementMock {
  state: {
    lastAgreementId: number;
    lastLicenseId: number;
    platformFee: number;
    agreements: Map<number, Agreement>;
    licenses: Map<number, License>;
    royaltyRecipients: Map<string, RoyaltyRecipient>;
  } = {
    lastAgreementId: 0,
    lastLicenseId: 0,
    platformFee: 100,
    agreements: new Map(),
    licenses: new Map(),
    royaltyRecipients: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1CREATOR";
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];
  escrowCalls: Array<{ agreementId: number; licensee: string; amount: number }> = [];

  reset(): void {
    this.state = {
      lastAgreementId: 0,
      lastLicenseId: 0,
      platformFee: 100,
      agreements: new Map(),
      licenses: new Map(),
      royaltyRecipients: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1CREATOR";
    this.stxTransfers = [];
    this.escrowCalls = [];
  }

  createAgreement(contentId: number, templateId: number, royaltyRate: number, duration: number, price: number, maxTransfers: number): Result<number> {
    if (!this.isContentValid(contentId).value || !this.isTemplateValid(templateId).value || !this.isCreatorRegistered(this.caller).value) {
      return { ok: false, value: 101 };
    }
    if (price <= 0 || royaltyRate > 10000) return { ok: false, value: 106 };
    const agreementId = this.state.lastAgreementId + 1;
    this.state.agreements.set(agreementId, {
      contentId, templateId, creator: this.caller, licensee: null, royaltyRate, duration,
      startBlock: this.blockHeight, status: "active", price, maxTransfers
    });
    this.state.lastAgreementId = agreementId;
    return { ok: true, value: agreementId };
  }

  issueLicense(agreementId: number, licensee: string): Result<number> {
    const agreement = this.state.agreements.get(agreementId);
    if (!agreement || agreement.creator !== this.caller || agreement.status !== "active" || agreement.licensee !== null || licensee === this.caller) {
      return { ok: false, value: 100 };
    }
    const licenseId = this.state.lastLicenseId + 1;
    this.state.agreements.set(agreementId, { ...agreement, licensee });
    this.state.licenses.set(licenseId, { agreementId, owner: licensee, issuedAt: this.blockHeight, transferCount: 0 });
    this.state.lastLicenseId = licenseId;
    this.escrowCalls.push({ agreementId, licensee, amount: agreement.price });
    this.stxTransfers.push({ amount: this.state.platformFee, from: licensee, to: "contract" });
    return { ok: true, value: licenseId };
  }

  transferLicense(licenseId: number, newOwner: string): Result<boolean> {
    const license = this.state.licenses.get(licenseId);
    if (!license) return { ok: false, value: false };
    const agreement = this.state.agreements.get(license.agreementId);
    if (!agreement || license.owner !== this.caller || agreement.status !== "active" || license.transferCount >= agreement.maxTransfers || this.blockHeight > agreement.startBlock + agreement.duration) {
      return { ok: false, value: false };
    }
    this.state.licenses.set(licenseId, { ...license, owner: newOwner, transferCount: license.transferCount + 1 });
    return { ok: true, value: true };
  }

  setRoyaltyRecipient(agreementId: number, recipient: string, share: number): Result<boolean> {
    const agreement = this.state.agreements.get(agreementId);
    if (!agreement || agreement.creator !== this.caller || share <= 0) return { ok: false, value: false };
    this.state.royaltyRecipients.set(`${agreementId}-${recipient}`, { share });
    return { ok: true, value: true };
  }

  verifyLicense(licenseId: number): Result<{ owner: string; agreement: Agreement } | number> {
    const license = this.state.licenses.get(licenseId);
    if (!license) return { ok: false, value: 109 };
    const agreement = this.state.agreements.get(license.agreementId);
    if (!agreement || agreement.status !== "active" || this.blockHeight > agreement.startBlock + agreement.duration) {
      return { ok: false, value: 105 };
    }
    return { ok: true, value: { owner: license.owner, agreement } };
  }

  getAgreementDetails(agreementId: number): Agreement | null {
    return this.state.agreements.get(agreementId) || null;
  }

  getLicenseDetails(licenseId: number): License | null {
    return this.state.licenses.get(licenseId) || null;
  }

  getRoyaltyRecipient(agreementId: number, recipient: string): RoyaltyRecipient | null {
    return this.state.royaltyRecipients.get(`${agreementId}-${recipient}`) || null;
  }

  isContentValid(contentId: number): Result<boolean> {
    return { ok: true, value: true };
  }

  isTemplateValid(templateId: number): Result<boolean> {
    return { ok: true, value: true };
  }

  isCreatorRegistered(creator: string): Result<boolean> {
    return { ok: true, value: true };
  }

  setPlatformFee(fee: number): Result<boolean> {
    if (this.caller !== "contract") return { ok: false, value: false };
    this.state.platformFee = fee;
    return { ok: true, value: true };
  }
}

describe("LicensingAgreement", () => {
  let contract: LicensingAgreementMock;

  beforeEach(() => {
    contract = new LicensingAgreementMock();
    contract.reset();
  });

  it("creates agreement successfully", () => {
    const result = contract.createAgreement(1, 1, 500, 1000, 1000, 5);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(1);
    const agreement = contract.getAgreementDetails(1);
    expect(agreement).toEqual({
      contentId: 1, templateId: 1, creator: "ST1CREATOR", licensee: null, royaltyRate: 500,
      duration: 1000, startBlock: 0, status: "active", price: 1000, maxTransfers: 5
    });
  });

  it("rejects agreement with invalid price", () => {
    const result = contract.createAgreement(1, 1, 500, 1000, 0, 5);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(106);
  });

  it("issues license successfully", () => {
    contract.createAgreement(1, 1, 500, 1000, 1000, 5);
    const result = contract.issueLicense(1, "ST2LICENSEE");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(1);
    expect(contract.getLicenseDetails(1)).toEqual({ agreementId: 1, owner: "ST2LICENSEE", issuedAt: 0, transferCount: 0 });
    expect(contract.escrowCalls).toEqual([{ agreementId: 1, licensee: "ST2LICENSEE", amount: 1000 }]);
    expect(contract.stxTransfers).toEqual([{ amount: 100, from: "ST2LICENSEE", to: "contract" }]);
  });

  it("rejects license issuance by non-creator", () => {
    contract.createAgreement(1, 1, 500, 1000, 1000, 5);
    contract.caller = "ST2FAKE";
    const result = contract.issueLicense(1, "ST2LICENSEE");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(100);
  });

  it("transfers license successfully", () => {
    contract.createAgreement(1, 1, 500, 1000, 1000, 5);
    contract.issueLicense(1, "ST2LICENSEE");
    contract.caller = "ST2LICENSEE";
    const result = contract.transferLicense(1, "ST3NEWOWNER");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.getLicenseDetails(1)?.owner).toBe("ST3NEWOWNER");
    expect(contract.getLicenseDetails(1)?.transferCount).toBe(1);
  });

  it("rejects transfer of expired license", () => {
    contract.createAgreement(1, 1, 500, 1000, 1000, 5);
    contract.issueLicense(1, "ST2LICENSEE");
    contract.caller = "ST2LICENSEE";
    contract.blockHeight = 2000;
    const result = contract.transferLicense(1, "ST3NEWOWNER");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets royalty recipient successfully", () => {
    contract.createAgreement(1, 1, 500, 1000, 1000, 5);
    const result = contract.setRoyaltyRecipient(1, "ST3RECIPIENT", 200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.getRoyaltyRecipient(1, "ST3RECIPIENT")).toEqual({ share: 200 });
  });

  it("verifies license successfully", () => {
    contract.createAgreement(1, 1, 500, 1000, 1000, 5);
    contract.issueLicense(1, "ST2LICENSEE");
    const result = contract.verifyLicense(1);
    expect(result.ok).toBe(true);
    expect(result.value).toMatchObject({ owner: "ST2LICENSEE" });
  });
});