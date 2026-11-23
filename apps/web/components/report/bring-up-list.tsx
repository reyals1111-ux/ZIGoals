'use client';
import {useId, useRef, useState} from 'react';
import {addBringUp, BRING_UP, BRING_UP_FROM_WORDS, BRING_UP_MAX_CHARS, clearTicked, MAX_BRING_UP, newBringUpId, openBringUp, removeBringUp, restoreBringUp, tickBringUp} from '../../lib/clinician-report/bring-up';
import {formatDate} from '../../lib/visual-format';
import {useDeviceRecord} from '../ai/use-device-record';
import {showUndo} from '../ui/undo-toast';
import '../health/r6/body-r6.css';

/**
 * Session AV lane 2, round 6 (r6-body; LEDGER #417, Moodfit's notes for an appointment): "To bring up at your next visit"
 * in Settings → Your data → Report for a visit — the lines kept between visits (up to 20): typed here, or added in one
 * tap from a journal entry or a feeling word. They print at the top of the report; after the visit each is ticked off,
 * and "Clear the ticked lines" (with Undo) makes room. The person's own words, as written. Its own chunk.
 */
export default function BringUpList() {
  const rec = useDeviceRecord(BRING_UP), [draft, setDraft] = useState(''), [status, setStatus] = useState(''), input = useRef<HTMLInputElement>(null), box = useRef<HTMLDivElement>(null), id = useId();
  if (!rec.loaded) return <p className="fine">Opening your list…</p>;
  if (rec.unreadable) return <p role="alert">Your list to bring up on this device could not be read. It was not changed.</p>;
  const items = rec.data.items, open = openBringUp(rec.data), ticked = items.length - open.length;
  const save = (change: Parameters<typeof rec.update>[0], said: string) => { try { rec.update(change); setStatus(said); return true; } catch (cause) { setStatus(cause instanceof Error ? cause.message : 'This could not be saved on this device.'); return false; } };
  const add = () => { const text = draft; if (save(r => addBringUp(r, {text, from: 'typed'}, newBringUpId(), new Date()), 'Added to your list.')) { setDraft(''); input.current?.focus(); } };
  const remove = (itemId: string) => {
    const at = items.findIndex(x => x.id === itemId), item = items[at]!;
    if (!save(r => removeBringUp(r, itemId), 'The line is removed.')) return;
    showUndo({message: `“${item.text}” is removed from your list.`, restore: () => rec.update(r => restoreBringUp(r, item, at)), undone: 'The line is back.'});
    requestAnimationFrame(() => (box.current?.querySelector<HTMLElement>('.r6-lines input') ?? input.current)?.focus());
  };
  const clear = () => {
    let removed: typeof items = [];
    if (!save(r => { const out = clearTicked(r); removed = out.removed; return out.record; }, 'The ticked lines are cleared.')) return;
    const gone = removed;
    showUndo({message: `${gone.length} ticked ${gone.length === 1 ? 'line is' : 'lines are'} cleared.`, restore: () => rec.update(r => gone.reduce((acc, x) => restoreBringUp(acc, x, items.findIndex(y => y.id === x.id)), r)), undone: 'The ticked lines are back.'});
    requestAnimationFrame(() => input.current?.focus());
  };
  return <div className="r6-bring-up" ref={box}>
    <p className="fine">Things you want to mention at your next appointment, kept between visits. They print at the top of your report. Add one here, or from a journal entry (More) or a feeling word.</p>
    {items.length ? <ul className="r6-lines" aria-label="To bring up">{items.map(x => <li key={x.id} data-done={x.doneAt ? 'true' : undefined}>
      <input type="checkbox" id={`${id}-${x.id}`} checked={!!x.doneAt} onChange={e => save(r => tickBringUp(r, x.id, e.target.checked, new Date()), e.target.checked ? 'Ticked off.' : 'Back on your list.')}/>
      <label htmlFor={`${id}-${x.id}`}><span dir="auto">{x.text}</span> <small className="fine">· {BRING_UP_FROM_WORDS[x.from]}{x.day ? `, ${formatDate(x.day)}` : ''}{x.doneAt ? ' · ticked off' : ''}</small></label>
      <button type="button" className="quiet" aria-label={`Remove “${x.text}”`} onClick={() => remove(x.id)}>Remove</button>
    </li>)}</ul> : <p className="fine">Nothing on your list yet. When something comes to mind between visits, add it here so it is not forgotten.</p>}
    {items.length < MAX_BRING_UP ? <div className="r6-add">
      <label className="field"><span>Something to bring up ({items.length} of {MAX_BRING_UP})</span><input ref={input} type="text" value={draft} maxLength={BRING_UP_MAX_CHARS} autoComplete="off" onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}/></label>
      <button type="button" className="secondary" onClick={add}>Add</button>
    </div> : <p className="fine">Your list is full ({MAX_BRING_UP} lines). Tick off or remove one to add another.</p>}
    {ticked > 0 && <p><button type="button" className="secondary" onClick={clear}>Clear the ticked lines ({ticked})</button></p>}
    <p className="fine" role="status" aria-live="polite">{status}</p>
  </div>;
}
