/**
 * The names of Session AB-Design's device keys (ADR-024 D4), in a module with no imports so the shell, the welcome check
 * and Export everything can name them without shipping a schema (the pattern of lib/aa-device-keys.ts). One record only:
 * the display preferences of the UI upgrade (the collapsed Today hero, the folded music button, the theme mode, the base
 * currency shown on Wealth, the dismissed first-visit notice). Device-only, versioned and loose: no field of this
 * session enters a strict synced record, so builds #32–#39 read or ignore it. Nothing in it is personal.
 */
export const UI_PREFS_KEY = 'zigoals:ui-prefs:v1';
/** Display preferences with nothing personal in them: a device holding only this key is still new; exported, erased with
 * the account, never synced (wired by AB-Cloud, ADR-023 C8). */
export const AB_DISPLAY_KEYS: readonly string[] = [UI_PREFS_KEY];
/** The same list under the name AB-Cloud's wiring imports (AB_CLOUD_TO_DESIGN.md, early contract 2). */
export const AB_DESIGN_DISPLAY_KEYS: readonly string[] = AB_DISPLAY_KEYS;
