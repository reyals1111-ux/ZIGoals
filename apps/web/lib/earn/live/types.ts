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
