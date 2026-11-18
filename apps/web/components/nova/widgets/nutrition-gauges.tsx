'use client';
import {useMemo} from 'react';
import type {HealthData} from '../../../lib/health';
import {nutritionGauges} from '../../../lib/nova/cards/ax/health-gauges';
import {AxhGauges} from '../cards/ax/health-gauges';
import {AxhFacts, HealthEmpty, HealthFrame} from '../cards/ax/health-kit';
import type {AxProps} from '../cards/ax/kit';
import {HealthSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: gauges): "Nutrition gauges" — today's calories, protein, carbohydrates and fat,
 * each an arc that fills toward the person's own target, with its amount inside (Health's own day summary and targets;
 * figures in lib/nova/cards/ax/health-gauges.ts). A nutrient without a target shows its amount only; one that today's
 * entries do not state is an unlit arc, never a zero; a day over a target is a full arc and says by how much, in words,
 * without calling it wrong. The figure is today's calories. With no food logged today the widget says so and draws no
 * arcs. Behind the Health switches. Read only.
 */
export default function NutritionGauges({size}: AxProps) {
  return <HealthSource id="nutrition-gauges">{(health, day) => <Gauges health={health} day={day} size={size}/>}</HealthSource>;
}
function Gauges({health, day, size}: {health: HealthData; day: string} & AxProps) {
  const view = useMemo(() => nutritionGauges(health, day), [health, day]);
  if (!view.entries) return <HealthEmpty size={size} ghost="arc" title={view.any ? 'No food logged today yet' : 'No food logged yet'} href="/app/health?view=diary" action="Log a meal">Log what you eat on Health and today’s calories, protein, carbs and fat show here against your own targets.</HealthEmpty>;
  return <HealthFrame kind="nutrition-gauges" size={size} words={view.words} extra={<AxhFacts rows={view.gauges.map(g => [g.label, g.words] as const)}/>}>
    <AxhGauges view={view}/>
  </HealthFrame>;
}
