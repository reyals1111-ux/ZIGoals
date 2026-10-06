import {z} from 'zod';
import {measurementGroups, measurementHistory} from '../../body-measurements';
import type {BodyMeasurement} from '../../body-measurement-schema';
import {elapsedMs, fastingHistory, formatFast, runningSession} from '../../fasting/engine';
import {HEALTH_MEALS, recipeNutrition, recipeServingGrams, recipeServingMl, scaleNutrition, searchFoods, type HealthData, type Nutrition} from '../../health';
import {countOn, exerciseData} from '../../health-counters';
import {dailyData, groceryList, healthDay as healthDayOf, waterSummary} from '../../health-daily';
import {HE6_NOTE} from '../actions/plan';
import type {ToolEnv} from './env';
import {capRows, HEALTH_CLOSED, num, ok, plural, provenance, refuse, text} from './format';
import {eachDay, parseRange, type DayRange} from './range';
import {matchByName, tokens} from './subjects';
import type {ToolDefinition, ToolRefusal} from './types';

/**
 * Health tools (Session V Part 2): the person's own Health journal, only through the three-part Health gate. Each tool
 * first asks for `env.health`, which is null whenever the gate is closed for this purpose, and then refuses with the
 * same plain sentence without reading anything. Days are the Health journal's own days (`healthDay`, in the journal's
 * zone). A value the journal does not know stays unknown ("x of y entries known"), never 0. Nothing here judges a value:
 * no advice, no targets suggested; the person's own targets are compared only when they set them. Fasting is a list of
 * fasts, nothing more (HE6 and P5: no totals, no streaks, no longest fast), with HE6's safety note.
 */
type Gated = {ok: true; health: HealthData} | ToolRefusal;
function gated(env: ToolEnv, tool: string, label: string): Gated {
  return env.health && env.areas.health ? {ok: true, health: env.health} : refuse(tool, label, 'gate', HEALTH_CLOSED);
}
function rangeFor(env: ToolEnv, raw: string | undefined, fallback: string, tool: string, label: string, future = false): DayRange | ToolRefusal {
  const range = parseRange(raw?.trim() || fallback, env.healthDay, {future});
  return range.ok ? {from: range.from, to: range.to, label: range.label} : refuse(tool, label, 'range', range.message);
}
const isRefusal = (value: unknown): value is ToolRefusal => typeof value === 'object' && value !== null && (value as {ok?: unknown}).ok === false;
const where = (env: ToolEnv, subject: string | null, range: DayRange | null) => provenance(env, 'Health journal', subject, range, env.healthZone);
const rangeArg = z.string().trim().max(80).optional();
const RANGE = (fallback: string) => ({type: 'string', description: `A period such as "today", "yesterday", "this week", "last month", "the last 14 days", "since 2026-09-01" or "2026-09-01..2026-09-15". Default: ${fallback}.`} as const);
const grams = (mg: number | null | undefined) => typeof mg === 'number' ? num(mg / 1000, 1) : 'unknown';

/** Nutrients by the names people use; `scale` turns the stored value into the unit shown. */
export const NUTRIENTS = {
  kcal: {key: 'kcal', label: 'energy', unit: 'kcal', scale: 1}, protein: {key: 'proteinMg', label: 'protein', unit: 'g', scale: 1000},
  carbs: {key: 'carbsMg', label: 'carbohydrates', unit: 'g', scale: 1000}, fat: {key: 'fatMg', label: 'fat', unit: 'g', scale: 1000},
  fiber: {key: 'fiberMg', label: 'fiber', unit: 'g', scale: 1000}, sugar: {key: 'sugarMg', label: 'sugars', unit: 'g', scale: 1000},
  saturated_fat: {key: 'saturatedFatMg', label: 'saturated fat', unit: 'g', scale: 1000}, sodium: {key: 'sodiumMg', label: 'sodium', unit: 'mg', scale: 1},
  potassium: {key: 'potassiumMg', label: 'potassium', unit: 'mg', scale: 1}, calcium: {key: 'calciumMg', label: 'calcium', unit: 'mg', scale: 1},
  iron: {key: 'ironMg', label: 'iron', unit: 'mg', scale: 1},
} as const satisfies Record<string, {key: keyof Nutrition; label: string; unit: string; scale: number}>;
export type NutrientName = keyof typeof NUTRIENTS;
const NUTRIENT_NAMES = Object.keys(NUTRIENTS) as NutrientName[];
const TARGET_KEY: Partial<Record<NutrientName, 'kcal' | 'proteinMg' | 'carbsMg' | 'fatMg'>> = {kcal: 'kcal', protein: 'proteinMg', carbs: 'carbsMg', fat: 'fatMg'};
export type NutrientTotal = {value: number | null; known: number; total: number; knownValue: number | null};
/** One nutrient over some entries: the total only when every entry knows it; otherwise the known part and the coverage. */
export function nutrientTotal(values: readonly Nutrition[], name: NutrientName): NutrientTotal {
  const key = NUTRIENTS[name].key, known = values.flatMap(v => typeof v[key] === 'number' ? [v[key] as number] : []);
  const sum = known.reduce((s, n) => s + n, 0);
  return {value: known.length === values.length && values.length > 0 ? sum : values.length === 0 ? 0 : null, known: known.length, total: values.length, knownValue: known.length ? sum : null};
}
export function nutrientText(total: NutrientTotal, name: NutrientName): string {
  const {unit, scale} = NUTRIENTS[name];
  if (total.total === 0) return 'no entries';
  if (total.value !== null) return `${num(total.value / scale, unit === 'g' ? 1 : 0)} ${unit}`;
  return `unknown (${total.knownValue === null ? 'no entry' : `${num(total.knownValue / scale, unit === 'g' ? 1 : 0)} ${unit} known`}; ${total.known} of ${total.total} entries known)`;
}
const entryNutrition = (health: HealthData, from: string, to: string) => health.diary.filter(e => e.date >= from && e.date <= to).map(e => ({entry: e, nutrition: scaleNutrition(e.snapshot.nutrients, e.quantityMilli)}));

export const diaryEntries: ToolDefinition<{range?: string; meal?: (typeof HEALTH_MEALS)[number]}> = {
  name: 'diary_entries', title: 'Food diary', area: 'health',
  description: 'The food diary entries for a period: date, meal, food or recipe, servings and energy, protein, carbohydrates and fat per entry (unknown when the food does not say).',
  parameters: {type: 'object', properties: {range: RANGE('today'), meal: {type: 'string', enum: HEALTH_MEALS, description: 'Only this meal.'}}},
  args: z.object({range: rangeArg, meal: z.enum(HEALTH_MEALS).optional()}),
  label: args => `Food diary · ${args.range?.trim() || 'today'}${args.meal ? ` · ${args.meal}` : ''}`,
  run(args, env, label) {
    const g = gated(env, 'diary_entries', label); if (!g.ok) return g;
    const range = rangeFor(env, args.range, 'today', 'diary_entries', label); if (isRefusal(range)) return range;
    const rows = entryNutrition(g.health, range.from, range.to).filter(r => !args.meal || r.entry.meal === args.meal)
      .sort((a, b) => a.entry.date.localeCompare(b.entry.date) || HEALTH_MEALS.indexOf(a.entry.meal) - HEALTH_MEALS.indexOf(b.entry.meal))
      .map(({entry, nutrition}) => ({date: entry.date, meal: entry.meal, item: text(entry.snapshot.name), handle: env.handles.add(entry.sourceKind === 'food' ? 'food' : 'recipe', entry.sourceId, entry.snapshot.name), servings: num(entry.quantityMilli / 1000, 2), kcal: nutrition.kcal ?? 'unknown', protein_g: grams(nutrition.proteinMg), carbs_g: grams(nutrition.carbsMg), fat_g: grams(nutrition.fatMg)}));
    const capped = capRows(rows, env);
    return ok('diary_entries', label, where(env, args.meal ?? null, range), {entries: capped.rows, count: rows.length, ...(rows.length ? {} : {note: 'No diary entries in this period.'})}, capped.truncated);
  },
};

export const nutrientTotals: ToolDefinition<{range?: string; nutrient?: NutrientName}> = {
  name: 'nutrient_totals', title: 'Nutrients', area: 'health',
  description: 'Totals of energy and nutrients from the food diary for a period, per day and overall, with how many entries know each value, and the person\'s own daily targets when they set one. Unknown values stay unknown.',
  parameters: {type: 'object', properties: {range: RANGE('today'), nutrient: {type: 'string', enum: NUTRIENT_NAMES, description: 'One nutrient to focus on (default: energy, protein, carbohydrates and fat).'}}},
  args: z.object({range: rangeArg, nutrient: z.enum(NUTRIENT_NAMES as [NutrientName, ...NutrientName[]]).optional()}),
  label: args => `${args.nutrient ? NUTRIENTS[args.nutrient].label[0]!.toUpperCase() + NUTRIENTS[args.nutrient].label.slice(1) : 'Nutrients'} · ${args.range?.trim() || 'today'}`,
  run(args, env, label) {
    const g = gated(env, 'nutrient_totals', label); if (!g.ok) return g;
    const range = rangeFor(env, args.range, 'today', 'nutrient_totals', label); if (isRefusal(range)) return range;
    const names: NutrientName[] = args.nutrient ? [args.nutrient] : ['kcal', 'protein', 'carbs', 'fat'];
    const all = entryNutrition(g.health, range.from, range.to), targets = g.health.targets;
    const days = eachDay(range.from, range.to).map(date => {
      const values = all.filter(r => r.entry.date === date).map(r => r.nutrition);
      const row: Record<string, unknown> = {date, entries: values.length};
      for (const name of names) {
        const total = nutrientTotal(values, name), targetKey = TARGET_KEY[name], target = targetKey ? targets[targetKey] : null;
        row[name] = nutrientText(total, name);
        if (target !== null && target !== undefined && values.length) row[`${name}_vs_your_target`] = total.value === null ? 'unknown: some entries do not say' : total.value >= target ? 'at or above your target' : 'below your target';
      }
      return row;
    }).filter(row => row.entries !== 0);
    const overall = Object.fromEntries(names.map(name => [name, nutrientText(nutrientTotal(all.map(r => r.nutrition), name), name)]));
    const yourTargets = Object.fromEntries(names.flatMap(name => { const k = TARGET_KEY[name], t = k ? targets[k] : null; return t === null || t === undefined ? [] : [[name, `${num(t / NUTRIENTS[name].scale, 1)} ${NUTRIENTS[name].unit} a day`]]; }));
    const capped = capRows(days, env);
    return ok('nutrient_totals', label, where(env, null, range), {overall, entries: all.length, daysWithEntries: days.length, daysInRange: eachDay(range.from, range.to).length, perDay: capped.rows, yourTargets: Object.keys(yourTargets).length ? yourTargets : 'none set', ...(all.length ? {} : {note: 'No diary entries in this period.'})}, capped.truncated);
  },
};

export const water: ToolDefinition<{range?: string}> = {
  name: 'water', title: 'Water', area: 'health',
  description: 'Water logged per day for a period (millilitres, and US fl oz when that is the person\'s unit), the total, days with water and the person\'s own daily target when set.',
  parameters: {type: 'object', properties: {range: RANGE('today')}},
  args: z.object({range: rangeArg}),
  label: args => `Water · ${args.range?.trim() || 'today'}`,
  run(args, env, label) {
    const g = gated(env, 'water', label); if (!g.ok) return g;
    const range = rangeFor(env, args.range, 'today', 'water', label); if (isRefusal(range)) return range;
    const prefs = dailyData(g.health).preferences, flOz = prefs.waterUnit === 'fl-oz-us';
    const days = eachDay(range.from, range.to).map(date => ({date, ...waterSummary(g.health, date)}));
    const logged = days.filter(d => d.entries > 0), total = logged.reduce((s, d) => s + d.millilitres, 0), target = prefs.waterTargetMl;
    const rows = logged.map(d => ({date: d.date, ml: num(d.millilitres, 0), ...(flOz ? {fl_oz: num(d.millilitres / 29.5735295625, 1)} : {}), entries: d.entries, ...(target ? {vs_your_target: d.millilitres >= target ? 'at or above your target' : 'below your target'} : {})}));
    const capped = capRows(rows, env);
    return ok('water', label, where(env, null, range), {totalMl: num(total, 0), ...(flOz ? {totalFlOz: num(total / 29.5735295625, 1)} : {}), daysWithWater: logged.length, daysInRange: days.length, yourDailyTargetMl: target ?? 'none set', ...(target ? {daysAtOrAboveTarget: logged.filter(d => d.millilitres >= target).length} : {}), perDay: capped.rows}, capped.truncated);
  },
};

export const steps: ToolDefinition<{range?: string}> = {
  name: 'steps', title: 'Steps', area: 'health',
  description: 'Steps and active minutes per day for a period, from the activity entries the person logged, with totals and their own daily step target when set.',
  parameters: {type: 'object', properties: {range: RANGE('today')}},
  args: z.object({range: rangeArg}),
  label: args => `Steps · ${args.range?.trim() || 'today'}`,
  run(args, env, label) {
    const g = gated(env, 'steps', label); if (!g.ok) return g;
    const range = rangeFor(env, args.range, 'today', 'steps', label); if (isRefusal(range)) return range;
    const byDay = new Map<string, {steps: number; minutes: number; entries: number}>();
    for (const a of g.health.activity) if (a.date >= range.from && a.date <= range.to) { const d = byDay.get(a.date) ?? {steps: 0, minutes: 0, entries: 0}; byDay.set(a.date, {steps: d.steps + a.steps, minutes: d.minutes + a.minutes, entries: d.entries + 1}); }
    const target = g.health.targets.steps;
    const rows = [...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => ({date, steps: d.steps, activeMinutes: d.minutes, ...(target ? {vs_your_target: d.steps >= target ? 'at or above your target' : 'below your target'} : {})}));
    const totalSteps = rows.reduce((s, r) => s + r.steps, 0), totalMinutes = rows.reduce((s, r) => s + r.activeMinutes, 0);
    const capped = capRows(rows, env);
    return ok('steps', label, where(env, null, range), {totalSteps, totalActiveMinutes: totalMinutes, daysWithActivity: rows.length, daysInRange: eachDay(range.from, range.to).length, averageStepsPerRecordedDay: rows.length ? Math.round(totalSteps / rows.length) : 'unknown: nothing recorded', yourDailyStepTarget: target ?? 'none set', ...(target ? {daysAtOrAboveTarget: rows.filter(r => r.steps >= target).length} : {}), perDay: capped.rows, ...(rows.length ? {} : {note: 'No steps or active minutes recorded in this period.'})}, capped.truncated);
  },
};

const readingDay = (r: BodyMeasurement) => { try { return healthDayOf(r.timezone, new Date(r.observedAt)); } catch { return r.observedAt.slice(0, 10); } };
const kgOrLb = (grams: number, unit: 'kg' | 'lb') => unit === 'lb' ? `${num(grams / 453.59237, 1)} lb` : `${num(grams / 1000, 1)} kg`;
export const weight: ToolDefinition<{range?: string}> = {
  name: 'weight', title: 'Weight', area: 'health',
  description: 'Weight readings for a period in the person\'s unit, oldest first, and the change from the first to the last reading. Numbers only; ZIGoals gives no medical advice.',
  parameters: {type: 'object', properties: {range: RANGE('the last 30 days')}},
  args: z.object({range: rangeArg}),
  label: args => `Weight · ${args.range?.trim() || 'the last 30 days'}`,
  run(args, env, label) {
    const g = gated(env, 'weight', label); if (!g.ok) return g;
    const range = rangeFor(env, args.range, 'the last 30 days', 'weight', label); if (isRefusal(range)) return range;
    const unit = dailyData(g.health).preferences.weightUnit, history = measurementHistory(g.health, 'weight');
    const readings = [
      ...g.health.weights.filter(w => w.date >= range.from && w.date <= range.to).map(w => ({date: w.date, grams: w.grams, kind: 'date-only reading'})),
      ...history.readings.map(r => ({date: readingDay(r), grams: r.canonical / 1000, kind: `timed reading (${text(r.sourceLabel, 40)})`})).filter(r => r.date >= range.from && r.date <= range.to),
    ].sort((a, b) => a.date.localeCompare(b.date));
    const first = readings[0], last = readings.at(-1);
    const rows = readings.map(r => ({date: r.date, weight: kgOrLb(r.grams, unit), kind: r.kind}));
    const capped = capRows(rows, env);
    return ok('weight', label, where(env, null, range), {readings: capped.rows, count: readings.length, unit, change: first && last && readings.length > 1 ? `${last.grams >= first.grams ? '+' : '-'}${kgOrLb(Math.abs(last.grams - first.grams), unit)} from ${first.date} to ${last.date}` : 'unknown: fewer than two readings', ...(history.unresolved.length ? {needsReview: `${plural(history.unresolved.length, 'imported reading')} with conflicting copies ${history.unresolved.length === 1 ? 'is' : 'are'} not counted until reviewed in Health.`} : {})}, capped.truncated);
  },
};

const LENGTH_KINDS = ['waist', 'hips', 'chest', 'arm', 'thigh'] as const;
export const bodyMeasurements: ToolDefinition<{kind?: (typeof LENGTH_KINDS)[number]; range?: string}> = {
  name: 'body_measurements', title: 'Body measurements', area: 'health',
  description: 'Body measurements (waist, hips, chest, arm, thigh) for a period as the person entered them, oldest first, with the change per kind in centimetres.',
  parameters: {type: 'object', properties: {kind: {type: 'string', enum: LENGTH_KINDS, description: 'Only this measurement.'}, range: RANGE('the last 90 days')}},
  args: z.object({kind: z.enum(LENGTH_KINDS).optional(), range: rangeArg}),
  label: args => `${args.kind ? `${args.kind[0]!.toUpperCase()}${args.kind.slice(1)}` : 'Body measurements'} · ${args.range?.trim() || 'the last 90 days'}`,
  run(args, env, label) {
    const g = gated(env, 'body_measurements', label); if (!g.ok) return g;
    const range = rangeFor(env, args.range, 'the last 90 days', 'body_measurements', label); if (isRefusal(range)) return range;
    const kinds = args.kind ? [args.kind] : LENGTH_KINDS, perKind: Record<string, unknown> = {}, rows: {date: string; kind: string; value: string}[] = [];
    for (const kind of kinds) {
      const readings = measurementHistory(g.health, kind).readings.filter(r => { const d = readingDay(r); return d >= range.from && d <= range.to; });
      if (!readings.length) continue;
      for (const r of readings) rows.push({date: readingDay(r), kind, value: `${num(r.quantityMilli / 1000, 1)} ${r.unit}`});
      const first = readings[0]!, last = readings.at(-1)!;
      perKind[kind] = {readings: readings.length, latest: `${num(last.quantityMilli / 1000, 1)} ${last.unit} on ${readingDay(last)}`, changeCm: readings.length > 1 ? num((last.canonical - first.canonical) / 10_000, 1) : 'unknown: one reading'};
    }
    rows.sort((a, b) => a.date.localeCompare(b.date));
    const unresolved = measurementGroups(g.health).filter(gr => gr.conflict && gr.copies.some(c => c.kind !== 'weight')).length;
    const capped = capRows(rows, env);
    return ok('body_measurements', label, where(env, args.kind ?? null, range), {perKind: Object.keys(perKind).length ? perKind : 'no measurements in this period', readings: capped.rows, ...(unresolved ? {needsReview: `${plural(unresolved, 'imported reading')} with conflicting copies not counted.`} : {})}, capped.truncated);
  },
};

export const fasting: ToolDefinition<{range?: string}> = {
  name: 'fasting', title: 'Fasts', area: 'health',
  description: 'The fasts the person recorded with the fasting timer in a period, newest first: the day, hours and target, and whether one is running now. A list only: no totals, streaks or records, by design.',
  parameters: {type: 'object', properties: {range: RANGE('the last 30 days')}},
  args: z.object({range: rangeArg}),
  label: args => `Fasts · ${args.range?.trim() || 'the last 30 days'}`,
  run(args, env, label) {
    const g = gated(env, 'fasting', label); if (!g.ok) return g;
    const range = rangeFor(env, args.range, 'the last 30 days', 'fasting', label); if (isRefusal(range)) return range;
    const data = env.fasting, running = data ? runningSession(data) : undefined;
    const rows = data ? fastingHistory(data, 2000).filter(r => r.day >= range.from && r.day <= range.to).map(r => ({day: r.day, hours: num(r.hours, 1), targetHours: r.session.targetHours, stopped: r.session.stoppedBy === 'limit' ? 'stopped by the 24 h limit' : 'stopped by you'})) : [];
    const capped = capRows(rows, env, false);
    return ok('fasting', label, where(env, null, range), {
      fasts: capped.rows, running: running ? `started ${running.startedAt.slice(0, 16).replace('T', ' ')} UTC, ${formatFast(Math.max(0, elapsedMs(running, env.now).ms))} so far, target ${running.targetHours} h` : 'no fast running',
      byDesign: 'A list only: ZIGoals keeps no fasting totals, streaks or longest fast.', safety: HE6_NOTE,
    }, capped.truncated);
  },
};

export const counters: ToolDefinition<{counter?: string; range?: string}> = {
  name: 'counters', title: 'Exercise counters', area: 'health',
  description: 'The exercise counters (push-ups, squats and the person\'s own) for a period: total repetitions and days with an entry per counter, and the day-by-day counts.',
  parameters: {type: 'object', properties: {counter: {type: 'string', description: 'One counter: a handle from this conversation (c1) or its name.'}, range: RANGE('today')}},
  args: z.object({counter: z.string().trim().min(1).max(60).optional(), range: rangeArg}),
  label: args => `${args.counter ? text(args.counter, 30) : 'Exercise counters'} · ${args.range?.trim() || 'today'}`,
  run(args, env, label) {
    const g = gated(env, 'counters', label); if (!g.ok) return g;
    const range = rangeFor(env, args.range, 'today', 'counters', label); if (isRefusal(range)) return range;
    let list = exerciseData(g.health).counters;
    if (args.counter) {
      const byHandle = /^c\d{1,3}$/i.test(args.counter) ? env.handles.find(args.counter, 'counter') : null;
      if (byHandle) list = list.filter(c => c.id === byHandle.id);
      else {
        const match = matchByName(list, args.counter, c => c.name, c => c.id);
        if (match.kind === 'none') return refuse('counters', label, 'not-found', `No exercise counter matches "${text(args.counter, 40)}".`);
        if (match.kind === 'many') return refuse('counters', label, 'ambiguous', 'Two or more counters match. Which one?', match.choices.map(c => ({label: text(c.label, 40), handle: env.handles.add('counter', c.id, c.label)})));
        list = [match.item];
      }
    }
    const days = eachDay(range.from, range.to), rows: {date: string; counter: string; count: number}[] = [];
    const perCounter = list.map(c => {
      const counts = days.flatMap(d => { const n = countOn(g.health, c.id, d); return n === null ? [] : [{date: d, n}]; });
      for (const x of counts) rows.push({date: x.date, counter: text(c.name, 40), count: x.n});
      return {handle: env.handles.add('counter', c.id, c.name), counter: text(c.name, 40), total: counts.reduce((s, x) => s + x.n, 0), daysWithEntry: counts.length};
    });
    rows.sort((a, b) => a.date.localeCompare(b.date));
    const capped = capRows(rows, env);
    return ok('counters', label, where(env, args.counter ? text(args.counter, 30) : null, range), {counters: perCounter, perDay: capped.rows}, capped.truncated);
  },
};

const servingText = (v: {servingGrams: number | null; servingMl?: number}) => v.servingGrams !== null ? `${v.servingGrams} g` : v.servingMl !== undefined ? `${v.servingMl} mL` : 'unknown';
const perServing = (n: Nutrition) => ({kcal: n.kcal ?? 'unknown', protein_g: grams(n.proteinMg), carbs_g: grams(n.carbsMg), fat_g: grams(n.fatMg)});
export const searchOwnFoods: ToolDefinition<{query: string}> = {
  name: 'search_foods', title: 'Your foods', area: 'health',
  description: 'Searches the person\'s own saved foods by name or brand: serving size and energy, protein, carbohydrates and fat per serving (unknown when the food does not say).',
  parameters: {type: 'object', properties: {query: {type: 'string', description: 'Words from the food\'s name or brand.'}}, required: ['query']},
  args: z.object({query: z.string().trim().min(1).max(120)}),
  label: args => `Your foods · "${text(args.query, 30)}"`,
  run(args, env, label) {
    const g = gated(env, 'search_foods', label); if (!g.ok) return g;
    const words = tokens(args.query);
    let found = searchFoods(g.health.foods, args.query);
    // The app's search wants every word; ZIGi also tries the stems so "bananas" finds "Banana".
    if (!found.length && words.length) found = g.health.foods.filter(f => matchByName([f], args.query, x => `${x.name} ${x.brand}`, x => x.id).kind === 'one');
    const rows = found.map(f => ({handle: env.handles.add('food', f.id, f.name), name: text(f.name), brand: f.brand ? text(f.brand, 40) : undefined, serving: servingText(f), ...perServing(f.nutrients)}));
    const capped = capRows(rows, env, false);
    return ok('search_foods', label, where(env, null, null), {foods: capped.rows, count: rows.length, ...(rows.length ? {} : {note: `No saved food matches "${text(args.query, 40)}".`})}, capped.truncated);
  },
};

export const listRecipes: ToolDefinition<{query?: string}> = {
  name: 'list_recipes', title: 'Your recipes', area: 'health',
  description: 'The person\'s own recipes (optionally matching some words): portions, serving size and energy, protein, carbohydrates and fat per portion.',
  parameters: {type: 'object', properties: {query: {type: 'string', description: 'Words from the recipe\'s name (default: all recipes).'}}},
  args: z.object({query: z.string().trim().max(120).optional()}),
  label: args => args.query ? `Your recipes · "${text(args.query, 30)}"` : 'Your recipes',
  run(args, env, label) {
    const g = gated(env, 'list_recipes', label); if (!g.ok) return g;
    const recipes = args.query ? g.health.recipes.filter(r => matchByName([r], args.query!, x => x.name, x => x.id).kind === 'one') : g.health.recipes;
    const rows = recipes.map(r => {
      let nutrition: Nutrition | null = null, grams: number | null = null, ml: number | undefined;
      try { nutrition = recipeNutrition(r); grams = recipeServingGrams(r); ml = recipeServingMl(r); } catch { /* a recipe that needs review in Health */ }
      return {handle: env.handles.add('recipe', r.id, r.name), name: text(r.name), portions: num(r.portionsMilli / 1000, 2), ingredients: r.ingredients.length, servingPerPortion: servingText({servingGrams: grams, servingMl: ml}), perPortion: nutrition ? perServing(nutrition) : 'unknown: review this recipe in Health'};
    });
    const capped = capRows(rows, env, false);
    return ok('list_recipes', label, where(env, null, null), {recipes: capped.rows, count: rows.length}, capped.truncated);
  },
};

export const mealPlan: ToolDefinition<{range?: string}> = {
  name: 'meal_plan', title: 'Meal plan', area: 'health',
  description: 'The meals the person planned for a period (it may include coming days): date, meal, saved meal name, number of items and whether it was logged.',
  parameters: {type: 'object', properties: {range: RANGE('this week (Monday to Sunday)')}},
  args: z.object({range: rangeArg}),
  label: args => `Meal plan · ${args.range?.trim() || 'this week'}`,
  run(args, env, label) {
    const g = gated(env, 'meal_plan', label); if (!g.ok) return g;
    const range = rangeFor(env, args.range, 'this week', 'meal_plan', label, true); if (isRefusal(range)) return range;
    const daily = dailyData(g.health);
    const rows = daily.plans.filter(p => p.date >= range.from && p.date <= range.to).sort((a, b) => a.date.localeCompare(b.date) || HEALTH_MEALS.indexOf(a.meal) - HEALTH_MEALS.indexOf(b.meal))
      .map(p => ({date: p.date, meal: p.meal, name: text(p.name), handle: env.handles.add('meal', p.savedMealId, p.name), items: p.items.length, logged: p.loggedAt ? 'logged' : 'not logged yet'}));
    const capped = capRows(rows, env, false);
    return ok('meal_plan', label, where(env, null, range), {planned: capped.rows, count: rows.length, savedMeals: daily.savedMeals.length, ...(rows.length ? {} : {note: 'Nothing planned in this period.'})}, capped.truncated);
  },
};

export const groceries: ToolDefinition<{range?: string}> = {
  name: 'groceries', title: 'Groceries', area: 'health',
  description: 'The grocery list made from the meals planned (and not yet logged) in a period: ingredient, amount as recorded, whether it is checked off, plus the person\'s own grocery notes.',
  parameters: {type: 'object', properties: {range: RANGE('the next 7 days')}},
  args: z.object({range: rangeArg}),
  label: args => `Groceries · ${args.range?.trim() || 'the next 7 days'}`,
  run(args, env, label) {
    const g = gated(env, 'groceries', label); if (!g.ok) return g;
    const range = rangeFor(env, args.range, 'the next 7 days', 'groceries', label, true); if (isRefusal(range)) return range;
    let list: ReturnType<typeof groceryList> = [];
    try { list = groceryList(g.health, range.from, range.to); } catch { return refuse('groceries', label, 'range', 'That period could not be read for groceries; try a shorter one.'); }
    const rows = list.map(r => ({item: text(r.name), amount: r.manual ? `${num(r.manual.quantityMilli / 1000, 2)} ${r.manual.unit}` : r.grams !== null ? `${num(r.grams, 0)} g` : r.millilitres !== null ? `${num(r.millilitres, 0)} mL` : 'unknown', checked: r.checked}));
    const notes = dailyData(g.health).groceryNotes;
    const capped = capRows(rows, env, false);
    return ok('groceries', label, where(env, null, range), {items: capped.rows, count: rows.length, yourNotes: notes ? text(notes, 600) : 'none', ...(rows.length ? {} : {note: 'No planned meals in this period, so no groceries.'})}, capped.truncated);
  },
};

export const HEALTH_TOOLS = [diaryEntries, nutrientTotals, water, steps, weight, bodyMeasurements, fasting, counters, searchOwnFoods, listRecipes, mealPlan, groceries] as const;
