/**
 * Session AV lane 2, round 6 (notes and journal; TIER 3 stored formats: additive keys only): this round's one new device
 * key and its rows for the shared registries, as literals in a module with no imports (the lib/av-device-keys.ts
 * pattern). The lead spreads these into the registries; lib/av2-r6-notes-keys.test.ts proves the literal equals its
 * owner's constant.
 * - `zigoals:device-lock-away:v1` (lib/device-lock-away.ts, LEDGER #406): how long ZIGoals may be hidden before the
 *   screen cover asks for the PIN again (5, 15 or 60 minutes). A display key that follows the lock itself
 *   (`zigoals:device-lock:v1`, lib/ah-device-keys.ts AH_DISPLAY_KEYS): not a personal record, never synced and never in
 *   Export everything (a lock must not travel in an export, and its time away means nothing without it); "Erase
 *   everything" removes it with every zigoals key; the account erase leaves it, as it leaves the lock.
 * The tab's `zigoals:device-lock:away-since` (sessionStorage, beside `zigoals:device-lock:unlocked`) holds only when the
 * tab went hidden and is gone when the tab closes.
 */
export const LOCK_AWAY_KEY_LITERAL = 'zigoals:device-lock-away:v1';
/** Display keys (onboarding `NON_PERSONAL_KEYS`): a device holding only these is still new. */
export const AV2_R6_NOTES_DISPLAY_KEYS: readonly string[] = [LOCK_AWAY_KEY_LITERAL];
/** lib/erase-coverage.test.ts `NOT_RECORDS`: why it is in neither Export everything nor the catalog. */
export const AV2_R6_NOTES_NOT_RECORDS: Readonly<Record<string, string>> = {[LOCK_AWAY_KEY_LITERAL]: 'the device lock\'s time away before the screen cover asks again (5, 15 or 60 minutes); it follows the lock, which must not travel in an export (Settings → Screen cover)'};
