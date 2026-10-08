import * as z from 'zod';
import {formatUnits, TESTNET} from '@zigoals/chain-config';
import {habitRuleOn, type HabitRule} from '../../habits';
import {goalTimeline} from '../../goal-intelligence';
import {formatHealthGrams} from '../../health';
import type {ToolEnv} from './env';
import {capRows, ok, provenance, refuse, text} from './format';
import {parseRange} from './range';
import type {ToolDefinition} from './types';

/**
 * Recent activity (Session V Part 2): the same events the Activity page lists (goal contributions and changes, Wealth
 * asset events, habit check-ins, Health entries), newest first, each only when its area is readable for this purpose.
 * Health entries, and habit check-ins a Health link filled in, are left out entirely when the Health gate is closed.
 */
/** The habit engine's own rule for one check-in (lib/habits.ts `individualSuccess`): build reaches the target, quit and limit stay within it. */
const success = (rule: HabitRule, count: number) => rule.type === 'build' ? count >= rule.target : count <= rule.target;
const CATEGORIES = ['all', 'goals', 'wealth', 'habits', 'health'] as const;
type Event = {at: string; area: 'goals' | 'wealth' | 'habits' | 'health'; title: string; detail: string};
function events(env: ToolEnv): Event[] {
  const out: Event[] = [];
  if (env.areas.goals) {
    for (const g of env.platform.goals) {
      for (const e of goalTimeline(env.platform, g.id)) if (!['valuation', 'observation'].includes(e.kind)) out.push({at: e.at, area: 'goals', title: e.label, detail: [text(g.name, 60), e.quantity ? `${formatUnits(e.quantity, e.decimals ?? g.decimals)} ${text(e.asset ?? '', 20)}` : ''].filter(Boolean).join(' · ')});
      out.push({at: g.createdAt, area: 'goals', title: 'Goal created', detail: text(g.name, 60)});
    }
    for (const a of env.localActivity ?? []) out.push({at: a.timestamp, area: 'goals', title: a.action, detail: [text(env.metadata[a.goalId]?.name ?? `Goal #${a.goalId}`, 60), /^\d+$/.test(a.amount) && a.amount !== '0' ? `${formatUnits(a.amount, TESTNET.nativeAsset.decimals)} ZIG (local simulation)` : ''].filter(Boolean).join(' · ')});
  }
  if (env.areas.wealth) for (const e of env.platform.assetEvents) out.push({at: e.at, area: 'wealth', title: `${text(e.name, 60)} ${e.kind}`, detail: e.assetClass});
  if (env.areas.habits) {
    for (const habit of env.habits.habits) for (const entry of habit.entries) {
      if (entry.disposition !== 'logged') continue;
      const rule = habitRuleOn(habit, entry.date);
      if (!rule || (rule.type === 'build' && entry.count <= 0)) continue;
      if (entry.source === 'health' && !env.health) continue;
      out.push({at: entry.updatedAt, area: 'habits', title: text(habit.title, 60), detail: `${entry.date} · ${entry.count} / ${rule.target} ${success(rule, entry.count) ? 'completed' : 'logged'}`});
    }
  }
  if (env.health && env.areas.health) {
    for (const e of env.health.diary) out.push({at: e.updatedAt, area: 'health', title: `${e.meal} logged`, detail: `${text(e.snapshot.name, 60)} · ${e.date}`});
    for (const w of env.health.weights) out.push({at: w.updatedAt, area: 'health', title: 'Weight recorded', detail: `${formatHealthGrams(w.grams)} kg · ${w.date}`});
    for (const a of env.health.activity) out.push({at: a.updatedAt, area: 'health', title: text(a.name, 60), detail: `${a.steps} steps · ${a.minutes} min · ${a.date}`});
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}
export const recentActivity: ToolDefinition<{area?: (typeof CATEGORIES)[number]; range?: string}> = {
  name: 'recent_activity', title: 'Activity', area: 'today',
  description: 'The person\'s recent activity as the Activity page lists it, newest first: goal contributions and changes, Wealth asset events, habit check-ins and (only when Health is shared) Health entries.',
  parameters: {type: 'object', properties: {area: {type: 'string', enum: CATEGORIES, description: 'Only one area (default all).'}, range: {type: 'string', description: 'A period such as "today", "this week" or "the last 7 days". Default: the last 7 days.'}}},
  args: z.object({area: z.enum(CATEGORIES).optional(), range: z.string().trim().max(80).optional()}),
  label: args => `Activity${args.area && args.area !== 'all' ? ` · ${args.area}` : ''} · ${args.range?.trim() || 'the last 7 days'}`,
  run(args, env, label) {
    const range = parseRange(args.range?.trim() || 'the last 7 days', env.habitDay);
    if (!range.ok) return refuse('recent_activity', label, 'range', range.message);
    if (args.area === 'health' && !env.health) return refuse('recent_activity', label, 'gate', 'Health isn’t shared with ZIGi — turn it on in Settings → ZIGi · your AI (Include Health), with Health on Today.');
    // Events carry instants; the range is compared on their UTC day (the Activity page groups by the device's day).
    const rows = events(env).filter(e => (!args.area || args.area === 'all' || e.area === args.area) && e.at.slice(0, 10) >= range.from && e.at.slice(0, 10) <= range.to)
      .map(e => ({at: e.at.slice(0, 16).replace('T', ' '), area: e.area, title: e.title, detail: e.detail}));
    const capped = capRows(rows, env, false);
    return ok('recent_activity', label, provenance(env, 'activity', null, {from: range.from, to: range.to, label: range.label}, 'UTC'), {events: capped.rows, count: rows.length, ...(env.health ? {} : {heldBack: 'Health entries are not included: Health isn\'t shared with ZIGi.'})}, capped.truncated);
  },
};
