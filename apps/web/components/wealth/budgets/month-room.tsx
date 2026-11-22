'use client';
import {useMemo} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {monthKey, monthView} from '../../../lib/budgets/engine';
import {BUDGETS} from '../../../lib/budgets/schema';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {moneyCents} from '../money-tools/format';

/**
 * Session AV (L-7, the rehearsal's Lina): with no weekly budget but monthly budgets by category, the weekly card shows this
 * month's room from them (per currency) and points to "Budgets by category" (#budgets, which a jump unfolds), instead of
 * "No weekly budget". Nothing is written. Its own chunk, loaded only when there is no weekly budget.
 */
export default function MonthRoom({entries, today}: {entries: readonly MoneyEntry[]; today: string}) {
  const budgets = useDeviceRecord(BUDGETS);
  const view = useMemo(() => budgets.loaded ? monthView(entries, budgets.data, monthKey(today), today) : null, [budgets.loaded, budgets.data, entries, today]);
  const [first, ...more] = view?.rows.length ? view.totals : [];
  if (!view || !first) return <><strong>No weekly budget</strong><span className="fine">Set a weekly budget to see your room to spend.</span></>;
  return <>
    <strong>{money(Math.abs(first.left), first.currency)}</strong>
    <span>{first.left >= 0 ? `left of ${money(first.available, first.currency)} in this month's budgets` : `over this month's budgets of ${money(first.available, first.currency)}`}</span>
    {more.map(t => <span key={t.currency} className="fine">{t.left >= 0 ? `${money(t.left, t.currency)} left of ${money(t.available, t.currency)}` : `${money(-t.left, t.currency)} over ${money(t.available, t.currency)}`}</span>)}
    <span className="fine">{view.daysLeft === 1 ? 'Last day of the month' : view.daysLeft ? `${view.daysLeft} days to go` : 'This month'} · no weekly budget set · <a className="text-link" href="#budgets">See budgets by category</a></span>
  </>;
}
const money = (cents: number, currency: string) => moneyCents(cents, currency);
