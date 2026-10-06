import {parseAmountInput} from '../../amount-input';
import {saveMeasurement} from '../../body-measurements';
import {applyAutoStop, removeFast, runningSession, startFast, stopFast} from '../../fasting/engine';
import {FASTING_PRESETS, MAX_CUSTOM_HOURS, fastingSchema, type Fasting} from '../../fasting/schema';
import {createHabit, habitDataSchema, habitInputSchema, latestHabitRule, logHabitValue, measurementUnit, planSkip, setHabitEntryStatus, smartDoneValue, type Habit, type HabitData, type HabitInput} from '../../habits';
import {foodSchema, healthSchema, logHealthItem, newHealthId, removeHealthItem, saveActivity, saveFood, saveRecipe, saveWeight, type HealthData, type HealthFood} from '../../health';
import {addWater, dailyData, removeMealPlan, removeSavedMeal, removeWater, saveGroceryNotes, saveMealFromRecipe, saveMealPlan} from '../../health-daily';
import {changeCount, countOn, exerciseData} from '../../health-counters';
import {addLocalDays} from '../../local-date';
import {deletePrivateGoal, platformSchema, privateGoalSchema, type Platform} from '../../positions';
import {weeklyReviewSchema} from '../../weekly-review/schema';
import {setHabitReminder, setWaterReminder} from '../../reminders/store';
import type {Reminders} from '../../reminders/schema';
import {reviewWindow} from '../../weekly-review/engine';
import type {WeeklyReview} from '../../weekly-review/schema';
import {reviewFor, saveReviewNotes} from '../../weekly-review/store';
import type {ZigiReminders} from '../store/records';
import {minutesOf} from '../tools/habits';
import type {Handle} from '../context/types';
import {GLASS_ML, PLAN_AHEAD_DAYS, type HOLDING_CATEGORIES, type Action, type ActionKind} from './schema';

/**
 * From a validated proposal to a card and two writes (ADR-012, Part 5). `write` runs at confirm time on the latest
 * stores through the same save path the forms use (usePrivateStore.update, the fasting store's update, the platform
 * store), so the sync outbox, Activity and conflict handling see an ordinary edit. `undo` is the inverse operation
 * through the same path, refused when the record changed since. Handles are resolved here, on the device; a handle the
 * context never gave produces no card. Money: pre-filling the add-asset form is a hand-off, not a write.
 */
/**
 * Session V Part 7 adds three device records a proposal may write, each through its own existing save path: the in-app
 * reminders (`zigoals:reminders:v1`), ZIGi's own reminder kinds (`zigoals:zigi-reminders:v1`) and the weekly review.
 */
export type Stores = {health: HealthData; habits: HabitData; fasting: Fasting; platform: Platform; reminders: Reminders; zigiReminders: ZigiReminders; weekly: WeeklyReview};
export type Target = keyof Stores | 'form';
/** `refs`: habits that cards of the same reply create ("new1" → the id it will have and its title), for their reminders. */
export type Env = {stores: Stores; handles: readonly Handle[]; now: Date; habitDay: string; healthDay: string; timeZone: string; weightUnit?: 'kg' | 'lb'; newHealthId?: () => string; newHabitId?: () => string; refs?: ReadonlyMap<string, {id: string; title: string}>};
export type Card = {kind: ActionKind; title: string; lines: string[]; where: string; day: string | null; estimate: boolean; safety?: string};
export type Undo = {label: string; write: (current: Stores) => Partial<Stores>; unchanged: (afterApply: Stores, current: Stores) => boolean};
export type HoldingPrefill = {category: (typeof HOLDING_CATEGORIES)[number]; name: string; quantity: string; currency: string; value?: string; symbol?: string; notes?: string};
/** `activity` (Session V Part 7): the record a confirmed card makes, for Activity's "Actions by ZIGi" (its id there). */
export type Plan = {card: Card; target: Target; write: (current: Stores) => Partial<Stores>; undo: Undo | null; prefill?: HoldingPrefill; activity?: {id: string; title: string}};
export type PlanResult = {ok: true; plan: Plan} | {ok: false; message: string};
export const HE6_NOTE = 'Fasting isn\'t for everyone: if you\'re pregnant, under 18, have a medical condition or an eating disorder, or take medication, talk to a doctor first, and stop if you feel unwell. ZIGoals gives no medical advice.';
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const refuse = (message: string): PlanResult => ({ok: false, message});
const num = (value: number, digits = 1) => Number(value.toFixed(digits)).toString();
const kg = (grams: number) => `${num(grams / 1000)} kg`, lb = (grams: number) => `${num(grams / 453.59237)} lb`;
function resolveDay(day: string, base: string, today: string, allowFuture = false): {ok: true; day: string} | {ok: false; message: string} {
  const resolved = day === 'today' ? base : day === 'yesterday' ? addLocalDays(base, -1) : day;
  if (!allowFuture && resolved > today) return {ok: false, message: 'That day has not come yet; ZIGi can only log up to today.'};
  if (resolved < addLocalDays(today, -366)) return {ok: false, message: 'That day is more than a year back; add it from the journal itself.'};
  return {ok: true, day: resolved};
}
const dayLabel = (day: string, today: string) => day === today ? `today (${day})` : day === addLocalDays(today, -1) ? `yesterday (${day})` : day;
function habitOf(env: Env, handle: string): {ok: true; habit: Habit} | {ok: false; message: string} {
  const found = env.handles.find(h => h.handle === handle.toLowerCase() && h.kind === 'habit');
  const habit = found ? env.stores.habits.habits.find(h => h.id === found.id) : undefined;
  if (!found || !habit) return {ok: false, message: 'ZIGi named a habit that is not in this page\'s context, so nothing was proposed. Ask again from Habits, or name the habit.'};
  return {ok: true, habit};
}
/** One habit's entries for a day put back the way they were (or removed when there was none): the inverse of a check-in or a skip. */
function restoreEntry(data: HabitData, habitId: string, date: string, previous: Habit['entries'][number] | undefined, now: Date): HabitData {
  return habitDataSchema.parse({...data, habits: data.habits.map(h => h.id !== habitId ? h : {...h, updatedAt: now.toISOString(), entries: [...h.entries.filter(e => e.date !== date), ...(previous ? [previous] : [])].sort((a, b) => a.date.localeCompare(b.date))})});
}
const entryOn = (data: HabitData, habitId: string, date: string) => data.habits.find(h => h.id === habitId)?.entries.find(e => e.date === date);
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
type Estimate = {kcal?: number; protein_g?: number; carbs_g?: number; fat_g?: number};
const mg = (g: number | undefined) => g === undefined ? null : Math.round(g * 1000);
const nutrition = (e: Estimate) => ({kcal: e.kcal === undefined ? null : Math.round(e.kcal), proteinMg: mg(e.protein_g), carbsMg: mg(e.carbs_g), fatMg: mg(e.fat_g)});
const nutrientText = (e: Estimate) => [`kcal ${e.kcal === undefined ? 'unknown' : Math.round(e.kcal)}`, `protein ${e.protein_g === undefined ? 'unknown' : `${num(e.protein_g)} g`}`, `carbs ${e.carbs_g === undefined ? 'unknown' : `${num(e.carbs_g)} g`}`, `fat ${e.fat_g === undefined ? 'unknown' : `${num(e.fat_g)} g`}`].join(', ');
/** Whether a food or recipe is in use by a diary entry, a recipe (other than `except`) or a saved meal: then its undo is refused. */
function usesFood(health: HealthData, id: string, except?: string): boolean {
  return health.diary.some(e => e.sourceId === id) || health.recipes.some(r => r.id !== except && r.ingredients.some(i => i.foodId === id)) || dailyData(health).savedMeals.some(m => m.items.some(i => i.sourceId === id));
}

/** A unit's singular, for comparing "glass" with "glasses" or "page" with "pages". */
const plainUnit = (unit: string) => unit.trim().toLowerCase().replace(/(ss|ch|sh|x)es$/, '$1').replace(/s$/, '');
/**
 * Session V Part 7: a check-in's amount in the habit's own measure. Minutes go to a habit measured in time (minutes or
 * hours, by its unit), a quantity to a habit with the same unit; a habit that is done or not is marked done. Anything
 * else is refused in plain words rather than guessed.
 */
function amountFor(rule: ReturnType<typeof latestHabitRule>, action: Extract<Action, {kind: 'check-in'}>): {ok: true; value: number | undefined; said?: string} | {ok: false; message: string} {
  if (action.minutes !== undefined) {
    if (rule.measurement.kind === 'boolean') return {ok: true, value: 1, said: `${num(action.minutes)} minutes said; this habit records done or not`};
    const perUnit = minutesOf(rule, 1);
    if (perUnit === null) return {ok: false, message: `This habit is counted in ${measurementUnit(rule) || 'times'}, not in minutes, so nothing was proposed. Say how many ${measurementUnit(rule) || 'times'}.`};
    return {ok: true, value: Math.round((action.minutes / perUnit) * 1000) / 1000, said: perUnit === 1 ? undefined : `${num(action.minutes)} minutes = ${num(action.minutes / perUnit, 2)} ${measurementUnit(rule)}`};
  }
  if (action.quantity !== undefined) {
    if (rule.measurement.kind === 'boolean') return {ok: true, value: action.quantity > 0 ? 1 : 0};
    const unit = measurementUnit(rule);
    if (action.unit && plainUnit(action.unit) !== plainUnit(unit)) {
      const perUnit = minutesOf(rule, 1), minutes = /^(min|mins|minute|minutes)$/i.test(action.unit) ? action.quantity : /^(h|hr|hrs|hour|hours)$/i.test(action.unit) ? action.quantity * 60 : null;
      if (perUnit !== null && minutes !== null) return {ok: true, value: Math.round((minutes / perUnit) * 1000) / 1000, said: `${num(action.quantity, 2)} ${action.unit} = ${num(minutes / perUnit, 2)} ${unit}`};
      return {ok: false, message: `This habit is measured in ${unit}, not ${action.unit}, so nothing was proposed.`};
    }
    return {ok: true, value: action.quantity};
  }
  return {ok: true, value: action.value};
}
export function planAction(action: Action, env: Env): PlanResult {
  const at = env.now.toISOString(), {stores} = env, weightUnit = env.weightUnit ?? dailyData(stores.health).preferences.weightUnit;
  const healthId = env.newHealthId ?? newHealthId, habitId = env.newHabitId ?? (() => crypto.randomUUID());
  switch (action.kind) {
    case 'log-water': {
      const day = resolveDay(action.day, env.healthDay, env.healthDay); if (!day.ok) return refuse(day.message);
      const ml = Math.round((action.millilitres ?? (action.glasses ?? 0) * GLASS_ML) * 1000) / 1000, id = healthId();
      if (ml <= 0) return refuse('Water needs an amount above zero.');
      return {ok: true, plan: {target: 'health', card: {kind: action.kind, title: 'Add water', lines: [`${num(ml, 0)} mL${action.glasses !== undefined ? ` (${num(action.glasses, 2)} glass${action.glasses === 1 ? '' : 'es'} of ${GLASS_ML} mL)` : ''}`], where: 'Health · Water', day: dayLabel(day.day, env.healthDay), estimate: false},
        write: s => ({health: addWater(s.health, {id, date: day.day, amountMilli: Math.round(ml * 1000), unit: 'ml'}, at)}),
        undo: {label: 'Remove this water entry', write: s => ({health: removeWater(s.health, id)}), unchanged: (after, current) => same(dailyData(after.health).water.find(w => w.id === id), dailyData(current.health).water.find(w => w.id === id))}, activity: {id, title: `Water: ${num(ml, 0)} mL`}}};
    }
    case 'log-weight': {
      const day = resolveDay(action.day, env.healthDay, env.healthDay); if (!day.ok) return refuse(day.message);
      const grams = Math.round(action.unit === 'kg' ? action.value * 1000 : action.value * 453.59237), previous = stores.health.weights.find(w => w.date === day.day), id = healthId();
      const shown = weightUnit === 'lb' ? lb(grams) : kg(grams);
      return {ok: true, plan: {target: 'health', card: {kind: action.kind, title: previous ? 'Replace the weight reading' : 'Add a weight reading', lines: [`${num(action.value, 2)} ${action.unit}${(action.unit === 'kg') !== (weightUnit === 'kg') ? ` (${shown} in your unit)` : ''}`, ...(previous ? [`Replaces ${weightUnit === 'lb' ? lb(previous.grams) : kg(previous.grams)} recorded for that day`] : [])], where: 'Health · Weight', day: dayLabel(day.day, env.healthDay), estimate: false},
        write: s => ({health: saveWeight(s.health, {id, date: day.day, grams}, at)}),
        undo: {label: previous ? 'Put the previous reading back' : 'Remove this reading', write: s => { const current = s.health.weights.find(w => w.date === day.day); if (previous) return {health: saveWeight(s.health, {id: previous.id, date: day.day, grams: previous.grams}, at)}; return {health: current ? removeHealthItem(s.health, 'weights', current.id) : s.health}; },
          unchanged: (after, current) => same(after.health.weights.find(w => w.date === day.day), current.health.weights.find(w => w.date === day.day))}, activity: {id: previous?.id ?? id, title: `Weight: ${num(action.value, 2)} ${action.unit}`}}};
    }
    case 'log-steps': {
      const day = resolveDay(action.day, env.healthDay, env.healthDay); if (!day.ok) return refuse(day.message);
      const id = healthId(), minutes = action.minutes ?? 0;
      return {ok: true, plan: {target: 'health', card: {kind: action.kind, title: 'Add steps', lines: [`${action.steps.toLocaleString('en-US')} steps${minutes ? ` · ${minutes} min` : ''}, as a Walk entry`], where: 'Health · Activity', day: dayLabel(day.day, env.healthDay), estimate: false},
        write: s => ({health: saveActivity(s.health, {id, date: day.day, name: 'Walk', steps: action.steps, minutes}, at)}),
        undo: {label: 'Remove this activity', write: s => ({health: removeHealthItem(s.health, 'activity', id)}), unchanged: (after, current) => same(after.health.activity.find(a => a.id === id), current.health.activity.find(a => a.id === id))}, activity: {id, title: `Steps: ${action.steps.toLocaleString('en-US')}`}}};
    }
    case 'log-food': {
      const day = resolveDay(action.day, env.healthDay, env.healthDay); if (!day.ok) return refuse(day.message);
      const entryId = healthId(), quantityMilli = Math.round(action.quantity * 1000);
      if (action.food) {
        const found = env.handles.find(h => h.handle === action.food && (h.kind === 'food' || h.kind === 'recipe'));
        const sourceKind = found?.kind === 'recipe' ? 'recipe' as const : 'food' as const;
        const source = found ? (sourceKind === 'food' ? stores.health.foods.find(f => f.id === found.id) : stores.health.recipes.find(r => r.id === found.id)) : undefined;
        if (!found || !source) return refuse('ZIGi named a food that is not in this page\'s context, so nothing was proposed. Ask again from Health.');
        return {ok: true, plan: {target: 'health', card: {kind: action.kind, title: `Log ${sourceKind === 'recipe' ? 'a recipe' : 'a food'} from your library`, lines: [`${action.meal}: ${source.name} × ${num(action.quantity, 2)} serving${action.quantity === 1 ? '' : 's'}`, 'Nutrients come from your own entry, not from the AI'], where: 'Health · Diary', day: dayLabel(day.day, env.healthDay), estimate: false},
          write: s => ({health: logHealthItem(s.health, {id: entryId, sourceId: found.id, sourceKind, date: day.day, meal: action.meal, quantityMilli}, at)}),
          undo: {label: 'Remove this diary entry', write: s => ({health: removeHealthItem(s.health, 'diary', entryId)}), unchanged: (after, current) => same(after.health.diary.find(e => e.id === entryId), current.health.diary.find(e => e.id === entryId))}, activity: {id: entryId, title: `${action.meal}: ${source.name}`}}};
      }
      const estimate = action.estimate ?? {}, foodId = healthId(), serving = estimate.serving_g ?? 100;
      const mg = (g: number | undefined) => g === undefined ? null : Math.round(g * 1000);
      const food = foodSchema.parse({id: foodId, name: action.name, brand: 'AI estimate', servingGrams: serving, nutrients: {kcal: estimate.kcal === undefined ? null : Math.round(estimate.kcal), proteinMg: mg(estimate.protein_g), carbsMg: mg(estimate.carbs_g), fatMg: mg(estimate.fat_g)}, createdAt: at, updatedAt: at});
      const nutrientLines = [`kcal ${estimate.kcal === undefined ? 'unknown' : Math.round(estimate.kcal)}`, `protein ${estimate.protein_g === undefined ? 'unknown' : `${num(estimate.protein_g)} g`}`, `carbs ${estimate.carbs_g === undefined ? 'unknown' : `${num(estimate.carbs_g)} g`}`, `fat ${estimate.fat_g === undefined ? 'unknown' : `${num(estimate.fat_g)} g`}`];
      return {ok: true, plan: {target: 'health', card: {kind: action.kind, title: 'Log a food with an AI estimate', lines: [`${action.meal}: ${action.name} × ${num(action.quantity, 2)} serving${action.quantity === 1 ? '' : 's'}`, `AI estimate per serving: ${nutrientLines.join(', ')}; unknown stays unknown, never 0`, estimate.serving_g === undefined ? `Serving weight not given: recorded as ${serving} g per serving (an AI estimate you can edit in Foods & recipes)` : `Serving ${serving} g`, 'Added to Foods & recipes as "AI estimate" so you can correct it later'], where: 'Health · Diary and Foods & recipes', day: dayLabel(day.day, env.healthDay), estimate: true},
        write: s => ({health: logHealthItem(saveFood(s.health, food), {id: entryId, sourceId: foodId, sourceKind: 'food', date: day.day, meal: action.meal, quantityMilli}, at)}),
        undo: {label: 'Remove this entry and the estimated food', write: s => ({health: removeHealthItem(removeHealthItem(s.health, 'diary', entryId), 'foods', foodId)}), unchanged: (after, current) => same(after.health.diary.find(e => e.id === entryId), current.health.diary.find(e => e.id === entryId)) && same(after.health.foods.find(f => f.id === foodId), current.health.foods.find(f => f.id === foodId))}, activity: {id: entryId, title: `${action.meal}: ${action.name}`}}};
    }
    case 'log-measurement': {
      const day = resolveDay(action.day, env.healthDay, env.healthDay); if (!day.ok) return refuse(day.message);
      const id = healthId(), observedAt = day.day === env.healthDay ? at : `${day.day}T12:00:00.000Z`;
      const draft = {id, kind: action.kind_of, quantityMilli: Math.round(action.value * 1000), unit: action.unit, observedAt, timezone: env.timeZone, sourceLabel: 'ZIGi · your AI'};
      return {ok: true, plan: {target: 'health', card: {kind: action.kind, title: 'Add a body measurement', lines: [`${action.kind_of}: ${num(action.value, 2)} ${action.unit}`], where: 'Health · Body measurements', day: dayLabel(day.day, env.healthDay), estimate: false},
        write: s => ({health: saveMeasurement(s.health, draft, at)}),
        undo: {label: 'Remove this measurement', write: s => { const rest = (s.health.measurements ?? []).filter(m => m.id !== id); return {health: healthSchema.parse({...s.health, measurements: rest.length ? rest : undefined})}; }, unchanged: (after, current) => same((after.health.measurements ?? []).find(m => m.id === id), (current.health.measurements ?? []).find(m => m.id === id))}, activity: {id, title: `Measurement: ${action.kind_of} ${num(action.value, 2)} ${action.unit}`}}};
    }
    case 'check-in': {
      const found = habitOf(env, action.habit); if (!found.ok) return refuse(found.message);
      const day = resolveDay(action.day, env.habitDay, env.habitDay); if (!day.ok) return refuse(day.message);
      const {habit} = found, rule = latestHabitRule(habit), unit = measurementUnit(rule), previous = entryOn(stores.habits, habit.id, day.day);
      const amount = amountFor(rule, action); if (!amount.ok) return refuse(amount.message);
      const value = amount.value ?? smartDoneValue(rule);
      const partial = rule.type === 'build' && rule.measurement.kind !== 'boolean' && value < rule.target && value > 0;
      return {ok: true, plan: {target: 'habits', card: {kind: action.kind, title: partial ? `Partial check-in: ${habit.title}` : `Check in: ${habit.title}`, lines: [rule.measurement.kind === 'boolean' ? (value >= 1 ? 'Mark as done' : 'Mark as not done') : `Set the day's count to ${num(value, 2)}${unit ? ' ' + unit : ''} (target ${rule.target}${unit ? ' ' + unit : ''})${previous ? `, was ${previous.count}` : ''}`, ...(amount.said ? [amount.said] : []), ...(action.note ? [`Note: ${action.note}`] : [])], where: `Habits · ${habit.title}`, day: dayLabel(day.day, env.habitDay), estimate: false},
        write: s => ({habits: logHabitValue(s.habits, habit.id, day.day, value, {mode: 'set', note: action.note ?? previous?.note ?? ''}, env.now)}),
        undo: {label: previous ? 'Put the previous check-in back' : 'Remove this check-in', write: s => ({habits: restoreEntry(s.habits, habit.id, day.day, previous, env.now)}), unchanged: (after, current) => same(entryOn(after.habits, habit.id, day.day), entryOn(current.habits, habit.id, day.day))},
        activity: {id: `habit:${habit.id}:${day.day}`, title: `Check-in: ${habit.title}`}}};
    }
    case 'skip': {
      const found = habitOf(env, action.habit); if (!found.ok) return refuse(found.message);
      const day = resolveDay(action.day, env.habitDay, env.habitDay, true); if (!day.ok) return refuse(day.message);
      const {habit} = found, future = day.day > env.habitDay, previous = entryOn(stores.habits, habit.id, day.day);
      return {ok: true, plan: {target: 'habits', card: {kind: action.kind, title: `${future ? 'Plan a skip' : 'Skip'}: ${habit.title}`, lines: ['A skipped day is neutral: it neither adds to a streak nor breaks it', ...(action.reason ? [`Reason: ${action.reason}`] : [])], where: `Habits · ${habit.title}`, day: dayLabel(day.day, env.habitDay), estimate: false},
        write: s => ({habits: future ? planSkip(s.habits, habit.id, day.day, action.reason ?? '', env.now) : setHabitEntryStatus(s.habits, habit.id, day.day, 'skipped', action.reason ?? '', env.now)}),
        undo: {label: 'Undo the skip', write: s => ({habits: restoreEntry(s.habits, habit.id, day.day, previous, env.now)}), unchanged: (after, current) => same(entryOn(after.habits, habit.id, day.day), entryOn(current.habits, habit.id, day.day))}, activity: {id: `habit:${habit.id}:${day.day}`, title: `Skipped: ${habit.title}`}}};
    }
    case 'create-habit': {
      // A habit another card of this reply points at ("new1") gets the id that card was given.
      const id = action.ref ? env.refs?.get(action.ref)?.id ?? habitId() : habitId();
      const measurement = action.measurement === 'done' ? (action.type === 'limit' ? {kind: 'count' as const, unit: 'times'} : {kind: 'boolean' as const}) : action.measurement === 'count' ? {kind: 'count' as const, unit: 'times'} : action.measurement === 'minutes' || action.measurement === 'hours' ? {kind: 'duration' as const, unit: action.measurement} : {kind: 'quantity' as const, unit: action.measurement.unit};
      const target = action.target ?? (action.type === 'quit' ? 0 : measurement.kind === 'boolean' ? 1 : 1);
      const schedule = action.schedule === 'daily' ? {kind: 'daily' as const} : 'weekdays' in action.schedule ? {kind: 'weekdays' as const, days: [...new Set(action.schedule.weekdays)]} : 'timesPerWeek' in action.schedule ? {kind: 'frequency' as const, times: action.schedule.timesPerWeek, period: 'week' as const} : {kind: 'interval' as const, every: action.schedule.everyDays, anchor: env.habitDay};
      const input: HabitInput = {title: action.title, category: action.category ?? 'Personal', description: action.description, notes: '', type: action.type, measurement, schedule, target, targetPeriod: 'day', timeOfDay: action.timeOfDay};
      const parsed = habitInputSchema.safeParse(input); if (!parsed.success) return refuse(`This habit cannot be created as proposed: ${parsed.error.issues[0]?.message ?? 'check its target and measurement'}.`);
      const unit = measurement.kind === 'boolean' ? '' : ` ${measurement.unit}`;
      const scheduleText = schedule.kind === 'daily' ? 'daily' : schedule.kind === 'weekdays' ? `on weekdays ${schedule.days.join(', ')} (0 = Sunday)` : schedule.kind === 'frequency' ? `${schedule.times} times a week` : `every ${schedule.every} days`;
      return {ok: true, plan: {target: 'habits', card: {kind: action.kind, title: `Create the habit "${action.title}"`, lines: [`${action.type} · ${measurement.kind === 'boolean' ? 'done or not' : `target ${target}${unit} a day`} · ${scheduleText} · ${action.timeOfDay}`, ...(action.description ? [action.description] : []), 'Starts today; you can edit everything in Habits'], where: 'Habits', day: null, estimate: false},
        write: s => ({habits: createHabit(s.habits, input, env.now, id)}),
        undo: {label: 'Remove this habit', write: s => ({habits: habitDataSchema.parse({...s.habits, habits: s.habits.habits.filter(h => h.id !== id)})}), unchanged: (after, current) => same(after.habits.habits.find(h => h.id === id), current.habits.habits.find(h => h.id === id))},
        activity: {id: `habit-created:${id}`, title: `Habit created: ${action.title}`}}};
    }
    case 'start-fast': {
      if (runningSession(applyAutoStop(stores.fasting, env.now))) return refuse('A fast is already running; stop it first.');
      const id = `fast_${healthId().slice(7)}`, preset = FASTING_PRESETS.find(p => p.hours === action.targetHours);
      return {ok: true, plan: {target: 'fasting', card: {kind: action.kind, title: 'Start a fast', lines: [`Target ${action.targetHours} h${preset ? ` (${preset.label})` : ` (custom, up to ${MAX_CUSTOM_HOURS} h)`}`, 'Stops by itself at 24 h; stop it any time from Health'], where: 'Health · Fasting timer', day: null, estimate: false, safety: HE6_NOTE},
        write: s => ({fasting: startFast(applyAutoStop(s.fasting, env.now), {id, now: env.now, targetHours: action.targetHours, timeZone: env.timeZone})}),
        undo: {label: 'Discard this fast', write: s => ({fasting: removeFast(s.fasting, id)}), unchanged: (after, current) => same(after.fasting.sessions.find(f => f.id === id), current.fasting.sessions.find(f => f.id === id))}, activity: {id, title: `Fast started (${action.targetHours} h target)`}}};
    }
    case 'stop-fast': {
      const running = runningSession(applyAutoStop(stores.fasting, env.now)); if (!running) return refuse('No fast is running right now.');
      return {ok: true, plan: {target: 'fasting', card: {kind: action.kind, title: 'Stop the running fast', lines: [`Started ${running.startedAt.slice(0, 16).replace('T', ' ')} · target ${running.targetHours} h`], where: 'Health · Fasting timer', day: null, estimate: false, safety: HE6_NOTE},
        write: s => ({fasting: stopFast(applyAutoStop(s.fasting, env.now), running.id, env.now, 'person')}),
        undo: {label: 'Resume the fast', write: s => ({fasting: fastingSchema.parse({...s.fasting, sessions: s.fasting.sessions.map(f => f.id === running.id ? {...f, endedAt: null, stoppedBy: undefined} : f)})}), unchanged: (after, current) => same(after.fasting.sessions.find(f => f.id === running.id), current.fasting.sessions.find(f => f.id === running.id))}, activity: {id: `${running.id}:stop`, title: 'Fast stopped'}}};
    }
    case 'create-goal': {
      const decimals = ['USD', 'EUR'].includes(action.currency) ? 2 : 18;
      let target: string; try { target = parseAmountInput(String(action.target), decimals).toString(); } catch { return refuse('The target amount could not be read.'); }
      const id = String(Array.from({length: stores.platform.goals.length + 1}, (_, i) => String(i)).find(candidate => !stores.platform.goals.some(g => g.id === candidate)));
      const denom = action.type === 'VALUE' ? action.currency : action.currency === 'ZIG' ? 'azig' : `manual:${action.currency}`;
      const draft = privateGoalSchema.safeParse({id, name: action.name, category: action.category, network: 'zigchain-1', type: action.type, status: 'active', asset: action.currency, denom, decimals, target, notes: action.notes, createdAt: at, targetDate: action.targetDate, milestones: (action.milestones ?? []).map((title, i) => ({id: `zigi-milestone-${i + 1}`, title, done: false}))});
      if (!draft.success) return refuse(`This goal cannot be created as proposed: ${draft.error.issues[0]?.message ?? 'check its fields'}.`);
      const goal = draft.data;
      return {ok: true, plan: {target: 'platform', card: {kind: action.kind, title: `Create the goal "${action.name}"`, lines: [`${action.type === 'VALUE' ? 'Value goal' : 'Quantity goal'} · target ${action.target.toLocaleString('en-US')} ${action.currency}${action.targetDate ? ` by ${action.targetDate}` : ''}${action.category ? ` · ${action.category}` : ''}`, ...(action.notes ? [`Notes: ${action.notes}`] : []), ...(action.milestones?.length ? [`Milestones: ${action.milestones.join(' · ')}`] : []), 'A draft without a plan or funding: nothing moves; you shape it in Goals'], where: 'Goals', day: null, estimate: false},
        write: s => { if (s.platform.goals.some(g => g.id === id)) throw Error('Another goal took this place meanwhile. Ask ZIGi again.'); return {platform: platformSchema.parse({...s.platform, goals: [...s.platform.goals, goal]})}; },
        undo: {label: 'Remove this goal draft', write: s => ({platform: deletePrivateGoal(s.platform, id)}), unchanged: (after, current) => same(after.platform.goals.find(g => g.id === id), current.platform.goals.find(g => g.id === id))}, activity: {id: `created:${id}`, title: `Goal created: ${action.name}`}}};
    }
    case 'add-goal-note': {
      const found = env.handles.find(h => h.handle === action.goal && h.kind === 'goal');
      if (!found) return refuse('ZIGi named a goal that is not in this page\'s context, so nothing was proposed. Ask again from Goals.');
      const goalId = found.id.startsWith('private:') ? found.id.slice('private:'.length) : null, goal = goalId ? stores.platform.goals.find(g => g.id === goalId) : undefined;
      if (!goal) return refuse('Notes on a simulation goal are edited from its own page.');
      if (goal.locked) return refuse('This goal is locked. Unlock it in Goals before adding a note.');
      const previous = goal.notes, next = `${previous ? `${previous}\n` : ''}${action.note}`.slice(0, 2000);
      return {ok: true, plan: {target: 'platform', card: {kind: action.kind, title: `Add a note to "${goal.name}"`, lines: [action.note, ...(previous ? ['Appended below your existing notes'] : [])], where: 'Goals', day: null, estimate: false},
        write: s => ({platform: platformSchema.parse({...s.platform, goals: s.platform.goals.map(g => g.id === goal.id ? {...g, notes: next} : g)})}),
        undo: {label: 'Remove the note', write: s => ({platform: platformSchema.parse({...s.platform, goals: s.platform.goals.map(g => g.id === goal.id ? {...g, notes: previous} : g)})}), unchanged: (after, current) => same(after.platform.goals.find(g => g.id === goal.id)?.notes, current.platform.goals.find(g => g.id === goal.id)?.notes)}, activity: {id: `goal-note:${goal.id}:${at}`, title: `Note added to ${goal.name}`}}};
    }
    case 'prefill-holding': {
      const quantity = typeof action.quantity === 'number' ? num(action.quantity, 8) : action.quantity;
      const prefill: HoldingPrefill = {category: action.category, name: action.name, quantity, currency: action.currency, value: action.value === undefined ? undefined : num(action.value, 2), symbol: action.symbol, notes: action.notes};
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: 'Pre-fill the add-asset form', lines: [`${action.category} · ${action.name}${action.symbol ? ` (${action.symbol})` : ''} · quantity ${quantity}${action.value !== undefined ? ` · value ${num(action.value, 2)} ${action.currency}` : ` · ${action.currency}`}`, 'Nothing is saved here: the form opens in Wealth with these values and you review and save it yourself'], where: 'Wealth · Add asset', day: null, estimate: false}, write: () => ({}), undo: null, prefill}};
    }
    // ---- Session V Part 7 ----
    case 'create-food': {
      const id = healthId(), estimate = action.estimate ?? {}, estimated = action.brand === undefined;
      const serving = action.serving_ml !== undefined ? {servingGrams: null, servingMl: action.serving_ml} : {servingGrams: action.serving_g ?? 100};
      const food = foodSchema.safeParse({id, name: action.name, brand: action.brand ?? 'AI estimate', ...serving, nutrients: nutrition(estimate), createdAt: at, updatedAt: at});
      if (!food.success) return refuse(`This food cannot be added as proposed: ${food.error.issues[0]?.message ?? 'check its values'}.`);
      const twin = stores.health.foods.some(f => f.name.trim().toLowerCase() === action.name.trim().toLowerCase());
      return {ok: true, plan: {target: 'health', card: {kind: action.kind, title: `Add the food "${action.name}"`, lines: [`${action.brand ? `${action.brand} · ` : ''}per serving of ${action.serving_ml !== undefined ? `${num(action.serving_ml)} mL` : `${num(action.serving_g ?? 100)} g`}`, `Per serving: ${nutrientText(estimate)}; unknown stays unknown, never 0`, ...(action.serving_g === undefined && action.serving_ml === undefined ? ['Serving weight not given: recorded as 100 g per serving (edit it in Foods & recipes)'] : []), ...(twin ? [`You already have a food called "${action.name}"; this adds a second one`] : [])], where: 'Health · Foods & recipes', day: null, estimate: estimated && Object.keys(estimate).length > 0},
        write: s => ({health: saveFood(s.health, food.data)}),
        undo: {label: 'Remove this food', write: s => ({health: removeHealthItem(s.health, 'foods', id)}), unchanged: (after, current) => same(after.health.foods.find(f => f.id === id), current.health.foods.find(f => f.id === id)) && !usesFood(current.health, id)},
        activity: {id, title: `Food added: ${action.name}`}}};
    }
    case 'create-recipe': {
      const recipeId = healthId(), created: HealthFood[] = [], items: {foodId: string; quantityMilli: number}[] = [], lines: string[] = [];
      for (const ingredient of action.ingredients) {
        let food: HealthFood | undefined, source: string;
        if (ingredient.food) {
          const handle = env.handles.find(h => h.handle === ingredient.food && h.kind === 'food');
          food = handle ? stores.health.foods.find(f => f.id === handle.id) : undefined;
          if (!food) return refuse(`ZIGi named a food (${ingredient.food}) that is not in this page's context, so nothing was proposed. Ask again from Health.`);
        } else {
          // The person's own foods first: one with exactly this name is used; two are a question, never a guess.
          const matches = stores.health.foods.filter(f => f.name.trim().toLowerCase() === ingredient.name.trim().toLowerCase());
          if (matches.length > 1) return refuse(`You have ${matches.length} foods called "${ingredient.name}", so nothing was proposed. Ask again from Health, where ZIGi can tell them apart.`);
          food = matches[0];
        }
        let quantityMilli: number;
        if (food) {
          if (ingredient.grams !== undefined && food.servingGrams === null) return refuse(`${food.name} is measured in millilitres; give it in servings.`);
          quantityMilli = Math.round((ingredient.grams !== undefined ? ingredient.grams / food.servingGrams! : ingredient.servings ?? 1) * 1000);
          source = 'your food';
        } else {
          const estimate = ingredient.estimate_per_100g ?? {}, fresh = foodSchema.safeParse({id: healthId(), name: ingredient.name, brand: 'AI estimate', servingGrams: 100, nutrients: nutrition(estimate), createdAt: at, updatedAt: at});
          if (!fresh.success) return refuse(`${ingredient.name} cannot be added as a food: ${fresh.error.issues[0]?.message ?? 'check its values'}.`);
          created.push(fresh.data); food = fresh.data;
          quantityMilli = Math.round((ingredient.grams !== undefined ? ingredient.grams / 100 : ingredient.servings ?? 1) * 1000);
          source = Object.keys(estimate).length ? `new food, AI estimate per 100 g: ${nutrientText(estimate)}` : 'new food, nutrients unknown';
        }
        if (quantityMilli < 1) return refuse(`The amount of ${ingredient.name} is too small to record.`);
        items.push({foodId: food.id, quantityMilli});
        lines.push(`${ingredient.grams !== undefined ? `${num(ingredient.grams)} g` : `${num(ingredient.servings ?? 1, 2)} serving${(ingredient.servings ?? 1) === 1 ? '' : 's'}`} ${ingredient.name} (${source})`);
      }
      const portionsMilli = Math.round(action.servings * 1000), draft = {id: recipeId, name: action.name, portionsMilli, items};
      const withFoods = (health: HealthData) => created.reduce((h, f) => saveFood(h, f), health);
      try { saveRecipe(withFoods(stores.health), draft, at); } catch (error) { return refuse(`This recipe cannot be created as proposed: ${error instanceof Error ? error.message : 'check its ingredients'}`); }
      return {ok: true, plan: {target: 'health', card: {kind: action.kind, title: `Create the recipe "${action.name}"`, lines: [`Makes ${num(action.servings, 2)} serving${action.servings === 1 ? '' : 's'}`, ...lines, ...(created.length ? [`${created.length} new food${created.length === 1 ? '' : 's'} added to Foods & recipes as "AI estimate" (100 g per serving); unknown nutrients stay unknown`] : [])], where: 'Health · Foods & recipes', day: null, estimate: created.length > 0},
        write: s => ({health: saveRecipe(withFoods(s.health), draft, at)}),
        undo: {label: created.length ? 'Remove this recipe and its new foods' : 'Remove this recipe', write: s => ({health: created.reduce((h, f) => removeHealthItem(h, 'foods', f.id), removeHealthItem(s.health, 'recipes', recipeId))}),
          unchanged: (after, current) => same(after.health.recipes.find(r => r.id === recipeId), current.health.recipes.find(r => r.id === recipeId)) && created.every(f => same(after.health.foods.find(x => x.id === f.id), current.health.foods.find(x => x.id === f.id))) && !usesFood(current.health, recipeId) && created.every(f => !usesFood(current.health, f.id, recipeId))},
        activity: {id: recipeId, title: `Recipe created: ${action.name}`}}};
    }
    case 'plan-meal': {
      const day = resolveDay(action.day, env.healthDay, env.healthDay, true); if (!day.ok) return refuse(day.message);
      if (day.day < env.healthDay) return refuse('A meal plan is for today or a later day; log a past meal in the diary instead.');
      if (day.day > addLocalDays(env.healthDay, PLAN_AHEAD_DAYS)) return refuse(`Meals can be planned up to ${PLAN_AHEAD_DAYS} days ahead.`);
      const planId = healthId(), quantityMilli = Math.round(action.servings * 1000);
      let savedMealId: string, name: string, recipeId: string | null = null;
      if (action.saved_meal) {
        const handle = env.handles.find(h => h.handle === action.saved_meal && h.kind === 'meal'), meal = handle ? dailyData(stores.health).savedMeals.find(m => m.id === handle.id) : undefined;
        if (!meal) return refuse('ZIGi named a saved meal that is not in this page\'s context, so nothing was proposed. Ask again from Health.');
        savedMealId = meal.id; name = meal.name;
      } else {
        const handle = env.handles.find(h => h.handle === action.recipe && h.kind === 'recipe'), recipe = handle ? stores.health.recipes.find(r => r.id === handle.id) : undefined;
        if (!recipe) return refuse('ZIGi named a recipe that is not in this page\'s context, so nothing was proposed. Ask again from Health.');
        savedMealId = healthId(); name = recipe.name; recipeId = recipe.id;
      }
      return {ok: true, plan: {target: 'health', card: {kind: action.kind, title: `Plan ${name}`, lines: [`${action.meal} · ${recipeId ? `${num(action.servings, 2)} serving${action.servings === 1 ? '' : 's'} of your recipe` : 'your saved meal as saved'}`, 'Planned only: log it from Meals & planning when you eat it'], where: 'Health · Meals & planning', day: dayLabel(day.day, env.healthDay), estimate: false},
        write: s => { const h = recipeId ? saveMealFromRecipe(s.health, savedMealId, recipeId, quantityMilli, at) : s.health; return {health: saveMealPlan(h, {id: planId, savedMealId, date: day.day, meal: action.meal}, at)}; },
        undo: {label: 'Remove this planned meal', write: s => { const h = removeMealPlan(s.health, planId); return {health: recipeId ? removeSavedMeal(h, savedMealId) : h}; },
          unchanged: (after, current) => same(dailyData(after.health).plans.find(p => p.id === planId), dailyData(current.health).plans.find(p => p.id === planId)) && (!recipeId || (same(dailyData(after.health).savedMeals.find(m => m.id === savedMealId), dailyData(current.health).savedMeals.find(m => m.id === savedMealId)) && !dailyData(current.health).plans.some(p => p.savedMealId === savedMealId && p.id !== planId)))},
        activity: {id: planId, title: `Meal planned: ${name}`}}};
    }
    case 'grocery-item': {
      const block = action.items.map(item => `- ${item}`).join('\n'), previous = dailyData(stores.health).groceryNotes ?? '';
      const join = (notes: string) => notes ? `${notes}${notes.endsWith('\n') ? '' : '\n'}${block}` : block;
      if (join(previous).length > 10_000) return refuse('Your grocery notes are full (10,000 characters). Tidy them in Meals & planning first.');
      let before: string | null = null;
      return {ok: true, plan: {target: 'health', card: {kind: action.kind, title: action.items.length === 1 ? `Add "${action.items[0]}" to your grocery notes` : `Add ${action.items.length} items to your grocery notes`, lines: action.items, where: 'Health · Meals & planning · Grocery notes', day: null, estimate: false},
        write: s => { before = dailyData(s.health).groceryNotes ?? ''; return {health: saveGroceryNotes(s.health, join(before))}; },
        undo: {label: 'Take these items off again', write: s => ({health: saveGroceryNotes(s.health, before ?? previous)}), unchanged: (after, current) => dailyData(after.health).groceryNotes === dailyData(current.health).groceryNotes},
        activity: {id: `groceries:${at}`, title: `Groceries: ${action.items.join(', ').slice(0, 120)}`}}};
    }
    case 'counter': {
      const day = resolveDay(action.day, env.healthDay, env.healthDay); if (!day.ok) return refuse(day.message);
      const counters = exerciseData(stores.health).counters, wanted = action.counter.trim().toLowerCase();
      const handle = /^c\d{1,3}$/.test(wanted) ? env.handles.find(h => h.handle === wanted && h.kind === 'counter') : undefined;
      const singular = (name: string) => name.trim().toLowerCase().replace(/[-\s]+/g, ' ').replace(/s$/, '');
      const matches = handle ? counters.filter(c => c.id === handle.id) : counters.filter(c => singular(c.name) === singular(wanted));
      if (matches.length !== 1) return refuse(/^c\d/.test(wanted) ? 'ZIGi named a counter that is not in this page\'s context, so nothing was proposed.' : `No single counter is called "${action.counter}"; your counters: ${counters.map(c => c.name).join(', ')}.`);
      const counter = matches[0]!, was = countOn(stores.health, counter.id, day.day);
      if (action.count < 0 && !was) return refuse(`${counter.name} has no entry on that day to take away from.`);
      let before: HealthData['exercise'] | null = null;
      return {ok: true, plan: {target: 'health', card: {kind: action.kind, title: `${action.count > 0 ? 'Add' : 'Take away'} ${Math.abs(action.count)} ${counter.name}`, lines: [`${counter.name}: ${was ?? 'no entry'} → ${Math.max(0, (was ?? 0) + action.count)}`], where: 'Health · Counters', day: dayLabel(day.day, env.healthDay), estimate: false},
        write: s => { before = s.health.exercise; return {health: changeCount(s.health, counter.id, day.day, action.count)}; },
        undo: {label: 'Put the count back', write: s => { const {exercise, ...rest} = s.health; void exercise; return {health: healthSchema.parse(before === undefined ? rest : {...rest, exercise: before ?? s.health.exercise})}; },
          unchanged: (after, current) => same(after.health.exercise, current.health.exercise)},
        activity: {id: `${counter.id}@${day.day}`, title: `${counter.name}: ${action.count > 0 ? '+' : ''}${action.count}`}}};
    }
    case 'create-reminder': {
      const time = action.time;
      if (action.for === 'habit' || action.for === 'water') {
        let habitId: string | null = null, title = 'Water';
        if (action.for === 'habit') {
          const ref = /^new\d/.test(action.habit!) ? env.refs?.get(action.habit!) : undefined;
          if (/^new\d/.test(action.habit!) && !ref) return refuse('This reminder belongs to a habit that is not proposed in this reply, so nothing was proposed.');
          if (ref) { habitId = ref.id; title = ref.title; }
          else { const found = habitOf(env, action.habit!); if (!found.ok) return refuse(found.message); habitId = found.habit.id; title = found.habit.title; }
        }
        const previous = habitId ? stores.reminders.habits[habitId]?.time : stores.reminders.water?.time;
        const pending = habitId !== null && !stores.habits.habits.some(h => h.id === habitId);
        return {ok: true, plan: {target: 'reminders', card: {kind: action.kind, title: `Remind me: ${title}`, lines: [`Every day at ${time}, as a reminder card on Today (this device only)`, ...(previous ? [`Replaces ${previous}`] : []), ...(pending ? [`For the new habit "${title}": add that card first`] : [])], where: 'Today · Reminders', day: null, estimate: false},
          write: s => { if (habitId && !s.habits.habits.some(h => h.id === habitId)) throw Error(`Add the habit "${title}" first, then its reminder.`); return {reminders: habitId ? setHabitReminder(s.reminders, habitId, time) : setWaterReminder(s.reminders, time)}; },
          undo: {label: previous ? 'Put the previous time back' : 'Remove this reminder', write: s => ({reminders: habitId ? setHabitReminder(s.reminders, habitId, previous ?? null) : setWaterReminder(s.reminders, previous ?? null)}),
            unchanged: (after, current) => same(habitId ? after.reminders.habits[habitId] : after.reminders.water, habitId ? current.reminders.habits[habitId] : current.reminders.water)},
          activity: {id: `reminder:${habitId ?? 'water'}`, title: `Reminder: ${title} at ${time}`}}};
      }
      const weekday = action.weekday ?? new Date(`${env.healthDay}T12:00:00Z`).getUTCDay(), when = {weekday, time}, dayName = WEEKDAYS[weekday]!;
      if (action.for === 'goal') {
        const found = env.handles.find(h => h.handle === action.goal && h.kind === 'goal');
        if (!found) return refuse('ZIGi named a goal that is not in this page\'s context, so nothing was proposed. Ask again from Goals.');
        const key = found.id, previous = stores.zigiReminders.goalCheckIns?.[key];
        return {ok: true, plan: {target: 'zigiReminders', card: {kind: action.kind, title: `Weekly check-in: ${found.label}`, lines: [`Every ${dayName} at ${time}, kept on this device for ZIGi's reminders`, ...(previous ? [`Replaces ${WEEKDAYS[previous.weekday]} at ${previous.time}`] : [])], where: 'ZIGi · Reminders', day: null, estimate: false},
          write: s => ({zigiReminders: {...s.zigiReminders, goalCheckIns: {...(s.zigiReminders.goalCheckIns ?? {}), [key]: when}}}),
          undo: {label: previous ? 'Put the previous time back' : 'Remove this reminder', write: s => { const {goalCheckIns: current, ...rest} = s.zigiReminders, goalCheckIns = {...(current ?? {})}; if (previous) goalCheckIns[key] = previous; else delete goalCheckIns[key]; return {zigiReminders: Object.keys(goalCheckIns).length ? {...rest, goalCheckIns} : rest}; }, unchanged: (after, current) => same(after.zigiReminders.goalCheckIns?.[key], current.zigiReminders.goalCheckIns?.[key])},
          activity: {id: `reminder:goal:${key}`, title: `Reminder: ${found.label} every ${dayName}`}}};
      }
      const field = action.for === 'wealth' ? 'wealthLook' as const : 'packRefresh' as const, previous = stores.zigiReminders[field], label = action.for === 'wealth' ? 'A look at Wealth' : 'Make a new context pack';
      return {ok: true, plan: {target: 'zigiReminders', card: {kind: action.kind, title: `Weekly reminder: ${label}`, lines: [`Every ${dayName} at ${time}, kept on this device for ZIGi's reminders`, ...(previous ? [`Replaces ${WEEKDAYS[previous.weekday]} at ${previous.time}`] : [])], where: 'ZIGi · Reminders', day: null, estimate: false},
        write: s => ({zigiReminders: {...s.zigiReminders, [field]: when}}),
        undo: {label: previous ? 'Put the previous time back' : 'Remove this reminder', write: s => { const rest = {...s.zigiReminders}; if (previous === undefined) delete rest[field]; else rest[field] = previous; return {zigiReminders: rest}; }, unchanged: (after, current) => same(after.zigiReminders[field], current.zigiReminders[field])},
        activity: {id: `reminder:${action.for}`, title: `Reminder: ${label} every ${dayName}`}}};
    }
    case 'review-intention': {
      const {weekStart} = reviewWindow(stores.weekly.weekday, env.habitDay), previous = reviewFor(stores.weekly, weekStart)?.notes?.intention;
      let before: ReturnType<typeof reviewFor> | null = null;
      return {ok: true, plan: {target: 'weekly', card: {kind: action.kind, title: 'Set your intention for this week', lines: [action.intention, ...(previous ? [`Replaces: ${previous}`] : []), 'Only the intention field of your weekly review; you write the rest'], where: 'Weekly review', day: `week of ${weekStart}`, estimate: false},
        write: s => { before = reviewFor(s.weekly, weekStart); return {weekly: saveReviewNotes(s.weekly, weekStart, {intention: action.intention})}; },
        undo: {label: previous ? 'Put the previous intention back' : 'Remove this intention', write: s => ({weekly: weeklyReviewSchema.parse({...s.weekly, reviews: [...s.weekly.reviews.filter(r => r.weekStart !== weekStart), ...(before ? [before] : [])].sort((a, b) => a.weekStart.localeCompare(b.weekStart))})}),
          unchanged: (after, current) => same(reviewFor(after.weekly, weekStart), reviewFor(current.weekly, weekStart))},
        activity: {id: `review:${weekStart}:intention`, title: 'Weekly intention set'}}};
    }
  }
}
/** Applies a plan's write to the stores and returns the whole next set (only the touched store changes). */
export function applyPlan(plan: Plan, current: Stores): Stores { return {...current, ...plan.write(current)}; }
