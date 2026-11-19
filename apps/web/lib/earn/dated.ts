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
/**
 * Session AT (ADR-043 D1, owner change 1): every sentence ZIGoals says about Zignaly's closure is worded from its own closure
 * notice (read 18 Oct 2026: "The last day to withdraw, until 23:59 UTC. The app closes after that." for 1 December 2026),
 * by today's UTC day, so nothing needs a deploy on the day: until 30 November it "is closing"; on 1 December the notice's
 * own words ("today is the last day to withdraw, until 23:59 UTC"); from 2 December it "has closed". Every place that shows
 * one of these also links the notice (the verified "closure-notice" link). Pure; the caller passes `now`.
 */
export type ZignalyClosure = 'closing' | 'last-day' | 'closed';
export function zignalyClosure(now: number): ZignalyClosure {
  if (dayHasPassed('2026-12-01', now)) return 'closed';
  return dayHasPassed('2026-11-30', now) ? 'last-day' : 'closing';
}
export type ZignalyWords = {
  /** The Earn section's title and its phone fold. */ heading: string;
  /** The section's eyebrow. */ eyebrow: string;
  /** The "At a glance" tag. */ tag: string;
  /** The compare table's "what it is" line. */ what: string;
  /** The Ecosystem card's status label. */ label: string;
  /** A clause after "Zignaly, " (Nawa's dependency). */ clause: string;
};
const ZIGNALY_WORDS: Readonly<Record<ZignalyClosure, ZignalyWords>> = Object.freeze({
  closing: {heading: 'Zignaly is closing: how to withdraw', eyebrow: 'Zignaly · closing', tag: 'Closing', what: 'Closing: how to withdraw', label: 'Closing', clause: 'which is closing'},
  'last-day': {heading: 'Zignaly: today is the last day to withdraw', eyebrow: 'Zignaly · last day to withdraw', tag: 'Last day to withdraw', what: 'Today is the last day to withdraw', label: 'Last day to withdraw', clause: 'which closes after today, 1 December 2026, by its notice'},
  closed: {heading: 'Zignaly has closed: what its notice said', eyebrow: 'Zignaly · closed', tag: 'Closed', what: 'Closed: what its notice said', label: 'Closed', clause: 'which has closed'},
});
export const zignalyWords = (now: number): ZignalyWords => ZIGNALY_WORDS[zignalyClosure(now)];

/** One line for the Ecosystem card and Earn: what the notice means today. */
export function zignalyStatusLine(now: number): string {
  switch (zignalyPhase(now)) {
    case 'credit-open': return 'The last day to request a Private Credit withdrawal is 1 November 2026; the app closes on 1 December 2026 at 23:59 UTC.';
    case 'credit-passed': return zignalyClosure(now) === 'last-day'
      ? 'Today, 1 December 2026, is the last day to withdraw, until 23:59 UTC; the app closes after that. The last day to request a Private Credit withdrawal was 1 November 2026 (passed).'
      : 'The last day to request a Private Credit withdrawal was 1 November 2026 (passed). Other balances can be withdrawn until 1 December 2026 at 23:59 UTC; the app closes after that.';
    case 'closed': return 'Zignaly has closed: its notice made 1 December 2026 (until 23:59 UTC) the last day to withdraw.';
  }
}
/** Circle's USDC-on-Noble notice (read 18 Oct 2026), with each date worded as past or future from `now`. */
export function nobleUsdcLine(now: number): string {
  const burn = dayHasPassed('2026-10-30', now) ? 'its CCTP V1 burn limits fell to zero on 31 October 2026' : 'its CCTP V1 burn limits fall to zero from 31 October 2026';
  const pause = dayHasPassed('2027-01-11', now) ? 'on 12 January 2027 the Noble USDC contract and its CCTP routes were fully paused, with manual redemption from 13 January 2027' : 'on 12 January 2027 the Noble USDC contract and its CCTP routes are fully paused, with manual redemption from 13 January 2027';
  return `Circle stopped new minting of USDC on Noble on 13 October 2026; ${burn}, and ${pause}.`;
}
