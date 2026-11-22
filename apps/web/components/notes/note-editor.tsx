'use client';
import {Suspense, lazy, useCallback, useEffect, useRef, useState} from 'react';
import {LinkField} from './link-field';
import {NoteRender} from './note-render';
import {LoadBoundary} from '../load-boundary';
import {SecretGuard} from '../secret-guard/secret-guard';
import {ConfirmInline} from '../ui/confirm-inline';
import {MAX_BODY, MAX_NOTE_PHOTOS_EACH, MAX_TITLE, noteName, notePhotoIdsOf, shortNoteName, type Note, type Notes} from '../../lib/notes/schema';
import {PHOTOS_FULL, addNotePhoto, insertPhotoLine, photoRoom, removeNotePhoto, unplacedPhotoIds} from '../../lib/notes/note-photos';
import {ensureDaily, removeNote, updateNote, type NotesUndo} from '../../lib/notes/store';
import {updateNoteKeepingVersion} from '../../lib/notes/versions';
import {tickNote} from '../../lib/notes/ticks';
import {fieldTags, parseTagField, tagsForSave} from '../../lib/notes/tags';
import type {LinkIndex} from '../../lib/notes/links';
import {deleteNotePhoto, getNotePhoto} from '../../lib/notes/photos';
import {keepCapturePhoto} from '../../lib/notes/capture';
import {photoScope} from '../../lib/health-aa/photos';
import {formatDate, formatDateTime, formatNumber} from '../../lib/visual-format';
import {countCharacters, countWords, readMinutes} from '../../lib/notes/table';

const NoteBacklinks = lazy(() => import('./note-backlinks'));
// Session AV lane 2 (LEDGER #31): the "@remind" lines of this note, in their own chunk.
const NoteReminderChips = lazy(() => import('./note-reminders'));
// Session AV lane 2 (notes; LEDGER #33): a note's earlier versions, loaded when their fold opens.
const NoteVersions = lazy(() => import('./note-versions'));
// Session AV lane 2 (r3-notes; LEDGER #264, #267): the tick box and highlight buttons beside the text, in their own chunk.
const NoteMarks = lazy(() => import('./note-marks'));
// Session AV lane 2 (r3-notes; LEDGER #271): the note as printed (or saved as a PDF), loaded on the press.
const NotePrint = lazy(() => import('./note-print'));
// Session AV lane 2 (r3-notes; LEDGER #270): the note's own properties, loaded when their fold opens.
const NoteProps = lazy(() => import('./note-props'));
// Session AV lane 2 (r4-notes; LEDGER #312): find and replace in the note being edited, loaded on the press.
const NoteFind = lazy(() => import('./note-find'));
const shortWords = (w: string) => { const t = w.replace(/\s+/g, ' ').trim(); return t.length > 40 ? `${t.slice(0, 39).trimEnd()}…` : t; };

/**
 * Session AK (B1–B3): one note — read it (Markdown with live [[links]]) or edit it (with [[ autocomplete), its photo,
 * pin, delete with Undo, and the notes that link to it. A daily note that does not exist yet is made on its first save,
 * so opening a day never writes anything. The secret guard watches the words (in LinkField).
 */
export type Change = (fn: (r: Notes) => Notes | {record: Notes; undo: NotesUndo}, said: string, undo?: NotesUndo | null) => boolean;
export function NoteEditor({note, day, index, change, onCreateLink, onDeleted, start, record, onTag}: {
  note: Note | null; day?: string; index: LinkIndex; change: Change; onCreateLink: (name: string) => void; onDeleted?: () => void;
  /** Session AV lane 2 (r4-notes; LEDGER #306): a #tag pressed in the note focuses Notes on it. */ onTag?: (tag: string) => void;
  /** Session AV lane 2 (notes; LEDGER #33): the record, for the note's earlier versions. */ record?: Notes;
  /** Session AV lane 2 (notes; LEDGER #32): the words a new daily note starts from (its template), written only on Save. */ start?: string;
}) {
  const [title, setTitle] = useState(note?.title ?? ''), [body, setBody] = useState(note?.body ?? start ?? '');
  // Session AV lane 2 (r4-notes; LEDGER #306): the Tags field holds the kept tags not written in the text.
  const savedField = note ? fieldTags(note).join(', ') : '', [tagText, setTagText] = useState(savedField);
  const [mode, setMode] = useState<'read' | 'edit'>(note?.body.trim() ? 'read' : 'edit');
  const [finding, setFinding] = useState(false);
  const closeFind = useCallback(() => { setFinding(false); requestAnimationFrame(() => box.current?.querySelector<HTMLElement>('.note-find-button')?.focus()); }, []);
  const [versionsOpen, setVersionsOpen] = useState(false), [printing, setPrinting] = useState(false), [propsOpen, setPropsOpen] = useState(false);
  const donePrinting = useCallback(() => { setPrinting(false); requestAnimationFrame(() => box.current?.querySelector<HTMLElement>('.note-print-button')?.focus()); }, []);
  const dirty = (note?.title ?? '') !== title || (note?.body ?? '') !== body || parseTagField(tagText).join(',') !== parseTagField(savedField).join(',');
  const untouchedStart = !note && !!start && body === start; // a template not written in yet is not saved as a note
  const isDaily = note ? note.kind === 'daily' : !!day;
  const save = (): boolean => {
    const now = new Date().toISOString(), tags = tagsForSave(parseTagField(tagText), body);
    if (!note && day) return change(r => { const d = ensureDaily(r, day, now); return updateNote(d.record, d.note.id, {body, tags}, now); }, 'Saved on this device.');
    if (!note) return false;
    // Session AV lane 2 (notes; LEDGER #33): a save keeps the words it replaces as an earlier version.
    if (!isDaily && !title.trim() && note.kind !== 'inbox') { setTitle(note.title); return change(r => updateNoteKeepingVersion(r, note.id, {body, tags}, now), 'Saved on this device. A note keeps its title.'); }
    return change(r => updateNoteKeepingVersion(r, note.id, isDaily ? {body, tags} : {title, body, tags}, now), 'Saved on this device.');
  };
  const saveAndRead = () => { if (!dirty || save()) setMode('read'); };
  // Session AV lane 2 (r3-notes; LEDGER #264): while reading, the words follow the note (a tick, its Undo, a restore), so
  // Edit always starts from what is saved.
  useEffect(() => { if (mode === 'read' && note) { setBody(note.body); setTitle(note.title); setTagText(fieldTags(note).join(', ')); } }, [mode, note]);
  const tick = (line: number, checked: boolean, words: string) => {
    if (!note) return;
    change(r => tickNote(r, note.id, line, checked, new Date().toISOString()), checked ? `Ticked: “${shortWords(words)}”.` : `Open again: “${shortWords(words)}”.`);
  };
  const box = useRef<HTMLElement>(null);
  // Session AV lane 2 (r4-notes; LEDGER #307): while editing, a new photo's line goes where the caret is (saved with the words).
  const placePhoto = (id: string) => { const field = box.current?.querySelector<HTMLTextAreaElement>('.note-field textarea'); setBody(b => insertPhotoLine(b, field ? field.selectionStart : b.length, id)); };
  const heading = note ? (note.kind === 'daily' && note.day ? formatDate(note.day, {weekday: true}) : noteName(note)) : day ? formatDate(day, {weekday: true}) : '';
  return <article className="note-editor" aria-label={heading || 'Note'} ref={box}>
    {note?.archived && <p className="note-archived-line">Archived: this note is out of the list and the graph, and still in Search and the export. <button type="button" className="text-link" onClick={() => change(r => updateNote(r, note.id, {archived: false}, new Date().toISOString()), `“${shortNoteName(note)}” is back in the list.`)}>Back to the list</button></p>}
    {mode === 'edit' ? <>
      {!isDaily && <label className="field"><span>Title</span><input value={title} maxLength={MAX_TITLE} onChange={e => setTitle(e.target.value)} placeholder={note?.kind === 'inbox' ? 'Optional' : 'A title'}/></label>}
      {!isDaily && <SecretGuard text={title} onRemove={() => setTitle('')}/>}
      {/* Session AK G2 (RELEASE_REVIEW_2 R2-18): `[[` is explained here, in the field, where it is used. */}
      <LinkField label={isDaily ? 'This day’s note' : 'Note'} placeholder="Write here. Type [[ to link a goal, a habit or another note." value={body} onChange={setBody} index={index} exclude={note ? {kind: 'note', id: note.id} : undefined} maxLength={MAX_BODY} onSubmit={saveAndRead} rows={isDaily ? 6 : 10}/>
      <label className="field note-tags-field"><span>Tags</span><input value={tagText} maxLength={400} onChange={e => setTagText(e.target.value)} placeholder="travel, work/meetings" aria-describedby={note ? `tags-help-${note.id}` : undefined}/></label>
      <p className="fine" id={note ? `tags-help-${note.id}` : undefined}>Or write a #tag anywhere in the note; a / nests one under another (#work/meetings sits under #work).</p>
      <LoadBoundary quiet><Suspense fallback={null}><NoteMarks value={body} onChange={setBody} maxLength={MAX_BODY} field={() => box.current?.querySelector<HTMLTextAreaElement>('.note-field textarea') ?? null}/></Suspense></LoadBoundary>
      <div className="note-actions">
        <button type="button" className="primary" disabled={!dirty || untouchedStart} onClick={saveAndRead}>Save</button>
        {(note?.body.trim() || body.trim()) && <button type="button" className="quiet" onClick={() => { if (dirty) { setTitle(note?.title ?? ''); setBody(note?.body ?? ''); } setMode(note?.body.trim() ? 'read' : 'edit'); }}>{dirty ? 'Cancel changes' : 'Done'}</button>}
        <button type="button" className="quiet note-find-button" aria-expanded={finding} onPointerEnter={() => void import('./note-find').catch(() => undefined)} onClick={() => finding ? closeFind() : setFinding(true)}>Find and replace</button>
        <span className="fine">{body.length.toLocaleString('en-US')} / {MAX_BODY.toLocaleString('en-US')}</span>
      </div>
      {finding && <LoadBoundary quiet><Suspense fallback={<p className="fine">Opening…</p>}><NoteFind value={body} onChange={setBody} field={() => box.current?.querySelector<HTMLTextAreaElement>('.note-field textarea') ?? null} onClose={closeFind}/></Suspense></LoadBoundary>}
    </> : <>
      <NoteRender text={note?.body ?? ''} index={index} onCreate={onCreateLink} onTick={tick} onTag={onTag} photos={note ? notePhotoIdsOf(note) : undefined} outline fold/>
      {note && fieldTags(note).length > 0 && <p className="note-tag-line"><span className="fine">Tags: </span>{fieldTags(note).map(t => onTag ? <button key={t} type="button" className="note-tag" aria-label={`#${t}: show the notes with this tag`} onClick={() => onTag(t)}>#{t}</button> : <span key={t} className="note-tag">#{t}</span>)}</p>}
      {note && /@remind|!remind|@herinner|⏰/i.test(note.body) && <LoadBoundary quiet><Suspense fallback={null}><NoteReminderChips note={note}/></Suspense></LoadBoundary>}
      <div className="note-actions"><button type="button" className="secondary" onClick={() => setMode('edit')}>Edit</button>
        {note && <button type="button" className="quiet note-print-button" onPointerEnter={() => void import('./note-print').catch(() => undefined)} onClick={() => setPrinting(true)}>Print this note</button>}</div>
      {note && printing && <LoadBoundary quiet><Suspense fallback={null}><NotePrint note={note} heading={heading || noteName(note)} index={index} onDone={donePrinting}/></Suspense></LoadBoundary>}
    </>}
    {note && <NoteExtras note={note} change={change} onDeleted={onDeleted} onPlace={mode === 'edit' ? placePhoto : undefined}/>}
    {note && note.body.trim() && mode === 'read' && <NoteInfo note={note}/>}
    {note && record && <details className="note-fold note-props-fold" onToggle={e => setPropsOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Properties <span className="fine">· {note.props?.length ? note.props.slice(0, 3).map(p => `${p.k}: ${p.t === 'tick' ? (p.v ? 'yes' : 'no') : String(p.v)}`).join(', ') : 'your own fields, such as a status or a day'}</span></summary>
      {propsOpen && <LoadBoundary quiet><Suspense fallback={<p className="fine">Opening…</p>}><NoteProps note={note} record={record} change={change}/></Suspense></LoadBoundary>}
    </details>}
    {note && record && <details className="note-fold note-versions-fold" onToggle={e => setVersionsOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Earlier versions <span className="fine">· {(record.versions ?? []).filter(v => v.noteId === note.id).length || 'none yet'}</span></summary>
      {versionsOpen && <LoadBoundary quiet><Suspense fallback={<p className="fine">Opening…</p>}><NoteVersions note={note} record={record} change={change} onRestored={v => { setBody(v.body); if (!isDaily && v.title) setTitle(v.title); setMode('read'); }}/></Suspense></LoadBoundary>}
    </details>}
    {note && <LoadBoundary quiet><Suspense fallback={null}><NoteBacklinks kind="note" id={note.id} name={isDaily && note.day ? note.day : noteName(note)} teach={false}/></Suspense></LoadBoundary>}
  </article>;
}

/**
 * The note's photos (device-only), pin and delete. Session AV lane 2 (r4-notes; LEDGER #307, Bear): a daily or topic note
 * holds up to eight photos — the first under the words, as before; each one after it placed in the words where it was
 * added (at the caret while editing, else at the end). An inbox capture keeps one photo (filing moves it).
 */
function NoteExtras({note, change, onDeleted, onPlace}: {note: Note; change: Change; onDeleted?: () => void; /** While editing: put the new photo's line at the caret (unsaved words). */ onPlace?: (id: string) => void}) {
  const [confirmPhoto, setConfirmPhoto] = useState<string | null>(null), [busy, setBusy] = useState(false), [said, setSaid] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const multi = note.kind !== 'inbox', ids = notePhotoIdsOf(note), unplaced = unplacedPhotoIds(note), full = multi && photoRoom(note) <= 0;
  const addPhoto = async (file: File) => {
    setBusy(true); setSaid('Preparing the photo on this device…');
    try {
      const id = await keepCapturePhoto(file), old = note.photoId, now = new Date().toISOString();
      const place = multi && !!note.photoId && !!onPlace;
      const ok = multi ? change(r => addNotePhoto(r, note.id, id, now, {place: !place}), note.photoId ? 'Photo kept on this device and placed in the note.' : 'Photo kept on this device.')
        : change(r => updateNote(r, note.id, {photoId: id}, now), 'Photo kept on this device.');
      if (ok) { if (!multi && old) await deleteNotePhoto(photoScope(), old).catch(() => undefined); if (place) onPlace!(id); setSaid(''); }
      else await deleteNotePhoto(photoScope(), id).catch(() => undefined);
    } catch (e) { setSaid(e instanceof Error ? e.message : 'The photo was not kept.'); } finally { setBusy(false); }
  };
  const removePhoto = async (id: string) => {
    setConfirmPhoto(null);
    if (change(r => removeNotePhoto(r, note.id, id, new Date().toISOString()), 'Photo deleted from this device.')) await deleteNotePhoto(photoScope(), id).catch(() => undefined);
  };
  return <div className="note-extras">
    {unplaced.map(id => <NotePhotoUnder key={id} id={id} name={noteName(note)}/>)}
    <div className="note-actions">
      <input ref={input} type="file" accept="image/*" hidden tabIndex={-1} aria-hidden="true" onChange={e => { const f = e.target.files?.[0]; if (f) void addPhoto(f); e.target.value = ''; }}/>
      <button type="button" className="quiet" disabled={busy || full} onClick={() => input.current?.click()}>{!multi && note.photoId ? 'Replace photo' : ids.length ? 'Add another photo' : 'Add a photo'}</button>
      {ids.length === 1 && <button type="button" className="quiet" onClick={() => setConfirmPhoto(ids[0]!)}>Delete photo…</button>}
      {/* Session AV lane 2 (r4-notes; LEDGER #315, Bear): out of the lists and the graph, kept in Search and the exports. */}
      {note.kind !== 'inbox' && !note.archived && <button type="button" className="quiet" onClick={() => change(r => ({record: updateNote(r, note.id, {archived: true}, new Date().toISOString()), undo: {before: [note], created: [], said: `“${shortNoteName(note)}” is back in the list.`}}), `“${shortNoteName(note)}” archived: out of the list and the graph, still in Search.`)}>Archive</button>}
      {note.kind === 'topic' && <button type="button" className="quiet" aria-pressed={!!note.pinned} onClick={() => change(r => updateNote(r, note.id, {pinned: !note.pinned}, new Date().toISOString()), note.pinned ? 'Unpinned.' : 'Pinned to the top of your notes.')}>{note.pinned ? 'Unpin' : 'Pin'}</button>}
      <button type="button" className="quiet" onClick={() => { if (change(r => removeNote(r, note.id), `“${shortNoteName(note)}” deleted.`)) onDeleted?.(); }}>Delete note</button>
    </div>
    {full && <p className="fine">{PHOTOS_FULL}</p>}
    {ids.length > 1 && <details className="note-fold note-photos-fold"><summary>Photos <span className="fine">· {ids.length} of {MAX_NOTE_PHOTOS_EACH}</span></summary>
      <ul className="note-photo-list">{ids.map((id, i) => <li key={id}><span>Photo {i + 1} <span className="fine">· {unplaced.includes(id) ? 'under the words' : 'in the words'}</span></span>
        <button type="button" className="quiet" onClick={() => setConfirmPhoto(id)}>Delete photo {i + 1}…</button></li>)}</ul>
    </details>}
    {confirmPhoto && <ConfirmInline title={ids.length > 1 ? `Delete photo ${ids.indexOf(confirmPhoto) + 1} from this device?` : 'Delete this photo from this device?'} confirmLabel="Delete photo" onConfirm={() => void removePhoto(confirmPhoto)} onCancel={() => setConfirmPhoto(null)}><p>The note&rsquo;s words stay{ids.length > 1 ? '; the photo’s line goes' : ''}. This cannot be undone.</p></ConfirmInline>}
    {said && <p className="fine" role="status">{said}</p>}
  </div>;
}
/** A photo drawn under the note's words. */
function NotePhotoUnder({id, name}: {id: string; name: string}) {
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let made: string | null = null, live = true;
    void getNotePhoto(photoScope(), id).then(p => { if (!live) return; if (p) { made = URL.createObjectURL(p.blob); setUrl(made); } else setUrl(null); }, () => { if (live) setUrl(null); });
    return () => { live = false; if (made) URL.revokeObjectURL(made); setUrl(undefined); };
  }, [id]);
  if (url === undefined) return null;
  // eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo: next/image has nothing to optimise
  return url ? <img className="note-photo" src={url} alt={`Your photo with “${name}”`}/> : <p className="fine">The photo is not in this browser (photos stay on the device where they were taken).</p>;
}
/**
 * Session AV lane 2 (r4-notes; LEDGER #311, Bear's info panel): the open note's words, characters, minutes to read (an
 * estimate) and when it was made and last changed. Derived each time; nothing stored.
 */
function NoteInfo({note}: {note: Note}) {
  const w = countWords(note.body), c = countCharacters(note.body), stamp = (iso: string) => formatDateTime(iso);
  return <details className="note-fold note-info-fold"><summary>Note info <span className="fine">· {formatNumber(w)} {w === 1 ? 'word' : 'words'}</span></summary>
    <dl className="note-info">
      <div><dt>Words</dt><dd>{formatNumber(w)}</dd></div>
      <div><dt>Characters</dt><dd>{formatNumber(c)}</dd></div>
      <div><dt>Reading time</dt><dd>About {readMinutes(w)} {readMinutes(w) === 1 ? 'minute' : 'minutes'} <span className="fine">(an estimate at 230 words a minute)</span></dd></div>
      <div><dt>Made</dt><dd>{stamp(note.createdAt)}</dd></div>
      <div><dt>Last changed</dt><dd>{note.updatedAt ? stamp(note.updatedAt) : 'Not changed since it was made'}</dd></div>
    </dl>
  </details>;
}
