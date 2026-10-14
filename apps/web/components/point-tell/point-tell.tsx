'use client';
import {useCallback, useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {usePathname} from 'next/navigation';
import {getAppStorage} from '../../lib/showcase-storage';
import {readDeviceRecord, updateDeviceRecord} from '../../lib/device-record';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {APP_VERSION_LABEL, FEEDBACK_ADDRESS} from '../../lib/feedback';
import {MAX_NOTE, POINT_TELL, POINT_TELL_KEY, addPin, clearPins, describeTarget, editPin, pinPath, pinsMailto, pinsText, removePin, restorePin, type Pin, type PointTell as Record} from '../../lib/point-tell/store';
import './point-tell.css';

/**
 * Session AB-Cloud Part 6 (ADR-023 C23): Point & tell. A small button (above the music button; above the tab bar on
 * phones) starts picking: the next tap or click on any part of the page — or Tab to it and Enter — is not passed to the
 * page; it opens a note for that part instead. Notes show as numbered markers where their part can be found again, and
 * in a list to edit, remove (with Undo), copy, download or put into the feedback email. Esc always cancels. Nothing is
 * sent anywhere by this mode. Every target is at least 44 px; nothing moves under reduced motion or Motion Off.
 */
type Draft = {target: string; selector: string; path: string};
const UI = '[data-point-tell]';
const read = (): Record => { try { return readDeviceRecord(getAppStorage(), POINT_TELL).data; } catch { return {version: 1}; } };
const newId = () => `pin-${crypto.randomUUID()}`;

export function PointTell() {
  const pathname = usePathname() ?? '/', id = useId();
  const [record, setRecord] = useState<Record>(read), [picking, setPicking] = useState(false), [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState(''), [list, setList] = useState(false), [editing, setEditing] = useState<string | null>(null), [editText, setEditText] = useState('');
  const [message, setMessage] = useState(''), [removed, setRemoved] = useState<Pin | null>(null), [confirmClear, setConfirmClear] = useState(false);
  const [hover, setHover] = useState<DOMRect | null>(null), [markers, setMarkers] = useState<{pin: Pin; top: number; left: number}[]>([]);
  const launcher = useRef<HTMLButtonElement>(null), noteField = useRef<HTMLTextAreaElement>(null), listHeading = useRef<HTMLHeadingElement>(null), undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pins = record.pins ?? [];

  useEffect(() => {
    const refresh = () => setRecord(read());
    const onStore = (event: Event) => { if ((event as CustomEvent<string>).detail === POINT_TELL_KEY) refresh(); };
    window.addEventListener(ZIGI_STORE_EVENT, onStore); window.addEventListener('storage', refresh); window.addEventListener(ACCOUNT_CHANGE, refresh);
    return () => { window.removeEventListener(ZIGI_STORE_EVENT, onStore); window.removeEventListener('storage', refresh); window.removeEventListener(ACCOUNT_CHANGE, refresh); if (undoTimer.current) clearTimeout(undoTimer.current); };
  }, []);
  const write = useCallback((change: (r: Record) => Record): boolean => {
    try { const next = updateDeviceRecord(getAppStorage(), POINT_TELL, change); setRecord(next); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: POINT_TELL_KEY})); return true; }
    catch (error) { setMessage(error instanceof Error ? error.message : 'The note was not saved.'); return false; }
  }, []);

  // Picking: the page does not receive the tap; the part under it is described instead. Our own controls stay usable.
  useEffect(() => {
    if (!picking) { setHover(null); return; }
    const ours = (target: EventTarget | null) => target instanceof Element && !!target.closest(UI);
    const pick = (el: Element) => { const d = describeTarget(el); setPicking(false); setNote(''); setDraft({...d, path: pinPath(window.location.pathname)}); };
    const block = (event: Event) => { if (ours(event.target)) return; event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); };
    const click = (event: MouseEvent) => { if (ours(event.target)) return; block(event); if (event.target instanceof Element) pick(event.target); };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setPicking(false); launcher.current?.focus(); return; }
      const active = document.activeElement;
      if (event.key === 'Enter' && active && active !== document.body && !ours(active)) { block(event); pick(active); }
    };
    const show = (target: EventTarget | null) => { if (target instanceof Element && !ours(target)) setHover(target.getBoundingClientRect()); };
    const move = (event: PointerEvent) => show(event.target), focus = (event: FocusEvent) => show(event.target);
    document.addEventListener('click', click, true); document.addEventListener('pointerdown', block, true); document.addEventListener('mousedown', block, true);
    document.addEventListener('keydown', key, true); document.addEventListener('pointermove', move, true); document.addEventListener('focusin', focus, true);
    return () => { document.removeEventListener('click', click, true); document.removeEventListener('pointerdown', block, true); document.removeEventListener('mousedown', block, true); document.removeEventListener('keydown', key, true); document.removeEventListener('pointermove', move, true); document.removeEventListener('focusin', focus, true); };
  }, [picking]);
  useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(''), 8000); return () => clearTimeout(t); }, [message]);
  useEffect(() => { if (draft) noteField.current?.focus(); }, [draft]);
  useEffect(() => { if (list) listHeading.current?.focus(); }, [list]);

  // Numbered markers where a note's part is found again on this page (fixed, re-placed on scroll and resize).
  useLayoutEffect(() => {
    let frame = 0;
    const place = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => {
      const here = (record.pins ?? []).filter(p => p.path === pinPath(pathname) && p.selector);
      const next = here.flatMap(pin => { let el: Element | null = null; try { el = document.querySelector(pin.selector!); } catch { el = null; } if (!el) return []; const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > window.innerHeight) return []; return [{pin, top: Math.round(Math.max(4, r.top - 10)), left: Math.round(Math.max(4, Math.min(window.innerWidth - 48, r.left - 10)))}]; });
      // Only a real change re-renders, so the page observer below never feeds itself.
      setMarkers(prev => prev.length === next.length && prev.every((m, i) => m.pin === next[i]!.pin && m.top === next[i]!.top && m.left === next[i]!.left) ? prev : next);
    }); };
    place();
    window.addEventListener('scroll', place, true); window.addEventListener('resize', place);
    const observer = new MutationObserver(records => { if (records.some(m => !(m.target instanceof Element && m.target.closest(UI)))) place(); }); observer.observe(document.body, {childList: true, subtree: true});
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place); observer.disconnect(); };
  }, [record.pins, pathname]);

  const save = () => { if (!draft) return; if (write(r => addPin(r, {id: newId(), ...draft, note, at: new Date().toISOString()}))) { setDraft(null); setMessage(`Note saved on ${draft.target}.`); launcher.current?.focus(); } };
  const remove = (pin: Pin) => { if (!write(r => removePin(r, pin.id))) return; setRemoved(pin); setMessage(`Note ${pin.n} removed.`); if (undoTimer.current) clearTimeout(undoTimer.current); undoTimer.current = setTimeout(() => setRemoved(null), 8000); };
  const undo = () => { if (removed && write(r => restorePin(r, removed))) { setMessage(`Note ${removed.n} is back.`); setRemoved(null); } };
  const text = () => pinsText(pins, {version: APP_VERSION_LABEL, at: new Date().toISOString()});
  const copy = async () => { try { await navigator.clipboard.writeText(text()); setMessage('Your notes are copied.'); } catch { setMessage('Copying is not allowed here; use Download instead.'); } };
  const download = () => { const url = URL.createObjectURL(new Blob([text()], {type: 'text/plain;charset=utf-8'})); const a = document.createElement('a'); a.href = url; a.download = `zigoals-point-tell-${new Date().toISOString().slice(0, 10)}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('Your notes are downloading.'); };
  const closeList = () => { setList(false); setEditing(null); setConfirmClear(false); launcher.current?.focus(); };

  return <div className="point-tell" data-point-tell="">
    {hover && picking && <div className="pt-hover" aria-hidden="true" style={{top: hover.top - 3, left: hover.left - 3, width: hover.width + 6, height: hover.height + 6}} />}
    {picking && <p className="pt-hint" role="status">Tap or click the part you want to comment on, or move to it with Tab and press Enter. Esc cancels.</p>}
    {markers.map(m => <button key={m.pin.id} type="button" className="pt-marker" style={{top: m.top, left: m.left}} aria-label={`Note ${m.pin.n}: ${m.pin.target}`} onClick={() => { setList(true); setEditing(m.pin.id); setEditText(m.pin.note); }}>{m.pin.n}</button>)}
    <div className="pt-launch">
      <button ref={launcher} type="button" className="pt-button" aria-pressed={picking} aria-label={picking ? 'Stop picking' : 'Point & tell: pick a part of this page to comment on'} onClick={() => { setDraft(null); setList(false); setPicking(!picking); }}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" fill="currentColor"/></svg>
      </button>
      {pins.length > 0 && <button type="button" className="pt-count" aria-label={`Your Point & tell notes (${pins.length})`} onClick={() => { setPicking(false); setDraft(null); setList(!list); }}>{pins.length}</button>}
    </div>
    {draft && <div className="pt-sheet" role="dialog" aria-modal="true" aria-labelledby={`${id}-note`} onKeyDown={e => { if (e.key === 'Escape') { setDraft(null); launcher.current?.focus(); } }}>
      <h2 id={`${id}-note`}>Note on {draft.target}</h2>
      <p className="fine">{draft.path}</p>
      <label htmlFor={`${id}-text`}>Your note</label>
      <textarea id={`${id}-text`} ref={noteField} value={note} maxLength={MAX_NOTE} rows={4} onChange={e => setNote(e.target.value)} />
      <p className="fine">Stays on this device until you copy, download or email it. Please leave out codes, secrets and personal money or health details.</p>
      <div className="pt-actions"><button type="button" className="primary" onClick={save}>Save note</button><button type="button" className="secondary" onClick={() => { setDraft(null); launcher.current?.focus(); }}>Cancel</button></div>
    </div>}
    {list && <div className="pt-sheet pt-list" role="dialog" aria-modal="true" aria-labelledby={`${id}-list`} onKeyDown={e => { if (e.key === 'Escape') closeList(); }}>
      <h2 id={`${id}-list`} ref={listHeading} tabIndex={-1}>Your Point &amp; tell notes</h2>
      {pins.length === 0 ? <p>No notes yet. Use the pin button, then tap the part you want to comment on.</p> : <ol className="pt-items">{[...pins].sort((a, b) => a.n - b.n).map(p => <li key={p.id}>
        <p><strong>{p.n}.</strong> {p.target} <small>{p.path}</small></p>
        {editing === p.id ? <><label htmlFor={`${id}-edit-${p.n}`} className="sr-only">Note {p.n}</label><textarea id={`${id}-edit-${p.n}`} value={editText} maxLength={MAX_NOTE} rows={3} onChange={e => setEditText(e.target.value)} /><div className="pt-actions"><button type="button" className="primary" onClick={() => { if (write(r => editPin(r, p.id, editText))) { setEditing(null); setMessage(`Note ${p.n} saved.`); } }}>Save note {p.n}</button><button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button></div></>
          : <><p className="pt-note">{p.note || <em>No note written.</em>}</p><div className="pt-actions"><button type="button" className="secondary" onClick={() => { setEditing(p.id); setEditText(p.note); }}>Edit note {p.n}</button><button type="button" className="secondary" onClick={() => remove(p)}>Remove note {p.n}</button></div></>}
      </li>)}</ol>}
      {pins.length > 0 && <div className="pt-actions pt-export">
        <button type="button" className="secondary" onClick={() => void copy()}>Copy all</button>
        <button type="button" className="secondary" onClick={download}>Download</button>
        <a className="secondary" href={pinsMailto(FEEDBACK_ADDRESS, text())}>Email them</a>
        {!confirmClear ? <button type="button" className="secondary" onClick={() => setConfirmClear(true)}>Clear all…</button> : <button type="button" className="secondary" onClick={() => { if (write(clearPins)) { setConfirmClear(false); setMessage('Every note is cleared.'); } }}>Yes, clear {pins.length} notes</button>}
      </div>}
      <p className="fine">Email them opens your mail app with the notes; nothing is sent until you send it there. Long lists are shortened in the email: use Download or Copy for all of them.</p>
      <div className="pt-actions"><button type="button" className="secondary" onClick={closeList}>Close</button></div>
    </div>}
    <div className="pt-toast" aria-live="polite">{message && <p>{message}{removed && <button type="button" className="text-link" onClick={undo}>Undo</button>}</p>}</div>
  </div>;
}
