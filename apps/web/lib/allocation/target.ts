import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {PortfolioDecimal} from '../portfolio/math';
import {allocation} from '../portfolio/performance';
import type {ValuationSnapshot} from '../positions';

/**
 * Session AK (7.4): a target allocation and how far today's mix is from it, TIER 3 (stored format). The targets are
 * the person's own shares (asset classes or single assets → %), in a NEW device-only key, loose and versioned. The
 * current mix is lib/portfolio/performance.ts `allocation()` over the known values, one currency at a time (never
 * converted); an asset without a value has no share and is counted apart. Drift is information, not advice: the
 * page says how far each share is from the person's target, never what to buy or sell.
 */
export const TARGET_ALLOCATION_KEY = 'zigoals:target-allocation:v1';
const percent = z.string().regex(/^\d{1,3}(\.\d{1,2})?$/).refine(v => Number(v) <= 100, 'At most 100 %.');
export const targetAllocationSchema = z.looseObject({
  version: z.literal(1),
  /** Whether the targets name asset classes ("Stocks") or single assets (the asset's key). */
  basis: z.enum(['class', 'asset']),
  targets: z.array(z.looseObject({key: z.string().min(1).max(120), label: z.string().trim().min(1).max(80), percent})).max(50),
  /** How many percentage points either side still count as "within your range". */
  band: z.number().min(1).max(25),
});
export type TargetAllocation = z.infer<typeof targetAllocationSchema>;
export const emptyTargetAllocation = (): TargetAllocation => ({version: 1, basis: 'class', targets: [], band: 5});
export const TARGET_ALLOCATION: DeviceRecordSpec<TargetAllocation> = {key: TARGET_ALLOCATION_KEY, schema: targetAllocationSchema, empty: emptyTargetAllocation};
export const targetSum = (t: Pick<TargetAllocation, 'targets'>) => t.targets.reduce((sum, x) => sum + Math.round(Number(x.percent) * 100), 0) / 100;
/** Sets the targets for a basis (a 0 % target is dropped); the sum may not pass 100 %. */
export function setTargets(record: TargetAllocation, basis: TargetAllocation['basis'], targets: readonly {key: string; label: string; percent: string}[], band = record.band): TargetAllocation {
  const kept = targets.filter(t => Number(t.percent) > 0).map(t => ({key: t.key, label: t.label.slice(0, 80), percent: String(Number(t.percent))}));
  const next = targetAllocationSchema.parse({...record, basis, targets: kept, band});
  if (targetSum(next) > 100) throw Error(`The targets add up to ${targetSum(next)} %, more than 100 %.`);
  return next;
}

/** One holding as the page knows it (from wealthOverview's rows): its class, its key, and its value in cents when known. */
export type HoldingRow = {positionId: string; assetKey: string; assetLabel: string; wealthClass: string; currency?: string; value?: bigint};
/** wealthOverview(...).rows → HoldingRow[] (structural, so this module needs no Wealth import). */
export function holdingRows(rows: readonly {position: {id: string; asset: string; providerId: string; marketRef?: unknown}; wealthClass: string; currency?: string; value?: bigint}[]): HoldingRow[] {
  return rows.map(r => ({positionId: r.position.id, assetKey: r.position.asset.toUpperCase(), assetLabel: r.position.asset, wealthClass: r.wealthClass, ...(r.currency ? {currency: r.currency} : {}), ...(r.value !== undefined ? {value: r.value} : {})}));
}
export type DriftRow = {key: string; label: string; current: number; target?: number; drift?: number; status: 'within' | 'above' | 'below' | 'no-target'; value: string; targetValue?: string};
export type DriftView = {currency: string; total: string; rows: DriftRow[]; unvalued: number; targetTotal: number};
const D = PortfolioDecimal;
/** Per currency: each class's (or asset's) share now, its target, the difference in percentage points and the value the target share would be. */
export function driftByCurrency(holdings: readonly HoldingRow[], record: TargetAllocation): DriftView[] {
  const currencies = [...new Set(holdings.flatMap(h => h.currency && h.value !== undefined ? [h.currency] : []))].sort();
  return currencies.map(currency => {
    const mine = holdings.filter(h => h.currency === currency), groups = new Map<string, {label: string; cents: bigint}>();
    for (const h of mine) {
      if (h.value === undefined) continue;
      const key = record.basis === 'class' ? h.wealthClass : h.assetKey, g = groups.get(key) ?? {label: record.basis === 'class' ? h.wealthClass : h.assetLabel, cents: 0n};
      g.cents += h.value; groups.set(key, g);
    }
    const {slices, total} = allocation([...groups].map(([key, g]) => ({key, label: g.label, value: new D(g.cents.toString()).dividedBy(100).toFixed()})), 1000);
    const rows: DriftRow[] = slices.map(s => ({key: s.key, label: s.label, current: Math.round(s.share * 10000) / 100, status: 'no-target' as const, value: s.value}));
    for (const t of record.targets) if (!rows.some(r => r.key === t.key)) rows.push({key: t.key, label: t.label, current: 0, status: 'no-target', value: '0'});
    for (const r of rows) {
      const t = record.targets.find(x => x.key === r.key);
      if (!t) continue;
      r.target = Number(t.percent); r.drift = Math.round((r.current - r.target) * 100) / 100;
      r.status = Math.abs(r.drift) <= record.band ? 'within' : r.drift > 0 ? 'above' : 'below';
      r.targetValue = new D(total).times(r.target).dividedBy(100).toDecimalPlaces(2).toFixed();
    }
    return {currency, total, rows, unvalued: mine.filter(h => h.value === undefined).length, targetTotal: targetSum(record)};
  });
}

export type Performance = {pct?: string; from?: string; to?: string; reason?: 'no-history' | 'not-market-priced' | 'currency-changed'};
const DAY_MS = 86_400_000;
/** A snapshot's price per unit: its own price, else value ÷ quantity; undefined without either. */
function unitPrice(s: ValuationSnapshot): InstanceType<typeof D> | undefined {
  if (s.price !== undefined && s.priceDecimals !== undefined) return new D(s.price).dividedBy(new D(10).pow(s.priceDecimals));
  if (s.quantity === '0') return undefined;
  return new D(s.value).dividedBy(new D(10).pow(s.decimals)).dividedBy(new D(s.quantity).dividedBy(new D(10).pow(s.quantityDecimals)));
}
/**
 * A market-priced asset's price change over `days` days from the valuation snapshots already stored (no fetch): the
 * latest price against the latest one at least `days` old (within a week of that day, else unknown). Unknown stays
 * unknown; a change of currency between the two is unknown too. An estimate from recorded prices, labelled as such.
 */
export function assetPerformance(snapshots: readonly ValuationSnapshot[], positionId: string, now: number, days: 30 | 90, marketPriced = true): Performance {
  if (!marketPriced) return {reason: 'not-market-priced'};
  const at = (s: ValuationSnapshot) => Date.parse(s.observedAt ?? s.fetchedAt ?? s.capturedAt);
  const mine = snapshots.filter(s => s.positionId === positionId && s.source !== 'MANUAL' && Number.isFinite(at(s)) && at(s) <= now + 60_000).sort((a, b) => at(a) - at(b));
  const latest = mine[mine.length - 1], cutoff = now - days * DAY_MS;
  const then = [...mine].reverse().find(s => at(s) <= cutoff);
  if (!latest || !then || at(then) < cutoff - 7 * DAY_MS || latest === then) return {reason: 'no-history'};
  if (latest.currency !== then.currency) return {reason: 'currency-changed'};
  const a = unitPrice(then), b = unitPrice(latest);
  if (!a || !b || a.isZero()) return {reason: 'no-history'};
  return {pct: b.minus(a).dividedBy(a).times(100).toDecimalPlaces(2).toFixed(), from: then.observedAt ?? then.capturedAt, to: latest.observedAt ?? latest.capturedAt};
}
