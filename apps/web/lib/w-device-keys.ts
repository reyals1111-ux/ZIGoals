/**
 * The names of Session W's device keys, in a module with no imports so the shell and the welcome check can name them
 * without shipping a schema (the pattern of lib/ai/store/keys.ts). Their schemas, stores and the reasons each is
 * device-only are in lib/w-device-records.ts and each feature's schema file.
 */
export const ACCOUNTS_KEY = 'zigoals:accounts:v1';
export const MILESTONE_DATES_KEY = 'zigoals:milestone-dates:v1';
export const IMPORT_BATCHES_KEY = 'zigoals:import-batches:v1';
export const W_REMINDERS_KEY = 'zigoals:w-reminders:v1';
export const CHESS_CACHE_KEY = 'zigoals:chess-cache:v1';
export const CELEBRATIONS_KEY = 'zigoals:celebrations:v1';
export const MEDITATION_RUN_KEY = 'zigoals:meditation-run:v1';
export const MUSIC_KEY = 'zigoals:music:v1';
export const PAGES_VIEW_KEY = 'zigoals:pages-view:v1';
/** The person's own records: a device with any of them is not new. */
export const W_PERSONAL_KEYS: readonly string[] = [ACCOUNTS_KEY, MILESTONE_DATES_KEY, IMPORT_BATCHES_KEY, W_REMINDERS_KEY, CHESS_CACHE_KEY, CELEBRATIONS_KEY, MEDITATION_RUN_KEY];
/** Display preferences with nothing personal in them. */
export const W_DISPLAY_KEYS: readonly string[] = [MUSIC_KEY, PAGES_VIEW_KEY];
