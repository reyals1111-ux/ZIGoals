'use client';
import {lazy, type RefObject} from 'react';
import type {HealthData} from '../../../lib/health';

/**
 * Session AV lane 2 (health r3; LEDGER #280–#289): one lazy entry for this round's Health parts, so /app/health carries a
 * single small import for them (its weight budget, scripts/weight-budgets.json). Each part loads its own code only where
 * it is shown.
 */
type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
export type DrinkFieldsResult = {ok: true; value: {kcal?: number; sugarG?: number}} | {ok: false};
/** The water form's handle on the energy and sugar fields: read (and say what to fix) and clear after a save. */
export type DrinkFieldsHandle = {read: () => DrinkFieldsResult; clear: () => void};
export type HealthR3Props =
  | {part: 'water-more'; data: HealthData; date: string; perform: Perform}
  | {part: 'drink-fields'; handle: RefObject<DrinkFieldsHandle | null>; initial?: {kcal?: number; sugarG?: number}}
  | {part: 'drink-energy'; data: HealthData; date: string; foodKcal: number | null};
const WaterMore = lazy(() => import('./water-more'));
const DrinkFields = lazy(() => import('./drink-fields'));
const DrinkEnergyLine = lazy(() => import('./drink-fields').then(m => ({default: m.DrinkEnergyLine})));
export default function HealthR3(props: HealthR3Props) {
  if (props.part === 'water-more') return <WaterMore data={props.data} date={props.date} perform={props.perform}/>;
  if (props.part === 'drink-fields') return <DrinkFields handle={props.handle} initial={props.initial}/>;
  if (props.part === 'drink-energy') return <DrinkEnergyLine data={props.data} date={props.date} foodKcal={props.foodKcal}/>;
  return null;
}
