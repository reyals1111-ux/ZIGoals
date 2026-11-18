'use client';
import {HealthTrendBody} from '../cards/ax/health-trend';
import type {AxProps} from '../cards/ax/kit';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: trends): "Calorie trend" — the calories logged each day as one line, the day's average as the figure, the person’s own calorie target as a dashed line (never a band: a calorie target is not a goal to pass). A day with no food logged is a gap in the line, never a zero.
 * The period is the question's (`period`), else the last 30 days. The days are the exact layer's own track
 * (lib/ai/local-answers/exact/health.ts; figures in lib/nova/cards/ax/health-trend.ts). Behind the Health switches. Read only.
 */
export default function CalorieTrend({size, params}: AxProps) {
  return <HealthSource id="calorie-trend">{(health, day) => <HealthTrendBody kind="calorie-trend" health={health} day={day} size={size} params={params}/>}</HealthSource>;
}
