/**
 * Session AF (L5b, ADR-028 H29, H73, H76–H79): the three extras' device keys — My Universe, the Day Timeline and Stories —
 * and their rows for the shared registries, in a module with no imports so the welcome check, Export everything, the data
 * catalog and the account erase can name them without shipping a schema (the lib/af-checklist-keys.ts pattern). The lead
 * lane wires these rows into the registries (docs/handoff/af-lanes/L5b.md).
 *
 * Every record is device only, versioned and loose, exported, erased with the account and never synced or restored:
 * - `zigoals:universe:v1` (personal): only the ids of the milestones already celebrated on this device and the day each
 *   was celebrated; the planets themselves are derived live from the person's records (H77).
 * - `zigoals:day-timeline:v1` (personal): the times the person moved on the timeline (`habit:<id>`, `meal:<slot>` → a
 *   clock time and an optional length), like reminder times; the synced habit record carries no clock time (H76).
 * - `zigoals:stories:v1` (display): which stories the person opened and when (written only on the person's own Open).
 */
export const UNIVERSE_KEY = 'zigoals:universe:v1';
export const DAY_TIMELINE_KEY = 'zigoals:day-timeline:v1';
export const STORIES_KEY = 'zigoals:stories:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AF_EXTRAS_PERSONAL_KEYS: readonly string[] = [UNIVERSE_KEY, DAY_TIMELINE_KEY];
/** Display records (onboarding `NON_PERSONAL_KEYS`): a device holding only these is still new. */
export const AF_EXTRAS_DISPLAY_KEYS: readonly string[] = [STORIES_KEY];
/** Export everything (`DEVICE_KEYS`): the three names in everything.json. */
export const AF_EXTRAS_EXPORT_KEYS = {universe: UNIVERSE_KEY, dayTimeline: DAY_TIMELINE_KEY, stories: STORIES_KEY} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AF_EXTRAS_CATALOG_LABELS = {
  universe: ['My universe: milestones already celebrated', 'Journey'],
  dayTimeline: ['Day timeline: habit and meal times you set', 'Today'],
  stories: ['Stories you opened', 'Life review'],
} as const;
/** The account erase (`lib/aa-device-forget.ts`): all three. */
export const AF_EXTRAS_ERASE_KEYS: readonly string[] = [UNIVERSE_KEY, DAY_TIMELINE_KEY, STORIES_KEY];
/** What the restore never brings back, in the restore plan's words. */
export const AF_EXTRAS_NEVER_RESTORED = 'My universe milestones, Day timeline times and the Stories you opened';
/** The two new routes and the Universe's place on Journey (H77, H79). */
export const TIMELINE_ROUTE = '/app/timeline';
export const STORIES_ROUTE = '/app/stories';
export const UNIVERSE_ROUTE = '/app/journey#universe';
/** Today's three new card ids for the loose `zigoals:today-cards:v1` record (H29; the lead adds them to TODAY_CARD_IDS). */
export const AF_EXTRAS_TODAY_CARD_IDS = ['universe', 'timeline', 'stories'] as const;
