'use client';
import {useMemo} from 'react';
import {meditationTrack} from '../../../lib/ai/local-answers/exact/health';
import type {HealthData} from '../../../lib/health';
import {HealthDays} from '../cards/ax/health-kit';
import type {AxProps} from '../cards/ax/kit';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family 1): "Meditation days" — the days with a meditation session as a month calendar, lit; today ringed. The period is the question's
 * (`period`), else this month. Every day is the exact layer's own track (lib/ai/local-answers/exact/health.ts), so the
 * calendar and the sentence count one thing. Behind the Health switches (`HealthSource`). Read only.
 */
export default function MeditationDays({size, params}: AxProps) {
  return <HealthSource id="meditation-days">{(health, day) => <Days health={health} day={day} size={size} params={params}/>}</HealthSource>;
}
function Days({health, day, size, params}: {health: HealthData; day: string} & AxProps) {
  const track = useMemo(() => meditationTrack(health, day), [health, day]);
  return <HealthDays kind="meditation-days" track={track} today={day} size={size} params={params} title="No meditation logged yet" href="/app/health?view=meditation" action="Go to Meditation">Time a session or log one on Health and the days you sat show here.</HealthDays>;
}
