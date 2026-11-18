'use client';
import {useMemo} from 'react';
import type {HealthData} from '../../../lib/health';
import {compareRef, healthCompare} from '../../../lib/nova/cards/ax/health-compare';
import type {Workouts} from '../../../lib/workouts/schema';
import {HealthEmpty, HealthFrame} from '../cards/ax/health-kit';
import type {AxProps} from '../cards/ax/kit';
import {AxTwins} from '../cards/ax/twins';
import {HealthSource, WorkoutsSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: twins): "Health, period by period" — one measure of Health in a period beside the
 * period just before it, as two bars on one scale with the difference in words (never judged): water, steps, sleep,
 * calories, protein, workouts, meditation, weight or resting heart rate (`ref`; steps when none is named). What adds up
 * is a total (water, steps, minutes); a level is a day's average (sleep, weight, heart rate). A period that is still
 * running is set beside the same days of the one before (lib/ai/local-answers/exact/period.ts `previousPeriod`), from
 * the exact layer's own track, so the bars and the sentence count one thing. A side with nothing logged is an unlit
 * dashed bar, never a zero. The period is the question's (`period`), else this week. Behind the Health switches (the
 * workout log is read only for `ref` workouts). Read only.
 */
export default function HealthCompare({size, params}: AxProps) {
  const workouts = compareRef(params?.ref) === 'workouts';
  return <HealthSource id="health-compare">{(health, day) => workouts
    ? <WorkoutsSource id="health-compare">{log => <Twins health={health} workouts={log} day={day} size={size} params={params}/>}</WorkoutsSource>
    : <Twins health={health} workouts={null} day={day} size={size} params={params}/>}</HealthSource>;
}
function Twins({health, workouts, day, size, params}: {health: HealthData; workouts: Workouts | null; day: string} & AxProps) {
  const view = useMemo(() => healthCompare(params?.ref, health, workouts, params?.period, day), [params?.ref, health, workouts, params?.period, day]);
  if (!view.any || (view.now.value === null && view.was.value === null)) return <HealthEmpty size={size} ghost="bars" title={view.any ? 'Nothing logged in these periods' : `${view.name}: nothing logged yet`} href="/app/health" action="Log on Health">{`${view.name} shows here for a period beside the one before it, once something is logged in one of them.`}</HealthEmpty>;
  return <HealthFrame kind="health-compare" size={size} words={view.words}>
    {/* The difference stands beside the figure (the head's note), so the bars do not repeat it. */}
    <AxTwins now={view.now} before={view.was} delta={null}/>
  </HealthFrame>;
}
