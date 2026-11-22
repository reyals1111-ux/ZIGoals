'use client';
import {lazy} from 'react';
import type {Sleep} from '../../../lib/sleep/schema';
import type {SleepStore} from '../sleep/use-sleep';

/**
 * Session AV lane 2, round 4 (health; Pillow, Runna, Noom; LEDGER #328–#337): one lazy entry for this round's Health parts,
 * so a page carries a single small import for them (Health's weight budget, scripts/weight-budgets.json). Each part loads
 * its own code only where it is shown.
 */
export type HealthR4Props =
  | {part: 'sleep-timing'; sleep: Sleep; today: string}
  | {part: 'sleep-tip'; today: string}
  | {part: 'nap-timer'; store: SleepStore};
const SleepTiming = lazy(() => import('./sleep-parts').then(m => ({default: m.SleepTiming})));
const SleepTipCard = lazy(() => import('./sleep-parts').then(m => ({default: m.SleepTipCard})));
const NapTimer = lazy(() => import('./sleep-parts').then(m => ({default: m.NapTimer})));
export default function HealthR4(props: HealthR4Props) {
  if (props.part === 'sleep-timing') return <SleepTiming sleep={props.sleep} today={props.today}/>;
  if (props.part === 'sleep-tip') return <SleepTipCard today={props.today}/>;
  if (props.part === 'nap-timer') return <NapTimer store={props.store}/>;
  return null;
}
