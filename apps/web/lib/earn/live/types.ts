import type {AprBreakdown} from '../apr';
import type {Figure} from './envelope';

/**
 * Session AF (`TIER 3 (data formats)`): the `data` of each /api/earn/* answer (live envelope version 1). Shared by the
 * server readers (lib/server/earn/*) and the Earn page, so the page never imports server code. Amounts are decimal strings
 * in base units (azig has 18 decimals, stZIG and USDC 6); rates are decimal fractions ("0.0574" is 5.74 %).
 */
export type LcdNetwork = 'mainnet' | 'testnet';
export const DEFILLAMA_SLUGS = Object.freeze(['valdora-finance', 'oroswap', 'nawa-protocol', 'defa-by-invoicemate', 'permapod'] as const);
export type DefillamaSlug = (typeof DEFILLAMA_SLUGS)[number];
export type ChainData = {
  network: LcdNetwork; chainId: string; nodeVersion: string | null; bondDenom: 'azig'; decimals: 18;
  mint: {inflation: string; inflationMin: string; inflationMax: string; goalBonded: string; inflationRateChange: string; blocksPerYear: string; annualProvisions: string};
  staking: {bondedTokens: string; notBondedTokens: string; supply: string; bondedShare: string; unbondingSeconds: number; maxValidators: number; maxEntries: number; minCommissionRate: string};
  distribution: {communityTax: string};
  slashing: {signedBlocksWindow: string; minSignedPerWindow: string; downtimeJailSeconds: number; slashFractionDoubleSign: string; slashFractionDowntime: string};
  blocks: {latest: {height: string; time: string}; earlier: {height: string; time: string}};
  apr: AprBreakdown;
};

export type ValdoraData = {
  pins: {staker: string; codeId: string; checksum: string; contract: string; version: string};
  paused: boolean; emergencyMode: boolean;
  /** Valdora's fee as a fraction of staking rewards (fees_percentage ÷ 10,000). */
  feeOfRewards: string;
  minDepositAzig: string; minStZigUnits: string; stZigDenom: string; stZigDecimals: 6;
  stZigSupplyUnits: string;
  rewardsEarnedTodayAzig: string;
  admin: {address: string; key: 'single-key' | 'multisig' | 'contract-or-other' | 'none'; keyType: string | null};
  rate: Figure<{zigPerStZig: string; dexZigPerStZig: string; difference: string; basis: string}>;
};

export type OroswapData = {
  pairTypes: {name: string; totalFeeBps: number; makerFeeBps: number; disabled: boolean}[];
  pools: {id: string; label: string; contract: string; pairType: string; feeBps: number; makerFeeBps: number; reserves: {symbol: string; denom: string; amount: string; decimals: number}[]; totalShare: string; price: {base: string; quote: string; value: string}}[];
  farms: {active: boolean; activePools: number};
};

export type DefillamaProtocol = Figure<{name: string; tvlUsd: number | null; incidents: {date: string; classification: string | null}[]}>;
export type DefillamaData = {
  thirdParty: true;
  protocols: Record<DefillamaSlug, DefillamaProtocol>;
  pools: Figure<{rows: {pool: string; project: DefillamaSlug; symbol: string; label: string | null; tvlUsd: number | null; apy: number | null; apyBase: number | null; apyReward: number | null}[]}>;
};

// ---- Session AF chunk 2 (ADR-028 H84, H88, H97) ----
/** Valdora's three USDC vaults on its site and Nawa's USDC vault: one figure each, read at one block (GET /api/earn/vaults). */
export const VAULT_IDS = Object.freeze(['stablecoin-yield', 'private-credit', 'core-income', 'nawa-usdc'] as const);
export type VaultId = (typeof VAULT_IDS)[number];
export type VaultRow = Figure<{
  label: string; operator: 'valdora' | 'nawa'; contract: string; codeId: string; contractVersion: string;
  /** Assets under management as the vault reports them, in base units of its deposit asset (6 decimals for USDC). */
  aumUnits: string; decimals: 6; pricePerShare: string; totalShares: string; pendingRedemptionUnits: string; paused: boolean;
  /** The deposit asset's denom (raw key `asset_denom`) and what it is: USDC on Noble (USDC.n) is the one Circle is winding down. */
  assetDenom: string; asset: 'USDC.n' | 'USDC.inj' | 'other';
  admin: string;
}>;
export type VaultsData = {
  vaults: Record<VaultId, VaultRow>;
  /** Nawa's stZIG vault: what it holds (in stZIG units, 6 decimals) and its raw fee number (its units are not published). */
  nawaZig: Figure<{contract: string; totalAumUnits: string; feeNumber: number; oroswapPool: string; admin: string}>;
  /** DeFa by InvoiceMate's own on-chain value counter (read as 6-decimal dollars: the counter's own figure). */
  defa: Figure<{contract: string; activeTvlUnits: string}>;
};
/** The measured native staking figure (H97): one named validator's self-bond over the last 10,000 blocks (GET /api/earn/measured). */
export type MeasuredData = {
  validator: {operator: string; moniker: string; commission: string; jailed: boolean; status: string};
  /** The validator's own account (its self-delegation): a public chain identifier, not a person's wallet. */
  delegator: string;
  latest: {height: string; time: string; pendingRewards: string; selfBond: string};
  earlier: {height: string; time: string; pendingRewards: string; selfBond: string};
  measured: Figure<{accrued: string; windowBlocks: string; windowSeconds: string; rate: string}>;
};
