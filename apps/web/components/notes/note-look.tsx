'use client';
import {useEffect, useId, useState} from 'react';
import {NOTE_LOOK_COLOURS, noteName, notePhotoIdsOf, type Note, type NoteLookColour} from '../../lib/notes/schema';
import {updateNote} from '../../lib/notes/store';
import {getNotePhoto} from '../../lib/notes/photos';
import {photoScope} from '../../lib/health-aa/photos';
import type {Change} from './note-editor';

/**
 * Session AV lane 2 (r5-notes; LEDGER #367, Craft's page look): a note's look in the reading view — a cover chosen from
 * the note's own photos and one of six calm page colours (a light tint over the theme's own page, so the words keep their
 * contrast in every theme). Loaded when its fold opens (the picker) or when a note has a cover (the cover). Stored as the
 * note's `look`; the words never change.
 */
export const LOOK_WORDS: Record<NoteLookColour, string> = {sand: 'Sand', sage: 'Sage', sky: 'Sky', lilac: 'Lilac', rose: 'Rose', stone: 'Stone'};
export default function NoteLook({note, change}: {note: Note; change: Change}) {
  const id = useId(), photos = notePhotoIdsOf(note), look = note.look ?? {};
  const set = (next: {cover?: string; colour?: NoteLookColour}, said: string) => change(r => updateNote(r, note.id, {look: {...(next.cover ? {cover: next.cover} : {}), ...(next.colour ? {colour: next.colour} : {})}}, new Date().toISOString()), said);
  const cover = look.cover && photos.includes(look.cover) ? look.cover : '';
  return <div className="note-look-pick">
    <fieldset>
      <legend>Cover</legend>
      {photos.length ? <div className="note-look-options">
        <label><input type="radio" name={`${id}-cover`} checked={!cover} onChange={() => set({colour: look.colour}, 'No cover.')}/> None</label>
        {photos.map((p, i) => <label key={p}><input type="radio" name={`${id}-cover`} checked={cover === p} onChange={() => set({cover: p, colour: look.colour}, `Photo ${i + 1} is the cover.`)}/> Photo {i + 1}</label>)}
      </div> : <p className="fine">Add a photo to this note first; one of its own photos can be its cover.</p>}
    </fieldset>
    <fieldset>
      <legend>Page colour</legend>
      <div className="note-look-options">
        <label><input type="radio" name={`${id}-colour`} checked={!look.colour} onChange={() => set({cover}, 'The page has no colour.')}/> None</label>
        {NOTE_LOOK_COLOURS.map(c => <label key={c}><input type="radio" name={`${id}-colour`} checked={look.colour === c} onChange={() => set({cover, colour: c}, `The page is ${LOOK_WORDS[c].toLowerCase()}.`)}/> <span className="note-look-swatch" data-look={c} aria-hidden="true"/> {LOOK_WORDS[c]}</label>)}
      </div>
    </fieldset>
    <p className="fine">Shown when you read “{noteName(note)}”; the words stay as they are.</p>
  </div>;
}
/** The cover over the reading view: one of the note's own photos, from this device. */
export function NoteCover({id, name}: {id: string; name: string}) {
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let made: string | null = null, live = true;
    void getNotePhoto(photoScope(), id).then(p => { if (!live) return; if (p) { made = URL.createObjectURL(p.blob); setUrl(made); } else setUrl(null); }, () => { if (live) setUrl(null); });
    return () => { live = false; if (made) URL.revokeObjectURL(made); };
  }, [id]);
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo: next/image has nothing to optimise
  return <img className="note-cover" src={url} alt={`Cover of “${name}”`}/>;
}
