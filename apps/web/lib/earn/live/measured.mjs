// Session AF chunk 2 (ADR-028 H97; `TIER 3 (data formats)`): the two native staking figures in one plain module, shared by
// the measured-APR route (lib/server/earn/measured.ts), the Earn page and scripts/earn/live-check.mjs, so the script and the
// app can never compute them differently. BigInt fixed point with 18 decimals; never a float for a shown figure.
//
//   issuance = annual provisions ÷ bonded × (1 − community tax) × (real blocks a year ÷ the mint module's blocks_per_year)
//              × (1 − commission)                                       (lib/earn/apr.ts gives the same; apr.test.ts pins it)
//   measured = (pending rewards now − pending rewards 10,000 blocks earlier) ÷ self-bond × (one year ÷ the window's seconds)
//
// The measured figure is what one named validator's own stake really accrued, net of its commission, so it includes what
// the issuance arithmetic leaves out (transaction fees, proposer rewards). It cannot be measured when the rewards fell in
// the window (they were claimed: a claim, or a change of the stake, pays them out) or when the stake itself changed.

export const ONE = 10n ** 18n;
export const YEAR_SECONDS = 31_557_600n;
const NS = 1_000_000_000n;
const PLAIN = /^(\d{1,60})(?:\.(\d{1,60}))?$/;
/** A plain non-negative decimal string as an 18-decimal fixed-point BigInt (digits past the 18th are cut). */
export function fixed(text) {
  const m = PLAIN.exec(String(text));
  if (!m) throw new Error('Not a plain non-negative decimal.');
  return BigInt(m[1]) * ONE + BigInt((m[2] ?? '').slice(0, 18).padEnd(18, '0'));
}
/** The plain decimal string of a fixed-point value, trailing zeros removed. */
export function text(value) {
  const negative = value < 0n, abs = negative ? -value : value;
  const part = (abs % ONE).toString().padStart(18, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${abs / ONE}${part ? `.${part}` : ''}`;
}
const div = (a, b) => { if (b === 0n) throw new Error('Division by zero.'); return a * ONE / b; };
const mul = (a, b) => a * b / ONE;
/** RFC 3339 UTC time with up to nine decimals of a second, as nanoseconds since 1970. */
export function nanoseconds(time) {
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$/.exec(String(time));
  const ms = m ? Date.parse(`${m[1]}Z`) : NaN;
  if (!m || !Number.isFinite(ms)) throw new Error('Not an RFC 3339 UTC time.');
  return BigInt(ms) * 1_000_000n + BigInt((m[2] ?? '').padEnd(9, '0'));
}
function windowOf(latest, earlier) {
  const blocks = BigInt(latest.height) - BigInt(earlier.height), ns = nanoseconds(latest.time) - nanoseconds(earlier.time);
  if (blocks <= 0n || ns <= 0n) throw new Error('The block window must move forward.');
  return {blocks, ns, seconds: ns * ONE / NS};
}

/**
 * The measured yearly rate of one validator's self-delegation. `latest` and `earlier` each carry the block's height and time,
 * the pending rewards in azig (a decimal string, as the distribution module answers) and the self-bond in azig.
 * Returns {status: 'ok', accrued, windowBlocks, windowSeconds, rate} or {status: 'unavailable', reason: 'REWARDS_CLAIMED'}.
 */
export function measuredRate({latest, earlier}) {
  const {blocks, ns, seconds} = windowOf(latest, earlier);
  const now = fixed(latest.pendingRewards), before = fixed(earlier.pendingRewards);
  const bondNow = fixed(latest.selfBond), bondBefore = fixed(earlier.selfBond);
  if (bondNow === 0n) throw new Error('No self-bond to measure.');
  if (now < before || bondNow !== bondBefore) return {status: 'unavailable', reason: 'REWARDS_CLAIMED'};
  const accrued = now - before;
  // accrued ÷ bond is the window's share; × one year ÷ the window's length (nanoseconds) is the simple yearly rate.
  const rate = div(accrued, bondNow) * YEAR_SECONDS * NS / ns;
  return {status: 'ok', accrued: text(accrued), windowBlocks: blocks.toString(), windowSeconds: text(seconds), rate: text(rate)};
}

/** The issuance figure at a commission (the formula of lib/earn/apr.ts, repeated here for the script; apr.test.ts pins both equal). */
export function issuanceRate({annualProvisions, bondedTokens, communityTax, mintBlocksPerYear, latest, earlier, commission}) {
  const bonded = fixed(bondedTokens), mintBlocks = fixed(mintBlocksPerYear), tax = fixed(communityTax), c = fixed(commission);
  if (bonded === 0n || mintBlocks === 0n || tax > ONE || c > ONE) throw new Error('Inputs out of range.');
  const {blocks, ns} = windowOf(latest, earlier);
  const realBlocks = blocks * ONE * YEAR_SECONDS * NS / ns;
  const afterTax = mul(div(fixed(annualProvisions), bonded), ONE - tax);
  return text(mul(mul(afterTax, div(realBlocks, mintBlocks)), ONE - c));
}

/** How far apart the two figures are, relative to the issuance figure; above `limit` (10 %) they disagree. */
export function aprAgreement(issuance, measured, limit = '0.1') {
  const i = fixed(issuance), m = fixed(measured);
  if (i === 0n) return {apart: null, disagree: true};
  const apart = div(i > m ? i - m : m - i, i);
  return {apart: text(apart), disagree: apart > fixed(limit)};
}
