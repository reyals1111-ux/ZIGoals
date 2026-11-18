'use client';
import {useMemo} from 'react';
import {fastingWindows} from '../../../lib/nova/cards/ax/health-stages';
import {useFasting} from '../../health/use-fasting';
import {AxhKey, HealthEmpty, HealthFrame} from '../cards/ax/health-kit';
import {AxhFasts} from '../cards/ax/health-stages';
import type {AxProps} from '../cards/ax/kit';
import {HoloReading, HoloUnread} from '../holo/parts';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: stage bars): "Fasting windows" — the last fasts as upright bars of their hours,
 * each with its own target as a dashed mark across it; a fast that reached its target wears a lit cap, and a fast that is
 * running is a dashed bar filled to its share so far (the clock moves with the page's own minute tick, not an animation).
 * The figure is the last fast's hours. Hours and a target only, as the fasting timer itself: no streak, no "longest", no
 * judgement (Health's timer through the page's own hook; figures in lib/nova/cards/ax/health-stages.ts and
 * lib/nova/cards/health-more.ts). It starts and stops nothing. Behind the Health switches: the fasts are read only once
 * they are open. Read only.
 */
export default function FastingWindows({size}: AxProps) {
  return <HealthSource id="fasting-windows">{(_health, day) => <Fasts day={day} size={size}/>}</HealthSource>;
}
function Fasts({day, size}: {day: string} & AxProps) {
  const store = useFasting();
  const view = useMemo(() => { if (!store.loaded || store.unreadable) return null; try { return fastingWindows(store.data, store.now, day); } catch { return null; } }, [store.loaded, store.unreadable, store.data, store.now, day]);
  if (!store.loaded) return <HoloReading/>;
  if (!view) return <HoloUnread what="Your fasts"/>;
  if (view.card.state === 'empty') return <HealthEmpty size={size} ghost="columns" title="No fast logged yet" href="/app/health#fasting" action="Go to the fasting timer">Start a fast on Health, or ask NOVA “start a 16 hour fast” for a card to confirm. Its hours show here against its target.</HealthEmpty>;
  return <HealthFrame kind="fasting-windows" size={size} words={view.words} extra={<AxhKey items={[['fast', 'Hours fasted'], ['target', 'That fast’s target'], ['reached', 'Target reached']]}/>}>
    <AxhFasts view={view}/>
  </HealthFrame>;
}
