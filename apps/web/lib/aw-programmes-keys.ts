/**
 * Session AW (programmes; owner decision 1d, ADR-046; TIER 3 (stored formats), additive only): this group's stored data, as
 * literals in a module with no imports (the lib/av2-r5-gym-keys.ts pattern). No new key: the written programmes keep their
 * progress in the existing, already registered Guided journeys record (`zigoals:guided-journeys:v1`, lib/guided/schema.ts)
 * as two optional fields on a journey, `stepsDone` and `showcase`. Read aloud stores nothing. lib/aw-programmes-keys.test.ts
 * proves each literal equals its owner's constant.
 */
export const AW_PROGRAMMES_RECORD_KEY = 'zigoals:guided-journeys:v1';
/** The optional journey fields this group adds (an older build keeps them as they are). */
export const AW_PROGRAMMES_JOURNEY_FIELDS: readonly string[] = ['stepsDone', 'showcase'];
/** New keys for the shared registries: none (export, erase, restore, the catalogue and the welcome check list the record already). */
export const AW_PROGRAMMES_NEW_KEYS: readonly string[] = [];
