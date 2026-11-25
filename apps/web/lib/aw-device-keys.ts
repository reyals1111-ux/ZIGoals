import {AW_KCAL_CATALOG_LABELS, AW_KCAL_DISPLAY_KEYS, AW_KCAL_EXPORT_KEYS, AW_KCAL_PERSONAL_KEYS} from './aw-kcal-keys';
/**
 * Session AW (ADR-046; TIER 3 stored formats: additive keys only): the session's device keys from each group's own
 * literal module (lib/aw-<group>-keys.ts), gathered here and spread into lib/av2-device-keys.ts's lists, so the welcome
 * check, Export everything, the data catalogue and the account erase carry them (lib/av2-device-keys.test.ts and
 * lib/erase-coverage.test.ts prove it). Every AW record is device only unless its group says otherwise; an older build
 * ignores the key.
 */
export const AW_PERSONAL_KEYS: readonly string[] = [...AW_KCAL_PERSONAL_KEYS];
export const AW_DISPLAY_KEYS: readonly string[] = [...AW_KCAL_DISPLAY_KEYS];
export const AW_EXPORT_KEYS = {...AW_KCAL_EXPORT_KEYS} as const;
export const AW_CATALOG_LABELS = {...AW_KCAL_CATALOG_LABELS} as const;
