import {afterEach, describe, expect, it} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {HABITS_KEY, createHabit, emptyHabitData, habitDataSchema, logHabitValue, type HabitData, type HabitInput} from '../habits';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema, newHealthId} from '../health';
import {addWater} from '../health-daily';
import {PLATFORM_KEY, emptyPlatform, platformSchema, type Platform} from '../positions';
import {emptyGoalExtras} from '../goal-extras/store';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {addLocalDays} from '../local-date';
import {STORIES_KEY} from '../af-extras-keys';
import {lifeReview, reviewPeriod, type EnginePeriod} from '../life-review/engine';
import {LIFE_REVIEW, lifeReviewSchema} from '../life-review/store';
import {STORY_MIN_DAYS, bestDay, factsByDay, loggedDays, pillarDays} from './days';
import {buildStory, shareSafe, storyStyle} from './build';
import {MAX_SEEN, STORIES, markOpened, weekStoryOpenedRecently} from './store';
import {storiesDoor} from './door';

const deviceZone = process.env.TZ;
afterEach(() => { if (deviceZone === undefined) delete process.env.TZ; else process.env.TZ = deviceZone; });
const TODAY = '2026-10-19';
const ID = 'eeeeeeee-0000-4000-8000-0000000000e1';
const habit = (title: string): HabitInput => ({title, category: 'Fictional', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}});
function habitsOn(back: number[]): HabitData {
  let d = createHabit(emptyHabitData(), habit('Fictional stretch'), new Date(`${addLocalDays(TODAY, -60)}T06:00:00Z`), ID);
  for (const b of back) d = logHabitValue(d, ID, addLocalDays(TODAY, -b), 1, {}, new Date(`${TODAY}T08:00:00Z`));
  return d;
}
function story(period: EnginePeriod, records: {habits: HabitData; health?: ReturnType<typeof createEmptyHealth>; platform?: Platform}, today = TODAY) {
  const health = records.health ?? createEmptyHealth(), platform = records.platform ?? emptyPlatform();
  const review = lifeReview({window: reviewPeriod(period, today), habits: records.habits, health, platform, goals: platform.goals.map(g => ({key: `private:${g.id}`, id: g.id, name: g.name, href: `/app/goals/tracked/${g.id}`, status: g.status})), averages: [], extras: emptyGoalExtras(), history: [], today});
  return buildStory({review, records: {habits: records.habits, health, platform, today}, platform, rangeLabel: 'fixture range'});
}
const allLines = (s: ReturnType<typeof buildStory>) => s.cards.flatMap(c => [c.eyebrow, c.title, c.big ?? '', ...c.lines]);

describe('the Life review engine’s year window (Session AF, L5b; H78): engine-only, the store stays week | month', () => {
  it('1 January to today, beside last year’s same span (28 February for a 29th)', () => {
    expect(reviewPeriod('year', '2026-10-19')).toEqual({period: 'year', start: '2026-01-01', end: '2026-10-19', prevStart: '2025-01-01', prevEnd: '2025-10-19', key: 'year:2026'});
    expect(reviewPeriod('year', '2028-02-29')).toMatchObject({prevStart: '2027-01-01', prevEnd: '2027-02-28'});
    expect(reviewPeriod('year', '2029-01-01')).toMatchObject({start: '2029-01-01', end: '2029-01-01', prevEnd: '2028-01-01'});
    // The week and month windows are unchanged.
    expect(reviewPeriod('week', '2026-10-12')).toEqual({period: 'week', start: '2026-10-06', end: '2026-10-12', prevStart: '2026-09-29', prevEnd: '2026-10-05', key: 'week:2026-10-06'});
  });
  it('the Life review’s own record still refuses a year (older builds read week | month only)', () => {
    expect(lifeReviewSchema.safeParse({version: 1, period: 'year', focus: {}}).success).toBe(false);
    expect(lifeReviewSchema.safeParse({version: 1, focus: {'year:2026': {text: 'x', setAt: '2026-10-19T08:00:00.000Z'}}}).success).toBe(false);
    expect(LIFE_REVIEW.key).toBe('zigoals:life-review:v1');
  });
});

describe('Stories (Session AF, L5b; P9.3, ADR-028 H78)', () => {
  it('fewer than three logged days: one honest card, never a thin story', () => {
    const s = story('week', {habits: habitsOn([0, 1])});
    expect(s.enough).toBe(false); expect(s.loggedDays).toBe(2); expect(STORY_MIN_DAYS).toBe(3);
    expect(s.cards).toHaveLength(1);
    expect(s.cards[0]).toMatchObject({id: 'not-enough', title: 'Not enough days yet'});
    expect(s.cards[0]!.lines[0]).toBe('Three logged days make a story. This week has 2 days so far.');
    expect(story('week', {habits: emptyHabitData()}).cards[0]!.lines[0]).toMatch(/has 0 days so far/);
  });

  it('a week: the opener with the person’s own style, the streak, the best day and the closing, in that order', () => {
    let health = createEmptyHealth();
    health = addWater(health, {id: newHealthId(), date: addLocalDays(TODAY, -2), amountMilli: 250_000, unit: 'ml'}, `${TODAY}T08:00:00.000Z`);
    const s = story('week', {habits: habitsOn([0, 1, 2, 3, 4]), health});
    expect(s.enough).toBe(true); expect(s.loggedDays).toBe(5);
    expect(s.cards.map(c => c.id)).toEqual(['opener', 'streaks', 'best-day', 'health-trend', 'closing']);
    expect(s.style).toEqual({pillar: 'habits', label: 'Rhythm keeper', line: 'Check-ins led your week: 5 days with them.'});
    expect(s.cards[0]).toMatchObject({title: 'Your week in 5 logged days', big: '5'});
    expect(s.cards[1]).toMatchObject({title: 'Fictional stretch', big: '5', lines: ['5 days in a row, still going.']});
    // The best day: two days hold a check-in and water's day holds two things; that day wins.
    expect(s.cards[2]!.lines).toEqual(['1 habit done', 'Water logged']);
    expect(s.cards.at(-1)!.lines.at(-1)).toBe('This story follows the last seven days and changes tomorrow. Share a card to keep it.');
  });

  it('the style is the person’s own strongest pillar, never a comparison; ties go Habits, Health, Goals, Wealth', () => {
    expect(storyStyle({habits: 2, health: 5, goals: 0, wealth: 1}, 'month')).toEqual({pillar: 'health', label: 'Body listener', line: 'Health logs led your month: 5 days with them.'});
    expect(storyStyle({habits: 3, health: 3, goals: 3, wealth: 3}, 'year')!.pillar).toBe('habits');
    expect(storyStyle({habits: 0, health: 0, goals: 0, wealth: 0}, 'week')).toBeNull();
    for (const s of ['Rhythm keeper', 'Body listener', 'Goal mover', 'Steady contributor']) expect(s).not.toMatch(/top|best|than|rank|percent|others/i);
  });

  it('the Showcase month and year: goals, money and wins in counts only — no line carries an amount, a price, a rate or a return', () => {
    process.env.TZ = 'UTC';
    const {records} = buildShowcase(TODAY);
    const habits = habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!)), health = healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!)), platform = platformSchema.parse(JSON.parse(records[PLATFORM_KEY]!));
    for (const period of ['week', 'month', 'year'] as const) {
      const s = story(period, {habits, health, platform});
      expect(s.enough, period).toBe(true);
      expect(s.cards[0]!.id).toBe('opener'); expect(s.cards.at(-1)!.id).toBe('closing');
      for (const line of allLines(s)) expect(line, `${period}: ${line}`).not.toMatch(/[$€£¥%]|\b(price|rate|return|apr|apy|yield|balance|worth|put in)\b/i);
      expect(new Set(s.cards.map(c => c.id)).size).toBe(s.cards.length);
    }
    const month = story('month', {habits, health, platform});
    expect(month.cards.map(c => c.id)).toEqual(expect.arrayContaining(['streaks', 'best-day', 'health-trend']));
    expect(month.key).toBe('month:2026-10');
    expect(story('year', {habits, health, platform}).key).toBe('year:2026');
  });

  it('shareSafe drops money signs, percentages and the words for prices, rates and returns', () => {
    for (const bad of ['+€50 put in', '5% a year', 'Price of ZIG', 'A 4 rate', 'Your return', 'Balance 1,000', '$20', 'APR 5']) expect(shareSafe(bad), bad).toBe(false);
    for (const good of ['3 contributions to your goals', 'Sleep a night: 7 h 10 min', '1 stake tracked: money working on its own']) expect(shareSafe(good), good).toBe(true);
  });

  it('days and pillars are counted from the records: a check-in, a log, a contribution', () => {
    const facts = factsByDay({habits: habitsOn([0, 1, 9]), health: createEmptyHealth(), platform: emptyPlatform(), today: TODAY}, addLocalDays(TODAY, -6), TODAY);
    expect([...facts.keys()].sort()).toEqual([addLocalDays(TODAY, -1), TODAY]);
    expect(pillarDays(facts)).toEqual({habits: 2, health: 0, goals: 0, wealth: 0});
    expect(bestDay(facts)!.day).toBe(TODAY); // a tie: the latest day wins
    expect(loggedDays({habits: habitsOn([0, 1, 9]), health: createEmptyHealth(), platform: emptyPlatform(), today: TODAY}, '2026-01-01', TODAY)).toBe(3);
  });
});

describe('zigoals:stories:v1 (TIER 3 storage, display) and Today’s door', () => {
  const memory = () => { const m = new Map<string, string>(); return {m, storage: {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}}; };
  it('only an opened story is remembered; loose and versioned; unreadable bytes are never rewritten', () => {
    const {m, storage} = memory();
    expect(STORIES.key).toBe(STORIES_KEY);
    expect(readDeviceRecord(storage, STORIES)).toEqual({data: {version: 1, seen: {}}, unreadable: false});
    m.set(STORIES_KEY, JSON.stringify({version: 1, seen: {'week:2026-10-06': '2026-10-12'}, later: 1}));
    updateDeviceRecord(storage, STORIES, r => markOpened(r, 'year:2026', TODAY));
    expect(JSON.parse(m.get(STORIES_KEY)!)).toEqual({version: 1, seen: {'week:2026-10-06': '2026-10-12', 'year:2026': TODAY}, later: 1});
    expect(() => markOpened(STORIES.empty(), 'decade:2020', TODAY)).toThrow();
    m.set(STORIES_KEY, '{"version":9}');
    expect(readDeviceRecord(storage, STORIES).unreadable).toBe(true);
    expect(m.get(STORIES_KEY)).toBe('{"version":9}');
    let r = STORIES.empty();
    for (let i = 0; i < MAX_SEEN + 5; i++) r = markOpened(r, `week:${addLocalDays('2020-01-01', i)}`, addLocalDays('2020-01-01', i));
    expect(Object.keys(r.seen)).toHaveLength(MAX_SEEN);
  });
  it('the door shows while the week’s story is ready and unopened; it rests for a week after opening; deciding writes nothing', () => {
    const records = {habits: habitsOn([0, 1, 2]), health: createEmptyHealth(), platform: emptyPlatform(), today: TODAY};
    expect(storiesDoor({records: null, stories: null}).state).toBe('loading');
    expect(storiesDoor({records, stories: STORIES.empty()})).toEqual({state: 'shown', loggedDays: 3});
    expect(storiesDoor({records: {...records, habits: habitsOn([0, 1])}, stories: STORIES.empty()}).state).toBe('hidden');
    const opened = markOpened(STORIES.empty(), 'week:2026-10-13', addLocalDays(TODAY, -3));
    expect(weekStoryOpenedRecently(opened, TODAY)).toBe(true);
    expect(storiesDoor({records, stories: opened}).state).toBe('hidden');
    expect(storiesDoor({records, stories: markOpened(STORIES.empty(), 'week:2026-10-01', addLocalDays(TODAY, -8))}).state).toBe('shown');
  });
});
