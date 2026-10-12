import {healthSchema, saveFood, saveRecipe, type HealthData} from '../health';
import {saveMealFromRecipe, saveMealPlan} from '../health-daily';
import {saveMeasurement} from '../body-measurements';
import {addLocalDays} from '../local-date';
import {healthCoachSchema, type HealthCoach} from './coach-schema';
import {microTargetsSchema, type MicroTargets} from './micro';
import {macroModeSchema, type MacroModeRecord} from './macro-mode';
import {measurementsCustomSchema, type MeasurementsCustom} from './measurements-custom';
import {remindersPlanSchema, type RemindersPlan} from '../reminders-plan/schema';

/**
 * Session AA-Local Part 7 (ADR-022 B22–B33): what the Showcase shows of Health best in class, fictional and labelled.
 * The Showcase's own weights (eight over the month; the trend card and the energy estimate from the month of diary
 * entries), micronutrients on the Showcase foods (the micro panel never shows zero for the unknown), a pea soup recipe
 * and one imported from pasted text (foods with unknown nutrition, brand "Imported recipe", B30), the soup saved as a meal
 * and planned for five dinners (the planner, the grocery list by aisle, the one-tap log), waist readings every week; the
 * device records beside it: a coach check-in that is due (no answer this week), an iron target of 14 mg, the net-carbs
 * view, a custom "Calf" measurement with its readings, the reminders plan (bedtime 22:30, the weekly review, quiet hours).
 * No fast runs (B5), so Today is unchanged.
 */
const ZONE = 'Europe/Brussels';
export function showcaseHealthAa(health: HealthData, day: string): HealthData {
  const date = (offset: number) => addLocalDays(day, offset), at = (offset: number) => `${date(offset)}T07:30:00.000Z`;
  let data = healthSchema.parse(health);
  // Weights stay the Showcase's own eight readings (every fourth day): the trend card and the energy estimate need six, and
  // lib/insights pins the weight-and-steps pairing from exactly those days (B42).
  // Micronutrients on the four Showcase foods (fiber, iron, calcium, sodium; the rest stays unknown on purpose).
  const micro: Record<string, Partial<{fiberMg: number; ironMg: number; calciumMg: number; sodiumMg: number; potassiumMg: number}>> = {
    'health_food-0000': {fiberMg: 7_000, ironMg: 2, calciumMg: 180_000, sodiumMg: 120_000},
    'health_food-0001': {fiberMg: 6_000, ironMg: 3, potassiumMg: 820_000, sodiumMg: 480_000},
    'health_food-0002': {fiberMg: 4_000, ironMg: 1, calciumMg: 60_000, sodiumMg: 620_000},
    'health_food-0003': {calciumMg: 260_000, ironMg: 1},
  };
  for (const f of data.foods) if (micro[f.id]) data = saveFood(data, {...f, nutrients: {...f.nutrients, ...micro[f.id]}});
  // Two pantry foods, a pea soup recipe, and a recipe imported from pasted text (its foods carry no nutrition).
  const stamp = at(-9);
  data = saveFood(data, {id: 'health_food-aa-peas', name: 'Showcase split peas', brand: 'Showcase kitchen', servingGrams: 100, nutrients: {kcal: 350, proteinMg: 25_000, carbsMg: 60_000, fatMg: 1_500, fiberMg: 11_000, ironMg: 7}, createdAt: stamp, updatedAt: stamp});
  data = saveFood(data, {id: 'health_food-aa-leek', name: 'Showcase leek', brand: 'Showcase kitchen', servingGrams: 100, nutrients: {kcal: 40, proteinMg: 1_100, carbsMg: 9_000, fatMg: 100, fiberMg: 1_700}, createdAt: stamp, updatedAt: stamp});
  data = saveRecipe(data, {id: 'health_recipe-aa-soup', name: 'Showcase pea soup', portionsMilli: 4_000, yield: {quantityMilli: 1_600_000, unit: 'ml'}, items: [{foodId: 'health_food-aa-peas', quantityMilli: 2_000}, {foodId: 'health_food-aa-leek', quantityMilli: 1_500}, {foodId: 'health_food-0003', quantityMilli: 500}]}, stamp);
  for (const [id, name] of [['health_food-aa-imp-chickpeas', 'Chickpeas, tinned'], ['health_food-aa-imp-tahini', 'Tahini']] as const) data = saveFood(data, {id, name, brand: 'Imported recipe', servingGrams: 100, nutrients: {kcal: null, proteinMg: null, carbsMg: null, fatMg: null}, createdAt: at(-2), updatedAt: at(-2)});
  data = saveRecipe(data, {id: 'health_recipe-aa-hummus', name: 'Showcase hummus (imported from pasted text)', portionsMilli: 6_000, items: [{foodId: 'health_food-aa-imp-chickpeas', quantityMilli: 4_000}, {foodId: 'health_food-aa-imp-tahini', quantityMilli: 600}]}, at(-2));
  // The soup saved as a meal and planned for five dinners from today; nothing logged yet, so the list has things to buy.
  data = saveMealFromRecipe(data, 'health_meal-aa-soup', 'health_recipe-aa-soup', 1_000, stamp);
  for (let n = 0; n < 5; n++) data = saveMealPlan(data, {id: `health_plan-aa-${n}`, savedMealId: 'health_meal-aa-soup', date: date(n), meal: 'Dinner'}, stamp);
  // Waist readings once a week for six weeks, slowly down.
  for (let n = 0; n < 6; n++) { const d = date(-35 + n * 7); data = saveMeasurement(data, {id: `health_measure-aa-waist-${n}`, kind: 'waist', quantityMilli: 86_000 - n * 400, unit: 'cm', observedAt: `${d}T07:45:00+02:00`, timezone: ZONE, sourceLabel: 'SHOWCASE DATA · fictional tape measure'}, `${d}T07:46:00.000Z`); }
  return healthSchema.parse(data);
}
/** The device records of Health best in class for the Showcase, each parsed by its own schema. */
export function showcaseHealthAaDevice(day: string): {coach: HealthCoach; micro: MicroTargets; macro: MacroModeRecord; measurements: MeasurementsCustom; reminders: RemindersPlan} {
  const date = (offset: number) => addLocalDays(day, offset);
  return {
    coach: healthCoachSchema.parse({version: 1}),
    micro: microTargetsSchema.parse({version: 1, targets: {ironMg: 14}}),
    macro: macroModeSchema.parse({version: 1, mode: 'net-carbs'}),
    measurements: measurementsCustomSchema.parse({version: 1, kinds: [{id: 'calf', label: 'Calf', unit: 'cm'}], readings: Array.from({length: 4}, (_, n) => ({id: `custom_aa-calf-${n}`, kind: 'calf', date: date(-28 + n * 7), valueMilli: 37_200 + n * 100, at: `${date(-28 + n * 7)}T07:50:00.000Z`}))}),
    reminders: remindersPlanSchema.parse({version: 1, items: {bedtime: {on: true, time: '22:30'}, review: {on: true, weekday: 0, time: '18:00'}, 'fasting-end': {on: false}, 'goal-checkin': {on: true, weekday: 1, time: '09:00'}}, quiet: {from: '22:00', to: '08:00'}}),
  };
}
