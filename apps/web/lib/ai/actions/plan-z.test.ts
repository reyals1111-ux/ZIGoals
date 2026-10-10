import {expect, test} from 'vitest';
import {buildShowcase} from '../../showcase-data';
import {habitDataSchema, latestHabitRule, planSkip, type HabitData} from '../../habits';
import {healthSchema, type HealthData} from '../../health';
import {platformSchema, type Platform} from '../../positions';
import {homeRecordsIn} from '../../sync-homes-store';
import {emptyReminders} from '../../reminders/schema';
import {setHabitReminder} from '../../reminders/store';
import {presetSettings} from '../../dashboard-settings';
import {withChoice} from '../../pages/visibility';
import type {Handle} from '../context/types';
import {parseReply} from './parse';
import {applyPlan, planAction, type Env, type Plan, type Stores} from './plan';
import {AUTO_ACCEPT_NEVER} from './auto-accept';
import {actionSchema, type Action} from './schema';
import {batchable} from './batch';

/**
 * Session Z-Local Part 5 (docs/product/ZIGI_ACTIONS_Z.md): the new kinds. Navigation and deletion cards hand the runner
 * an effect and write nothing; the habit state, vacation, unskip, reminder removal and a goal's close/reopen write
 * through the page's own mutators and Undo puts the record back. Showcase data: fictional and deterministic.
 */
const {records} = buildShowcase('2026-09-20', 'UTC');
const base = (): Stores => ({
  habits: {...habitDataSchema.parse(JSON.parse(records['zigoals:habits:v1']!)), timeZone: 'UTC'} as HabitData,
  health: healthSchema.parse(JSON.parse(records['zigoals:health:v1']!)) as HealthData,
  platform: platformSchema.parse(JSON.parse(records['zigoals:platform:v1']!)) as Platform,
  fasting: homeRecordsIn(records).fasting, reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: homeRecordsIn(records).weeklyReview, memory: {version: 1}, settings: {...presetSettings('balanced'), onboarded: true},
});
const now = new Date('2026-09-20T19:00:00Z'), DAY = '2026-09-20';
const envFor = (stores: Stores): Env => ({stores, handles: [...stores.habits.habits.map((h, i) => ({handle: `h${i + 1}`, kind: 'habit' as const, id: h.id, label: h.title})), ...stores.platform.goals.map((g, i) => ({handle: `g${i + 1}`, kind: 'goal' as const, id: `private:${g.id}`, label: g.name}))] as Handle[], now, habitDay: DAY, healthDay: DAY, timeZone: 'UTC'});
const act = (value: unknown): Action => actionSchema.parse(value);
const plan = (stores: Stores, value: unknown): Plan => { const r = planAction(act(value), envFor(stores)); if (!r.ok) throw Error(r.message); return r.plan; };
const refused = (stores: Stores, value: unknown): string => { const r = planAction(act(value), envFor(stores)); if (r.ok) throw Error('expected a refusal'); return r.message; };

test('open-page: a page, a Health view, a Settings section and a record each give a navigation card that writes nothing', () => {
  const s = base();
  const page = plan(s, {kind: 'open-page', page: 'habits'});
  expect(page.target).toBe('form'); expect(page.navigate).toEqual({href: '/app/habits', label: 'Habits'}); expect(page.write(s)).toEqual({}); expect(page.undo).toBeNull();
  expect(plan(s, {kind: 'open-page', page: 'health', view: 'sleep'}).navigate).toEqual({href: '/app/health?view=sleep', label: 'Health → Sleep'});
  expect(plan(s, {kind: 'open-page', page: 'settings', view: 'zigi'}).navigate?.href).toBe('/app/settings#your-ai');
  expect(plan(s, {kind: 'open-page', page: 'goals', view: 'new-goal'}).navigate?.href).toBe('/app/goals/new');
  expect(plan(s, {kind: 'open-page', page: 'today'}).navigate?.href).toBe('/app');
  const habit = s.habits.habits[0]!;
  expect(plan(s, {kind: 'open-page', page: 'habits', habit: 'h1'}).navigate).toEqual({href: `/app/habits#habit-${habit.id}`, label: `Habits → ${habit.title}`});
  const goal = s.platform.goals[0]!;
  expect(plan(s, {kind: 'open-page', page: 'goals', goal: 'g1'}).navigate?.href).toBe(`/app/goals/${goal.id}`);
  // A view on the wrong page, and a page the person hid, are refused in words.
  expect(refused(s, {kind: 'open-page', page: 'habits', view: 'sleep'})).toContain('Health');
  const hidden: Stores = {...s, settings: {...s.settings, pages: withChoice(s.settings.pages ?? {version: 1, choices: {}} as never, 'chess', false, now.toISOString())} as Stores['settings']};
  expect(refused(hidden, {kind: 'open-page', page: 'chess'})).toContain('hidden');
  // Never batched, never automatic.
  expect(batchable([page])).toEqual([]); expect(AUTO_ACCEPT_NEVER).toContain('open-page'); expect(AUTO_ACCEPT_NEVER).toContain('delete-record');
});
test('delete-record: the card names one record and opens the app\'s own confirmation; nothing is written; the unknown and the ambiguous are refused', () => {
  const s = base();
  const habit = s.habits.habits[0]!, p = plan(s, {kind: 'delete-record', what: 'habit', habit: 'h1'});
  expect(p.target).toBe('form'); expect(p.confirm).toEqual({href: `/app/habits#habit-${habit.id}`, what: 'habit', id: habit.id, label: habit.title}); expect(p.card.lines[0]).toContain("app's own confirmation"); expect(p.write(s)).toEqual({});
  const goal = s.platform.goals[0]!;
  expect(plan(s, {kind: 'delete-record', what: 'goal', goal: 'g1'}).confirm?.href).toBe(`/app/goals/${goal.id}`);
  const food = s.health.foods[0]!;
  expect(plan(s, {kind: 'delete-record', what: 'food', name: food.name}).confirm?.id).toBe(food.id);
  expect(refused(s, {kind: 'delete-record', what: 'food', name: 'no such food'})).toContain('No food');
  expect(refused(s, {kind: 'delete-record', what: 'weight', day: '2026-01-01'})).toContain('No weight');
  // The schema insists on the record's name where a handle does not exist, and the golden set's unknown kinds stay unknown.
  expect(() => act({kind: 'delete-record', what: 'link'})).toThrow();
  expect(parseReply('```zigoals-action\n{"kind":"delete-habit","habit":"h1"}\n```').proposals).toEqual([]);
});
test('set-habit-state: pause, resume, archive; the same state is refused; Undo restores the habit exactly', () => {
  const s = base(), habit = s.habits.habits[0]!;
  const p = plan(s, {kind: 'set-habit-state', habit: 'h1', state: 'paused'});
  expect(p.card.title).toBe(`Pause ${habit.title}`); expect(p.target).toBe('habits');
  const after = applyPlan(p, s);
  expect(latestHabitRule(after.habits.habits.find(h => h.id === habit.id)!).state).toBe('paused');
  expect(refused(after, {kind: 'set-habit-state', habit: 'h1', state: 'paused'})).toContain('already');
  const resume = plan(after, {kind: 'set-habit-state', habit: 'h1', state: 'active'}); expect(resume.card.title).toBe(`Resume ${habit.title}`);
  expect(p.undo!.unchanged(after, after)).toBe(true);
  const back = {...after, ...p.undo!.write(after)} as Stores;
  expect(back.habits.habits.find(h => h.id === habit.id)).toEqual(habit);
});
test('vacation: marks days for every habit or the named ones, clears them again, refuses days already past; Undo clears what it marked', () => {
  const s = base();
  const p = plan(s, {kind: 'vacation', from: '2026-09-22', to: '2026-09-24'});
  expect(p.card.title).toBe('Mark vacation days'); expect(p.card.lines[0]).toContain('every habit');
  const after = applyPlan(p, s);
  expect(JSON.stringify(after.habits)).not.toBe(JSON.stringify(s.habits));
  // Undo is the panel's own Clear: the vacation entries of the range go; every entry outside the range is untouched.
  const cleared = {...after, ...p.undo!.write(after)} as Stores, outside = (h: {entries: {date: string}[]}) => h.entries.filter(e => e.date < '2026-09-22' || e.date > '2026-09-24');
  expect(cleared.habits.habits.map(outside)).toEqual(s.habits.habits.map(outside));
  expect(cleared.habits.habits.flatMap(h => h.entries.filter(e => e.date >= '2026-09-22' && e.date <= '2026-09-24' && e.disposition === 'skipped' && /vacation/i.test(e.note)))).toEqual([]);
  expect(after.habits.habits.flatMap(h => h.entries.filter(e => e.date >= '2026-09-22' && e.date <= '2026-09-24' && e.disposition === 'skipped')).length).toBeGreaterThan(0);
  const some = plan(s, {kind: 'vacation', from: '2026-09-22', to: '2026-09-22', habits: ['h1']}); expect(some.card.lines[0]).toContain(s.habits.habits[0]!.title);
  expect(plan(s, {kind: 'vacation', from: '2026-09-22', to: '2026-09-24', clear: true}).card.title).toBe('Clear vacation days');
  expect(refused(s, {kind: 'vacation', from: '2026-09-01', to: '2026-09-02'})).toContain('already past');
  expect(() => act({kind: 'vacation', from: '2026-09-24', to: '2026-09-22'})).toThrow();
});
test('unskip: undoes a planned skip and only that; Undo plans it again', () => {
  const s = base();
  // Tomorrow: the Showcase has check-ins logged on its own day, which the habit engine refuses to skip.
  const TOMORROW = '2026-09-21', index = s.habits.habits.findIndex(h => { try { planSkip(s.habits, h.id, TOMORROW, 'rest day', now); return true; } catch { return false; } }), habit = s.habits.habits[index]!, handle = `h${index + 1}`;
  expect(index).toBeGreaterThanOrEqual(0);
  expect(refused(s, {kind: 'unskip', habit: handle, day: TOMORROW})).toContain('no planned skip');
  const skipped: Stores = {...s, habits: planSkip(s.habits, habit.id, TOMORROW, 'rest day', now)};
  const p = plan(skipped, {kind: 'unskip', habit: handle, day: TOMORROW});
  const after = applyPlan(p, skipped);
  expect(after.habits.habits.find(h => h.id === habit.id)!.entries.find(e => e.date === TOMORROW)?.disposition).not.toBe('skipped');
  const back = {...after, ...p.undo!.write(after)} as Stores;
  expect(back.habits.habits.find(h => h.id === habit.id)!.entries.find(e => e.date === TOMORROW)?.disposition).toBe('skipped');
});
test('remove-reminder: a habit\'s or the water reminder goes; none to remove is refused; Undo sets it back', () => {
  const s = base(), habit = s.habits.habits[0]!;
  expect(refused(s, {kind: 'remove-reminder', for: 'habit', habit: 'h1'})).toContain('no reminder');
  const withOne: Stores = {...s, reminders: setHabitReminder(s.reminders, habit.id, '07:30')};
  const p = plan(withOne, {kind: 'remove-reminder', for: 'habit', habit: 'h1'});
  expect(p.card.lines[0]).toContain('07:30');
  const after = applyPlan(p, withOne);
  expect(after.reminders.habits[habit.id]).toBeUndefined();
  const back = {...after, ...p.undo!.write(after)} as Stores;
  expect(back.reminders.habits[habit.id]?.time).toBe('07:30');
  expect(() => act({kind: 'remove-reminder', for: 'habit'})).toThrow();
});
test('close-goal and reopen-goal: the status only; a closed goal cannot close again; a locked goal is refused; Undo reverses', () => {
  const s = base(), goal = s.platform.goals.find(g => g.status === 'active' && !g.locked)!;
  const handle = `g${s.platform.goals.indexOf(goal) + 1}`;
  const p = plan(s, {kind: 'close-goal', goal: handle});
  expect(p.card.title).toBe(`Close ${goal.name}`); expect(p.card.lines[0]).toContain('money');
  const after = applyPlan(p, s);
  expect(after.platform.goals.find(g => g.id === goal.id)!.status).toBe('closed');
  expect(refused(after, {kind: 'close-goal', goal: handle})).toContain('not an active goal');
  const reopen = plan(after, {kind: 'reopen-goal', goal: handle});
  const again = applyPlan(reopen, after);
  expect(again.platform.goals.find(g => g.id === goal.id)!.status).toBe('active');
  expect(refused(s, {kind: 'reopen-goal', goal: handle})).toContain('not closed');
  const back = {...after, ...p.undo!.write(after)} as Stores;
  expect(back.platform.goals.find(g => g.id === goal.id)!.status).toBe('active');
  const locked: Stores = {...s, platform: {...s.platform, goals: s.platform.goals.map(g => g.id === goal.id ? {...g, locked: true} : g)}};
  expect(refused(locked, {kind: 'close-goal', goal: handle})).toContain('locked');
});
