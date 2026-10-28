import {latestHabitRule} from '../habits';
import {exerciseData} from '../health-counters';
import {dailyData} from '../health-daily';
import type {ToolEnv} from '../ai/tools/env';
import {summaries} from '../ai/tools/goals';
import type {QuickLogContext} from './multi';

/**
 * Session AI (J10): the one line's context from ZIGi's device environment: the active habits and their measures, the
 * exercise counters, the person's water and weight units, the goals' names, their own foods' names, and whether the
 * expense log is there. Health's own records (units, counters, foods) are read only while Health is shared with ZIGi;
 * a Health item still gets its card otherwise, because a quick line reads nothing and writes only when the person adds
 * the card, exactly as Quick add does (the defaults fill in: millilitres, kilograms, no foods of their own).
 */
export function quickLogContext(env: ToolEnv, {expenses = false}: {expenses?: boolean} = {}): QuickLogContext {
  const health = env.health, preferences = health ? dailyData(health).preferences : null;
  return {
    habits: env.habits.habits.filter(h => latestHabitRule(h).state === 'active').map(h => { const rule = latestHabitRule(h); return {id: h.id, title: h.title, unit: 'unit' in rule.measurement ? rule.measurement.unit : 'done', kind: rule.measurement.kind, target: rule.target}; }),
    counters: health ? exerciseData(health).counters.map(c => ({id: c.id, name: c.name})) : [],
    waterUnit: preferences?.waterUnit ?? 'ml', weightUnit: preferences?.weightUnit ?? 'kg',
    goals: env.areas.goals ? summaries(env).filter(g => g.status !== 'closed').map(g => g.name) : [],
    foods: health ? health.foods.map(f => f.name) : [],
    expenses, now: env.now, health: true,
  };
}
