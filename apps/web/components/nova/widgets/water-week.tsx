'use client';
import {WaterWeekBody} from '../cards/ax/health-trend';
import type {AxProps} from '../cards/ax/kit';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: trends): "Water by day" — the last seven days of water as columns against the
 * person's own target (a dashed line), a lit pip over each day that reached it and a ring over today while it is still
 * open; the figure is the days the target was reached, of the logged days that are over. Without a target the figure is
 * the day's average. The period is the question's (`period`: its newest fourteen days are drawn), else the last 7 days.
 * A day with nothing logged is an empty tube, never a zero. Behind the Health switches. Read only.
 */
export default function WaterWeek({size, params}: AxProps) {
  return <HealthSource id="water-week">{(health, day) => <WaterWeekBody health={health} day={day} size={size} params={params}/>}</HealthSource>;
}
