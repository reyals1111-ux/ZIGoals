import {formatNumber} from '../../visual-format';

/**
 * Session AK (owner follow-up 2, N2; lane NA): the words NOVA's widgets put on screen, pure so they are tested. An unknown
 * is never written as zero: a value that could not be read is `null`, and its line is left out (or the widget says it
 * could not read it). Money stays in its own currency, already formatted by its own module; nothing here is advice.
 */

/** A goal's funding pace in calm words ("ON_TRACK", "ON TRACK" → "On track"); anything else is shown as it is. */
export function paceWords(health: string): {words: string; tone: 'good' | 'calm' | 'attention' | 'unknown'} {
  const key = health.trim().toUpperCase().replace(/_/g, ' ');
  if (key === 'AHEAD') return {words: 'Ahead of plan', tone: 'good'};
  if (key === 'ON TRACK') return {words: 'On track', tone: 'good'};
  if (key === 'COMPLETE' || key === 'COMPLETED' || key === 'FUNDED') return {words: 'Reached', tone: 'good'};
  if (key === 'BEHIND') return {words: 'Behind plan', tone: 'attention'};
  if (key === 'REVIEW' || key === 'NEEDS REVIEW' || key === 'RECOVER PLAN') return {words: 'Needs a look', tone: 'attention'};
  if (key === 'NO PLAN') return {words: 'No plan yet', tone: 'calm'};
  if (key === 'VALUE UNKNOWN' || !key) return {words: 'Value unknown', tone: 'unknown'};
  return {words: health.charAt(0).toUpperCase() + health.slice(1).toLowerCase().replace(/_/g, ' '), tone: 'calm'};
}

/** A water amount in the person's unit: "450 mL", "1.2 L", or US fluid ounces. */
export function waterAmount(ml: number, unit: 'ml' | 'fl-oz-us'): string {
  if (!Number.isFinite(ml) || ml < 0) return '';
  if (unit === 'fl-oz-us') return `${formatNumber(Math.round(ml / 29.5735295625 * 10) / 10, {maximumFractionDigits: 1})} fl oz`;
  return ml >= 1000 ? `${formatNumber(Math.round(ml / 100) / 10, {maximumFractionDigits: 1})} L` : `${formatNumber(Math.round(ml))} mL`;
}
/** A share of a target, 0–1, or null when there is no target (no bar is drawn then). */
export const shareOf = (value: number, target: number | null | undefined): number | null => target && target > 0 && Number.isFinite(value) ? Math.max(0, Math.min(1, value / target)) : null;

/** Minutes as "45 min", "1 h", "1 h 20 min". */
export function durationWords(minutes: number): string {
  const m = Math.max(0, Math.round(minutes)), h = Math.floor(m / 60), rest = m % 60;
  return h ? (rest ? `${h} h ${rest} min` : `${h} h`) : `${m} min`;
}
/** Whole days from one calendar day to another (both YYYY-MM-DD). */
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
/** "today", "tomorrow", "in 3 days", "3 days ago". */
export function whenWords(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 1 ? `in ${days} days` : `${-days} days ago`;
}

/** What "Day at a glance" knows; each part null when it could not be read or is not in use. */
export type GlanceFacts = {
  orbit: {done: number; total: number; unit: 'planet' | 'habit'} | null;
  water: {ml: number; targetMl: number | null; unit: 'ml' | 'fl-oz-us'} | null;
  meals: number | null;
  nextBill: {title: string; days: number} | null;
  focusMinutes: number | null;
  sleepMinutes: number | null;
  contributionsDue: number | null;
};
/**
 * Up to five short lines about the day, from the person's own records; nothing fetched, no weather. A part that is
 * unknown is left out; a known zero is said plainly ("No water logged yet").
 */
export function glanceLines(f: GlanceFacts): string[] {
  const out: string[] = [];
  if (f.orbit && f.orbit.total > 0) out.push(f.orbit.done >= f.orbit.total ? `Your orbit is complete: all ${f.orbit.total} ${f.orbit.unit}s done.` : `${f.orbit.done} of ${f.orbit.total} ${f.orbit.total === 1 ? f.orbit.unit : `${f.orbit.unit}s`} done so far.`);
  if (f.sleepMinutes !== null && f.sleepMinutes > 0) out.push(`You slept ${durationWords(f.sleepMinutes)} last night.`);
  if (f.water) out.push(f.water.ml > 0 ? `${waterAmount(f.water.ml, f.water.unit)} of water${f.water.targetMl ? ` of ${waterAmount(f.water.targetMl, f.water.unit)}` : ''} so far.` : 'No water logged yet today.');
  if (f.meals !== null) out.push(f.meals > 0 ? `${f.meals} ${f.meals === 1 ? 'food entry' : 'food entries'} logged today.` : 'No meals logged yet today.');
  if (f.contributionsDue !== null && f.contributionsDue > 0) out.push(`${f.contributionsDue} ${f.contributionsDue === 1 ? 'contribution is' : 'contributions are'} planned for today.`);
  if (f.nextBill && f.nextBill.days >= 0 && f.nextBill.days <= 7) out.push(`${f.nextBill.title} is due ${whenWords(f.nextBill.days)}.`);
  if (f.focusMinutes !== null && f.focusMinutes > 0) out.push(`${durationWords(f.focusMinutes)} of focus this week.`);
  return out.slice(0, 5);
}
