import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, planSkip, setHabitState, type HabitData, type HabitInput} from '../habits';
import {emptyReminders, type Reminders} from '../reminders/schema';
import {DEFAULT_QUIET, EVERY_DAY, MAX_SCHEDULES, deriveSchedules, habitWeekdays, inQuietWindow, weekdayBit} from './schedule';

// ADR-010 "schedule.ts": the derivation from this device's reminder times and the habit journal, in zones only.
const TODAY = '2026-10-05'; // a Monday
const AT = new Date(`${TODAY}T07:00:00.000Z`);
const input = (title: string, schedule: HabitInput['schedule'] = {kind: 'daily'}): HabitInput => ({title, category: 'Health', description: '', notes: '', schedule, target: 1});
function journal(...habits: [id: string, input: HabitInput][]): HabitData {
  let data = emptyHabitData();
  for (const [id, spec] of habits) data = createHabit(data, spec, AT, id);
  return data;
}
const reminders = (habits: Record<string, string>, water?: string): Reminders => ({...emptyReminders(), habits: Object.fromEntries(Object.entries(habits).map(([id, time]) => [id, {time}])), ...(water ? {water: {time: water}} : {})});
const ids = ['10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003'];

test('weekday bits: Monday = 1 … Sunday = 64; every day is 127', () => {
  expect([1, 2, 3, 4, 5, 6, 0].map(weekdayBit)).toEqual([1, 2, 4, 8, 16, 32, 64]);
  expect([1, 2, 3, 4, 5, 6, 0].map(weekdayBit).reduce((a, b) => a | b)).toBe(EVERY_DAY);
});
describe('habitWeekdays: the coming week, from the journal', () => {
  test('a daily habit is every day; a weekday schedule is those days; a planned skip and a paused habit drop out', () => {
    let habits = journal([ids[0]!, input('Walk')], [ids[1]!, input('Gym', {kind: 'weekdays', days: [1, 3, 5]})], [ids[2]!, input('Paused')]);
    expect(habitWeekdays(habits, ids[0]!, TODAY)).toBe(EVERY_DAY);
    expect(habitWeekdays(habits, ids[1]!, TODAY)).toBe(weekdayBit(1) | weekdayBit(3) | weekdayBit(5));
    habits = planSkip(habits, ids[0]!, '2026-10-07', 'Travel', AT);
    expect(habitWeekdays(habits, ids[0]!, TODAY)).toBe(EVERY_DAY & ~weekdayBit(3));
    habits = setHabitState(habits, ids[2]!, 'paused', AT);
    expect(habitWeekdays(habits, ids[2]!, TODAY)).toBe(0);
    expect(habitWeekdays(habits, 'missing', TODAY)).toBe(0);
  });
});
describe('deriveSchedules', () => {
  test('one row per distinct time and mask, the water reminder every day, sorted by time; never a title in a row', () => {
    const habits = journal([ids[0]!, input('Walk')], [ids[1]!, input('Gym', {kind: 'weekdays', days: [1, 3, 5]})]);
    const derived = deriveSchedules({reminders: reminders({[ids[0]!]: '08:00', [ids[1]!]: '07:30'}, '09:15'), habits, zone: 'Europe/Brussels', quiet: DEFAULT_QUIET, today: TODAY});
    expect(derived).toEqual({schedules: [{time: '07:30', zone: 'Europe/Brussels', weekdays: weekdayBit(1) | weekdayBit(3) | weekdayBit(5)}, {time: '08:00', zone: 'Europe/Brussels', weekdays: EVERY_DAY}, {time: '09:15', zone: 'Europe/Brussels', weekdays: EVERY_DAY}], refused: [], dropped: 0});
    expect(JSON.stringify(derived.schedules)).not.toMatch(/Walk|Gym|Water|count|title/);
  });
  test('rows with the same time and mask merge; a reminder for a habit the journal no longer holds is ignored', () => {
    const habits = journal([ids[0]!, input('Walk')], [ids[1]!, input('Read')]);
    const derived = deriveSchedules({reminders: reminders({[ids[0]!]: '08:00', [ids[1]!]: '08:00', [ids[2]!]: '08:00'}), habits, zone: 'UTC', quiet: DEFAULT_QUIET, today: TODAY});
    expect(derived.schedules).toEqual([{time: '08:00', zone: 'UTC', weekdays: EVERY_DAY}]);
    expect(deriveSchedules({reminders: reminders({[ids[0]!]: '08:00'}), habits: undefined, zone: 'UTC', quiet: DEFAULT_QUIET, today: TODAY}).schedules).toEqual([]);
  });
  test('a time inside the quiet window is refused and named; from = to means no window', () => {
    const habits = journal([ids[0]!, input('Evening walk')]);
    const derived = deriveSchedules({reminders: reminders({[ids[0]!]: '23:00'}, '06:30'), habits, zone: 'UTC', quiet: DEFAULT_QUIET, today: TODAY});
    expect(derived.schedules).toEqual([]);
    expect(derived.refused).toEqual([{title: 'Water', time: '06:30'}, {title: 'Evening walk', time: '23:00'}]);
    expect(deriveSchedules({reminders: reminders({[ids[0]!]: '23:00'}), habits, zone: 'UTC', quiet: {from: '22:00', to: '22:00'}, today: TODAY}).schedules).toHaveLength(1);
    expect(inQuietWindow('06:59', DEFAULT_QUIET)).toBe(true); expect(inQuietWindow('07:00', DEFAULT_QUIET)).toBe(false); expect(inQuietWindow('22:00', DEFAULT_QUIET)).toBe(true); expect(inQuietWindow('21:59', DEFAULT_QUIET)).toBe(false);
    expect(inQuietWindow('13:00', {from: '12:00', to: '14:00'})).toBe(true); expect(inQuietWindow('14:00', {from: '12:00', to: '14:00'})).toBe(false);
  });
  test('the 20 earliest times are kept and the rest counted', () => {
    const many = Array.from({length: 25}, (_, i) => [`20000000-0000-4000-8000-0000000000${String(i).padStart(2, '0')}`, input(`Habit ${i}`)] as [string, HabitInput]);
    const habits = journal(...many);
    const times = Object.fromEntries(many.map(([id], i) => [id, `${String(8 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`]));
    const derived = deriveSchedules({reminders: reminders(times), habits, zone: 'UTC', quiet: DEFAULT_QUIET, today: TODAY});
    expect(derived.schedules).toHaveLength(MAX_SCHEDULES); expect(derived.dropped).toBe(5);
    expect(derived.schedules[0]!.time).toBe('08:00'); expect(derived.schedules.at(-1)!.time).toBe('12:45');
  });
  test('the zones of the habit tests: the device zone is what the Worker gets, whatever the journal zone', () => {
    for (const zone of ['UTC', 'Europe/Brussels', 'America/Los_Angeles', 'America/New_York', 'Asia/Kolkata', 'Asia/Kathmandu', 'Australia/Lord_Howe', 'Pacific/Chatham', 'Pacific/Kiritimati', 'Pacific/Niue', 'Pacific/Apia']) {
      const habits = journal([ids[0]!, input('Walk')]);
      const derived = deriveSchedules({reminders: reminders({[ids[0]!]: '08:00'}), habits: {...habits, timeZone: 'Asia/Tokyo'}, zone, quiet: DEFAULT_QUIET, today: TODAY});
      expect(derived.schedules).toEqual([{time: '08:00', zone, weekdays: EVERY_DAY}]);
    }
  });
});
