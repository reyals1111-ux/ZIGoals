import {getAppStorage} from './showcase-storage';
import {Z_PERSONAL_KEYS} from './z-device-keys';
import {ZIGI_STORE_EVENT} from './ai/store/keys';

/**
 * Session Z-Cloud (ADR-019): what "Turn off ZIGi", Disconnect and the account's erase remove of Z-Cloud's keys: the person's
 * own suggestions (`zigoals:zigi-suggestions:v1`). The voice choices are a display preference and stay, like ZIGi's look.
 * Never throws: a storage that refuses keeps the key, and the caller's own message still stands.
 */
export function forgetZigiFace(storage: Pick<Storage, 'removeItem'> | null = null): void {
  let target = storage;
  try { target ??= getAppStorage(); } catch { return; }
  for (const key of Z_PERSONAL_KEYS) { try { target.removeItem(key); } catch { /* kept; nothing else depends on it */ } }
  try { for (const key of Z_PERSONAL_KEYS) window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: key})); } catch { /* no window */ }
}
