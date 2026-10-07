import type {ImportFormat} from '../batches-schema';

/**
 * The apps ZIGoals can bring history from (Session W Part 7), how each one exports, what is read, and how sure we are
 * of the layout. Sources were read on 2026-10-07 and are listed in docs/product/IMPORT_FORMATS.md. A format is read only
 * when its fields are described by the vendor (official help, the vendor's API documentation the export follows, the
 * README files inside the export, the DTD inside the file, or the app's own source code). Garmin and Streaks are not:
 * the importer recognises a Garmin archive and says why it stops; Streaks' columns are unknown.
 */
export type FormatState = 'reads' | 'meals' | 'off';
export type FormatInfo = {id: ImportFormat; label: string; state: FormatState; basis: string; steps: string; reads: string; offReason?: string};
/** Garmin's reader exists (lib/import/switch/garmin.ts) and stays off until its layout can be checked against Garmin. */
export const GARMIN_READS = false;
export const FORMATS: readonly FormatInfo[] = [
  {id: 'apple-health', label: 'Apple Health', state: 'reads', basis: 'Apple documents the data types, units and sleep values; the file carries its own layout (DTD).',
    steps: 'On your iPhone: Health → your picture → Export All Health Data → share the export.zip to this device.',
    reads: 'Sleep with stages, mindful minutes, steps, workouts, active and resting energy, resting heart rate, a daily heart-rate summary, weight.'},
  {id: 'fitbit', label: 'Fitbit / Google Health', state: 'reads', basis: 'The CSV files come with Google\'s own README describing every column.',
    steps: 'Google Takeout → select Google Health (or Fitbit) → export. Choose every ZIP it sends.',
    reads: 'Sleep with stages, steps, resting heart rate, a daily heart-rate summary, weight.'},
  {id: 'samsung', label: 'Samsung Health', state: 'reads', basis: 'The columns are the Samsung Health SDK\'s documented fields.',
    steps: 'Samsung Health → ⋮ → Settings → Download personal data. Choose the "Samsung Health" folder it saves (or a ZIP of it).',
    reads: 'Sleep with stages, steps (all devices together), a daily heart-rate summary, weight.'},
  {id: 'oura', label: 'Oura', state: 'reads', basis: 'Oura says the export follows its API v2 data models, which it documents.',
    steps: 'Oura app → Settings → Account → Manage membership (Membership Hub) → Export data → Request your data, then download the ZIP.',
    reads: 'Sleep with stages and naps, steps, active energy, resting heart rate (the lowest of the main sleep).'},
  {id: 'loop', label: 'Loop Habit Tracker', state: 'reads', basis: 'Read to Loop\'s own open-source exporter (version 2.3.1).',
    steps: 'Loop → Settings → Export as CSV, then choose the ZIP.',
    reads: 'Your habits, their schedules and targets, done and skipped days, amounts for measurable habits.'},
  {id: 'myfitnesspal', label: 'MyFitnessPal', state: 'meals', basis: 'MyFitnessPal documents the export, not its columns; ZIGoals pre-fills the matches for you to check.',
    steps: 'MyFitnessPal (Premium) → Nutrition → Export. Unzip it and choose Nutrition-Summary in Health → Import meals.',
    reads: 'Each meal\'s totals (the export has no food names): calories, protein, carbs, fat, fibre, sugars, saturated fat, sodium, potassium.'},
  {id: 'cronometer', label: 'Cronometer', state: 'meals', basis: 'Cronometer documents the export, not its columns; ZIGoals pre-fills the matches for you to check.',
    steps: 'Cronometer → Settings → Account → Export Data → Food & Recipe Entries (servings.csv), then Health → Import meals.',
    reads: 'Each food you logged with its amount and nutrients.'},
  {id: 'garmin', label: 'Garmin', state: GARMIN_READS ? 'reads' : 'off', basis: 'Garmin publishes nothing about this export\'s layout.',
    steps: 'Garmin Account → Data Management → Export Your Data.',
    reads: 'Not yet.', offReason: 'Garmin does not publish the layout of its export, and ZIGoals only reads layouts it can check, so nothing from it is read yet. Garmin Connect can share your data with Apple Health or Health Connect, whose exports ZIGoals reads.'},
  {id: 'streaks', label: 'Streaks', state: 'off', basis: 'Streaks has a CSV export, but its columns are not published.',
    steps: 'Streaks → Settings → Export Data.',
    reads: 'Not yet.', offReason: 'Streaks does not publish the columns of its CSV export, so ZIGoals cannot read it safely yet.'},
];
export const formatInfo = (id: ImportFormat) => FORMATS.find(f => f.id === id)!;
