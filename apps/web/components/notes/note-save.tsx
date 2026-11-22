'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {notePhotoIdsOf, type Note} from '../../lib/notes/schema';
import {getNotePhoto} from '../../lib/notes/photos';
import {photoScope} from '../../lib/health-aa/photos';
import {DOCX_TYPE, noteDocx, noteFileName, noteHtml, noteText, noteTitle, type DocImage, type NotePhotoBytes} from '../../lib/notes/note-files';
import {docImage, saveFile} from '../../lib/notes/doc-image';

/**
 * Session AV lane 2 (r4-notes; LEDGER #319, Bear's exports): "Save this note as…" — an HTML page (its photos inside), plain
 * text, or a Word file (.docx, its photos as JPEG), each made on this device and handed to the browser to save. Its own
 * chunk; a locked note offers it only once shown (the editor shows its words only after the PIN).
 */
type Kind = 'html' | 'txt' | 'docx';
export default function NoteSave({note, onClose}: {note: Note; onClose: () => void}) {
  const id = useId(), first = useRef<HTMLButtonElement>(null), [busy, setBusy] = useState(false), [said, setSaid] = useState('');
  useEffect(() => { first.current?.focus(); }, []);
  const make = async (kind: Kind) => {
    setBusy(true); setSaid('Making the file on this device…');
    try {
      const ids = notePhotoIdsOf(note), photos = new Map<string, NotePhotoBytes>(), images = new Map<string, DocImage>();
      let missing = 0;
      for (const pid of kind === 'txt' ? [] : ids) {
        const p = await getNotePhoto(photoScope(), pid).catch(() => null);
        if (!p) { missing++; continue; }
        if (kind === 'html') photos.set(pid, {data: new Uint8Array(await p.blob.arrayBuffer()), type: p.type});
        else { const img = await docImage(p.blob, `A photo in “${noteTitle(note)}”`); if (img) images.set(pid, img); else missing++; }
      }
      if (kind === 'html') saveFile(noteHtml(note, photos), noteFileName(note, 'html'), 'text/html');
      else if (kind === 'txt') saveFile(noteText(note), noteFileName(note, 'txt'), 'text/plain');
      else saveFile(noteDocx(note, images), noteFileName(note, 'docx'), DOCX_TYPE);
      setSaid(`Saved as ${noteFileName(note, kind)}${missing ? `; ${missing === 1 ? '1 photo was' : `${missing} photos were`} not in this browser, so ${missing === 1 ? 'it is' : 'they are'} not in the file` : ''}.`);
    } catch (e) { setSaid(e instanceof Error ? e.message : 'The file could not be made on this device.'); } finally { setBusy(false); }
  };
  return <section className="note-save" aria-labelledby={`${id}-t`} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } }}>
    <h3 id={`${id}-t`} className="note-save-title">Save this note as</h3>
    <div className="note-actions">
      <button ref={first} type="button" className="secondary" disabled={busy} onClick={() => void make('html')}>A web page (.html)</button>
      <button type="button" className="secondary" disabled={busy} onClick={() => void make('txt')}>Plain text (.txt)</button>
      <button type="button" className="secondary" disabled={busy} onClick={() => void make('docx')}>A Word file (.docx)</button>
      <button type="button" className="quiet" onClick={onClose}>Close</button>
    </div>
    <p className="fine">The web page holds the note&rsquo;s photos inside it; the Word file has them as pictures. Made on this device; nothing is uploaded.</p>
    <p className="fine" role="status">{said}</p>
  </section>;
}
