'use client';
import {useMemo} from 'react';
import type {HealthData} from '../../../lib/health';
import {periodLabel} from '../../../lib/nova/cards/ax/calendar';
import {moodMap} from '../../../lib/nova/cards/ax/health-heat';
import {healthGroupIn} from '../../../lib/vault/w-homes';
import {AxhMoodMap} from '../cards/ax/health-heat';
import {AxhKey, HealthEmpty, HealthFrame} from '../cards/ax/health-kit';
import type {AxProps} from '../cards/ax/kit';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: heat): "Mood map" — a month of days, each lit by the step of the mood the person
 * kept that evening (the wrap-up's mood, one a day, in its own five words from Hard to Great; Health's `moods`, as
 * "Mood tags" reads them), with a key that names the steps in words. The figure is the days with a mood; the note names
 * the mood kept most often. Counts only: no average, no score, no judgement, and a day without a mood is unlit, never a
 * step. The period is the question's (`period`), else this month.
 *
 * Health switches (ADR-037 Q14, Q16): moods are health-type records. This body reads them only inside `HealthSource`
 * (NOVA's Health permission and the device's Health switch, as components/nova/widgets/mood-tags.tsx), and the notes a
 * person wrote beside a mood are never read here at all. Read only.
 */
export default function MoodMap({size, params}: AxProps) {
  return <HealthSource id="mood-map">{(health, day) => <Moods health={health} day={day} size={size} params={params}/>}</HealthSource>;
}
function Moods({health, day, size, params}: {health: HealthData; day: string} & AxProps) {
  const days = healthGroupIn(health, 'moods')?.days;
  const view = useMemo(() => moodMap(days ?? {}, params?.period, day), [days, params?.period, day]);
  if (!view.any) return <HealthEmpty size={size} ghost="lattice" title="No mood kept yet" href="/app/health" action="Log on Health">Keep a mood in the evening wrap-up and each day lights up here by its own step.</HealthEmpty>;
  if (!view.logged) return <HealthEmpty size={size} ghost="lattice" title="No mood in this period" href="/app/health" action="Log on Health">{`No mood is kept ${periodLabel(view.period, day)}.`}</HealthEmpty>;
  return <HealthFrame kind="mood-map" size={size} words={view.words} extra={<AxhKey items={view.key}/>}>
    <AxhMoodMap view={view}/>
  </HealthFrame>;
}
