'use client';
import {useMemo} from 'react';
import type {HealthData} from '../../../lib/health';
import {healthVitals, scanWords} from '../../../lib/nova/cards/ax/health-scan';
import {useWorkouts} from '../../health/workouts/use-workouts';
import {AxhFacts, HealthEmpty, HealthFrame} from '../cards/ax/health-kit';
import {AxhScan} from '../cards/ax/health-scan';
import type {AxProps} from '../cards/ax/kit';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: scanners): "Health scan" — the answer to "how is my health" drawn: a neon heart
 * beside the vitals the records hold right now — last night's sleep, today's steps and water, the latest weight, and the
 * latest resting heart rate only where one was ever recorded — each on its own card with its own day and the person's
 * own target. They are the tracks the sentence reads (lib/ai/local-answers/exact/health.ts `healthScan`; figures in
 * lib/nova/cards/ax/health-scan.ts). Facts only: no score, no grade, no judgement. A measure with nothing recorded is an
 * unlit dashed card that says so, never a zero.
 *
 * The heart is decoration and is named so (`role="img"`, "Decorative heart, not a live measurement"): it beats by scale
 * and a scanner line crosses it, and neither is driven by any record. Behind the Health switches. Read only.
 */
export default function HealthScan({size}: AxProps) {
  return <HealthSource id="health-scan">{(health, day) => <Scan health={health} day={day} size={size}/>}</HealthSource>;
}
function Scan({health, day, size}: {health: HealthData; day: string} & AxProps) {
  // The workout log adds one fact; the scan stands without it (not read yet, or unreadable: the fact is left out).
  const log = useWorkouts(), workouts = log.loaded && !log.unreadable ? log.data : null;
  const view = useMemo(() => healthVitals(health, workouts, day), [health, workouts, day]);
  const words = useMemo(() => scanWords(view), [view]);
  if (!view.recorded) return <HealthEmpty size={size} ghost="rows" title="Nothing on record for today yet" href="/app/health" action="Log on Health">Log a night, steps, water or a weigh-in on Health and each shows here with its own day.</HealthEmpty>;
  const heart = view.vitals.some(v => v.key === 'heart');
  return <HealthFrame kind="health-scan" size={size} words={words}
    extra={<AxhFacts rows={[...(view.workoutsThisWeek === null ? [] : [['Days with a workout this week', String(view.workoutsThisWeek)] as const]), ...(heart ? [] : [['Resting heart rate', 'none recorded'] as const])]}/>}>
    <AxhScan vitals={view.vitals}/>
  </HealthFrame>;
}
