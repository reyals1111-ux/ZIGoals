'use client';
import {lazy} from 'react';
import type {HealthData} from '../../../lib/health';

/**
 * Session AP (owner-approved features 2, 3, 4 and 6): one lazy entry for the Health page, so /app/health carries a single
 * small import for them (its weight budget). Each part loads its own code only where it is shown: the orbits and trends
 * in Activity, the symptom tracker and "Copy a meal" when their folds open in the Diary.
 */
type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
export type HealthPlusProps =
  | {part: 'activity'; data: HealthData; today: string}
  | {part: 'symptoms'; date: string; today: string}
  | {part: 'copy'; data: HealthData; date: string; today: string; perform: Perform};
const ActivityPlus = lazy(() => import('./activity-plus'));
const SymptomsPanel = lazy(() => import('./symptoms-panel'));
const MealCopy = lazy(() => import('./meal-copy'));
export default function HealthPlus(props: HealthPlusProps) {
  if (props.part === 'activity') return <ActivityPlus data={props.data} today={props.today}/>;
  if (props.part === 'symptoms') return <SymptomsPanel date={props.date} today={props.today}/>;
  return <MealCopy data={props.data} date={props.date} today={props.today} perform={props.perform}/>;
}
