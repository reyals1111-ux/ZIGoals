/**
 * Session AV (ADR-045): this session's device keys and their rows for the shared registries, as literals in a module with
 * no imports (the lib/ap-device-keys.ts pattern), so the welcome check, Export everything, the data catalog and the account
 * erase can name them without shipping a schema; lib/av-device-keys.test.ts proves each literal equals its owner's
 * constant and that every registry carries it. Every record is device only, versioned, exported, restored, erased with the
 * account and never synced (TIER 3 stored format: additive keys only; older builds ignore them).
 * - `zigoals:countdown-extras:v1` (owner follow-up 1, F-COUNTDOWN-YEARLY; TickTick): which countdowns come back every year
 *   and how many days before to remind, keyed by the countdown's id — its own record, never a field of the strict
 *   `zigoals:countdowns:v1` (lib/countdowns/extras.ts). Restored with "Today and Life".
 */
export const COUNTDOWN_EXTRAS_KEY_LITERAL = 'zigoals:countdown-extras:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AV_PERSONAL_KEYS: readonly string[] = [COUNTDOWN_EXTRAS_KEY_LITERAL];
/** Display/setting records (onboarding `NON_PERSONAL_KEYS`): none so far (the display keys live in lib/ah-device-keys.ts). */
export const AV_DISPLAY_KEYS: readonly string[] = [];
/** Export everything (`DEVICE_KEYS`): the names in everything.json. */
export const AV_EXPORT_KEYS = {countdownExtras: COUNTDOWN_EXTRAS_KEY_LITERAL} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AV_CATALOG_LABELS = {
  countdownExtras: ['Days until: which come back every year, and how many days before to remind you', 'Today'],
} as const;
/** The account erase (`lib/aa-device-forget.ts`): every key above. */
export const AV_ERASE_KEYS: readonly string[] = [...AV_PERSONAL_KEYS, ...AV_DISPLAY_KEYS];
