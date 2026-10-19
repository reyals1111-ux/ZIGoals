/** Types for measured.mjs (Session AF chunk 2, `TIER 3 (data formats)`). */
export declare const ONE: bigint;
export declare const YEAR_SECONDS: bigint;
export declare function fixed(text: string): bigint;
export declare function text(value: bigint): string;
export declare function nanoseconds(time: string): bigint;
export type MeasuredPoint = {height: string; time: string; pendingRewards: string; selfBond: string};
export type MeasuredOk = {status: 'ok'; accrued: string; windowBlocks: string; windowSeconds: string; rate: string};
export declare function measuredRate(input: {latest: MeasuredPoint; earlier: MeasuredPoint}): MeasuredOk | {status: 'unavailable'; reason: 'REWARDS_CLAIMED'};
export declare function issuanceParts(input: {annualProvisions: string; bondedTokens: string; communityTax: string; mintBlocksPerYear: string; latest: {height: string; time: string}; earlier: {height: string; time: string}}): {gross: string; afterTax: string; blockSeconds: string; factor: string; beforeCommission: string};
export declare function issuanceRate(input: {annualProvisions: string; bondedTokens: string; communityTax: string; mintBlocksPerYear: string; latest: {height: string; time: string}; earlier: {height: string; time: string}; commission: string}): string;
export declare function aprAgreement(issuance: string, measured: string, limit?: string): {apart: string | null; disagree: boolean};
