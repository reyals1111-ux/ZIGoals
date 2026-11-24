'use client';
import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {noteName, type Note, type Notes} from '../../lib/notes/schema';
import {mergeNotes, mergePreview, mergeTargets} from '../../lib/notes/merge';
import {formatDate} from '../../lib/visual-format';
import type {Change} from './note-editor';

/**
 * Session AV lane 2 (r6-notes; LEDGER #407, Capacities): "Merge into …" on a topic note (lazy, loaded on the press).
 * Choose the note it joins; the panel says what moves (words, photos, tags, properties) and how many links follow it,
 * and why it cannot happen when it cannot (too many photos or tags, too long). Merge keeps the other note's earlier
 * words as a version and this note whole in Recently deleted; one Undo in the message puts both back. Esc or Cancel
 * closes it, focus back on the button.
 */
const label = (n: Note) => n.kind === 'daily' && n.day ? `${formatDate(n.day, {weekday: true})} (daily note)` : noteName(n);
const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;
export default function NoteMerge({note, record, change, onClose, onMerged}: {note: Note; record: Notes; change: Change; onClose: () => void; onMerged?: (id: string) => void}) {
  const targets = useMemo(() => mergeTargets(record, note.id), [record, note.id]), id = useId(), box = useRef<HTMLDivElement>(null);
  const [pick, setPick] = useState('');
  useEffect(() => { box.current?.querySelector<HTMLSelectElement>('select')?.focus(); }, []);
  const target = targets.find(t => t.id === pick) ?? null;
  const preview = useMemo(() => { if (!target) return null; try { return mergePreview(record, note.id, target.id); } catch (e) { return {photos: 0, tags: 0, props: 0, propLines: 0, links: 0, locked: 0, problem: e instanceof Error ? e.message : 'These notes cannot be merged.'}; } }, [record, note.id, target]);
  const merge = () => {
    if (!target) return;
    let into = '';
    if (change(r => { const out = mergeNotes(r, note.id, target.id, new Date().toISOString()); into = out.into; return {record: out.record, undo: out.undo}; }, `“${noteName(note)}” is merged into “${noteName(target)}”. It waits 30 days in Recently deleted, whole.`)) onMerged?.(into);
  };
  return <div className="note-merge" ref={box} role="group" aria-labelledby={`${id}-t`} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } }}>
    <p id={`${id}-t`}><strong>Merge “{noteName(note)}” into another note</strong></p>
    {targets.length ? <label className="field"><span>Merge into</span><select value={pick} onChange={e => setPick(e.target.value)} aria-describedby={`${id}-what`}><option value="">Choose a note</option>{targets.map(t => <option key={t.id} value={t.id}>{label(t)}</option>)}</select></label>
      : <p className="fine">There is no other note to merge into yet (a locked note is never merged).</p>}
    <p className="fine" id={`${id}-what`} role="status">{!target ? 'Its words go under the other note’s, below a heading with its name; its tags, photos and properties join the other note where it has none, and links to it follow it.'
      : preview?.problem ? preview.problem
      : `Its words go under “${noteName(target)}”'s, below the heading “${noteName(note)}”${[preview!.photos ? many(preview!.photos, 'photo', 'photos') : '', preview!.tags ? many(preview!.tags, 'tag', 'tags') : '', preview!.props ? many(preview!.props, 'property', 'properties') : ''].filter(Boolean).length ? `, with ${[preview!.photos ? many(preview!.photos, 'photo', 'photos') : '', preview!.tags ? many(preview!.tags, 'tag', 'tags') : '', preview!.props ? many(preview!.props, 'property', 'properties') : ''].filter(Boolean).join(', ')}` : ''}.${preview!.propLines ? ` ${many(preview!.propLines, 'property', 'properties')} the other note has already ${preview!.propLines === 1 ? 'is' : 'are'} written as a line in the words.` : ''}${preview!.links ? ` ${many(preview!.links, 'note links', 'notes link')} to it; those links will point at its heading in “${noteName(target)}”${preview!.locked ? ` (${preview!.locked} locked, changed but not shown)` : ''}.` : ''} Its earlier words stay under Earlier versions, and this note waits 30 days in Recently deleted.`}</p>
    <div className="note-actions">
      <button type="button" className="primary" disabled={!target || !!preview?.problem} onClick={merge}>{target ? `Merge into “${noteName(target).slice(0, 40)}”` : 'Merge'}</button>
      <button type="button" className="quiet" onClick={onClose}>Cancel</button>
    </div>
  </div>;
}
