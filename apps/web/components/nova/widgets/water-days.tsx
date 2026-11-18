'use client';
import {useMemo} from 'react';
import {waterTrack} from '../../../lib/ai/local-answers/exact/health';
import type {HealthData} from '../../../lib/health';
import {HealthDays} from '../cards/ax/health-kit';
import type {AxProps} from '../cards/ax/kit';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family 1): "Water by day" — the water target as a month calendar: the days that did not reach it lit (a day with nothing logged is unlit and dashed, unknown and never zero), today ringed while it is still open. Without a target it lights the days water was logged. The period is the question's
 * (`period`), else this month. Every day is the exact layer's own track (lib/ai/local-answers/exact/health.ts), so the
 * calendar and the sentence count one thing. Behind the Health switches (`HealthSource`). Read only.
 */
export default function WaterDays({size, params}: AxProps) {
  return <HealthSource id="water-days">{(health, day) => <Days health={health} day={day} size={size} params={params}/>}</HealthSource>;
}
function Days({health, day, size, params}: {health: HealthData; day: string} & AxProps) {
  const track = useMemo(() => waterTrack(health, day), [health, day]);
  return <HealthDays kind="water-days" track={track} today={day} size={size} params={params} title="No water logged yet" href="/app/health#water" action="Log water">Log water on Health and your days show here, against your own target.</HealthDays>;
}
