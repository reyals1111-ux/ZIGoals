import * as z from 'zod';
import {byCategory, fromCents, monthOf, roomToSpend, totals, weekOf} from '../../money-log/engine';
import {addLocalDays} from '../../local-date';
import type {ToolEnv} from './env';
import {ok, provenance, text} from './format';
import type {ToolDefinition} from './types';

/**
 * Session AI (feature 5): money questions answered from the person's own expense log — "what did I spend on food this
 * month?", "how much room do I have this week?" — with the same figures as Wealth → Spending: per currency, never
 * converted, by category, with the weekly room to spend when a budget is set. Read-only; nothing here is advice.
 */
const PERIODS = ['this week', 'last week', 'this month', 'last month', 'last 30 days'] as const;
function range(period: (typeof PERIODS)[number], today: string, startsOn: 'monday' | 'sunday'): {from: string; to: string} {
  if (period === 'this week') { const w = weekOf(today, startsOn); return {from: w.start, to: today}; }
  if (period === 'last week') { const w = weekOf(addLocalDays(weekOf(today, startsOn).start, -1), startsOn); return {from: w.start, to: w.end}; }
  if (period === 'this month') return {from: monthOf(today).start, to: today};
  if (period === 'last month') { const m = monthOf(addLocalDays(monthOf(today).start, -1)); return {from: m.start, to: m.end}; }
  return {from: addLocalDays(today, -29), to: today};
}
export const spendingTool: ToolDefinition<{period?: (typeof PERIODS)[number]; category?: string}> = {
  name: 'spending', title: 'Spending', area: 'wealth',
  description: 'What the person logged as spent and received in Wealth → Spending over a period (this week, last week, this month, last month, last 30 days; default this month), optionally one category: totals per currency (never converted), the categories by size, and this week\'s room to spend when they set a weekly budget.',
  parameters: {type: 'object', properties: {period: {type: 'string', enum: [...PERIODS], description: 'The period; this month when absent.'}, category: {type: 'string', description: 'One category, such as Food & drink or Groceries.'}}},
  args: z.object({period: z.enum(PERIODS).optional(), category: z.string().trim().min(1).max(40).optional()}),
  label: args => `Spending · ${args.period ?? 'this month'}${args.category ? ` · ${text(args.category, 30)}` : ''}`,
  run(args, env: ToolEnv, label) {
    const log = env.moneyLog;
    if (!log || !log.entries.length) return ok('spending', label, provenance(env, 'Spending log', null, null, null), {note: 'Nothing is logged in Wealth → Spending yet.'});
    const period = args.period ?? 'this month', {from, to} = range(period, env.habitDay, log.weekStartsOn);
    const wanted = args.category?.toLowerCase(), entries = wanted ? log.entries.filter(e => e.category.toLowerCase().includes(wanted) || (e.note ?? '').toLowerCase().includes(wanted)) : log.entries;
    const room = roomToSpend(log, env.habitDay);
    return ok('spending', label, provenance(env, 'Spending log', null, null, null), {period, from, to,
      totals: totals(entries, from, to).map(t => ({currency: t.currency, spent: `${fromCents(t.expenses)} ${t.currency}`, received: `${fromCents(t.income)} ${t.currency}`, entries: t.count})),
      byCategory: byCategory(entries, from, to).slice(0, 10).map(c => ({category: c.category, spent: `${fromCents(c.total)} ${c.currency}`, entries: c.count})),
      ...(room ? {roomToSpendThisWeek: {budget: `${fromCents(room.budget)} ${room.currency}`, spent: `${fromCents(room.spent)} ${room.currency}`, left: `${fromCents(room.left)} ${room.currency}`, daysLeft: room.daysLeft}} : {}),
      ...(wanted ? {matched: `entries whose category or note mentions "${text(args.category!, 30)}"`} : {}),
      rule: 'the person\'s own entries in Wealth → Spending, per currency, never converted'});
  },
};
export const MONEY_TOOLS = [spendingTool] as const;
