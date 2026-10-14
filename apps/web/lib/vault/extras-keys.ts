/**
 * Session AB-Cloud Part 2 (ADR-023): the names the shell needs without loading the extras sync (no imports, the pattern of
 * lib/w-device-keys.ts). lib/vault/extras-sections.test.ts keeps EXTRAS_DEVICE_KEYS equal to the sections' own keys.
 */
export const EXTRAS_CHOICE_KEY = 'zigoals:extras-sync-choice:v1';
/** Every device key the extras sections carry: an edit to one schedules a sync, like a module edit. */
export const EXTRAS_DEVICE_KEYS: readonly string[] = [
  'zigoals:goal-extras:v1', 'zigoals:average-goals:v1',
  'zigoals:calculator:v1', 'zigoals:life-review:v1', 'zigoals:today-cards:v1', 'zigoals:reminders-plan:v1',
  'zigoals:habit-extras:v1', 'zigoals:routine-run:v1', 'zigoals:game:v1',
  'zigoals:health-coach:v1', 'zigoals:micro-targets:v1', 'zigoals:macro-mode:v1', 'zigoals:aisles:v1', 'zigoals:measurements-custom:v1', 'zigoals:health-vitamins:v1',
];
