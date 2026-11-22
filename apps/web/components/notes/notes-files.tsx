'use client';
import {useRef, useState} from 'react';
import {notePhotoIdsOf, type Note, type Notes} from '../../lib/notes/schema';
import type {LinkSources} from '../../lib/notes/links';
import {applyImport, notesExportEntries, notesExportName, planImport, type ImportPlan} from '../../lib/notes/markdown';
import {ZipError} from '../../lib/notes/zip-read';
import {readForeignFiles, readNoteFiles} from '../../lib/notes/read-files';
import {foreignFiles, isBearArchive, isEnex, namePhotos, type ForeignImage} from '../../lib/notes/import-enex';
import {keepCapturePhoto} from '../../lib/notes/capture';
import {deleteNotePhoto} from '../../lib/notes/photos';
import {isShowcase} from '../../lib/showcase-storage';
import {buildStoredZip} from '../../lib/export/zip';
import {notePhotosForExport} from '../../lib/notes/photos';
import {photoScope} from '../../lib/health-aa/photos';
import {localDate} from '../../lib/local-date';
import type {Change} from './note-editor';

/**
 * Session AK (B5): notes in and out as Markdown. Export: a ZIP of .md files with front-matter, [[links]] as written,
 * photos in attachments/, and stubs for linked goals and habits — opens as an Obsidian vault. Import: .md files or a ZIP
 * of them (Obsidian's, or this export), read on this device with caps; a plan shows what would change and what is skipped
 * and why, nothing is written until the person confirms, and Undo takes it back. Nothing in a file is ever run; photos
 * are not imported.
 */
export default function NotesFiles({record, targets, change}: {record: Notes; targets: Omit<LinkSources, 'notes'>; change: Change}) {
  const input = useRef<HTMLInputElement>(null);
  const [said, setSaid] = useState(''), [busy, setBusy] = useState(false), [plan, setPlan] = useState<ImportPlan | null>(null);
  // Session AV lane 2 (r4-notes; LEDGER #321): the photos of Evernote and Bear notes, by the file each became.
  const [images, setImages] = useState<Map<string, ForeignImage[]>>(new Map());
  // Security review Z1B-5: one reading budget for all chosen files, and Stop while they are read.
  const reading = useRef<AbortController | null>(null);
  const exportZip = async () => {
    setBusy(true); setSaid('');
    try {
      const ids = record.notes.flatMap(n => notePhotoIdsOf(n)); // Session AV lane 2 (r4-notes; LEDGER #307): every photo
      const photos = ids.length ? await notePhotosForExport(photoScope(), ids) : new Map();
      const zip = buildStoredZip(notesExportEntries(record, targets, {photos}));
      const url = URL.createObjectURL(new Blob([zip as BlobPart], {type: 'application/zip'})), link = document.createElement('a');
      link.href = url; link.download = notesExportName(localDate(), isShowcase()); document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      const locked = record.notes.filter(n => n.locked).length, kept = record.notes.length - locked; // Session AV lane 2 (r4-notes; LEDGER #318)
      setSaid(`${kept} ${kept === 1 ? 'note' : 'notes'} saved as Markdown in a ZIP, made on this device.${locked ? ` ${locked === 1 ? '1 locked note was' : `${locked} locked notes were`} left out (open one and use Save this note as… to take it out).` : ''}`);
    } catch (e) { setSaid(e instanceof Error ? e.message : 'The export could not be made.'); } finally { setBusy(false); }
  };
  const choose = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true); setSaid('Reading the files on this device…'); setPlan(null);
    try {
      const control = new AbortController(); reading.current = control;
      const picked = [...list], foreign = picked.filter(f => isEnex(f.name) || isBearArchive(f.name)), rest = picked.filter(f => !foreign.includes(f));
      const {files, skipped} = rest.length ? await readNoteFiles(rest, {signal: control.signal}) : {files: [], skipped: []};
      // Session AV lane 2 (r4-notes; LEDGER #321): Evernote and Bear exports become Markdown files for the same plan.
      const other = foreign.length ? await readForeignFiles(foreign, {signal: control.signal}) : {notes: [], skipped: []}, made = foreignFiles(other.notes);
      // Security review Z1B-6: Showcase example notes stay out of a person's own notes.
      const p = planImport(record, [...files, ...made.files], new Date().toISOString(), localDate(), {showcase: isShowcase()});
      setImages(made.images); setPlan({...p, skipped: [...skipped, ...other.skipped, ...p.skipped]}); setSaid('');
    } catch (e) { setSaid(e instanceof ZipError ? e.message : 'These files could not be read. Nothing was changed.'); } finally { reading.current = null; setBusy(false); }
  };
  const confirm = async () => {
    if (!plan) return;
    const n = plan.add.length, m = plan.append.length, kept: string[] = [];
    let left = 0;
    setBusy(true);
    // Session AV lane 2 (r4-notes; LEDGER #321): an imported note's photos are kept on this device first (shrunk as a
    // captured photo is), then named in its words; a photo this browser cannot read is left out and counted.
    const add: Note[] = [];
    for (const [i, note] of plan.add.entries()) {
      const imgs = images.get(plan.from?.[i] ?? '') ?? [];
      if (!imgs.length) { add.push(note); continue; }
      const ids = new Map<string, string>();
      for (const img of imgs) { try { const id = await keepCapturePhoto(new Blob([img.data as Uint8Array<ArrayBuffer>], {type: img.type})); ids.set(img.key, id); kept.push(id); } catch { left++; } }
      const named = namePhotos(note.body, ids);
      add.push({...note, body: named.body, ...(named.photoId ? {photoId: named.photoId} : {}), ...(named.photos.length ? {photos: named.photos} : {})});
    }
    setBusy(false);
    const ok = change(r => applyImport(r, {...plan, add}, new Date().toISOString()), `Imported ${n} ${n === 1 ? 'note' : 'notes'}${kept.length ? ` with ${kept.length} ${kept.length === 1 ? 'photo' : 'photos'}` : ''}${m ? `, and added words to ${m} daily ${m === 1 ? 'note' : 'notes'}` : ''}${left ? `; ${left === 1 ? '1 photo' : `${left} photos`} could not be read here and ${left === 1 ? 'was' : 'were'} left out` : ''}.`);
    if (ok) { setPlan(null); setImages(new Map()); } else for (const id of kept) await deleteNotePhoto(photoScope(), id).catch(() => undefined);
  };
  return <div className="note-files">
    <section aria-labelledby="notes-export-title">
      <h3 id="notes-export-title">Export as Markdown</h3>
      <p className="fine">A ZIP of .md files with front-matter: Daily/, Notes/ and Inbox/, links kept as [[…]], photos in attachments/. Open it as a vault in Obsidian or any Markdown app. Made on this device; nothing is uploaded.</p>
      <button type="button" className="secondary" disabled={busy || !record.notes.length} onClick={() => void exportZip()}>Export notes (.zip)</button>
      {!record.notes.length && <p className="fine">Nothing to export yet.</p>}
    </section>
    <section aria-labelledby="notes-import-title">
      <h3 id="notes-import-title">Import Markdown, Evernote or Bear</h3>
      <p className="fine">Choose .md files or a ZIP of them (an Obsidian vault or this export), Evernote&rsquo;s export (.enex), or Bear&rsquo;s (a .bear2bk backup, .textbundle or .textpack). Up to 1000 notes, 512 kB each, 25 MB for a ZIP (80 MB for Bear). Evernote and Bear notes bring their titles, days, tags and up to eight photos each; Markdown photos are not imported. Front-matter and Evernote&rsquo;s XML are read as plain text; nothing in a file is ever run. You see what would change before anything is saved.</p>
      <input ref={input} type="file" accept=".md,.markdown,.txt,.zip,.enex,.bear2bk,.textbundle,.textpack,text/markdown,text/plain,application/zip" multiple hidden tabIndex={-1} aria-hidden="true" onChange={e => { void choose(e.target.files); e.target.value = ''; }}/>
      <button type="button" className="secondary" disabled={busy} onClick={() => input.current?.click()}>Choose files to import</button>
      {busy && reading.current && <button type="button" className="quiet" onClick={() => reading.current?.abort()}>Stop</button>}
      {plan && <div className="note-import-plan" role="group" aria-label="What the import would do">
        <p><strong>{plan.add.length}</strong> new {plan.add.length === 1 ? 'note' : 'notes'}{plan.append.length ? <>, words added to <strong>{plan.append.length}</strong> daily {plan.append.length === 1 ? 'note' : 'notes'}</> : null}{plan.skipped.length ? <>, <strong>{plan.skipped.length}</strong> skipped</> : null}.</p>
        {plan.skipped.length > 0 && <details><summary>Skipped and why</summary><ul>{plan.skipped.slice(0, 100).map((s, i) => <li key={`${s.name}-${i}`}><code>{s.name}</code>: {s.reason}</li>)}</ul>{plan.skipped.length > 100 && <p className="fine">And {plan.skipped.length - 100} more.</p>}</details>}
        <div className="note-actions">
          <button type="button" className="primary" disabled={busy || (!plan.add.length && !plan.append.length)} onClick={() => void confirm()}>Import</button>
          <button type="button" className="quiet" onClick={() => setPlan(null)}>Cancel</button>
        </div>
      </div>}
    </section>
    {said && <p className="fine" role="status">{said}</p>}
  </div>;
}
