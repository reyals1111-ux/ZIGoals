'use client';
import {useEffect, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {JOURNAL, journalSchema, type JournalEntry} from '../../lib/journal/schema';
import {getJournalMedia} from '../../lib/journal/media';
import {clipLength} from '../../lib/journal/keep-media';
import {photoScope} from '../../lib/health-aa/photos';
import {showStatus, showUndo} from '../ui/undo-toast';
import {entryPhotos, withPhotos, withoutPhoto} from '../../lib/journal/more-photos';
// Session AW (x3; LEDGER #442, #445): the journal's own voice player, and the photo of the day.
import VoicePlayer from './voice-player';
import {setDayPhoto} from '../../lib/journal/day-photo';

/**
 * Session AV lane 2 (journal; LEDGER #35 photos, #42 audio): an entry's photos and its voice note, read from this
 * device's journal media (IndexedDB), each with a plain name. "Remove" takes it off the entry with Undo; the file itself
 * is deleted by the 30-day sweep once no entry names it (lib/journal/media.ts), so Undo finds it. Media that is not in
 * this browser says so (it stays on the device where it was taken). Loaded only for an entry that has media.
 */
type Shown = {id: string; kind: 'photo' | 'audio'; url: string | null; seconds?: number};
export default function EntryMedia({entry, day}: {entry: JournalEntry; day: string}) {
  const journal = useDeviceRecord(JOURNAL);
  const [shown, setShown] = useState<Shown[]>([]);
  // Session AV lane 2 (r4-mind; LEDGER #317): photos five to twelve (morePhotos) after the first four.
  const ids = [...entryPhotos(entry).map(id => ({id, kind: 'photo' as const})), ...(entry.audio ?? []).map(a => ({id: a.id, kind: 'audio' as const, seconds: a.seconds}))];
  const key = ids.map(x => x.id).join(',');
  useEffect(() => {
    let live = true; const made: string[] = [];
    void (async () => {
      const out: Shown[] = [];
      for (const item of ids) {
        let url: string | null = null;
        try { const m = await getJournalMedia(photoScope(), item.id); if (m) { url = URL.createObjectURL(m.blob); made.push(url); } } catch { url = null; }
        out.push({...item, url});
      }
      if (live) setShown(out);
    })();
    return () => { live = false; for (const u of made) URL.revokeObjectURL(u); };
    // The ids are the dependency (the entry object changes on every write).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const remove = (id: string, kind: 'photo' | 'audio') => {
    const before = {photos: entryPhotos(entry), audio: entry.audio, dayPhoto: entry.dayPhoto};
    const change = (e: JournalEntry): JournalEntry => {
      const next = {...withoutPhoto(e, id), audio: (e.audio ?? []).filter(x => x.id !== id)};
      if (!next.audio.length) delete (next as Partial<JournalEntry>).audio;
      if (next.dayPhoto === id) delete (next as Partial<JournalEntry>).dayPhoto; // Session AW (x3; LEDGER #445)
      return next;
    };
    try { journal.update(c => journalSchema.parse({...c, entries: c.entries.map(e => e.id === entry.id ? change(e) : e)})); } catch { return; }
    showUndo({message: kind === 'photo' ? `Photo taken off the entry of ${day}.` : `Voice note taken off the entry of ${day}.`, undone: 'It is back with the entry.',
      restore: () => journal.update(c => journalSchema.parse({...c, entries: c.entries.map(e => e.id === entry.id ? {...withPhotos(e, before.photos), ...(before.audio ? {audio: before.audio} : {}), ...(before.dayPhoto ? {dayPhoto: before.dayPhoto} : {})} : e)}))});
  };
  // Session AW (x3; LEDGER #445): one photo a day stands for it; marking this one takes the mark off the day's others.
  const markDay = (id: string, on: boolean) => {
    try { journal.update(c => setDayPhoto(c, entry.id, on ? id : null)); showStatus(on ? `Photo of the day for ${day}. Journal → Photos and voice notes → A photo a day shows it.` : `Not the photo of the day any more; the day's first photo stands for ${day}.`); }
    catch { showStatus('This could not be kept on this device.', {tone: 'error'}); }
  };
  const photos = shown.filter(s => s.kind === 'photo'), audio = shown.filter(s => s.kind === 'audio');
  if (!shown.length) return null;
  return <div className="journal-entry-media">
    {photos.length > 0 && <ul className="journal-entry-photos" aria-label={`Photos of the entry of ${day}`}>{photos.map((p, i) => <li key={p.id}>
      {p.url
        // eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo: next/image has nothing to optimise
        ? <img src={p.url} alt={`Your photo with the entry of ${day}${photos.length > 1 ? ` (${i + 1} of ${photos.length})` : ''}`} loading="lazy"/>
        : <p className="fine">This photo is not in this browser (it stays on the device where it was added).</p>}
      <div className="journal-entry-photo-actions">
        {/* Session AW (x3; LEDGER #445, The Five Minute Journal): this photo stands for its day in "A photo a day". */}
        <button type="button" className="quiet journal-day-photo-mark" aria-pressed={entry.dayPhoto === p.id} aria-label={`Photo of the day: photo ${i + 1} of the entry of ${day}`} onClick={() => markDay(p.id, entry.dayPhoto !== p.id)}><span aria-hidden="true">{entry.dayPhoto === p.id ? '★' : '☆'}</span> Photo of the day</button>
        <button type="button" className="quiet" aria-label={`Take photo ${i + 1} off the entry of ${day}`} onClick={() => remove(p.id, 'photo')}>Remove</button>
      </div>
    </li>)}</ul>}
    {audio.map(a => <div key={a.id} className="journal-entry-audio">
      {a.url ? <VoicePlayer src={a.url} seconds={a.seconds} label={`Voice note of ${day}, ${clipLength(a.seconds ?? 0)}`}/> : <p className="fine">This voice note is not in this browser (it stays on the device where it was recorded).</p>}
      <span className="fine">Voice note · {clipLength(a.seconds ?? 0)}</span>
      <button type="button" className="quiet" aria-label={`Take the voice note off the entry of ${day}`} onClick={() => remove(a.id, 'audio')}>Remove</button>
    </div>)}
  </div>;
}
