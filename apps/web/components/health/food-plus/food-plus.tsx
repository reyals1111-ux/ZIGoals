'use client';
import {lazy} from 'react';
import type {HealthData, HealthDiaryEntry} from '../../../lib/health';

/**
 * Session AV lane 2 (food): one lazy entry for the food-logging parts, so /app/health carries a single small import for
 * them (its weight budget, scripts/weight-budgets.json). Each part loads its own code only where it is shown.
 */
type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
export type FoodPlusProps =
  | {part: 'save-meal'; data: HealthData; date: string; meal: HealthDiaryEntry['meal']; label: string; dayWords: string; perform: Perform; onClose: () => void}
  | {part: 'times'; data: HealthData; date: string}
  | {part: 'timing'; data: HealthData; today: string};
const SaveMeal = lazy(() => import('./save-meal'));
const EntryTimes = lazy(() => import('./entry-times'));
const NutrientTiming = lazy(() => import('./nutrient-timing'));
export default function FoodPlus(props: FoodPlusProps) {
  if (props.part === 'save-meal') return <SaveMeal {...props}/>;
  if (props.part === 'times') return <EntryTimes data={props.data} date={props.date}/>;
  if (props.part === 'timing') return <NutrientTiming data={props.data} today={props.today}/>;
  return null;
}
