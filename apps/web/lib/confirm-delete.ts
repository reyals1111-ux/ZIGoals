/**
 * Session Z-Cloud Gate B (Z-Local's handoff, Part 5: `plan.confirm`; ADR-019 "Handoff applied"): how a ZIGi card asks a
 * page to open its own delete confirmation for one record. The card deletes nothing: it opens the record's page with
 * `#confirm-delete=<what>:<id>`, the page reads that once and opens its confirmation, and the person confirms there.
 */
export const CONFIRM_DELETE_PARAM = 'confirm-delete';
const VALUE = /^([a-z-]{1,20}):([A-Za-z0-9_-]{1,80})$/;
/** The record a hash names, or null. @param hash `location.hash`, with or without its "#". */
export function readConfirmDelete(hash: string): {what: string; id: string} | null {
  const raw = hash.replace(/^#/, '');
  if (!raw.startsWith(CONFIRM_DELETE_PARAM + '=')) return null;
  let value: string;
  try { value = decodeURIComponent(raw.slice(CONFIRM_DELETE_PARAM.length + 1)); } catch { return null; }
  const match = VALUE.exec(value);
  return match ? {what: match[1]!, id: match[2]!} : null;
}
export const confirmDeleteHash = (what: string, id: string) => `#${CONFIRM_DELETE_PARAM}=${encodeURIComponent(`${what}:${id}`)}`;
/** Reads the hash once: when it names this record, it is removed (a reload does not open the confirmation again). */
export function takeConfirmDelete(what: string, id: string): boolean {
  if (typeof window === 'undefined') return false;
  const asked = readConfirmDelete(window.location.hash);
  if (!asked || asked.what !== what || asked.id !== id) return false;
  try { window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search); } catch { /* The hash stays; opening twice changes nothing. */ }
  return true;
}
