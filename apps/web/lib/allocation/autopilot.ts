import {addLocalDays, localDate} from '../local-date';
import {addMonths, daysBetween} from '../bills/cadence';
import type {ContributionEvent, PrivateGoal} from '../positions';

/**
 * Session AK (7.6): "contribution autopilot" — never automatic money. From the contributions a person recorded for a
 * Goal (lib/positions.ts `contributions`: direction IN, not reversed, not reward income), the usual rhythm: a day of
 * the month (or a weekday) they keep to and the amount they usually put in. It returns a suggestion the page words as
 * "You usually contribute on the 3rd; remind me or pre-fill the amount?" and a link that opens the Goal's own
 * contribution form for the person to check and confirm. Nothing ever moves by itself.
 */
export type AutopilotSuggestion = {
  goalId: string; goalName: string; rhythm: 'monthly' | 'weekly';
  /** Day of the month (1–31) for monthly; weekday (0 = Sunday) for weekly. */
  day: number;
  /** Base units in the Goal's asset (as recorded), with its asset and decimals. */
  amount: string; asset: string; decimals: number;
  occurrences: number; nextDate: string;
  /** A contribution is already recorded in this period. */
  doneThisPeriod: boolean;
  confidence: 'high' | 'medium';
  hasPlan: boolean;
  prefillHref: string;
};
export const MIN_CONTRIBUTIONS = 3, LOOKBACK_DAYS = 400, DAY_TOLERANCE = 3;
/** The Goal's contribution form with the amount ready to check. `amount` is base units; see the lead's wiring note. */
export function contributionPrefillHref(goalId: string, amount?: string): string {
  const query = new URLSearchParams({contribute: '1'});
  if (amount && /^[1-9]\d{0,77}$/.test(amount)) query.set('amount', amount);
  return `/app/goals/tracked/${encodeURIComponent(goalId)}?${query.toString()}#funding-wealth`;
}
const median = (values: readonly number[]) => { const s = [...values].sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)]!; };
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
/** "on the 3rd" / "on Mondays" (weekday names come from the caller's formatter). */
export const dayWords = (s: Pick<AutopilotSuggestion, 'rhythm' | 'day'>, weekday: (d: number) => string) => s.rhythm === 'monthly' ? `on the ${ordinal(s.day)}` : `on ${weekday(s.day)}s`;
/** The amount that recurs most (ties: the latest); with no repeat, the middle one. */
function usualAmount(amounts: readonly bigint[]): string {
  const counts = new Map<string, number>();
  for (const a of amounts) counts.set(a.toString(), (counts.get(a.toString()) ?? 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1])[0]!;
  if (top[1] >= 2) { const best = [...counts].filter(([, n]) => n === top[1]).map(([v]) => v); return [...amounts].reverse().map(String).find(v => best.includes(v))!; }
  const sorted = [...amounts].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return sorted[Math.floor((sorted.length - 1) / 2)]!.toString();
}

export function contributionRhythm(goal: Pick<PrivateGoal, 'id' | 'name' | 'status' | 'asset' | 'decimals' | 'plan'>, events: readonly ContributionEvent[], today: string, dayOf: (iso: string) => string = iso => localDate(new Date(iso))): AutopilotSuggestion | null {
  if (goal.status !== 'active') return null;
  const reversed = new Set(events.flatMap(e => e.reversesId ? [e.reversesId] : []));
  const mine = events.filter(e => e.goalId === goal.id && e.direction === 'IN' && !e.reversesId && !reversed.has(e.id) && e.provenance !== 'REWARD_INCOME' && e.asset === goal.asset && e.decimals === goal.decimals)
    .map(e => ({day: dayOf(e.occurredAt), quantity: BigInt(e.quantity)})).filter(e => e.day <= today && daysBetween(e.day, today) <= LOOKBACK_DAYS).sort((a, b) => a.day.localeCompare(b.day));
  // One per day: two records on one day are one contribution moment.
  const byDay = new Map<string, bigint>();
  for (const e of mine) byDay.set(e.day, (byDay.get(e.day) ?? 0n) + e.quantity);
  const days = [...byDay.keys()];
  if (days.length < MIN_CONTRIBUTIONS) return null;
  const recent = days.slice(-6), gaps = recent.slice(1).map((d, i) => daysBetween(recent[i]!, d)), middleGap = median(gaps);
  const amount = usualAmount(recent.map(d => byDay.get(d)!));
  const base = {goalId: goal.id, goalName: goal.name, amount, asset: goal.asset, decimals: goal.decimals, occurrences: days.length, hasPlan: !!goal.plan?.active, prefillHref: contributionPrefillHref(goal.id, amount)};
  if (middleGap >= 5 && middleGap <= 9) {
    const weekdays = recent.map(d => new Date(`${d}T12:00:00Z`).getUTCDay()), usual = median(weekdays), share = weekdays.filter(w => w === usual).length / weekdays.length;
    if (share < 0.6) return null;
    const todayDay = new Date(`${today}T12:00:00Z`).getUTCDay(), ahead = (usual - todayDay + 7) % 7;
    // The period runs from the last usual day (today when today is one), a day or two early still counting.
    const last = days[days.length - 1]!, previous = addLocalDays(today, ahead === 0 ? 0 : ahead - 7), doneThisPeriod = last >= addLocalDays(previous, -2);
    const nextDate = addLocalDays(today, ahead === 0 && doneThisPeriod ? 7 : ahead);
    return {...base, rhythm: 'weekly', day: usual, nextDate, doneThisPeriod, confidence: share >= 0.8 && days.length >= 4 ? 'high' : 'medium'};
  }
  if (middleGap < 20 || middleGap > 40) return null;
  const dom = recent.map(d => Number(d.slice(8))), usual = median(dom);
  const share = dom.filter(d => Math.abs(d - usual) <= DAY_TOLERANCE).length / dom.length;
  if (share < 0.6) return null;
  const doneThisPeriod = days.some(d => d.startsWith(today.slice(0, 7)));
  const candidate = clampDay(today.slice(0, 7), usual);
  const nextDate = candidate >= today && !doneThisPeriod ? candidate : clampDay(addMonths(`${today.slice(0, 7)}-01`, 1).slice(0, 7), usual);
  return {...base, rhythm: 'monthly', day: usual, nextDate, doneThisPeriod, confidence: share >= 0.8 && days.length >= 4 ? 'high' : 'medium'};
}
const clampDay = (month: string, day: number) => { const [y, m] = month.split('-').map(Number) as [number, number]; const last = new Date(Date.UTC(y, m, 0)).getUTCDate(); return `${month}-${String(Math.min(day, last)).padStart(2, '0')}`; };
/** Every active Goal's suggestion, soonest first. */
export function autopilotSuggestions(platform: {goals: readonly PrivateGoal[]; contributions: readonly ContributionEvent[]}, today: string, dayOf?: (iso: string) => string): AutopilotSuggestion[] {
  return platform.goals.filter(g => g.type !== 'PROJECT' && g.type !== 'REWARD').flatMap(g => { const s = contributionRhythm(g, platform.contributions, today, dayOf); return s ? [s] : []; })
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate) || a.goalName.localeCompare(b.goalName));
}
