import type {HealthData} from '../health';

/**
 * Session AP (owner-approved feature 7): food-logging consistency — on how many days of this month, up to today, at
 * least one food was logged in the diary. Derived from the diary every time; nothing is stored, nothing is judged (a day
 * without a log is just a day without a log), and no calorie figure is involved.
 */
export type FoodMonth = {month: string; daysSoFar: number; logged: number; loggedDays: string[]; daysInMonth: number};
export function foodLoggingMonth(health: Pick<HealthData, 'diary'>, today: string): FoodMonth {
  const month = today.slice(0, 7), daysSoFar = Number(today.slice(8, 10));
  const [y, m] = month.split('-').map(Number) as [number, number];
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const loggedDays = [...new Set(health.diary.filter(e => e.date.startsWith(`${month}-`) && e.date <= today).map(e => e.date))].sort();
  return {month, daysSoFar, logged: loggedDays.length, loggedDays, daysInMonth};
}
/** "12 of 14 days so far this month". */
export const foodMonthWords = (f: FoodMonth) => `${f.logged} of ${f.daysSoFar} ${f.daysSoFar === 1 ? 'day' : 'days'} so far this month`;
