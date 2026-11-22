'use client';
import type {Note, Notes, NoteVersion} from '../../lib/notes/schema';
import {noteVersionsOf, restoreNoteVersion} from '../../lib/notes/versions';
import {formatClock, formatDate} from '../../lib/visual-format';
import type {Change} from './note-editor';

/**
 * Session AV lane 2 (notes; LEDGER #33, Notion's version history): a note's earlier versions — when each was saved, its
 * words to read, and "Restore this version" (the words it replaces are kept too; Undo puts the note back). Loaded when
 * its fold opens.
 */
const two = (n: number) => String(n).padStart(2, '0');
const when = (iso: string) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? `${formatDate(`${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`)}, ${formatClock(`${two(d.getHours())}:${two(d.getMinutes())}`)}` : iso; };
export default function NoteVersions({note, record, change, onRestored}: {note: Note; record: Notes; change: Change; onRestored?: (v: NoteVersion) => void}) {
  const versions = noteVersionsOf(record, note.id);
  if (!versions.length) return <p className="fine">When you save a change to this note, the words it had are kept here, up to ten versions, so you can read or restore them.</p>;
  return <ol className="note-versions-list">{versions.map(v => <li key={v.id}>
    <details><summary>Saved {when(v.savedAt)} <span className="fine">· {v.body.replace(/\s+/g, ' ').slice(0, 60) || 'no words'}{v.body.length > 60 ? '…' : ''}</span></summary>
      {note.kind !== 'daily' && v.title && v.title !== note.title && <p className="fine">Title then: {v.title}</p>}
      <p className="note-version-body">{v.body}</p>
      <button type="button" className="secondary" aria-label={`Restore the version of ${when(v.savedAt)}`} onClick={() => { if (change(r => restoreNoteVersion(r, note.id, v.id, new Date().toISOString()), `The version of ${when(v.savedAt)} is back. The words it replaced are kept as a version.`)) onRestored?.(v); }}>Restore this version</button>
    </details>
  </li>)}</ol>;
}
