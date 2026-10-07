/**
 * Deterministic ids for imported records (Session W Part 7; SYNC_HOMES "Merge rules"): the same record from the same
 * export gets the same id on every device, so two devices that import one file hold one record after sync, and a second
 * import of the file finds its duplicates instead of doubling them. FNV-1a, 64 bits, as 16 hex digits: stable, fast and
 * without crypto.subtle's promise (a few hundred thousand ids per import). Not a security hash and never used as one.
 */
const PRIME = 0x100000001b3n, OFFSET = 0xcbf29ce484222325n, MASK = 0xffffffffffffffffn;
export function stableHash(text: string): string {
  let h = OFFSET;
  const bytes = new TextEncoder().encode(text);
  for (const b of bytes) h = ((h ^ BigInt(b)) * PRIME) & MASK;
  return h.toString(16).padStart(16, '0');
}
/** A night or nap: its source and its two instants. */
export const sleepImportId = (source: string, start: string, end: string) => `health_sleep-${source}-${stableHash(`${start}|${end}`)}`;
/** A meditation session: its source, start and length. */
export const meditationImportId = (source: string, startedAt: string, seconds: number) => `health_med-${source}-${stableHash(`${startedAt}|${seconds}`)}`;
/** A day's activity line from a source ("steps", or a workout's own start). */
export const activityImportId = (source: string, key: string) => `health_imp-${source}-${stableHash(key)}`;
/** A weight on a day from a source. */
export const weightImportId = (source: string, date: string) => `health_imw-${source}-${stableHash(date)}`;
