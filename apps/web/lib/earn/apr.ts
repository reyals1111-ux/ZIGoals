import {div, fixed, mul, ONE, text} from './decimal';

/**
 * Session AF (ADR-028 H9, H51; `TIER 3 (data formats)`): the native staking APR, from the chain's own figures only.
 *
 *   gross       = annual provisions ÷ bonded tokens                       (both in azig, read at one block height)
 *   after tax   = gross × (1 − community tax)
 *   real blocks = the blocks of a 10,000-block window ÷ its seconds × one year (365.25 days)
 *   APR         = after tax × (real blocks per year ÷ the mint module's blocks_per_year) × (1 − the validator's commission)
 *
 * The mint module pays annual provisions ÷ blocks_per_year in each block, and assumes 10,512,000 blocks a year (3.0 s
 * blocks); real blocks are slower (about 3.17 s on 2026-10-18), so a year holds fewer blocks and pays less than the
 * provisions say. The correction uses two block headers about 10,000 blocks apart (H51). It is a simple yearly rate:
 * rewards are not compounded unless they are staked again. Transaction fees, which also reach stakers, are not counted.
 * Every input is a decimal string from the chain; the maths is BigInt fixed point (lib/earn/decimal.ts), never a float.
 */
export const YEAR_SECONDS = 31_557_600n;
const NS = 1_000_000_000n;
export type BlockStamp = {height: string; time: string};
export type AprInputs = {annualProvisions: string; bondedTokens: string; communityTax: string; mintBlocksPerYear: string; latest: BlockStamp; earlier: BlockStamp};
export type AprBreakdown = {
  /** annual provisions ÷ bonded tokens */ gross: string;
  /** gross × (1 − community tax) */ afterTax: string;
  windowBlocks: string; windowSeconds: string; blockSeconds: string;
  realBlocksPerYear: string; mintBlocksPerYear: string;
  /** real blocks per year ÷ blocks_per_year */ factor: string;
  /** after tax × factor: the yearly rate before the validator's commission */ beforeCommission: string;
};

/** RFC 3339 UTC time with up to nine decimals of a second, as nanoseconds since 1970. */
export function nanoseconds(time: string): bigint {
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$/.exec(time);
  const ms = m ? Date.parse(`${m[1]}Z`) : NaN;
  if (!m || !Number.isFinite(ms)) throw new Error('Not an RFC 3339 UTC time.');
  return BigInt(ms) * 1_000_000n + BigInt((m[2] ?? '').padEnd(9, '0'));
}
export function aprBreakdown(input: AprInputs): AprBreakdown {
  const provisions = fixed(input.annualProvisions), bonded = fixed(input.bondedTokens), tax = fixed(input.communityTax), mintBlocks = fixed(input.mintBlocksPerYear);
  if (bonded === 0n || mintBlocks === 0n) throw new Error('Bonded tokens and blocks per year must be positive.');
  if (tax > ONE) throw new Error('Community tax above 1.');
  const blocks = BigInt(input.latest.height) - BigInt(input.earlier.height), ns = nanoseconds(input.latest.time) - nanoseconds(input.earlier.time);
  if (blocks <= 0n || ns <= 0n) throw new Error('The block window must move forward.');
  const gross = div(provisions, bonded), afterTax = mul(gross, ONE - tax);
  const seconds = ns * ONE / NS, realBlocks = blocks * ONE * YEAR_SECONDS * NS / ns, factor = div(realBlocks, mintBlocks);
  return {gross: text(gross), afterTax: text(afterTax), windowBlocks: blocks.toString(), windowSeconds: text(seconds), blockSeconds: text(seconds / blocks),
    realBlocksPerYear: text(realBlocks), mintBlocksPerYear: text(mintBlocks), factor: text(factor), beforeCommission: text(mul(afterTax, factor))};
}
/** The yearly rate a delegator keeps at a validator's commission (a decimal fraction, "0.05" for 5 %). */
export function aprAtCommission(breakdown: Pick<AprBreakdown, 'beforeCommission'>, commission: string): string {
  const c = fixed(commission);
  if (c > ONE) throw new Error('Commission above 1.');
  return text(mul(fixed(breakdown.beforeCommission), ONE - c));
}
