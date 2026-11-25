/**
 * Session AW (kcal; owner decision 1a and amendment 4, ADR-046; TIER 3 stored formats: one additive key): this group's
 * one new record and its rows for the shared registries, as literals in a module with no imports (the
 * lib/av2-r6-body-keys.ts pattern), so the welcome check, Export everything, the data catalogue, the restore plan, the
 * account erase and sync can name it without shipping a schema. lib/aw-kcal-keys.test.ts proves each literal equals its
 * owner's constant.
 * - `zigoals:activity-extras:v1` (lib/aw-kcal/activity-extras.ts): what a person typed beside a Health activity — its
 *   distance, how hard it felt (easy, moderate, hard) and the calories they entered — keyed by the activity's id. Its own
 *   record because `activitySchema` (lib/health.ts) is strict: a field there would make builds #37–#59 refuse the
 *   Health record. Loose and versioned; an older build ignores it and shows the activity as before. Health data: it
 *   travels only under the Health consent (extras section "health"), is exported, restored with Health and erased with
 *   the account. Never an estimate: every figure in it is one the person typed.
 */
export const ACTIVITY_EXTRAS_KEY_LITERAL = 'zigoals:activity-extras:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AW_KCAL_PERSONAL_KEYS: readonly string[] = [ACTIVITY_EXTRAS_KEY_LITERAL];
/** Display/setting records (onboarding `NON_PERSONAL_KEYS`): none. */
export const AW_KCAL_DISPLAY_KEYS: readonly string[] = [];
/** Export everything (`DEVICE_KEYS`): the name in everything.json. */
export const AW_KCAL_EXPORT_KEYS = {activityExtras: ACTIVITY_EXTRAS_KEY_LITERAL} as const;
/** The data catalogue (`DEVICE_LABELS`): [label, area]. */
export const AW_KCAL_CATALOG_LABELS = {
  activityExtras: ['Health activity: the distance, effort and calories you typed on an activity', 'Health'],
} as const;
/** Restore (`lib/restore/plan.ts` `dev(...)`): [name, group]. */
export const AW_KCAL_RESTORE = {activityExtras: ['Activity distance, effort and calories you entered', 'Health']} as const;
/** Sync (`lib/vault/extras-sections.ts`): the extras section that carries it and its consent. */
export const AW_KCAL_SYNC = {activityExtras: {section: 'health', consent: 'health'}} as const;
/** The account erase (`lib/aa-device-forget.ts`): every key above. */
export const AW_KCAL_ERASE_KEYS: readonly string[] = [...AW_KCAL_PERSONAL_KEYS, ...AW_KCAL_DISPLAY_KEYS];
