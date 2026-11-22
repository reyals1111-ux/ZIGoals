'use client';
import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {notePhotoIdsOf, type Note} from '../../lib/notes/schema';
import {unplacedPhotoIds} from '../../lib/notes/note-photos';
import type {LinkIndex} from '../../lib/notes/links';
import {getNotePhoto} from '../../lib/notes/photos';
import {photoScope} from '../../lib/health-aa/photos';
import {formatDate} from '../../lib/visual-format';
import {NoteRender} from './note-render';
import './note-print.css';

/**
 * Session AV lane 2 (r3-notes; LEDGER #271, Obsidian's PDF export of a note): "Print this note" — a sheet with the note's
 * title, its day (or when it was made and last changed), its words as the reading view draws them (tick boxes, highlights,
 * tables) and its photo, put on the page for the browser's print window (where "Save as PDF" makes a PDF) and taken away
 * after, as the tasks list prints. Hidden on screen; nothing is sent anywhere. Its own chunk.
 */
export const PRINT_NOTE_CLASS = 'zg-print-note';
export default function NotePrint({note, heading, index, onDone}: {note: Note; heading: string; index: LinkIndex; onDone: () => void}) {
  // Review b4g B4G-14: every photo of the note (placed in the words or under them) is read first, and the print window
  // opens only once each has loaded or is known to be missing here.
  const ids = notePhotoIdsOf(note), key = ids.join(',');
  const [urls, setUrls] = useState<ReadonlyMap<string, string | null> | undefined>(ids.length ? undefined : new Map());
  useEffect(() => {
    const list = key ? key.split(',') : [], made: string[] = [];
    let live = true;
    void Promise.all(list.map(id => getNotePhoto(photoScope(), id).then(p => { if (!p) return [id, null] as const; const u = URL.createObjectURL(p.blob); made.push(u); return [id, u] as const; }, () => [id, null] as const)))
      .then(pairs => { if (live) setUrls(new Map(pairs)); });
    return () => { live = false; for (const u of made) URL.revokeObjectURL(u); };
  }, [key]);
  const photo = urls;
  useEffect(() => {
    if (photo === undefined) return; // waits for every photo (or for knowing it is not here)
    const root = document.documentElement;
    let finished = false;
    const done = () => { if (finished) return; finished = true; root.classList.remove(PRINT_NOTE_CLASS); window.removeEventListener('afterprint', done); window.clearTimeout(late); onDone(); };
    root.classList.add(PRINT_NOTE_CLASS);
    window.addEventListener('afterprint', done);
    const late = window.setTimeout(done, 60_000);
    const frame = requestAnimationFrame(() => { try { window.print(); } catch { done(); } });
    return () => { cancelAnimationFrame(frame); if (!finished) { finished = true; root.classList.remove(PRINT_NOTE_CLASS); window.removeEventListener('afterprint', done); window.clearTimeout(late); } };
  }, [photo, onDone]);
  const made = note.createdAt.slice(0, 10), changed = (note.updatedAt ?? note.createdAt).slice(0, 10);
  const meta = note.kind === 'daily' && note.day ? formatDate(note.day, {weekday: true}) : `Made ${formatDate(made)}${changed !== made ? ` · changed ${formatDate(changed)}` : ''}`;
  return createPortal(<section className="note-print-sheet" aria-label={`${heading}, as printed`}>
    <h1>{heading}</h1>
    <p className="note-print-meta">{meta}{note.tags?.length ? ` · ${note.tags.map(t => `#${t}`).join(' ')}` : ''} · ZIGoals</p>
    <NoteRender text={note.body.replace(/\n*\(SHOWCASE DATA\)\s*$/, '\n\n(Showcase example)')} index={index} photos={ids} photoUrls={urls}/>
    {/* eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo */}
    {unplacedPhotoIds(note).map(id => urls?.get(id) ? <img key={id} className="note-print-photo" src={urls.get(id)!} alt={`Your photo with “${heading}”`}/> : null)}
  </section>, document.body);
}
