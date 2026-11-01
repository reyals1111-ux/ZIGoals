import {IMPORT_MAX_FILES, IMPORT_MAX_FILE_BYTES, isNoteFile, type ImportFile} from './markdown';
import {NOTE_ZIP_CAPS, STOPPED_MESSAGE, ZipError, inflateBudget, readZip, type InflateBudget, type ZipSkip} from './zip-read';

/**
 * Session AK security review Z1B-5: the files one Markdown import reads (the notes' "Choose files to import"), with ONE
 * unpacking budget for all of them: every byte inflated out of any chosen ZIP, and every .md or .txt file read, counts
 * against the same 30 MB, whether or not it is kept. A `signal` stops the reading between files, entries and chunks
 * (ZipError "Stopped. Nothing was changed."). Nothing is written here; the caller plans the import from the result.
 */
export type PickedFile = {name: string; size: number; type: string; arrayBuffer(): Promise<ArrayBuffer>};

export async function readNoteFiles(list: readonly PickedFile[], {signal, budget = inflateBudget(NOTE_ZIP_CAPS)}: {signal?: AbortSignal; budget?: InflateBudget} = {}): Promise<{files: ImportFile[]; skipped: ZipSkip[]}> {
  const files: ImportFile[] = [], skipped: ZipSkip[] = [];
  for (const f of list.slice(0, IMPORT_MAX_FILES)) {
    if (signal?.aborted) throw new ZipError(STOPPED_MESSAGE);
    if (/\.zip$/i.test(f.name) || f.type === 'application/zip') {
      if (f.size > NOTE_ZIP_CAPS.maxArchive) { skipped.push({name: f.name, reason: 'it is over 25 MB'}); continue; }
      if (budget.left <= 0) { skipped.push({name: f.name, reason: 'the files hold more than ZIGoals reads at once'}); continue; }
      const out = await readZip(new Uint8Array(await f.arrayBuffer()), isNoteFile, {budget, signal});
      files.push(...out.files); skipped.push(...out.skipped);
    } else if (isNoteFile(f.name)) {
      if (f.size > IMPORT_MAX_FILE_BYTES) { skipped.push({name: f.name, reason: 'it is over 512 kB'}); continue; }
      if (f.size > budget.left) { skipped.push({name: f.name, reason: 'the files hold more than ZIGoals reads at once'}); continue; }
      const data = new Uint8Array(await f.arrayBuffer());
      budget.left -= data.length;
      files.push({name: f.name, data});
    } else skipped.push({name: f.name, reason: 'it is not a Markdown, text or ZIP file'});
  }
  return {files, skipped};
}
