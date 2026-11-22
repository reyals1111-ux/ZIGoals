'use client';
import {useState, type FormEvent} from 'react';
import {useDeviceRecord, type DeviceRecordState} from '../ai/use-device-record';
import type {Account, Accounts} from '../../lib/accounts/schema';
import {WEALTH_SHEET, type WealthSheet} from '../../lib/wealth-sheet/schema';
import {limitStates, withLimit} from '../../lib/money-more/alerts';
import {readMoneyAmount} from '../../lib/money-log/form';
import {formatDate, formatMoney} from '../../lib/visual-format';
import {localDate} from '../../lib/local-date';

/**
 * Session AV lane 2, round 2 (money; Wallet's balance-limit notifications): a low and a high line per account, checked
 * against its latest balance; Wealth names an account past its line (and Today's money line does too). Kept in the
 * wealth sheet record (`limits`), since the accounts record is strict. Lazy, with the accounts.
 */
export default function LimitNotices({accounts}: {accounts: Accounts}) {
  const sheet = useDeviceRecord(WEALTH_SHEET);
  if (!sheet.loaded || sheet.unreadable) return null;
  const states = limitStates(accounts, sheet.data, localDate()); // review b2a #8: a debt less the payments logged since
  if (!states.length) return null;
  return <ul className="account-limits" aria-label="Balances past your own lines">{states.map(s => <li key={s.id}>
    <strong>{s.name}</strong>: {formatMoney(s.balance, s.currency)} on {formatDate(s.date)} is {s.side} your line of {formatMoney(s.line, s.currency)}.
  </li>)}</ul>;
}
/** In an account's Sheet: "Tell me when the balance goes below … or above …". */
// Review b3a #3 (Session AV lane 2, round 3): the fields start from the record once it has loaded, so they show the kept lines.
export function LimitForm({account}: {account: Account}) {
  const sheet = useDeviceRecord(WEALTH_SHEET);
  if (!sheet.loaded || sheet.unreadable) return null;
  return <LimitFields key={account.id} account={account} sheet={sheet}/>;
}
function LimitFields({account: a, sheet}: {account: Account; sheet: DeviceRecordState<WealthSheet>}) {
  const now = sheet.data.limits?.[a.id];
  const [below, setBelow] = useState(now?.below ?? ''), [above, setAbove] = useState(now?.above ?? ''), [said, setSaid] = useState(''), [problem, setProblem] = useState('');
  const save = (e: FormEvent) => {
    e.preventDefault(); setProblem('');
    const b = below.trim() ? readMoneyAmount(below) : null, h = above.trim() ? readMoneyAmount(above) : null;
    if ((below.trim() && !b) || (above.trim() && !h)) { setProblem('Enter a line above zero, with at most two decimals, or leave it empty.'); return; }
    try { sheet.update(r => withLimit(r, a.id, {below: b, above: h})); setSaid(b || h ? `${a.name}: Wealth and Today say when its balance is ${[b ? `below ${formatMoney(b, a.currency)}` : '', h ? `above ${formatMoney(h, a.currency)}` : ''].filter(Boolean).join(' or ')}.` : `${a.name}: no balance lines.`); }
    catch (cause) { setProblem(cause instanceof Error ? cause.message : 'Not kept on this device.'); }
  };
  return <form className="wealth-sheet-form account-limit-form" onSubmit={save} aria-label={`${a.name}: balance lines`} noValidate>
    <label className="field"><span>Tell me when it is below ({a.currency})</span><input inputMode="decimal" autoComplete="off" value={below} placeholder="500" onChange={e => setBelow(e.target.value)}/></label>
    <label className="field"><span>Or above ({a.currency})</span><input inputMode="decimal" autoComplete="off" value={above} placeholder="—" onChange={e => setAbove(e.target.value)}/></label>
    <button type="submit" className="secondary">Keep the lines</button>
    <p className="fine" role="status">{said || 'Checked against the latest balance you entered.'}</p>
    {problem && <p role="alert">{problem}</p>}
  </form>;
}
