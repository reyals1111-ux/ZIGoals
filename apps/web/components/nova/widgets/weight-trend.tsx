'use client';
import {WeightTrendBody} from '../cards/ax/health-trend';
import type {AxProps} from '../cards/ax/kit';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: trends): "Weight trend" — the weigh-ins of a range as one line with a heart at the
 * newest, the latest weigh-in with its day as the figure, the change since the first weigh-in of the range in words
 * ("Down 1.1 kg since Oct 19") and the person's weight goal as the dashed line where one is set. Every figure is the
 * Weight card's own (lib/nova/cards/weight.ts), which the answer "am I losing weight" reads too. The range is the
 * answer's (`range`), else the one its period reads as (`period`), else the last 30 days. A day without a weigh-in is a
 * gap in the line, never a zero. Behind the Health switches. Read only.
 */
export default function WeightTrend({size, params}: AxProps) {
  return <HealthSource id="weight-trend">{(health, day) => <WeightTrendBody health={health} day={day} size={size} params={params}/>}</HealthSource>;
}
