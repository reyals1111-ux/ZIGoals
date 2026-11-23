'use client';
import {lazy} from 'react';
import type {Sleep} from '../../../lib/sleep/schema';
import type {SleepStore} from '../sleep/use-sleep';
import type {HealthData} from '../../../lib/health';

/**
 * Session AV lane 2, round 4 (health; Pillow, Runna, Noom; LEDGER #328–#337): one lazy entry for this round's Health parts,
 * so a page carries a single small import for them (Health's weight budget, scripts/weight-budgets.json). Each part loads
 * its own code only where it is shown.
 */
export type HealthR4Props =
  | {part: 'sleep-timing'; sleep: Sleep; today: string}
  | {part: 'sleep-tip'; today: string; say: (text: string) => void}
  | {part: 'nap-timer'; store: SleepStore}
  | {part: 'food-day'; data: HealthData; date: string; today: string}
  | {part: 'return-note'}
  | {part: 'free-day'; data: HealthData; today: string}
  | {part: 'weight-band'; health: HealthData; today: string};
const SleepTiming = lazy(() => import('./sleep-parts').then(m => ({default: m.SleepTiming})));
const SleepTipCard = lazy(() => import('./sleep-parts').then(m => ({default: m.SleepTipCard})));
const NapTimer = lazy(() => import('./sleep-parts').then(m => ({default: m.NapTimer})));
const FoodDayNotes = lazy(() => import('./noom-parts').then(m => ({default: m.FoodDayNotes})));
const ReturnNoteEditor = lazy(() => import('./noom-parts').then(m => ({default: m.ReturnNoteEditor})));
const FreeDayPlanner = lazy(() => import('./noom-parts').then(m => ({default: m.FreeDayPlanner})));
const WeightBandEditor = lazy(() => import('./noom-parts').then(m => ({default: m.WeightBandEditor})));
export default function HealthR4(props: HealthR4Props) {
  if (props.part === 'sleep-timing') return <SleepTiming sleep={props.sleep} today={props.today}/>;
  if (props.part === 'sleep-tip') return <SleepTipCard today={props.today} say={props.say}/>;
  if (props.part === 'nap-timer') return <NapTimer store={props.store}/>;
  if (props.part === 'food-day') return <FoodDayNotes data={props.data} date={props.date} today={props.today}/>;
  if (props.part === 'return-note') return <ReturnNoteEditor/>;
  if (props.part === 'free-day') return <FreeDayPlanner data={props.data} today={props.today}/>;
  if (props.part === 'weight-band') return <WeightBandEditor health={props.health} today={props.today}/>;
  return null;
}
