'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import type {Notes} from '../../lib/notes/schema';
import {parseBlocks, plainText} from '../../lib/ai/safe-render';
import {openTicks, tickNote} from '../../lib/notes/ticks';
import {noteHref} from '../../lib/notes/links';
import {formatDate} from '../../lib/visual-format';
import type {Change} from './note-editor';

/**
 * Session AV lane 2 (r3-notes; LEDGER #264, Obsidian's tick boxes gathered across the vault): "Open tick boxes" — every
 * unticked "- [ ]" line of every note, grouped under its note (the most recently changed first), each note a link back
 * to it. A box ticks here as in the note (the note's text becomes "- [x]", its earlier words kept as a version, Undo in
 * the toast); the ticked line leaves the list and focus goes to the list's heading. They stay note lines, not tasks.
 * Loaded when the fold opens.
 */
export default function NotesTicks({record, change}: {record: Notes; change: Change}) {
  const open = useMemo(() => openTicks(record.notes), [record.notes]);
  const groups = useMemo(() => { const m = new Map<string, typeof open>(); for (const t of open) m.set(t.noteId, [...(m.get(t.noteId) ?? []), t]); return [...m.values()]; }, [open]);
  if (!open.length) return <p className="fine">No open tick box. Start a line of any note with <code>- [ ]</code> (or use Tick box while you edit it); each one you have not ticked yet shows here, with a link back to its note.</p>;
  const tick = (noteId: string, line: number, words: string) => {
    if (change(r => tickNote(r, noteId, line, true, new Date().toISOString()), `Ticked: “${words.length > 40 ? `${words.slice(0, 39).trimEnd()}…` : words}”.`))
      requestAnimationFrame(() => document.getElementById('notes-ticks-title')?.focus());
  };
  return <div className="notes-ticks">
    <h3 id="notes-ticks-title" tabIndex={-1} className="sr-only">Open tick boxes</h3>
    <ul className="notes-ticks-groups">{groups.map(g => { const n = g[0]!; return <li key={n.noteId}>
      <p className="notes-ticks-note"><Link className="text-link" href={n.kind === 'daily' && n.day ? `/app/notes?day=${n.day}` : noteHref(n.noteId)}>{n.kind === 'daily' && n.day ? formatDate(n.day, {weekday: true}) : n.name}</Link>{n.example && <span className="fine"> · example</span>} <span className="fine">· {g.length === 1 ? '1 open' : `${g.length} open`}</span></p>
      <ul className="note-ticks">{g.map(t => <li key={t.line} className="note-tick"><input id={`notes-tick-${t.noteId}-${t.line}`} type="checkbox" className="note-tick-box" checked={false} onChange={() => tick(t.noteId, t.line, t.text)}/><label htmlFor={`notes-tick-${t.noteId}-${t.line}`} className="note-tick-words">{plainText(parseBlocks(t.text, {notes: true}))}</label></li>)}</ul>
    </li>; })}</ul>
  </div>;
}
