/**
 * "Keep my data on this device" (Session L): the Storage API's persistence for this site. Requested only when the person
 * taps the button (owner decision L3); on view the page only reads the current state, which prompts nothing and writes
 * nothing. The browser decides; Safari and Chromium answer without a prompt (MDN, Storage quotas and eviction criteria).
 * A granted request keeps the browser from clearing this site's data when the device runs low on space (WHATWG Storage
 * Standard). It does not stop anyone from clearing site data themselves.
 */
export type KeepState = 'kept' | 'not-kept' | 'unsupported' | 'unknown';
export type KeepRequest = KeepState | 'error';
type StorageManagerLike = {persist?: () => Promise<boolean>; persisted?: () => Promise<boolean>} | null | undefined;

/** The current state, without asking for anything. */
export async function readKeep(storage: StorageManagerLike): Promise<KeepState> {
  if (typeof storage?.persisted !== 'function') return typeof storage?.persist === 'function' ? 'unknown' : 'unsupported';
  try { return (await storage.persisted()) ? 'kept' : 'not-kept'; } catch { return 'unknown'; }
}

/** Asks the browser to keep this site's data. Call only from the person's own tap. */
export async function requestKeep(storage: StorageManagerLike): Promise<KeepRequest> {
  if (typeof storage?.persist !== 'function') return 'unsupported';
  try { return (await storage.persist()) ? 'kept' : 'not-kept'; } catch { return 'error'; }
}

/** This browser's StorageManager, if any. */
export function browserStorage(): StorageManagerLike {
  try { return typeof navigator === 'undefined' ? null : navigator.storage ?? null; } catch { return null; }
}
