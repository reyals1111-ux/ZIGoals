import type {HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {weekdayOfDay} from './day-target';
import {foodPlusSchema, type FoodPlus} from './schema';

/**
 * Session AV lane 2 (food, LEDGER #90; MyFitnessPal's challenges and logging streaks): a weekly logging challenge you set
 * yourself — "log food on N days a week" (1 to 7), Monday to Sunday. A day counts when the Food diary has at least one
 * entry on it. The weeks met in a row are counted from the week the challenge started; nothing is suggested and nothing
 * is lost by missing a week. Pure.
 */
export const mondayOf = (date: string) => addLocalDays(date, -((weekdayOfDay(date) + 6) % 7));
export function startChallenge(record: FoodPlus, daysPerWeek: number, today: string): FoodPlus {
  if (!Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7) throw new Error('Choose 1 to 7 days a week.');
  return foodPlusSchema.parse({...record, challenge: {daysPerWeek, since: record.challenge?.since && record.challenge.daysPerWeek === daysPerWeek ? record.challenge.since : mondayOf(today)}});
}
export function stopChallenge(record: FoodPlus): FoodPlus { const {challenge: _c, ...rest} = record; void _c; return foodPlusSchema.parse(rest); }
const loggedDays = (data: HealthData, from: string, to: string) => new Set(data.diary.filter(e => e.date >= from && e.date <= to).map(e => e.date));
export type ChallengeWeek = {daysPerWeek: number; since: string; monday: string; sunday: string; logged: number; loggedToday: boolean; met: boolean; daysLeft: number; reachable: boolean; weeksInRow: number; weeksMet: number; weeksTotal: number; days: {date: string; logged: boolean}[]};
export function challengeWeek(data: HealthData, record: FoodPlus | null | undefined, today: string): ChallengeWeek | null {
  const c = record?.challenge;
  if (!c) return null;
  const monday = mondayOf(today), sunday = addLocalDays(monday, 6), set = loggedDays(data, monday, sunday);
  const days = Array.from({length: 7}, (_, i) => { const date = addLocalDays(monday, i); return {date, logged: set.has(date)}; });
  const logged = days.filter(d => d.logged).length, daysLeft = days.filter(d => d.date >= today && !d.logged).length;
  const met = logged >= c.daysPerWeek;
  // Full weeks before this one, from the challenge's first week: met in a row (back from last week), and in all.
  let weeksInRow = 0, weeksMet = 0, weeksTotal = 0, run = true;
  for (let w = addLocalDays(monday, -7); w >= c.since && weeksTotal < 260; w = addLocalDays(w, -7)) {
    const ok = loggedDays(data, w, addLocalDays(w, 6)).size >= c.daysPerWeek;
    weeksTotal++; if (ok) weeksMet++;
    if (run && ok) weeksInRow++; else run = false;
  }
  return {daysPerWeek: c.daysPerWeek, since: c.since, monday, sunday, logged, loggedToday: set.has(today), met, daysLeft, reachable: met || logged + daysLeft >= c.daysPerWeek, weeksInRow: weeksInRow + (met ? 1 : 0), weeksMet: weeksMet + (met ? 1 : 0), weeksTotal: weeksTotal + 1, days};
}
