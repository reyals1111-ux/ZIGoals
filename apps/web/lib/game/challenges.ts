import {habitDay, type HabitData} from '../habits';
import {addLocalDays} from '../local-date';
import {weekStart, type GameStores} from './xp';

/**
 * Weekly challenges, against yourself only: this week's count beside last week's, never a ranking, never another
 * person. "Beat" means one more than last week; a week with nothing to beat simply invites a first.
 */
export type Challenge = {id: string; title: string; thisWeek: number; lastWeek: number; target: number; unit: string};
const checkIns = (h: HabitData, from: string, to: string) => h.habits.reduce((n, x) => n + x.entries.filter(e => e.date >= from && e.date <= to && e.disposition === 'logged' && habitDay(x, e.date, to).status === 'complete').length, 0);
export function weeklyChallenges(stores: GameStores, today: string): Challenge[] {
  const ws = weekStart(today), we = addLocalDays(ws, 6), lws = addLocalDays(ws, -7), lwe = addLocalDays(ws, -1);
  const rows: Challenge[] = [];
  const habitsNow = checkIns(stores.habits, ws, today), habitsLast = checkIns(stores.habits, lws, lwe);
  rows.push({id: 'checkins', title: 'Habit check-ins', thisWeek: habitsNow, lastWeek: habitsLast, target: habitsLast + 1, unit: 'check-ins'});
  const water = (from: string, to: string) => new Set((stores.health.daily?.water ?? []).filter(w => w.date >= from && w.date <= to).map(w => w.date)).size;
  rows.push({id: 'water-days', title: 'Days with water logged', thisWeek: water(ws, today), lastWeek: water(lws, lwe), target: Math.min(7, water(lws, lwe) + 1), unit: 'days'});
  const meals = (from: string, to: string) => new Set(stores.health.diary.filter(d => d.date >= from && d.date <= to).map(d => d.date)).size;
  rows.push({id: 'meal-days', title: 'Days with a meal logged', thisWeek: meals(ws, today), lastWeek: meals(lws, lwe), target: Math.min(7, meals(lws, lwe) + 1), unit: 'days'});
  const sleep = (from: string, to: string) => (stores.health.sleep?.nights ?? []).filter(n => n.kind === 'night' && n.end && n.end.slice(0, 10) >= from && n.end.slice(0, 10) <= to).length;
  rows.push({id: 'nights', title: 'Nights logged', thisWeek: sleep(ws, today), lastWeek: sleep(lws, lwe), target: Math.min(7, sleep(lws, lwe) + 1), unit: 'nights'});
  void we;
  return rows;
}
