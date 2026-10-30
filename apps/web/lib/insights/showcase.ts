import {healthSchema, type HealthData} from '../health';
import {createHabit, habitDataSchema, type HabitData} from '../habits';
import {addLocalDays} from '../local-date';
import {instantAt} from '../zone-time';
import type {SleepNight} from '../sleep/schema';

/**
 * Showcase (Session AA-Cloud Part 8): an earlier, fictional season of walks, nights and water, 60 to 89 days before the
 * Showcase day, so the cross-pillar pairings (90 days, 14 days a side) have real counts to show. It sits outside the
 * 60-day window of the older insights (lib/insights/engine.ts) and before the Showcase habits begin, so every count
 * pinned for the last 30 days stays as it was. Deterministic: the same day always gives the same records.
 * Session AD item 13 (ADR-026): the season has one habit too (`withEarlierHabit`), so "Sleep and habits" has days on
 * both sides.
 */
export const EARLIER_FIRST = -89, EARLIER_LAST = -60;
const ZONE = 'Europe/Brussels';
/** Session AJ (item 10): a night after a day with water is this much longer, so "Water and sleep" stays a clear pairing under ADR-035's gap rule. */
export const WATER_NIGHT_BONUS = 25;
const clock = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function withEarlierSeason(health: HealthData, day: string): HealthData {
  const out = healthSchema.parse(structuredClone(health));
  const nights: SleepNight[] = [];
  for (let k = 0; k <= EARLIER_LAST - EARLIER_FIRST; k++) {
    const date = addLocalDays(day, EARLIER_FIRST + k), stamp = `${date}T20:00:00.000Z`, id = String(k).padStart(3, '0');
    // A longer walk on every other day; on those days the night that follows is longer too (a pairing, as people live it).
    const long = k % 2 === 0, steps = long ? 9200 + (k % 3) * 300 : 5400 + (k % 4) * 250;
    out.activity.push({id: `health_activity-earlier-${id}`, date, name: 'Showcase walk (earlier season)', steps, minutes: long ? 70 : 40, createdAt: stamp, updatedAt: stamp});
    if (k % 3 !== 0 && out.daily) {
      const water = `health_water-earlier-${id}`;
      out.daily.water.push({id: water, date, amountMilli: 500000, unit: 'ml', createdAt: stamp, updatedAt: stamp});
      out.daily.waterOperations.push(water);
    }
    // The night that ends on this day (none after the season's last day, so nothing reaches the last 60 days).
    if (k === 0) continue;
    const prev = addLocalDays(date, -1), longNight = (k - 1) % 2 === 0, asleep = (longNight ? 495 + (k % 4) * 8 : 405 + (k % 5) * 6) + ((k - 1) % 3 !== 0 ? WATER_NIGHT_BONUS : 0);
    const wakeAt = 6 * 60 + 40 + (k % 3) * 10, bedAt = wakeAt + 24 * 60 - asleep - 12;
    nights.push({id: `health_sleep-earlier-${id.padStart(4, '0')}`, kind: 'night', start: new Date(instantAt(bedAt >= 1440 ? date : prev, clock(bedAt), ZONE)).toISOString(), end: new Date(instantAt(date, clock(wakeAt), ZONE)).toISOString(), timeZone: ZONE,
      latencyMin: 12, awakeMin: 0, awakenings: 0, quality: longNight ? 4 : 3, source: 'manual', createdAt: `${date}T08:00:00.000Z`, updatedAt: `${date}T08:00:00.000Z`});
  }
  if (out.sleep) out.sleep = {...out.sleep, nights: [...nights, ...out.sleep.nights]};
  return healthSchema.parse(out);
}

/**
 * Session AD item 13 (ADR-026): the earlier season's one habit, "Evening stretch (Showcase · earlier season)", done most
 * days from 89 to 60 days back and archived since: the habit days "Sleep and habits" pairs with the season's nights
 * (each side reaches 14 days in the 90-day window). Session AJ (ADR-035 P14): done after every long night and 6 of the 14
 * shorter ones (about 100% and 76% of the scheduled habits with the last 30 days), so the pairing is a clear early sign under
 * the gap rule on every Showcase day; not a promise. Archived before the last 60 days begin, it is in no list, no
 * card and no count of today's habits; the older insights' 60-day window and every pinned count of the last 30 days
 * never see it. Deterministic: the same day always gives the same habit.
 */
export const EARLIER_HABIT_ID = '92000000-0000-4000-8000-000000000008';
/** The season's days (k = 0 is its first) with no stretch: eight after a shorter night (k even), five of them on a day with
 * water, so water and habits stay close (88% and 82%, "no clear difference so far"). Session AJ: was four (95% and 90%). */
const STRETCH_MISSED = new Set([8, 18, 22, 6, 12, 24, 4, 14]);
export function withEarlierHabit(habits: HabitData, day: string): HabitData {
  if (habits.habits.some(h => h.id === EARLIER_HABIT_ID)) return habits;
  const first = addLocalDays(day, EARLIER_FIRST), archivedFrom = addLocalDays(day, EARLIER_LAST + 1), stamp = `${first}T08:00:00.000Z`;
  const data = createHabit(habits, {title: 'Evening stretch (Showcase · earlier season)', category: 'Wellbeing', description: 'Ten minutes of stretching before bed.', notes: 'SHOWCASE DATA · fictional habit from an earlier season, archived since', schedule: {kind: 'daily'}, target: 10, measurement: {kind: 'duration', unit: 'minutes'}}, new Date(stamp), EARLIER_HABIT_ID);
  const habit = data.habits.at(-1)!, active = habit.rules[0]!;
  habit.startDate = first;
  habit.rules = [{...active, from: first}, {...active, from: archivedFrom, state: 'archived'}];
  habit.entries = [];
  // A check-in on each of its 30 days: ten minutes done, or marked missed (a day not done, never a skip).
  for (let k = 0; k <= EARLIER_LAST - EARLIER_FIRST; k++) { const date = addLocalDays(day, EARLIER_FIRST + k), missed = STRETCH_MISSED.has(k); habit.entries.push({date, count: missed ? 0 : 10, disposition: missed ? 'failed' : 'logged', note: missed ? 'Showcase example · not done' : 'Showcase example', updatedAt: `${date}T21:00:00.000Z`}); }
  habit.updatedAt = `${archivedFrom}T08:00:00.000Z`;
  return habitDataSchema.parse(data);
}
