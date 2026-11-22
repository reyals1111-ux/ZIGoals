'use client';
import {lazy} from 'react';
import type {HealthData, HealthDiaryEntry, HealthTargets} from '../../../lib/health';

/**
 * Session AV lane 2 (food): one lazy entry for the food-logging parts, so /app/health carries a single small import for
 * them (its weight budget, scripts/weight-budgets.json). Each part loads its own code only where it is shown.
 */
type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
export type FoodPlusProps =
  | {part: 'save-meal'; data: HealthData; date: string; meal: HealthDiaryEntry['meal']; label: string; dayWords: string; perform: Perform; onClose: () => void}
  | {part: 'times'; data: HealthData; date: string}
  | {part: 'timing'; data: HealthData; today: string}
  | {part: 'weekdays'; targets: HealthTargets; today: string}
  | {part: 'sugar-alcohols'; data: HealthData}
  | {part: 'oracle'; data: HealthData; today: string}
  | {part: 'challenge-line' | 'challenge'; data: HealthData; today: string};
const SaveMeal = lazy(() => import('./save-meal'));
const EntryTimes = lazy(() => import('./entry-times'));
const NutrientTiming = lazy(() => import('./nutrient-timing'));
const WeekdayTargets = lazy(() => import('./weekday-targets').then(m => ({default: m.WeekdayTargets})));
const Oracle = lazy(() => import('./oracle'));
const ChallengeLine = lazy(() => import('./challenge').then(m => ({default: m.ChallengeLine})));
const ChallengeCard = lazy(() => import('./challenge').then(m => ({default: m.ChallengeCard})));
const SugarAlcohols = lazy(() => import('./weekday-targets').then(m => ({default: m.SugarAlcohols})));
export default function FoodPlus(props: FoodPlusProps) {
  if (props.part === 'save-meal') return <SaveMeal {...props}/>;
  if (props.part === 'times') return <EntryTimes data={props.data} date={props.date}/>;
  if (props.part === 'timing') return <NutrientTiming data={props.data} today={props.today}/>;
  if (props.part === 'weekdays') return <WeekdayTargets targets={props.targets} today={props.today}/>;
  if (props.part === 'sugar-alcohols') return <SugarAlcohols data={props.data}/>;
  if (props.part === 'oracle') return <Oracle data={props.data} today={props.today}/>;
  if (props.part === 'challenge-line') return <ChallengeLine data={props.data} today={props.today}/>;
  if (props.part === 'challenge') return <ChallengeCard data={props.data} today={props.today}/>;
  return null;
}
