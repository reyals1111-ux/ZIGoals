import * as z from 'zod';
import {wealthHistory} from '../../wealth';
import {whyChanged} from '../../wealth-why/why-changed';
import {moneyText} from '../context/builders';
import type {ToolEnv} from './env';
import {ok, provenance} from './format';
import type {ToolDefinition} from './types';

/**
 * Session AI (G11, CO6's explainer for ZIGi): "why did my net worth change?" answered from the same recorded wealth
 * history and the same rule the Wealth page's chart uses (`wealthHistory`, `whyChanged`): for each currency, the
 * latest recorded total against the latest one on or before the start of the period, the change, and the asset classes
 * that moved most (at most three), in the order of how much they moved. Only recorded totals are compared; nothing is
 * guessed, converted or projected. Tracked wealth only: accounts and debts are not part of this history (the tool says so).
 */
const RANGE_DAYS = {week: 7, month: 30, year: 365} as const;
export const netWorthChange: ToolDefinition<{period?: keyof typeof RANGE_DAYS}> = {
  name: 'net_worth_change', title: 'Why wealth changed', area: 'wealth',
  description: 'How the person\'s tracked wealth changed over a period (week, month or year; default week) and why: per currency, the recorded total at the start and at the end, the change, and the asset classes that moved most, from the same recorded history and rule as the Wealth page\'s chart. Never converted, never projected.',
  parameters: {type: 'object', properties: {period: {type: 'string', enum: Object.keys(RANGE_DAYS), description: 'The period to compare: week (default), month or year.'}}},
  args: z.object({period: z.enum(['week', 'month', 'year']).optional()}),
  label: args => `Why wealth changed · this ${args.period ?? 'week'}`,
  run(args, env: ToolEnv, label) {
    const period = args.period ?? 'week', days = RANGE_DAYS[period];
    const rows = wealthHistory(env.platform).map(h => {
      const points = h.points.filter(p => Number.isFinite(Date.parse(p.at)) && /^-?\d+$/.test(p.value)).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      if (points.length < 2) return {currency: h.currency, note: 'Fewer than two recorded totals in this currency, so no change to explain yet.'};
      const end = points.at(-1)!, startAt = Date.parse(end.at) - days * 86_400_000;
      const start = [...points].reverse().find(p => Date.parse(p.at) <= startAt) ?? points[0]!;
      if (start === end) return {currency: h.currency, note: 'Only one recorded total in this period.'};
      const why = whyChanged(start, end, 3), money = (v: bigint) => `${moneyText(v)} ${h.currency}`;
      const before = BigInt(start.value), percent = before !== 0n ? `${(Number((why.total * 10_000n) / before) / 100).toFixed(2)}%` : null;
      return {currency: h.currency, from: {at: start.at.slice(0, 10), total: money(before)}, to: {at: end.at.slice(0, 10), total: money(BigInt(end.value))},
        change: `${why.total > 0n ? '+' : ''}${money(why.total)}`, ...(percent ? {changePercent: `${why.total > 0n ? '+' : ''}${percent}`} : {}),
        movedMost: why.moves.map(m => ({assetClass: m.name, change: `${m.delta > 0n ? '+' : ''}${money(m.delta)}`})), ...(why.others ? {otherClassesThatMoved: why.others} : {})};
    });
    return ok('net_worth_change', label, provenance(env, 'Wealth history', null, null, null), {period, currencies: rows,
      rule: 'the latest recorded total against the latest one on or before the start of the period, per currency; the classes that moved most, by how much they moved (the Wealth chart\'s own rule)',
      scope: 'Tracked wealth only (holdings in Wealth); accounts and debts are not in this history. Recorded values, never converted or projected.',
      ...(rows.length ? {} : {note: 'No wealth history recorded yet.'})});
  },
};
export const WHY_TOOLS = [netWorthChange] as const;
