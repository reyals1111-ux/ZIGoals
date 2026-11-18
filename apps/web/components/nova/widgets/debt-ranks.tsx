'use client';
import {useMemo} from 'react';
import type {Accounts} from '../../../lib/accounts/schema';
import {debtRanks} from '../../../lib/nova/cards/ax/money-worth';
import {formatDate} from '../../../lib/visual-format';
import {AxBody, type AxProps} from '../cards/ax/kit';
import {AxmFacts, AxmHead} from '../cards/ax/money-kit';
import {AxRanks} from '../cards/ax/ranks';
import {CardFoot, CardNotice} from '../cards/kit';
import {HoloTable, HoloUnread} from '../holo/parts';
import {AccountsSource} from './ax/money-sources';

/**
 * Session AS (ADR-042 Part 2, Wealth): "Debts by balance" — the accounts the person keeps as debts (a loan, a mortgage,
 * a credit card), by the balance they entered, the largest first, each with its share of what is owed. One currency at a
 * time, never converted; a debt with no balance yet is named apart, never drawn as a zero. Balances are entered on
 * Wealth: nothing here pays or moves anything.
 */
export default function DebtRanks({size}: AxProps) {
  return <AccountsSource>{(accounts, today) => <Ranks accounts={accounts} today={today} size={size}/>}</AccountsSource>;
}
function Ranks({accounts, today, size}: {accounts: Accounts; today: string; size: AxProps['size']}) {
  const view = useMemo(() => { try { return debtRanks(accounts, today); } catch { return null; } }, [accounts, today]);
  if (!view) return <HoloUnread what="Your accounts and debts"/>;
  if (view.state === 'empty') return <CardNotice kind="empty" ghost="bars" title="No debt kept" href="/app/wealth#accounts-title" action="Add a debt">Add a loan, a mortgage or a card on Wealth with its balance, and it ranks here.</CardNotice>;
  if (view.state === 'no-balance') return <CardNotice kind="empty" ghost="bars" title="No balance entered yet" href="/app/wealth#accounts-title" action="Enter a balance">{view.noBalance.join(', ')}: enter a balance on Wealth and it ranks here.</CardNotice>;
  const day = (date: string) => formatDate(date, {year: !date.startsWith(today.slice(0, 4))}), cap = size === 'L' ? 8 : 5, shown = view.rows.slice(0, cap), more = view.rows.length - shown.length, lead = view.rows[0];
  return <AxBody kind="debt-ranks" size={size}>
    <AxmHead figure={view.total} label={`owed · ${view.rows.length} ${view.rows.length === 1 ? 'debt' : 'debts'}`} note={lead ? `${view.rows.length === 1 ? 'All' : 'Most'} on ${lead.label}${view.rows.length === 1 ? '' : ` (${lead.percent})`}${view.others.length ? ` · also kept in ${view.others.join(', ')}, never converted` : ''}` : undefined}/>
    {size !== 'S' && <div className="axm-ranks"><AxRanks max={view.max} rows={shown.map(r => ({key: r.key, label: r.label, text: `${r.text} · ${r.percent}`, parts: [{mark: 'lit', value: r.cents}]}))} more={more > 0 ? `+${more} more on the Wealth page` : null}/></div>}
    {size === 'L' && <AxmFacts rows={[...(view.lastDate ? [['Newest balance', day(view.lastDate)] as const] : []), ...(view.noBalance.length ? [['No balance yet', view.noBalance.join(', ')] as const] : [])]}/>}
    <CardFoot source="Your accounts and debts" asOf={view.lastDate ? `newest balance ${day(view.lastDate)}` : null}/>
    <HoloTable caption={`Debts by balance${view.currency ? `, in ${view.currency}` : ''}`} rows={[
      ['Owed in all', view.total],
      ...view.rows.map(r => [r.label, `${r.text}, ${r.percent} of what is owed; balance of ${day(r.date)}`] as const),
      ...(view.noBalance.length ? [['No balance yet (not counted)', view.noBalance.join(', ')] as const] : []),
      ...(view.others.length ? [['Other currencies', `${view.others.join(', ')}, never converted`] as const] : []),
    ]}/>
  </AxBody>;
}
