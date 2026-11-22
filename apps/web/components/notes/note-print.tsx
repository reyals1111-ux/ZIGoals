'use client';
import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {notePhotoIdsOf, type Note} from '../../lib/notes/schema';
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
  const [photo, setPhoto] = useState<string | null | undefined>(note.photoId ? undefined : null);
  useEffect(() => {
    let made: string | null = null, live = true;
    if (note.photoId) void getNotePhoto(photoScope(), note.photoId).then(p => { if (!live) return; if (p) { made = URL.createObjectURL(p.blob); setPhoto(made); } else setPhoto(null); }, () => { if (live) setPhoto(null); });
    return () => { live = false; if (made) URL.revokeObjectURL(made); };
  }, [note.photoId]);
  useEffect(() => {
    if (photo === undefined) return; // waits for the photo (or for knowing there is none here)
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
    <NoteRender text={note.body.replace(/\n*\(SHOWCASE DATA\)\s*$/, '\n\n(Showcase example)')} index={index} photos={notePhotoIdsOf(note)}/>
    {/* eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo */}
    {photo && <img className="note-print-photo" src={photo} alt={`Your photo with “${heading}”`}/>}
  </section>, document.body);
}
