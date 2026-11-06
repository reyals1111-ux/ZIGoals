import {beforeAll, describe, expect, test} from 'vitest';
import {applyPlan, loadAaPlanner, planAction, type Plan, type Stores} from '../../ai/actions/plan';
import {actionSchema} from '../../ai/actions/schema';
import {parseReply} from '../../ai/actions/parse';
import {emptyPlatform, platformSchema, assertGoalEditsUnlocked, type Platform} from '../../positions';
import {recordGoalChanges} from '../../goal-intelligence';
import {emptyHabitData, type HabitData} from '../../habits';
import {createEmptyHealth} from '../../health';
import {toolEnv} from '../../ai/tools/env';
import {gatesFor, showcaseSources} from '../../ai/tools/fixtures';
import {UNDO_REFUSED, undoCards, undoneText, undoRefused} from '../../../components/ai/card-undo';
import {journalGoalDraft, journalHabitDraft, propose} from './proposers';

// Session AL (DV-071, DV-072, DV-073; P-DV-11, P-DV-97): NOVA's workflow card Undo takes the created goal back out of the
// store, a run again offers no second copy, and an entry's amount and cadence become a savings goal and a habit.
beforeAll(() => loadAaPlanner());
const DAY = '2026-11-04', now = new Date(`${DAY}T09:00:00Z`);
const empty = (): Stores => ({platform: emptyPlatform(), habits: {...emptyHabitData(), timeZone: 'UTC'} as HabitData, health: createEmptyHealth(), fasting: {version: 1, sessions: []}, reminders: {}, zigiReminders: {version: 1}, weekly: {reviews: []}, memory: {version: 1}, settings: {}} as unknown as Stores);
const plan = (raw: Record<string, unknown>, stores: Stores): Plan => { const r = planAction(actionSchema.parse(raw), {stores, handles: [], now, habitDay: DAY, healthDay: DAY, timeZone: 'UTC'} as never); if (!r.ok) throw Error(r.message); return r.plan; };
/** The platform store as Goals saves it (components/platform/use-platform.ts): lock check, history capture, schema. */
const saved = (before: Platform, next: Platform) => { assertGoalEditsUnlocked(before, next); return platformSchema.parse(recordGoalChanges(before, next)); };
/** An in-memory runner whose undo is useProposals' own: check every record first, then the inverse through the save path. */
function memoryRunner(start: Stores) {
  let stores = start;
  return {
    get stores() { return stores; },
    add(p: Plan) { const after = applyPlan(p, stores); stores = {...stores, platform: saved(stores.platform, after.platform)}; return after; },
    touch(change: (s: Stores) => Stores) { stores = change(stores); },
    undo: async (plans: readonly Plan[], after: readonly Stores[]) => {
      const refused = undoRefused(plans, after, stores); if (refused) return refused;
      for (const p of [...plans].reverse()) { const next = {...stores, ...p.undo!.write(stores)}; stores = {...stores, platform: saved(stores.platform, next.platform)}; }
      return null;
    },
  };
}
const storage = {getItem: () => null, setItem: () => undefined};
const JOURNAL_GOAL = {kind: 'create-goal', name: 'Test entry: I want to save 300 dollars for a new bike', type: 'PROJECT', milestones: ['Decide the first step', 'Take the first step'], notes: `From your journal entry of ${DAY}.`};

describe('DV-071: the workflow card Undo takes the goal back out of the store', () => {
  test('Add, then Undo: the goal is gone and the platform record is as before', async () => {
    const start = empty(), runner = memoryRunner(start), p = plan(JOURNAL_GOAL, start);
    const after = runner.add(p);
    expect(runner.stores.platform.goals.map(g => g.name)).toEqual([JOURNAL_GOAL.name]);
    expect(await undoCards([{plan: p, after}], runner.undo, storage)).toBeNull();
    expect(runner.stores.platform.goals).toEqual([]);
    expect(runner.stores.platform).toEqual(start.platform);
    expect(undoneText([p])).toBe(`Taken back: Create the goal "${JOURNAL_GOAL.name}".`);
  });
  test('the goal edited since: the Undo is refused and nothing changes', async () => {
    const start = empty(), runner = memoryRunner(start), p = plan(JOURNAL_GOAL, start), after = runner.add(p);
    runner.touch(s => ({...s, platform: {...s.platform, goals: s.platform.goals.map(g => ({...g, notes: 'Changed in Goals'}))}}));
    const before = runner.stores;
    expect(await undoCards([{plan: p, after}], runner.undo, storage)).toBe(UNDO_REFUSED);
    expect(runner.stores).toBe(before);
  });
  test('a savings goal from a journal amount is taken back too', async () => {
    const start = empty(), runner = memoryRunner(start), p = plan({kind: 'create-goal', name: 'New bike', type: 'VALUE', target: 300, currency: 'USD'}, start), after = runner.add(p);
    expect(runner.stores.platform.goals[0]).toMatchObject({name: 'New bike', type: 'VALUE', asset: 'USD', target: '30000'});
    expect(await undoCards([{plan: p, after}], runner.undo, storage)).toBeNull();
    expect(runner.stores.platform).toEqual(start.platform);
  });
});

describe('DV-072: a run again does not offer a second copy', () => {
  test('the card names a goal of the same name', () => {
    const start = empty(), first = plan(JOURNAL_GOAL, start), after = applyPlan(first, start);
    expect(first.card.lines[0]).not.toMatch(/already in Goals/);
    const second = plan(JOURNAL_GOAL, after);
    expect(second.card.lines[0]).toBe(`A goal called "${JOURNAL_GOAL.name}" is already in Goals: this adds a second one`);
    expect(second.duplicate).toBe(true);
  });
  test('the journal workflow proposes no goal that is already there, and says where it is', () => {
    const journal = {version: 1 as const, entries: [{id: 'j1', date: DAY, text: 'I want to save 300 dollars for a new bike.', createdAt: `${DAY}T08:00:00.000Z`}], shareWithAi: false, followUps: true};
    const fresh = propose('journal-goal', {env: toolEnv(showcaseSources(DAY, {journal}), gatesFor(true), 'local')});
    expect(fresh.actions[0]).toMatchObject({kind: 'create-goal', name: 'New bike', type: 'VALUE', target: 300, currency: 'USD'});
    expect(parseReply(`\`\`\`zigoals-action\n${JSON.stringify(fresh.actions[0])}\n\`\`\``).rejected).toEqual([]);
    const platform = showcaseSources(DAY).platform!, goal = {...platform.goals[0]!, id: '900', name: 'New bike', status: 'active' as const};
    const again = propose('journal-goal', {env: toolEnv(showcaseSources(DAY, {journal, platform: {...platform, goals: [...platform.goals, goal]}}), gatesFor(true), 'local')});
    expect(again.actions.some(a => a.kind === 'create-goal')).toBe(false);
    expect(again.note).toBe('Already in Goals: "New bike". Open Goals to work on it; no second copy is proposed.');
  });
});

describe('DV-073: an amount makes a savings goal; a cadence makes a habit', () => {
  test.each([
    ['I want to save 300 dollars for a new bike.', {name: 'New bike', type: 'VALUE', target: 300, currency: 'USD'}],
    ['Saving €250 towards my holiday', {name: 'Holiday', type: 'VALUE', target: 250, currency: 'EUR'}],
    ['I need 1500 EUR for a laptop', {type: 'VALUE', target: 1500, currency: 'EUR'}],
    // "1,500" could be 1500 or 1.5 (parseNumberInput refuses it), so no amount is guessed: a project, as before.
    ['I need 1,500 EUR for a laptop', {type: 'PROJECT'}],
    ['I want to run a half marathon next spring.', {name: 'I want to run a half marathon next spring', type: 'PROJECT'}],
  ])('%s', (text, expected) => { expect(journalGoalDraft(text)).toMatchObject(expected); });
  test.each([
    ['I want to run every morning.', {title: 'Run', schedule: 'daily', timeOfDay: 'morning'}],
    ['I will read 3 times a week.', {title: 'Read', schedule: {timesPerWeek: 3}, timeOfDay: 'anytime'}],
    ['Meditate daily', {title: 'Meditate', schedule: 'daily'}],
    ['Work was stressful today.', null],
  ])('%s', (text, expected) => { expect(journalHabitDraft(text)).toEqual(expected === null ? null : expect.objectContaining(expected)); });
});
