import {parseAmountInput} from '../../amount-input';
import {saveMeasurement} from '../../body-measurements';
import {applyAutoStop, removeFast, runningSession, startFast, stopFast} from '../../fasting/engine';
import {FASTING_PRESETS, MAX_CUSTOM_HOURS, fastingSchema, type Fasting} from '../../fasting/schema';
import {createHabit, habitDataSchema, habitInputSchema, latestHabitRule, logHabitValue, measurementUnit, planSkip, setHabitEntryStatus, smartDoneValue, type Habit, type HabitData, type HabitInput} from '../../habits';
import {foodSchema, healthSchema, logHealthItem, newHealthId, removeHealthItem, saveActivity, saveFood, saveWeight, type HealthData} from '../../health';
import {addWater, dailyData, removeWater} from '../../health-daily';
import {addLocalDays} from '../../local-date';
import {deletePrivateGoal, platformSchema, privateGoalSchema, type Platform} from '../../positions';
import type {Handle} from '../context/types';
import {GLASS_ML, type HOLDING_CATEGORIES, type Action, type ActionKind} from './schema';

/**
 * From a validated proposal to a card and two writes (ADR-012, Part 5). `write` runs at confirm time on the latest
 * stores through the same save path the forms use (usePrivateStore.update, the fasting store's update, the platform
 * store), so the sync outbox, Activity and conflict handling see an ordinary edit. `undo` is the inverse operation
 * through the same path, refused when the record changed since. Handles are resolved here, on the device; a handle the
 * context never gave produces no card. Money: pre-filling the add-asset form is a hand-off, not a write.
 */
export type Stores = {health: HealthData; habits: HabitData; fasting: Fasting; platform: Platform};
export type Target = keyof Stores | 'form';
export type Env = {stores: Stores; handles: readonly Handle[]; now: Date; habitDay: string; healthDay: string; timeZone: string; weightUnit?: 'kg' | 'lb'; newHealthId?: () => string; newHabitId?: () => string};
export type Card = {kind: ActionKind; title: string; lines: string[]; where: string; day: string | null; estimate: boolean; safety?: string};
export type Undo = {label: string; write: (current: Stores) => Partial<Stores>; unchanged: (afterApply: Stores, current: Stores) => boolean};
export type HoldingPrefill = {category: (typeof HOLDING_CATEGORIES)[number]; name: string; quantity: string; currency: string; value?: string; symbol?: string; notes?: string};
export type Plan = {card: Card; target: Target; write: (current: Stores) => Partial<Stores>; undo: Undo | null; prefill?: HoldingPrefill};
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
        undo: {label: 'Remove this water entry', write: s => ({health: removeWater(s.health, id)}), unchanged: (after, current) => same(dailyData(after.health).water.find(w => w.id === id), dailyData(current.health).water.find(w => w.id === id))}}};
    }
    case 'log-weight': {
      const day = resolveDay(action.day, env.healthDay, env.healthDay); if (!day.ok) return refuse(day.message);
      const grams = Math.round(action.unit === 'kg' ? action.value * 1000 : action.value * 453.59237), previous = stores.health.weights.find(w => w.date === day.day), id = healthId();
      const shown = weightUnit === 'lb' ? lb(grams) : kg(grams);
      return {ok: true, plan: {target: 'health', card: {kind: action.kind, title: previous ? 'Replace the weight reading' : 'Add a weight reading', lines: [`${num(action.value, 2)} ${action.unit}${(action.unit === 'kg') !== (weightUnit === 'kg') ? ` (${shown} in your unit)` : ''}`, ...(previous ? [`Replaces ${weightUnit === 'lb' ? lb(previous.grams) : kg(previous.grams)} recorded for that day`] : [])], where: 'Health · Weight', day: dayLabel(day.day, env.healthDay), estimate: false},
        write: s => ({health: saveWeight(s.health, {id, date: day.day, grams}, at)}),
        undo: {label: previous ? 'Put the previous reading back' : 'Remove this reading', write: s => { const current = s.health.weights.find(w => w.date === day.day); if (previous) return {health: saveWeight(s.health, {id: previous.id, date: day.day, grams: previous.grams}, at)}; return {health: current ? removeHealthItem(s.health, 'weights', current.id) : s.health}; },
          unchanged: (after, current) => same(after.health.weights.find(w => w.date === day.day), current.health.weights.find(w => w.date === day.day))}}};
    }
    case 'log-steps': {
      const day = resolveDay(action.day, env.healthDay, env.healthDay); if (!day.ok) return refuse(day.message);
      const id = healthId(), minutes = action.minutes ?? 0;
      return {ok: true, plan: {target: 'health', card: {kind: action.kind, title: 'Add steps', lines: [`${action.steps.toLocaleString('en-US')} steps${minutes ? ` · ${minutes} min` : ''}, as a Walk entry`], where: 'Health · Activity', day: dayLabel(day.day, env.healthDay), estimate: false},
        write: s => ({health: saveActivity(s.health, {id, date: day.day, name: 'Walk', steps: action.steps, minutes}, at)}),
        undo: {label: 'Remove this activity', write: s => ({health: removeHealthItem(s.health, 'activity', id)}), unchanged: (after, current) => same(after.health.activity.find(a => a.id === id), current.health.activity.find(a => a.id === id))}}};
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
          undo: {label: 'Remove this diary entry', write: s => ({health: removeHealthItem(s.health, 'diary', entryId)}), unchanged: (after, current) => same(after.health.diary.find(e => e.id === entryId), current.health.diary.find(e => e.id === entryId))}}};
      }
      const estimate = action.estimate ?? {}, foodId = healthId(), serving = estimate.serving_g ?? 100;
      const mg = (g: number | undefined) => g === undefined ? null : Math.round(g * 1000);
      const food = foodSchema.parse({id: foodId, name: action.name, brand: 'AI estimate', servingGrams: serving, nutrients: {kcal: estimate.kcal === undefined ? null : Math.round(estimate.kcal), proteinMg: mg(estimate.protein_g), carbsMg: mg(estimate.carbs_g), fatMg: mg(estimate.fat_g)}, createdAt: at, updatedAt: at});
      const nutrientLines = [`kcal ${estimate.kcal === undefined ? 'unknown' : Math.round(estimate.kcal)}`, `protein ${estimate.protein_g === undefined ? 'unknown' : `${num(estimate.protein_g)} g`}`, `carbs ${estimate.carbs_g === undefined ? 'unknown' : `${num(estimate.carbs_g)} g`}`, `fat ${estimate.fat_g === undefined ? 'unknown' : `${num(estimate.fat_g)} g`}`];
      return {ok: true, plan: {target: 'health', card: {kind: action.kind, title: 'Log a food with an AI estimate', lines: [`${action.meal}: ${action.name} × ${num(action.quantity, 2)} serving${action.quantity === 1 ? '' : 's'}`, `AI estimate per serving: ${nutrientLines.join(', ')}; unknown stays unknown, never 0`, estimate.serving_g === undefined ? `Serving weight not given: recorded as ${serving} g per serving (an AI estimate you can edit in Foods & recipes)` : `Serving ${serving} g`, 'Added to Foods & recipes as "AI estimate" so you can correct it later'], where: 'Health · Diary and Foods & recipes', day: dayLabel(day.day, env.healthDay), estimate: true},
        write: s => ({health: logHealthItem(saveFood(s.health, food), {id: entryId, sourceId: foodId, sourceKind: 'food', date: day.day, meal: action.meal, quantityMilli}, at)}),
        undo: {label: 'Remove this entry and the estimated food', write: s => ({health: removeHealthItem(removeHealthItem(s.health, 'diary', entryId), 'foods', foodId)}), unchanged: (after, current) => same(after.health.diary.find(e => e.id === entryId), current.health.diary.find(e => e.id === entryId)) && same(after.health.foods.find(f => f.id === foodId), current.health.foods.find(f => f.id === foodId))}}};
    }
    case 'log-measurement': {
      const day = resolveDay(action.day, env.healthDay, env.healthDay); if (!day.ok) return refuse(day.message);
      const id = healthId(), observedAt = day.day === env.healthDay ? at : `${day.day}T12:00:00.000Z`;
      const draft = {id, kind: action.kind_of, quantityMilli: Math.round(action.value * 1000), unit: action.unit, observedAt, timezone: env.timeZone, sourceLabel: 'ZIGi · your AI'};
      return {ok: true, plan: {target: 'health', card: {kind: action.kind, title: 'Add a body measurement', lines: [`${action.kind_of}: ${num(action.value, 2)} ${action.unit}`], where: 'Health · Body measurements', day: dayLabel(day.day, env.healthDay), estimate: false},
        write: s => ({health: saveMeasurement(s.health, draft, at)}),
        undo: {label: 'Remove this measurement', write: s => { const rest = (s.health.measurements ?? []).filter(m => m.id !== id); return {health: healthSchema.parse({...s.health, measurements: rest.length ? rest : undefined})}; }, unchanged: (after, current) => same((after.health.measurements ?? []).find(m => m.id === id), (current.health.measurements ?? []).find(m => m.id === id))}}};
    }
    case 'check-in': {
      const found = habitOf(env, action.habit); if (!found.ok) return refuse(found.message);
      const day = resolveDay(action.day, env.habitDay, env.habitDay); if (!day.ok) return refuse(day.message);
      const {habit} = found, rule = latestHabitRule(habit), unit = measurementUnit(rule), value = action.value ?? smartDoneValue(rule), previous = entryOn(stores.habits, habit.id, day.day);
      const partial = rule.type === 'build' && rule.measurement.kind !== 'boolean' && value < rule.target && value > 0;
      return {ok: true, plan: {target: 'habits', card: {kind: action.kind, title: partial ? `Partial check-in: ${habit.title}` : `Check in: ${habit.title}`, lines: [rule.measurement.kind === 'boolean' ? (value >= 1 ? 'Mark as done' : 'Mark as not done') : `Set the day's count to ${value}${unit ? ' ' + unit : ''} (target ${rule.target}${unit ? ' ' + unit : ''})${previous ? `, was ${previous.count}` : ''}`, ...(action.note ? [`Note: ${action.note}`] : [])], where: `Habits · ${habit.title}`, day: dayLabel(day.day, env.habitDay), estimate: false},
        write: s => ({habits: logHabitValue(s.habits, habit.id, day.day, value, {mode: 'set', note: action.note ?? previous?.note ?? ''}, env.now)}),
        undo: {label: previous ? 'Put the previous check-in back' : 'Remove this check-in', write: s => ({habits: restoreEntry(s.habits, habit.id, day.day, previous, env.now)}), unchanged: (after, current) => same(entryOn(after.habits, habit.id, day.day), entryOn(current.habits, habit.id, day.day))}}};
    }
    case 'skip': {
      const found = habitOf(env, action.habit); if (!found.ok) return refuse(found.message);
      const day = resolveDay(action.day, env.habitDay, env.habitDay, true); if (!day.ok) return refuse(day.message);
      const {habit} = found, future = day.day > env.habitDay, previous = entryOn(stores.habits, habit.id, day.day);
      return {ok: true, plan: {target: 'habits', card: {kind: action.kind, title: `${future ? 'Plan a skip' : 'Skip'}: ${habit.title}`, lines: ['A skipped day is neutral: it neither adds to a streak nor breaks it', ...(action.reason ? [`Reason: ${action.reason}`] : [])], where: `Habits · ${habit.title}`, day: dayLabel(day.day, env.habitDay), estimate: false},
        write: s => ({habits: future ? planSkip(s.habits, habit.id, day.day, action.reason ?? '', env.now) : setHabitEntryStatus(s.habits, habit.id, day.day, 'skipped', action.reason ?? '', env.now)}),
        undo: {label: 'Undo the skip', write: s => ({habits: restoreEntry(s.habits, habit.id, day.day, previous, env.now)}), unchanged: (after, current) => same(entryOn(after.habits, habit.id, day.day), entryOn(current.habits, habit.id, day.day))}}};
    }
    case 'create-habit': {
      const id = habitId();
      const measurement = action.measurement === 'done' ? (action.type === 'limit' ? {kind: 'count' as const, unit: 'times'} : {kind: 'boolean' as const}) : action.measurement === 'count' ? {kind: 'count' as const, unit: 'times'} : action.measurement === 'minutes' || action.measurement === 'hours' ? {kind: 'duration' as const, unit: action.measurement} : {kind: 'quantity' as const, unit: action.measurement.unit};
      const target = action.target ?? (action.type === 'quit' ? 0 : measurement.kind === 'boolean' ? 1 : 1);
      const schedule = action.schedule === 'daily' ? {kind: 'daily' as const} : 'weekdays' in action.schedule ? {kind: 'weekdays' as const, days: [...new Set(action.schedule.weekdays)]} : 'timesPerWeek' in action.schedule ? {kind: 'frequency' as const, times: action.schedule.timesPerWeek, period: 'week' as const} : {kind: 'interval' as const, every: action.schedule.everyDays, anchor: env.habitDay};
      const input: HabitInput = {title: action.title, category: action.category ?? 'Personal', description: action.description, notes: '', type: action.type, measurement, schedule, target, targetPeriod: 'day', timeOfDay: action.timeOfDay};
      const parsed = habitInputSchema.safeParse(input); if (!parsed.success) return refuse(`This habit cannot be created as proposed: ${parsed.error.issues[0]?.message ?? 'check its target and measurement'}.`);
      const unit = measurement.kind === 'boolean' ? '' : ` ${measurement.unit}`;
      const scheduleText = schedule.kind === 'daily' ? 'daily' : schedule.kind === 'weekdays' ? `on weekdays ${schedule.days.join(', ')} (0 = Sunday)` : schedule.kind === 'frequency' ? `${schedule.times} times a week` : `every ${schedule.every} days`;
      return {ok: true, plan: {target: 'habits', card: {kind: action.kind, title: `Create the habit "${action.title}"`, lines: [`${action.type} · ${measurement.kind === 'boolean' ? 'done or not' : `target ${target}${unit} a day`} · ${scheduleText} · ${action.timeOfDay}`, ...(action.description ? [action.description] : []), 'Starts today; you can edit everything in Habits'], where: 'Habits', day: null, estimate: false},
        write: s => ({habits: createHabit(s.habits, input, env.now, id)}),
        undo: {label: 'Remove this habit', write: s => ({habits: habitDataSchema.parse({...s.habits, habits: s.habits.habits.filter(h => h.id !== id)})}), unchanged: (after, current) => same(after.habits.habits.find(h => h.id === id), current.habits.habits.find(h => h.id === id))}}};
    }
    case 'start-fast': {
      if (runningSession(applyAutoStop(stores.fasting, env.now))) return refuse('A fast is already running; stop it first.');
      const id = `fast_${healthId().slice(7)}`, preset = FASTING_PRESETS.find(p => p.hours === action.targetHours);
      return {ok: true, plan: {target: 'fasting', card: {kind: action.kind, title: 'Start a fast', lines: [`Target ${action.targetHours} h${preset ? ` (${preset.label})` : ` (custom, up to ${MAX_CUSTOM_HOURS} h)`}`, 'Stops by itself at 24 h; stop it any time from Health'], where: 'Health · Fasting timer', day: null, estimate: false, safety: HE6_NOTE},
        write: s => ({fasting: startFast(applyAutoStop(s.fasting, env.now), {id, now: env.now, targetHours: action.targetHours, timeZone: env.timeZone})}),
        undo: {label: 'Discard this fast', write: s => ({fasting: removeFast(s.fasting, id)}), unchanged: (after, current) => same(after.fasting.sessions.find(f => f.id === id), current.fasting.sessions.find(f => f.id === id))}}};
    }
    case 'stop-fast': {
      const running = runningSession(applyAutoStop(stores.fasting, env.now)); if (!running) return refuse('No fast is running right now.');
      return {ok: true, plan: {target: 'fasting', card: {kind: action.kind, title: 'Stop the running fast', lines: [`Started ${running.startedAt.slice(0, 16).replace('T', ' ')} · target ${running.targetHours} h`], where: 'Health · Fasting timer', day: null, estimate: false, safety: HE6_NOTE},
        write: s => ({fasting: stopFast(applyAutoStop(s.fasting, env.now), running.id, env.now, 'person')}),
        undo: {label: 'Resume the fast', write: s => ({fasting: fastingSchema.parse({...s.fasting, sessions: s.fasting.sessions.map(f => f.id === running.id ? {...f, endedAt: null, stoppedBy: undefined} : f)})}), unchanged: (after, current) => same(after.fasting.sessions.find(f => f.id === running.id), current.fasting.sessions.find(f => f.id === running.id))}}};
    }
    case 'create-goal': {
      const decimals = ['USD', 'EUR'].includes(action.currency) ? 2 : 18;
      let target: string; try { target = parseAmountInput(String(action.target), decimals).toString(); } catch { return refuse('The target amount could not be read.'); }
      const id = String(Array.from({length: stores.platform.goals.length + 1}, (_, i) => String(i)).find(candidate => !stores.platform.goals.some(g => g.id === candidate)));
      const denom = action.type === 'VALUE' ? action.currency : action.currency === 'ZIG' ? 'azig' : `manual:${action.currency}`;
      const draft = privateGoalSchema.safeParse({id, name: action.name, category: action.category, network: 'zigchain-1', type: action.type, status: 'active', asset: action.currency, denom, decimals, target, notes: action.notes, createdAt: at, targetDate: action.targetDate, milestones: []});
      if (!draft.success) return refuse(`This goal cannot be created as proposed: ${draft.error.issues[0]?.message ?? 'check its fields'}.`);
      const goal = draft.data;
      return {ok: true, plan: {target: 'platform', card: {kind: action.kind, title: `Create the goal "${action.name}"`, lines: [`${action.type === 'VALUE' ? 'Value goal' : 'Quantity goal'} · target ${action.target.toLocaleString('en-US')} ${action.currency}${action.targetDate ? ` by ${action.targetDate}` : ''}${action.category ? ` · ${action.category}` : ''}`, ...(action.notes ? [`Notes: ${action.notes}`] : []), 'A draft without a plan or funding: nothing moves; you shape it in Goals'], where: 'Goals', day: null, estimate: false},
        write: s => { if (s.platform.goals.some(g => g.id === id)) throw Error('Another goal took this place meanwhile. Ask ZIGi again.'); return {platform: platformSchema.parse({...s.platform, goals: [...s.platform.goals, goal]})}; },
        undo: {label: 'Remove this goal draft', write: s => ({platform: deletePrivateGoal(s.platform, id)}), unchanged: (after, current) => same(after.platform.goals.find(g => g.id === id), current.platform.goals.find(g => g.id === id))}}};
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
        undo: {label: 'Remove the note', write: s => ({platform: platformSchema.parse({...s.platform, goals: s.platform.goals.map(g => g.id === goal.id ? {...g, notes: previous} : g)})}), unchanged: (after, current) => same(after.platform.goals.find(g => g.id === goal.id)?.notes, current.platform.goals.find(g => g.id === goal.id)?.notes)}}};
    }
    case 'prefill-holding': {
      const quantity = typeof action.quantity === 'number' ? num(action.quantity, 8) : action.quantity;
      const prefill: HoldingPrefill = {category: action.category, name: action.name, quantity, currency: action.currency, value: action.value === undefined ? undefined : num(action.value, 2), symbol: action.symbol, notes: action.notes};
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: 'Pre-fill the add-asset form', lines: [`${action.category} · ${action.name}${action.symbol ? ` (${action.symbol})` : ''} · quantity ${quantity}${action.value !== undefined ? ` · value ${num(action.value, 2)} ${action.currency}` : ` · ${action.currency}`}`, 'Nothing is saved here: the form opens in Wealth with these values and you review and save it yourself'], where: 'Wealth · Add asset', day: null, estimate: false}, write: () => ({}), undo: null, prefill}};
    }
  }
}
/** Applies a plan's write to the stores and returns the whole next set (only the touched store changes). */
export function applyPlan(plan: Plan, current: Stores): Stores { return {...current, ...plan.write(current)}; }
