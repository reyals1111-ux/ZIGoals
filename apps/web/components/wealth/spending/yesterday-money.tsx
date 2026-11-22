'use client';
import {useId, useMemo, useState} from 'react';
import Link from 'next/link';
import {useDeviceRecord} from '../../ai/use-device-record';
import {ACCOUNTS} from '../../../lib/accounts/schema';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {yesterdayMoney} from '../../../lib/money-log/yesterday';
import {NOTIFY_PREFS, notifyPrefsSchema, setType, typeOn} from '../../../lib/notify/prefs';
import {formatDate} from '../../../lib/visual-format';
import {moneyCents} from '../money-tools/format';
import './money-r5.css';
// Session AV lane 2, round 6 (money; EveryDollar, LEDGER #427): the money streak's switch, beside the other daily choices.
import {MoneyStreakChoice} from './money-streak';

/**
 * Session AV lane 2, round 5 (money; Tiller's Hello Money, LEDGER #384): Wealth → Spending → "Yesterday's money", its own
 * chunk, loaded when its fold opens: yesterday's entries counted, what was spent and received per currency, and each cash
 * and savings account's latest balance (lib/money-log/yesterday.ts `dayMoney`, by `countedBetween`). Two choices, both off
 * until chosen: a notification each morning (the notification type `moneyMorning`; a count only unless names are on) and
 * a quiet line on Today (`moneyMorning.onToday`). Kept on this device, in Export everything.
 */
export default function YesterdayMoney({entries, today, showcase = false}: {entries: readonly MoneyEntry[]; today: string; showcase?: boolean}) {
  const id = useId(), accounts = useDeviceRecord(ACCOUNTS), prefs = useDeviceRecord(NOTIFY_PREFS), [said, setSaid] = useState('');
  const day = useMemo(() => yesterdayMoney(entries, accounts.loaded && !accounts.unreadable ? accounts.data : null, today), [entries, accounts.loaded, accounts.unreadable, accounts.data, today]);
  const canSave = prefs.loaded && !prefs.unreadable && !showcase;
  const morning = prefs.loaded && typeOn(prefs.data, 'moneyMorning'), onToday = prefs.loaded && prefs.data.moneyMorning?.onToday === true;
  const save = (fn: Parameters<typeof prefs.update>[0], words: string) => { try { prefs.update(fn); setSaid(words); } catch { setSaid('This could not be saved on this device. Nothing was changed.'); } };
  const setMorning = (on: boolean) => save(p => setType(p, 'moneyMorning', on), on ? 'Each morning, a notification says how many entries you logged the day before.' : 'No morning notification for yesterday’s money.');
  const setOnToday = (on: boolean) => save(p => { const {moneyMorning: _m, ...rest} = p; void _m; return notifyPrefsSchema.parse(on ? {...rest, moneyMorning: {...p.moneyMorning, onToday: true}} : rest); }, on ? 'Today shows a quiet line with yesterday’s money.' : 'Today no longer shows yesterday’s money.');
  return <div className="money-yesterday" role="group" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`} className="visually-hidden">Yesterday’s money, {formatDate(day.day, {weekday: true})}</h4>
    <p className="money-yesterday-day">{formatDate(day.day, {weekday: true})}: <strong>{day.entries} {day.entries === 1 ? 'entry' : 'entries'}</strong> logged.</p>
    {day.byCurrency.length ? <ul className="money-yesterday-list" aria-label="Spent and received yesterday">{day.byCurrency.map(c => <li key={c.currency}>
      <span>{c.currency}</span><span data-private-amount="">spent {moneyCents(c.spent, c.currency)}{c.received ? <>, received {moneyCents(c.received, c.currency)}</> : null}</span>
    </li>)}</ul> : <p className="fine">Nothing counted yesterday. Each day you log spending or income, it adds up here the next morning.</p>}
    {day.balances.length > 0 ? <ul className="money-yesterday-list" aria-label="Cash and savings balances">{day.balances.map(b => <li key={`${b.name}-${b.currency}`}>
      <span>{b.name}</span><span><span data-private-amount="">{moneyCents(b.cents, b.currency)}</span> <span className="fine">on {formatDate(b.date)}</span></span>
    </li>)}</ul> : <p className="fine">Add a cash or savings account with its balance in Wealth → Accounts to see it here too.</p>}
    <p className="fine">Counted as Spending counts it: your share of a shared cost, nothing for an entry left out, a transfer or a refund passed on, and a cost spread over months by its share. Not advice.</p>
    {showcase ? <p className="fine">In the Showcase these choices are not kept.</p> : <fieldset className="money-yesterday-choices"><legend>Yesterday’s money, if you want it</legend>
      <label className="money-search-check"><input type="checkbox" checked={morning} disabled={!canSave} onChange={e => setMorning(e.target.checked)}/><span>A notification each morning <span className="fine">(how many entries; amounts and account names only if names are on in your notifications; never a payee)</span></span></label>
      <label className="money-search-check"><input type="checkbox" checked={onToday} disabled={!canSave} onChange={e => setOnToday(e.target.checked)}/><span>A quiet line on Today</span></label>
      {morning && !prefs.data.here && <p className="fine">Notifications are not on on this device yet: turn them on in <Link className="text-link" href="/app/settings#notifications">Settings → Notifications</Link>.</p>}
    </fieldset>}
    {!showcase && <fieldset className="money-yesterday-choices"><legend>A money streak, if you want it</legend><MoneyStreakChoice disabled={!canSave}/></fieldset>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </div>;
}
