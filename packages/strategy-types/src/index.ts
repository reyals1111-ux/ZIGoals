export type VerificationStatus = "VERIFIED" | "EXPERIMENTAL" | "DISABLED";
export type PositionLiquidity = "LIQUID" | "REDEMPTION_PENDING" | "CLAIMABLE";
export interface StrategyDescriptor {
  id: string;
  name: string;
  protocol: string;
  baseAsset: string;
  positionAsset: string;
  category: "idle" | "liquid-staking" | "managed";
  liquidity: PositionLiquidity;
  estimatedExitDelay: string;
  minimumDeposit: string;
  riskFlags: readonly string[];
  audit: { status: "NOT_AUDITED" | "AUDITED"; url?: string };
  verification: VerificationStatus;
  jurisdiction?: string;
  kycRequired?: boolean;
  termsUrl?: string;
  /** Optional evidence-backed metadata; never an execution permission. */
  network?: { chainId: string; name: string };
  depositAsset?: string;
  product?: { id: string; name: string; description?: string };
  provenance?: readonly StrategyProvenance[];
  underlyingYieldSource?: string;
  liquidityClass?:
    | "IMMEDIATE_TRANSACTION"
    | "UNBONDING"
    | "WINDOWED"
    | "ILLIQUID"
    | "UNKNOWN";
  redemptionWindow?: { description: string; sourceUrl?: string };
  riskClass?:
    | "UNAUDITED"
    | "PROVIDER_RATED"
    | "INDEPENDENTLY_RATED"
    | "UNKNOWN";
  riskRatingSource?: string;
  eligibility?: {
    description: string;
    kyc: "REQUIRED" | "NOT_REQUIRED_DOCUMENTED" | "UNKNOWN";
    jurisdictions: readonly string[];
    sourceUrl?: string;
  };
  shariah?: {
    status:
      | "UNKNOWN"
      | "PROVIDER_CLAIM"
      | "CERTIFIER_CLAIM"
      | "EXPLICITLY_NOT_COMPLIANT";
    attributedTo?: string;
    sourceUrl?: string;
    scope?: string;
  };
  onchainContracts?: readonly {
    chainId: string;
    address: string;
    purpose: string;
    sourceUrl: string;
  }[];
  explorerLinks?: readonly {
    providerId: "range" | "zigscan";
    chainId: string;
    kind: "contract" | "asset";
    identifier: string;
  }[];
  verifiedAt?: string;
}
export function idleStrategy(baseDenom: string): StrategyDescriptor {
  return {
    id: "idle",
    name: "Idle",
    protocol: "ZIGoals Goal Manager",
    baseAsset: baseDenom,
    positionAsset: baseDenom,
    category: "idle",
    liquidity: "LIQUID",
    estimatedExitDelay: "A confirmed withdrawal transaction",
    minimumDeposit: "1",
    riskFlags: ["Unaudited contract", "Testnet only"],
    audit: { status: "NOT_AUDITED" },
    verification: "EXPERIMENTAL",
  };
}

export interface StrategyProvenance {
  role: "PRODUCT" | "CURATOR" | "ORIGINATOR" | "SERVICER" | "CUSTODIAN";
  providerId: string;
  name: string;
  status: "DOCUMENTED" | "UNCONFIRMED";
  /** Source must attest this role in this specific product, not a generic partnership. */
  sourceUrl?: string;
  verifiedAt?: string;
}
/** Filters displayable assertions; this does not independently validate the source's claims. */
export function documentedProvenance(
  strategy: StrategyDescriptor,
): readonly StrategyProvenance[] {
  return (strategy.provenance ?? [])
    .filter((entry) => {
      if (
        entry.status !== "DOCUMENTED" ||
        !entry.sourceUrl ||
        !entry.verifiedAt ||
        !entry.name ||
        entry.name.length > 200
      )
        return false;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.verifiedAt)) return false;
      const date = new Date(`${entry.verifiedAt}T00:00:00Z`);
      if (
        Number.isNaN(date.valueOf()) ||
        date.toISOString().slice(0, 10) !== entry.verifiedAt
      )
        return false;
      if (
        entry.sourceUrl.length > 2000 ||
        /[\s\\\u0000-\u001f\u007f]/u.test(entry.sourceUrl)
      )
        return false;
      try {
        const url = new URL(entry.sourceUrl);
        return (
          url.protocol === "https:" &&
          !url.username &&
          !url.password &&
          !url.port
        );
      } catch {
        return false;
      }
    })
    .slice(0, 10);
}
/** How funds arrive. This metadata has no signing/broadcast method. */
export interface FundingRoute {
  id: string;
  sourceNetwork: string;
  destinationNetwork: string;
  sourceAsset: string;
  destinationAsset: string;
  providerIds: readonly string[];
  transport: "IBC" | "AXELAR" | "FIAT" | "OTHER";
  verification: "UNCONFIRMED" | "DOCUMENTED" | "TESTED" | "DISABLED";
  eligibility: string;
  fees: string;
  settlement: string;
  risks: readonly string[];
  evidence: readonly { url: string; supports: string }[];
  lastVerified?: string;
  executionEnabled: false;
}
