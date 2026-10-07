import {describe, expect, test} from 'vitest';
import {addDays, instantAt} from '../zone-time';
import {createEmptyHealth, healthSchema, HEALTH_STORAGE_KEY} from '../health';
import {buildShowcase} from '../showcase-data';
import {healthGroupIn, withHealthGroup} from '../vault/w-homes';
import {widgetMetric, type DashboardSources} from '../dashboard-metrics';
import type {DashboardWidget} from '../dashboard-settings';
import {emptyPlatform} from '../positions';
import {emptyHabitData} from '../habits';
import {emptyWReminders} from '../reminders/w-schema';
import {WIND_DOWN, dismissWindDown, setWindDown, windDownDue} from '../reminders/wind-down';
import {emptySleep, sleepSchema, type Sleep} from './schema';
import {asleep, dailySeries, nightDay, saveNight, setSleepGoal, summary} from './engine';
import {SLEEP_MIN_NIGHTS, SLEEP_MIN_SIDE, sleepInsights} from './insights';
import {showcaseSleep} from './showcase';

// Session W Part 4: the wind-down reminder, the patterns from the person's own nights, the Showcase nights and the Today
// widget. Everything here is fictional.
const UTC = 'UTC', NOW = new Date('2026-12-01T00:00:00Z');
const add = (s: Sleep, wake: string, bed: string, up: string, extra: {tags?: string[]; latencyMin?: number; awakeMin?: number} = {}) => {
  const bedDate = bed > up ? addDays(wake, -1) : wake;
  return saveNight(s, {kind: 'night', start: instantAt(bedDate, bed, UTC), end: instantAt(wake, up, UTC), timeZone: UTC, ...extra}, NOW);
};

describe('the wind-down reminder (this device, zigoals:w-reminders:v1)', () => {
  // The reminder compares the device's own clock: pin the zone so the test means the same everywhere.
  const local = (clock: string) => { const [h, m] = clock.split(':').map(Number); const d = new Date(2026, 9, 21, h, m); return d; };
  test('off until a time is set; due once that time has passed today; gone while a night runs', () => {
    expect(windDownDue({w: emptyWReminders(), running: false, now: local('23:00')})).toBeNull();
    const w = setWindDown(emptyWReminders(), '22:15');
    expect(windDownDue({w, running: false, now: local('22:14')})).toBeNull();
    expect(windDownDue({w, running: false, now: local('22:15')})).toEqual({id: WIND_DOWN, kind: 'wind-down', title: 'Wind-down time', time: '22:15', day: '2026-10-21', href: '/app/health?view=sleep'});
    expect(windDownDue({w, running: true, now: local('22:40')})).toBeNull();
  });
  test('"Not tonight" keeps it away for the rest of the day and lets it come back tomorrow', () => {
    const w = dismissWindDown(setWindDown(emptyWReminders(), '22:15'), '2026-10-21');
    expect(windDownDue({w, running: false, now: local('23:30')})).toBeNull();
    const tomorrow = new Date(2026, 9, 22, 22, 20);
    expect(windDownDue({w, running: false, now: tomorrow})?.day).toBe('2026-10-22');
  });
  test('a wrong time is refused; null turns it off and keeps the other reminders', () => {
    expect(() => setWindDown(emptyWReminders(), '25:00')).toThrow();
    const both = {...setWindDown(emptyWReminders(), '22:00'), meditation: {time: '07:00'}};
    expect(setWindDown(both, null)).toEqual({...emptyWReminders(), meditation: {time: '07:00'}});
  });
});

describe('patterns from the person\'s own nights (the insights rules: 14 nights, 5 on each side, descriptive words)', () => {
  const TODAY = '2026-10-30';
  function log(nights: number, tagged: (i: number) => boolean, short: number) {
    let s = emptySleep();
    for (let i = 0; i < nights; i++) s = add(s, addDays(TODAY, -i), '23:00', tagged(i) ? (short ? `0${7 - short}:00` : '07:00') : '07:00', tagged(i) ? {tags: ['caffeine']} : {});
    return s;
  }
  test('nothing below 14 logged nights in the window, or below 5 on each side', () => {
    expect(sleepInsights(log(SLEEP_MIN_NIGHTS - 1, i => i % 2 === 0, 1), TODAY)).toEqual([]);
    expect(sleepInsights(log(20, i => i < SLEEP_MIN_SIDE - 1, 1), TODAY)).toEqual([]);
  });
  test('a difference under 20 minutes says nothing', () => {
    let s = emptySleep();
    for (let i = 0; i < 16; i++) s = add(s, addDays(TODAY, -i), '23:00', i % 2 ? '06:50' : '07:00', i % 2 ? {tags: ['screens']} : {});
    expect(sleepInsights(s, TODAY)).toEqual([]);
  });
  test('a real difference is described with both averages, the counts and "not proof"; no advice words', () => {
    const all = sleepInsights(log(16, i => i % 2 === 0, 1), TODAY);
    expect(all).toHaveLength(1);
    const found = all[0]!;
    expect(found).toMatchObject({id: 'sleep-tag:caffeine', withTag: {nights: 8, average: 420}, without: {nights: 8, average: 480}, window: {end: TODAY}});
    expect(found.sentence).toBe('On nights you tagged “caffeine”, you slept 7 h 00 min on average; on your other nights, 8 h 00 min. A pattern in your own log, not proof of a cause.');
    for (const word of ['because', 'helps', 'leads to', 'improves', 'causes', 'should', 'better', 'more']) expect(found.sentence.toLowerCase()).not.toMatch(new RegExp(`\\b${word}\\b`));
  });
  test('nights older than 60 days and naps are left out', () => {
    let s = log(16, i => i % 2 === 0, 1);
    const old = log(16, i => i % 2 === 0, 1).nights.map(n => ({...n, id: `${n.id.slice(0, 40)}-old`, start: new Date(Date.parse(n.start) - 90 * 86_400_000).toISOString(), end: new Date(Date.parse(n.end!) - 90 * 86_400_000).toISOString()}));
    s = sleepSchema.parse({...s, nights: [...s.nights, ...old]});
    expect(sleepInsights(s, TODAY)[0]!.withTag.nights).toBe(8);
  });
});

describe('the Showcase nights', () => {
  const DAY = '2026-10-05';
  test('30 fictional days ending on the Showcase day: three left unlogged, one nap, tags, the marked note and a goal', () => {
    const s = showcaseSleep(DAY);
    expect(sleepSchema.parse(s)).toEqual(s);
    const nights = s.nights.filter(n => n.kind === 'night'), days = nights.map(n => nightDay(n));
    expect(nights).toHaveLength(27);
    expect(s.nights.filter(n => n.kind === 'nap')).toHaveLength(1);
    expect(days).toContain(DAY);
    for (const gap of [4, 11, 19]) expect(days).not.toContain(addDays(DAY, -gap));
    expect(new Set(days).size).toBe(27);
    expect(nights.some(n => n.tags?.includes('caffeine'))).toBe(true);
    expect(s.nights.filter(n => n.note).map(n => n.note)).toEqual(['SHOWCASE DATA · fictional night']);
    expect(s.goal).toMatchObject({minutes: 480, bedFrom: '22:30', bedTo: '23:30'});
    // No two records overlap, and every night is a plausible one.
    const spans = [...s.nights].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < spans.length; i++) expect(spans[i]!.start >= spans[i - 1]!.end!).toBe(true);
    for (const n of nights) { const a = asleep(n)!; expect(a.minutes).toBeGreaterThan(360); expect(a.minutes).toBeLessThan(600); }
  });
  test('the same day always gives the same nights, and the Showcase Health holds them (v4)', () => {
    expect(showcaseSleep(DAY)).toEqual(showcaseSleep(DAY));
    const health = healthSchema.parse(JSON.parse(buildShowcase(DAY).records[HEALTH_STORAGE_KEY]!));
    expect(health.schemaVersion).toBe(4);
    expect(healthGroupIn(health, 'sleep')).toEqual(showcaseSleep(DAY));
  });
});

describe('the Today widget (Health → Sleep)', () => {
  const sources = (sleep?: Sleep): DashboardSources => ({platform: emptyPlatform(), habits: emptyHabitData(), health: sleep ? withHealthGroup(createEmptyHealth(), 'sleep', sleep, false) : createEmptyHealth(), goals: [], quotes: [], now: Date.parse('2026-10-21T12:00:00Z'), today: '2026-10-21', healthDate: '2026-10-21'});
  const widget = (metric: string): DashboardWidget => ({id: 'w-sleep', kind: 'sleep', metric, title: '', size: 'compact', hidden: false, revision: 1});
  test('no night is never zero', () => {
    expect(widgetMetric(widget('last-night'), sources())).toMatchObject({title: 'Sleep', value: 'No night logged yet', href: '/app/health?view=sleep'});
    expect(widgetMetric(widget('week'), sources(emptySleep()))).toMatchObject({value: 'No nights this week'});
  });
  test('last night: time asleep, its day, estimated when the times in bed are all there is, and the quality', () => {
    let s = add(emptySleep(), '2026-10-21', '23:10', '06:40');
    s = sleepSchema.parse({...s, nights: s.nights.map(n => ({...n, quality: 4}))});
    expect(widgetMetric(widget('last-night'), sources(s))).toMatchObject({value: '7 h 30 min asleep', detail: 'Night ending 2026-10-21 · estimated · quality 4/5'});
  });
  test('the week: the average over the nights logged, how many, and the goal', () => {
    let s = add(add(emptySleep(), '2026-10-20', '23:00', '07:00', {latencyMin: 0, awakeMin: 0}), '2026-10-21', '23:00', '06:00', {latencyMin: 0, awakeMin: 0});
    s = setSleepGoal(s, {minutes: 480}, NOW);
    expect(summary(dailySeries(s, '2026-10-21', 7))!.nights).toBe(2);
    expect(widgetMetric(widget('week'), sources(s))).toMatchObject({value: '7 h 30 min a night', detail: 'Average over 2 logged nights in the last 7 days · goal 8 h 00 min'});
  });
});
