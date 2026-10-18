/**
 * Session AF (L1, ADR-028 H10, H27, H73; `TIER 3 (storage)`): the Earn hub's three device records, named in a module with
 * no imports (the pattern of lib/linked-wallets-key.ts) so the welcome check, Export everything, the data catalog and the
 * erase can name them without shipping a schema. Their formats and readers are lib/earn/records.ts. All three are device
 * only: never synced, in Export everything, removed by the account's erase. Older builds (#37–#44) never read them.
 *
 * This module is append-only for the Earn lane; the lead wires the rows below into the shared registries (the lane file
 * docs/handoff/af-lanes/L1.md lists each one).
 */
/** Start-here progress: which steps the person ticked or ZIGoals saw done, the Today card's dismissal, sections visited. Personal. */
export const EARN_PATH_KEY = 'zigoals:earn-path:v1';
/** Earn Academy: lessons read and quiz scores. Personal. */
export const EARN_ACADEMY_KEY = 'zigoals:earn-academy:v1';
/** Earn page and dock display choices on this device (shown, folded, order). Not personal: a display preference. */
export const EARN_PREFS_KEY = 'zigoals:earn-prefs:v1';
/** For lib/onboarding.ts DEVICE_RECORD_KEYS (personal progress) and NON_PERSONAL_KEYS (display choices). */
export const EARN_PERSONAL_KEYS: readonly string[] = Object.freeze([EARN_PATH_KEY, EARN_ACADEMY_KEY]);
export const EARN_DISPLAY_KEYS: readonly string[] = Object.freeze([EARN_PREFS_KEY]);
/** For lib/export/everything.ts DEVICE_KEYS. */
export const EARN_EXPORT_KEYS = Object.freeze({earnPath: EARN_PATH_KEY, earnAcademy: EARN_ACADEMY_KEY, earnPrefs: EARN_PREFS_KEY} as const);
/** For lib/data-health/catalog.ts DEVICE_LABELS, keyed like EARN_EXPORT_KEYS: [what it holds, area]. */
export const EARN_CATALOG_LABELS = Object.freeze({
  earnPath: ['Earn: Start-here progress', 'Earn'],
  earnAcademy: ['Earn Academy lessons and quiz results', 'Earn'],
  earnPrefs: ['Earn page and dock choices', 'Earn'],
} as const);
/** For lib/aa-device-forget.ts: every Earn key leaves with the account's erase. */
export const EARN_ERASE_KEYS: readonly string[] = Object.freeze([...EARN_PERSONAL_KEYS, ...EARN_DISPLAY_KEYS]);
