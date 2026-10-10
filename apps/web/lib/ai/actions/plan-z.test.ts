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

// ---- Session Z-Local Part 5, the Health kinds ----
import {dailyData, saveMealFromDiary, saveMealPlan} from '../../health-daily';
import {exerciseData} from '../../health-counters';
import {healthGroupIn} from '../../vault/w-homes';
import {emptySleep} from '../../sleep/schema';
import {emptyMeditation} from '../../meditation/schema';

test('edit-diary-entry: the meal, the servings or the day of one named entry; Undo puts the three fields back', () => {
  const s = base(), entry = s.health.diary.find(e => e.date === DAY)!;
  expect(entry).toBeDefined();
  const p = plan(s, {kind: 'edit-diary-entry', name: entry.snapshot.name, day: 'today', quantity: 2, meal: entry.meal === 'Lunch' ? 'Dinner' : 'Lunch'});
  expect(p.card.lines.join(' ')).toContain('Servings');
  const after = applyPlan(p, s), changed = after.health.diary.find(e => e.id === entry.id)!;
  expect(changed.quantityMilli).toBe(2000); expect(changed.meal).not.toBe(entry.meal);
  const back = {...after, ...p.undo!.write(after)} as Stores;
  const restored = back.health.diary.find(e => e.id === entry.id)!;
  expect({date: restored.date, meal: restored.meal, quantityMilli: restored.quantityMilli}).toEqual({date: entry.date, meal: entry.meal, quantityMilli: entry.quantityMilli});
  expect(refused(s, {kind: 'edit-diary-entry', name: 'no such thing', day: 'today', quantity: 1})).toContain('No "no such thing"');
  expect(refused(s, {kind: 'edit-diary-entry', name: entry.snapshot.name, day: 'today', move_to: '2027-01-01'})).toContain('has not come yet');
});
test('log-meal-plan: the planned meal of a day goes into the diary once; Undo restores the store; none left is refused', () => {
  const s = base(), day = dailyData(s.health).plans.find(p => !p.loggedAt)?.date ?? null;
  let stores = s, planDay = day;
  if (!planDay) {
    // The Showcase planned nothing: today's diary saved as a meal, planned for tonight.
    const saved = saveMealFromDiary(s.health, 'health_saved-meal-test0001', 'Test meal', DAY, 'All', now.toISOString()), meal = dailyData(saved).savedMeals.at(-1)!;
    stores = {...s, health: saveMealPlan(saved, {id: 'health_meal-plan-test0001', savedMealId: meal.id, date: DAY, meal: 'Dinner'}, now.toISOString())}; planDay = DAY;
  }
  const p = plan(stores, {kind: 'log-meal-plan', day: planDay!});
  expect(p.card.title).toContain('Log the planned');
  const after = applyPlan(p, stores);
  expect(after.health.diary.length).toBeGreaterThan(stores.health.diary.length);
  expect(refused(after, {kind: 'log-meal-plan', day: planDay!})).toContain('No planned meal left');
  const back = {...after, ...p.undo!.write(after)} as Stores;
  expect(back.health).toEqual(stores.health);
});
test('grocery-notes: set or append; Undo puts the previous notes back', () => {
  const s = base(), was = dailyData(s.health).groceryNotes;
  const p = plan(s, {kind: 'grocery-notes', notes: 'Oat milk, spinach'});
  const after = applyPlan(p, s); expect(dailyData(after.health).groceryNotes).toBe('Oat milk, spinach');
  const more = applyPlan(plan(after, {kind: 'grocery-notes', notes: 'Lentils', append: true}), after); expect(dailyData(more.health).groceryNotes).toBe('Oat milk, spinach\nLentils');
  const back = {...after, ...p.undo!.write(after)} as Stores; expect(dailyData(back.health).groceryNotes).toBe(was);
  expect(refused(after, {kind: 'grocery-notes', notes: 'Oat milk, spinach'})).toContain('already');
});
test('set-favorite: a food by name or handle becomes a favourite and back; the state it already has is refused', () => {
  const s = base(), food = s.health.foods[0]!;
  const p = plan(s, {kind: 'set-favorite', food: food.name});
  const after = applyPlan(p, s);
  expect(dailyData(after.health).favorites.some(f => f.sourceId === food.id)).toBe(true);
  expect(refused(after, {kind: 'set-favorite', food: food.name})).toContain('already');
  const off = applyPlan(plan(after, {kind: 'set-favorite', food: food.name, favorite: false}), after);
  expect(dailyData(off.health).favorites.some(f => f.sourceId === food.id)).toBe(false);
  expect(() => act({kind: 'set-favorite', favorite: true})).toThrow();
});
test('create-counter and edit-counter: a new counter with an icon, a rename; duplicates and nothing-to-change are refused; Undo reverses', () => {
  const s = base(), existing = exerciseData(s.health).counters[0]!;
  expect(refused(s, {kind: 'create-counter', name: existing.name})).toContain('already exists');
  const p = plan(s, {kind: 'create-counter', name: 'Burpees', icon: 'jump'});
  const after = applyPlan(p, s), made = exerciseData(after.health).counters.find(c => c.name === 'Burpees')!;
  expect(made.icon).toBe('jump');
  const renamed = applyPlan(plan(after, {kind: 'edit-counter', counter: 'Burpees', name: 'Burpees (sets)'}), after);
  expect(exerciseData(renamed.health).counters.find(c => c.id === made.id)!.name).toBe('Burpees (sets)');
  expect(refused(after, {kind: 'edit-counter', counter: 'Burpees', name: 'Burpees'})).toContain('Nothing changes');
  const back = {...after, ...p.undo!.write(after)} as Stores;
  expect(exerciseData(back.health).counters.some(c => c.id === made.id)).toBe(false);
});
test('set-target: kcal, protein, weight, steps, water, sleep and mindful minutes, with units; clearing; the same value is refused; Undo restores', () => {
  const s = base();
  const kcal = plan(s, {kind: 'set-target', target: 'kcal', value: 2100}); const a1 = applyPlan(kcal, s); expect(a1.health.targets.kcal).toBe(2100);
  expect(refused(a1, {kind: 'set-target', target: 'kcal', value: 2100})).toContain('already');
  const back1 = {...a1, ...kcal.undo!.write(a1)} as Stores; expect(back1.health.targets.kcal).toBe(s.health.targets.kcal);
  expect(refused(s, {kind: 'set-target', target: 'protein', value: 120, unit: 'g'})).toContain('already'); // the Showcase's own target
  const protein = applyPlan(plan(s, {kind: 'set-target', target: 'protein', value: 130, unit: 'g'}), s); expect(protein.health.targets.proteinMg).toBe(130_000);
  const weight = applyPlan(plan(s, {kind: 'set-target', target: 'weight', value: 75, unit: 'kg'}), s); expect(weight.health.targets.weightGrams).toBe(75_000);
  const steps = applyPlan(plan(s, {kind: 'set-target', target: 'steps', value: 9000}), s); expect(steps.health.targets.steps).toBe(9000);
  const water = applyPlan(plan(s, {kind: 'set-target', target: 'water', value: 2.5, unit: 'l'}), s); expect(dailyData(water.health).preferences.waterTargetMl).toBe(2500);
  const sleep = applyPlan(plan(s, {kind: 'set-target', target: 'sleep', value: 7.5, unit: 'hours'}), s); expect((healthGroupIn(sleep.health, 'sleep') ?? emptySleep()).goal?.minutes).toBe(450);
  const med = applyPlan(plan(s, {kind: 'set-target', target: 'meditation', value: 90}), s); expect((healthGroupIn(med.health, 'meditation') ?? emptyMeditation()).goal?.minutesPerWeek).toBe(90);
  const cleared = applyPlan(plan(protein, {kind: 'set-target', target: 'protein', value: null}), protein); expect(cleared.health.targets.proteinMg).toBeNull();
  expect(refused(s, {kind: 'set-target', target: 'kcal', value: 100, unit: 'g'})).toContain('kcal');
  expect(refused(s, {kind: 'set-target', target: 'sleep', value: 1})).toContain('between 3 and 15');
});
test('set-health-preference: the water or weight unit; nothing recorded is converted; Undo restores', () => {
  const s = base(), prefs = dailyData(s.health).preferences;
  const p = plan(s, {kind: 'set-health-preference', weightUnit: prefs.weightUnit === 'kg' ? 'lb' : 'kg'});
  expect(p.card.lines.at(-1)).toContain('nothing recorded is converted');
  const after = applyPlan(p, s); expect(dailyData(after.health).preferences.weightUnit).not.toBe(prefs.weightUnit); expect(after.health.weights).toEqual(s.health.weights);
  const back = {...after, ...p.undo!.write(after)} as Stores; expect(dailyData(back.health).preferences.weightUnit).toBe(prefs.weightUnit);
  expect(refused(s, {kind: 'set-health-preference', weightUnit: prefs.weightUnit})).toContain('already');
});
test('start-night and end-night: the running night; a second start is refused; ending with no night running is refused; Undo cancels or resumes', () => {
  const s = base();
  expect(refused(s, {kind: 'end-night'})).toContain('No night is running');
  const start = plan(s, {kind: 'start-night', bedtime: '23:15'});
  const night = applyPlan(start, s), running = (healthGroupIn(night.health, 'sleep') ?? emptySleep()).nights.filter(n => n.end === null);
  expect(running).toHaveLength(1);
  expect(refused(night, {kind: 'start-night'})).toContain('already running');
  const end = plan(night, {kind: 'end-night', wake: '07:10'}); expect(end.card.lines[0]).toContain('h in bed');
  const morning = applyPlan(end, night); expect((healthGroupIn(morning.health, 'sleep') ?? emptySleep()).nights.find(n => n.id === running[0]!.id)!.end).not.toBeNull();
  const resumed = {...morning, ...end.undo!.write(morning)} as Stores; expect((healthGroupIn(resumed.health, 'sleep') ?? emptySleep()).nights.find(n => n.id === running[0]!.id)!.end).toBeNull();
  const cancelled = {...night, ...start.undo!.write(night)} as Stores; expect((healthGroupIn(cancelled.health, 'sleep') ?? emptySleep()).nights.some(n => n.id === running[0]!.id)).toBe(false);
});
test('set-bells: interval, sound and volume merge with what is set; the same is refused; Undo restores', () => {
  const s = base();
  const p = plan(s, {kind: 'set-bells', intervalMin: 5, sound: 'chime'});
  const after = applyPlan(p, s), bells = (healthGroupIn(after.health, 'meditation') ?? emptyMeditation()).bells!;
  expect(bells).toMatchObject({intervalMin: 5, sound: 'chime'});
  expect(refused(after, {kind: 'set-bells', intervalMin: 5, sound: 'chime', volume: bells.volume})).toContain('already');
  const louder = applyPlan(plan(after, {kind: 'set-bells', volume: 90}), after); expect((healthGroupIn(louder.health, 'meditation') ?? emptyMeditation()).bells).toMatchObject({intervalMin: 5, sound: 'chime', volume: 90});
  const sans = (b: {intervalMin?: number; sound: string; volume: number} | undefined) => b && {intervalMin: b.intervalMin, sound: b.sound, volume: b.volume};
  const back = {...after, ...p.undo!.write(after)} as Stores; expect(sans((healthGroupIn(back.health, 'meditation') ?? emptyMeditation()).bells)).toEqual(sans((healthGroupIn(s.health, 'meditation') ?? emptyMeditation()).bells));
  expect(() => act({kind: 'set-bells'})).toThrow();
});
