import {z} from 'zod';
import Decimal from 'decimal.js';
import {holdings as portfolioHoldings, portfolioTotals, validHistory, valueHolding} from '../../portfolio/math';
import {coinKey, type Portfolio} from '../../portfolio/schema';
import {ASSET_CLASSES, type SOURCE_TYPES} from '../../positions';
import {wealthOverview} from '../../wealth';
import {moneyText, unitsText} from '../context/builders';
import type {ToolEnv} from './env';
import {capRows, ok, plural, provenance, refuse, text} from './format';
import {matchByName} from './subjects';
import {NO_ARGS, type ToolDefinition} from './types';

/**
 * Wealth tools (Session V Part 2): tracked holdings as Wealth shows them (`wealthOverview`), Portfolio apart from Wealth
 * and labelled Real or Hypothetical, staking as a watch-only view. One total per currency, never converted; a holding
 * without a price says "no price", never 0; every price carries its source and the time it was observed. No account,
 * network, address, denomination or note ever leaves these tools, and nothing here can buy, sell, stake or move funds.
 */
const SOURCE_WORDS: Record<(typeof SOURCE_TYPES)[number], string> = {
  WALLET_LIQUID: 'in a wallet', NATIVE_STAKING: 'staked', NATIVE_UNBONDING: 'unbonding', NATIVE_REWARDS: 'staking rewards', GOAL_MANAGER: 'held for a goal',
  MANUAL: 'entered by hand', LIQUID_STAKING: 'liquid staking', VAULT: 'in a vault', EXTERNAL_ACCOUNT: 'external account', IBC: 'bridged (IBC)', EVM: 'EVM account',
  RWA: 'real-world asset', OTHER_VERIFIED_PROVIDER: 'other verified provider',
};
const STAKING = new Set(['NATIVE_STAKING', 'NATIVE_UNBONDING', 'NATIVE_REWARDS', 'LIQUID_STAKING']);
type OverviewRow = ReturnType<typeof wealthOverview>['rows'][number];
const where = (env: ToolEnv, journal: string, subject: string | null) => provenance(env, journal, subject, null, null);
const valueText = (row: OverviewRow) => row.value === undefined ? 'no price' : `${moneyText(row.value)} ${row.currency ?? ''}`.trim();
function holdingRow(row: OverviewRow) {
  const p = row.position;
  return {asset: text(p.asset, 20), quantity: unitsText(p.quantity, p.decimals), class: row.assetClass, held: SOURCE_WORDS[p.sourceType], liquidity: p.liquidity.toLowerCase(), value: valueText(row), valuation: row.valuationState, priceSource: row.source ? text(row.source, 60) : 'none', valuedAt: row.valuedAt ?? 'unknown'};
}
function totalsOf(rows: readonly OverviewRow[]) {
  const currencies = [...new Set(rows.flatMap(r => r.currency && r.value !== undefined ? [r.currency] : []))];
  const totals = currencies.map(currency => { const members = rows.filter(r => r.currency === currency && r.value !== undefined); return {currency, total: moneyText(members.reduce((n, r) => n + r.value!, 0n)), holdings: members.length}; });
  const unpriced = rows.filter(r => r.value === undefined).length;
  return {totals, unpriced, note: [currencies.length > 1 ? 'One total per currency: totals in different currencies are never added or converted.' : '', unpriced ? `${plural(unpriced, 'holding')} without a price ${unpriced === 1 ? 'is' : 'are'} not counted, so no total is complete.` : ''].filter(Boolean).join(' ') || 'Every holding has a value.'};
}

export const holdingsTool: ToolDefinition<{asset?: string; asset_class?: (typeof ASSET_CLASSES)[number]}> = {
  name: 'holdings', title: 'Holdings', area: 'wealth',
  description: 'The holdings tracked in Wealth (optionally one asset or one asset class): quantity, how it is held, liquidity, value with its price source and the time the price was observed, plus totals per currency.',
  parameters: {type: 'object', properties: {asset: {type: 'string', description: 'One asset symbol or name, such as ZIG or BTC.'}, asset_class: {type: 'string', enum: ASSET_CLASSES, description: 'One asset class.'}}},
  args: z.object({asset: z.string().trim().min(1).max(40).optional(), asset_class: z.enum(ASSET_CLASSES).optional()}),
  label: args => `Holdings${args.asset ? ` · ${text(args.asset, 20)}` : ''}${args.asset_class ? ` · ${args.asset_class}` : ''}`,
  run(args, env, label) {
    const overview = wealthOverview(env.platform, env.now.getTime(), env.quotes);
    let rows = overview.rows.filter(r => !args.asset_class || r.assetClass === args.asset_class);
    if (args.asset) {
      const wanted = args.asset.trim().toLowerCase(), exact = rows.filter(r => r.position.asset.toLowerCase() === wanted);
      rows = exact.length ? exact : rows.filter(r => matchByName([r], args.asset!, x => x.position.asset, x => x.position.id).kind === 'one');
      if (!rows.length) return ok('holdings', label, where(env, 'Wealth', text(args.asset, 20)), {holdings: [], note: `No tracked holding of ${text(args.asset, 20)}.`});
    }
    const capped = capRows(rows.map(holdingRow), env, false);
    return ok('holdings', label, where(env, 'Wealth', args.asset ? text(args.asset, 20) : null), {holdings: capped.rows, count: rows.length, ...totalsOf(rows), ...(rows.length ? {} : {note: 'No holdings tracked yet.'})}, capped.truncated);
  },
};

export const totalsPerCurrency: ToolDefinition<Record<string, never>> = {
  name: 'totals_per_currency', title: 'Wealth totals', area: 'wealth',
  description: 'The tracked wealth totals, one per currency and never converted: how much is held for goals and how much is not, how many holdings have no price, and where each price came from and when.',
  parameters: {type: 'object', properties: {}},
  args: NO_ARGS,
  label: () => 'Wealth totals',
  run(_args, env, label) {
    const overview = wealthOverview(env.platform, env.now.getTime(), env.quotes);
    const prices = new Map<string, {source: string; observed: string[]; stale: number}>();
    for (const r of overview.rows) if (r.value !== undefined) { const key = r.source ?? 'unknown source', e = prices.get(key) ?? {source: key, observed: [], stale: 0}; if (r.valuedAt) e.observed.push(r.valuedAt); if (r.valuationState === 'stale') e.stale++; prices.set(key, e); }
    return ok('totals_per_currency', label, where(env, 'Wealth', null), {
      totals: overview.subtotals.map(s => ({currency: s.currency, total: moneyText(s.value), heldForGoals: moneyText(s.allocated), notHeldForGoals: moneyText(s.unallocated)})),
      holdings: overview.rows.length, withoutPrice: overview.rows.filter(r => r.value === undefined).length,
      prices: [...prices.values()].map(p => ({source: text(p.source, 60), observed: p.observed.length ? `${p.observed.sort()[0]} to ${p.observed.at(-1)}` : 'unknown', ...(p.stale ? {stale: plural(p.stale, 'price')} : {})})),
      note: overview.incomplete ? 'Some values are unknown or in more than one currency, so no single total is complete; totals are never converted.' : 'One total per currency, never converted.',
    });
  },
};

function portfolioRow(env: ToolEnv, p: Portfolio) {
  const kind = p.kind === 'real' ? 'Real' : 'Hypothetical', priceOf = env.portfolio!.priceOf;
  if (!validHistory(p)) return {portfolio: text(p.name, 60), kind, currency: p.currency, note: 'Its history needs review in Portfolio.'};
  const totals = portfolioTotals(p, coin => priceOf(coin, p.currency)?.price), coins = [...portfolioHoldings(p).values()].filter(h => !new Decimal(h.quantity).isZero());
  return {
    portfolio: text(p.name, 60), kind, currency: p.currency, coinsHeld: totals.held,
    value: totals.held === 0 ? '0' : totals.unpriced === totals.held ? 'unknown: no prices' : `${new Decimal(totals.knownValue).toDecimalPlaces(2).toFixed()} ${p.currency}${totals.unpriced ? ` (${plural(totals.unpriced, 'coin')} without a price not counted)` : ''}`,
    cost: totals.costKnown ? `${new Decimal(totals.cost).toDecimalPlaces(2).toFixed()} ${p.currency}` : 'unknown (a transfer without a price)',
    ...(totals.unrealized !== undefined ? {unrealized: `${new Decimal(totals.unrealized).toDecimalPlaces(2).toFixed()} ${p.currency}${totals.unrealizedPct ? ` (${new Decimal(totals.unrealizedPct).toDecimalPlaces(1).toFixed()}%)` : ''}`} : {}),
    coins: coins.slice(0, env.limits.rows).map(h => {
      const meta = p.coins.find(c => coinKey(c.ref) === h.coin), price = priceOf(h.coin, p.currency), value = valueHolding(h, price?.price);
      return {coin: text(meta?.symbol ?? meta?.name ?? 'coin', 20), quantity: h.quantity, price: price ? `${price.price} ${p.currency} (${text(price.source, 40)}${price.observedAt ? `, observed ${price.observedAt}` : ''})` : 'no price', value: value.value ? `${new Decimal(value.value).toDecimalPlaces(2).toFixed()} ${p.currency}` : 'unknown'};
    }),
  };
}
export const portfoliosTool: ToolDefinition<{kind?: 'real' | 'hypothetical'}> = {
  name: 'portfolios', title: 'Portfolios', area: 'wealth',
  description: 'The person\'s portfolios, separate from Wealth and labelled Real or Hypothetical: coins held, value in the portfolio\'s own currency from prices with their source and time, cost and unrealized result when known.',
  parameters: {type: 'object', properties: {kind: {type: 'string', enum: ['real', 'hypothetical'], description: 'Only real or only hypothetical portfolios.'}}},
  args: z.object({kind: z.enum(['real', 'hypothetical']).optional()}),
  label: args => args.kind ? `${args.kind === 'real' ? 'Real' : 'Hypothetical'} portfolios` : 'Portfolios',
  run(args, env, label) {
    if (!env.portfolio) return refuse('portfolios', label, 'not-found', 'Portfolio is not available here; open Wealth → Portfolio.');
    const rows = env.portfolio.data.portfolios.filter(p => !args.kind || p.kind === args.kind).map(p => portfolioRow(env, p));
    const capped = capRows(rows, env, false);
    return ok('portfolios', label, where(env, 'Portfolio', null), {portfolios: capped.rows, count: rows.length, note: 'Portfolio is separate from Wealth; each portfolio stays in its own currency and none is added to another.'}, capped.truncated);
  },
};

export const stakingWatch: ToolDefinition<Record<string, never>> = {
  name: 'staking_watch', title: 'Staking', area: 'wealth',
  description: 'A watch-only view of staking holdings tracked in Wealth: staked, unbonding, rewards and liquid staking, with the validator\'s public name and value when known. ZIGi cannot stake, unstake or claim.',
  parameters: {type: 'object', properties: {}},
  args: NO_ARGS,
  label: () => 'Staking (watch-only)',
  run(_args, env, label) {
    const rows = wealthOverview(env.platform, env.now.getTime(), env.quotes).rows.filter(r => STAKING.has(r.position.sourceType));
    const data = rows.map(r => ({...holdingRow(r), ...(r.position.validator?.name ? {validator: text(r.position.validator.name, 60)} : {})}));
    const capped = capRows(data, env, false);
    return ok('staking_watch', label, where(env, 'Wealth', 'staking'), {staking: capped.rows, count: rows.length, ...totalsOf(rows), watchOnly: 'Read-only: ZIGoals and ZIGi never stake, unstake, claim or move funds.'}, capped.truncated);
  },
};

export const WEALTH_TOOLS = [holdingsTool, totalsPerCurrency, portfoliosTool, stakingWatch] as const;
