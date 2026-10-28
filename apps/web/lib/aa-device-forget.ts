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
import {AH_ERASE_KEYS} from './ah-device-keys';
import {AI_ERASE_KEYS} from './ai-device-keys';

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
  const keys = [...AA_PERSONAL_KEYS, ...CLOUD_PERSONAL_KEYS, ...AB_DESIGN_DISPLAY_KEYS, ...AB_CLOUD_PERSONAL_KEYS, LINKED_WALLETS_KEY, ...EARN_ERASE_KEYS, ...AF_CHECKLIST_PERSONAL_KEYS, STAKING_JOURNAL_KEY, STAKING_PREFS_KEY, VALIDATOR_ALERTS_KEY, ...WALLET_ERASE_KEYS, ...AF_ZIGI_ERASE_KEYS, ...AF_EXTRAS_ERASE_KEYS, ...AH_ERASE_KEYS, ...AI_ERASE_KEYS];
  for (const key of keys) { try { target.removeItem(key); } catch { /* kept */ } }
  try { for (const key of keys) window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: key})); } catch { /* no window */ }
  // Gate B F3: the progress-photo bytes live in IndexedDB beside the index key; the erase removes the database as a whole (every scope on this device).
  try { if (typeof indexedDB !== 'undefined') { indexedDB.deleteDatabase('zigoals-progress-photos'); indexedDB.deleteDatabase(VISION_DATABASE); } } catch { /* no IndexedDB: nothing was stored there */ }
}
