/**
 * Session AB-Cloud Part 2 (ADR-023): the names the shell needs without loading the extras sync (no imports, the pattern of
 * lib/w-device-keys.ts). lib/vault/extras-sections.test.ts keeps EXTRAS_DEVICE_KEYS equal to the sections' own keys.
 */
export const EXTRAS_CHOICE_KEY = 'zigoals:extras-sync-choice:v1';
/**
 * The sections a private-sync lists only when asked for by name (Session AK AFL8: `checklist`; Session AM ADR-038 D18:
 * `nova`), oldest first. The order is part of the protocol: a service that predates the later names reads the first one
 * only (lib/vault/extras-sync.ts EXTRAS_HEADS_QUERY), so a new name is always added at the end.
 */
export const EXTRAS_OPTIONAL_SECTIONS = ['checklist', 'nova'] as const;
/** Every device key the extras sections carry: an edit to one schedules a sync, like a module edit. */
export const EXTRAS_DEVICE_KEYS: readonly string[] = [
  'zigoals:goal-extras:v1', 'zigoals:average-goals:v1',
  'zigoals:calculator:v1', 'zigoals:life-review:v1', 'zigoals:today-cards:v1', 'zigoals:reminders-plan:v1',
  'zigoals:habit-extras:v1', 'zigoals:routine-run:v1', 'zigoals:game:v1',
  'zigoals:health-coach:v1', 'zigoals:micro-targets:v1', 'zigoals:macro-mode:v1', 'zigoals:aisles:v1', 'zigoals:measurements-custom:v1', 'zigoals:health-vitamins:v1',
  // Session AK (8.10, AFL8): the Checklist section.
  'zigoals:checklist:v1', 'zigoals:checklist-days:v1',
  // Session AM (ADR-038 D18): the NOVA section (of `zigoals:nova:v1` only the layout and the pinned widgets travel).
  'zigoals:nova-stage:v1', 'zigoals:nova:v1',
];
