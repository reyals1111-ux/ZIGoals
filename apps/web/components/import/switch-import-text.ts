// Words and numbers shared by Switch to ZIGoals and its preview (components/import/switch-import-review.tsx), kept apart
// so the preview's code can load with the reader (Session X Part 5) without either file importing the other.
import {formatNumber} from '../../lib/visual-format';
import type {ImportItems, Preview} from '../../lib/import/switch/apply';

export const GROUPS: [keyof ImportItems, string][] = [['sleep', 'Nights and naps'], ['meditation', 'Meditation sessions'], ['activity', 'Steps and workouts'], ['weights', 'Weights'], ['vitals', 'Days of heart rate and energy']];
const COUNT_LABELS: Record<string, [string, string]> = {sleep: ['night or nap', 'nights and naps'], meditation: ['meditation session', 'meditation sessions'], activity: ['activity line', 'activity lines'], weights: ['weight', 'weights'], vitals: ['day of vitals', 'days of vitals'], habits: ['habit', 'habits'], entries: ['new day', 'new days']};
export const n = (value: number) => formatNumber(value);
export function bytesText(bytes: number): string {
  if (bytes >= 1e9) return `${formatNumber(bytes / 1e9, {maximumFractionDigits: 1})} GB`;
  if (bytes >= 1e6) return `${formatNumber(bytes / 1e6, {maximumFractionDigits: 1})} MB`;
  return `${formatNumber(Math.max(1, Math.round(bytes / 1e3)))} KB`;
}
export function countsText(counts: Record<string, number>): string {
  return Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => `${n(v)} ${COUNT_LABELS[k]?.[v === 1 ? 0 : 1] ?? k}`).join(', ');
}
export function keptNotes(preview: Preview): string[] {
  const kept = GROUPS.reduce((t, [g]) => t + preview[g].kept, 0), full = GROUPS.reduce((t, [g]) => t + preview[g].full, 0);
  return [...(kept ? [`${n(kept)} ${kept === 1 ? 'record' : 'records'} stayed out because the journal already had that night or that day’s steps or weight (one source per day).`] : []), ...(full ? [`${n(full)} older ${full === 1 ? 'record' : 'records'} stayed out because the journal was full.`] : [])];
}
