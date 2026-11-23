'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {NOTES, noteName} from '../../lib/notes/schema';
import {ensureEventNote, eventKeyOf, eventNoteOf} from '../../lib/notes/event-notes';
import {noteHref} from '../../lib/notes/links';

/**
 * Session AV lane 2 (r5-notes; LEDGER #364, Craft): "Notes for this event" under an imported event on the Agenda (its own
 * lazy chunk). The first tap makes a note named after the event and its day, linked to that day's daily note, and opens
 * it; after that the row says which note it is and the tap opens the same note. Reads and writes this device's notes only.
 */
export default function EventNote({itemId, title, day}: {itemId: string; title: string; day: string}) {
  const notes = useDeviceRecord(NOTES), router = useRouter(), [said, setSaid] = useState('');
  if (!notes.loaded || notes.unreadable) return null;
  const key = eventKeyOf(itemId), found = eventNoteOf(notes.data, key);
  const open = () => {
    try {
      let id = found?.id ?? '';
      if (!found) notes.update(r => { const out = ensureEventNote(r, {key, title, day, now: new Date().toISOString()}); id = out.note.id; return out.record; });
      if (id) router.push(noteHref(id));
    } catch (e) { setSaid(e instanceof Error ? e.message : 'The note could not be made on this device.'); }
  };
  return <p className="agenda-event-note">
    <button type="button" className="text-link" aria-label={found ? `Open the note “${noteName(found)}”` : `Notes for this event: ${title}`} onClick={open}>{found ? <>Note: {noteName(found)}</> : 'Notes for this event'}</button>
    {said && <span className="fine" role="status"> {said}</span>}
  </p>;
}
