/**
 * Session AV lane 2, round 5 (gym; LEDGER #376, Gentler Streak's everyday activities): everyday movement offered beside
 * the twelve activity types (lib/health-activity-types.ts) when you name movement minutes, in English and Dutch. Like
 * those types it is a suggestion list only: the activity keeps the words you typed, and its minutes count as active
 * minutes (the Activity view, Today, and the Workouts movement band, #375). No energy figure is ever worked out for any
 * activity (Session AW, owner decision 1a); `activityTypeOf` finds none of these names (none starts with one of the twelve
 * types' words; lib/av2-r5-everyday.test.ts pins it). Constants only, so Health's first chunk stays small.
 */
export const EVERYDAY_MOVES: readonly {en: string; nl: string}[] = [
  {en: 'Gardening', nl: 'Tuinieren'},
  {en: 'Housework', nl: 'Huishouden'},
  {en: 'Walking the dog', nl: 'De hond uitlaten'},
  {en: 'Wheelchair push', nl: 'Rolstoel duwen'},
  {en: 'Carrying a child', nl: 'Een kind dragen'},
  {en: 'Commuting by bike', nl: 'Op de fiets naar het werk'},
  {en: 'Taking the stairs', nl: 'De trap nemen'},
  {en: 'Playing with the kids', nl: 'Spelen met de kinderen'},
];
/** The names the activity field offers: each English name, then its Dutch one. */
export const EVERYDAY_MOVE_NAMES: readonly string[] = EVERYDAY_MOVES.flatMap(m => [m.en, m.nl]);
