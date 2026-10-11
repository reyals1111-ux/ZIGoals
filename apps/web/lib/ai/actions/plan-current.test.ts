import {expect, test} from 'vitest';
import {buildShowcase} from '../../showcase-data';
import {habitDataSchema, latestHabitRule, type HabitData} from '../../habits';
import {healthSchema, type HealthData} from '../../health';
import {platformSchema, type Platform} from '../../positions';
import {homeRecordsIn} from '../../sync-homes-store';
import {emptyReminders} from '../../reminders/schema';
import {presetSettings} from '../../dashboard-settings';
import {staleHandles, type Handle} from '../handles';
import {applyBatch, undoBatch} from './batch';
import {parseReply} from './parse';
import {applyPlan, planAction, type Env, type Plan, type Stores} from './plan';

/**
 * Session Y Part 4 (docs/verification/y-cloud/SECURITY_REVIEW_Y.md, F1 and F3): a card writes onto the record as it is
 * when the card is added, changing only the fields it names, and checks the goal again then (here, open, not locked);
 * Undo puts back only those fields. A card shown again without its reply's handles never resolves a handle key.
 */
const DAY = '2026-09-20', now = new Date('2026-09-20T19:00:00Z');
const {records} = buildShowcase(DAY, 'UTC');
const stores: Stores = {
  habits: habitDataSchema.parse(JSON.parse(records['zigoals:habits:v1']!)) as HabitData,
  health: healthSchema.parse(JSON.parse(records['zigoals:health:v1']!)) as HealthData,
  platform: platformSchema.parse(JSON.parse(records['zigoals:platform:v1']!)) as Platform,
  fasting: homeRecordsIn(records).fasting,
  reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: homeRecordsIn(records).weeklyReview, memory: {version: 1}, settings: {...presetSettings('balanced'), onboarded: true},
};
const handles: Handle[] = [
  ...stores.habits.habits.map((h, i) => ({handle: `h${i + 1}`, kind: 'habit' as const, id: h.id, label: h.title})),
  ...stores.platform.goals.map((g, i) => ({handle: `g${i + 1}`, kind: 'goal' as const, id: `private:${g.id}`, label: g.name})),
];
let n = 0;
const env = (o: Partial<Env> = {}): Env => ({stores, handles, now, habitDay: DAY, healthDay: DAY, timeZone: 'UTC', newHealthId: () => `health_y4-${String(++n).padStart(8, '0')}`, newHabitId: () => `94000000-0000-4000-8000-${String(++n).padStart(12, '0')}`, ...o});
const block = (items: unknown[]) => 'Sure.\n\n```zigoals-action\n' + JSON.stringify(items) + '\n```';
const plansOf = (items: unknown[], e = env()): Plan[] => parseReply(block(items)).proposals.map(p => { const r = planAction(p, e); if (!r.ok) throw Error(r.message); return r.plan; });
const openGoal = () => stores.platform.goals.find(x => !x.locked && x.status === 'active' && x.type !== 'PROJECT')!;
const goalHandle = (id: string) => handles.find(x => x.id === `private:${id}`)!.handle;
const withGoal = (id: string, change: (g: Platform['goals'][number]) => Platform['goals'][number]): Stores => ({...stores, platform: platformSchema.parse({...stores.platform, goals: stores.platform.goals.map(x => x.id === id ? change(x) : x)})});

test('F3: two edit-goal cards of one reply both land ("Add all"); Undo of both puts the goal back exactly', () => {
  const g = openGoal(), h = goalHandle(g.id);
  const plans = plansOf([{kind: 'edit-goal', goal: h, name: 'Renamed by card A'}, {kind: 'edit-goal', goal: h, notes: 'Notes by card B'}]);
  const {stores: after, applied, error} = applyBatch(plans, stores);
  expect([applied, error]).toEqual([2, null]);
  expect(after.platform.goals.find(x => x.id === g.id)).toMatchObject({name: 'Renamed by card A', notes: 'Notes by card B'});
  const back = undoBatch(plans, after, after);
  expect(back.refused).toBeNull();
  expect(back.stores.platform.goals.find(x => x.id === g.id)).toMatchObject({name: g.name, notes: g.notes});
});

test('F3: two edit-habit cards of one reply both land', () => {
  const habit = stores.habits.habits.find(x => latestHabitRule(x).measurement.kind !== 'boolean')!;
  const h = handles.find(x => x.id === habit.id)!.handle, target = latestHabitRule(habit).target;
  const plans = plansOf([{kind: 'edit-habit', habit: h, title: 'Renamed by card A'}, {kind: 'edit-habit', habit: h, target: target + 7}]);
  const {stores: after, applied} = applyBatch(plans, stores);
  const out = after.habits.habits.find(x => x.id === habit.id)!;
  expect(applied).toBe(2);
  expect(out.title).toBe('Renamed by card A');
  expect(latestHabitRule(out).target).toBe(target + 7);
});

test('F3: a card on a goal closed or locked since it was shown is refused when added; nothing is written', () => {
  const g = openGoal(), h = goalHandle(g.id);
  const [edit, note, milestone] = plansOf([{kind: 'edit-goal', goal: h, notes: 'stale card'}, {kind: 'add-goal-note', goal: h, note: 'from the card'}, {kind: 'add-milestone', goal: h, title: 'Card milestone'}]);
  const closed = withGoal(g.id, x => ({...x, status: 'closed', milestones: [...x.milestones, {id: 'm-later', title: 'Done meanwhile', done: true}]}));
  const locked = withGoal(g.id, x => ({...x, locked: true}));
  for (const plan of [edit!, note!, milestone!]) {
    expect(() => applyPlan(plan, closed)).toThrow('This goal is closed now. Reopen it in Goals first.');
    expect(() => applyPlan(plan, locked)).toThrow('This goal is locked now. Unlock it in Goals first.');
  }
  // Fresh plans on the closed goal are refused too (add-goal-note now as well).
  for (const raw of [{kind: 'edit-goal', goal: h, notes: 'x'}, {kind: 'add-goal-note', goal: h, note: 'x'}, {kind: 'add-milestone', goal: h, title: 'x'}]) expect(planAction(parseReply(block([raw])).proposals[0]!, env({stores: closed})).ok).toBe(false);
});

test('F3: what the person typed between the card and the tap stays; Undo takes back only the card\'s fields', () => {
  const g = openGoal(), h = goalHandle(g.id);
  const [note] = plansOf([{kind: 'add-goal-note', goal: h, note: 'from the card'}]);
  const typed = withGoal(g.id, x => ({...x, notes: 'typed in Goals meanwhile', category: 'Travel'}));
  const afterNote = applyPlan(note!, typed);
  expect(afterNote.platform.goals.find(x => x.id === g.id)!.notes).toBe('typed in Goals meanwhile\nfrom the card');
  const [rename] = plansOf([{kind: 'edit-goal', goal: h, name: 'Renamed'}]);
  const renamed = applyPlan(rename!, typed), goal = renamed.platform.goals.find(x => x.id === g.id)!;
  expect(goal).toMatchObject({name: 'Renamed', notes: 'typed in Goals meanwhile', category: 'Travel'});
  const back = undoBatch([rename!], renamed, renamed).stores.platform.goals.find(x => x.id === g.id)!;
  expect(back).toMatchObject({name: g.name, notes: 'typed in Goals meanwhile', category: 'Travel'});
});

test('F1: without its reply\'s handles a card never resolves a handle key; an exact title still names its record', () => {
  const g = openGoal(), h = goalHandle(g.id), habit = stores.habits.habits[0]!, hh = handles.find(x => x.id === habit.id)!.handle;
  const stale = env({handles: staleHandles(handles)});
  for (const raw of [{kind: 'edit-goal', goal: h, notes: 'x'}, {kind: 'edit-habit', habit: hh, title: 'x'}]) {
    const result = planAction(parseReply(block([raw])).proposals[0]!, stale);
    expect(result.ok).toBe(false);
  }
  const byTitle = planAction(parseReply(block([{kind: 'edit-goal', goal: g.name, notes: 'x'}])).proposals[0]!, stale);
  expect(byTitle.ok).toBe(true);
});
