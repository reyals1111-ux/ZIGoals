/**
 * Session AL (PR-036, PR-038, BN-027, BN-161; P-BN-27, P-PR-35): dated facts read from a notice are worded by today's
 * date, never as if the read day were today. A deadline that has passed is said in the past ("was 1 November 2026,
 * passed"), never as a step to take; a date the notice gave as future reads as done once it is behind us. Days are
 * whole UTC days, as the notices state them. Pure; the caller passes `now`.
 */
const endOfDay = (isoDay: string) => Date.parse(`${isoDay}T23:59:59.999Z`);
/** True once the whole UTC day `isoDay` is over. */
export const dayHasPassed = (isoDay: string, now: number) => now > endOfDay(isoDay);
/** The newest of some ISO days ("2026-10-31"), for a header that says when its sources were last read. */
export const newestDay = (days: readonly string[]) => days.reduce((a, b) => (b > a ? b : a));

export type ZignalyPhase = 'credit-open' | 'credit-passed' | 'closed';
/** Zignaly's closure (its notice, read 18 Oct 2026): Private Credit requests until 1 Nov, withdrawals until 1 Dec 23:59 UTC. */
export function zignalyPhase(now: number): ZignalyPhase {
  if (dayHasPassed('2026-12-01', now)) return 'closed';
  return dayHasPassed('2026-11-01', now) ? 'credit-passed' : 'credit-open';
}
/** One line for the Ecosystem card and Earn: what the notice means today. */
export function zignalyStatusLine(now: number): string {
  switch (zignalyPhase(now)) {
    case 'credit-open': return 'The last day to request a Private Credit withdrawal is 1 November 2026; the app closes on 1 December 2026 at 23:59 UTC.';
    case 'credit-passed': return 'The last day to request a Private Credit withdrawal was 1 November 2026 (passed). Other balances can be withdrawn until 1 December 2026 at 23:59 UTC, when the app closes.';
    case 'closed': return 'Closed: the last day to withdraw was 1 December 2026 (23:59 UTC), by Zignaly’s notice.';
  }
}
/** Circle's USDC-on-Noble notice (read 18 Oct 2026), with each date worded as past or future from `now`. */
export function nobleUsdcLine(now: number): string {
  const burn = dayHasPassed('2026-10-30', now) ? 'its CCTP V1 burn limits fell to zero on 31 October 2026' : 'its CCTP V1 burn limits fall to zero from 31 October 2026';
  const pause = dayHasPassed('2027-01-11', now) ? 'on 12 January 2027 the Noble USDC contract and its CCTP routes were fully paused, with manual redemption from 13 January 2027' : 'on 12 January 2027 the Noble USDC contract and its CCTP routes are fully paused, with manual redemption from 13 January 2027';
  return `Circle stopped new minting of USDC on Noble on 13 October 2026; ${burn}, and ${pause}.`;
}
