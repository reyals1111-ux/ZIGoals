import {JOURNAL_AUDIO_MAX_BYTES, audioType, deleteJournalMedia, newMediaId, putJournalMedia} from './media';

/**
 * Session AV lane 2 (journal; LEDGER #35 photos and #42 audio in an entry): keeping what an entry holds before the entry
 * is saved — a photo shrunk on this device to at most 200 kB (the notes' steps: lib/meal-estimates/photos.ts), an audio
 * note as the browser recorded it (at most 5 minutes and 3 MB) — in IndexedDB `zigoals-journal-media-v1`, in this tab's
 * scope (an account, the Showcase or the local person). Returns the ids the entry keeps; nothing is ever sent.
 */
async function scope(): Promise<string> { return (await import('../health-aa/photos')).photoScope(); }
export async function keepJournalPhoto(photo: Blob): Promise<string> {
  const [{compressImage}, {shrinkToLimit}] = await Promise.all([import('../health-aa/photos'), import('../meal-estimates/photos')]);
  const out = await shrinkToLimit(step => compressImage(photo, step.edge, step.quality));
  const id = newMediaId();
  await putJournalMedia(await scope(), id, {kind: 'photo', blob: out.blob, type: out.type, bytes: out.blob.size, at: new Date().toISOString()});
  return id;
}
export async function keepJournalAudio(audio: Blob, seconds: number): Promise<string> {
  const type = audioType(audio.type || 'audio/webm');
  if (!type) throw new Error('This browser recorded in a format the journal cannot keep.');
  if (audio.size > JOURNAL_AUDIO_MAX_BYTES) throw new Error('This recording is too large to keep (at most 3 MB). Record a shorter one.');
  if (!audio.size) throw new Error('Nothing was recorded. Try again.');
  const id = newMediaId();
  await putJournalMedia(await scope(), id, {kind: 'audio', blob: audio, type, bytes: audio.size, seconds: Math.max(0, Math.min(300, Math.round(seconds))), at: new Date().toISOString()});
  return id;
}
/** Takes back media kept for an entry that was then not saved. */
export async function forgetJournalMedia(ids: readonly string[]): Promise<void> {
  const s = await scope();
  for (const id of ids) await deleteJournalMedia(s, id).catch(() => undefined);
}
/** A recording's length as the player says it: "0:42", "3:05". */
export const clipLength = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
