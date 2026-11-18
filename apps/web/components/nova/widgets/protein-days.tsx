'use client';
import {useMemo} from 'react';
import {proteinTrack} from '../../../lib/ai/local-answers/exact/health';
import type {HealthData} from '../../../lib/health';
import {HealthDays} from '../cards/ax/health-kit';
import type {AxProps} from '../cards/ax/kit';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family 1): "Protein by day" — the protein target as a month calendar: the days below it half-lit, the days with no food logged unlit and dashed (unknown, never zero). Without a target it lights the days food was logged. The period is the question's
 * (`period`), else this month. Every day is the exact layer's own track (lib/ai/local-answers/exact/health.ts), so the
 * calendar and the sentence count one thing. Behind the Health switches (`HealthSource`). Read only.
 */
export default function ProteinDays({size, params}: AxProps) {
  return <HealthSource id="protein-days">{(health, day) => <Days health={health} day={day} size={size} params={params}/>}</HealthSource>;
}
function Days({health, day, size, params}: {health: HealthData; day: string} & AxProps) {
  const track = useMemo(() => proteinTrack(health, day), [health, day]);
  return <HealthDays kind="protein-days" track={track} today={day} size={size} params={params} title="No food logged yet" href="/app/health?view=diary" action="Log a meal">Log what you eat on Health and your days show here, against your own protein target.</HealthDays>;
}
