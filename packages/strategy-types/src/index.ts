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
