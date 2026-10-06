/**
 * The names of ZIGi's device keys added in Session V (storage foundation, ADR-014 S3/S18), in a module with no imports
 * so the launcher shell can name them without shipping a schema. Every key goes through `getAppStorage()`: per account,
 * the tab's session storage in Showcase, never synced, all in "Export everything". `zigoals:ai:v1` (T's record) is
 * untouched: build #29 keeps reading it byte for byte.
 */
export const AI_OPTIONS_KEY = 'zigoals:ai-options:v1';
export const AI_USAGE_KEY = 'zigoals:ai-usage:v1';
export const AI_MEMORY_KEY = 'zigoals:ai-memory:v1';
export const AI_ACTIONS_KEY = 'zigoals:ai-actions:v1';
export const ZIGI_KEY = 'zigoals:zigi:v1';
export const ZIGI_REMINDERS_KEY = 'zigoals:zigi-reminders:v1';
export const ZIGI_KNOCK_KEY = 'zigoals:zigi-knock:v1';
/** Dispatched on window after a save of one of these keys (detail: the key), so every reader refreshes. */
export const ZIGI_STORE_EVENT = 'zigoals:zigi-store';
/** The keys that hold the person's own records (notes, actions, usage, reminders, choices): a device with any is not new. */
export const ZIGI_PERSONAL_KEYS: readonly string[] = [AI_OPTIONS_KEY, AI_USAGE_KEY, AI_MEMORY_KEY, AI_ACTIONS_KEY, ZIGI_REMINDERS_KEY];
/** Display preferences and counters only. */
export const ZIGI_DISPLAY_KEYS: readonly string[] = [ZIGI_KEY, ZIGI_KNOCK_KEY];
