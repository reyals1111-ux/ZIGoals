/**
 * The names of Session AB-Cloud's device keys (ADR-023), in a module with no imports so the shell, the welcome check and
 * Export everything can name them without shipping a schema (the pattern of lib/aa-device-keys.ts). Each record is
 * versioned and loose; none enters a strict synced record.
 */
/** Part 4: vitamins of foods, frozen per diary entry, and their targets (synced in the `health` extras, Health's consent). */
export const HEALTH_VITAMINS_KEY = 'zigoals:health-vitamins:v1';
/** Part 6: Point & tell's switch and pins (device-only, never synced). */
export const POINT_TELL_KEY = 'zigoals:point-tell:v1';
/** The person's own records: a device with any of them is not new. */
export const AB_CLOUD_PERSONAL_KEYS: readonly string[] = [HEALTH_VITAMINS_KEY, POINT_TELL_KEY];
