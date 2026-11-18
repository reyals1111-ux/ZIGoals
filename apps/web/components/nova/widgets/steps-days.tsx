'use client';
import {useMemo} from 'react';
import {stepsTrack} from '../../../lib/ai/local-answers/exact/health';
import type {HealthData} from '../../../lib/health';
import {HealthDays} from '../cards/ax/health-kit';
import type {AxProps} from '../cards/ax/kit';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family 1): "Steps by day" — the step target as a month calendar: the days below it half-lit, the days with nothing logged unlit and dashed (unknown, never zero). Without a target it lights the days steps were logged. The period is the question's
 * (`period`), else this month. Every day is the exact layer's own track (lib/ai/local-answers/exact/health.ts), so the
 * calendar and the sentence count one thing. Behind the Health switches (`HealthSource`). Read only.
 */
export default function StepsDays({size, params}: AxProps) {
  return <HealthSource id="steps-days">{(health, day) => <Days health={health} day={day} size={size} params={params}/>}</HealthSource>;
}
function Days({health, day, size, params}: {health: HealthData; day: string} & AxProps) {
  const track = useMemo(() => stepsTrack(health, day), [health, day]);
  return <HealthDays kind="steps-days" track={track} today={day} size={size} params={params} title="No steps logged yet" href="/app/health?view=activity" action="Log your steps">Log steps on Health and your days show here, against your own target.</HealthDays>;
}
