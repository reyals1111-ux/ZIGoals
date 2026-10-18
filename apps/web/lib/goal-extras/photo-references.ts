/**
 * Session AF Part 11 A10 (ADR-028 H10 — the A10 security note, ADR-025 Notes): the photo tidy-up keys on the goal-extras
 * record, so a build that read only one version would see no photo references after a format change or a rollback and
 * could delete photos the other version still points at. This reader takes the photo references from the bytes of
 * BOTH the current record and the reserved next version, without either schema, and fails closed: when a record exists
 * but cannot be read, `unreadable` is true and the caller deletes nothing. It is the only file that may name the
 * reserved v2 key (guarded by version-guard.test.ts); a future v2 must be read here before any build writes it.
 */
export const GOAL_EXTRAS_KEYS_FOR_PHOTOS = Object.freeze(['zigoals:goal-extras:v1', 'zigoals:goal-extras:v2'] as const);

type Reader = Pick<Storage, 'getItem'>;

function photoIdsIn(value: unknown, into: Set<string>): void {
  // Goals and dormant goals hold `{vision: {kind: 'photo', imageId}}`; walk any object shape a version may use.
  if (Array.isArray(value)) { for (const item of value) photoIdsIn(item, into); return; }
  if (value === null || typeof value !== 'object') return;
  const record = value as Record<string, unknown>;
  const vision = record.vision as Record<string, unknown> | undefined;
  if (vision && vision.kind === 'photo' && typeof vision.imageId === 'string' && vision.imageId) into.add(vision.imageId);
  for (const [key, child] of Object.entries(record)) if (key !== 'vision') photoIdsIn(child, into);
}

/** Every photo id the goal-extras records of this device reference, in any version; unreadable means "delete nothing". */
export function referencedPhotoIds(storage: Reader): {ids: Set<string>; unreadable: boolean} {
  const ids = new Set<string>();
  let unreadable = false;
  for (const key of GOAL_EXTRAS_KEYS_FOR_PHOTOS) {
    let raw: string | null;
    try { raw = storage.getItem(key); } catch { unreadable = true; continue; }
    if (raw === null) continue;
    try { photoIdsIn(JSON.parse(raw), ids); } catch { unreadable = true; }
  }
  return {ids, unreadable};
}
