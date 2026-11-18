'use client';
import {useMemo} from 'react';
import type {HealthData} from '../../../lib/health';
import {bodyScan, bodyWords} from '../../../lib/nova/cards/ax/health-scan';
import {AxhKey, HealthEmpty, HealthFrame} from '../cards/ax/health-kit';
import {AxhBody} from '../cards/ax/health-scan';
import type {AxProps} from '../cards/ax/kit';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: scanners): "Body scan" — the latest body measurements on a simple figure outline:
 * chest, arm, waist, hips and thigh (Health's tape measurements, lib/body-measurements.ts) and the latest weigh-in, each
 * with its value in its own unit and its day; a tape line is lit where a place was measured and dim and dashed where it
 * never was. The figure is the newest measurement, with its change since the first one of that place in words. Nothing
 * is judged, and a place never measured says so (never a zero). Behind the Health switches. Read only.
 */
export default function BodyScan({size}: AxProps) {
  return <HealthSource id="body-scan">{(health, day) => <Scan health={health} day={day} size={size}/>}</HealthSource>;
}
function Scan({health, day, size}: {health: HealthData; day: string} & AxProps) {
  const view = useMemo(() => bodyScan(health, day), [health, day]);
  const words = useMemo(() => bodyWords(view), [view]);
  if (!view.recorded) return <HealthEmpty size={size} ghost="rows" title="No measurements yet" href="/app/health?view=weight" action="Add a measurement">Add a weigh-in or a tape measurement on Health and each place shows here with its day.</HealthEmpty>;
  return <HealthFrame kind="body-scan" size={size} words={words} extra={<AxhKey items={[['tape', 'Measured here'], ['untaped', 'Not measured yet']]}/>}>
    <AxhBody view={view}/>
  </HealthFrame>;
}
