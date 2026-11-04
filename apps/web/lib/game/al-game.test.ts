import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue, type HabitData, type HabitInput} from '../habits';
import {createEmptyHealth, healthSchema} from '../health';
import {emptyPlatform, platformSchema, privateGoalSchema, type Platform} from '../positions';
import {recordGoalChanges} from '../goal-intelligence';
import {xpSummary} from './xp';
import {badges} from './badges';
import {celebrationId, goalCelebration, goalFinishedToday, pendingCelebrations} from './celebrate';
import {dailyQuests} from './quests';
import {emptyGame, markLevelSeen, setGameEnabled} from './schema';

/** Session AL (Part 6, lane L3): the Journey's trust rows, reproduced on the records. Fictional data only. */
const TODAY = '2026-11-04', AT = new Date('2026-10-01T06:00:00.000Z'), HID = '11111111-1111-4111-8111-111111111111';
const input: HabitInput = {title: 'Stretch', category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}};
const habitsWith = (days: string[]): HabitData => { let d = createHabit(emptyHabitData(), input, AT, HID); for (const day of days) d = logHabitValue(d, HID, day, 1, {mode: 'set'}, new Date(`${day}T07:00:00Z`)); return d; };
const project = (done: boolean[], status: 'active' | 'completed' | 'closed' = 'active'): Platform => platformSchema.parse({...emptyPlatform(), goals: [privateGoalSchema.parse({id: '7', name: 'FarmB', type: 'PROJECT', status, asset: 'MILESTONE', denom: 'milestone', decimals: 0, target: String(done.length), notes: '', createdAt: '2026-11-01T08:00:00.000Z', milestones: done.map((d, i) => ({id: `m${i}`, title: `Step ${i + 1}`, done: d}))})]});
/** One edit through the store boundary, as the Goals page saves it (it writes the history rows the old XP rule paid for). */
const edit = (before: Platform, change: (p: Platform) => Platform, minute: number) => platformSchema.parse(recordGoalChanges(before, platformSchema.parse(change(structuredClone(before))), Date.parse(`${TODAY}T04:${String(minute).padStart(2, '0')}:00Z`)));
const goalXp = (p: Platform) => xpSummary({habits: emptyHabitData(), health: createEmptyHealth(), platform: p}, TODAY).byKind.goal;
const tick = (p: Platform, i: number, done: boolean) => ({...p, goals: p.goals.map(g => ({...g, milestones: g.milestones.map((m, j) => j === i ? {...m, done} : m)}))});
const setStatus = (p: Platform, status: 'active' | 'closed') => ({...p, goals: p.goals.map(g => ({...g, status}))});

describe('NB-185/NB-203/NB-212/NB-213/NB-218: goal XP is granted once per real event and reversed when undone', () => {
  test('NB-203/NB-213: ticking, unticking and re-ticking a milestone never adds up', () => {
    let p = project([false, false]);
    p = edit(p, x => tick(x, 0, true), 1); expect(goalXp(p)).toBe(25);
    p = edit(p, x => tick(x, 0, false), 2); expect(goalXp(p)).toBe(0); // reversed, not +25
    p = edit(p, x => tick(x, 0, true), 3); expect(goalXp(p)).toBe(25);
    for (let i = 4; i < 12; i++) p = edit(p, x => tick(x, 0, i % 2 === 1), i);
    expect(goalXp(p)).toBe(25); // eight more flips, one ticked milestone: still 25
    expect(p.goalHistory.filter(h => h.kind === 'milestone').length).toBeGreaterThan(8); // the rows the old rule paid 25 each for
  });
  test('NB-185/NB-212: closing and reopening a goal earns nothing; a reached goal earns 25 once and keeps it when closed', () => {
    let p = project([true, false]);
    p = edit(p, x => tick(x, 0, true), 1);
    const before = goalXp(p);
    for (let i = 2; i < 10; i++) p = edit(p, x => setStatus(x, i % 2 === 0 ? 'closed' : 'active'), i);
    expect(goalXp(p)).toBe(before);
    p = edit(p, x => tick(x, 1, true), 20); // the last milestone: the goal is reached
    expect(p.goals[0]!.status).toBe('completed');
    expect(goalXp(p)).toBe(25 + 25 + 25);
    p = edit(p, x => setStatus(x, 'closed'), 21); expect(goalXp(p)).toBe(75); // closing a finished goal keeps it
    p = edit(p, x => setStatus(x, 'active'), 22); expect(goalXp(p)).toBe(75); // reopening adds nothing
    p = edit(p, x => tick(x, 1, false), 23); expect(goalXp(p)).toBe(25); // undone: the milestone and the reached goal go back
  });
  test('NB-218: a reversed contribution earns nothing, so the rewards shelf cannot mint points from corrections', () => {
    const base = project([false]);
    const at = `${TODAY}T04:00:00.000Z`;
    const c = {id: 'c1', goalId: '7', goalScope: 'private' as const, direction: 'IN' as const, quantity: '1', asset: 'USD', decimals: 0, occurredAt: at, provenance: 'MANUAL_ATTRIBUTION' as const};
    const withC = {...base, contributions: [c]} as Platform;
    expect(goalXp(withC)).toBe(10);
    const reversed = {...base, contributions: [c, {...c, id: 'c2', direction: 'OUT' as const, reversesId: 'c1'}]} as Platform;
    expect(goalXp(reversed)).toBe(0);
  });
});

describe('NB-049/NB-168/NB-171/NB-197/NB-251: badges and celebrations say only what is true', () => {
  test('NB-049/NB-168: a first habit tick never celebrates "A goal finished"; only a goal reached today does', () => {
    const stores = {habits: habitsWith([TODAY]), health: createEmptyHealth(), platform: project([true, false])};
    expect(goalFinishedToday(stores, TODAY)).toBe(false);
    const on = markLevelSeen({...setGameEnabled(emptyGame(), true), badges: true}, 1);
    const due = pendingCelebrations(stores, on, {}, TODAY);
    expect(due.map(c => c.title)).toEqual(['New badge · First step']);
    expect(due.some(c => /goal finished/i.test(`${c.title} ${c.line}`))).toBe(false);
    let reached = project([true, false]);
    reached = edit(reached, x => tick(x, 1, true), 5);
    expect(goalFinishedToday({platform: reached}, TODAY)).toBe(true);
    expect(goalCelebration('goal_finished', {}, TODAY)).toMatchObject({title: 'A goal finished'});
  });
  test('NB-251: "Balanced week" needs a whole week, never day one', () => {
    let p = project([false, false]);
    p = edit(p, x => tick(x, 0, true), 1);
    const health = healthSchema.parse({...createEmptyHealth(), weights: [{id: 'health_weight-001', date: TODAY, grams: 72000, createdAt: `${TODAY}T05:00:00.000Z`, updatedAt: `${TODAY}T05:00:00.000Z`}]});
    const dayOne = {habits: habitsWith([TODAY]), health, platform: p};
    expect(badges(dayOne, TODAY).find(b => b.id === 'balanced-week')?.earned).toBe(false);
    // Sunday 8 Nov 2026 closes the week that began on Monday 2 Nov: then it is earned.
    expect(badges(dayOne, '2026-11-08').find(b => b.id === 'balanced-week')?.earned).toBe(true);
  });
  test('NB-171: a badge once shown stays earned after the check-in behind it is undone', () => {
    const none = {habits: habitsWith([]), health: createEmptyHealth()};
    expect(badges(none, TODAY).find(b => b.id === 'first-step')?.earned).toBe(false);
    expect(badges(none, TODAY, {'first-step': TODAY}).find(b => b.id === 'first-step')?.earned).toBe(true);
  });
  test('NB-224: crossing a level celebrates it once', () => {
    const days = Array.from({length: 21}, (_, i) => new Date(Date.parse(`${TODAY}T12:00:00Z`) - i * 86_400_000).toISOString().slice(0, 10));
    const stores = {habits: habitsWith(days), health: createEmptyHealth()}; // 210 XP: level 2
    const on = markLevelSeen(setGameEnabled(emptyGame(), true), 1);
    expect(pendingCelebrations(stores, on, {}, TODAY).find(c => c.kind === 'level')).toMatchObject({id: 'level:2', title: 'Level 2 · Ember'});
    expect(pendingCelebrations(stores, on, {[celebrationId.level(2)]: TODAY}, TODAY).some(c => c.kind === 'level')).toBe(false);
  });
});

describe('NB-248: quests', () => {
  test('"Complete every habit due today" is always offered while a habit is due', () => {
    const stores = {habits: habitsWith([]), health: createEmptyHealth()};
    for (let i = 0; i < 30; i++) {
      const day = new Date(Date.parse(`${TODAY}T12:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10);
      expect(dailyQuests(stores, day).map(q => q.id)).toContain('habits-all');
    }
  });
});
