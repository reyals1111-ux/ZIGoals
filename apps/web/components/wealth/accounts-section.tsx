'use client';
import {useEffect, useState} from 'react';
import {accountForPrefill, BALANCE_PREFILL_EVENT, takeBalancePrefill} from '../../lib/ai/actions/balance-prefill';
import {ACCOUNTS, ASSET_KINDS, DEBT_KINDS, isDebtKind, type Account, type AccountKind, type Accounts} from '../../lib/accounts/schema';
import {add, addAccount, balanceOn, editAccount, moneyText, netWorth, netWorthHistory, payoffMonths, recordBalance, recordPayment, removeAccount, usualPayment, type Money} from '../../lib/accounts/net-worth';
import {parseAmountInput} from '../../lib/amount-input';
import {formatGoalAmount} from '../../lib/goal-summary';
import {addLocalDays, localDate} from '../../lib/local-date';
import {useDeviceRecord} from '../ai/use-device-record';
import type {LayoutAttrs} from '../layout-edit';
import {usePlatform} from '../platform/use-platform';
import {useFieldErrors} from '../field-errors';
import './accounts.css';

/**
 * Accounts, debts and net worth (Session W Part 12; Wealth's "wealth:accounts" section). Balances are the person's own,
 * entered on a date, per account in its own currency; net worth is assets plus Wealth's valued holdings minus debts,
 * per currency, never converted; an account without a balance or a holding without a value is counted, never zero.
 * A debt's payoff date appears only with the person's own rate and a monthly payment. Nothing here links a bank or
 * moves money. Kept on this device (`zigoals:accounts:v1`) until account sync carries it.
 */
const KIND_LABEL: Record<AccountKind, string> = {cash: 'Cash', savings: 'Savings', investment: 'Investment', pension: 'Pension', property: 'Property', vehicle: 'Vehicle', 'other-asset': 'Other asset', loan: 'Loan', mortgage: 'Mortgage', 'credit-card': 'Credit card', 'other-debt': 'Other debt'};
const show = (m: Money, currency: string) => formatGoalAmount(moneyText(m), currency);
const toMoney = (text: string, date: string): Money & {date: string} => { const value = parseAmountInput(text, 2); if (value < 0n) throw Error('Enter the amount as a positive number; a debt\'s balance is what is owed.'); return {value, decimals: 2, date}; };
export function AccountsSection(layout: LayoutAttrs) {
  const accounts = useDeviceRecord(ACCOUNTS), platform = usePlatform(), today = localDate();
  const [adding, setAdding] = useState(false), [open, setOpen] = useState<{id: string; mode: 'balance' | 'payment' | 'edit'} | null>(null), [message, setMessage] = useState(''), [error, setError] = useState('');
  // Session W Part 21: ZIGi's balance hand-off, read once (on arrival, or when told while Wealth is already open); the
  // named account's balance form opens filled in, and the person saves it.
  const [handed, setHanded] = useState(takeBalancePrefill), [prefill, setPrefill] = useState<{id: string; amount: string; date: string} | null>(null);
  useEffect(() => {
    const pick = () => { const next = takeBalancePrefill(); if (next) setHanded(next); };
    window.addEventListener(BALANCE_PREFILL_EVENT, pick);
    return () => window.removeEventListener(BALANCE_PREFILL_EVENT, pick);
  }, []);
  useEffect(() => {
    if (!handed || !accounts.loaded || accounts.unreadable) return;
    const account = accountForPrefill(accounts.data.items, handed.account);
    queueMicrotask(() => {
      setHanded(null); // used once: saving the balance later never reopens the form
      if (!account) { setMessage(`ZIGi's balance names “${handed.account}”, which is not exactly one of your accounts here. Choose the account below and enter it; nothing was saved.`); return; }
      setOpen({id: account.id, mode: 'balance'}); setPrefill({id: account.id, amount: handed.balance, date: handed.date});
      setMessage(`Pre-filled from your chat with ZIGi: ${account.name}'s balance${handed.currency && handed.currency !== account.currency ? ` (ZIGi said ${handed.currency}; this account is in ${account.currency})` : ''}. Check it, then save; nothing is saved until you do.`);
    });
  }, [handed, accounts.loaded, accounts.unreadable, accounts.data.items]);
  function change(fn: (current: Accounts) => Accounts, words: string) {
    try { accounts.update(fn); setMessage(words); setError(''); return true; } catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : 'Not saved on this device.'); return false; }
  }
  if (!accounts.loaded) return <section {...layout} className="panel accounts-section" aria-labelledby="accounts-title" aria-busy="true"><h2 id="accounts-title">Accounts, debts &amp; net worth</h2></section>;
  if (accounts.unreadable) return <section {...layout} className="panel accounts-section" aria-labelledby="accounts-title"><h2 id="accounts-title">Accounts, debts &amp; net worth</h2><p role="alert">Your accounts on this device could not be read. Their bytes are kept; nothing was changed.</p></section>;
  const items = accounts.data.items, worth = netWorth(accounts.data, today, platform.data.positions), history = netWorthHistory(accounts.data, today);
  const active = items.filter(a => !a.archivedAt), archived = items.filter(a => a.archivedAt);
  return <section {...layout} className="panel accounts-section" aria-labelledby="accounts-title">
    <header className="wealth-section-heading"><div><p className="eyebrow">EVERYTHING YOU OWN AND OWE</p><h2 id="accounts-title">Accounts, debts &amp; net worth</h2><p>Balances you enter, per account in its own currency. Accounts stay on this device until account sync carries them.</p></div>
      <button type="button" className="secondary" aria-expanded={adding} onClick={() => { setAdding(o => !o); setMessage(''); setError(''); }}>{adding ? 'Close' : 'Add an account or debt'}</button></header>
    {adding && <AddAccount onAdd={(input, words) => { if (change(g => addAccount(g, input, new Date().toISOString()), words)) setAdding(false); }} today={today} />}
    {worth.rows.length > 0 && <div className="accounts-worth" role="group" aria-label="Net worth by currency">
      {worth.rows.map(r => <article key={r.currency} className="accounts-worth-card" aria-label={`Net worth in ${r.currency}`}>
        <h3>Net worth · {r.currency}</h3>
        <strong className="accounts-worth-net">{show(r.net, r.currency)}</strong>
        <dl><div><dt>Accounts</dt><dd>{show(r.assets, r.currency)}</dd></div><div><dt>Holdings in Wealth</dt><dd>{show(r.holdings, r.currency)}</dd></div><div><dt>Debts</dt><dd>{show(r.debts, r.currency)}</dd></div></dl>
        <AssetsVsDebts assets={r.assets} holdings={r.holdings} debts={r.debts} currency={r.currency} />
        {r.noBalance > 0 && <p className="fine">{r.noBalance} {r.noBalance === 1 ? 'account has' : 'accounts have'} no balance yet (not counted as zero).</p>}
      </article>)}
      <p className="fine">Net worth = accounts + Wealth holdings with a value − debts, per currency, never converted between currencies.{worth.unvaluedHoldings ? ` ${worth.unvaluedHoldings} ${worth.unvaluedHoldings === 1 ? 'holding has' : 'holdings have'} no value yet and ${worth.unvaluedHoldings === 1 ? 'is' : 'are'} not counted.` : ''}</p>
    </div>}
    {history.length > 1 && <details className="accounts-history"><summary>Net worth over time (accounts only)</summary><table><caption>Month-end net worth from your accounts and debts</caption><thead><tr><th scope="col">Date</th><th scope="col">Currency</th><th scope="col">Net worth</th><th scope="col">Accounts counted</th></tr></thead>
      <tbody>{history.map(h => <tr key={`${h.date}-${h.currency}`}><th scope="row">{h.date}</th><td>{h.currency}</td><td>{show(h.net, h.currency)}</td><td>{h.counted}</td></tr>)}</tbody></table></details>}
    {active.length === 0 && !adding && <p>No accounts yet. Add a savings account, a pension, a loan or a credit card to see your net worth here.</p>}
    {(['assets', 'debts'] as const).map(group => { const list = active.filter(a => isDebtKind(a.kind) === (group === 'debts')); return list.length > 0 && <div key={group} className="accounts-group"><h3>{group === 'assets' ? 'What you own' : 'What you owe'}</h3><ul className="accounts-list">{list.map(a => <AccountRow key={a.id} account={a} today={today} open={open?.id === a.id ? open.mode : null} setOpen={mode => { setOpen(mode ? {id: a.id, mode} : null); setPrefill(null); }} change={change} {...(prefill?.id === a.id ? {prefill} : {})} />)}</ul></div>; })}
    {archived.length > 0 && <details className="accounts-archived"><summary>Archived ({archived.length})</summary><ul className="accounts-list">{archived.map(a => <li key={a.id}><span>{a.name} · {KIND_LABEL[a.kind]}</span><div className="actions"><button type="button" className="quiet" onClick={() => change(g => editAccount(g, a.id, {archived: false}, new Date().toISOString()), `${a.name} restored.`)}>Restore</button><button type="button" className="quiet" onClick={() => change(g => removeAccount(g, a.id), `${a.name} removed from this device.`)}>Remove</button></div></li>)}</ul></details>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
function AssetsVsDebts({assets, holdings, debts, currency}: {assets: Money; holdings: Money; debts: Money; currency: string}) {
  const owned = add(assets, holdings), own = Number(moneyText(owned)), owe = Number(moneyText(debts)), max = Math.max(own, owe, 1);
  return <div className="accounts-bars" role="img" aria-label={`Own ${show(owned, currency)}, owe ${show(debts, currency)}`}>
    <span><b>Own</b><i style={{width: `${(own / max) * 100}%`}} /></span><span><b>Owe</b><i className="owe" style={{width: `${(owe / max) * 100}%`}} /></span>
  </div>;
}
function AddAccount({onAdd, today}: {onAdd: (input: Parameters<typeof addAccount>[1], words: string) => void; today: string}) {
  // Session Y Part 9: a refused currency or balance marks its own field (aria-invalid, described by the message) and takes the focus.
  const [kind, setKind] = useState<AccountKind>('savings'), fe = useFieldErrors();
  return <form className="platform-form accounts-add" aria-label="Add an account or debt" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); let field = ''; try {
    const name = String(f.get('name')).trim(), currency = String(f.get('currency')).trim().toUpperCase(), balance = String(f.get('balance') ?? '').trim(), rate = String(f.get('rate') ?? '').trim().replace(',', '.');
    field = 'currency'; if (!/^[A-Z]{3}$/.test(currency)) throw Error('Use a three-letter currency code, for example EUR.');
    field = 'balance'; const money = balance ? toMoney(balance, String(f.get('date') || today)) : undefined; field = '';
    onAdd({id: crypto.randomUUID(), kind, name, currency, institution: String(f.get('institution') ?? ''), ...(rate ? {ratePercent: rate} : {}), ...(money ? {balance: money} : {})}, `${name} added.`); fe.clear();
  } catch (cause) { fe.fail(cause instanceof Error ? cause.message : 'Check the account.', ...(field ? [field] : [])); } }}>
    <label className="field">Kind<select value={kind} onChange={e => setKind(e.target.value as AccountKind)}><optgroup label="What you own">{ASSET_KINDS.map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</optgroup><optgroup label="What you owe">{DEBT_KINDS.map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</optgroup></select></label>
    <label className="field">Name<input name="name" required maxLength={80} placeholder={isDebtKind(kind) ? 'For example, car loan' : 'For example, savings account'} /></label>
    <label className="field">Currency<input name="currency" required maxLength={3} defaultValue="EUR" autoCapitalize="characters" {...fe.field('currency')} /></label>
    <label className="field">Bank or provider (optional)<input name="institution" maxLength={80} /></label>
    <label className="field">{isDebtKind(kind) ? 'What you owe now (optional)' : 'Balance now (optional)'}<input name="balance" inputMode="decimal" {...fe.field('balance')} /></label>
    <label className="field">On<input name="date" type="date" defaultValue={today} max={today} /></label>
    <label className="field">Yearly rate, your own figure (optional, %)<input name="rate" inputMode="decimal" /></label>
    <button type="submit" className="primary">Add</button>
    {fe.error && <p role="alert" id={fe.messageId}>{fe.error}</p>}
  </form>;
}
function AccountRow({account: a, today, open, setOpen, change, prefill}: {account: Account; today: string; open: 'balance' | 'payment' | 'edit' | null; setOpen: (mode: 'balance' | 'payment' | 'edit' | null) => void; change: (fn: (current: Accounts) => Accounts, words: string) => boolean; prefill?: {amount: string; date: string}}) {
  const b = balanceOn(a), debt = isDebtKind(a.kind), usual = debt ? usualPayment(a, today) : null, [monthly, setMonthly] = useState(''), fe = useFieldErrors();
  const monthlyNumber = monthly.trim() ? Number(monthly.replace(',', '.')) : usual ? Number(moneyText(usual)) : NaN;
  const months = debt && b && a.ratePercent && Number.isFinite(monthlyNumber) ? payoffMonths(Number(moneyText(b)), Number(a.ratePercent), monthlyNumber) : undefined;
  const now = () => new Date().toISOString();
  return <li className="accounts-row">
    <div className="accounts-row-main"><strong>{a.name}</strong><small>{KIND_LABEL[a.kind]}{a.institution ? ` · ${a.institution}` : ''}{a.ratePercent ? ` · ${a.ratePercent} % a year (your figure)` : ''}</small></div>
    <div className="accounts-row-balance">{b ? <><strong>{show(b, a.currency)}</strong><small>{debt ? 'owed' : 'balance'} on {b.date}</small></> : <small>No balance yet</small>}</div>
    <div className="actions"><button type="button" className="quiet" aria-label={`Update the balance of ${a.name}`} onClick={() => setOpen(open === 'balance' ? null : 'balance')}>Update balance</button>{debt && <button type="button" className="quiet" aria-label={`Record a payment on ${a.name}`} onClick={() => setOpen(open === 'payment' ? null : 'payment')}>Record a payment</button>}<button type="button" className="quiet" aria-label={`Edit ${a.name}`} onClick={() => setOpen(open === 'edit' ? null : 'edit')}>Edit</button></div>
    {open && open !== 'edit' && <form key={open === 'balance' && prefill ? `prefill:${prefill.amount}:${prefill.date}` : open} className="platform-form accounts-inline" aria-label={open === 'balance' ? `New balance for ${a.name}` : `Payment on ${a.name}`} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); try { const m = toMoney(String(f.get('amount')), String(f.get('date') || today)); if (change(g => open === 'balance' ? recordBalance(g, a.id, m, now()) : recordPayment(g, a.id, m, now()), open === 'balance' ? `${a.name}: balance saved for ${m.date}.` : `${a.name}: payment recorded for ${m.date}. Enter the new balance when your statement shows it.`)) setOpen(null); fe.clear(); } catch (cause) { fe.fail(cause instanceof Error ? cause.message : 'Check the amount.', 'amount'); } }}>
      <label className="field">{open === 'balance' ? (debt ? 'What you owe' : 'Balance') : 'Payment'} ({a.currency})<input name="amount" inputMode="decimal" required defaultValue={open === 'balance' ? prefill?.amount : undefined} {...fe.field('amount')} /></label>
      <label className="field">On<input name="date" type="date" defaultValue={open === 'balance' && prefill ? prefill.date : today} max={today} /></label>
      <button type="submit" className="secondary">Save</button>
      {fe.error && <p role="alert" id={fe.messageId}>{fe.error}</p>}
    </form>}
    {open === 'edit' && <form className="platform-form accounts-inline" aria-label={`Edit ${a.name}`} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); const rate = String(f.get('rate') ?? '').trim().replace(',', '.'); if (change(g => editAccount(g, a.id, {name: String(f.get('name')).trim(), institution: String(f.get('institution') ?? '').trim() || null, ratePercent: rate || null}, now()), `${a.name} saved.`)) setOpen(null); }}>
      <label className="field">Name<input name="name" required maxLength={80} defaultValue={a.name} /></label>
      <label className="field">Bank or provider<input name="institution" maxLength={80} defaultValue={a.institution ?? ''} /></label>
      <label className="field">Yearly rate, your own figure (%)<input name="rate" inputMode="decimal" defaultValue={a.ratePercent ?? ''} /></label>
      <div className="actions"><button type="submit" className="secondary">Save</button><button type="button" className="quiet" onClick={() => { if (change(g => editAccount(g, a.id, {archived: true}, now()), `${a.name} archived; its history is kept.`)) setOpen(null); }}>Archive</button></div>
    </form>}
    {debt && b && b.value > 0n && <details className="accounts-payoff"><summary>When would it be paid off?</summary>
      {a.ratePercent ? <><label className="field">Monthly payment ({a.currency}){usual ? `, usual: ${moneyText(usual)}` : ''}<input inputMode="decimal" value={monthly} onChange={e => setMonthly(e.target.value)} placeholder={usual ? moneyText(usual) : 'for example 250'} /></label>
        {Number.isFinite(monthlyNumber) && <p role="status">{months === null ? `At ${a.ratePercent} % a year this payment does not cover the interest, or it would take more than 100 years.` : months !== undefined ? `At your rate of ${a.ratePercent} % a year and ${monthlyNumber} ${a.currency} a month: paid off in about ${months} ${months === 1 ? 'month' : 'months'}, around ${addLocalDays(today, Math.round(months * 30.44))}.` : ''}</p>}
        <p className="fine">Your own rate and payment, worked out here; not a figure from your lender.</p></>
        : <p className="fine">Add your yearly rate (Edit) to see when it would be paid off. ZIGoals never assumes a rate.</p>}
    </details>}
  </li>;
}
