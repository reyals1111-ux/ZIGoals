'use client';
import {useEffect, useId, useMemo, useRef, useState, type KeyboardEvent} from 'react';
import {findMatches, replaceAll, replaceOne} from '../../lib/notes/find';

/**
 * Session AV lane 2 (r4-notes; LEDGER #312, Bear's find and replace): find words in the note being edited — every match
 * counted, stepped through with Next and Previous (Enter and Shift+Enter in the field), shown in its place below and
 * chosen in the text — and replace one or all. A replace changes the words being edited; Save keeps the earlier words
 * as a version (Earlier versions), as every save does. Esc closes it and puts focus back. Its own chunk.
 */
export default function NoteFind({value, onChange, field, onClose}: {value: string; onChange: (next: string) => void; field: () => HTMLTextAreaElement | null; onClose: () => void}) {
  const id = useId(), findRef = useRef<HTMLInputElement>(null);
  const [find, setFind] = useState(''), [replace, setReplace] = useState(''), [matchCase, setMatchCase] = useState(false), [at, setAt] = useState(0), [said, setSaid] = useState('');
  const matches = useMemo(() => findMatches(value, find, matchCase), [value, find, matchCase]);
  const current = matches.length ? Math.min(at, matches.length - 1) : -1, hit = current >= 0 ? matches[current]! : null;
  useEffect(() => { findRef.current?.focus(); }, []);
  // The match is chosen in the text (seen when the text has focus) and scrolled to — when the match changes, not on
  // every key typed in the text itself.
  const latest = useRef({value, field}); latest.current = {value, field};
  useEffect(() => {
    const {value: text, field: get} = latest.current, el = get(); if (!el || hit === null) return;
    el.setSelectionRange(hit, hit + find.length);
    const lines = text.slice(0, hit).split('\n').length - 1, all = Math.max(1, text.split('\n').length);
    el.scrollTop = Math.max(0, (lines / all) * el.scrollHeight - el.clientHeight / 2);
  }, [hit, find.length]);
  const step = (by: number) => { if (!matches.length) return; setAt((current + by + matches.length) % matches.length); setSaid(''); };
  const one = () => { if (hit === null) return; onChange(replaceOne(value, hit, find.length, replace)); setSaid('Replaced 1. Save keeps the earlier words under Earlier versions.'); };
  const all = () => { if (!matches.length) return; const n = matches.length; onChange(replaceAll(value, find, replace, matchCase)); setAt(0); setSaid(`Replaced ${n}. Save keeps the earlier words under Earlier versions.`); };
  const keys = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
  const onFind = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); step(e.shiftKey ? -1 : 1); } };
  const before = hit !== null ? value.slice(Math.max(0, hit - 40), hit).replace(/\s+/g, ' ') : '', after = hit !== null ? value.slice(hit + find.length, hit + find.length + 40).replace(/\s+/g, ' ') : '';
  return <section className="note-find" aria-labelledby={`${id}-t`} onKeyDown={keys}>
    <h3 id={`${id}-t`} className="note-find-title">Find and replace</h3>
    <div className="note-find-row">
      <label className="field"><span>Find</span><input ref={findRef} type="search" value={find} onChange={e => { setFind(e.target.value); setAt(0); setSaid(''); }} onKeyDown={onFind} aria-describedby={`${id}-n`}/></label>
      <p id={`${id}-n`} className="fine note-find-count" aria-live="polite">{!find ? 'Type the words to find.' : matches.length ? `${current + 1} of ${matches.length}` : 'No match in this note.'}</p>
      <div className="note-actions">
        <button type="button" className="quiet" disabled={matches.length < 2} onClick={() => step(-1)}>Previous</button>
        <button type="button" className="quiet" disabled={matches.length < 1} onClick={() => step(1)}>Next</button>
        <label className="switch-row"><input type="checkbox" checked={matchCase} onChange={e => { setMatchCase(e.target.checked); setAt(0); }}/> <span>Match case</span></label>
      </div>
    </div>
    {hit !== null && <p className="fine note-find-context">{hit > 40 ? '…' : ''}{before}<mark>{value.slice(hit, hit + find.length)}</mark>{after}{hit + find.length + 40 < value.length ? '…' : ''}</p>}
    <div className="note-find-row">
      <label className="field"><span>Replace with</span><input value={replace} onChange={e => setReplace(e.target.value)}/></label>
      <div className="note-actions">
        <button type="button" className="secondary" disabled={hit === null} onClick={one}>Replace</button>
        <button type="button" className="secondary" disabled={!matches.length} onClick={all}>{matches.length > 1 ? `Replace all ${matches.length}` : 'Replace all'}</button>
        <button type="button" className="quiet" onClick={onClose}>Close</button>
      </div>
    </div>
    {said && <p className="fine" role="status">{said}</p>}
  </section>;
}
