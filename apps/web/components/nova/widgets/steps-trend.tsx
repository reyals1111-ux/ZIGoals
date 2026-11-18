'use client';
import {HealthTrendBody} from '../cards/ax/health-trend';
import type {AxProps} from '../cards/ax/kit';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: trends): "Steps trend" — the steps of each day as one line against the person’s own step target (a band above the target line), the day's average as the figure, the lowest and the highest day pinned. A day with nothing logged is a gap in the line, never a zero.
 * The period is the question's (`period`), else the last 30 days. The days are the exact layer's own track
 * (lib/ai/local-answers/exact/health.ts; figures in lib/nova/cards/ax/health-trend.ts). Behind the Health switches. Read only.
 */
export default function StepsTrend({size, params}: AxProps) {
  return <HealthSource id="steps-trend">{(health, day) => <HealthTrendBody kind="steps-trend" health={health} day={day} size={size} params={params}/>}</HealthSource>;
}
