/**
 * Session AB-Design's device keys (ADR-024), named in a module with no imports (the pattern of lib/w-device-keys.ts and
 * lib/aa-device-keys.ts). STUB by Session AB-Cloud (ADR-023 C8, the brief's early contract): AB-Design owns this file;
 * until its version reaches `main` these names stand in, so Export everything, the account erase, the welcome's key
 * lists and the Your data catalog already carry them. The second merger keeps AB-Design's file. Never synced.
 */
export const UI_PREFS_KEY = 'zigoals:ui-prefs:v1';
/** Display preferences with nothing personal in them: exported, erased with the account, never synced. */
export const AB_DESIGN_DISPLAY_KEYS: readonly string[] = [UI_PREFS_KEY];
