import type {ImportFormat} from '../batches-schema';
import type {ImportPlan} from './apply';
import {readApple} from './apple';
import type {ReadContext} from './common';
import {readFitbit, isFitbitCsv, isFitbitLegacy, FITBIT_LEGACY_ONLY} from './fitbit';
import {formatInfo, GARMIN_READS} from './formats';
import {readGarmin, isGarminFile} from './garmin';
import {readLoop, isLoopHabits, type HabitsPlan} from './loop';
import {readOura, isOuraFile} from './oura';
import {readSamsung, isSamsungFile} from './samsung';
import {baseName, headOf, type ImportFile} from './source';

/**
 * Which app an export comes from, by its files (Session W Part 7), and the reader for it. Detection looks at names and,
 * for XML and CSV files, at their first bytes; it never trusts a file extension alone.
 */
export type ReadOutcome =
  | {kind: 'health'; plan: ImportPlan}
  | {kind: 'habits'; plan: HabitsPlan}
  | {kind: 'refused'; format: ImportFormat | null; message: string; meals?: boolean};
export const NOT_RECOGNISED = 'ZIGoals does not recognise this export. It reads exports from Apple Health, Fitbit / Google Health, Samsung Health, Oura and Loop Habit Tracker; choose the file or folder exactly as the app saved it.';
const appleCandidates = (files: readonly ImportFile[]) => files.filter(f => /\.xml$/i.test(f.path) && !/(^|\/)(export_cda\.xml|clinical-records\/|workout-routes\/)/i.test(f.path)).sort((a, b) => b.size - a.size);
export async function detectFormat(files: readonly ImportFile[]): Promise<{format: ImportFormat; apple?: ImportFile} | {format: null; legacyFitbit?: boolean}> {
  if (files.some(f => isLoopHabits(f.path)) && files.some(f => /\/Checkmarks\.csv$/.test(f.path) || /(^|\/)Checkmarks\.csv$/.test(f.path))) return {format: 'loop'};
  for (const file of appleCandidates(files).slice(0, 4)) if (/<!DOCTYPE\s+HealthData/.test(await headOf(file, 8192))) return {format: 'apple-health', apple: file};
  if (files.some(f => isFitbitCsv(f.path))) return {format: 'fitbit'};
  if (files.some(f => isSamsungFile(f.path))) return {format: 'samsung'};
  if (files.some(f => isOuraFile(f.path))) return {format: 'oura'};
  if (files.some(f => isGarminFile(f.path))) return {format: 'garmin'};
  if (files.some(f => /^Nutrition-Summary-.*\.csv$/i.test(baseName(f.path)))) return {format: 'myfitnesspal'};
  for (const file of files.filter(f => /\.csv$/i.test(f.path)).slice(0, 8)) if (/^Day,Time,Group,Food Name/i.test((await headOf(file, 512)).trim())) return {format: 'cronometer'};
  if (files.some(f => isFitbitLegacy(f.path))) return {format: null, legacyFitbit: true};
  return {format: null};
}
export async function readFiles(files: readonly ImportFile[], ctx: ReadContext, onDetected?: (format: ImportFormat, total: number) => void): Promise<ReadOutcome> {
  const found = await detectFormat(files);
  if (!found.format) return {kind: 'refused', format: null, message: 'legacyFitbit' in found && found.legacyFitbit ? FITBIT_LEGACY_ONLY : NOT_RECOGNISED};
  const relevant: Partial<Record<ImportFormat, (path: string) => boolean>> = {fitbit: isFitbitCsv, samsung: isSamsungFile, oura: isOuraFile, garmin: p => isGarminFile(p) && /\.json$/i.test(p), loop: p => /\.csv$/i.test(p)};
  onDetected?.(found.format, found.apple ? found.apple.size : files.filter(f => relevant[found.format]?.(f.path)).reduce((t, f) => t + f.size, 0));
  const info = formatInfo(found.format);
  if (info.state === 'meals') return {kind: 'refused', format: found.format, meals: true, message: `This is a ${info.label} export. Its meals go into Health → Diary → Import a nutrition CSV, which recognises the file and pre-fills the columns for you to check.`};
  if (info.state === 'off' && !(found.format === 'garmin' && GARMIN_READS)) return {kind: 'refused', format: found.format, message: info.offReason ?? 'ZIGoals does not read this export yet.'};
  switch (found.format) {
    case 'apple-health': return {kind: 'health', plan: await readApple(found.apple!, ctx)};
    case 'fitbit': return {kind: 'health', plan: await readFitbit(files, ctx)};
    case 'samsung': return {kind: 'health', plan: await readSamsung(files, ctx)};
    case 'oura': return {kind: 'health', plan: await readOura(files, ctx)};
    case 'garmin': return {kind: 'health', plan: await readGarmin(files, ctx)};
    case 'loop': return {kind: 'habits', plan: await readLoop(files, ctx)};
    default: return {kind: 'refused', format: found.format, message: NOT_RECOGNISED};
  }
}
