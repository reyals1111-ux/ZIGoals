import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue, type HabitData, type HabitInput} from '../../habits';
import {createEmptyHealth, healthSchema, type HealthData} from '../../health';
import {emptyPlatform} from '../../positions';
import {emptyReminders} from '../../reminders/schema';
import {presetSettings} from '../../dashboard-settings';
import {emptyWeeklyReview} from '../../weekly-review/schema';
import {addLocalDays} from '../../local-date';
import type {Handle} from '../context/types';
import {applyPlan, planAction, type Env, type Stores} from './plan';
import {actionSchema} from './schema';
import {applyDeviceWrite, deviceWriteSpec, DEVICE_WRITE_KEYS} from './device-writes';
import {HABIT_EXTRAS, emptyHabitExtras} from '../../habits-extras/schema';
import {MICRO_TARGETS, emptyMicroTargets} from '../../health-aa/micro';
import {MACRO_MODE, emptyMacroMode} from '../../health-aa/macro-mode';
import {HEALTH_COACH, emptyHealthCoach} from '../../health-aa/coach-schema';
import {GAME, emptyGame} from '../../game/schema';

/** Session AA-Local Part 5 (ADR-022 B37): the planner's new kinds, each through the page's own mutator or a device record's own store function, with its Undo. */
const DAY = '2026-10-07', now = new Date('2026-10-07T19:00:00Z'), AT = new Date('2026-09-01T06:00:00Z');
const ID = {read: '11111111-1111-4111-8111-111111111111', snacks: '22222222-2222-4222-8222-222222222222', walk: '33333333-3333-4333-8333-333333333333'};
const input = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}, ...extra});
function habits(): HabitData {
  let d = {...emptyHabitData(), timeZone: 'UTC'} as HabitData;
  d = createHabit(d, input('Read', {measurement: {kind: 'duration', unit: 'minutes'}, target: 20, timeOfDay: 'evening'}), AT, ID.read);
  d = createHabit(d, input('Late snacks', {type: 'quit', target: 0, measurement: {kind: 'count', unit: 'times'}}), AT, ID.snacks);
  d = createHabit(d, input('Walk', {timeOfDay: 'morning', stackAfterId: ID.read}), AT, ID.walk);
  for (let i = 1; i <= 9; i++) { const day = addLocalDays(DAY, -i - 1); d = logHabitValue(d, ID.walk, day, 1, {mode: 'set'}, new Date(`${day}T07:00:00Z`)); } // nine in a row, then yesterday missed
  return d;
}
function health(): HealthData {
  const h = createEmptyHealth(); h.targets.kcal = 2200; h.targets.weightGrams = 70000;
  for (const [i, g] of [[0, 72000], [2, 72300], [4, 72500], [7, 72900], [9, 73100]] as const) { const d = addLocalDays(DAY, -i); h.weights.push({id: `health_weight-${i}`, date: d, grams: g, createdAt: `${d}T08:00:00.000Z`, updatedAt: `${d}T08:00:00.000Z`}); }
  return healthSchema.parse({...h, schemaVersion: 4});
}
const stores = (): Stores => ({habits: habits(), health: health(), platform: emptyPlatform(), fasting: {version: 1, sessions: []}, reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: emptyWeeklyReview(), memory: {version: 1}, settings: {...presetSettings('balanced'), onboarded: true}});
const handles = (s: Stores): Handle[] => s.habits.habits.map((h, i) => ({handle: `h${i + 1}`, kind: 'habit' as const, id: h.id, label: h.title}));
let counter = 0;
const env = (s = stores(), overrides: Partial<Env> = {}): Env => ({stores: s, handles: handles(s), now, habitDay: DAY, healthDay: DAY, timeZone: 'UTC', newHealthId: () => `health_ai-${String(++counter).padStart(8, '0')}`, ...overrides});
const ok = (raw: Record<string, unknown>, e = env()) => { const r = planAction(actionSchema.parse(raw), e); if (!r.ok) throw new Error(r.message); return r.plan; };
const refused = (raw: Record<string, unknown>, e = env()) => { const r = planAction(actionSchema.parse(raw), e); return r.ok ? null : r.message; };
const roundTrip = (raw: Record<string, unknown>, e = env()) => { const plan = ok(raw, e); const after = applyPlan(plan, e.stores); const back = plan.undo ? applyPlan({...plan, write: plan.undo.write}, after) : after; return {plan, after, back}; };

describe('timers (H2) and sections (H1)', () => {
  test('start-timer on a duration habit, refused on a count habit; stop-timer logs the minutes into today and Undo puts the timer back', () => {
    const e = env();
    expect(refused({kind: 'start-timer', habit: 'h3'}, e)).toMatch(/not a duration habit/);
    const {after, back} = roundTrip({kind: 'start-timer', habit: 'h1'}, e);
    expect(after.habits.habits[0]!.timer?.state).toBe('running'); expect(back.habits.habits[0]!.timer).toBeUndefined();
    const later = env(after, {now: new Date('2026-10-07T19:25:00Z')});
    expect(refused({kind: 'start-timer', habit: 'h1'}, later)).toMatch(/already running/);
    const stop = roundTrip({kind: 'stop-timer', habit: 'h1'}, later);
    expect(stop.plan.card.lines[0]).toBe('25 minutes so far');
    expect(stop.after.habits.habits[0]!.timer).toBeUndefined(); expect(stop.after.habits.habits[0]!.entries.find(x => x.date === DAY)?.count).toBe(25);
    expect(stop.back.habits.habits[0]!.timer?.state).toBe('running');
    const discard = roundTrip({kind: 'stop-timer', habit: 'h1', log: false}, later);
    expect(discard.after.habits.habits[0]!.entries.find(x => x.date === DAY)).toBeUndefined();
    expect(refused({kind: 'stop-timer', habit: 'h3'}, e)).toMatch(/No timer/);
  });
  test('set-time-of-day moves the habit between sections and Undo moves it back; the same section is refused', () => {
    const {after, back} = roundTrip({kind: 'set-time-of-day', habit: 'h3', timeOfDay: 'evening'});
    expect(after.habits.habits[2]!.timeOfDay).toBe('evening'); expect(back.habits.habits[2]!.timeOfDay).toBe('morning');
    expect(refused({kind: 'set-time-of-day', habit: 'h3', timeOfDay: 'morning'})).toMatch(/already/);
  });
});
describe('routines (H5), areas (H6), quit cost (H3), freezes (H7)', () => {
  test('start-routine from a stacked habit is a navigation to the player; from a template it adds the habits with an exact Undo', () => {
    const p = ok({kind: 'start-routine', habit: 'h3'});
    expect(p.target).toBe('form'); expect(p.navigate?.href).toBe(`/app/habits#routine=${encodeURIComponent(ID.read)}`);
    expect(refused({kind: 'start-routine', habit: 'h2'})).toMatch(/not part of a stack/);
    const {after, back} = roundTrip({kind: 'start-routine', template: 'workout'});
    expect(after.habits.habits.map(h => h.title)).toEqual(expect.arrayContaining(['Warm up', 'Exercise', 'Cool down'])); expect(back.habits.habits).toHaveLength(3);
  });
  test('set-habit-area and set-quit-cost are device writes the runner applies through the record\'s own store; a quit cost on a build habit is refused', () => {
    const area = ok({kind: 'set-habit-area', habit: 'h3', area: 'health'});
    expect(area.device).toEqual({key: HABIT_EXTRAS.key, patch: {area: {habitId: ID.walk, areaId: 'health'}}, label: 'Walk filed under health'});
    expect(refused({kind: 'set-habit-area', habit: 'h3', area: 'nope'})).toMatch(/Areas are/);
    const cost = ok({kind: 'set-quit-cost', habit: 'h2', perDay: 3.5, currency: 'EUR'});
    expect(cost.device?.patch).toEqual({quitCost: {habitId: ID.snacks, perDay: 3.5, currency: 'EUR'}}); expect(cost.card.estimate).toBe(true);
    expect(refused({kind: 'set-quit-cost', habit: 'h3', perDay: 1})).toMatch(/not a quit habit/);
    const r1 = applyDeviceWrite(HABIT_EXTRAS.key, emptyHabitExtras(), area.device!.patch) as ReturnType<typeof emptyHabitExtras>; expect(r1.areas).toEqual({[ID.walk]: 'health'});
    const r2 = applyDeviceWrite(HABIT_EXTRAS.key, r1, cost.device!.patch) as ReturnType<typeof emptyHabitExtras>; expect(r2.quitCost).toEqual({[ID.snacks]: {perDay: 3.5, currency: 'EUR'}});
    expect(() => applyDeviceWrite(HABIT_EXTRAS.key, r2, {bogus: 1})).toThrow(); expect(() => applyDeviceWrite('zigoals:nope:v1', {}, {})).toThrow();
    expect(DEVICE_WRITE_KEYS).toEqual([HABIT_EXTRAS.key, MICRO_TARGETS.key, MACRO_MODE.key, HEALTH_COACH.key, GAME.key]); expect(deviceWriteSpec(GAME.key)).toBe(GAME);
  });
  test('use-freeze repairs yesterday on the walk through the journal; Undo takes it back; no freeze or a clean day is refused', () => {
    const {after, back} = roundTrip({kind: 'use-freeze', habit: 'h3', day: 'yesterday'});
    expect(after.habits.habits[2]!.entries.find(x => x.date === addLocalDays(DAY, -1))).toMatchObject({disposition: 'skipped', note: 'Streak freeze'});
    expect(back.habits.habits[2]!.entries.find(x => x.date === addLocalDays(DAY, -1))).toBeUndefined();
    expect(refused({kind: 'use-freeze', habit: 'h3', day: '2026-10-04'})).toMatch(/not a missed day/);
    expect(refused({kind: 'use-freeze', habit: 'h1', day: 'yesterday'}, env({...stores(), habits: {...habits(), habits: habits().habits.filter(h => h.id === ID.read)}}))).toMatch(/No freeze/);
  });
});
describe('Health (N1–N7) and the game switch', () => {
  test('set-micro-target converts display units to mg; null returns to the default; set-macro-mode carries the split', () => {
    const iron = ok({kind: 'set-micro-target', nutrient: 'iron', value: 12, unit: 'mg'}); expect(iron.device).toEqual({key: MICRO_TARGETS.key, patch: {target: {nutrient: 'ironMg', mg: 12}}, label: 'Iron target: 12 mg'});
    const fiber = ok({kind: 'set-micro-target', nutrient: 'fiber', value: 35}); expect(fiber.device?.patch).toEqual({target: {nutrient: 'fiberMg', mg: 35_000}});
    const back = ok({kind: 'set-micro-target', nutrient: 'fiber', value: null}); expect(back.card.title).toContain('the default (30 g)');
    expect((applyDeviceWrite(MICRO_TARGETS.key, emptyMicroTargets(), iron.device!.patch) as ReturnType<typeof emptyMicroTargets>).targets).toEqual({ironMg: 12});
    const keto = ok({kind: 'set-macro-mode', mode: 'keto'}); expect(keto.device?.patch).toEqual({mode: 'keto'});
    const custom = ok({kind: 'set-macro-mode', mode: 'custom', fat: 25, protein: 35, carbs: 40}); expect(custom.device?.patch).toEqual({mode: 'custom', split: {fat: 25, protein: 35, carbs: 40}});
    expect(refused({kind: 'set-macro-mode', mode: 'custom', fat: 50, protein: 35, carbs: 40})).toMatch(/100/);
    expect((applyDeviceWrite(MACRO_MODE.key, emptyMacroMode(), custom.device!.patch) as ReturnType<typeof emptyMacroMode>).split).toEqual({fat: 25, protein: 35, carbs: 40});
  });
  test('coach-answer: keep is a device write; adjust writes the calorie target with Undo and records the answer; without readings it is refused', () => {
    const keep = ok({kind: 'coach-answer', answer: 'keep'}); expect(keep.target).toBe('form'); expect(keep.device?.key).toBe(HEALTH_COACH.key); expect((keep.device!.patch as {answer: {answer: string}}).answer.answer).toBe('keep');
    const {plan, after, back} = roundTrip({kind: 'coach-answer', answer: 'adjust', kcal: 2050});
    expect(after.health.targets.kcal).toBe(2050); expect(back.health.targets.kcal).toBe(2200); expect(plan.device?.label).toBe('Target adjusted to 2050 kcal');
    expect((applyDeviceWrite(HEALTH_COACH.key, emptyHealthCoach(), plan.device!.patch) as ReturnType<typeof emptyHealthCoach>).answers?.['2026-10-05']?.kcal).toBe(2050);
    expect(refused({kind: 'coach-answer', answer: 'adjust'})).toMatch(/No suggested target/); // no diary: the estimate is not ready
    expect(refused({kind: 'coach-answer', answer: 'keep'}, env({...stores(), health: createEmptyHealth()}))).toMatch(/two weight readings/);
  });
  test('import-recipe reads pasted text into new foods (unknown nutrition) and a recipe, reusing a food by name, with Undo', () => {
    const s = stores(); s.health = healthSchema.parse({...s.health, foods: [{id: 'health_food-0001', name: 'Olive oil', brand: '', servingGrams: 15, nutrients: {kcal: 120, proteinMg: 0, carbsMg: 0, fatMg: 14000}, createdAt: '2026-09-01T06:00:00.000Z', updatedAt: '2026-09-01T06:00:00.000Z'}]});
    const {plan, after, back} = roundTrip({kind: 'import-recipe', text: 'Fictional soup\nServes 4\nIngredients\n200 g red lentils\n2 tbsp olive oil\n1 onion'}, env(s));
    expect(plan.card.title).toBe('Import "Fictional soup"'); expect(plan.card.lines[0]).toBe('3 ingredients, 4 servings');
    expect(after.health.recipes).toHaveLength(1); expect(after.health.recipes[0]!.ingredients).toHaveLength(3); expect(after.health.foods.map(f => f.name)).toEqual(['Olive oil', 'red lentils', 'onion']);
    expect(after.health.foods[1]!.nutrients.kcal).toBeNull(); expect(back.health.recipes).toHaveLength(0); expect(back.health.foods).toHaveLength(1);
    expect(refused({kind: 'import-recipe', text: 'just words here'})).toMatch(/No ingredient lines/);
  });
  test('set-game-layer is a device write; open-page knows Journey and the new views', () => {
    const on = ok({kind: 'set-game-layer', enabled: true}); expect(on.device).toEqual({key: GAME.key, patch: {enabled: true}, label: 'Game layer on'});
    expect((applyDeviceWrite(GAME.key, emptyGame(), on.device!.patch) as ReturnType<typeof emptyGame>).enabled).toBe(true);
    expect(ok({kind: 'open-page', page: 'journey'}).navigate).toEqual({href: '/app/journey', label: 'Journey'});
    expect(ok({kind: 'open-page', page: 'health', view: 'planner'}).navigate?.href).toBe('/app/health#planner');
    expect(ok({kind: 'open-page', page: 'habits', view: 'year'}).navigate?.href).toBe('/app/habits#year');
    expect(ok({kind: 'open-page', page: 'settings', view: 'reminders'}).navigate?.href).toBe('/app/settings/reminders');
    expect(refused({kind: 'open-page', page: 'habits', view: 'planner'})).toMatch(/on Health/);
  });
});
