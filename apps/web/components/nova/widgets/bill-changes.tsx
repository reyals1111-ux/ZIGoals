'use client';
import {useMemo, type CSSProperties} from 'react';
import {BILLS} from '../../../lib/bills/schema';
import {MONEY_LOG} from '../../../lib/money-log/schema';
import {billChangesCard, billChangesRows} from '../../../lib/nova/cards/money-insights';
import {formatDate} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useLocalToday} from '../../use-local-today';
import {CardFoot, CardNotice, Hero, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-040 feature 6): "Bill changes" in gold — the bills whose latest payment in
 * the money log differs from the one before it, as Wealth → Upcoming bills says it ("went up by €0.50 since Oct 2026";
 * lib/bills/price-change.ts; figures in lib/nova/cards/money-insights.ts). Each row carries both amounts and the month of
 * the earlier payment; the direction is a word and a sign, never colour alone. Only a bill found in the money log has
 * payments to compare, and the widget says so. ZIGoals never pays or cancels anything: these are reminders, read only.
 */
const SHOWN = {S: 0, M: 2, L: 5} as const;
export default function BillChangesWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('wealth'), bills = useDeviceRecord(BILLS), log = useDeviceRecord(MONEY_LOG), today = useLocalToday();
  const card = useMemo(() => billChangesCard(bills.data, log.data, today), [bills.data, log.data, today]);
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!bills.loaded || !log.loaded) return <HoloReading/>;
  if (bills.unreadable || log.unreadable) return <HoloUnread what="Your Wealth records"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="rows" title="No bills kept yet" href="/app/wealth?view=bills" action="Add a bill">Keep a bill or a subscription on Wealth. When its price changes, it shows here.</CardNotice>;
  const foot = <CardFoot source="Your Wealth records" asOf={`as of today, ${formatDate(today, {year: false})}`}/>, table = <HoloTable caption="Bill changes" rows={billChangesRows(card)}/>;
  if (card.state === 'none') return <div className="nc-body nx-card" data-size={size}>
    <CardNotice kind="empty" ghost="rows" title="No price change found" href="/app/wealth?view=bills" action="See your bills">{card.fromLog ? `None of your ${card.fromLog} ${card.fromLog === 1 ? 'bill' : 'bills'} from the money log changed since the payment before.` : 'Only a bill found in your money log has payments to compare; yours were added by hand.'}</CardNotice>
    {foot}{table}
  </div>;
  const lines = card.lines.slice(0, SHOWN[size]), more = card.lines.length - lines.length, n = card.lines.length;
  return <div className="nc-body nx-card" data-size={size}>
    <div className="nx-top"><Hero value={String(n)} unit={n === 1 ? 'bill' : 'bills'} label={size === 'S' ? 'Changed price' : 'Changed price since the payment before'}/></div>
    {lines.length > 0 && <div className="nx-main" data-fit="rows">
      <ul className="nx-rows">{lines.map((l, i) => <li key={l.id} className="nx-row nc-rise" style={{'--nc-i': i} as CSSProperties}>
        <i className="nx-row-node" data-tone={l.direction} aria-hidden="true"/>
        <span className="nx-row-name" title={l.title}>{l.title}</span>
        <span className="nx-row-value">{l.direction === 'up' ? 'Up' : 'Down'} {l.by}</span>
        <span className="nx-row-sub">Since {l.since} · {l.then} then, {l.now} now</span>
      </li>)}</ul>
      {size === 'L' && more > 0 && <p className="nx-note">{more} more on Wealth.</p>}
    </div>}
    {size === 'L' && <p className="nx-note">From the payments in your money log, in each bill’s own currency. A bill added by hand has no payments to compare.</p>}
    {foot}{table}
  </div>;
}
