import {getJournalMedia} from './media';
import {AUDIO_EXT, PHOTO_EXT} from './export';

/**
 * Session AV lane 2 (review b1 #3): the journal's photos and voice notes as files in Export everything, as the notes',
 * receipts' and tasks' are — `journal/photos/<id>.<ext>` and `journal/audios/<id>.<ext>`, named by the media id the
 * entry keeps (everything.json's journal names them), only those an entry names, from this tab's scope. Device-only;
 * read only for the export itself. A file that does not read is left out (counted in `missing`).
 */
export const JOURNAL_EXPORT_DIR = 'journal';
export const JOURNAL_MEDIA_FILE = /^journal\/(?:photos|audios)\/[A-Za-z0-9_-]{1,80}\.(?:webp|jpeg|webm|m4a|ogg)$/;
export function journalMediaFileName(id: string, kind: 'photo' | 'audio', type: string): string | null {
  const ext = kind === 'photo' ? PHOTO_EXT[type] : AUDIO_EXT[type], safe = id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
  return ext && safe ? `${JOURNAL_EXPORT_DIR}/${kind === 'photo' ? 'photos' : 'audios'}/${safe}.${ext}` : null;
}
export async function exportJournalMediaEntries(scope: string, named: readonly string[], now = new Date()): Promise<{files: {name: string; data: Uint8Array; modified: Date}[]; missing: number}> {
  const files: {name: string; data: Uint8Array; modified: Date}[] = [];
  let missing = 0;
  for (const id of [...new Set(named)]) {
    try {
      const m = await getJournalMedia(scope, id), name = m ? journalMediaFileName(id, m.kind, m.type) : null;
      if (!m || !name) { missing++; continue; }
      files.push({name, data: new Uint8Array(await m.blob.arrayBuffer()), modified: now});
    } catch { missing++; }
  }
  return {files, missing};
}
