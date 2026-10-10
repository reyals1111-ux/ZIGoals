'use client';
import {useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode} from 'react';
import {removeSuggestion, setPinned, shownSuggestions, ZIGI_SUGGESTIONS} from '../../lib/zigi-suggestions';
import {useDeviceRecord} from './use-device-record';

/**
 * The Suggestions sheet (Session Z-Cloud Part 2, ADR-019): what used to fill a new chat now waits behind one chip by the
 * composer, so a new chat is one short greeting and the box. Three tabs: "Ideas" (the built-in questions for this page),
 * "Your day" (the brief from your records, your week and patterns) and "Yours" (questions you asked three times within
 * thirty days, kept on this device only, lib/zigi-suggestions.ts). A tapped suggestion is sent like typed words; nothing
 * leaves the device before that. Tabs follow the ARIA tab pattern (arrow keys, Home, End); Escape closes the sheet.
 */
export type SheetTab = 'ideas' | 'day' | 'yours';
const TABS: readonly {id: SheetTab; label: string}[] = [{id: 'ideas', label: 'Ideas'}, {id: 'day', label: 'Your day'}, {id: 'yours', label: 'Yours'}];
export function SuggestionsChip({open, controls, onToggle}: {open: boolean; controls: string; onToggle: () => void}) {
  return <button type="button" className={`ai-chip ai-suggest-chip${open ? ' ai-suggest-chip-on' : ''}`} aria-expanded={open} aria-controls={controls} onClick={onToggle}>
    <svg className="ai-suggest-spark" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="currentColor"/></svg>
    Suggestions</button>;
}
export function SuggestionsSheet({id, ideas, day, healthShared, onAsk, onClose}: {id: string; ideas: ReactNode; day: ReactNode; healthShared: boolean; onAsk: (text: string) => void; onClose: () => void}) {
  const [tab, setTab] = useState<SheetTab>('ideas'), base = useId(), tabs = useRef<HTMLDivElement>(null);
  const onTabKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const at = TABS.findIndex(t => t.id === tab), move = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : event.key === 'Home' ? -at : event.key === 'End' ? TABS.length - 1 - at : 0;
    if (!move) return;
    event.preventDefault();
    const next = TABS[(at + move + TABS.length) % TABS.length]!;
    setTab(next.id); tabs.current?.querySelector<HTMLElement>(`#${CSS.escape(`${base}-${next.id}`)}`)?.focus();
  };
  return <section id={id} className="ai-suggest-sheet" aria-label="Suggestions for you" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); } }}>
    <div className="ai-suggest-head">
      <div ref={tabs} className="ai-suggest-tabs" role="tablist" aria-label="Suggestions" onKeyDown={onTabKey}>
        {TABS.map(t => <button key={t.id} id={`${base}-${t.id}`} type="button" role="tab" aria-selected={tab === t.id} aria-controls={`${base}-${t.id}-panel`} tabIndex={tab === t.id ? 0 : -1} className="ai-suggest-tab" onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      <button type="button" className="ai-suggest-close" aria-label="Close suggestions" data-tip="Close" onClick={onClose}><span aria-hidden="true">×</span></button>
    </div>
    {TABS.map(t => <div key={t.id} id={`${base}-${t.id}-panel`} role="tabpanel" aria-labelledby={`${base}-${t.id}`} className="ai-suggest-panel" hidden={tab !== t.id}>
      {t.id === 'ideas' ? ideas : t.id === 'day' ? day : <YoursList healthShared={healthShared} onAsk={onAsk}/>}
    </div>)}
  </section>;
}
function YoursList({healthShared, onAsk}: {healthShared: boolean; onAsk: (text: string) => void}) {
  const record = useDeviceRecord(ZIGI_SUGGESTIONS), [note, setNote] = useState('');
  const shown = record.loaded ? shownSuggestions(record.data, {healthShared}) : [];
  const change = (apply: () => void, done: string) => { try { apply(); setNote(done); } catch { setNote('This could not be saved on this device.'); } };
  if (!shown.length) return <p className="ai-note ai-suggest-empty">Questions you ask three times within a month appear here, marked “Yours”. They stay on this device and go to your AI only when you send one.{note && <span className="ai-sr-only" role="status">{note}</span>}</p>;
  return <>
    <ul className="ai-yours" aria-label="Your own suggestions">
      {shown.map(s => <li key={s.key} className="ai-yours-item">
        <button type="button" className="ai-chip ai-yours-ask" onClick={() => onAsk(s.text)}><span className="ai-yours-tag">Yours</span> {s.text}</button>
        <button type="button" className="ai-yours-pin" aria-pressed={s.pinned} aria-label={`${s.pinned ? 'Unpin' : 'Pin'}: ${s.text}`} data-tip={s.pinned ? 'Unpin' : 'Pin to the top'} onClick={() => change(() => record.update(r => setPinned(r, s.key, !s.pinned)), s.pinned ? 'Unpinned.' : 'Pinned to the top.')}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M9 4h6l-1 6 3 3v2H7v-2l3-3zM12 15v5" fill={s.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/></svg></button>
        <button type="button" className="ai-yours-remove" aria-label={`Remove: ${s.text}`} data-tip="Remove" onClick={() => change(() => record.update(r => removeSuggestion(r, s.key)), 'Removed from this device.')}><span aria-hidden="true">×</span></button>
      </li>)}
    </ul>
    <p className="ai-note">Kept on this device only; never synced. Settings → What ZIGi knows lists them with “Forget all”.</p>
    {note && <span className="ai-sr-only" role="status">{note}</span>}
  </>;
}
