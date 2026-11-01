'use client';
import {useRef, useState} from 'react';
import type {Notes} from '../../lib/notes/schema';
import type {LinkSources} from '../../lib/notes/links';
import {applyImport, isNoteFile, notesExportEntries, planImport, type ImportFile, type ImportPlan} from '../../lib/notes/markdown';
import {readZip, ZipError} from '../../lib/notes/zip-read';
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
  const exportZip = async () => {
    setBusy(true); setSaid('');
    try {
      const ids = record.notes.flatMap(n => n.photoId ? [n.photoId] : []);
      const photos = ids.length ? await notePhotosForExport(photoScope(), ids) : new Map();
      const zip = buildStoredZip(notesExportEntries(record, targets, {photos}));
      const url = URL.createObjectURL(new Blob([zip as BlobPart], {type: 'application/zip'})), link = document.createElement('a');
      link.href = url; link.download = `zigoals-notes-${localDate()}.zip`; document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      setSaid(`${record.notes.length} ${record.notes.length === 1 ? 'note' : 'notes'} saved as Markdown in a ZIP, made on this device.`);
    } catch (e) { setSaid(e instanceof Error ? e.message : 'The export could not be made.'); } finally { setBusy(false); }
  };
  const choose = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true); setSaid('Reading the files on this device…'); setPlan(null);
    try {
      const files: ImportFile[] = [], skipped: {name: string; reason: string}[] = [];
      for (const f of [...list].slice(0, 1000)) {
        if (/\.zip$/i.test(f.name) || f.type === 'application/zip') {
          if (f.size > 25 * 1024 * 1024) { skipped.push({name: f.name, reason: 'it is over 25 MB'}); continue; }
          const out = await readZip(new Uint8Array(await f.arrayBuffer()), isNoteFile);
          files.push(...out.files); skipped.push(...out.skipped);
        } else if (isNoteFile(f.name)) {
          if (f.size > 512 * 1024) { skipped.push({name: f.name, reason: 'it is over 512 kB'}); continue; }
          files.push({name: f.name, data: new Uint8Array(await f.arrayBuffer())});
        } else skipped.push({name: f.name, reason: 'it is not a Markdown, text or ZIP file'});
      }
      const p = planImport(record, files, new Date().toISOString(), localDate());
      setPlan({...p, skipped: [...skipped, ...p.skipped]}); setSaid('');
    } catch (e) { setSaid(e instanceof ZipError ? e.message : 'These files could not be read. Nothing was changed.'); } finally { setBusy(false); }
  };
  const confirm = () => {
    if (!plan) return;
    const n = plan.add.length, m = plan.append.length;
    if (change(r => applyImport(r, plan, new Date().toISOString()), `Imported ${n} ${n === 1 ? 'note' : 'notes'}${m ? `, and added words to ${m} daily ${m === 1 ? 'note' : 'notes'}` : ''}.`)) setPlan(null);
  };
  return <div className="note-files">
    <section aria-labelledby="notes-export-title">
      <h3 id="notes-export-title">Export as Markdown</h3>
      <p className="fine">A ZIP of .md files with front-matter: Daily/, Notes/ and Inbox/, links kept as [[…]], photos in attachments/. Open it as a vault in Obsidian or any Markdown app. Made on this device; nothing is uploaded.</p>
      <button type="button" className="secondary" disabled={busy || !record.notes.length} onClick={() => void exportZip()}>Export notes (.zip)</button>
      {!record.notes.length && <p className="fine">Nothing to export yet.</p>}
    </section>
    <section aria-labelledby="notes-import-title">
      <h3 id="notes-import-title">Import Markdown</h3>
      <p className="fine">Choose .md files or a ZIP of them (an Obsidian vault or this export). Up to 1000 files, 512 kB each, 25 MB for a ZIP. Front-matter is read as plain text; nothing in a file is ever run. Photos are not imported. You see what would change before anything is saved.</p>
      <input ref={input} type="file" accept=".md,.markdown,.txt,.zip,text/markdown,text/plain,application/zip" multiple hidden tabIndex={-1} aria-hidden="true" onChange={e => { void choose(e.target.files); e.target.value = ''; }}/>
      <button type="button" className="secondary" disabled={busy} onClick={() => input.current?.click()}>Choose files to import</button>
      {plan && <div className="note-import-plan" role="group" aria-label="What the import would do">
        <p><strong>{plan.add.length}</strong> new {plan.add.length === 1 ? 'note' : 'notes'}{plan.append.length ? <>, words added to <strong>{plan.append.length}</strong> daily {plan.append.length === 1 ? 'note' : 'notes'}</> : null}{plan.skipped.length ? <>, <strong>{plan.skipped.length}</strong> skipped</> : null}.</p>
        {plan.skipped.length > 0 && <details><summary>Skipped and why</summary><ul>{plan.skipped.slice(0, 100).map((s, i) => <li key={`${s.name}-${i}`}><code>{s.name}</code>: {s.reason}</li>)}</ul>{plan.skipped.length > 100 && <p className="fine">And {plan.skipped.length - 100} more.</p>}</details>}
        <div className="note-actions">
          <button type="button" className="primary" disabled={!plan.add.length && !plan.append.length} onClick={confirm}>Import</button>
          <button type="button" className="quiet" onClick={() => setPlan(null)}>Cancel</button>
        </div>
      </div>}
    </section>
    {said && <p className="fine" role="status">{said}</p>}
  </div>;
}
