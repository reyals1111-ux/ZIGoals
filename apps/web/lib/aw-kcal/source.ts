import type {VitalSource} from '../vitals/schema';

/**
 * Session AW (kcal; owner decision 1a, ADR-046): the words for where an imported calorie figure came from — an export
 * file ("from your file"), a linked account or a device in this browser. Constants and one lookup only (no schema), so
 * the Health page's week rows can label their active energy without loading more. Pure.
 */
const FILE_SOURCES: ReadonlySet<VitalSource> = new Set(['apple-health', 'fitbit', 'garmin', 'samsung', 'oura']);
export type EnergySource = 'file' | 'link' | 'device';
/** Where an imported value came from: an export file, a linked account, or a device in this browser. */
export const energySourceOf = (source: VitalSource): EnergySource => FILE_SOURCES.has(source) ? 'file' : source.endsWith('-link') ? 'link' : 'device';
export const ENERGY_SOURCE_WORDS: Readonly<Record<EnergySource, {en: string; nl: string}>> = {
  file: {en: 'from your file', nl: 'uit je bestand'},
  link: {en: 'from your linked account', nl: 'uit je gekoppelde account'},
  device: {en: 'from your device', nl: 'van je apparaat'},
};
/** The words for a set of sources: one source's words, or "from your files and linked accounts" for a mix. */
export function energySourceWords(sources: Iterable<VitalSource>, lang: 'en' | 'nl' = 'en'): string {
  const kinds = [...new Set([...sources].map(energySourceOf))];
  if (kinds.length === 1) return ENERGY_SOURCE_WORDS[kinds[0]!][lang];
  return lang === 'nl' ? 'uit je bestanden en gekoppelde accounts' : 'from your files and linked accounts';
}
/** Source names as a person knows them ("Apple Health", "Oura"). */
export const SOURCE_NAMES: Readonly<Record<VitalSource, string>> = {'apple-health': 'Apple Health', fitbit: 'Fitbit', garmin: 'Garmin', samsung: 'Samsung Health', oura: 'Oura', 'oura-link': 'Oura', 'withings-link': 'Withings', 'polar-link': 'Polar', 'strava-link': 'Strava', bluetooth: 'Bluetooth'};

