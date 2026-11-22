'use client';
import {useMemo} from 'react';
import type {Accounts} from '../../lib/accounts/schema';
import type {NetworthHistory} from '../../lib/networth-history';
import {MAX_MOVERS, networthMovers} from '../../lib/networth-movers';
import {formatDate, formatMonth} from '../../lib/visual-format';
import {moneyCents} from './money-tools/format';

/**
 * Session AV lane 2, round 3 (money; Simplifi, LEDGER #298): "What moved your net worth in <month>" inside Net worth by
 * source: the accounts and sources that moved it most, up or down, each with its amount, per currency
 * (lib/networth-movers.ts). From the balances and the recorded days; facts, not a return and not advice. Its own chunk.
 */
const signed = (cents: number, currency: string) => `${cents < 0 ? '−' : '+'}${moneyCents(Math.abs(cents), currency)}`;
export default function NetworthMovers({accounts, history, today}: {accounts: Accounts | null; history: NetworthHistory | null; today: string}) {
  const rows = useMemo(() => networthMovers(accounts, history, today), [accounts, history, today]), month = formatMonth(today.slice(0, 7));
  return <section className="networth-movers" aria-labelledby="networth-movers-title">
    <h4 id="networth-movers-title">What moved your net worth in {month}</h4>
    {!rows.length ? <p className="fine">Nothing to compare yet. Enter each account&rsquo;s balance once a month (and open Wealth so the day is recorded): this then lists what moved your net worth most since the end of last month.</p>
      : rows.map(r => <div key={r.currency} role="group" aria-label={`What moved your net worth in ${r.currency}`}>
        {r.movers.length > 0 && <>
          <p className="networth-movers-total"><strong data-private-amount>{signed(r.total, r.currency)}</strong> in {r.currency} since the end of last month, from {r.movers.length} {r.movers.length === 1 ? 'account or source' : 'accounts and sources'}.</p>
          <ol className="networth-movers-list">{r.movers.slice(0, MAX_MOVERS).map(m => <li key={`${m.kind}-${m.id}`}>
            <span>{m.name}{m.debt ? <small className="fine"> (a debt: {m.cents < 0 ? 'it grew' : 'it went down'})</small> : null} <small className="fine">{formatDate(m.from)} → {formatDate(m.to)}</small></span>
            <span data-private-amount className={m.cents < 0 ? 'is-down' : 'is-up'}>{signed(m.cents, r.currency)}</span>
          </li>)}</ol>
          {r.movers.length > MAX_MOVERS && <p className="fine">And {r.movers.length - MAX_MOVERS} more that moved it less.</p>}
        </>}
        {r.newThisMonth.length > 0 && <p className="fine">New this month in {r.currency}, so not counted as a move: {r.newThisMonth.join(', ')}.</p>}
      </div>)}
    <p className="fine">Each account by its latest balance at the end of last month and today; Wealth holdings and Portfolio by the days recorded. Never converted; not a return.</p>
  </section>;
}
