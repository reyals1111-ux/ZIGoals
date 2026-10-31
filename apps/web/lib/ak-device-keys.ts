/**
 * Session AK: this session's personal device keys, as literals in a module with no imports (the lib/aj-device-keys.ts
 * pattern), so the account erase can name them without shipping a schema; lib/ak-device-keys.test.ts proves each literal
 * equals its owner's constant. None is synced (ADR-036). Its IndexedDB databases are listed beside them.
 */
export const AK_PERSONAL_KEYS: readonly string[] = [
  'zigoals:notify:v1',
  'zigoals:music-mix:v1',
  'zigoals:auto-rules:v1',
  'zigoals:bills:v1',
  'zigoals:budgets:v1',
  'zigoals:target-allocation:v1',
  'zigoals:csv-mappings:v1',
];
/** The account erase removes them all. */
export const AK_ERASE_KEYS: readonly string[] = AK_PERSONAL_KEYS;
/** This session's device-only databases: the notification snapshot and identity, the queue of notification taps, and the
 * offline generic food library (public data, a cache), and the person's own Spotify client id (device-only, never exported). */
export const AK_DATABASES: readonly string[] = ['zigoals-notify-v1', 'zigoals-notify-actions-v1', 'zigoals-food-generic-v1', 'zigoals-music-byo-v1', 'zigoals-offline-queue-v1'];
