import type {ImportSummary} from '../../workouts/import-file';
import {FIT_ERRORS, FIT_MAX_BYTES} from './decode';
import {readFitFile} from './summary';

/**
 * Session AK (4.7): `.gz` files (Strava keeps its originals as `.fit.gz`, `.gpx.gz`, `.tcx.gz`) are unpacked by the
 * browser's own `DecompressionStream('gzip')`, never a library, and never past a size cap, so a small file that expands
 * enormously stops early.
 */
export const GZIP_ERRORS = {
  noStream: 'This browser cannot unpack .gz files. Try a current Chrome, Edge, Firefox or Safari, or unpack the file first.',
  damaged: 'This .gz file is damaged or incomplete. Download it again.',
  tooLarge: 'This file is larger than ZIGoals reads for one workout once unpacked.',
} as const;
export const isGzip = (bytes: Uint8Array) => bytes.length >= 2 && bytes[0] === 0x1F && bytes[1] === 0x8B;

export async function gunzip(bytes: Uint8Array, maxBytes = FIT_MAX_BYTES): Promise<Uint8Array> {
  if (!isGzip(bytes)) throw Error(GZIP_ERRORS.damaged);
  if (typeof DecompressionStream === 'undefined') throw Error(GZIP_ERRORS.noStream);
  const source = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream() as ReadableStream<Uint8Array>;
  const reader = source.pipeThrough(new DecompressionStream('gzip') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>).getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) { void reader.cancel().catch(() => undefined); throw Error(GZIP_ERRORS.tooLarge); }
      parts.push(value);
    }
  } catch (error) {
    if (error instanceof Error && Object.values(GZIP_ERRORS).includes(error.message as never)) throw error;
    throw Error(GZIP_ERRORS.damaged);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

/** The bytes of a chosen file, unpacked when it is gzip (by its first bytes, not its name), within the FIT cap. */
export async function fileBytes(file: Blob, maxBytes = FIT_MAX_BYTES): Promise<Uint8Array> {
  if (file.size > maxBytes) throw Error(FIT_ERRORS.tooLarge);
  const bytes = new Uint8Array(await file.arrayBuffer());
  return isGzip(bytes) ? gunzip(bytes, maxBytes) : bytes;
}
/** A chosen `.fit` or `.fit.gz` file as workout summaries. */
export async function readFitBlob(file: Blob): Promise<ImportSummary[]> {
  return readFitFile(await fileBytes(file));
}
