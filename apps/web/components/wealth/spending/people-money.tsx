'use client';
import {useId, useMemo, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {MONEY_MORE, type MoneyMore} from '../../../lib/money-more/schema';
import {addLoan, closeLoan, evenShares, loanIssue, loanRows, owedTotals, removeLoan, repay, settle, shareCost, shareIssue, unshareCost, type LoanInput} from '../../../lib/money-more/people';
import type {MoneyEntry, MoneyLog} from '../../../lib/money-log/schema';
import {readMoneyAmount} from '../../../lib/money-log/form';
import {formatDate} from '../../../lib/visual-format';
import {showUndo} from '../../ui/undo-toast';
import {moneyCents} from '../money-tools/format';
import './people-money.css';

/**
 * Session AV lane 2, round 2 (money; Emma's custom split and settle, Wallet's lent and borrowed): money between you and
 * the people you name, on this device only — nothing is sent to anyone (a group shared with other people's devices is
 * against the rule that nothing is shared between people). `ShareFold` sits in an expense's edit form; `PeoplePanel`
 * under Spending lists what each person owes you, money lent and borrowed, with Settle, repayments in parts, Close and
 * Forgive. Every change offers Undo. Its own chunk.
 */
const money = (cents: number, currency: string) => moneyCents(cents, currency);
const cents = (amount: string) => Math.round(Number(amount) * 100);
type LogUpdate = (fn: (log: MoneyLog) => MoneyLog) => unknown;
/** Both records changed together, with one Undo that puts both back. */
function useBoth(logUpdate: LogUpdate, more: ReturnType<typeof useDeviceRecord<MoneyMore>>) {
  return (log: MoneyLog, change: (log: MoneyLog, more: MoneyMore) => {log: MoneyLog; more: MoneyMore}, words: string, undone: string) => {
    const beforeMore = more.data, out = change(log, more.data);
    // Only the entries this change touched are put back on Undo (one changed, or one added), never later edits of others.
    const was = new Map(log.entries.map(e => [e.id, e])), touched = out.log.entries.filter(e => was.get(e.id) !== e).map(e => e.id);
    logUpdate(() => out.log); more.update(() => out.more);
    showUndo({message: words, undone, restore: () => { logUpdate(l => ({...l, entries: l.entries.flatMap(e => !touched.includes(e.id) ? [e] : was.has(e.id) ? [was.get(e.id)!] : [])})); more.update(() => beforeMore); }});
    return out;
  };
}

/** In an expense's edit form: "Shared with others" — your share and each person's part, split evenly or typed. */
export function ShareFold({entry, log, update, onDone}: {entry: MoneyEntry; log: MoneyLog; update: LogUpdate; onDone: (words: string) => void}) {
  const id = useId(), more = useDeviceRecord(MONEY_MORE), both = useBoth(update, more);
  const open = useMemo(() => (more.data.owed ?? []).filter(o => o.entryId === entry.id), [more.data.owed, entry.id]);
  const [people, setPeople] = useState<{name: string; amount: string}[]>(() => open.filter(o => !o.settled).map(o => ({name: o.name, amount: o.amount})));
  const [mine, setMine] = useState(entry.share ?? ''), [problem, setProblem] = useState('');
  if (entry.kind !== 'expense' || !more.loaded || more.unreadable) return null;
  const even = (list: {name: string; amount: string}[]) => { const parts = evenShares(entry.amount, list.length); setMine(parts[0]!); setPeople(list.map((p, i) => ({...p, amount: parts[i + 1]!}))); };
  const add = () => { const next = [...people, {name: '', amount: ''}]; even(next); };
  const save = () => {
    const others = people.map(p => ({name: p.name, amount: readMoneyAmount(p.amount) ?? p.amount})), share = readMoneyAmount(mine) ?? mine;
    const issue = shareIssue(entry, share, others); if (issue) { setProblem(issue); return; }
    try { both(log, (l, m) => shareCost(l, m, entry.id, share, others, () => `ow_${crypto.randomUUID().slice(0, 12)}`), `Shared: your share ${money(cents(share), entry.currency)}; ${others.map(o => `${o.name.trim()} owes ${money(cents(o.amount), entry.currency)}`).join(', ')}.`, 'The split is undone.'); onDone('Shared: spending and budgets count your share.'); }
    catch (e) { setProblem(e instanceof Error ? e.message : 'Not saved on this device.'); }
  };
  const stop = () => { both(log, (l, m) => unshareCost(l, m, entry.id), 'Not shared any more: the whole amount counts again.', 'The split is back.'); setPeople([]); setMine(''); onDone('Not shared any more.'); };
  return <details className="people-share" open={entry.share ? true : undefined}>
    <summary>Shared with others{entry.share ? ` · your share ${money(cents(entry.share), entry.currency)}` : ''}</summary>
    <p className="fine">Paid for others too? Your share is what your spending and budgets count; what each person owes you is listed under “Between you and others” until they pay you back. Kept on this device only.</p>
    {open.some(o => o.settled) && <p className="fine">Settled already: {open.filter(o => o.settled).map(o => `${o.name} ${money(cents(o.amount), o.currency)} (${formatDate(o.settled!)})`).join(', ')}.</p>}
    <ul className="people-share-list">{people.map((p, i) => <li key={i}>
      <label className="field"><span>Person {i + 1}</span><input value={p.name} maxLength={40} autoComplete="off" placeholder="Sam" onChange={e => setPeople(list => list.map((x, k) => k === i ? {...x, name: e.target.value} : x))}/></label>
      <label className="field"><span>Owes you ({entry.currency})</span><input inputMode="decimal" autoComplete="off" value={p.amount} onChange={e => setPeople(list => list.map((x, k) => k === i ? {...x, amount: e.target.value} : x))}/></label>
      <button type="button" className="quiet" aria-label={`Take person ${i + 1} off`} onClick={() => even(people.filter((_, k) => k !== i))}>Take off</button>
    </li>)}</ul>
    <div className="people-share-row">
      <button type="button" className="secondary" onClick={add}>Add a person</button>
      {people.length > 0 && <button type="button" className="quiet" onClick={() => even(people)}>Split evenly</button>}
    </div>
    {people.length > 0 && <label className="field"><span>Your share ({entry.currency})</span><input inputMode="decimal" autoComplete="off" value={mine} aria-describedby={`${id}-sum`} onChange={e => setMine(e.target.value)}/></label>}
    {people.length > 0 && <p id={`${id}-sum`} className="fine">The cost is {money(cents(entry.amount), entry.currency)}: your share and the parts add up to it.</p>}
    {problem && <p role="alert">{problem}</p>}
    <div className="people-share-row">{people.length > 0 && <button type="button" className="secondary" onClick={save}>Keep the split</button>}{entry.share && <button type="button" className="quiet" onClick={stop}>Not shared any more</button>}</div>
  </details>;
}

const KIND_WORDS = {lent: 'Lent to', borrowed: 'Borrowed from'} as const;
/** Under Spending: what each person owes you from shared costs, and money lent and borrowed. */
export default function PeoplePanel({log, update, today, currencies}: {log: MoneyLog; update: LogUpdate; today: string; currencies: readonly string[]}) {
  const id = useId(), more = useDeviceRecord(MONEY_MORE), both = useBoth(update, more), heading = useRef<HTMLHeadingElement>(null);
  const owed = useMemo(() => owedTotals(more.data), [more.data]), loans = useMemo(() => loanRows(more.data, today), [more.data, today]);
  const [adding, setAdding] = useState(false), [draft, setDraft] = useState<LoanInput & {raw: string}>({kind: 'lent', name: '', amount: '', raw: '', currency: currencies[0] ?? 'EUR', date: today, remind: false});
  const [problem, setProblem] = useState(''), [said, setSaid] = useState(''), [repaying, setRepaying] = useState<string | null>(null), [part, setPart] = useState('');
  if (!more.loaded || more.unreadable) return null;
  const write = (fn: (m: MoneyMore) => MoneyMore, words: string, undone: string) => { const before = more.data; try { more.update(fn); setSaid(words); setProblem(''); showUndo({message: words, undone, restore: () => more.update(() => before)}); return true; } catch (e) { setProblem(e instanceof Error ? e.message : 'Not saved on this device.'); return false; } };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const input: LoanInput = {kind: draft.kind, name: draft.name, amount: readMoneyAmount(draft.raw) ?? draft.raw, currency: draft.currency, date: draft.date, ...(draft.due ? {due: draft.due} : {}), ...(draft.remind ? {remind: true} : {}), ...(draft.note ? {note: draft.note} : {})};
    const issue = loanIssue(input); if (issue) { setProblem(issue); return; }
    if (write(m => addLoan(m, input, `ln_${crypto.randomUUID().slice(0, 12)}`), `${KIND_WORDS[input.kind]} ${input.name.trim()}: ${money(cents(input.amount), input.currency)}, kept.`, 'Taken off again.')) { setAdding(false); setDraft(d => ({...d, name: '', raw: '', due: undefined, remind: false, note: ''})); requestAnimationFrame(() => heading.current?.focus()); }
  };
  const anything = owed.length > 0 || loans.length > 0;
  return <section className="people-money" aria-labelledby={`${id}-t`}>
    <h3 id={`${id}-t`} ref={heading} tabIndex={-1}>Between you and others</h3>
    {!anything && <p className="fine">Money you lent or borrowed, and what friends owe you for shared costs (Edit a cost → Shared with others). On this device only; nothing is sent to anyone.</p>}
    {owed.length > 0 && <><h4>Owed to you from shared costs</h4><ul className="people-list">{owed.map(o => <li key={`${o.name}-${o.currency}`}>
      <span><strong>{o.name}</strong> owes you {money(o.cents, o.currency)} <span className="fine">· {o.lines.map(l => `${l.note ?? 'a shared cost'} (${formatDate(l.date, {year: false})})`).join(', ')}</span></span>
      <button type="button" className="secondary" aria-label={`Settle up with ${o.name}: ${money(o.cents, o.currency)}`} onClick={() => { try { both(log, (l, m) => settle(l, m, o.name, o.currency, today, crypto.randomUUID(), new Date().toISOString()), `${o.name} paid you back ${money(o.cents, o.currency)}: settled, and in your log as money back (left out of the figures, as your spending counted only your share).`, 'Not settled.'); setSaid(`${o.name}: settled.`); heading.current?.focus(); } catch (e) { setProblem(e instanceof Error ? e.message : 'Not saved on this device.'); } }}>Settle up</button>
    </li>)}</ul></>}
    {loans.length > 0 && <><h4>Lent and borrowed</h4><ul className="people-list">{loans.map(r => { const l = r.loan, done = r.state === 'closed' || r.state === 'forgiven'; return <li key={l.id} data-state={r.state}>
      <span className="people-what"><strong>{KIND_WORDS[l.kind]} {l.name}</strong> <span className="fine">· {money(cents(l.amount), l.currency)} on {formatDate(l.date, {year: false})}{r.repaid ? ` · ${money(r.repaid, l.currency)} repaid` : ''}{done ? '' : ` · ${money(r.left, l.currency)} left`}{l.due && !done ? ` · due ${formatDate(l.due)}${r.state === 'overdue' ? ' (past due)' : r.state === 'due-soon' ? (r.days === 0 ? ' (today)' : ` (in ${r.days} ${r.days === 1 ? 'day' : 'days'})`) : ''}` : ''}{l.remind && !done ? ' · reminder on' : ''}{r.state === 'closed' ? ` · repaid ${formatDate(l.closed!)}` : ''}{r.state === 'forgiven' ? ` · forgiven ${formatDate(l.closed!)}` : ''}{l.note ? ` · ${l.note}` : ''}</span></span>
      <span className="people-actions">
        {!done && (repaying === l.id ? <span className="people-repay" role="group" aria-label={`A repayment on ${l.name}`}>
          <label className="field"><span>Repaid ({l.currency})</span><input inputMode="decimal" autoComplete="off" autoFocus value={part} placeholder={(r.left / 100).toFixed(2)} onChange={e => setPart(e.target.value)}/></label>
          <button type="button" className="secondary" onClick={() => { const v = readMoneyAmount(part || (r.left / 100).toFixed(2)); if (!v) { setProblem('Enter the amount repaid above zero, with at most two decimals.'); return; } if (write(m => repay(m, l.id, v, today), `${money(cents(v), l.currency)} repaid ${l.kind === 'lent' ? 'by' : 'to'} ${l.name}.`, 'Repayment taken off.')) { setRepaying(null); setPart(''); } }}>Keep</button>
          <button type="button" className="quiet" onClick={() => { setRepaying(null); setPart(''); }}>Cancel</button></span>
        : <button type="button" className="secondary" aria-label={`A repayment on ${KIND_WORDS[l.kind].toLowerCase()} ${l.name}`} onClick={() => { setRepaying(l.id); setPart(''); }}>Repayment</button>)}
        {!done && <button type="button" className="quiet" aria-label={`Close ${KIND_WORDS[l.kind].toLowerCase()} ${l.name}: repaid`} onClick={() => write(m => closeLoan(m, l.id, today), `${l.name}: closed as repaid.`, 'Open again.')}>Close</button>}
        {!done && l.kind === 'lent' && <button type="button" className="quiet" aria-label={`Forgive what ${l.name} owes`} onClick={() => write(m => closeLoan(m, l.id, today, true), `${l.name}: what was left is forgiven.`, 'Not forgiven.')}>Forgive</button>}
        {done && <button type="button" className="quiet" aria-label={`Remove ${KIND_WORDS[l.kind].toLowerCase()} ${l.name}`} onClick={() => write(m => removeLoan(m, l.id), `${l.name}: removed.`, 'It is back.')}>Remove</button>}
      </span>
    </li>; })}</ul></>}
    {!adding ? <p><button type="button" className="secondary" aria-expanded={false} onClick={() => { setAdding(true); setSaid(''); }}>+ Money lent or borrowed</button></p>
    : <form className="people-form" onSubmit={save} aria-label="Money lent or borrowed" noValidate>
      <fieldset className="people-kind"><legend>Which way</legend>{(['lent', 'borrowed'] as const).map(k => <label key={k} className="budgets-check"><input type="radio" name={`${id}-kind`} checked={draft.kind === k} onChange={() => setDraft(d => ({...d, kind: k}))}/><span>{k === 'lent' ? 'I lent it' : 'I borrowed it'}</span></label>)}</fieldset>
      <label className="field"><span>{draft.kind === 'lent' ? 'To' : 'From'}</span><input value={draft.name} maxLength={40} autoComplete="off" placeholder="Noor" onChange={e => setDraft(d => ({...d, name: e.target.value}))}/></label>
      <label className="field"><span>Amount</span><input inputMode="decimal" autoComplete="off" value={draft.raw} placeholder="100" onChange={e => setDraft(d => ({...d, raw: e.target.value}))}/></label>
      {currencies.length > 1 && <label className="field"><span>Currency</span><select value={draft.currency} onChange={e => setDraft(d => ({...d, currency: e.target.value}))}>{currencies.map(c => <option key={c} value={c}>{c}</option>)}</select></label>}
      <label className="field"><span>On</span><input type="date" value={draft.date} max={today} onChange={e => setDraft(d => ({...d, date: e.target.value}))}/></label>
      <label className="field"><span>Due — optional</span><input type="date" value={draft.due ?? ''} min={draft.date} onChange={e => setDraft(d => ({...d, due: e.target.value || undefined}))}/></label>
      {draft.due && <label className="budgets-check"><input type="checkbox" checked={!!draft.remind} onChange={e => setDraft(d => ({...d, remind: e.target.checked}))}/><span>Remind me (Today, and a money notice if those are on)</span></label>}
      <label className="field"><span>Note — optional</span><input value={draft.note ?? ''} maxLength={80} onChange={e => setDraft(d => ({...d, note: e.target.value}))}/></label>
      {problem && <p role="alert">{problem}</p>}
      <div className="budgets-form-actions"><button type="submit" className="secondary">Keep it</button><button type="button" className="quiet" onClick={() => { setAdding(false); setProblem(''); }}>Cancel</button></div>
    </form>}
    {problem && !adding && <p role="alert">{problem}</p>}
    <p className="fine" role="status">{said}</p>
  </section>;
}
