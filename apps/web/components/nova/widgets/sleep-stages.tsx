'use client';
import {useMemo} from 'react';
import type {HealthData} from '../../../lib/health';
import {periodLabel} from '../../../lib/nova/cards/ax/calendar';
import {sleepStages} from '../../../lib/nova/cards/ax/health-stages';
import {emptySleep} from '../../../lib/sleep/schema';
import {healthGroupIn} from '../../../lib/vault/w-homes';
import {AxhKey, HealthEmpty, HealthFrame} from '../cards/ax/health-kit';
import {AxhStages} from '../cards/ax/health-stages';
import type {AxProps} from '../cards/ax/kit';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: stage bars): "Sleep stages" — each night as an upright stacked bar: deep at the
 * foot, then REM, then core, in minutes, where the night holds them (an import or a device link; a night logged by hand
 * holds its times only). A night without stages is an unlit dashed bar at its time asleep: the stages are unknown, never
 * zero. The figure is how many of the period's nights hold stages. The period is the question's (`period`: its newest
 * fourteen nights are drawn), else the last 7 days. Figures in lib/nova/cards/ax/health-stages.ts. Behind the Health
 * switches. Read only.
 */
export default function SleepStages({size, params}: AxProps) {
  return <HealthSource id="sleep-stages">{(health, day) => <Stages health={health} day={day} size={size} params={params}/>}</HealthSource>;
}
function Stages({health, day, size, params}: {health: HealthData; day: string} & AxProps) {
  const sleep = healthGroupIn(health, 'sleep');
  const view = useMemo(() => sleepStages(sleep ?? emptySleep(), params?.period, day), [sleep, params?.period, day]);
  if (!sleep?.nights.length) return <HealthEmpty size={size} ghost="columns" title="No nights logged yet" href="/app/health?view=sleep" action="Log a night">Log a night on Health, or bring nights in from a device, and each shows here with its stages where it has them.</HealthEmpty>;
  if (!view.logged) return <HealthEmpty size={size} ghost="columns" title="No night in this period" href="/app/health?view=sleep" action="Log a night">{`No night is logged ${periodLabel(view.period, day)}.`}</HealthEmpty>;
  return <HealthFrame kind="sleep-stages" size={size} words={view.words} extra={<AxhKey items={[['deep', 'Deep'], ['rem', 'REM'], ['core', 'Core'], ['none', 'Stages not recorded']]}/>}>
    <AxhStages view={view}/>
  </HealthFrame>;
}
