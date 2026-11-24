'use client';
import {useId, useMemo, useState} from 'react';
import type {Journal} from '../../lib/journal/schema';
import {booksOf} from '../../lib/journal/books';
import {ebookEntries, ebookFileName, journalDocx, journalEpub, type EbookPhoto} from '../../lib/journal/ebook';
import {getJournalMedia} from '../../lib/journal/media';
import {DOCX_TYPE, type DocImage} from '../../lib/notes/note-files';
import {docImage, saveFile} from '../../lib/notes/doc-image';
import {photoScope} from '../../lib/health-aa/photos';
import {isShowcase} from '../../lib/showcase-storage';
import {localDate} from '../../lib/local-date';
import {formatNumber} from '../../lib/visual-format';

/**
 * Session AV lane 2 (r4-notes; LEDGER #320, Journey's e-book and Word export): Journal → Import and export → "E-book and
 * Word": a journal (or all) and the days from and to, then an e-book (.epub) or a Word file (.docx), each made on this
 * device with the entries' photos. A letter not yet opened stays out (and is counted). Its own chunk.
 */
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export default function JournalEbook({journal}: {journal: Journal}) {
  const id = useId(), today = localDate(), dates = journal.entries.map(e => e.date).sort();
  const [book, setBook] = useState('all'), [from, setFrom] = useState(dates[0] ?? today), [to, setTo] = useState(dates.at(-1) && dates.at(-1)! > today ? dates.at(-1)! : today);
  const [busy, setBusy] = useState(false), [said, setSaid] = useState('');
  const ok = DAY.test(from) && DAY.test(to) && from <= to, pick = {book, from, to, today};
  const {entries, sealed} = useMemo(() => ok ? ebookEntries(journal, pick) : {entries: [], sealed: 0}, [journal, ok, book, from, to, today]); // eslint-disable-line react-hooks/exhaustive-deps -- `pick` is these
  const make = async (kind: 'epub' | 'docx') => {
    setBusy(true); setSaid('Making the file on this device…');
    try {
      const photos = new Map<string, EbookPhoto>(), images = new Map<string, DocImage>(), scope = photoScope();
      let missing = 0;
      for (const e of entries) for (const pid of e.photos ?? []) {
        const m = await getJournalMedia(scope, pid).catch(() => null);
        if (!m || m.kind !== 'photo') { missing++; continue; }
        if (kind === 'epub') photos.set(pid, {data: new Uint8Array(await m.blob.arrayBuffer()), type: m.type});
        else { const img = await docImage(m.blob, 'A photo from your journal'); if (img) images.set(pid, img); else missing++; }
      }
      const name = ebookFileName(journal, pick, kind, isShowcase());
      if (kind === 'epub') saveFile(journalEpub(journal, pick, photos, {id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`}), name, 'application/epub+zip');
      else saveFile(journalDocx(journal, pick, images), name, DOCX_TYPE);
      setSaid(`Saved as ${name}: ${entries.length === 1 ? '1 entry' : `${formatNumber(entries.length)} entries`}${missing ? `; ${missing === 1 ? '1 photo was' : `${missing} photos were`} not in this browser` : ''}.`);
    } catch (e) { setSaid(e instanceof Error ? e.message : 'The file could not be made on this device.'); } finally { setBusy(false); }
  };
  return <section aria-labelledby={`${id}-t`} className="journal-files-part journal-ebook">
    <h3 id={`${id}-t`}>E-book and Word</h3>
    <p className="fine">A journal between two days as an e-book (.epub: a chapter per month, a contents page, your photos inside) for Apple Books, Kobo or any e-reader, or as a Word file (.docx). Made on this device; keep it private.</p>
    <div className="journal-ebook-fields">
      <label className="field"><span>Journal</span><select value={book} onChange={e => setBook(e.target.value)}>
        <option value="all">All journals</option><option value="main">Journal</option>
        {booksOf(journal).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select></label>
      <label className="field"><span>From</span><input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}/></label>
      <label className="field"><span>To</span><input type="date" value={to} min={from} onChange={e => setTo(e.target.value)}/></label>
    </div>
    <p className="fine" aria-live="polite">{!ok ? 'Choose a first day on or before the last day.' : entries.length ? `${entries.length === 1 ? '1 entry' : `${formatNumber(entries.length)} entries`}${sealed ? `; ${sealed === 1 ? '1 letter waits' : `${sealed} letters wait`} until ${sealed === 1 ? 'it opens' : 'they open'} and ${sealed === 1 ? 'is' : 'are'} left out` : ''}.` : 'No entry in these days.'}</p>
    <div className="journal-actions">
      <button type="button" className="secondary" disabled={busy || !entries.length} onClick={() => void make('epub')}>Save as e-book (.epub)</button>
      <button type="button" className="secondary" disabled={busy || !entries.length} onClick={() => void make('docx')}>Save as Word (.docx)</button>
    </div>
    <p className="fine" role="status">{said}</p>
  </section>;
}
