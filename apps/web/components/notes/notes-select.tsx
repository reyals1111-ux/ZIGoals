'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {SecretGuard} from '../secret-guard/secret-guard';
import {formatDate} from '../../lib/visual-format';
import {noteName, type Note, type Notes} from '../../lib/notes/schema';
import {bulkChange, cleanTag, type BulkAction} from '../../lib/notes/bulk';
import {snippetOf} from '../../lib/notes/lock';
import type {Change} from './note-editor';

/**
 * Session AV lane 2 (r5-notes; LEDGER #359, Logseq's bulk actions): "Select" in the Notes list (lazy, loaded on the
 * press). Each note gets a tick box; the bar above acts on the chosen ones in one step — add or remove a tag, pin or
 * unpin, archive, or delete (to Recently deleted) — with one Undo in the message. Done (or Esc) goes back to the list,
 * focus on Select.
 */
export default function NotesSelect({notes, change, onDone}: {notes: readonly Note[]; record: Notes; change: Change; onDone: () => void}) {
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set()), [tag, setTag] = useState(''), [said, setSaid] = useState('');
  const bar = useRef<HTMLDivElement>(null), id = useId();
  useEffect(() => { bar.current?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.focus(); }, []);
  const ids = notes.map(n => n.id).filter(i => chosen.has(i)), n = ids.length;
  const toggle = (i: string, on: boolean) => setChosen(c => { const next = new Set(c); if (on) next.add(i); else next.delete(i); return next; });
  const run = (action: BulkAction, words: (count: number) => string) => {
    let result = {changed: 0, skipped: 0};
    const ok = change(r => { const out = bulkChange(r, ids, action, new Date().toISOString()); result = out; return out; }, words(n));
    if (ok) { setSaid(result.skipped ? `${result.changed} changed; ${result.skipped} left as they were (it did not fit them).` : ''); setChosen(new Set()); }
  };
  const many = (c: number) => c === 1 ? '1 note' : `${c} notes`;
  const tagged = cleanTag(tag);
  return <div className="notes-select" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); onDone(); } }}>
    <div className="notes-select-bar" role="group" aria-label="Act on the chosen notes" ref={bar}>
      <p className="fine" aria-live="polite"><strong>{n ? `${many(n)} chosen` : 'No note chosen yet'}</strong></p>
      <div className="note-actions">
        <button type="button" className="quiet" disabled={n === notes.length} onClick={() => setChosen(new Set(notes.map(x => x.id)))}>Choose all</button>
        <button type="button" className="quiet" disabled={!n} onClick={() => setChosen(new Set())}>Choose none</button>
        <button type="button" className="secondary" onClick={onDone}>Done</button>
      </div>
      <label className="field"><span>Tag</span><input value={tag} maxLength={40} onChange={e => setTag(e.target.value)} placeholder="work/meetings" aria-describedby={`${id}-tag`}/></label>
      <SecretGuard text={tag} onRemove={() => setTag('')}/>
      <p className="fine" id={`${id}-tag`}>Add or remove it on every chosen note. A #tag written in a note&rsquo;s words stays until you edit them.</p>
      <div className="note-actions">
        <button type="button" className="quiet" disabled={!n || !tagged} onClick={() => tagged && run({kind: 'tag-add', tag: tagged}, c => `#${tagged} added to ${many(c)}.`)}>Add tag</button>
        <button type="button" className="quiet" disabled={!n || !tagged} onClick={() => tagged && run({kind: 'tag-remove', tag: tagged}, c => `#${tagged} taken off ${many(c)}.`)}>Remove tag</button>
        <button type="button" className="quiet" disabled={!n} onClick={() => run({kind: 'pin', on: true}, c => `${many(c)} pinned.`)}>Pin</button>
        <button type="button" className="quiet" disabled={!n} onClick={() => run({kind: 'pin', on: false}, c => `${many(c)} unpinned.`)}>Unpin</button>
        <button type="button" className="quiet" disabled={!n} onClick={() => run({kind: 'archive'}, c => `${many(c)} archived: out of the list and the graph, still in Search.`)}>Archive</button>
        <button type="button" className="quiet" disabled={!n} onClick={() => run({kind: 'delete'}, c => `${many(c)} deleted. They wait 30 days in Recently deleted.`)}>Delete</button>
      </div>
      {said && <p className="fine" role="status">{said}</p>}
    </div>
    <ul className="note-list notes-select-list" aria-label="Notes to choose">{notes.map(x => { const name = x.kind === 'daily' && x.day ? formatDate(x.day, {weekday: true}) : noteName(x); return <li key={x.id}>
      <label className="notes-select-item"><input type="checkbox" checked={chosen.has(x.id)} onChange={e => toggle(x.id, e.target.checked)}/>
        <span><strong>{name}</strong>{x.kind === 'daily' && <span className="fine"> · daily note</span>}{x.pinned && <span className="fine"> · pinned</span>}<span className="fine notes-select-line">{snippetOf(x, 80)}</span></span></label>
    </li>; })}</ul>
  </div>;
}
