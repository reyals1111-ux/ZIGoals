'use client';
import {Suspense, lazy, useEffect, useRef, useState} from 'react';
import {LinkField} from './link-field';
import {NoteRender} from './note-render';
import {LoadBoundary} from '../load-boundary';
import {SecretGuard} from '../secret-guard/secret-guard';
import {ConfirmInline} from '../ui/confirm-inline';
import {MAX_BODY, MAX_TITLE, noteName, shortNoteName, type Note, type Notes} from '../../lib/notes/schema';
import {ensureDaily, removeNote, updateNote, type NotesUndo} from '../../lib/notes/store';
import type {LinkIndex} from '../../lib/notes/links';
import {deleteNotePhoto, getNotePhoto} from '../../lib/notes/photos';
import {keepCapturePhoto} from '../../lib/notes/capture';
import {photoScope} from '../../lib/health-aa/photos';
import {formatDate} from '../../lib/visual-format';

const NoteBacklinks = lazy(() => import('./note-backlinks'));

/**
 * Session AK (B1–B3): one note — read it (Markdown with live [[links]]) or edit it (with [[ autocomplete), its photo,
 * pin, delete with Undo, and the notes that link to it. A daily note that does not exist yet is made on its first save,
 * so opening a day never writes anything. The secret guard watches the words (in LinkField).
 */
export type Change = (fn: (r: Notes) => Notes | {record: Notes; undo: NotesUndo}, said: string, undo?: NotesUndo | null) => boolean;
export function NoteEditor({note, day, index, change, onCreateLink, onDeleted}: {
  note: Note | null; day?: string; index: LinkIndex; change: Change; onCreateLink: (name: string) => void; onDeleted?: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? ''), [body, setBody] = useState(note?.body ?? '');
  const [mode, setMode] = useState<'read' | 'edit'>(note?.body.trim() ? 'read' : 'edit');
  const dirty = (note?.title ?? '') !== title || (note?.body ?? '') !== body;
  const isDaily = note ? note.kind === 'daily' : !!day;
  const save = (): boolean => {
    const now = new Date().toISOString();
    if (!note && day) return change(r => { const d = ensureDaily(r, day, now); return updateNote(d.record, d.note.id, {body}, now); }, 'Saved on this device.');
    if (!note) return false;
    if (!isDaily && !title.trim() && note.kind !== 'inbox') { setTitle(note.title); return change(r => updateNote(r, note.id, {body}, now), 'Saved on this device. A note keeps its title.'); }
    return change(r => updateNote(r, note.id, isDaily ? {body} : {title, body}, now), 'Saved on this device.');
  };
  const saveAndRead = () => { if (!dirty || save()) setMode('read'); };
  const heading = note ? (note.kind === 'daily' && note.day ? formatDate(note.day, {weekday: true}) : noteName(note)) : day ? formatDate(day, {weekday: true}) : '';
  return <article className="note-editor" aria-label={heading || 'Note'}>
    {mode === 'edit' ? <>
      {!isDaily && <label className="field"><span>Title</span><input value={title} maxLength={MAX_TITLE} onChange={e => setTitle(e.target.value)} placeholder={note?.kind === 'inbox' ? 'Optional' : 'A title'}/></label>}
      {!isDaily && <SecretGuard text={title} onRemove={() => setTitle('')}/>}
      {/* Session AK G2 (RELEASE_REVIEW_2 R2-18): `[[` is explained here, in the field, where it is used. */}
      <LinkField label={isDaily ? 'This day’s note' : 'Note'} placeholder="Write here. Type [[ to link a goal, a habit or another note." value={body} onChange={setBody} index={index} exclude={note ? {kind: 'note', id: note.id} : undefined} maxLength={MAX_BODY} onSubmit={saveAndRead} rows={isDaily ? 6 : 10}/>
      <div className="note-actions">
        <button type="button" className="primary" disabled={!dirty} onClick={saveAndRead}>Save</button>
        {(note?.body.trim() || body.trim()) && <button type="button" className="quiet" onClick={() => { if (dirty) { setTitle(note?.title ?? ''); setBody(note?.body ?? ''); } setMode(note?.body.trim() ? 'read' : 'edit'); }}>{dirty ? 'Cancel changes' : 'Done'}</button>}
        <span className="fine">{body.length.toLocaleString('en-US')} / {MAX_BODY.toLocaleString('en-US')}</span>
      </div>
    </> : <>
      <NoteRender text={note?.body ?? ''} index={index} onCreate={onCreateLink}/>
      <div className="note-actions"><button type="button" className="secondary" onClick={() => setMode('edit')}>Edit</button></div>
    </>}
    {note && <NoteExtras note={note} change={change} onDeleted={onDeleted}/>}
    {note && <LoadBoundary quiet><Suspense fallback={null}><NoteBacklinks kind="note" id={note.id} name={isDaily && note.day ? note.day : noteName(note)} teach={false}/></Suspense></LoadBoundary>}
  </article>;
}

/** The note's photo (device-only), pin and delete. */
function NoteExtras({note, change, onDeleted}: {note: Note; change: Change; onDeleted?: () => void}) {
  const [url, setUrl] = useState<string | null>(null), [confirmPhoto, setConfirmPhoto] = useState(false), [busy, setBusy] = useState(false), [said, setSaid] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let made: string | null = null, live = true;
    if (note.photoId) void getNotePhoto(photoScope(), note.photoId).then(p => { if (live && p) { made = URL.createObjectURL(p.blob); setUrl(made); } }, () => undefined);
    return () => { live = false; if (made) URL.revokeObjectURL(made); setUrl(null); };
  }, [note.photoId]);
  const addPhoto = async (file: File) => {
    setBusy(true); setSaid('Preparing the photo on this device…');
    try {
      const id = await keepCapturePhoto(file), old = note.photoId;
      if (change(r => updateNote(r, note.id, {photoId: id}, new Date().toISOString()), 'Photo kept on this device.')) { if (old) await deleteNotePhoto(photoScope(), old).catch(() => undefined); setSaid(''); }
      else await deleteNotePhoto(photoScope(), id).catch(() => undefined);
    } catch (e) { setSaid(e instanceof Error ? e.message : 'The photo was not kept.'); } finally { setBusy(false); }
  };
  const removePhoto = async () => {
    setConfirmPhoto(false);
    const id = note.photoId; if (!id) return;
    if (change(r => updateNote(r, note.id, {photoId: undefined}, new Date().toISOString()), 'Photo deleted from this device.')) await deleteNotePhoto(photoScope(), id).catch(() => undefined);
  };
  return <div className="note-extras">
    {note.photoId && (url
      // eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo: next/image has nothing to optimise
      ? <img className="note-photo" src={url} alt={`Your photo with “${noteName(note)}”`}/>
      : <p className="fine">The photo is not in this browser (photos stay on the device where they were taken).</p>)}
    <div className="note-actions">
      <input ref={input} type="file" accept="image/*" hidden tabIndex={-1} aria-hidden="true" onChange={e => { const f = e.target.files?.[0]; if (f) void addPhoto(f); e.target.value = ''; }}/>
      <button type="button" className="quiet" disabled={busy} onClick={() => input.current?.click()}>{note.photoId ? 'Replace photo' : 'Add a photo'}</button>
      {note.photoId && <button type="button" className="quiet" onClick={() => setConfirmPhoto(true)}>Delete photo…</button>}
      {note.kind === 'topic' && <button type="button" className="quiet" aria-pressed={!!note.pinned} onClick={() => change(r => updateNote(r, note.id, {pinned: !note.pinned}, new Date().toISOString()), note.pinned ? 'Unpinned.' : 'Pinned to the top of your notes.')}>{note.pinned ? 'Unpin' : 'Pin'}</button>}
      <button type="button" className="quiet" onClick={() => { if (change(r => removeNote(r, note.id), `“${shortNoteName(note)}” deleted.`)) onDeleted?.(); }}>Delete note</button>
    </div>
    {confirmPhoto && <ConfirmInline title="Delete this photo from this device?" confirmLabel="Delete photo" onConfirm={() => void removePhoto()} onCancel={() => setConfirmPhoto(false)}><p>The note&rsquo;s words stay. This cannot be undone.</p></ConfirmInline>}
    {said && <p className="fine" role="status">{said}</p>}
  </div>;
}
