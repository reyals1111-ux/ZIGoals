'use client';
import {useState} from 'react';
import Link from 'next/link';
import {getAppStorage, isShowcase, showcaseDay} from '../lib/showcase-storage';
// A static import, as before: Settings has the portfolio record's schema anyway, and a dynamic one kept every export of it on
// every page that loads it (Wealth, Portfolio: +0.1 to 0.2 kB).
import {PORTFOLIO_KEY} from '../lib/portfolio/schema';
import {localDate} from '../lib/local-date';
import {FieldError} from './primitives/field-error';
import './export-everything.css';
import {useHideFigures} from './hide-figures';

/**
 * T4 (Session P, PR 3): "Export everything (optional)". One tap makes one readable ZIP on this device with a JSON file
 * of every stored record and a CSV per area. Nothing is uploaded, nothing is written to storage, and nobody needs it:
 * sync and the encrypted backup keep records safe. Settings → Your data → Restore from a backup reads it back (Session AB-Cloud).
 * Session AV lane 2 (trim-settings; Settings' weight): the export's own code (lib/export/make-everything.ts, with the deleted
 * account's records and the Showcase portfolio) loads with the tap, as its comment says, not with Settings.
 */
export function ExportEverything() {
  const [agreed, setAgreed] = useState(false), [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [notes, setNotes] = useState<string[]>([]), [error, setError] = useState('');
  // Session AL (GAP-175, C-BN-27): an optional date range; both days set makes a CSV-only export of that range.
  const [from, setFrom] = useState(''), [through, setThrough] = useState(''), figuresHidden = useHideFigures();
  const ranged = from !== '' || through !== '', rangeError = ranged && !(from && through && from <= through) ? (from && through ? 'Choose a start date on or before the end date.' : 'Choose both dates, or clear them for the full export.') : '';
  async function run() {
    if (rangeError) return;
    setBusy(true); setError(''); setStatus(''); setNotes([]);
    try {
      // Session AV Part 3 (D-KEEP): the whole export lives in lib/export/make-everything.ts (Today's "Export a backup" makes
      // the same file), unchanged.
      const {DELETED_EXPORT_NOTE, makeEverythingExport} = await import('../lib/export/make-everything');
      if (!ranged) { const made = await makeEverythingExport(); setNotes(made.notes); setStatus('Your export is ready and downloading. Keep it private.'); return; }
      // The export code (every module's reader and the ZIP writer) loads with this tap, not with Settings (Session X Part 5).
      const {buildRangeZip, collectEverything, readDateRange, readEverything} = await import('../lib/export/everything');
      // Session Z-Cloud Part 5 (A7): an account whose cloud copy was deleted is locked, and its records stay here; the
      // export still copies them, read-only, and says so.
      let storage: Storage, kept = false; const now = new Date();
      try { storage = getAppStorage(); } catch (locked) { const records = (await import('../lib/deleted-account-records')).deletedAccountRecords(); if (!records) throw locked; storage = records; kept = true; }
      const {texts, localSimulation} = await readEverything(storage);
      if (!kept && isShowcase() && texts[PORTFOLIO_KEY] == null) { const {showcasePortfolios} = await import('../lib/portfolio/showcase'); texts[PORTFOLIO_KEY] = JSON.stringify(showcasePortfolios(showcaseDay() ?? localDate(now))); }
      const aiChats = kept ? undefined : await import('../lib/ai/scope').then(({currentChatStore, exportChats}) => exportChats(currentChatStore())).catch(() => undefined);
      const collected = collectEverything(texts, {now, version: process.env.NEXT_PUBLIC_APP_VERSION ?? '', commit: process.env.NEXT_PUBLIC_APP_COMMIT ?? '', localSimulation, aiChats});
      // Session AL (GAP-175): a range export holds only that range's tables (no everything.json, no photos).
      const range = readDateRange(from, through);
      if (!range) throw Error('Choose a start date on or before the end date.');
      const {name, bytes} = buildRangeZip(collected, range, {showcase: isShowcase(), now});
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], {type: 'application/zip'}));
      const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotes([...(kept ? [DELETED_EXPORT_NOTE] : []), ...collected.warnings]); setStatus(`Your export of ${range.from} to ${range.through} is ready and downloading. It holds only those dates’ tables, so it cannot be restored. Keep it private.`);
      return;
    } catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : 'The export could not be made. Nothing was changed.'); }
    finally { setBusy(false); }
  }
  return <section className="panel export-everything" id="export-everything" aria-labelledby="export-everything-title">
    <p className="eyebrow">OPTIONAL</p>
    <h2 id="export-everything-title">Everything you’ve saved, in one file.</h2>
    <p>{/* Session AU (ADR-044 T-11, the rehearsal's Tom and Lina): said "optional" beside a banner saying browser records are not a backup */}Your records live in this browser. This file is a readable copy you keep yourself, and it can be restored; an encrypted backup or account sync are the other ways to keep them.</p>
    {/* Session AL fifth pass (D-005): what the file holds folds, so the open Data & privacy group is short (nothing removed). */}
    <details className="backup-more"><summary>More about this file</summary><p>If you’d like a readable copy for yourself, this makes one ZIP with a JSON file of everything and a CSV per area (goals, contributions, habits, check-ins, Health diary, weights, water, activity, wealth).</p></details>
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
    {/* Session AV lane 2 (fr-layout, FR-L-7, FR-MAX-10): the path is a link to the restore itself (it was words only). */}
    <p className="fine">Made on this device. Nothing is uploaded. Settings → Your data → <Link className="text-link" href="/app/settings/data#restore">Restore from a backup</Link> reads it back.</p>
    {/* Session AV lane 2 (LEDGER #69; QUALITY "Not fixed"): the hide switch offered here too; the file itself is always complete. */}
    {/* Session AV lane 2 (nl-days, R3; q3-36): the file keeps the switch too, so a restore hides the figures again. */}
    {figuresHidden && <p className="fine" data-testid="export-figures-hidden">Calorie and weight figures are hidden on screen on this device. This file still holds them, so it stays a complete copy, and it keeps this choice: a restore hides them again.</p>}
  </section>;
}
