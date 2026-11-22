'use client';
import {useId, useRef, useState} from 'react';
import type {Note, Notes, NoteVersion} from '../../lib/notes/schema';
import {deleteNoteVersions, noteVersionsOf, restoreNoteVersion} from '../../lib/notes/versions';
import {ConfirmInline} from '../ui/confirm-inline';
import {formatClock, formatDate} from '../../lib/visual-format';
import type {Change} from './note-editor';

/**
 * Session AV lane 2 (notes; LEDGER #33, Notion's version history): a note's earlier versions — when each was saved, its
 * words to read, and "Restore this version" (the words it replaces are kept too; Undo puts the note back). Loaded when
 * its fold opens. Review b1 #5 (privacy): "Delete this version" and "Delete all earlier versions", each after a
 * confirmation, with Undo; focus then goes to the list's first line.
 */
const two = (n: number) => String(n).padStart(2, '0');
const when = (iso: string) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? `${formatDate(`${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`)}, ${formatClock(`${two(d.getHours())}:${two(d.getMinutes())}`)}` : iso; };
export default function NoteVersions({note, record, change, onRestored}: {note: Note; record: Notes; change: Change; onRestored?: (v: NoteVersion) => void}) {
  const versions = noteVersionsOf(record, note.id), [deleting, setDeleting] = useState<string | null>(null), headingId = useId(), heading = useRef<HTMLParagraphElement>(null);
  if (!versions.length) return <p className="fine" ref={heading} tabIndex={-1}>When you save a change to this note, the words it had are kept here, up to ten versions, so you can read, restore or delete them.</p>;
  const remove = (versionId?: string) => {
    const n = versionId ? 1 : versions.length;
    if (change(r => deleteNoteVersions(r, note.id, versionId), n === 1 ? 'The earlier version is deleted from this device.' : `${n} earlier versions are deleted from this device.`)) { setDeleting(null); requestAnimationFrame(() => heading.current?.focus()); }
  };
  return <div className="note-versions-body" role="group" aria-labelledby={headingId}>
    <p id={headingId} className="fine" ref={heading} tabIndex={-1}>{versions.length === 1 ? '1 earlier version' : `${versions.length} earlier versions`}, kept on this device until you delete them.</p>
    <ol className="note-versions-list">{versions.map(v => <li key={v.id}>
      <details><summary>Saved {when(v.savedAt)} <span className="fine">· {v.body.replace(/\s+/g, ' ').slice(0, 60) || 'no words'}{v.body.length > 60 ? '…' : ''}</span></summary>
        {note.kind !== 'daily' && v.title && v.title !== note.title && <p className="fine">Title then: {v.title}</p>}
        <p className="note-version-body">{v.body}</p>
        <div className="note-actions">
          <button type="button" className="secondary" aria-label={`Restore the version of ${when(v.savedAt)}`} onClick={() => { if (change(r => restoreNoteVersion(r, note.id, v.id, new Date().toISOString()), `The version of ${when(v.savedAt)} is back. The words it replaced are kept as a version.`)) onRestored?.(v); }}>Restore this version</button>
          <button type="button" className="quiet" aria-label={`Delete the version of ${when(v.savedAt)}`} aria-expanded={deleting === v.id} onClick={() => setDeleting(deleting === v.id ? null : v.id)}>Delete this version</button>
        </div>
        {deleting === v.id && <ConfirmInline title="Delete this earlier version?" confirmLabel="Delete this version" onConfirm={() => remove(v.id)} onCancel={() => setDeleting(null)}>
          <p>Its words leave this device and every export or backup you make from now on. The note keeps its words as they are now.</p></ConfirmInline>}
      </details>
    </li>)}</ol>
    <div className="note-actions"><button type="button" className="quiet" aria-expanded={deleting === 'all'} onClick={() => setDeleting(deleting === 'all' ? null : 'all')}>Delete all earlier versions</button></div>
    {deleting === 'all' && <ConfirmInline title={versions.length === 1 ? 'Delete the one earlier version?' : `Delete all ${versions.length} earlier versions?`} confirmLabel="Delete all earlier versions" onConfirm={() => remove()} onCancel={() => setDeleting(null)}>
      <p>Their words leave this device and every export or backup you make from now on. The note keeps its words as they are now.</p></ConfirmInline>}
  </div>;
}
