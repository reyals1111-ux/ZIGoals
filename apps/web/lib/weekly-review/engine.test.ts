import {afterEach, describe, expect, test} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {HABITS_KEY, habitDataSchema, emptyHabitData} from '../habits';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema} from '../health';
import {PLATFORM_KEY, emptyPlatform, platformSchema} from '../positions';
import {reviewState, reviewWindow, weekSummary} from './engine';
import {MAX_REVIEWS, WEEKLY_REVIEW_KEY, emptyWeeklyReview, weeklyReviewSchema} from './schema';
import {finishReview, readWeeklyReview, saveReviewNotes, skipReview, startOverWeeklyReview, updateWeeklyReview} from './store';

// G1 (docs/product/features/G1-weekly-review.md, "Tests"): the week, its figures from the records, and the stored words.
const deviceZone = process.env.TZ;
afterEach(() => { if (deviceZone === undefined) delete process.env.TZ; else process.env.TZ = deviceZone; });
function memoryStorage() { const m = new Map<string, string>(); return {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage; }
function showcase(day = '2026-10-01') {
  const {records} = buildShowcase(day);
  return {habits: habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!)), health: healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!)), platform: platformSchema.parse(JSON.parse(records[PLATFORM_KEY]!))};
}

describe('reviewWindow', () => {
  test('the most recent chosen weekday on or before today, and the six days before it', () => {
    expect(reviewWindow(0, '2026-10-01')).toEqual({reviewDay: '2026-09-27', weekStart: '2026-09-21', weekEnd: '2026-09-27'});
    expect(reviewWindow(4, '2026-10-01')).toEqual({reviewDay: '2026-10-01', weekStart: '2026-09-25', weekEnd: '2026-10-01'});
    expect(reviewWindow(5, '2026-10-01').reviewDay).toBe('2026-09-25');
  });
  test('across DST changes the week is seven calendar days', () => {
    expect(reviewWindow(0, '2026-03-30')).toEqual({reviewDay: '2026-03-29', weekStart: '2026-03-23', weekEnd: '2026-03-29'});
    expect(reviewWindow(0, '2026-10-26').reviewDay).toBe('2026-10-25');
  });
  test.each(['UTC', 'Europe/Brussels', 'America/New_York', 'Pacific/Kiritimati', 'Etc/GMT+12', 'Asia/Kolkata', 'Asia/Kathmandu', 'Australia/Adelaide', 'Pacific/Chatham', 'Australia/Lord_Howe', 'America/Santiago'])('pure date strings: the host zone %s changes nothing', zone => {
    process.env.TZ = zone;
    expect(reviewWindow(0, '2026-10-01')).toEqual({reviewDay: '2026-09-27', weekStart: '2026-09-21', weekEnd: '2026-09-27'});
  });
});

describe('weekSummary', () => {
  test('the Showcase week ending on its day: counts from the records, nothing invented', () => {
    process.env.TZ = 'UTC';
    const {habits, health, platform} = showcase(), window = reviewWindow(4, '2026-10-01');
    const summary = weekSummary({...window, habits, health, platform, now: Date.parse('2026-10-01T12:00:00Z'), financial: true, review: emptyWeeklyReview()});
    // Habits: every Showcase habit is daily; the ninth-day skips fall on different days per habit.
    const walk = summary.habits.find(h => h.title === 'Walk')!;
    expect(walk).toMatchObject({scheduled: 7, done: 6, skipped: 1, unit: 'days'});
    expect(summary.habits.map(h => h.title)).toEqual(['Read', 'Exercise', 'Walk', 'Meditate', 'Contribute', 'Drink water']);
    expect(summary.habits.every(h => h.done + h.skipped <= h.scheduled)).toBe(true);
    // Health: meals every day, the seven Showcase walks, water days present, the latest weight in the week.
    expect(summary.health[0]).toBe('7 days with meals logged');
    const walks = health.activity.filter(a => a.date >= window.weekStart && a.date <= window.weekEnd);
    expect(summary.health[1]).toBe(`${walks.reduce((n, a) => n + a.steps, 0).toLocaleString('en-US')} steps · ${walks.reduce((n, a) => n + a.minutes, 0)} min movement`);
    expect(summary.health.some(line => line.startsWith('latest weight'))).toBe(true);
    // Went well: counts only; the best day has the most records.
    expect(summary.wentWell.habitCheckIns).toBeGreaterThan(30); expect(summary.wentWell.healthEntries).toBeGreaterThan(20); expect(summary.wentWell.bestDay).toMatch(/^2026-/);
    // Goals and wealth come from the existing engines.
    expect(summary.goals.length).toBe(platform.goals.filter(g => g.status === 'active').length);
    expect(summary.goals[0]).toMatchObject({name: expect.any(String), fundingHealth: expect.any(String), progress: expect.stringMatching(/%$/)});
    expect(summary.wealth!.subtotals.length).toBeGreaterThan(0); expect(typeof summary.wealth!.subtotals[0]!.value).toBe('bigint');
    expect(summary.lastIntention).toBeNull();
  });
  test('empty data gives empty lists and no numbers, never NaN or "0 of 0"', () => {
    const summary = weekSummary({...reviewWindow(0, '2026-10-01'), habits: emptyHabitData(), health: createEmptyHealth(), platform: emptyPlatform(), now: Date.parse('2026-10-01T12:00:00Z'), financial: false, review: emptyWeeklyReview()});
    expect(summary).toEqual({wentWell: {habitCheckIns: 0, healthEntries: 0, goalContributions: 0, bestDay: null}, goals: [], habits: [], health: [], wealth: null, lastIntention: null});
  });
  test('the last completed intention is shown; a draft or a skipped week is not', () => {
    const review = {version: 1 as const, weekday: 0, reviews: [{weekStart: '2026-09-07', completedAt: '2026-09-13T19:00:00.000Z', notes: {intention: 'One short walk after lunch'}}, {weekStart: '2026-09-14', notes: {intention: 'A draft'}}, {weekStart: '2026-09-21', skipped: true as const}]};
    const summary = weekSummary({...reviewWindow(0, '2026-10-01'), habits: emptyHabitData(), health: createEmptyHealth(), platform: emptyPlatform(), now: Date.parse('2026-10-01T12:00:00Z'), financial: false, review});
    expect(summary.lastIntention).toBe('One short walk after lunch');
  });
});

describe('store', () => {
  test('skip, draft words, finish, one review per week, the cap and version 2', () => {
    const storage = memoryStorage(), week = '2026-09-21', now = new Date('2026-09-27T19:30:00Z');
    expect(updateWeeklyReview(storage, current => skipReview(current, week))).toEqual({version: 1, weekday: 0, reviews: [{weekStart: week, skipped: true}]});
    expect(reviewState(readWeeklyReview(storage).data, week)).toBe('skipped');
    const draft = updateWeeklyReview(storage, current => saveReviewNotes(current, '2026-09-28', {wentWell: '  Three walks ', goals: '   '}));
    expect(draft.reviews.find(r => r.weekStart === '2026-09-28')).toEqual({weekStart: '2026-09-28', notes: {wentWell: 'Three walks'}});
    expect(reviewState(draft, '2026-09-28')).toBe('draft'); expect(reviewState(draft, '2026-10-05')).toBe('due');
    const done = updateWeeklyReview(storage, current => finishReview(saveReviewNotes(current, '2026-09-28', {intention: 'Sleep earlier'}), '2026-09-28', now));
    expect(done.reviews.find(r => r.weekStart === '2026-09-28')).toEqual({weekStart: '2026-09-28', completedAt: now.toISOString(), notes: {wentWell: 'Three walks', intention: 'Sleep earlier'}});
    expect(reviewState(done, '2026-09-28')).toBe('done');
    expect(done.reviews).toHaveLength(2);
    expect(JSON.parse(storage.getItem(WEEKLY_REVIEW_KEY)!)).toEqual(done);
    const full = {version: 1 as const, weekday: 0, reviews: Array.from({length: MAX_REVIEWS}, (_, i) => ({weekStart: `${2000 + Math.floor(i / 52)}-${String(1 + Math.floor((i % 52) / 5)).padStart(2, '0')}-${String(1 + (i % 52) % 5 * 6).padStart(2, '0')}`, skipped: true as const}))};
    expect(new Set(full.reviews.map(r => r.weekStart)).size).toBe(MAX_REVIEWS);
    expect(() => skipReview(full, '2030-12-29')).toThrow('the most it keeps');
    expect(weeklyReviewSchema.safeParse({version: 2, weekday: 0, reviews: []}).success).toBe(false);
    expect(weeklyReviewSchema.safeParse({version: 1, weekday: 7, reviews: []}).success).toBe(false);
    expect(weeklyReviewSchema.safeParse({version: 1, weekday: 0, reviews: [{weekStart: week, notes: {mood: 'x'}}]}).success).toBe(false);
  });
  test('unreadable bytes are read as empty, said so and never touched; Start over keeps a recovery copy', () => {
    const storage = memoryStorage();
    storage.setItem(WEEKLY_REVIEW_KEY, '{"version":1,"weekday":0,"reviews":[{"weekStart":"x"}]}');
    expect(readWeeklyReview(storage)).toEqual({data: emptyWeeklyReview(), unreadable: true});
    expect(() => updateWeeklyReview(storage, c => c)).toThrow('could not be read');
    startOverWeeklyReview(storage);
    expect(readWeeklyReview(storage)).toEqual({data: emptyWeeklyReview(), unreadable: false});
    expect(Array.from({length: storage.length}, (_, i) => storage.key(i)!).some(k => k.startsWith(`${WEEKLY_REVIEW_KEY}:recovery:`))).toBe(true);
  });
});
