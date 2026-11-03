import {updateDeviceRecord} from '../device-record';
import {localDate} from '../local-date';
import {ZIGI_STORE_EVENT} from '../ai/store/keys';
import {getAppStorage} from '../showcase-storage';
import {NOTES, type Note, type NoteSource} from './schema';
import {captureInto, newNoteId} from './store';

/**
 * Session AK (B1): one capture into the notes inbox from anywhere — the command palette, Quick add, NOVA's dock and
 * widgets (lane NA) and NOVA's tools (lane NE, after the person confirms the card). Words, a photo, or both. The photo
 * is shrunk on this device and kept in IndexedDB only (lib/notes/photos.ts); the note keeps its id. Writes to this tab's
 * app storage (the account's, or the Showcase's in a Showcase tab) and tells every open reader. Never sends anything.
 */
export type CaptureRequest = {text?: string; photo?: Blob; source?: NoteSource; title?: string};
export type CaptureResult = {ok: true; note: Note} | {ok: false; error: string};
export const CAPTURE_URL = '/app/notes?capture=1';

/** Shrinks and keeps a photo for a note; returns its id. */
export async function keepCapturePhoto(photo: Blob): Promise<string> {
  const [{compressImage, photoScope}, {shrinkToLimit}, {putNotePhoto}] = await Promise.all([import('../health-aa/photos'), import('../meal-estimates/photos'), import('./photos')]);
  const out = await shrinkToLimit(step => compressImage(photo, step.edge, step.quality));
  const id = newNoteId();
  await putNotePhoto(photoScope(), id, {blob: out.blob, type: out.type, bytes: out.blob.size, at: new Date().toISOString()});
  return id;
}

async function forgetPhoto(id: string) { try { const [{photoScope}, {deleteNotePhoto}] = await Promise.all([import('../health-aa/photos'), import('./photos')]); await deleteNotePhoto(photoScope(), id); } catch { /* nothing kept to forget */ } }
/** Captures into the inbox. Never throws: a refusal comes back as a plain sentence. */
export async function capture({text = '', photo, source, title}: CaptureRequest): Promise<CaptureResult> {
  try {
    if (!text.trim() && !photo) return {ok: false, error: 'Write or say a few words, or add a photo, first.'};
    const photoId = photo ? await keepCapturePhoto(photo) : undefined;
    let note: Note | null = null;
    try { updateDeviceRecord(getAppStorage(), NOTES, current => { const r = captureInto(current, {text, source, photoId, title, day: localDate(), now: new Date().toISOString()}); note = r.note; return r.record; }); }
    catch (e) { if (photoId) await forgetPhoto(photoId); throw e; }
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: NOTES.key}));
    return note ? {ok: true, note} : {ok: false, error: 'The note was not kept.'};
  } catch (e) { return {ok: false, error: e instanceof Error ? e.message : 'The note was not kept on this device.'}; }
}
