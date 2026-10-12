import {habitDataSchema, habitRuleOn, latestHabitRule, logHabitValue, type Habit, type HabitData} from '../../habits';
import {finishHabitTimer, startHabitTimer, discardHabitTimer, habitTimerPreview} from '../../habit-timer-actions';
import {HABIT_EXTRAS} from '../../habits-extras/schema';
import {DEFAULT_AREA_IDS} from '../../habits-extras/areas-mirror';
import {applyFreeze, freezesAvailable, repairableDays} from '../../game/freeze';
import {routineOf, routines} from '../../routines/engine';
import {createRoutineFromTemplate, ROUTINE_TEMPLATES} from '../../routines/templates';
import {MICRO_TARGETS, DEFAULT_MICRO_TARGETS, type MicroKey} from '../../health-aa/micro';
import {MACRO_MODE, KETO_SPLIT} from '../../health-aa/macro-mode';
import {HEALTH_COACH} from '../../health-aa/coach-schema';
import {coachCheckIn} from '../../health-aa/coach';
import {parseRecipeText} from '../../health-aa/recipe-text';
import {newHealthId, saveFood, saveRecipe, setHealthTargets} from '../../health';
import {GAME} from '../../game/schema';
import {additionalNutrients} from '../../health';
import type {Action} from './schema';
import type {Env, PlanResult, Stores} from './plan';

/**
 * Session AA-Local Part 5 (ADR-022 B37): the planner's cases for this session's kinds, in their own module so
 * `plan.ts` gains one delegating line per kind. Journal writes go through the pages' own mutators with an exact Undo;
 * device-record changes travel as `device: {key, patch, label}` for the runner (`lib/ai/actions/device-writes.ts`),
 * with no Undo (the card says where to change it back); a routine is a navigation effect to the player.
 */
export type AaHelpers = {refuse: (message: string) => PlanResult; same: (a: unknown, b: unknown) => boolean; resolveDay: (day: string, base: string, today: string, allowFuture?: boolean) => {ok: true; day: string} | {ok: false; message: string}; dayLabel: (day: string, today: string) => string; habitOf: (env: Env, named: string) => {ok: true; habit: Habit} | {ok: false; message: string}};
const MICRO_KEY: Record<string, MicroKey> = {fiber: 'fiberMg', sugar: 'sugarMg', 'saturated-fat': 'saturatedFatMg', sodium: 'sodiumMg', potassium: 'potassiumMg', calcium: 'calciumMg', iron: 'ironMg'};
const replaceHabit = (data: HabitData, id: string, next: Habit): HabitData => habitDataSchema.parse({...data, habits: data.habits.map(h => h.id === id ? next : h)});
export function planAaAction(action: Action, env: Env, h: AaHelpers): PlanResult | null {
  const {stores} = env, at = env.now.toISOString();
  switch (action.kind) {
    case 'set-time-of-day': {
      const found = h.habitOf(env, action.habit); if (!found.ok) return h.refuse(found.message);
      const habit = found.habit, before = habit.timeOfDay;
      if (before === action.timeOfDay) return h.refuse(`${habit.title} is already in the ${action.timeOfDay} section.`);
      const mine = (s: Stores) => s.habits.habits.find(x => x.id === habit.id);
      return {ok: true, plan: {target: 'habits', card: {kind: action.kind, title: `Move ${habit.title} to ${action.timeOfDay}`, lines: [`${before} → ${action.timeOfDay}`, 'The habit keeps its schedule and history; only its place on the page changes'], where: `Habits · ${habit.title}`, day: null, estimate: false},
        write: s => { const cur = mine(s); return cur ? {habits: replaceHabit(s.habits, habit.id, {...cur, timeOfDay: action.timeOfDay, updatedAt: at})} : {}; },
        undo: {label: `Put ${habit.title} back to ${before}`, write: s => { const cur = mine(s); return cur ? {habits: replaceHabit(s.habits, habit.id, {...cur, timeOfDay: before, updatedAt: env.now.toISOString()})} : {}; }, unchanged: (after, cur) => mine(after)?.timeOfDay === mine(cur)?.timeOfDay},
        activity: {id: `time-of-day:${habit.id}:${action.timeOfDay}:${at}`, title: `${habit.title}: ${action.timeOfDay}`}}};
    }
    case 'start-timer': {
      const found = h.habitOf(env, action.habit); if (!found.ok) return h.refuse(found.message);
      const habit = found.habit, rule = habitRuleOn(habit, env.habitDay);
      if (!rule || rule.measurement.kind !== 'duration') return h.refuse(`${habit.title} is not a duration habit; a timer counts minutes or hours.`);
      if (habit.timer) return h.refuse(`A timer is already ${habit.timer.state} on ${habit.title}; stop it first.`);
      const timerId = crypto.randomUUID();
      return {ok: true, plan: {target: 'habits', card: {kind: action.kind, title: `Start the timer: ${habit.title}`, lines: ['Counts from now, kept across pages and reloads', `Target ${rule.target} ${rule.measurement.unit}`], where: `Habits · ${habit.title}`, day: h.dayLabel(env.habitDay, env.habitDay), estimate: false},
        write: s => ({habits: startHabitTimer(s.habits, habit.id, timerId, env.now, env.timeZone)}),
        undo: {label: 'Discard the timer', write: s => ({habits: s.habits.habits.find(x => x.id === habit.id)?.timer?.id === timerId ? discardHabitTimer(s.habits, habit.id, timerId, env.now) : s.habits}), unchanged: (after, cur) => h.same(after.habits.habits.find(x => x.id === habit.id)?.timer, cur.habits.habits.find(x => x.id === habit.id)?.timer)},
        activity: {id: `timer:${habit.id}:${timerId}`, title: `Timer started: ${habit.title}`}}};
    }
    case 'stop-timer': {
      const found = h.habitOf(env, action.habit); if (!found.ok) return h.refuse(found.message);
      const habit = found.habit, timer = habit.timer;
      if (!timer) return h.refuse(`No timer is running on ${habit.title}.`);
      const preview = habitTimerPreview(habit, env.now), log = action.log !== false;
      if (log && preview.reviewReason) return h.refuse(`${preview.reviewReason} Review the timer on Habits.`);
      let before: Habit | undefined;
      return {ok: true, plan: {target: 'habits', card: {kind: action.kind, title: `${log ? 'Finish' : 'Discard'} the timer: ${habit.title}`, lines: [`${Math.round(preview.value * 10) / 10} ${timer.unit} so far`, log ? 'Logged into today’s check-in' : 'Stopped without logging'], where: `Habits · ${habit.title}`, day: h.dayLabel(timer.date, env.habitDay), estimate: false},
        write: s => { before = s.habits.habits.find(x => x.id === habit.id); return {habits: log ? finishHabitTimer(s.habits, habit.id, timer.id, env.now) : discardHabitTimer(s.habits, habit.id, timer.id, env.now)}; },
        undo: {label: 'Put the timer back', write: s => before ? {habits: replaceHabit(s.habits, habit.id, before)} : {}, unchanged: (after, cur) => h.same(after.habits.habits.find(x => x.id === habit.id), cur.habits.habits.find(x => x.id === habit.id))},
        activity: {id: `timer-stop:${habit.id}:${timer.id}`, title: `${log ? 'Timer logged' : 'Timer discarded'}: ${habit.title}`}}};
    }
    case 'start-routine': {
      if (action.template) {
        const template = ROUTINE_TEMPLATES.find(t => t.id === action.template)!;
        const headId = crypto.randomUUID();
        let created: string[] = [];
        return {ok: true, plan: {target: 'habits', card: {kind: action.kind, title: `Add the ${template.title.toLowerCase()}`, lines: [template.steps.map(s => s.title).join(' → '), 'Habits you already have are reused; then open Habits → Routines → Start'], where: 'Habits · Routines', day: null, estimate: false},
          write: s => { let first = true; const made = createRoutineFromTemplate(s.habits, template, env.now, () => { const id = first ? headId : crypto.randomUUID(); first = false; return id; }); created = made.created; return {habits: made.data}; },
          undo: {label: 'Remove the habits it added', write: s => ({habits: habitDataSchema.parse({...s.habits, habits: s.habits.habits.filter(x => !created.includes(x.id)).map(x => created.includes(x.stackAfterId ?? '') ? {...x, stackAfterId: undefined} : x)})}), unchanged: (after, cur) => h.same(after.habits.habits.map(x => x.id), cur.habits.habits.map(x => x.id))},
          navigate: {href: '/app/habits', label: 'Habits · Routines'}, activity: {id: `routine-template:${template.id}:${at}`, title: `Routine added: ${template.title}`}}};
      }
      const found = h.habitOf(env, action.habit!); if (!found.ok) return h.refuse(found.message);
      const head = routines(stores.habits).find(r => r.habits.some(x => x.id === found.habit.id));
      if (!head) return h.refuse(`${found.habit.title} is not part of a stack; stack habits in the editor or add a routine template first.`);
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `Start ${head.title}`, lines: [head.habits.map(x => x.title).join(' → '), 'Opens the player on Habits: one step at a time'], where: 'Habits · Routines', day: h.dayLabel(env.habitDay, env.habitDay), estimate: false}, write: () => ({}), undo: null, navigate: {href: `/app/habits#routine=${encodeURIComponent(head.headId)}`, label: head.title}}};
    }
    case 'set-habit-area': {
      const found = h.habitOf(env, action.habit); if (!found.ok) return h.refuse(found.message);
      const area = action.area; if (area !== null && !(DEFAULT_AREA_IDS as readonly string[]).includes(area)) return h.refuse(`Areas are ${DEFAULT_AREA_IDS.join(', ')} (or a custom area made in Goals).`);
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: area ? `${found.habit.title} → ${area}` : `Remove ${found.habit.title}'s area`, lines: ['The life area it is filed under, on this device; the same areas as Goals', 'Change it back from the habit card'], where: `Habits · ${found.habit.title}`, day: null, estimate: false}, write: () => ({}), undo: null, device: {key: HABIT_EXTRAS.key, patch: {area: {habitId: found.habit.id, areaId: area}}, label: area ? `${found.habit.title} filed under ${area}` : 'Area removed'}}};
    }
    case 'set-quit-cost': {
      const found = h.habitOf(env, action.habit); if (!found.ok) return h.refuse(found.message);
      if (latestHabitRule(found.habit).type !== 'quit') return h.refuse(`${found.habit.title} is not a quit habit; the money-saved estimate is for those.`);
      const clear = action.perDay === null, currency = action.currency ?? 'EUR';
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: clear ? `Remove the cost on ${found.habit.title}` : `${found.habit.title}: ${action.perDay} ${currency} a day`, lines: [clear ? 'The money-saved estimate stops' : 'An estimate: your own figure times the days since; nothing is read from your accounts', 'On this device; change it on the habit card'], where: `Habits · ${found.habit.title}`, day: null, estimate: true}, write: () => ({}), undo: null, device: {key: HABIT_EXTRAS.key, patch: {quitCost: clear ? {habitId: found.habit.id, clear: true} : {habitId: found.habit.id, perDay: action.perDay!, currency}}, label: clear ? 'Cost removed' : `Cost set: ${action.perDay} ${currency} a day`}}};
    }
    case 'use-freeze': {
      const found = h.habitOf(env, action.habit); if (!found.ok) return h.refuse(found.message);
      const day = h.resolveDay(action.day, env.habitDay, env.habitDay); if (!day.ok) return h.refuse(day.message);
      if (freezesAvailable(stores.habits, env.habitDay) <= 0) return h.refuse('No freeze to use yet: a seven-day streak on any habit earns one.');
      if (!repairableDays(stores.habits, env.habitDay).some(r => r.habitId === found.habit.id && r.date === day.day)) return h.refuse(`${day.day} is not a missed day of the last week on ${found.habit.title}.`);
      const prev = found.habit.entries.find(e => e.date === day.day);
      return {ok: true, plan: {target: 'habits', card: {kind: action.kind, title: `Freeze ${found.habit.title} on ${h.dayLabel(day.day, env.habitDay)}`, lines: ['The missed day becomes a rest day; the streak is whole again', `${freezesAvailable(stores.habits, env.habitDay)} freeze${freezesAvailable(stores.habits, env.habitDay) === 1 ? '' : 's'} in hand`], where: 'Journey · Freezes', day: h.dayLabel(day.day, env.habitDay), estimate: false},
        write: s => ({habits: applyFreeze(s.habits, found.habit.id, day.day, env.habitDay, env.now)}),
        undo: {label: 'Take the freeze back', write: s => ({habits: habitDataSchema.parse({...s.habits, habits: s.habits.habits.map(x => x.id === found.habit.id ? {...x, entries: prev ? x.entries.map(e => e.date === day.day ? prev : e) : x.entries.filter(e => e.date !== day.day), updatedAt: env.now.toISOString()} : x)})}), unchanged: (after, cur) => h.same(after.habits.habits.find(x => x.id === found.habit.id)?.entries, cur.habits.habits.find(x => x.id === found.habit.id)?.entries)},
        activity: {id: `freeze:${found.habit.id}:${day.day}`, title: `Streak freeze: ${found.habit.title}, ${day.day}`}}};
    }
    case 'set-micro-target': {
      const key = MICRO_KEY[action.nutrient]!, [, label, unit, scale] = additionalNutrients.find(([k]) => k === key)!;
      const mg = action.value === null ? null : Math.round(action.value * (action.unit ? (action.unit === 'g' ? 1000 : 1) : scale));
      if (mg !== null && mg <= 0) return h.refuse('A target above zero, or null for the default.');
      const shown = mg === null ? `the default (${DEFAULT_MICRO_TARGETS[key] / scale} ${unit})` : `${mg / scale} ${unit}`;
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `${label}: ${shown} a day`, lines: ['A reference value you set, not advice; unknown stays unknown', 'On this device; edit it under Health → Targets'], where: 'Health · Targets · Micronutrients', day: null, estimate: true}, write: () => ({}), undo: null, device: {key: MICRO_TARGETS.key, patch: {target: {nutrient: key, mg}}, label: `${label} target: ${shown}`}}};
    }
    case 'set-macro-mode': {
      const split = action.mode === 'custom' ? {fat: action.fat ?? 30, protein: action.protein ?? 30, carbs: action.carbs ?? 40} : action.mode === 'keto' ? KETO_SPLIT : undefined;
      if (split && split.fat + split.protein + split.carbs !== 100) return h.refuse('A custom split adds up to 100 %.');
      const words = {standard: 'Standard macros', 'net-carbs': 'Net carbs (carbs minus fiber)', keto: 'Keto view (70 / 25 / 5)', custom: `Custom split ${split?.fat} / ${split?.protein} / ${split?.carbs}`}[action.mode];
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: words, lines: ['How your macros are shown; the targets themselves never change', 'On this device; under Health → Targets'], where: 'Health · Targets · Macro mode', day: null, estimate: false}, write: () => ({}), undo: null, device: {key: MACRO_MODE.key, patch: {mode: action.mode, ...(split && action.mode === 'custom' ? {split} : {})}, label: words}}};
    }
    case 'coach-answer': {
      const c = coachCheckIn(stores.health, {version: 1}, env.healthDay, env.weightUnit);
      if (c.rateGrams === null) return h.refuse('The coach needs two weight readings in the last week before it can ask.');
      const kcal = action.answer === 'adjust' ? action.kcal ?? c.suggestion?.kcal ?? null : null;
      if (action.answer === 'adjust' && kcal === null) return h.refuse('No suggested target yet: the energy estimate needs about two weeks of logs; give a figure, or keep the target.');
      const record = {key: HEALTH_COACH.key, patch: {answer: {weekStart: c.weekStart, answer: action.answer, ...(kcal ? {kcal} : {}), at}}, label: action.answer === 'keep' ? 'Target kept this week' : `Target adjusted to ${kcal} kcal`};
      if (action.answer === 'keep') return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: 'Keep my calorie target', lines: [c.sentence, 'Recorded for this week on this device'], where: 'Health · Your coach', day: h.dayLabel(env.healthDay, env.healthDay), estimate: true}, write: () => ({}), undo: null, device: record}};
      const before = stores.health.targets.kcal;
      return {ok: true, plan: {target: 'health', card: {kind: action.kind, title: `Adjust my calorie target to ${kcal} kcal`, lines: [c.sentence, before !== null ? `Now ${before} kcal a day` : 'No target yet', 'An estimate, not medical advice'], where: 'Health · Your coach', day: h.dayLabel(env.healthDay, env.healthDay), estimate: true},
        write: s => ({health: setHealthTargets(s.health, {...s.health.targets, kcal})}),
        undo: {label: before !== null ? `Back to ${before} kcal` : 'Clear the target again', write: s => ({health: setHealthTargets(s.health, {...s.health.targets, kcal: before})}), unchanged: (after, cur) => after.health.targets.kcal === cur.health.targets.kcal},
        device: record, activity: {id: `coach:${c.weekStart}:${at}`, title: `Calorie target adjusted to ${kcal}`}}};
    }
    case 'import-recipe': {
      const parsed = parseRecipeText(action.text); if (!parsed.ingredients.length) return h.refuse('No ingredient lines were found in that text; a line looks like "200 g red lentils".');
      const name = (action.name ?? parsed.title).slice(0, 80) || 'Imported recipe', portions = action.servings ?? parsed.servings ?? 4;
      const recipeId = env.newHealthId ? env.newHealthId() : newHealthId();
      const created: string[] = [];
      return {ok: true, plan: {target: 'health', card: {kind: action.kind, title: `Import "${name}"`, lines: [`${parsed.ingredients.length} ingredients, ${portions} servings`, parsed.ingredients.slice(0, 4).map(i => i.name).join(', ') + (parsed.ingredients.length > 4 ? ', …' : ''), 'New foods start with unknown nutrition; an existing food of the same name is reused'], where: 'Health · Foods & recipes', day: null, estimate: false},
        write: s => { let next = s.health; const items = parsed.ingredients.map(i => { const existing = next.foods.find(f => f.name.toLowerCase() === i.name.toLowerCase()); const grams = i.grams ?? existing?.servingGrams ?? 100; let foodId = existing?.id; if (!foodId) { foodId = env.newHealthId ? env.newHealthId() : newHealthId(); next = saveFood(next, {id: foodId, name: i.name.slice(0, 80), brand: 'Imported recipe', servingGrams: grams, nutrients: {kcal: null, proteinMg: null, carbsMg: null, fatMg: null}, createdAt: at, updatedAt: at}); created.push(foodId); } const food = next.foods.find(f => f.id === foodId)!; return {foodId, quantityMilli: food.servingGrams ? Math.max(1, Math.round(grams / food.servingGrams * 1000)) : 1000}; }); next = saveRecipe(next, {id: recipeId, name, portionsMilli: Math.round(portions * 1000), items}, at); return {health: next}; },
        undo: {label: 'Remove the recipe and its new foods', write: s => ({health: {...s.health, recipes: s.health.recipes.filter(r => r.id !== recipeId), foods: s.health.foods.filter(f => !created.includes(f.id))}}), unchanged: (after, cur) => h.same(after.health.recipes.map(r => r.id), cur.health.recipes.map(r => r.id))},
        activity: {id: `recipe-import:${recipeId}`, title: `Recipe imported: ${name}`}}};
    }
    case 'set-game-layer': {
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: action.enabled ? 'Turn the game layer on' : 'Turn the game layer off', lines: [action.enabled ? 'Levels, quests and badges from your own records, on Journey' : 'Journey and the cards step aside; nothing of yours is lost', 'On this device; the switch is under Your pages & buttons'], where: 'Settings · Your pages & buttons', day: null, estimate: false}, write: () => ({}), undo: null, device: {key: GAME.key, patch: {enabled: action.enabled}, label: action.enabled ? 'Game layer on' : 'Game layer off'}}};
    }
    default: return null;
  }
}
/** The habit's own `logHabitValue` with a note or mood (check-in cards of this session); shared with plan.ts. */
export const withNoteAndMood = (data: HabitData, id: string, date: string, value: number, note?: string, mood?: Habit['entries'][number]['mood'], now?: Date) => logHabitValue(data, id, date, value, {note, mood}, now);
export {routineOf};
