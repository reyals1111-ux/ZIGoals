'use client';
import {getAccountScope} from '../lib/account-session';
import {useState} from 'react';
import {getAppStorage, isShowcase, showcaseDay} from '../lib/showcase-storage';
import {PORTFOLIO_KEY} from '../lib/portfolio/schema';
import {showcasePortfolios} from '../lib/portfolio/showcase';
import {deletedAccountRecords} from '../lib/deleted-account-records';
import {localDate} from '../lib/local-date';
import {FieldError} from './primitives/field-error';
import './export-everything.css';

/**
 * T4 (Session P, PR 3): "Export everything (optional)". One tap makes one readable ZIP on this device with a JSON file
 * of every stored record and a CSV per area. Nothing is uploaded, nothing is written to storage, and nobody needs it:
 * sync and the encrypted backup keep records safe. Settings → Your data → Restore from a backup reads it back (Session AB-Cloud).
 */
/** Session Z-Cloud Part 5 (A7): the plain note on an export of a deleted account's records. */
export const DELETED_EXPORT_NOTE = 'Your cloud copy was deleted; this export holds the records this device kept for that account. Nothing was changed or uploaded, and they stay locked in the app.';
export function ExportEverything() {
  const [agreed, setAgreed] = useState(false), [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [notes, setNotes] = useState<string[]>([]), [error, setError] = useState('');
  // Session AL (GAP-175, C-BN-27): an optional date range; both days set makes a CSV-only export of that range.
  const [from, setFrom] = useState(''), [through, setThrough] = useState('');
  const ranged = from !== '' || through !== '', rangeError = ranged && !(from && through && from <= through) ? (from && through ? 'Choose a start date on or before the end date.' : 'Choose both dates, or clear them for the full export.') : '';
  async function run() {
    if (rangeError) return;
    setBusy(true); setError(''); setStatus(''); setNotes([]);
    try {
      // The export code (every module's reader and the ZIP writer) loads with this tap, not with Settings (Session X Part 5).
      const {buildEverythingZip, buildRangeZip, collectEverything, readDateRange, readEverything} = await import('../lib/export/everything');
      // Session Z-Cloud Part 5 (A7): an account whose cloud copy was deleted is locked, and its records stay here; the
      // export still copies them, read-only, and says so.
      let storage: Storage, kept = false; const now = new Date();
      try { storage = getAppStorage(); } catch (locked) { const records = deletedAccountRecords(); if (!records) throw locked; storage = records; kept = true; }
      const {texts, localSimulation} = await readEverything(storage);
      // Session AH Part 3 (DS6, N-042): the Showcase's Portfolio is drawn from its fixture until it is changed, so the
      // export copies what the Portfolio page shows, as Portfolio does (components/portfolio/use-portfolios.ts).
      if (!kept && isShowcase() && texts[PORTFOLIO_KEY] == null) texts[PORTFOLIO_KEY] = JSON.stringify(showcasePortfolios(showcaseDay() ?? localDate(now)));
      // ZIGi's conversations (ADR-012) ride along; its provider keys live in a key store the export never opens.
      // The chat store (IndexedDB, or the Showcase tab's storage) is imported only for the export itself; the page never ships it.
      const aiChats = kept ? undefined : await import('../lib/ai/scope').then(({currentChatStore, exportChats}) => exportChats(currentChatStore())).catch(() => undefined);
      const collected = collectEverything(texts, {now, version: process.env.NEXT_PUBLIC_APP_VERSION ?? '', commit: process.env.NEXT_PUBLIC_APP_COMMIT ?? '', localSimulation, aiChats});
      // Session AL (GAP-175): a range export holds only that range's tables (no everything.json, no photos).
      const range = ranged ? readDateRange(from, through) : null;
      if (ranged && !range) throw Error('Choose a start date on or before the end date.');
      if (range) {
        const {name, bytes} = buildRangeZip(collected, range, {showcase: isShowcase(), now});
        const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], {type: 'application/zip'}));
        const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotes([...(kept ? [DELETED_EXPORT_NOTE] : []), ...collected.warnings]); setStatus(`Your export of ${range.from} to ${range.through} is ready and downloading. It holds only those dates’ tables, so it cannot be restored. Keep it private.`);
        return;
      }
      // Session AA-Cloud: the goals' vision photos this device keeps (none in the Showcase, which keeps no photos).
      const images = kept || isShowcase() ? [] : await import('../lib/vision/store').then(async ({listImages}) => Promise.all((await listImages(getAccountScope() ?? 'local')).map(async i => ({id: i.id, type: i.type, bytes: new Uint8Array(await i.blob.arrayBuffer())})))).catch(() => []);
      const progressPhotos = await import('../lib/health-aa/photos').then(m => m.exportPhotoEntries(now)).catch(() => []); // Session AA-Local: the progress photos as files (device-only; B7)
      // Session AK (4.2): the meal photos the person chose to keep, as files beside them.
      const mealPhotos = await Promise.all([import('../lib/health-aa/photos'), import('../lib/meal-estimates/photos')]).then(([a, m]) => m.exportMealPhotoEntries(a.photoScope(), now)).catch(() => []);
      // Owner follow-up 2 (B1): the notes' photos as files (device-only), named by the photo id each note points at.
      const notePhotos = kept ? [] : await Promise.all([import('../lib/health-aa/photos'), import('../lib/notes/photos'), import('../lib/notes/schema'), import('../lib/device-record')]).then(async ([a, n, sch, dr]) => {
        const ids = dr.readDeviceRecord(storage, sch.NOTES).data.notes.flatMap(note => note.photoId ? [note.photoId] : []);
        return [...(await n.notePhotosForExport(a.photoScope(), ids))].map(([id, p]) => ({name: `notes/photos/${id.replace(/[^A-Za-z0-9_-]/g, '')}.${p.type === 'image/webp' ? 'webp' : 'jpg'}`, data: p.data, modified: now}));
      }).catch(() => []);
      // Owner follow-up 2 (G1 #10): receipt photos as files, named by their entry's date and id (device-only).
      const moneyPhotos = kept ? [] : await Promise.all([import('../lib/health-aa/photos'), import('../lib/money-photos/store'), import('../lib/money-log/schema'), import('../lib/device-record')]).then(([a, m, sch, dr]) =>
        m.exportMoneyPhotoEntries(a.photoScope(), new Map(dr.readDeviceRecord(storage, sch.MONEY_LOG).data.entries.map(e => [e.id, e.date] as const)), now)).catch(() => []);
      const photos = [...progressPhotos, ...mealPhotos, ...notePhotos, ...moneyPhotos];
      const {name, bytes} = buildEverythingZip(collected, {date: localDate(now), showcase: isShowcase(), now, images}, photos);
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], {type: 'application/zip'}));
      const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      const lines = [...(kept ? [DELETED_EXPORT_NOTE] : []), ...collected.warnings];
      if (collected.unreadable.length) lines.push(`Some records on this device could not be read and were left out: ${collected.unreadable.join(', ')}. They were not changed.`);
      setNotes(lines); setStatus('Your export is ready and downloading. Keep it private.');
    } catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : 'The export could not be made. Nothing was changed.'); }
    finally { setBusy(false); }
  }
  return <section className="panel export-everything" id="export-everything" aria-labelledby="export-everything-title">
    <p className="eyebrow">OPTIONAL</p>
    <h2 id="export-everything-title">Everything you’ve saved, in one file.</h2>
    <p>This is optional: the encrypted backup, and account sync where it is on, keep your records. If you’d like a readable copy for yourself, this makes one ZIP with a JSON file of everything and a CSV per area (goals, contributions, habits, check-ins, Health diary, weights, water, activity, wealth).</p>
    <label className="export-everything-agree"><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} /><span>I understand this file is readable and holds my personal records, including Health.</span></label>
    <fieldset className="export-everything-range"><legend>Only some dates (optional)</legend><p className="fine">Leave empty for everything. With both dates, the file holds only those dates’ tables (CSV), without the full copy or photos.</p>
      <label>From<input type="date" value={from} onChange={event => setFrom(event.target.value)} aria-invalid={rangeError ? true : undefined} aria-describedby={rangeError ? 'export-range-error' : undefined}/></label>
      <label>To<input type="date" value={through} onChange={event => setThrough(event.target.value)} aria-invalid={rangeError ? true : undefined} aria-describedby={rangeError ? 'export-range-error' : undefined}/></label>
      {ranged && <button className="secondary" type="button" onClick={() => { setFrom(''); setThrough(''); }}>Clear dates</button>}
      <FieldError id="export-range-error" message={rangeError}/></fieldset>
    <div className="actions"><button className="primary" type="button" disabled={!agreed || busy || !!rangeError} onClick={() => void run()}>{busy ? 'Making your export…' : ranged ? 'Export these dates' : 'Export everything'}</button></div>
    {status && <p role="status">{status}</p>}
    {notes.map(note => <p key={note} className="notice">{note}</p>)}
    {error && <p role="alert">{error}</p>}
    <p className="fine">Made on this device. Nothing is uploaded. Settings → Your data → Restore from a backup reads it back.</p>
  </section>;
}
