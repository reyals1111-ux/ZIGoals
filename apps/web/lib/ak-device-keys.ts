/**
 * Session AK: this session's personal device keys, as literals in a module with no imports (the lib/aj-device-keys.ts
 * pattern), so the account erase can name them without shipping a schema; lib/ak-device-keys.test.ts proves each literal
 * equals its owner's constant. None is synced (ADR-036). Its IndexedDB databases are listed beside them.
 */
export const AK_PERSONAL_KEYS: readonly string[] = [
  'zigoals:notify:v1',
];
/** The account erase removes them all. */
export const AK_ERASE_KEYS: readonly string[] = AK_PERSONAL_KEYS;
/** This session's device-only databases: the notification snapshot and identity, and the queue of notification taps. */
export const AK_DATABASES: readonly string[] = ['zigoals-notify-v1', 'zigoals-notify-actions-v1'];
