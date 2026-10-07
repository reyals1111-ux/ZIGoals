import {beforeEach, describe, expect, test, vi} from 'vitest';
import {createHabit, emptyHabitData, type HabitInput} from '../habits';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema, type HealthData} from '../health';
import {saveHealthPreferences, dailyData} from '../health-daily';
import {emptySleep, type SleepNight} from '../sleep/schema';
import {instantAt} from '../zone-time';
import {withHealthGroup} from '../vault/w-homes';
import {updateHome} from '../sync-homes-store';
import {HABIT_ID, healthV3} from '../vault/format-fixtures';
import {autoCompletions, formatMeasureValue, measureSource, measureValue, ruleMet} from './engine';
import {HABIT_HEALTH_LINKS_KEY, habitHealthLinkSchema, habitHealthLinksSchema, type HabitHealthLinkV4} from './schema';
import {setHabitHealthLink} from './store';

// Session W Part 4: habits that tick themselves off from sleep (Health v4 only). A night counts on its wake date in its
// own zone, its length is exact across a daylight-saving change, and nothing recorded is never zero.
const AT = '2026-10-25T09:00:00.000Z';
const link = (patch: Partial<HabitHealthLinkV4>): HabitHealthLinkV4 => ({version: 1, measure: 'sleepMinutes', rule: 'at-least', target: 420, updatedAt: AT, ...patch});
let n = 0;
function night(zone: string, bed: [string, string], wake: [string, string], patch: Partial<SleepNight> = {}): SleepNight {
  n++;
  return {id: `health_sleep-test-${String(n).padStart(4, '0')}`, kind: 'night', start: new Date(instantAt(bed[0], bed[1], zone)).toISOString(), end: new Date(instantAt(wake[0], wake[1], zone)).toISOString(), timeZone: zone, source: 'manual', createdAt: AT, updatedAt: AT, ...patch};
}
const withNights = (nights: SleepNight[], health: HealthData = createEmptyHealth()): HealthData => withHealthGroup(health, 'sleep', {...emptySleep(), nights}, false);

describe('sleepMinutes: time asleep over the nights that ended on the Health day', () => {
  test('in bed minus time to fall asleep and time awake; naps and other days do not count; no night is null', () => {
    const health = withNights([
      night('UTC', ['2026-10-20', '23:00'], ['2026-10-21', '07:00'], {latencyMin: 15, awakeMin: 25}),
      night('UTC', ['2026-10-21', '14:00'], ['2026-10-21', '14:30'], {kind: 'nap'}),
      night('UTC', ['2026-10-21', '23:30'], ['2026-10-22', '06:00']),
    ]);
    expect(measureValue(health, '2026-10-21', link({}))).toBe(480 - 40);
    expect(measureValue(health, '2026-10-22', link({}))).toBe(390);
    expect(measureValue(health, '2026-10-23', link({}))).toBeNull();
    expect(measureValue(createEmptyHealth(), '2026-10-21', link({}))).toBeNull();
  });
  test('the Brussels night of 24–25 October 2026 (clocks back at 03:00) is nine hours in bed, counted on the 25th', () => {
    const health = withNights([night('Europe/Brussels', ['2026-10-24', '23:00'], ['2026-10-25', '07:00'])]);
    expect(measureValue(health, '2026-10-25', link({}))).toBe(540);
    expect(measureValue(health, '2026-10-24', link({}))).toBeNull();
  });
  test('the New York night of 31 October–1 November 2026 (clocks back at 02:00) is nine hours too', () => {
    const health = withNights([night('America/New_York', ['2026-10-31', '23:00'], ['2026-11-01', '07:00'])]);
    expect(measureValue(health, '2026-11-01', link({}))).toBe(540);
  });
  test('the spring change is an hour shorter: Brussels 28–29 March 2026 is seven hours', () => {
    const health = withNights([night('Europe/Brussels', ['2026-03-28', '23:00'], ['2026-03-29', '07:00'])]);
    expect(measureValue(health, '2026-03-29', link({}))).toBe(420);
  });
  test('a night belongs to its wake date in the zone it was lived in, not this device\'s', () => {
    // Woke at 06:30 in Tokyo on the 22nd, which is still the 21st in UTC.
    const health = withNights([night('Asia/Tokyo', ['2026-10-21', '23:00'], ['2026-10-22', '06:30'])]);
    expect(measureValue(health, '2026-10-22', link({}))).toBe(450);
    expect(measureValue(health, '2026-10-21', link({}))).toBeNull();
  });
  test('a running night (no end yet) is not counted', () => {
    const running: SleepNight = {...night('UTC', ['2026-10-21', '23:00'], ['2026-10-22', '07:00']), end: null};
    expect(measureValue(withNights([running]), '2026-10-22', link({}))).toBeNull();
  });
});

describe('bedtimeBy: "in bed by" a time, compared in order around midnight', () => {
  const by = (target: number) => link({measure: 'bedtimeBy', rule: 'by', target});
  test('the bedtime is kept as minutes after noon; the rule holds at or before the target', () => {
    const health = withNights([night('UTC', ['2026-10-20', '22:45'], ['2026-10-21', '06:45'])]);
    const value = measureValue(health, '2026-10-21', by(23 * 60))!;
    expect(value).toBe(10 * 60 + 45);
    expect(ruleMet(by(23 * 60), value)).toBe(true);
    expect(ruleMet(by(22 * 60 + 45), value)).toBe(true);
    expect(ruleMet(by(22 * 60 + 30), value)).toBe(false);
  });
  test('after midnight: 00:15 misses 23:00 but makes 00:30', () => {
    const health = withNights([night('UTC', ['2026-10-21', '00:15'], ['2026-10-21', '07:30'])]);
    const value = measureValue(health, '2026-10-21', by(23 * 60))!;
    expect(ruleMet(by(23 * 60), value)).toBe(false);
    expect(ruleMet(by(30), value)).toBe(true);
  });
  test('two nights ending on a day: the longer one is the night\'s bedtime; no night is null', () => {
    const health = withNights([
      night('UTC', ['2026-10-20', '21:00'], ['2026-10-20', '23:30']),
      night('UTC', ['2026-10-21', '00:40'], ['2026-10-21', '08:00']),
    ]);
    // The short one ended on the 20th; on the 21st only the 00:40 night counts.
    expect(formatMeasureValue('bedtimeBy', measureValue(health, '2026-10-21', by(60))!)).toBe('in bed at 00:40');
    expect(measureValue(health, '2026-10-22', by(60))).toBeNull();
    expect(ruleMet(by(60), null)).toBe(false);
  });
  test('"by" belongs to bedtime links only, and a bedtime link needs its time (the v4 schema)', async () => {
    const {habitHealthLinkV4Schema} = await import('./schema');
    expect(habitHealthLinkV4Schema.safeParse(by(23 * 60)).success).toBe(true);
    expect(habitHealthLinkV4Schema.safeParse(link({measure: 'bedtimeBy', rule: 'by', target: undefined})).success).toBe(false);
    expect(habitHealthLinkV4Schema.safeParse(link({measure: 'bedtimeBy', rule: 'at-least', target: 600})).success).toBe(false);
    expect(habitHealthLinkV4Schema.safeParse(link({measure: 'sleepMinutes', rule: 'by', target: 600})).success).toBe(false);
    // Builds #29–#31 (the v1 link) refuse every Session W measure.
    expect(habitHealthLinkSchema.safeParse(by(23 * 60)).success).toBe(false);
    expect(habitHealthLinkSchema.safeParse(link({})).success).toBe(false);
  });
});

describe('the words and the automatic check-in', () => {
  test('source and value as the badge says them', () => {
    expect(measureSource({measure: 'sleepMinutes'})).toBe('your sleep log');
    expect(measureSource({measure: 'bedtimeBy'})).toBe('your sleep log');
    expect(formatMeasureValue('sleepMinutes', 425)).toBe('7 h 05 min');
    expect(formatMeasureValue('sleepMinutes', 45)).toBe('45 min');
    expect(formatMeasureValue('bedtimeBy', 10 * 60 + 45)).toBe('in bed at 22:45');
  });
  test('meditation minutes record nothing until Part 5', () => {
    expect(measureValue(createEmptyHealth(), '2026-10-21', link({measure: 'meditationMinutes', target: 10}))).toBeNull();
  });
  test('a due "Sleep 7 hours" habit ticks off from last night, and not from a short one', () => {
    const input: HabitInput = {title: 'Sleep 7 hours', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1};
    const habits = createHabit(emptyHabitData(), input, new Date('2026-10-01T08:00:00.000Z'), HABIT_ID);
    const links = {version: 1 as const, links: {[HABIT_ID]: link({target: 420})}, applied: []};
    const now = new Date('2026-10-21T09:00:00.000Z');
    const rested = saveHealthPreferences(withNights([night('UTC', ['2026-10-20', '22:30'], ['2026-10-21', '06:30'], {latencyMin: 10})]), {...dailyData(createEmptyHealth()).preferences, timezone: 'UTC'});
    expect(autoCompletions({links, habits, health: rested, now})).toEqual([{habitId: HABIT_ID, date: '2026-10-21', healthDate: '2026-10-21', measure: 'sleepMinutes', value: 470}]);
    const short = saveHealthPreferences(withNights([night('UTC', ['2026-10-21', '01:00'], ['2026-10-21', '06:30'])]), {...dailyData(createEmptyHealth()).preferences, timezone: 'UTC'});
    expect(autoCompletions({links, habits, health: short, now})).toEqual([]);
  });
});

describe('the synced home (Health v4 habitLinks)', () => {
  function memoryStorage() { const m = new Map<string, string>(); return {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage; }
  beforeEach(() => { vi.stubGlobal('navigator', {locks: {request: async (_key: string, work: () => unknown) => work()}}); });
  test('a bedtime link saves into Health, which moves to v4; the device key is never written', async () => {
    const storage = memoryStorage();
    storage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(healthV3()));
    const bed = link({measure: 'bedtimeBy', rule: 'by', target: 23 * 60});
    const saved = await updateHome('habitLinks', current => setHabitHealthLink(current, HABIT_ID, bed), {storage, syncWrites: true});
    expect(saved.links[HABIT_ID]).toEqual(bed);
    const health = healthSchema.parse(JSON.parse(storage.getItem(HEALTH_STORAGE_KEY)!));
    expect(health.schemaVersion).toBe(4);
    expect((health.habitLinks!.links as Record<string, unknown>)[HABIT_ID]).toEqual(bed);
    expect(storage.getItem(HABIT_HEALTH_LINKS_KEY)).toBeNull();
    // A record that holds one is never a v1 links record (what #29–#31 read).
    expect(habitHealthLinksSchema.safeParse(health.habitLinks).success).toBe(false);
  });
});
