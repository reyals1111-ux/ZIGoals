/**
 * Session AJ: this session's personal device keys, as literals in a module with no imports (the lib/ai-device-keys.ts
 * pattern), so the welcome check and the account erase can name them without shipping a schema; lib/aj-device-keys.test.ts
 * proves each literal equals its owner's constant. None is synced unless its own entry says so (ADR-035).
 */
export const AJ_PERSONAL_KEYS: readonly string[] = [
  'zigoals:reading-sources:v1',
];
/** The account erase removes them all. */
export const AJ_ERASE_KEYS: readonly string[] = AJ_PERSONAL_KEYS;
