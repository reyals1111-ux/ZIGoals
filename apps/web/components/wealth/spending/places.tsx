'use client';
import {useEffect, useId, useMemo, useRef, useState, type RefObject} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {MONEY_MORE, type MoneyMore} from '../../../lib/money-more/schema';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {addPlace, forgetPayeeAt, forgetPlaces, keepPayeeAt, payeesAt, placesOf, removePlace, restorePayeeAt, restorePlace} from '../../../lib/money-log/places';
import {showUndo} from '../../ui/undo-toast';
import './money-r4.css';

/**
 * Session AV lane 2, round 4 (money; Actual's payee locations, LEDGER #346, by the owner's note: typed place names only):
 * in the money form, "Where are you? — optional": the person's own places as chips; choosing one lists the payees they
 * logged there, most used first, each one tap into the note (with the category it had before). Saving an entry while a
 * place is chosen keeps its payee with that place (`keepRef`, called by the form on Save). ZIGoals never asks the browser
 * where the person is: a place is the name they typed. "Your places" adds and removes them; "Forget places" clears all,
 * with Undo. Kept on this device in the money extras record; never on an entry.
 */
export type KeepPayee = ((note: string) => void) | null;
// Session AV lane 2 (CI run 2007): what it says goes to Spending's one status line (`say`), not a second one in the form.
export default function PlacePicker({kind, entries, onPayee, keepRef, say: setNote}: {kind: MoneyEntry['kind']; entries: readonly MoneyEntry[]; onPayee: (payee: string, category: string | null) => void; keepRef: RefObject<KeepPayee>; say: (text: string) => void}) {
  const id = useId(), more = useDeviceRecord(MONEY_MORE), [placeId, setPlaceId] = useState(''), [draft, setDraft] = useState(''), field = useRef<HTMLInputElement>(null);
  const places = placesOf(more.data), place = places.find(p => p.id === placeId) ?? null;
  const payees = useMemo(() => payeesAt(more.data, placeId, entries, kind), [more.data, placeId, entries, kind]);
  useEffect(() => {
    keepRef.current = place && more.loaded && !more.unreadable ? (text: string) => { try { more.update(m => keepPayeeAt(m, place.id, text)); } catch { /* the entry itself is saved; the place is a convenience */ } } : null;
    return () => { keepRef.current = null; };
  }, [place, more, keepRef]);
  if (!more.loaded || more.unreadable) return null;
  const add = () => {
    try { const pid = `pl_${crypto.randomUUID().slice(0, 12)}`, clean = draft.trim().replace(/\s+/g, ' '); more.update(m => addPlace(m, clean, pid)); setDraft(''); setPlaceId(pid); setNote(`${clean} added to your places and chosen.`); }
    catch (e) { setNote(e instanceof Error ? e.message : 'This could not be saved on this device.'); }
  };
  const forget = () => {
    const before = more.data.places;
    try { more.update(forgetPlaces); } catch { setNote('This could not be saved on this device.'); return; }
    setPlaceId(''); setNote('Your places are forgotten on this device.'); requestAnimationFrame(() => field.current?.focus());
    if (before?.length) showUndo({message: 'Your places are forgotten on this device.', undoLabel: 'Undo forgetting your places', undone: 'Your places are back.', restore: () => { more.update((m: MoneyMore) => m.places?.length ? m : {...m, places: before}); }});
  };
  return <fieldset className="spending-cats money-places"><legend>Where are you? — optional</legend>
    {places.length > 0 && <>
      <label className="spending-chip"><input type="radio" name={`${id}-place`} checked={!place} onChange={() => setPlaceId('')}/><span>Not said</span></label>
      {places.map(p => <label key={p.id} className="spending-chip"><input type="radio" name={`${id}-place`} checked={place?.id === p.id} onChange={() => setPlaceId(p.id)}/><span>{p.name}</span></label>)}
    </>}
    {place && (payees.length ? <div className="money-places-payees" role="group" aria-label={`Payees you logged at ${place.name}`}>
      <p className="fine">Payees you logged at {place.name}, most used first:</p>
      <ul>{payees.map(p => <li key={p.payee}><button type="button" className="quiet" onClick={() => { onPayee(p.payee, p.category); setNote(`${p.payee} is in the note${p.category ? `, and ${p.category} offered` : ''}.`); }}>{p.payee}{p.category ? <span className="fine"> · {p.category}</span> : null}</button>
        <button type="button" className="text-link" aria-label={`Forget ${p.payee} at ${place.name}`} onClick={() => { const at = (place.payees ?? []).findIndex(x => x === p.payee), pid = place.id, words = `${p.payee} is no longer kept with ${place.name}.`; more.update(m => forgetPayeeAt(m, pid, p.payee)); setNote(words); showUndo({message: words, undoLabel: `Undo forgetting ${p.payee}`, undone: `${p.payee} is kept with ${place.name} again.`, restore: () => { more.update(m => restorePayeeAt(m, pid, p.payee, Math.max(0, at))); }}); requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`input[name="${id}-place"]:checked`)?.focus()); }}>Forget</button></li>)}</ul>
    </div> : <p className="fine">Nothing kept with {place.name} yet: an entry you save while {place.name} is chosen keeps its payee (the note before “ · ”) here.</p>)}
    <details className="spending-own money-places-own"><summary>{places.length ? `Your places (${places.length})` : 'Add a place you often pay at'}</summary>
      <p className="fine">Name the places you often pay at — Work, The market, your parents’ town. Choose one when you log, and the payees you logged there come first. Typed names only: ZIGoals never reads where you are, and places stay on this device.</p>
      <div className="spending-own-row"><label className="field"><span>New place</span><input ref={field} value={draft} maxLength={40} autoComplete="off" placeholder="Work" onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}/></label><button type="button" className="secondary" onClick={add}>Add place</button></div>
      {places.length > 0 && <ul className="spending-own-list" aria-label="Your places">{places.map(p => <li key={p.id}><span>{p.name}{p.payees?.length ? <span className="fine"> · {p.payees.length} {p.payees.length === 1 ? 'payee' : 'payees'}</span> : null}</span><button type="button" className="text-link" aria-label={`Remove the place ${p.name}`} onClick={() => { const at = places.findIndex(x => x.id === p.id), kept = p, words = `${p.name} removed from your places.`; more.update(m => removePlace(m, p.id)); if (placeId === p.id) setPlaceId(''); setNote(words); showUndo({message: words, undoLabel: `Undo removing ${p.name}`, undone: `${p.name} is back with its payees.`, restore: () => { more.update(m => restorePlace(m, kept, Math.max(0, at))); }}); requestAnimationFrame(() => field.current?.focus()); }}>Remove</button></li>)}</ul>}
      {places.length > 0 && <button type="button" className="quiet" onClick={forget}>Forget places</button>}
    </details>
  </fieldset>;
}
