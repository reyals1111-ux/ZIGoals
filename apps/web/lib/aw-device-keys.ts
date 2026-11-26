import {AW_X3_CATALOG_LABELS, AW_X3_DISPLAY_KEYS, AW_X3_EXPORT_KEYS, AW_X3_PERSONAL_KEYS} from './aw-x3-notes-journal-keys';
import {AW_X1_CATALOG_LABELS, AW_X1_DISPLAY_KEYS, AW_X1_EXPORT_KEYS, AW_X1_PERSONAL_KEYS} from './aw-x1-keys';
import {AW_X4_CATALOG_LABELS, AW_X4_DISPLAY_KEYS, AW_X4_EXPORT_KEYS, AW_X4_PERSONAL_KEYS} from './aw-x4-strides-keys';
import {AW_X6_DISPLAY_KEYS} from './aw-x6-keys';
import {AW_KCAL_CATALOG_LABELS, AW_KCAL_DISPLAY_KEYS, AW_KCAL_EXPORT_KEYS, AW_KCAL_PERSONAL_KEYS} from './aw-kcal-keys';
/**
 * Session AW (ADR-046; TIER 3 stored formats: additive keys only): the session's device keys from each group's own
 * literal module (lib/aw-<group>-keys.ts), gathered here and spread into lib/av2-device-keys.ts's lists, so the welcome
 * check, Export everything, the data catalogue and the account erase carry them (lib/av2-device-keys.test.ts and
 * lib/erase-coverage.test.ts prove it). Every AW record is device only unless its group says otherwise; an older build
 * ignores the key.
 */
export const AW_PERSONAL_KEYS: readonly string[] = [...AW_KCAL_PERSONAL_KEYS, ...AW_X3_PERSONAL_KEYS, ...AW_X1_PERSONAL_KEYS, ...AW_X4_PERSONAL_KEYS];
export const AW_DISPLAY_KEYS: readonly string[] = [...AW_KCAL_DISPLAY_KEYS, ...AW_X3_DISPLAY_KEYS, ...AW_X1_DISPLAY_KEYS, ...AW_X4_DISPLAY_KEYS, ...AW_X6_DISPLAY_KEYS];
export const AW_EXPORT_KEYS = {...AW_KCAL_EXPORT_KEYS, ...AW_X3_EXPORT_KEYS, ...AW_X1_EXPORT_KEYS, ...AW_X4_EXPORT_KEYS} as const;
export const AW_CATALOG_LABELS = {...AW_KCAL_CATALOG_LABELS, ...AW_X3_CATALOG_LABELS, ...AW_X1_CATALOG_LABELS, ...AW_X4_CATALOG_LABELS} as const;
