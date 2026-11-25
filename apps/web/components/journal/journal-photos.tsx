'use client';
import {useEffect, useMemo, useState} from 'react';
import type {Journal} from '../../lib/journal/schema';
import {booksOf, type BookChoice} from '../../lib/journal/books';
import {galleryItems, galleryYears, type GalleryItem} from '../../lib/journal/gallery';
import {getJournalMedia} from '../../lib/journal/media';
import {clipLength} from '../../lib/journal/keep-media';
import {photoScope} from '../../lib/health-aa/photos';
import {formatDate} from '../../lib/visual-format';
// Session AW (x3; LEDGER #445 "A photo a day", #442 the journal's own voice player).
import DayStrip from './day-strip';
import VoicePlayer from './voice-player';

/**
 * Session AV lane 2 (r6-notes; LEDGER #404, Diarium's media gallery): "Photos and voice notes" in the Journal (lazy,
 * loaded when its fold opens) — every journal photo as a grid and every voice note as a tile, newest first; a journal and
 * a year to narrow it. A tap opens that day's entries in the list. Read from this device's journal media store, 48 at a
 * time ("Show more"); a letter still folded away keeps its photos folded until its day. A photo not in this browser says
 * so (it stays on the device where it was added).
 */
const PAGE = 48;
function Tile({item, onOpen}: {item: GalleryItem; onOpen: (day: string) => void}) {
  const [url, setUrl] = useState<string | null | undefined>(undefined), day = formatDate(item.date, {weekday: true});
  useEffect(() => {
    if (item.kind !== 'photo') return;
    let live = true, made: string | null = null;
    void getJournalMedia(photoScope(), item.mediaId).then(m => { if (!live) return; if (m) { made = URL.createObjectURL(m.blob); setUrl(made); } else setUrl(null); }, () => { if (live) setUrl(null); });
    return () => { live = false; if (made) URL.revokeObjectURL(made); };
  }, [item.kind, item.mediaId]);
  const name = item.kind === 'photo' ? `Photo${item.of > 1 ? ` ${item.n} of ${item.of}` : ''} from ${day}: open that day’s entries` : `Voice note from ${day}, ${clipLength(item.seconds ?? 0)}: open that day’s entries`;
  if (item.kind === 'audio') return <VoiceTile item={item} name={name} day={day} onOpen={onOpen}/>;
  return <li className="journal-photo-tile">
    <button type="button" className="journal-photo-open" aria-label={name} onClick={() => onOpen(item.date)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo */}
      {url ? <img src={url} alt="" loading="lazy"/> : url === null ? <span className="fine">Not in this browser</span> : <span className="fine" aria-hidden="true">…</span>}
      <span className="journal-photo-day" aria-hidden="true">{formatDate(item.date, {year: false})}</span>
    </button>
  </li>;
}
/** Session AW (x3; LEDGER #442): a voice note across the grid's width — its day, which opens the entries, and the player. */
function VoiceTile({item, name, day, onOpen}: {item: GalleryItem; name: string; day: string; onOpen: (day: string) => void}) {
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let live = true, made: string | null = null;
    void getJournalMedia(photoScope(), item.mediaId).then(m => { if (!live) return; if (m && m.kind === 'audio') { made = URL.createObjectURL(m.blob); setUrl(made); } else setUrl(null); }, () => { if (live) setUrl(null); });
    return () => { live = false; if (made) URL.revokeObjectURL(made); };
  }, [item.mediaId]);
  return <li className="journal-photo-tile is-audio">
    <button type="button" className="quiet journal-photo-voice-open" aria-label={name} onClick={() => onOpen(item.date)}><span aria-hidden="true">♪</span> {formatDate(item.date, {year: false})} · {clipLength(item.seconds ?? 0)}</button>
    {url ? <VoicePlayer src={url} seconds={item.seconds} label={`Voice note from ${day}, ${clipLength(item.seconds ?? 0)}`}/> : <p className="fine">{url === null ? 'This voice note is not in this browser (it stays on the device where it was recorded).' : 'Opening…'}</p>}
  </li>;
}
export default function JournalPhotos({journal, today, onOpen}: {journal: Journal; today: string; onOpen: (day: string) => void}) {
  const books = booksOf(journal), [book, setBook] = useState<BookChoice>('all'), [year, setYear] = useState(''), [kind, setKind] = useState<'all' | 'photo' | 'audio'>('all'), [shown, setShown] = useState(PAGE);
  const years = useMemo(() => galleryYears(journal, today, book), [journal, today, book]);
  const items = useMemo(() => galleryItems(journal, today, {book, year: years.includes(year) ? year : null, kind}), [journal, today, book, year, years, kind]);
  useEffect(() => { setShown(PAGE); }, [book, year, kind]);
  const all = galleryItems(journal, today);
  if (!all.length) return <p className="fine">No photos or voice notes in your journal yet. Under Write, open &ldquo;Photos and a voice note&rdquo; to add them to an entry; they all gather here, newest first, with &ldquo;A photo a day&rdquo;: each day&rsquo;s photo in a month strip.</p>;
  const photos = items.filter(i => i.kind === 'photo').length, voice = items.length - photos;
  return <div className="journal-photos">
    <div className="journal-photos-pick">
      {books.length > 0 && <label className="field"><span>Journal</span><select value={book} onChange={e => setBook(e.target.value)}><option value="all">Every journal</option><option value="main">Journal (main)</option>{books.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
      {years.length > 1 && <label className="field"><span>Year</span><select value={years.includes(year) ? year : ''} onChange={e => setYear(e.target.value)}><option value="">Every year</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label>}
      <label className="field"><span>Show</span><select value={kind} onChange={e => setKind(e.target.value as typeof kind)}><option value="all">Photos and voice notes</option><option value="photo">Photos</option><option value="audio">Voice notes</option></select></label>
    </div>
    {kind !== 'audio' && <DayStrip journal={journal} today={today} book={book} onOpen={onOpen}/>}
    <p className="fine" role="status">{photos === 1 ? '1 photo' : `${photos} photos`}{voice ? `, ${voice === 1 ? '1 voice note' : `${voice} voice notes`}` : ''}, newest first. A tap opens that day&rsquo;s entries.</p>
    {items.length ? <ul className="journal-photo-grid" aria-label="Photos and voice notes of your journal">{items.slice(0, shown).map(i => <Tile key={`${i.entryId}-${i.mediaId}`} item={i} onOpen={onOpen}/>)}</ul>
      : <p className="fine">None here. Choose every journal or every year to see the others.</p>}
    {items.length > shown && <button type="button" className="quiet journal-photos-more" onClick={() => { const next = shown; setShown(n => n + PAGE); requestAnimationFrame(() => document.querySelectorAll<HTMLButtonElement>('.journal-photo-grid .journal-photo-open, .journal-photo-grid .journal-photo-voice-open')[next]?.focus()); }}>Show {Math.min(PAGE, items.length - shown)} more</button>}
  </div>;
}
