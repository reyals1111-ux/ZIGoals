'use client';
import {useState} from 'react';
import {getAppStorage, isShowcase} from '../lib/showcase-storage';
import {deletedAccountRecords} from '../lib/deleted-account-records';
import {localDate} from '../lib/local-date';
import './export-everything.css';

/**
 * T4 (Session P, PR 3): "Export everything (optional)". One tap makes one readable ZIP on this device with a JSON file
 * of every stored record and a CSV per area. Nothing is uploaded, nothing is written to storage, and nobody needs it:
 * sync and the encrypted backup keep records safe. It is not a restore format.
 */
/** Session Z-Cloud Part 5 (A7): the plain note on an export of a deleted account's records. */
export const DELETED_EXPORT_NOTE = 'Your cloud copy was deleted; this export holds the records this device kept for that account. Nothing was changed or uploaded, and they stay locked in the app.';
export function ExportEverything() {
  const [agreed, setAgreed] = useState(false), [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [notes, setNotes] = useState<string[]>([]), [error, setError] = useState('');
  async function run() {
    setBusy(true); setError(''); setStatus(''); setNotes([]);
    try {
      // The export code (every module's reader and the ZIP writer) loads with this tap, not with Settings (Session X Part 5).
      const {buildEverythingZip, collectEverything, readEverything} = await import('../lib/export/everything');
      // Session Z-Cloud Part 5 (A7): an account whose cloud copy was deleted is locked, and its records stay here; the
      // export still copies them, read-only, and says so.
      let storage: Storage, kept = false; const now = new Date();
      try { storage = getAppStorage(); } catch (locked) { const records = deletedAccountRecords(); if (!records) throw locked; storage = records; kept = true; }
      const {texts, localSimulation} = await readEverything(storage);
      // ZIGi's conversations (ADR-012) ride along; its provider keys live in a key store the export never opens.
      // The chat store (IndexedDB, or the Showcase tab's storage) is imported only for the export itself; the page never ships it.
      const aiChats = kept ? undefined : await import('../lib/ai/scope').then(({currentChatStore, exportChats}) => exportChats(currentChatStore())).catch(() => undefined);
      const collected = collectEverything(texts, {now, version: process.env.NEXT_PUBLIC_APP_VERSION ?? '', commit: process.env.NEXT_PUBLIC_APP_COMMIT ?? '', localSimulation, aiChats});
      const photos = await import('../lib/health-aa/photos').then(m => m.exportPhotoEntries(now)).catch(() => []); // Session AA-Local: the progress photos as files (device-only; B7)
      const {name, bytes} = buildEverythingZip(collected, {date: localDate(now), showcase: isShowcase(), now}, photos);
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
    <div className="actions"><button className="primary" type="button" disabled={!agreed || busy} onClick={() => void run()}>{busy ? 'Making your export…' : 'Export everything'}</button></div>
    {status && <p role="status">{status}</p>}
    {notes.map(note => <p key={note} className="notice">{note}</p>)}
    {error && <p role="alert">{error}</p>}
    <p className="fine">Made on this device. Nothing is uploaded. This is not a restore format.</p>
  </section>;
}
