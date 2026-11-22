'use client';
import {useId, useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import type {Accounts} from '../../lib/accounts/schema';
import {DEBT_PLANNER} from '../../lib/debt-planner/store';
import {centsText} from '../../lib/debt-planner/plan';
import {debtSummary, debtTrend, paidOffDebts} from '../../lib/debt-planner/wealth';
import {formatDate, formatMoney, formatMonth} from '../../lib/visual-format';

/**
 * Session AV lane 2 (money; Undebt.it's top bar, snapshots and progress): at the top of Wealth's "What you owe" — the
 * debt-free month of the kept plan, what was paid down in the last 12 months and this year, a small trend per debt from
 * its balance snapshots, and the debts paid off, with the day. From the person's own balances and payments; a model for
 * the date, not advice. Lazy, in the debts group's own place.
 */
const W = 72, H = 22;
function Spark({points}: {points: readonly {cents: bigint}[]}) {
  if (points.length < 2) return null;
  const vals = points.map(p => Number(p.cents)), max = Math.max(...vals), min = Math.min(...vals), span = max - min || 1;
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${(2 + (W - 4) * i / (vals.length - 1)).toFixed(1)} ${(2 + (H - 4) * (1 - (v - min) / span)).toFixed(1)}`).join(' ');
  return <svg className="debts-spark" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true" focusable="false"><path d={d}/></svg>;
}
export default function DebtsSummary({accounts, today}: {accounts: Accounts; today: string}) {
  const id = useId(), planner = useDeviceRecord(DEBT_PLANNER);
  const rows = useMemo(() => debtSummary(accounts, planner.loaded && !planner.unreadable ? planner.data : null, today), [accounts, planner.loaded, planner.unreadable, planner.data, today]);
  const trends = useMemo(() => accounts.items.filter(a => !a.archivedAt && ['loan', 'mortgage', 'credit-card', 'other-debt'].includes(a.kind)).map(a => ({a, t: debtTrend(a, today)})).filter(x => x.t.points.length > 1), [accounts, today]);
  const paid = useMemo(() => paidOffDebts(accounts, today), [accounts, today]);
  if (!rows.length && !paid.length) return null;
  const m = (c: bigint, cur: string) => formatMoney(centsText(c < 0n ? -c : c), cur);
  return <div className="debts-summary" role="group" aria-labelledby={`${id}-title`}>
    <p id={`${id}-title`} className="eyebrow">YOUR DEBTS AT A GLANCE</p>
    {rows.map(r => <p key={r.currency} className="debts-summary-line"><strong>{m(r.owed, r.currency)}</strong> owed{r.debtFree ? <> · debt-free by <strong>{formatMonth(r.debtFree)}</strong> on {r.planned ? 'your kept plan' : 'the planner’s avalanche plan'}</> : r.owed > 0n ? ' · add each debt’s rate and minimum in the planner to see the debt-free month' : ''}{r.last12 !== null && r.last12 !== 0n ? ` · ${r.last12 > 0n ? 'paid down' : 'up'} ${m(r.last12, r.currency)} in 12 months` : ''}{r.thisYear !== null && r.thisYear !== 0n ? ` · ${r.thisYear > 0n ? 'paid down' : 'up'} ${m(r.thisYear, r.currency)} this year` : ''}</p>)}
    {trends.length > 0 && <ul className="debts-trends" aria-label="Each debt over its last balances">{trends.map(({a, t}) => <li key={a.id}><Spark points={t.points}/><span>{a.name}: {t.change === null ? '' : t.change < 0n ? `down ${m(t.change, a.currency)}` : t.change > 0n ? `up ${m(t.change, a.currency)}` : 'unchanged'} since {formatDate(t.points[0]!.date)}</span></li>)}</ul>}
    {paid.length > 0 && <details className="debts-paid"><summary>Paid off ({paid.length})</summary><ul>{paid.map(p => <li key={p.id}><strong>{p.name}</strong> paid off on {formatDate(p.on)}{p.from ? `, from ${m(p.from, p.currency)}` : ''}</li>)}</ul></details>}
  </div>;
}
