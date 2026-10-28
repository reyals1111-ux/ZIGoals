import {MEAL_ESTIMATES, MEAL_ESTIMATES_KEY, addEstimate, mealEstimateSchema, type MealEstimates} from '../../meal-estimates/schema';
import {registerDeviceWrite, type Entry} from './device-writes';

/**
 * Session AI (feature 1, HE17): a log-food card with ranges keeps them beside the estimated food, through this one entry.
 * The patch is `{add: {foodId, estimate}}`, checked against the estimate's own schema; loaded with the planner chunk.
 */
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export const mealEstimateEntry: Entry<MealEstimates> = {spec: MEAL_ESTIMATES, apply: (record, patch) => {
  if (!object(patch) || !object(patch.add) || typeof patch.add.foodId !== 'string') throw new Error('That change is not one a card can make.');
  const estimate = mealEstimateSchema.safeParse(patch.add.estimate);
  if (!estimate.success) throw new Error('That estimate cannot be kept as proposed; edit the food on Health → Foods & recipes.');
  return addEstimate(record, patch.add.foodId, estimate.data);
}};
registerDeviceWrite(MEAL_ESTIMATES_KEY, mealEstimateEntry);
