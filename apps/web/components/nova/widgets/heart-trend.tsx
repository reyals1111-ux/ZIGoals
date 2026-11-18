'use client';
import {HealthTrendBody} from '../cards/ax/health-trend';
import type {AxProps} from '../cards/ax/kit';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: trends): "Resting heart rate" — the resting heart rate recorded for each day as one line, the latest record with its own day as the figure. It comes from an import or a device link: with none recorded the widget teaches where one comes from. It is always a record and never a live reading; nothing is judged.
 * The period is the question's (`period`), else the last 30 days. The days are the exact layer's own track
 * (lib/ai/local-answers/exact/health.ts; figures in lib/nova/cards/ax/health-trend.ts). Behind the Health switches. Read only.
 */
export default function HeartTrend({size, params}: AxProps) {
  return <HealthSource id="heart-trend">{(health, day) => <HealthTrendBody kind="heart-trend" health={health} day={day} size={size} params={params}/>}</HealthSource>;
}
