'use client';
import {useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {JOURNAL} from '../../lib/journal/schema';
import {applyJournalImport, planJournalImport, undoJournalImport, type ImportSkip, type InFile, type JournalImportPlan} from '../../lib/journal/import';
import {journalExportFiles, journalExportName, type MediaFile} from '../../lib/journal/export';
import {ZipError, inflateBudget, readZip, type ZipCaps} from '../../lib/notes/zip-read';
import {buildStoredZip} from '../../lib/export/zip';
import {getJournalMedia} from '../../lib/journal/media';
import {forgetJournalMedia, keepJournalAudio, keepJournalPhoto} from '../../lib/journal/keep-media';
import {photoScope} from '../../lib/health-aa/photos';
import {isShowcase} from '../../lib/showcase-storage';
import {localDate} from '../../lib/local-date';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {showStatus, showUndo} from '../ui/undo-toast';

/**
 * Session AV lane 2 (journal; LEDGER #44, Day One's imports and exports): "Import and export". Import reads a Day One
 * export (its ZIP with photos and audio, or its JSON), ZIGoals' own journal export, Markdown and text files, or an Apple
 * Journal (HTML) export; it shows what it found first (how many entries, from when to when, which journals, what is
 * left out and why), then adds them with one Undo. Export makes a ZIP of the whole journal with its photos and voice
 * notes, in Day One's shape. Everything is read and written on this device. Loaded when its fold opens.
 */
const CAPS: ZipCaps = {maxArchive: 80 * 1024 * 1024, maxEntries: 4000, maxFile: 10 * 1024 * 1024, maxTotal: 120 * 1024 * 1024, maxRatio: 100};
const TEXT_FILE = /\.(?:json|md|markdown|txt|html?)$/i, MEDIA_FILE = /^(?:.*\/)?(?:photos|audios)\/[^/]+$/i;
const decode = (data: Uint8Array) => new TextDecoder('utf-8', {fatal: false}).decode(data);
type Read = {files: InFile[]; media: Map<string, Uint8Array>; skipped: ImportSkip[]};
async function readPicked(list: readonly File[]): Promise<Read> {
  const out: Read = {files: [], media: new Map(), skipped: []}, budget = inflateBudget(CAPS);
  for (const f of list.slice(0, 200)) {
    if (/\.zip$/i.test(f.name) || f.type === 'application/zip') {
      const z = await readZip(new Uint8Array(await f.arrayBuffer()), name => TEXT_FILE.test(name) || MEDIA_FILE.test(name), {caps: CAPS, budget});
      // Session AV lane 2 (r3-notes; LEDGER #272): a ZIGoals export holds every entry twice (journal.json and Markdown/);
      // its journal.json is read and the Markdown copies left out, so nothing doubles.
      const hasJson = z.files.some(f => /(^|\/)journal\.json$/i.test(f.name));
      for (const file of z.files) {
        if (MEDIA_FILE.test(file.name)) out.media.set(file.name.replace(/^.*?((?:photos|audios)\/[^/]+)$/i, '$1'), file.data);
        else if (hasJson && /(^|\/)Markdown\/[^/]+\.md$/i.test(file.name)) continue;
        else if (!/(^|\/)readme\.txt$/i.test(file.name)) out.files.push({name: file.name, text: decode(file.data)});
      }
      out.skipped.push(...z.skipped);
    } else if (TEXT_FILE.test(f.name)) {
      if (f.size > (/\.json$/i.test(f.name) ? 20 : 1) * 1024 * 1024) { out.skipped.push({name: f.name, reason: /\.json$/i.test(f.name) ? 'it is over 20 MB' : 'it is over 1 MB'}); continue; }
      out.files.push({name: f.name, text: await f.text()});
    } else out.skipped.push({name: f.name, reason: 'it is not a Day One, Markdown, text, HTML or ZIP file'});
  }
  return out;
}
const audioMime = (name: string) => /\.m4a$|\.mp4$|\.aac$/i.test(name) ? 'audio/mp4' : /\.ogg$|\.opus$/i.test(name) ? 'audio/ogg' : 'audio/webm';
const imageMime = (name: string) => /\.png$/i.test(name) ? 'image/png' : /\.webp$/i.test(name) ? 'image/webp' : /\.heic$/i.test(name) ? 'image/heic' : /\.gif$/i.test(name) ? 'image/gif' : 'image/jpeg';

export default function JournalFiles() {
  const journal = useDeviceRecord(JOURNAL), input = useRef<HTMLInputElement>(null), importButton = useRef<HTMLButtonElement>(null);
  const [plan, setPlan] = useState<JournalImportPlan | null>(null), [media, setMedia] = useState<Map<string, Uint8Array>>(new Map());
  const [busy, setBusy] = useState(''), [said, setSaid] = useState(''), [problem, setProblem] = useState('');
  if (!journal.loaded) return <p className="fine">Loading…</p>;
  const pick = async (list: FileList | null) => {
    const files = [...(list ?? [])]; if (!files.length) return;
    setProblem(''); setSaid(''); setPlan(null); setBusy('Reading the files on this device…');
    try {
      const read = await readPicked(files);
      const next = planJournalImport(journal.data, read.files, {today: localDate(), zone: Intl.DateTimeFormat().resolvedOptions().timeZone, skipped: read.skipped});
      setMedia(read.media); setPlan(next);
      requestAnimationFrame(() => importButton.current?.focus());
    } catch (e) { setProblem(e instanceof ZipError || e instanceof Error ? e.message : 'These files could not be read.'); }
    finally { setBusy(''); }
  };
  const apply = async () => {
    if (!plan) return;
    const ids = new Map<string, string>(), kept: string[] = [];
    let photosLeft = 0;
    setBusy('Keeping the photos and audio on this device…');
    try {
      for (const e of plan.entries) {
        for (const f of e.photos) { const data = media.get(f); if (!data || ids.has(f)) { if (!data) photosLeft++; continue; } try { const id = await keepJournalPhoto(new Blob([data as Uint8Array<ArrayBuffer>], {type: imageMime(f)})); ids.set(f, id); kept.push(id); } catch { photosLeft++; } }
        for (const a of e.audio) { const data = media.get(a.file); if (!data || ids.has(a.file)) { if (!data) photosLeft++; continue; } try { const id = await keepJournalAudio(new Blob([data as Uint8Array<ArrayBuffer>], {type: audioMime(a.file)}), a.seconds); ids.set(a.file, id); kept.push(id); } catch { photosLeft++; } }
      }
      let undo: ReturnType<typeof applyJournalImport>['undo'] | null = null;
      try { journal.update(c => { const out = applyJournalImport(c, plan, ids); undo = out.undo; return out.journal; }); } catch (e) { await forgetJournalMedia(kept); throw e; }
      const made = undo as ReturnType<typeof applyJournalImport>['undo'] | null, n = plan.entries.length;
      setPlan(null); setMedia(new Map());
      setSaid(`${n === 1 ? '1 entry' : `${formatNumber(n)} entries`} added to your journal${photosLeft ? `; ${photosLeft} photo${photosLeft === 1 ? '' : 's'} or audio note${photosLeft === 1 ? '' : 's'} could not be kept` : ''}.`);
      if (made) showUndo({message: `${n === 1 ? '1 entry' : `${formatNumber(n)} entries`} imported.`, undone: 'The import is undone.', restore: () => journal.update(c => undoJournalImport(c, made))});
    } catch (e) { setProblem(e instanceof Error ? e.message : 'The import could not be saved on this device. Nothing was changed.'); }
    finally { setBusy(''); }
  };
  const exportAll = async () => {
    setProblem(''); setBusy('Making the file on this device…');
    try {
      const scope = photoScope(), found = new Map<string, MediaFile>();
      for (const e of journal.data.entries) for (const id of [...(e.photos ?? []), ...(e.morePhotos ?? []), ...(e.audio ?? []).map(a => a.id)]) { try { const m = await getJournalMedia(scope, id); if (m) found.set(id, {data: new Uint8Array(await m.blob.arrayBuffer()), type: m.type}); } catch { /* left out, said in README */ } }
      const zip = buildStoredZip(journalExportFiles(journal.data, found));
      const url = URL.createObjectURL(new Blob([zip as Uint8Array<ArrayBuffer>], {type: 'application/zip'})), a = document.createElement('a');
      a.href = url; a.download = journalExportName(localDate(), isShowcase()); document.body.append(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      showStatus(`Your journal is saved as ${a.download}: ${journal.data.entries.length === 1 ? '1 entry' : `${formatNumber(journal.data.entries.length)} entries`}${found.size ? `, ${found.size} photos and voice notes` : ''}.`);
    } catch (e) { setProblem(e instanceof Error ? e.message : 'The file could not be made on this device.'); }
    finally { setBusy(''); }
  };
  const dates = plan?.entries.map(e => e.date).sort() ?? [], photoCount = plan?.entries.reduce((n, e) => n + e.photos.length + e.audio.length, 0) ?? 0;
  return <div className="journal-files">
    <section aria-labelledby="journal-import-title" className="journal-files-part">
      <h3 id="journal-import-title">Import</h3>
      <p className="fine">A Day One export (its ZIP, with photos and audio, or its JSON), a ZIGoals journal export, Markdown or text files (one entry each, or one per dated heading such as <code>## 2026-11-03</code>), or an Apple Journal export (its HTML pages). You see what is found before anything is added.</p>
      <input ref={input} type="file" multiple accept=".zip,.json,.md,.markdown,.txt,.html,.htm,application/zip,application/json,text/markdown,text/plain,text/html" hidden tabIndex={-1} aria-hidden="true" onChange={e => { void pick(e.target.files); e.target.value = ''; }}/>
      <button type="button" className="secondary" disabled={!!busy} onClick={() => input.current?.click()}>Choose files to import</button>
      {plan && <div className="journal-import-plan" role="group" aria-label="What the files hold">
        {plan.entries.length ? <p><strong>{plan.entries.length === 1 ? '1 entry' : `${formatNumber(plan.entries.length)} entries`}</strong> {dates.length ? `from ${formatDate(dates[0]!)}${dates.at(-1) !== dates[0] ? ` to ${formatDate(dates.at(-1)!)}` : ''}` : ''}{photoCount ? `, with ${photoCount} photos and audio notes` : ''}.</p> : <p>No new entry in these files.</p>}
        {plan.books.length > 0 && <p className="fine">Journals: {plan.books.join(', ')} (made here when there is room).</p>}
        {plan.cut > 0 && <p className="fine">{plan.cut === 1 ? '1 entry is' : `${plan.cut} entries are`} longer than 5,000 characters and will be cut there.</p>}
        {plan.skipped.length > 0 && <details className="journal-import-skipped"><summary>Left out: {plan.skipped.length}</summary><ul>{plan.skipped.slice(0, 50).map((s, i) => <li key={i}>{s.name}: {s.reason}.</li>)}</ul>{plan.skipped.length > 50 && <p className="fine">And {plan.skipped.length - 50} more.</p>}</details>}
        <div className="journal-actions">
          <button ref={importButton} type="button" className="primary" disabled={!plan.entries.length || !!busy} onClick={() => void apply()}>{plan.entries.length ? `Import ${plan.entries.length === 1 ? '1 entry' : `${formatNumber(plan.entries.length)} entries`}` : 'Nothing to import'}</button>
          <button type="button" className="quiet" onClick={() => { setPlan(null); setMedia(new Map()); requestAnimationFrame(() => input.current?.nextElementSibling instanceof HTMLElement && input.current.nextElementSibling.focus()); }}>Cancel</button>
        </div>
      </div>}
    </section>
    <section aria-labelledby="journal-export-title" className="journal-files-part">
      <h3 id="journal-export-title">Export</h3>
      <p className="fine">Your whole journal as one ZIP: every entry in Day One&rsquo;s shape, with its photos and voice notes, and each entry as its own Markdown file (Markdown/, its day, journal and tags at the top) for Obsidian and other apps. ZIGoals&rsquo; Import reads it back; Day One can import the JSON. Made on this device; keep it private.</p>
      <button type="button" className="secondary" disabled={!!busy || !journal.data.entries.length} onClick={() => void exportAll()}>Export the journal</button>
    </section>
    {busy && <p className="fine" role="status">{busy}</p>}
    {problem && <p className="field-error" role="alert">{problem}</p>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </div>;
}
