'use client';
import {useMemo} from 'react';
import {ACCOUNTS} from '../../../lib/accounts/schema';
import {accountsCard, accountsRows} from '../../../lib/nova/cards/money-more';
import {formatDate} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useLocalToday} from '../../use-local-today';
import {CardFoot, CardNotice, Gauge, Hero, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import {NxRows} from './nx-rows';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, round 2): "Accounts and debts" in gold — the balances the person entered for their accounts and
 * debts, what they come to (accounts minus debts) and each one with the date of its balance (Wealth → Accounts, debts &
 * net worth's own sums, lib/accounts/net-worth.ts; figures in lib/nova/cards/money-more.ts). One currency at a time,
 * never converted; an account without a balance is "no balance yet", never a zero. Wealth's holdings are not in this
 * figure, and the widget says so. Read only: a balance is entered on Wealth, and nothing here pays or moves anything.
 */
const SHOWN = {S: 0, M: 3, L: 8} as const;
export default function AccountsWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('wealth'), accounts = useDeviceRecord(ACCOUNTS), today = useLocalToday();
  const card = useMemo(() => { try { return accountsCard(accounts.data, today); } catch { return null; } }, [accounts.data, today]);
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!accounts.loaded) return <HoloReading/>;
  if (accounts.unreadable || !card) return <HoloUnread what="Your accounts and debts"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="rows" title="No account or debt yet" href="/app/wealth#accounts-title" action="Add an account">Add an account or a debt on Wealth with its balance. What they come to shows here.</CardNotice>;
  const day = (date: string) => formatDate(date, {year: date.slice(0, 4) !== today.slice(0, 4)}), lines = card.lines.slice(0, SHOWN[size]);
  return <div className="nc-body nx-card" data-size={size}>
    <div className="nx-top">
      <Gauge share={card.owedShare} size={size === 'L' ? 76 : size === 'S' ? 36 : 50} bezel={size !== 'S'} spin={size === 'L'} decor/>
      <Hero value={`${card.netNegative ? '−' : ''}${card.net ?? '—'}`} label={size === 'S' ? 'Accounts − debts' : 'Accounts minus debts'}>
        {size !== 'S' && <p className="nx-note">{card.assets} in accounts · {card.debts} owed</p>}
      </Hero>
    </div>
    {lines.length > 0 && <div className="nx-main" data-fit="rows">
      {size === 'L' && <p className="nx-cap">Balances you entered · {card.currency}</p>}
      <NxRows label="Accounts and debts" where="the Wealth page" extra={card.lines.length - lines.length} rows={lines.map(l => ({key: l.id, name: l.name, value: l.balance ? `${l.debt ? 'Owed ' : ''}${l.balance}` : 'No balance yet', sub: `${l.kind}${l.date ? ` · balance of ${day(l.date)}` : ''}`}))}/>
    </div>}
    {size === 'L' && <p className="nx-note">Wealth’s holdings are not in this figure{card.noBalance ? `; ${card.noBalance} ${card.noBalance === 1 ? 'account has' : 'accounts have'} no balance yet` : ''}{card.others.length ? `. Also kept in ${card.others.join(', ')}, never converted` : ''}. Nothing is paid or moved from here.</p>}
    <CardFoot source="Your Wealth records" asOf={card.lastDate ? `newest balance ${day(card.lastDate)}` : 'no balance entered yet'}/>
    <HoloTable caption="Accounts and debts" rows={accountsRows(card, day, Math.max(SHOWN[size], 4))}/>
  </div>;
}
