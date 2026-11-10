import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue, type HabitInput} from '../habits';
import {checkInsOn} from '../numbers/counts';
import {createEmptyHealth} from '../health';
import {contributionEventSchema, emptyPlatform, platformSchema, privateGoalSchema, type Platform} from '../positions';
import {universeOf} from '../universe/model';
import {emptyWeeklyReview, type WeeklyReview} from '../weekly-review/schema';
import {reviewWindow} from '../weekly-review/engine';
import {xpSummary} from './xp';
import {dailyQuests, QUESTS} from './quests';

/** Session AL second pass (lane L3): Journey reads the one "finished" rule; quests are never a dead end. Fictional data. */
const TODAY = '2026-11-04';
const life = (kind: 'completed' | 'closed', at: string, id: string) => ({id, kind, cycle: 0, at, target: '1', asset: 'BOOK', decimals: 0});
/** A count goal that reached its target on Nov 2 and was closed on Nov 3: Goals shows "Completed · closed". */
const reachedThenClosed = (): Platform => platformSchema.parse({...emptyPlatform(), goals: [privateGoalSchema.parse({
  id: '9', name: 'Read 1 book', type: 'QUANTITY', status: 'closed', asset: 'BOOK', denom: 'book', decimals: 0, target: '1', notes: '',
  createdAt: '2026-11-01T08:00:00.000Z', milestones: [],
  lifecycle: [life('completed', '2026-11-02T09:00:00.000Z', 'aaaaaaaa-0000-4000-8000-000000000001'), life('closed', '2026-11-03T09:00:00.000Z', 'aaaaaaaa-0000-4000-8000-000000000002')],
})]});
const closedEarly = (): Platform => platformSchema.parse({...reachedThenClosed(), goals: reachedThenClosed().goals.map(g => ({...g, lifecycle: [g.lifecycle![1]!]}))});

describe('DV-045a/DV-042 (P-DV-22): Journey counts a goal reached and then closed as reached', () => {
  test('My Universe: "1 goal reached", never "set aside"; a goal closed before reaching stays set aside', () => {
    const facts = (platform: Platform) => universeOf({habits: emptyHabitData(), health: createEmptyHealth(), platform, today: TODAY}).planets.find(p => p.pillar === 'goals')!.facts;
    expect(facts(reachedThenClosed())[0]).toBe('1 goal reached');
    expect(facts(reachedThenClosed()).join(' ')).not.toMatch(/set aside/);
    expect(facts(closedEarly())[0]).toBe('0 goals reached');
    expect(facts(closedEarly()).join(' ')).toMatch(/1 goal set aside/);
  });
  test('XP: the reached goal keeps its +25 after it is closed (its lifecycle says so, whatever its progress now)', () => {
    const events = xpSummary({habits: emptyHabitData(), health: createEmptyHealth(), platform: reachedThenClosed()}, TODAY).events;
    expect(events.filter(e => e.id === 'goal-done:9').map(e => e.day)).toEqual(['2026-11-02']);
  });
});

describe('NB-227/NB-229: the weekly review quest links to where it is done and rests once the week is reviewed', () => {
  const stores = (weekly: WeeklyReview | null) => ({habits: emptyHabitData(), health: createEmptyHealth(), weekly});
  test('it carries the Life review link', () => {
    expect(QUESTS.find(q => q.id === 'review')?.href).toBe('/app/review#weekly-reflection');
  });
  test('offered while due; not offered after this week was reviewed on an earlier day', () => {
    const offered = (w: WeeklyReview | null) => dailyQuests(stores(w), TODAY, ['today'], 3).some(q => q.id === 'review');
    expect(offered(emptyWeeklyReview())).toBe(true);
    const weekStart = reviewWindow(0, TODAY).weekStart;
    expect(offered({...emptyWeeklyReview(), reviews: [{weekStart, completedAt: `${weekStart}T09:00:00.000Z`} as WeeklyReview['reviews'][number]]})).toBe(weekStart === TODAY);
    expect(offered({...emptyWeeklyReview(), reviews: [{weekStart, completedAt: `${TODAY}T09:00:00.000Z`} as WeeklyReview['reviews'][number]]})).toBe(true);
  });
});

describe('DV-023c (P-DV-32): a history-only record earns no XP and lights no Wealth ring', () => {
  test('one funding contribution counts; the history-only one does not', () => {
    const base = reachedThenClosed();
    const c = (id: string, fundingMode: 'FUND_GOAL' | 'HISTORY_ONLY') => contributionEventSchema.parse({id, goalId: '9', direction: 'IN', quantity: '1', asset: 'BOOK', decimals: 0, occurredAt: `${TODAY}T08:00:00.000Z`, provenance: 'MANUAL_ATTRIBUTION', fundingMode});
    const platform = {...base, contributions: [c('11', 'FUND_GOAL'), c('12', 'HISTORY_ONLY')]} as Platform;
    const events = xpSummary({habits: emptyHabitData(), health: createEmptyHealth(), platform}, TODAY).events.filter(e => e.id.startsWith('contribution:'));
    expect(events.map(e => e.id)).toEqual(['contribution:11']);
    const wealth = universeOf({habits: emptyHabitData(), health: createEmptyHealth(), platform, today: TODAY}).planets.find(p => p.pillar === 'wealth')!;
    expect(wealth.facts[0]).toBe('1 contribution to your goals');
  });
});

/** Keep-list guards (positives the bot found that no test covered). */
describe('keep: NB-230 habit XP is exactly reversible; NB-066 one check-in counts once in Habits and Journey', () => {
  const HID = '11111111-1111-4111-8111-111111111111';
  const count: HabitInput = {title: 'CntT', category: 'Personal', description: '', notes: '', type: 'build', measurement: {kind: 'count', unit: 'times'}, schedule: {kind: 'daily'}, target: 2, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}};
  const withCount = (n: number) => { const d = createHabit(emptyHabitData(), count, new Date('2026-11-01T08:00:00Z'), HID); return n ? logHabitValue(d, HID, TODAY, n, {mode: 'set'}, new Date(`${TODAY}T07:00:00Z`)) : d; };
  const xp = (n: number) => xpSummary({habits: withCount(n), health: createEmptyHealth()}, TODAY).byKind.habit;
  test('NB-230: 0 → 1 of 2 → 2 of 2 → 4 of 2 → back: +3, +10 in all, no more for over-completing, the same on the way down', () => {
    expect([0, 1, 2, 4, 2, 1, 0].map(xp)).toEqual([0, 3, 10, 10, 10, 3, 0]);
  });
  test('NB-066: Journey\'s check-ins equal Habits\' count', () => {
    const habits = withCount(2), u = universeOf({habits, health: createEmptyHealth(), platform: emptyPlatform(), today: TODAY});
    expect(checkInsOn(habits.habits, TODAY, TODAY)).toBe(1);
    expect(u.planets.find(p => p.pillar === 'habits')!.facts[0]).toBe('1 check-in');
  });
});
