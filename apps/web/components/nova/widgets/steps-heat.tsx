'use client';
import {useMemo} from 'react';
import type {HealthData} from '../../../lib/health';
import {stepsHeat} from '../../../lib/nova/cards/ax/health-heat';
import {AxhHeat} from '../cards/ax/health-heat';
import {AxhKey, HealthEmpty, HealthFrame} from '../cards/ax/health-kit';
import type {AxProps} from '../cards/ax/kit';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: heat): "Steps heat" — the last 13 weeks, a column a week and a cell a day, lit in
 * four steps by the day's steps: against the person's own step target where one is set (under half, half or more,
 * reached, a quarter over), else against the highest day shown. A day with nothing logged is an unlit dashed cell
 * (unknown, never the lowest step); today is ringed. The figure is the average of the logged days. The steps are the
 * exact layer's own track (figures in lib/nova/cards/ax/health-heat.ts). It always shows these 13 weeks. Behind the
 * Health switches. Read only.
 */
export default function StepsHeat({size}: AxProps) {
  return <HealthSource id="steps-heat">{(health, day) => <Heat health={health} day={day} size={size}/>}</HealthSource>;
}
function Heat({health, day, size}: {health: HealthData; day: string} & AxProps) {
  const view = useMemo(() => stepsHeat(health, day), [health, day]);
  if (!view.logged) return <HealthEmpty size={size} ghost="lattice" title={health.activity.length ? 'No steps in the last 13 weeks' : 'No steps logged yet'} href="/app/health?view=activity" action="Log your steps">Log steps on Health and each day lights up here, the more steps the brighter.</HealthEmpty>;
  return <HealthFrame kind="steps-heat" size={size} words={view.words} extra={<AxhKey items={view.key}/>}>
    <AxhHeat view={view}/>
  </HealthFrame>;
}
