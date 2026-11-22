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
/**
 * Session AV lane 2 (sync; LEDGER #41, #134, #209; TIER 3 (sync)): the sections that travel only when the person chose
 * each one on this device (EXTRAS_CHOICE_SECTIONS_FIELD): the journal, the money records and the workout log. Until
 * ADR-034 N18 they never left the device, so none starts travelling by itself. Asked for by name after the optional
 * sections, and only once chosen, so the heads request of a device that chose none is exactly the one before; a sync
 * service that does not list one leaves it waiting on the device. The order is part of the protocol (the relay accepts
 * them only in this order), so a new name is always added at the end.
 */
export const EXTRAS_CHOICE_SECTIONS = ['journal', 'money', 'workouts'] as const;
export type ExtrasChoiceSectionName = (typeof EXTRAS_CHOICE_SECTIONS)[number];
/**
 * Which of those this device syncs: the optional field `sections` (`{journal?: true, money?: true, workouts?: true}`) of
 * the extras' own choice (EXTRAS_CHOICE_KEY), so no new key is stored. Builds before it read only `enabled` and
 * `explained`; one that writes the choice again drops `sections`, which reads as none chosen (the safe side).
 */
export const EXTRAS_CHOICE_SECTIONS_FIELD = 'sections';
/**
 * Whether an outcome of the extras sync stops the whole extras on this device: one of the six sections but Health
 * removed from the cloud elsewhere ("Remove the extras from the cloud"), as before. A chosen section removed by itself
 * stops only itself (lib/vault/extras-sync.ts syncSection).
 */
export const stopsExtras = (o: {state: string; section: string}) => o.state === 'deleted' && o.section !== 'health' && !(EXTRAS_CHOICE_SECTIONS as readonly string[]).includes(o.section);
/** The device keys those sections carry (kept equal to the sections' own records by extras-choice-sections.test.ts). */
export const EXTRAS_CHOICE_DEVICE_KEYS: readonly string[] = [
  'zigoals:journal:v1',
  'zigoals:money-log:v1', 'zigoals:budgets:v1', 'zigoals:budget-periods:v1', 'zigoals:bills:v1', 'zigoals:money-rules:v1', 'zigoals:money-tags:v1', 'zigoals:money-review:v1',
  'zigoals:workouts:v1', 'zigoals:workout-splits:v1',
];
