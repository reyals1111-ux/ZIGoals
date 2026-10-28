/**
 * Session AI: this session's personal device keys, as literals in a module with no imports (the lib/ah-device-keys.ts
 * pattern), so the welcome check and the account erase can name them without shipping a schema; lib/ai-device-keys.test.ts
 * proves each literal equals its owner's constant. None is synced (ADR-034 N18).
 */
export const AI_PERSONAL_KEYS: readonly string[] = [
  'zigoals:money-log:v1', 'zigoals:journal:v1', 'zigoals:energy:v1', 'zigoals:meal-estimates:v1', 'zigoals:tasks:v1',
  'zigoals:portfolio-receipts:v1', 'zigoals:portfolio-imports:v1', 'zigoals:exchanges:v1', 'zigoals:zigi-metrics:v1',
];
/** The account erase removes them all. */
export const AI_ERASE_KEYS: readonly string[] = AI_PERSONAL_KEYS;
