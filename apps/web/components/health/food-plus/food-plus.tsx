'use client';
import {lazy} from 'react';
import type {HealthData, HealthDiaryEntry, HealthTargets} from '../../../lib/health';
import {addLocalDays} from '../../../lib/local-date';

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
  | {part: 'challenge-line' | 'challenge'; data: HealthData; today: string}
  | {part: 'partial'; date: string; hasEntries: boolean}
  | {part: 'pack-photos' | 'pack-thumbs' | 'recipe-cook' | 'food-marks' | 'marks-settings'; data: HealthData}
  | {part: 'recipe-book'; data: HealthData; perform: Perform}
  | {part: 'fit-plan'; data: HealthData; date: string; today: string; perform: Perform}
  | {part: 'day-plans'; data: HealthData; date: string; perform: Perform};
const SaveMeal = lazy(() => import('./save-meal'));
const EntryTimes = lazy(() => import('./entry-times'));
const NutrientTiming = lazy(() => import('./nutrient-timing'));
const WeekdayTargets = lazy(() => import('./weekday-targets').then(m => ({default: m.WeekdayTargets})));
const Oracle = lazy(() => import('./oracle'));
const PartialDay = lazy(() => import('./partial-day'));
const PackPhotos = lazy(() => import('./pack-photos'));
const CookView = lazy(() => import('./cook-view'));
const RecipeBook = lazy(() => import('./recipe-book'));
const FitPlan = lazy(() => import('./fit-plan'));
const DayPlans = lazy(() => import('./day-plans'));
const FoodMarks = lazy(() => import('./food-marks').then(m => ({default: m.FoodMarks})));
const MarksSettings = lazy(() => import('./food-marks'));
const PackThumbs = lazy(() => import('./pack-photos').then(m => ({default: m.PackThumbs})));
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
  if (props.part === 'partial') return <PartialDay date={props.date} hasEntries={props.hasEntries}/>;
  if (props.part === 'pack-photos') return <PackPhotos data={props.data}/>;
  if (props.part === 'pack-thumbs') return <PackThumbs data={props.data}/>;
  if (props.part === 'recipe-cook') return <CookView data={props.data}/>;
  if (props.part === 'recipe-book') return <RecipeBook data={props.data} perform={props.perform}/>;
  if (props.part === 'food-marks') return <FoodMarks data={props.data}/>;
  if (props.part === 'marks-settings') return <MarksSettings data={props.data}/>;
  if (props.part === 'day-plans') return <DayPlans data={props.data} date={props.date} perform={props.perform}/>;
  if (props.part === 'fit-plan') return <FitPlan data={props.data} date={props.date === props.today ? addLocalDays(props.today, 1) : props.date} perform={props.perform}/>;
  return null;
}
