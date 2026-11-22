'use client';
import {useId, useMemo, useState, type RefObject} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {MONEY_MORE} from '../../../lib/money-more/schema';
import {PAID_WITH, PAID_WITH_WORDS, addSub, byPaidWith, bySub, entryFromSaved, moveSaved, removeSub, savedLabel, subsOf, withSaved, withoutSaved} from '../../../lib/money-more/quick';
import {mineParts} from '../../../lib/money-log/counted';
import {addEntry} from '../../../lib/money-log/engine';
import type {MoneyEntry, MoneyLog, PaidWith} from '../../../lib/money-log/schema';
import {changeWithUndo} from '../../ui/remove-with-undo';
import {moneyCents} from '../money-tools/format';
import './quick-log.css';
// Session AV lane 2, round 4 (money; Actual's payee locations, LEDGER #346): typed places with their payees (this chunk).
import PlacePicker, {type KeepPayee} from './places';

/**
 * Session AV lane 2, round 2 (money; Wallet's record templates and payment types, Emma's subcategories): the quick parts
 * of the money log, in their own chunk loaded after Spending's body — saved entries as one-tap chips (each an ordinary
 * entry, dated today, with Undo), the form's subcategory and "paid with", keeping the form as a saved entry, and the
 * month's spending by method and by subcategory. Nothing here converts between currencies.
 */
const money = (cents: number, currency: string) => moneyCents(cents, currency);
type Update = (fn: (log: MoneyLog) => MoneyLog) => unknown;

/** The saved entries as chips beside "Log spending": one tap logs it today. */
export function SavedChips({update, today, onSaid, onManage}: {update: Update; today: string; onSaid: (words: string) => void; onManage?: () => void}) {
  const more = useDeviceRecord(MONEY_MORE), id = useId(), [arranging, setArranging] = useState(false);
  const saved = more.data.saved ?? [];
  if (!more.loaded || more.unreadable || !saved.length) return null;
  const tap = (s: (typeof saved)[number]) => {
    const words = `${s.kind === 'income' ? 'Received' : 'Spent'} ${money(Math.round(Number(s.amount) * 100), s.currency)} · ${s.name} · saved for today.`;
    void changeWithUndo(update, log => addEntry(log, entryFromSaved(s, today, crypto.randomUUID(), new Date().toISOString())), words, {undone: `${s.name} taken out again.`, undoLabel: `Undo logging ${s.name}`})
      .then(() => onSaid(words), () => onSaid('This could not be saved on this device. Nothing was changed.'));
  };
  return <div className="quick-saved" role="group" aria-labelledby={`${id}-t`}>
    <p id={`${id}-t`} className="fine quick-saved-title">Saved entries · one tap logs it today</p>
    <ul className="quick-saved-list">{saved.map((s, i) => <li key={s.id}>
      {arranging ? <span className="quick-saved-arrange"><span>{s.name}</span>
        <button type="button" className="quiet" disabled={i === 0} aria-label={`Move ${s.name} earlier`} onClick={() => more.update(m => moveSaved(m, s.id, -1))}>↑</button>
        <button type="button" className="quiet" disabled={i === saved.length - 1} aria-label={`Move ${s.name} later`} onClick={() => more.update(m => moveSaved(m, s.id, 1))}>↓</button>
        <button type="button" className="quiet" aria-label={`Remove the saved entry ${s.name}`} onClick={() => { more.update(m => withoutSaved(m, s.id)); onSaid(`${s.name} is no longer a saved entry; entries you logged with it stay.`); }}>Remove</button></span>
      : <button type="button" className="quick-chip" aria-label={`Log ${savedLabel(s, money)} today`} onClick={() => tap(s)}>{savedLabel(s, money)}</button>}
    </li>)}</ul>
    <button type="button" className="text-link" aria-pressed={arranging} onClick={() => { setArranging(v => !v); onManage?.(); }}>{arranging ? 'Done' : 'Arrange saved entries'}</button>
  </div>;
}

/** Inside the form, under Category: its subcategories (and adding one), how it was paid, and "Keep as a saved entry". */
export function FormExtras({log, update, category, sub, setSub, paidWith, setPaidWith, draft, editing, keepPlace, onPayee}: {
  log: MoneyLog; update: Update; category: string; sub: string; setSub: (s: string) => void; paidWith: PaidWith | ''; setPaidWith: (p: PaidWith | '') => void;
  draft: {kind: MoneyEntry['kind']; amount: string | null; currency: string; note: string}; editing: boolean;
  /** Session AV lane 2, round 4 (LEDGER #346): the form calls `keepPlace.current` on Save; a place's payee fills the note. */
  keepPlace?: RefObject<KeepPayee>; onPayee?: (payee: string, category: string | null) => void;
}) {
  const id = useId(), more = useDeviceRecord(MONEY_MORE), subs = subsOf(log, category);
  const [newSub, setNewSub] = useState(''), [note, setNote] = useState(''), [name, setName] = useState(''), [keeping, setKeeping] = useState(false);
  const add = () => { try { const clean = newSub.trim().replace(/\s+/g, ' '); update(l => addSub(l, category, clean)); setSub(clean); setNewSub(''); setNote(`${clean} added under ${category}.`); } catch (e) { setNote(e instanceof Error ? e.message : 'Not saved on this device.'); } };
  const keep = () => {
    if (!draft.amount) { setNote('Type an amount above zero first; a saved entry keeps it.'); return; }
    try {
      more.update(m => withSaved(m, {name: name || draft.note || category, kind: draft.kind, amount: draft.amount!, currency: draft.currency, category, ...(sub ? {sub} : {}), ...(draft.note ? {note: draft.note} : {}), ...(paidWith ? {paidWith} : {})}, `sv_${crypto.randomUUID().slice(0, 12)}`));
      setNote(`Kept as a saved entry: ${(name || draft.note || category).trim()}. It is one tap beside Log spending.`); setKeeping(false); setName('');
    } catch (e) { setNote(e instanceof Error ? e.message : 'Not saved on this device.'); }
  };
  return <div className="quick-form">
    {draft.kind === 'expense' && <fieldset className="spending-cats quick-subs"><legend>Subcategory of {category} — optional</legend>
      {subs.length > 0 && <>
        <label className="spending-chip"><input type="radio" name={`${id}-sub`} checked={!sub} onChange={() => setSub('')}/><span>None</span></label>
        {subs.map(s => <label key={s} className="spending-chip"><input type="radio" name={`${id}-sub`} checked={sub === s} onChange={() => setSub(s)}/><span>{s}</span></label>)}
      </>}
      <details className="quick-subs-own"><summary>{subs.length ? `Your subcategories (${subs.length})` : `Add a subcategory under ${category}`}</summary>
        <p className="fine">Yours, under {category}: totals and budgets count them in {category}; This month shows them apart.</p>
        <div className="spending-own-row"><label className="field"><span>New subcategory</span><input value={newSub} maxLength={40} autoComplete="off" placeholder="Coffee" onChange={e => setNewSub(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}/></label><button type="button" className="secondary" onClick={add}>Add subcategory</button></div>
        {subs.length > 0 && <ul className="spending-own-list">{subs.map(s => <li key={s}><span>{s}</span><button type="button" className="text-link" aria-label={`Remove ${s} from the subcategories of ${category}`} onClick={() => { update(l => removeSub(l, category, s)); if (sub === s) setSub(''); setNote(`${s} removed from the choices; entries that carry it keep it.`); }}>Remove</button></li>)}</ul>}
      </details>
    </fieldset>}
    {!editing && keepPlace && onPayee && <PlacePicker kind={draft.kind} entries={log.entries} onPayee={onPayee} keepRef={keepPlace}/>}
    <label className="field quick-paid"><span>Paid with — optional</span><select value={paidWith} onChange={e => setPaidWith(e.target.value as PaidWith | '')}><option value="">Not said</option>{PAID_WITH.map(p => <option key={p} value={p}>{PAID_WITH_WORDS[p].en}</option>)}</select></label>
    {!editing && more.loaded && !more.unreadable && (!keeping ? <button type="button" className="text-link quick-keep" aria-expanded={false} onClick={() => setKeeping(true)}>Keep as a saved entry</button>
      : <div className="spending-own-row quick-keep-row"><label className="field"><span>Name of the saved entry</span><input value={name} maxLength={40} autoComplete="off" placeholder={draft.note || 'Coffee'} onChange={e => setName(e.target.value)}/></label><button type="button" className="secondary" onClick={keep}>Keep it</button><button type="button" className="quiet" onClick={() => setKeeping(false)}>Cancel</button></div>)}
    <p className="fine" role="status">{note}</p>
  </div>;
}

/** Under "This month by category": the month's spending by how it was paid, and each category's subcategories. */
export function MonthExtras({entries, from, to}: {entries: readonly MoneyEntry[]; from: string; to: string}) {
  const methods = useMemo(() => byPaidWith(entries, from, to), [entries, from, to]);
  const withSubs = useMemo(() => [...new Set(entries.filter(e => e.sub && e.kind === 'expense' && e.date >= from && e.date <= to).map(e => e.category))], [entries, from, to]);
  const marked = methods.some(m => m.method !== 'unmarked');
  if (!marked && !withSubs.length) return null;
  return <div className="quick-month">
    {marked && <p className="fine quick-methods"><strong>Paid with this month:</strong> {methods.map(m => `${m.method === 'unmarked' ? 'not said' : PAID_WITH_WORDS[m.method].en} ${money(m.cents, m.currency)}`).join(' · ')}</p>}
    {withSubs.map(c => { const rows = bySub(entries, c, from, to, mineParts); return <p key={c} className="fine quick-sub-line"><strong>{c}:</strong> {rows.map(r => `${r.sub ?? 'other'} ${money(r.cents, r.currency)}`).join(' · ')}</p>; })}
  </div>;
}
