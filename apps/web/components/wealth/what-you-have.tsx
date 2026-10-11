'use client';
import Link from 'next/link';
import {useState} from 'react';
import {ACCOUNTS, isDebtKind} from '../../lib/accounts/schema';
import {balanceOn, moneyText} from '../../lib/accounts/net-worth';
import {formatGoalAmount} from '../../lib/goal-summary';
import type {wealthOverview} from '../../lib/wealth';
import {useDeviceRecord} from '../ai/use-device-record';
import type {LayoutAttrs} from '../layout-edit';
import {wealthMoney} from '../platform/wealth-money';
import {KIND_LABEL} from './accounts-section';

/**
 * Session Z-Cloud Part 4.5 (persona item 5): one "What you have" list on Wealth: accounts, assets and debts together, with
 * All · Accounts · Assets · Debts. Presentation only: each row opens where it is managed (an asset's own page, the
 * accounts section), the records and their formats are unchanged, and Portfolio stays the analysis view, linked here.
 * A debt reads as what is owed ("-"), each amount in its own currency, never converted.
 */
type Row = ReturnType<typeof wealthOverview>['rows'][number];
const FILTERS = ['All', 'Accounts', 'Assets', 'Debts'] as const;
type Filter = typeof FILTERS[number];
type Item = {key: string; group: Exclude<Filter, 'All'>; name: string; detail: string; value: string; href: string};
const holdingName = (r: Row) => r.position.providerId === 'native-zig' ? `ZIG ${r.position.sourceType.replaceAll('_', ' ').toLowerCase()}` : r.position.providerId;
// Gate B: the layout's attributes reach the card's own element, so it moves, gets its controls and is counted like the others.
export function WhatYouHave({rows, ...layout}: LayoutAttrs & {rows: readonly Row[]}) {
  const accounts = useDeviceRecord(ACCOUNTS), [filter, setFilter] = useState<Filter>('All');
  const live = accounts.loaded && !accounts.unreadable ? accounts.data.items.filter(a => !a.archivedAt) : [];
  const items: Item[] = [
    ...live.map((a): Item => { const b = balanceOn(a), debt = isDebtKind(a.kind); return {key: `account:${a.id}`, group: debt ? 'Debts' : 'Accounts', name: a.name, detail: `${KIND_LABEL[a.kind]}${b ? ` · ${b.date}` : ''}`, value: b ? `${debt && b.value > 0n ? '-' : ''}${formatGoalAmount(moneyText(b), a.currency)}` : 'No balance yet', href: '#accounts-title'}; }),
    ...rows.map((r): Item => ({key: `asset:${r.position.id}`, group: 'Assets', name: holdingName(r), detail: `${r.position.asset} · ${r.assetClass}`, value: r.value === undefined ? 'Needs valuation' : wealthMoney(r.value, r.currency!), href: `/app/wealth/asset/${encodeURIComponent(r.position.id)}`})),
  ];
  const shown = items.filter(item => filter === 'All' || item.group === filter), count = (f: Filter) => f === 'All' ? items.length : items.filter(i => i.group === f).length;
  return <section {...layout} className="panel what-you-have" aria-labelledby="what-you-have-title">
    <header className="wealth-section-heading"><div><p className="eyebrow">ACCOUNTS · ASSETS · DEBTS</p><h2 id="what-you-have-title">What you have</h2><p>Everything you track, in one list. Portfolio has the analysis.</p></div><Link className="text-link" href="/app/portfolio">Open Portfolio →</Link></header>
    <div className="picker-tabs what-you-have-filters" role="group" aria-label="Show">{FILTERS.map(f => <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f} <span className="what-you-have-count">{count(f)}</span></button>)}</div>
    {shown.length ? <ul className="what-you-have-list">{shown.map(item => <li key={item.key} data-group={item.group}>
      <Link href={item.href}><span><strong>{item.name}</strong><small>{item.group === 'Assets' ? '' : `${item.group === 'Debts' ? 'Debt' : 'Account'} · `}{item.detail}</small></span><span className="what-you-have-value">{item.value}</span></Link>
    </li>)}</ul> : <p className="fine">{filter === 'All' ? 'Nothing tracked yet. Add an asset, an account or a debt below.' : `No ${filter.toLowerCase()} yet.`}</p>}
  </section>;
}
