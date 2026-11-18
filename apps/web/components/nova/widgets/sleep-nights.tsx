'use client';
import {useMemo} from 'react';
import {sleepTrack} from '../../../lib/ai/local-answers/exact/health';
import type {HealthData} from '../../../lib/health';
import {HealthDays} from '../cards/ax/health-kit';
import type {AxProps} from '../cards/ax/kit';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family 1): "Nights by day" — the sleep goal as a month calendar: a night belongs to the day it ends on; the nights under the goal are half-lit, the days with no night logged unlit and dashed (unknown, never zero). Without a goal it lights the days a night was logged. The period is the question's
 * (`period`), else this month. Every day is the exact layer's own track (lib/ai/local-answers/exact/health.ts), so the
 * calendar and the sentence count one thing. Behind the Health switches (`HealthSource`). Read only.
 */
export default function SleepNights({size, params}: AxProps) {
  return <HealthSource id="sleep-nights">{(health, day) => <Days health={health} day={day} size={size} params={params}/>}</HealthSource>;
}
function Days({health, day, size, params}: {health: HealthData; day: string} & AxProps) {
  const track = useMemo(() => sleepTrack(health, day), [health, day]);
  return <HealthDays kind="sleep-nights" track={track} today={day} size={size} params={params} title="No nights logged yet" href="/app/health?view=sleep" action="Log a night">Log a night on Health and your nights show here, against your own sleep goal.</HealthDays>;
}
