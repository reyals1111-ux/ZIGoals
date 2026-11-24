'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {SecretGuard} from '../secret-guard/secret-guard';
import {formatDate} from '../../lib/visual-format';
import {noteName, type Note, type Notes} from '../../lib/notes/schema';
import {bulkChange, cleanTag, type BulkAction} from '../../lib/notes/bulk';
import {shownOf, snippetOf} from '../../lib/notes/lock';
import {PROP_WORDS, propNameIssue, propNames, readValue} from '../../lib/notes/props';
import {PROP_TYPES, type PropType} from '../../lib/notes/schema';
import type {Change} from './note-editor';

/**
 * Session AV lane 2 (r5-notes; LEDGER #359, Logseq's bulk actions): "Select" in the Notes list (lazy, loaded on the
 * press). Each note gets a tick box; the bar above acts on the chosen ones in one step — add or remove a tag, pin or
 * unpin, archive, or delete (to Recently deleted) — with one Undo in the message. Done (or Esc) goes back to the list,
 * focus on Select.
 */
export default function NotesSelect({notes, change, onDone}: {notes: readonly Note[]; record: Notes; change: Change; onDone: () => void}) {
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set()), [tag, setTag] = useState(''), [said, setSaid] = useState('');
  // Session AV lane 2 (r6-notes; LEDGER #405, Capacities): one property set (or taken off) on every chosen note.
  const [propName, setPropName] = useState(''), [propType, setPropType] = useState<PropType>('text'), [propText, setPropText] = useState(''), [propTick, setPropTick] = useState(true);
  const wrap = useRef<HTMLDivElement>(null), id = useId();
  // Review b5i B5I-9: focus moves into the chooser (its first tick box, in the list under the bar), so Esc works at once.
  useEffect(() => { wrap.current?.querySelector<HTMLInputElement>('.notes-select-list input[type="checkbox"]')?.focus(); }, []);
  const ids = notes.map(n => n.id).filter(i => chosen.has(i)), n = ids.length;
  const toggle = (i: string, on: boolean) => setChosen(c => { const next = new Set(c); if (on) next.add(i); else next.delete(i); return next; });
  const run = (action: BulkAction, words: (count: number) => string) => {
    let result: {changed: number; skipped: number; full?: number; locked?: number} = {changed: 0, skipped: 0};
    const ok = change(r => { const out = bulkChange(r, ids, action, new Date().toISOString()); result = out; return out; }, words(n));
    if (ok) {
      const why = [result.full ? `${result.full} ${result.full === 1 ? 'holds' : 'hold'} ten properties already` : '', result.locked ? `${result.locked} ${result.locked === 1 ? 'is' : 'are'} locked` : ''].filter(Boolean).join(', ');
      setSaid(result.skipped ? `${result.changed} changed; ${result.skipped} left as they were (${why || 'it did not fit them'}).` : ''); setChosen(new Set());
    }
  };
  const many = (c: number) => c === 1 ? '1 note' : `${c} notes`;
  const tagged = cleanTag(tag);
  const known = propNames(notes.map(shownOf)) /* a locked note's properties are never named */, nameIssue = propName.trim() ? propNameIssue(propName) : null;
  const value = propType === 'tick' ? propTick : readValue(propType, propText), canSet = !!propName.trim() && !nameIssue && value !== null && (propType === 'tick' || !!propText.trim());
  const pickName = (v: string) => { setPropName(v); const k = known.find(x => x.name.toLowerCase() === v.trim().toLowerCase()); if (k) setPropType(k.type); };
  return <div className="notes-select" ref={wrap} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); onDone(); } }}>
    <div className="notes-select-bar" role="group" aria-label="Act on the chosen notes">
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
      <fieldset className="notes-select-prop">
        <legend>Set a property <span className="fine">· on every chosen note</span></legend>
        <label className="field"><span>Property</span><input value={propName} maxLength={40} list={`${id}-props`} onChange={e => pickName(e.target.value)} placeholder="Status" aria-invalid={nameIssue ? true : undefined} aria-describedby={`${id}-prop`}/></label>
        {known.length > 0 && <datalist id={`${id}-props`}>{known.map(k => <option key={k.name} value={k.name}/>)}</datalist>}
        <label className="field"><span>Type</span><select value={propType} onChange={e => setPropType(e.target.value as PropType)}>{PROP_TYPES.map(t => <option key={t} value={t}>{PROP_WORDS[t]}</option>)}</select></label>
        {propType === 'tick' ? <label className="switch-row"><input type="checkbox" checked={propTick} onChange={e => setPropTick(e.target.checked)}/> <span>Ticked</span></label>
          : <label className="field"><span>Value</span><input type={propType === 'date' ? 'date' : 'text'} inputMode={propType === 'number' ? 'decimal' : undefined} value={propText} maxLength={500} onChange={e => setPropText(e.target.value)}/></label>}
        <SecretGuard text={propText} onRemove={() => setPropText('')}/>
        <p className="fine" id={`${id}-prop`}>{nameIssue ?? 'A note that holds ten properties already, or a locked note, is left as it is and counted.'}</p>
        <div className="note-actions">
          <button type="button" className="quiet" disabled={!n || !canSet} onClick={() => value !== null && run({kind: 'prop-set', prop: {k: propName, t: propType, v: value}}, c => `${propName.trim()} set on ${many(c)}.`)}>Set property</button>
          <button type="button" className="quiet" disabled={!n || !propName.trim()} onClick={() => run({kind: 'prop-remove', name: propName}, c => `${propName.trim()} taken off ${many(c)}.`)}>Remove property</button>
        </div>
      </fieldset>
      {said && <p className="fine" role="status">{said}</p>}
    </div>
    <ul className="note-list notes-select-list" aria-label="Notes to choose">{notes.map(x => { const name = x.kind === 'daily' && x.day ? formatDate(x.day, {weekday: true}) : noteName(x); return <li key={x.id}>
      <label className="notes-select-item"><input type="checkbox" checked={chosen.has(x.id)} onChange={e => toggle(x.id, e.target.checked)}/>
        <span><strong>{name}</strong>{x.kind === 'daily' && <span className="fine"> · daily note</span>}{x.pinned && <span className="fine"> · pinned</span>}<span className="fine notes-select-line">{snippetOf(x, 80)}</span></span></label>
    </li>; })}</ul>
  </div>;
}
