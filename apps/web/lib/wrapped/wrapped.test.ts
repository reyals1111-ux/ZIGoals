import {describe, expect, it} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {HABITS_KEY, createHabit, emptyHabitData, habitDataSchema, logHabitValue, type HabitData, type HabitInput} from '../habits';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema} from '../health';
import {PLATFORM_KEY, emptyPlatform, platformSchema, type Platform} from '../positions';
import {emptyGoalExtras} from '../goal-extras/store';
import {lifeReview} from '../life-review/engine';
import {addLocalDays} from '../local-date';
import {readDeviceRecord} from '../device-record';
import {focusSessionsSchema} from '../focus-sessions/schema';
import {shareSafe} from '../stories/build';
import {buildWrapped, wrappedReviewWindow} from './build';
import {WRAPPED_MIN_DAYS, wrappedDoor, wrappedWindow, wrappedYear} from './door';
import {MAX_WRAPPED_YEARS, WRAPPED, emptyWrapped, markWrappedOpened, wrappedOpened} from './store';
import {wrappedShareCard} from './share';
import {showcaseFocusSessions} from './showcase';

const ID = {a: 'ffffffff-0000-4000-8000-0000000000f1', b: 'ffffffff-0000-4000-8000-0000000000f2'};
const habit = (title: string): HabitInput => ({title, category: 'Fictional', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}});
function habitsDone(today: string, a: number, b: number): HabitData {
  let d = createHabit(emptyHabitData(), habit('Fictional stretch'), new Date('2026-01-01T06:00:00Z'), ID.a);
  d = createHabit(d, habit('Fictional read'), new Date('2026-01-01T06:00:00Z'), ID.b);
  for (let i = 0; i < a; i++) d = logHabitValue(d, ID.a, addLocalDays(today, -i), 1, {}, new Date(`${today}T08:00:00Z`));
  for (let i = 0; i < b; i++) d = logHabitValue(d, ID.b, addLocalDays(today, -i * 3), 1, {}, new Date(`${today}T08:00:00Z`));
  return d;
}
function wrapped(today: string, habits: HabitData, platform: Platform = emptyPlatform(), health = createEmptyHealth(), focus = null as ReturnType<typeof showcaseFocusSessions> | null, example = false) {
  const year = wrappedYear(today);
  const review = lifeReview({window: wrappedReviewWindow(year, today), habits, health, platform, goals: platform.goals.map(g => ({key: `private:${g.id}`, id: g.id, name: g.name, href: `/app/goals/tracked/${g.id}`, status: g.status})), averages: [], extras: emptyGoalExtras(), history: [], today});
  return buildWrapped({year, today, records: {habits, health, platform, today}, review, focus, example});
}

describe('when ZIGoals Wrapped shows (Session AK, F5d)', () => {
  it('the year is this year, except in January (last year\'s)', () => {
    expect(wrappedYear('2026-12-01')).toBe(2026);
    expect(wrappedYear('2027-01-31')).toBe(2026);
    expect(wrappedYear('2027-02-01')).toBe(2027);
    expect(wrappedWindow(2026, '2027-01-10')).toEqual({start: '2026-01-01', end: '2026-12-31', complete: true});
    expect(wrappedWindow(2026, '2026-10-31')).toEqual({start: '2026-01-01', end: '2026-10-31', complete: false});
    expect(wrappedReviewWindow(2028, '2028-02-29')).toMatchObject({prevEnd: '2027-02-28', key: 'year:2028'});
  });
  it('from 1 December with three logged days, or any time with 30; Today\'s card until it is opened', () => {
    const door = (today: string, days: number, record = emptyWrapped()) => wrappedDoor({today, records: {habits: habitsDone(today, days, 0), health: createEmptyHealth(), platform: emptyPlatform(), today}, record});
    expect(door('2026-11-30', 5)).toMatchObject({state: 'hidden', loggedDays: 5, year: 2026});
    expect(door('2026-12-01', 5)).toMatchObject({state: 'shown', todayCard: true, season: true});
    expect(door('2026-12-01', 2).state).toBe('hidden');
    expect(door('2026-10-31', WRAPPED_MIN_DAYS - 1).state).toBe('hidden');
    expect(door('2026-10-31', WRAPPED_MIN_DAYS)).toMatchObject({state: 'shown', todayCard: true, season: false});
    expect(door('2026-12-05', 5, markWrappedOpened(emptyWrapped(), 2026, '2026-12-02'))).toMatchObject({state: 'shown', todayCard: false});
    expect(wrappedDoor({today: '2026-03-01', records: null, record: null}).state).toBe('loading');
    expect(wrappedDoor({today: '2026-03-01', records: {habits: emptyHabitData(), health: createEmptyHealth(), platform: emptyPlatform(), today: '2026-03-01'}, record: emptyWrapped(), showcase: true}).state).toBe('shown');
  });
});

describe('the Wrapped story', () => {
  it('fewer than three logged days make one honest card', () => {
    const w = wrapped('2026-12-03', habitsDone('2026-12-03', 2, 0));
    expect(w.enough).toBe(false);
    expect(w.cards.map(c => c.id)).toEqual(['not-enough']);
    expect(w.cards[0]!.lines[0]).toContain('2 days');
  });
  it('top habits, longest runs, focus, the busiest month and the close, in counts only', () => {
    const today = '2026-12-03', focus = showcaseFocusSessions(today);
    const w = wrapped(today, habitsDone(today, 40, 20), emptyPlatform(), createEmptyHealth(), focus);
    expect(w.enough).toBe(true);
    expect(w.cards.map(c => c.id)).toEqual(['opener', 'top-habits', 'streaks', 'focus', 'best-month', 'closing']);
    const top = w.cards.find(c => c.id === 'top-habits')!;
    expect(top).toMatchObject({title: 'Fictional stretch', big: '40'});
    expect(top.lines).toContain('Fictional read: done on 20 days');
    expect(w.cards.find(c => c.id === 'streaks')!.big).toBe('40');
    const f = w.cards.find(c => c.id === 'focus')!, minutes = focus.sessions.reduce((t, s) => t + s.focusedSeconds, 0) / 60;
    expect(f.big).toBe(String(Math.round(minutes / 6) / 10));
    expect(f.lines[0]).toMatch(/^24 sessions, 21 grown/);
    expect(w.cards.find(c => c.id === 'best-month')!.lines[0]).toContain('logged days');
    expect(w.cards.at(-1)!.title).toBe('That is your 2026, so far.');
    for (const c of w.cards) for (const l of c.lines) expect(shareSafe(l), l).toBe(true);
    expect(w.cards.every(c => c.numbers.length === 0)).toBe(true);
  });
  it('from the Showcase: goals funded with money only as sensitive numbers; labelled Example', () => {
    const day = '2026-12-02', r = buildShowcase(day).records;
    const habits = habitDataSchema.parse(JSON.parse(r[HABITS_KEY]!)), health = healthSchema.parse(JSON.parse(r[HEALTH_STORAGE_KEY]!)), platform = platformSchema.parse(JSON.parse(r[PLATFORM_KEY]!));
    const w = wrapped(day, habits, platform, health, showcaseFocusSessions(day), true);
    expect(w.example).toBe(true);
    expect(w.cards[0]!.eyebrow).toBe('Example · ZIGoals Wrapped 2026');
    const goals = w.cards.find(c => c.id === 'goals-funded');
    expect(goals).toBeTruthy();
    for (const c of w.cards) for (const l of c.lines) expect(shareSafe(l), l).toBe(true);
    const health_ = w.cards.find(c => c.id === 'health');
    expect(health_).toBeTruthy();
    // Sensitive numbers stay off the share image unless asked for.
    const card = [goals!, health_!].find(c => c.numbers.length)!;
    expect(card).toBeTruthy();
    const off = wrappedShareCard(w, card), on = wrappedShareCard(w, card, {sensitive: true});
    expect(off.hasSensitive).toBe(true);
    expect(off.lines.some(l => card.numbers.includes(l))).toBe(false);
    expect(on.lines.some(l => card.numbers.includes(l))).toBe(true);
    expect(off).toMatchObject({kind: 'wrapped', eyebrow: 'Example · ZIGoals Wrapped 2026', footer: 'Example data · the ZIGoals Showcase', example: true});
    expect(off.fileName).toMatch(/^zigoals-example-wrapped-2026-[a-z-]+\.png$/);
    expect(wrappedShareCard({year: 2026, example: false}, card).footer).toBe('Made on this device with ZIGoals');
  });
  it('a finished year (read in January) is the whole year', () => {
    const w = wrapped('2027-01-05', habitsDone('2026-12-31', 10, 0));
    expect(w).toMatchObject({year: 2026, end: '2026-12-31', complete: true});
    expect(w.cards.at(-1)!.title).toBe('That was your 2026.');
  });
});

describe('the Wrapped record and the Showcase focus sessions', () => {
  it('keeps the first day each year was opened, at most 20 years; a strange record reads as empty', () => {
    let r = markWrappedOpened(emptyWrapped(), 2026, '2026-12-02');
    expect(markWrappedOpened(r, 2026, '2026-12-09')).toBe(r);
    expect(wrappedOpened(r, 2026)).toBe(true);
    expect(wrappedOpened(r, 2025)).toBe(false);
    for (let y = 2000; y < 2030; y++) r = markWrappedOpened(r, y, `${y}-12-02`);
    expect(Object.keys(r.opened!)).toHaveLength(MAX_WRAPPED_YEARS);
    expect(r.opened!['2029']).toBe('2029-12-02');
    expect(readDeviceRecord({getItem: () => '{"version":1,"opened":{"26":"x"}}'}, WRAPPED)).toEqual({data: emptyWrapped(), unreadable: true});
  });
  it('Showcase focus sessions are valid, fictional and deterministic', () => {
    const a = showcaseFocusSessions('2026-12-02');
    expect(focusSessionsSchema.parse(a)).toEqual(a);
    expect(a.sessions).toHaveLength(24);
    expect(a.sessions.every(s => s.id.startsWith('focus_showcase-') && s.day < '2026-12-02')).toBe(true);
    expect(showcaseFocusSessions('2026-12-02')).toEqual(a);
  });
});
