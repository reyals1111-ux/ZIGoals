'use client';
import {useDeviceRecord} from '../ai/use-device-record';
import {MONEY_MORE} from '../../lib/money-more/schema';
import {besideWorth} from '../../lib/money-more/people';
import {moneyCents} from './money-tools/format';
import './spending/people-money.css';

/**
 * Session AV lane 2, round 2 (money; Wallet's debts: lent and borrowed): under the net-worth cards, net worth counted with
 * money lent to people and owed to you from shared costs (yours) and money borrowed (owed by you), per currency, never
 * converted. The cards above keep their own figures (accounts and holdings), so nothing they show changes. Lazy.
 */
export default function BesideWorth({rows}: {rows: readonly {currency: string; net: number}[]}) {
  const more = useDeviceRecord(MONEY_MORE);
  if (!more.loaded || more.unreadable) return null;
  const beside = besideWorth(more.data);
  if (!beside.length) return null;
  return <>{beside.map(b => { const base = rows.find(r => r.currency === b.currency)?.net; return <p key={b.currency} className="beside-worth">
    <strong>With money between you and others · {b.currency}:</strong> {base !== undefined ? `${base + b.net < 0 ? '−' : ''}${moneyCents(Math.abs(base + b.net), b.currency)} net worth` : `${b.net < 0 ? '−' : '+'}${moneyCents(Math.abs(b.net), b.currency)}`}
    <span className="fine"> ({[b.lent ? `+${moneyCents(b.lent, b.currency)} lent` : '', b.owed ? `+${moneyCents(b.owed, b.currency)} owed to you` : '', b.borrowed ? `−${moneyCents(b.borrowed, b.currency)} borrowed` : ''].filter(Boolean).join(', ')}; Spending → Between you and others)</span>
  </p>; })}</>;
}
