'use client';
import {lazy} from 'react';
import type {HealthData, HealthDiaryEntry} from '../../../lib/health';

/**
 * Session AV lane 2 (food): one lazy entry for the food-logging parts, so /app/health carries a single small import for
 * them (its weight budget, scripts/weight-budgets.json). Each part loads its own code only where it is shown.
 */
type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
export type FoodPlusProps =
  | {part: 'save-meal'; data: HealthData; date: string; meal: HealthDiaryEntry['meal']; label: string; dayWords: string; perform: Perform; onClose: () => void};
const SaveMeal = lazy(() => import('./save-meal'));
export default function FoodPlus(props: FoodPlusProps) {
  if (props.part === 'save-meal') return <SaveMeal {...props}/>;
  return null;
}
