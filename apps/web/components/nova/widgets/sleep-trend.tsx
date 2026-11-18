'use client';
import {HealthTrendBody} from '../cards/ax/health-trend';
import type {AxProps} from '../cards/ax/kit';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: trends): "Sleep trend" — the hours asleep each night as one line against the person’s own sleep goal (a band above the goal line), the average of the period as the figure, the shortest and the longest night pinned. A day without a logged night is a gap in the line, never a zero.
 * The period is the question's (`period`), else the last 30 days. The days are the exact layer's own track
 * (lib/ai/local-answers/exact/health.ts; figures in lib/nova/cards/ax/health-trend.ts). Behind the Health switches. Read only.
 */
export default function SleepTrend({size, params}: AxProps) {
  return <HealthSource id="sleep-trend">{(health, day) => <HealthTrendBody kind="sleep-trend" health={health} day={day} size={size} params={params}/>}</HealthSource>;
}
