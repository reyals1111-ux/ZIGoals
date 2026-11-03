'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {NOTES, noteName} from '../../lib/notes/schema';
import {backlinks, backlinkSnippet, linkIndex, noteHref, type LinkKind} from '../../lib/notes/links';
import {formatDate} from '../../lib/visual-format';
import './notes.css';

/**
 * Session AK (B3): "Notes that link here" for a goal or a habit (and a note, from the Notes page). A note links here by
 * writing [[name]]; the list shows each note with the line that links. Mounted as ONE lazy element on a goal's page and
 * in a habit card's Details (loaded when shown). Reads this device's notes only; writes nothing. With no backlink it
 * teaches how to make one in a single line.
 */
/** `panel`: a page section of its own, titled "Notes" (an average goal's page); otherwise it sits inside the host's fold. */
export default function NoteBacklinks({kind, id, name, teach = true, panel = false}: {kind: LinkKind; id: string; name: string; teach?: boolean; panel?: boolean}) {
  const notes = useDeviceRecord(NOTES);
  const index = useMemo(() => linkIndex({notes: notes.data.notes, goals: kind === 'goal' ? [{id, name, href: ''}] : [], habits: kind === 'habit' ? [{id, title: name}] : []}), [notes.data.notes, kind, id, name]);
  const list = useMemo(() => backlinks(notes.data.notes, {kind, id}, index).slice(0, 20), [notes.data.notes, kind, id, index]);
  if (!notes.loaded || notes.unreadable) return null;
  const found = <section className="note-backlinks" aria-label={`Notes that link to ${name}`}>
    <h3 className="note-backlinks-title">Notes that link here <span className="fine">· {list.length}</span></h3>
    <ul>{list.map(n => <li key={n.id}>
      <Link className="note-backlink" href={noteHref(n.id)}><strong>{n.kind === 'daily' && n.day ? formatDate(n.day) : noteName(n)}</strong>{n.example && <span className="fine"> · example</span>}</Link>
      <p className="fine note-backlink-line">{backlinkSnippet(n, {kind, id}, index)}</p>
    </li>)}</ul>
  </section>;
  const body = list.length ? found : teach ? <p className="fine note-backlinks-empty">No note links here yet. Write <code>[[{name}]]</code> in any note in <Link className="text-link" href="/app/notes">Notes</Link> to link it.</p> : null;
  return panel ? <section className="panel note-backlinks-panel" aria-labelledby={`notes-${kind}-${id}`}><h2 id={`notes-${kind}-${id}`}>Notes</h2>{body}</section> : body;
}
