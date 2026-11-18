'use client';
import {useMemo} from 'react';
import type {HealthData} from '../../../lib/health';
import {periodLabel} from '../../../lib/nova/cards/ax/calendar';
import {sleepTimes} from '../../../lib/nova/cards/ax/health-stages';
import {emptySleep} from '../../../lib/sleep/schema';
import {healthGroupIn} from '../../../lib/vault/w-homes';
import {AxhKey, HealthEmpty, HealthFrame} from '../cards/ax/health-kit';
import {AxhTimes} from '../cards/ax/health-stages';
import type {AxProps} from '../cards/ax/kit';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: stage bars): "Bedtime and wake time" — each night as a floating bar from the time
 * the person went to bed to the time they got up, on a 24-hour scale that runs from noon to noon (so a night around
 * midnight is one bar), with the person's own bedtime window as a faint band where one is set. The figure is the average
 * bedtime; the average wake time is beside it. The times are the Sleep view's own (lib/sleep/engine.ts `dailySeries`,
 * in the zone each night was lived in). The period is the question's (`period`), else the last 7 days. A day without a
 * night has no bar. Behind the Health switches. Read only.
 */
export default function SleepTimes({size, params}: AxProps) {
  return <HealthSource id="sleep-times">{(health, day) => <Times health={health} day={day} size={size} params={params}/>}</HealthSource>;
}
function Times({health, day, size, params}: {health: HealthData; day: string} & AxProps) {
  const sleep = healthGroupIn(health, 'sleep');
  const view = useMemo(() => sleepTimes(sleep ?? emptySleep(), params?.period, day), [sleep, params?.period, day]);
  if (!sleep?.nights.length) return <HealthEmpty size={size} ghost="columns" title="No nights logged yet" href="/app/health?view=sleep" action="Log a night">Log a night on Health and your bedtimes and wake times show here, night by night.</HealthEmpty>;
  if (!view.logged) return <HealthEmpty size={size} ghost="columns" title="No night in this period" href="/app/health?view=sleep" action="Log a night">{`No night is logged ${periodLabel(view.period, day)}.`}</HealthEmpty>;
  return <HealthFrame kind="sleep-times" size={size} words={view.words} extra={<AxhKey items={[['night', 'In bed, from bedtime to wake time'], ...(view.window ? [['window', `Your bedtime window, ${view.window.text}`] as const] : [])]}/>}>
    <AxhTimes view={view}/>
  </HealthFrame>;
}
