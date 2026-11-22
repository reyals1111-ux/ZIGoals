/**
 * Session AV lane 2 (food, LEDGER #197; Lose It!'s own meal names and extra snacks): up to two extra diary meals the
 * person names ("Afternoon snack", "Second breakfast"), each with a usual time, an optional calorie target and the meal it
 * shows after. The strict, synced diary keeps its four meals: an entry in an extra meal is stored as Snacks (so every
 * older reader, every total and every answer counts it there), and `zigoals:food-plus:v1` `extraMeals` keeps which
 * entries belong to which extra meal, on this device. While a slot has a name its entries show in their own section;
 * once it is taken off they show in Snacks again (the tags stay, so naming it again brings them back).
 *
 * Kept free of any schema library on purpose (the lib/food-plus/day-target.ts pattern): Health's first chunk reads it for
 * the Diary's sections and the meal choice; the record is validated where it is written (lib/food-plus/extra-meals.ts).
 */
export const DIARY_MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const; // lib/health.ts HEALTH_MEALS, as literals
export type DiaryMeal = (typeof DIARY_MEALS)[number];
export const EXTRA_MEAL_KEYS = ['extra1', 'extra2'] as const;
export type ExtraMealKey = (typeof EXTRA_MEAL_KEYS)[number];
/** What a meal choice holds: one of the four stored meals, or an extra meal (stored as Snacks). */
export type MealChoice = DiaryMeal | ExtraMealKey;
export const EXTRA_MEAL_NAME_MAX = 24;
/** Where each slot shows until the person chooses: the first after Lunch, the second last. */
export const EXTRA_DEFAULT_AFTER: Record<ExtraMealKey, DiaryMeal> = {extra1: 'Lunch', extra2: 'Snacks'};
/** The words a slot's name field suggests (its placeholder), never stored until typed. */
export const EXTRA_SUGGESTED: Record<ExtraMealKey, {en: string; nl: string}> = {extra1: {en: 'Afternoon snack', nl: 'Middagsnack'}, extra2: {en: 'Late snack', nl: 'Late snack'}};
export type ExtraSlot = {key: ExtraMealKey; name: string; time: string | null; kcal: number | null; after: DiaryMeal};
export type ExtraMeals = {slots: readonly ExtraSlot[]; tags: Readonly<Record<string, ExtraMealKey>>};
export const NO_EXTRA_MEALS: ExtraMeals = {slots: [], tags: {}};

const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const ENTRY_ID = /^(?:health|words)_[A-Za-z0-9-]{1,100}$/;
export const isExtraChoice = (choice: string): choice is ExtraMealKey => (EXTRA_MEAL_KEYS as readonly string[]).includes(choice);
export const isMealChoice = (choice: string): choice is MealChoice => isExtraChoice(choice) || (DIARY_MEALS as readonly string[]).includes(choice);
/** The meal the strict diary stores for a choice: an extra meal is Snacks. */
export const storedMealOf = (choice: MealChoice): DiaryMeal => isExtraChoice(choice) ? 'Snacks' : choice;

/** The `extraMeals` part of a stored food-plus record's text, or none (never throws). A slot needs a visible name. */
export function extraMealsOf(raw: string | null): ExtraMeals {
  if (!raw) return NO_EXTRA_MEALS;
  try {
    const parsed = JSON.parse(raw) as {version?: unknown; extraMeals?: {slots?: unknown; entries?: unknown}};
    const part = parsed?.version === 1 ? parsed.extraMeals : undefined;
    if (!part || typeof part !== 'object') return NO_EXTRA_MEALS;
    const slots: ExtraSlot[] = [];
    const given = part.slots && typeof part.slots === 'object' ? part.slots as Record<string, unknown> : {};
    for (const key of EXTRA_MEAL_KEYS) {
      const v = given[key] as {name?: unknown; time?: unknown; kcal?: unknown; after?: unknown} | undefined;
      if (!v || typeof v !== 'object' || typeof v.name !== 'string') continue;
      const name = v.name.trim();
      if (!name || name.length > EXTRA_MEAL_NAME_MAX) continue;
      const time = typeof v.time === 'string' && CLOCK.test(v.time) ? v.time : null;
      const kcal = typeof v.kcal === 'number' && Number.isInteger(v.kcal) && v.kcal >= 1 && v.kcal <= 10_000 ? v.kcal : null;
      const after = typeof v.after === 'string' && (DIARY_MEALS as readonly string[]).includes(v.after) ? v.after as DiaryMeal : EXTRA_DEFAULT_AFTER[key];
      slots.push({key, name, time, kcal, after});
    }
    const tags: Record<string, ExtraMealKey> = {};
    if (part.entries && typeof part.entries === 'object') for (const [id, key] of Object.entries(part.entries as Record<string, unknown>)) if (ENTRY_ID.test(id) && typeof key === 'string' && isExtraChoice(key)) tags[id] = key;
    return {slots, tags};
  } catch { return NO_EXTRA_MEALS; }
}
export const slotOf = (x: ExtraMeals, key: ExtraMealKey): ExtraSlot | null => x.slots.find(s => s.key === key) ?? null;
/** The Diary section an entry shows in: its extra meal while that slot has a name, else its stored meal. */
export function sectionOf(entry: {id: string; meal: string}, x: ExtraMeals): MealChoice {
  if (entry.meal !== 'Snacks') return entry.meal as DiaryMeal;
  const tag = x.tags[entry.id];
  return tag && slotOf(x, tag) ? tag : 'Snacks';
}
/** The Diary's sections in order: the four meals, each extra meal right after the meal it follows. */
export function diarySections(x: ExtraMeals): MealChoice[] {
  const out: MealChoice[] = [];
  for (const meal of DIARY_MEALS) { out.push(meal); for (const s of x.slots) if (s.after === meal) out.push(s.key); }
  return out;
}

const MIDDLE: Partial<Record<DiaryMeal, number>> = {Breakfast: 7 * 60 + 30, Lunch: 13 * 60, Dinner: 19 * 60 + 30}; // lib/default-meal.ts
const minutesOf = (clock: string | null) => clock && CLOCK.test(clock) ? Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3)) : null;
const apart = (a: number, b: number) => Math.min(Math.abs(a - b), 24 * 60 - Math.abs(a - b));
/**
 * The meal a new entry starts on: the four-meal choice (lib/default-meal.ts `defaultMeal`, given as `base` with its usual
 * time), unless an extra meal's own usual time is nearer now. An extra meal with no time is never chosen for the person.
 */
export function defaultChoice(base: DiaryMeal, baseTime: string | null, nowMinutes: number, x: ExtraMeals): MealChoice {
  const baseAt = minutesOf(baseTime) ?? MIDDLE[base] ?? null;
  let best: MealChoice = base, gap = baseAt === null ? 90 : apart(baseAt, nowMinutes);
  for (const s of x.slots) { const at = minutesOf(s.time); if (at !== null && apart(at, nowMinutes) < gap) { best = s.key; gap = apart(at, nowMinutes); } }
  return best;
}
