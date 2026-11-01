import {ENERGY_MIN_LOGGED_DAYS, ENERGY_MIN_WEIGHTS, type EnergyEstimate} from './energy';

/**
 * Session AK RB (RELEASE_REVIEW_2 R2-14): what the Energy estimate tile says while the estimate is not ready. It names the
 * input that is still missing, never a count that is already met ("28 of 14 days" told a person days were missing when
 * the weigh-ins were). Pure; reads the estimate only.
 *   - figure: the input still short, as "7 of 10 weigh-ins" (or "9 of 14 days");
 *   - note: what is left, as "3 more weigh-ins to go" (both inputs when both are short);
 *   - share: 0–1, the least complete of the two (for the tile's small bar).
 */
export type EnergyProgress = {figure: string; note: string; share: number};
const more = (n: number, one: string, many: string) => `${n} more ${n === 1 ? one : many}`;
export function energyProgress(e: Pick<EnergyEstimate, 'loggedDays' | 'weights' | 'implausible'>): EnergyProgress {
  const days = Math.max(0, e.loggedDays), weights = Math.max(0, e.weights);
  const daysLeft = Math.max(0, ENERGY_MIN_LOGGED_DAYS - days), weightsLeft = Math.max(0, ENERGY_MIN_WEIGHTS - weights);
  const share = Math.min(1, days / ENERGY_MIN_LOGGED_DAYS, weights / ENERGY_MIN_WEIGHTS);
  if (e.implausible) return {figure: 'Not shown', note: 'the logs look incomplete; check the diary and weights', share};
  if (weightsLeft && daysLeft) return {figure: `${weights} of ${ENERGY_MIN_WEIGHTS} weigh-ins`, note: `${more(weightsLeft, 'weigh-in', 'weigh-ins')} and ${more(daysLeft, 'logged day', 'logged days')} to go`, share};
  if (weightsLeft) return {figure: `${weights} of ${ENERGY_MIN_WEIGHTS} weigh-ins`, note: `${more(weightsLeft, 'weigh-in', 'weigh-ins')} to go`, share};
  if (daysLeft) return {figure: `${days} of ${ENERGY_MIN_LOGGED_DAYS} days`, note: `${more(daysLeft, 'logged day', 'logged days')} to go`, share};
  // Both counts are met, but the trend needs readings spread over the weeks to give a weekly rate.
  return {figure: 'Almost there', note: 'the weight trend needs readings spread over a few weeks', share: 1};
}
