import {LIMITS} from './limits/plausibility';

/**
 * Session AL fourth pass (C-MO-04, C-DVG-42): an estimate of the calories a day that keep a weight steady, from the
 * Mifflin–St Jeor equation (resting energy) times an activity factor. It is shown labelled as an estimate, nothing is
 * stored, and it becomes a target only if the person presses to use it (the Health rule that there are no suggested
 * defaults stands: the person chooses). The Maintenance estimate on the Weight view refines it from their own logs.
 * Information, never advice.
 */
export type Sex = 'female' | 'male' | 'unsaid';
export const ACTIVITY_LEVELS = [
  {id: 'sedentary', label: 'Mostly sitting', factor: 1.2},
  {id: 'light', label: 'Light activity (1–3 days a week)', factor: 1.375},
  {id: 'moderate', label: 'Moderate activity (3–5 days a week)', factor: 1.55},
  {id: 'very', label: 'Very active (6–7 days a week)', factor: 1.725},
] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number]['id'];
export type MaintenanceInput = {sex: Sex; ageYears: number; heightCm: number; weightKg: number; activity: ActivityLevel};
/** The sentence for the first input that is out of range, or null. */
export function maintenanceIssue(i: MaintenanceInput): string | null {
  if (!Number.isInteger(i.ageYears) || i.ageYears < 18 || i.ageYears > 100) return 'Enter an age from 18 to 100 years (the equation is for adults).';
  if (!(i.heightCm >= 120 && i.heightCm <= 230)) return 'Enter a height from 120 to 230 cm (47 to 90 in).';
  if (!(i.weightKg >= LIMITS.weightKg.min && i.weightKg <= LIMITS.weightKg.max)) return `Enter a weight from ${LIMITS.weightKg.min} to ${LIMITS.weightKg.max} kg.`;
  return null;
}
/** kcal a day, rounded to 10; "unsaid" uses the midpoint of the two sex terms. Throws on an input maintenanceIssue refuses. */
export function maintenanceEstimate(i: MaintenanceInput): {kcal: number; resting: number} {
  const issue = maintenanceIssue(i); if (issue) throw new Error(issue);
  const sexTerm = i.sex === 'male' ? 5 : i.sex === 'female' ? -161 : -78;
  const resting = 10 * i.weightKg + 6.25 * i.heightCm - 5 * i.ageYears + sexTerm;
  const factor = ACTIVITY_LEVELS.find(a => a.id === i.activity)!.factor;
  return {resting: Math.round(resting / 10) * 10, kcal: Math.min(LIMITS.kcalTarget, Math.round(resting * factor / 10) * 10)};
}
