'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {NOTES, noteName, shortNoteName, type Notes} from '../../lib/notes/schema';
import {backlinks, backlinkSnippet, linkIndex, linkMention, noteHref, unlinkedMentions, type LinkKind, type Mention} from '../../lib/notes/links';
import {updateNoteKeepingVersion} from '../../lib/notes/versions';
import type {NotesUndo} from '../../lib/notes/store';
import {formatDate} from '../../lib/visual-format';
import './notes.css';

/**
 * Session AK (B3): "Notes that link here" for a goal or a habit (and a note, from the Notes page). A note links here by
 * writing [[name]]; the list shows each note with the line that links. Mounted as ONE lazy element on a goal's page and
 * in a habit card's Details (loaded when shown). Reads this device's notes only; writes nothing. With no backlink it
 * teaches how to make one in a single line.
 */
/** `panel`: a page section of its own, titled "Notes" (an average goal's page); otherwise it sits inside the host's fold. */
type Change = (fn: (r: Notes) => Notes | {record: Notes; undo: NotesUndo}, said: string) => boolean;
export default function NoteBacklinks({kind, id, name, teach = true, panel = false, change}: {kind: LinkKind; id: string; name: string; teach?: boolean; panel?: boolean; /** Session AV lane 2 (r5-notes; LEDGER #358): from a note, "Mentioned without a link" with Link it. */ change?: Change}) {
  const notes = useDeviceRecord(NOTES);
  const index = useMemo(() => linkIndex({notes: notes.data.notes, goals: kind === 'goal' ? [{id, name, href: ''}] : [], habits: kind === 'habit' ? [{id, title: name}] : []}), [notes.data.notes, kind, id, name]);
  const list = useMemo(() => backlinks(notes.data.notes, {kind, id}, index).slice(0, 20), [notes.data.notes, kind, id, index]);
  // Session AV lane 2 (r5-notes; LEDGER #358): only a note's own page, and only with a way to write (Link it).
  const mentions = useMemo(() => kind === 'note' && change ? unlinkedMentions(notes.data.notes, {id}, name, index) : [], [notes.data.notes, kind, change, id, name, index]);
  if (!notes.loaded || notes.unreadable) return null;
  const unlinked = kind === 'note' && change ? <Unlinked mentions={mentions} name={name} change={change}/> : null;
  const found = <section className="note-backlinks" aria-label={`Notes that link to ${name}`}>
    <h3 className="note-backlinks-title">Notes that link here <span className="fine">· {list.length}</span></h3>
    <ul>{list.map(n => <li key={n.id}>
      <Link className="note-backlink" href={noteHref(n.id)}><strong>{n.kind === 'daily' && n.day ? formatDate(n.day) : noteName(n)}</strong>{n.example && <span className="fine"> · example</span>}</Link>
      <p className="fine note-backlink-line">{backlinkSnippet(n, {kind, id}, index)}</p>
    </li>)}</ul>
  </section>;
  const body0 = list.length ? found : teach ? <p className="fine note-backlinks-empty">No note links here yet. Write <code>[[{name}]]</code> in any note in <Link className="text-link" href="/app/notes">Notes</Link> to link it.</p> : null;
  const body = unlinked ? <>{body0}{unlinked}</> : body0;
  return panel ? <section className="panel note-backlinks-panel" aria-labelledby={`notes-${kind}-${id}`}><h2 id={`notes-${kind}-${id}`}>Notes</h2>{body}</section> : body;
}

/**
 * Session AV lane 2 (r5-notes; LEDGER #358, Logseq's unlinked references): the notes that name this note's title without
 * linking it, each with its line; "Link it" makes that place a [[link]] (the earlier words kept as a version; Undo in the
 * message). A locked or archived note is not searched.
 */
function Unlinked({mentions, name, change}: {mentions: readonly Mention[]; name: string; change: Change}) {
  return <details className="note-fold note-unlinked-fold"><summary>Mentioned without a link <span className="fine">· {mentions.length ? `${mentions.length} ${mentions.length === 1 ? 'note' : 'notes'}` : 'none'}</span></summary>
    {mentions.length ? <ul className="note-unlinked">{mentions.map(m => <li key={m.note.id}>
      <Link className="note-backlink" href={noteHref(m.note.id)}><strong>{m.note.kind === 'daily' && m.note.day ? formatDate(m.note.day) : noteName(m.note)}</strong></Link>
      <p className="fine note-backlink-line">{m.line}</p>
      <button type="button" className="quiet" aria-label={`Link it: make “${m.words}” in “${shortNoteName(m.note)}” a link here`} onClick={() => change(r => {
        const now = r.notes.find(n => n.id === m.note.id);
        if (!now) throw new Error('That note is no longer on this device.');
        return {record: updateNoteKeepingVersion(r, now.id, {body: linkMention(now.body, m, name)}, new Date().toISOString()), undo: {before: [now], created: [], said: `“${shortNoteName(now)}” is back as it was.`}};
      }, `Linked: “${shortNoteName(m.note)}” now links here. Its earlier words are under Earlier versions.`)}>Link it</button>
    </li>)}</ul> : <p className="fine">No other note names “{name}” without linking it. When one does, it shows here with Link it.</p>}
  </details>;
}
