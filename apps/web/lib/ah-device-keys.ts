/**
 * Session AH: this session's device keys, as literals in a module with no imports (the lib/af-extras-keys.ts pattern), so
 * the welcome check and the account erase can name them without shipping a schema. lib/ah-device-keys.test.ts proves each
 * literal equals its owner's constant. None is synced.
 * - `zigoals:workouts:v1` (personal, Part 6): workouts; exported, in the data catalog and the restore plan already.
 * - `zigoals:portfolio-last-visit:v1` (personal, WE22): each portfolio's known value when you last looked.
 * - `zigoals:hide-amounts` (display, WE19) and `zigoals:view-choice:*` (display, WE13): how pages are shown.
 */
export const AH_PERSONAL_KEYS: readonly string[] = ['zigoals:workouts:v1', 'zigoals:portfolio-last-visit:v1'];
export const AH_VIEW_CHOICES = ['markets-layout', 'price-chart-range', 'portfolio-value-range', 'wealth-history-range'] as const;
export const AH_DISPLAY_KEYS: readonly string[] = ['zigoals:hide-amounts', ...AH_VIEW_CHOICES.map(name => `zigoals:view-choice:${name}`)];
/** The account erase removes the personal ones; display choices stay, as other sessions' do. */
export const AH_ERASE_KEYS: readonly string[] = AH_PERSONAL_KEYS;
