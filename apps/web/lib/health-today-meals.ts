import {HEALTH_MEALS, type HealthData} from './health';

/**
 * Session AL release review (RR-5): Today's Health card names what was logged ("Breakfast: oatmeal with blueberries"),
 * in meal order, so a meal whose nutrition was not given still shows by name instead of four "Unknown"s. At most `max`
 * names; `more` counts the rest.
 */
export function mealsLoggedOn(data: Pick<HealthData, 'diary'>, date: string, max = 3): {names: string[]; more: number} {
  const entries = data.diary.filter(e => e.date === date).sort((a, b) => HEALTH_MEALS.indexOf(a.meal) - HEALTH_MEALS.indexOf(b.meal) || a.createdAt.localeCompare(b.createdAt));
  const names = entries.map(e => `${e.meal === 'Snacks' ? 'Snack' : e.meal}: ${e.snapshot.name}`);
  return {names: names.slice(0, max), more: Math.max(0, names.length - max)};
}
/** One line of those names ("Breakfast: oatmeal · Lunch: soup · 2 more"); empty when nothing was logged. */
export function mealsLoggedLine(data: Pick<HealthData, 'diary'>, date: string, max = 3): string {
  const {names, more} = mealsLoggedOn(data, date, max);
  return [...names, ...(more ? [`${more} more`] : [])].join(' · ');
}
/** True when no entry of the day gives calories, protein, carbs or fat: nothing to total, only names to show (never 0). */
export const noNutritionKnown = (summary: {knownNutrients: Record<'kcal' | 'proteinMg' | 'carbsMg' | 'fatMg', number | null>}) =>
  summary.knownNutrients.kcal === null && summary.knownNutrients.proteinMg === null && summary.knownNutrients.carbsMg === null && summary.knownNutrients.fatMg === null;
