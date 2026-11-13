import {AK_DATABASES, AK_ERASE_KEYS} from './ak-device-keys';
import {getAppStorage} from './showcase-storage';
import {AA_PERSONAL_KEYS} from './aa-device-keys';
import {ZIGI_STORE_EVENT} from './ai/store/keys';
import {GOAL_EXTRAS_KEY} from './goal-extras/store';
import {AVERAGE_GOALS_KEY} from './average-goals/store';
import {CALCULATOR_KEY} from './compound/store';
import {SEARCH_RECENT_KEY} from './search/recent';
import {LIFE_REVIEW_KEY} from './life-review/store';
import {VISION_DATABASE} from './vision/store';
import {AB_DESIGN_DISPLAY_KEYS} from './ab-design-keys';
import {AB_CLOUD_PERSONAL_KEYS} from './ab-cloud-device-keys';
import {LINKED_WALLETS_KEY} from './linked-wallets-key';
import {EARN_ERASE_KEYS} from './af-earn-keys';
import {AF_CHECKLIST_PERSONAL_KEYS} from './af-checklist-keys';
import {STAKING_JOURNAL_KEY, STAKING_PREFS_KEY, VALIDATOR_ALERTS_KEY} from './af-signing-keys';
import {WALLET_ERASE_KEYS} from './af-wallet-keys';
import {AF_ZIGI_ERASE_KEYS} from './af-zigi-keys';
import {AF_EXTRAS_ERASE_KEYS} from './af-extras-keys';
import {AL_ERASE_KEYS} from './al-device-keys';
import {AO_ERASE_KEYS} from './ao-device-keys';
import {AH_ERASE_KEYS} from './ah-device-keys';
import {AI_ERASE_KEYS} from './ai-device-keys';
import {AJ_ERASE_KEYS} from './aj-device-keys';
import {forgetTabDrafts} from './tab-drafts';

/** AA-Cloud's personal device keys (ADR-021), erased with the account by the second merger (ADR-022 B52); Today's cards are a display choice and stay. */
const CLOUD_PERSONAL_KEYS: readonly string[] = [GOAL_EXTRAS_KEY, AVERAGE_GOALS_KEY, CALCULATOR_KEY, SEARCH_RECENT_KEY, LIFE_REVIEW_KEY];
/**
 * Session AA-Local (ADR-022 B1): what the account's erase removes of this session's device keys (every personal one;
 * the macro mode is a display preference and stays). Never throws: a storage that refuses keeps the key.
 */
export function forgetAaDeviceRecords(storage: Pick<Storage, 'removeItem'> | null = null): void {
  let target = storage;
  try { target ??= getAppStorage(); } catch { return; }
  // Session AB-Cloud (ADR-023 C8): AB-Design's display preferences and AB-Cloud's own records go with the account too.
  // Session AE (Part 6, ADR-027): and the wallets linked read-only (public addresses, personal).
  const keys = [...AA_PERSONAL_KEYS, ...CLOUD_PERSONAL_KEYS, ...AB_DESIGN_DISPLAY_KEYS, ...AB_CLOUD_PERSONAL_KEYS, LINKED_WALLETS_KEY, ...EARN_ERASE_KEYS, ...AF_CHECKLIST_PERSONAL_KEYS, STAKING_JOURNAL_KEY, STAKING_PREFS_KEY, VALIDATOR_ALERTS_KEY, ...WALLET_ERASE_KEYS, ...AK_ERASE_KEYS, ...AF_ZIGI_ERASE_KEYS, ...AF_EXTRAS_ERASE_KEYS, ...AH_ERASE_KEYS, ...AI_ERASE_KEYS, ...AJ_ERASE_KEYS, ...AL_ERASE_KEYS, ...AO_ERASE_KEYS];
  for (const key of keys) { try { target.removeItem(key); } catch { /* kept */ } }
  // Session AL (security delta review B, SB-2): and the recovery copies a restore keeps beside them (`<key>:recovery:<uuid>`,
  // Tasks, the Checklist and the device records since Session AL), so none of their old contents stays on the device.
  forgetRecoveryCopies(target, keys);
  // SB-6: and this tab's unsaved drafts (the welcome's first name and goal, a habit's title), which no account owns.
  forgetTabDrafts();
  try { for (const key of keys) window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: key})); } catch { /* no window */ }
  // Gate B F3: the progress-photo bytes live in IndexedDB beside the index key; the erase removes the database as a whole (every scope on this device).
  // Session AI (J14): the sealed exchange keys go with the account too (the whole database, its wrapping key included).
  // Session AJ (WE16, A6): and the coin catalog kept for offline search, with every other database the app keeps.
  try { if (typeof indexedDB !== 'undefined') for (const name of ERASED_DATABASES) indexedDB.deleteDatabase(name); } catch { /* no IndexedDB: nothing was stored there */ }
}
/** SB-2: removes every recovery copy of these keys (`<key>:recovery:<uuid>`, lib/vault/recovery-copies.ts), where the storage view can list its keys. Never throws. */
function forgetRecoveryCopies(target: Pick<Storage, 'removeItem'>, keys: readonly string[]): void {
  const listable = target as Partial<Storage>, erased = new Set(keys), copies: string[] = [];
  if (typeof listable.key !== 'function' || typeof listable.length !== 'number') return;
  try {
    for (let i = 0; i < listable.length; i++) {
      const k = listable.key(i), at = k ? k.lastIndexOf(':recovery:') : -1;
      if (k && at > 0 && erased.has(k.slice(0, at))) copies.push(k);
    }
  } catch { return; }
  for (const copy of copies) { try { target.removeItem(copy); } catch { /* kept; listed on the Data health page */ } }
}
/**
 * Session AK Part 15 (F1): the account's erase, in the right order. The device's notification record on the push Worker
 * can only be removed with the device's own id and secret, which live in `zigoals-notify-v1` — a database
 * forgetAaDeviceRecords deletes. So notifications are turned off first (a DELETE with that secret, best effort and
 * bounded in time, as lib/erase-everything.ts eraseDeviceServices does), and only then are the records forgotten.
 */
export async function forgetAaDeviceRecordsInOrder(deps: {turnOffNotifications: () => Promise<void>; timeoutMs?: number}, storage: Pick<Storage, 'removeItem'> | null = null): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([deps.turnOffNotifications(), new Promise<void>(resolve => { timer = setTimeout(resolve, deps.timeoutMs ?? 15_000); })]);
  } catch { /* the Worker deletes an unused device after 30 days */ } finally { if (timer !== undefined) clearTimeout(timer); }
  forgetAaDeviceRecords(storage);
}
/** Session AJ (A6): every IndexedDB database the account erase deletes (lib/erase-coverage.test.ts keeps it complete). */
export const ERASED_DATABASES: readonly string[] = ['zigoals-progress-photos', VISION_DATABASE, 'zigoals-exchange-keys-v1', 'zigoals-market-catalog-v1', 'zigoals-xpub-v1', ...AK_DATABASES];
