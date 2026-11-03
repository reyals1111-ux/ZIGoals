import {addLocalDays} from '../local-date';
import type {BillCadence} from './schema';

/**
 * Session AK (7.3): calendar steps for bills, pure. A monthly, quarterly or yearly step keeps the anchor's day of the
 * month and clamps it to the month's last day (an anchor on the 31st falls on 30 April and 28 February), so it never
 * drifts. Weekly steps are seven days.
 */
export const CADENCE_DAYS: Record<BillCadence, {days: number; min: number; max: number; months: number}> = {
  weekly: {days: 7, min: 5, max: 9, months: 0},
  monthly: {days: 30, min: 25, max: 35, months: 1},
  quarterly: {days: 91, min: 80, max: 101, months: 3},
  yearly: {days: 365, min: 340, max: 390, months: 12},
};
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
/** The day `n` months after `date`, its day of the month clamped to that month's last day. */
export function addMonths(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const index = y * 12 + (m - 1) + n, year = Math.floor(index / 12), month = index - year * 12 + 1;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(Math.min(d, lastDay(year, month))).padStart(2, '0')}`;
}
/** The k-th due date after the anchor (k = 0 is the anchor itself). */
export function stepDue(anchor: string, cadence: BillCadence, k: number): string {
  return cadence === 'weekly' ? addLocalDays(anchor, 7 * k) : addMonths(anchor, CADENCE_DAYS[cadence].months * k);
}
/** Whole days from `a` to `b` (positive when b is later). */
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
/** The first due date on or after `from`, stepping from the anchor (the anchor when it is still ahead). */
export function dueOnOrAfter(anchor: string, cadence: BillCadence, from: string): string {
  if (anchor >= from) return anchor;
  // Jump close first so a weekly bill anchored years ago needs few steps.
  let k = Math.max(0, Math.floor(daysBetween(anchor, from) / CADENCE_DAYS[cadence].days) - 1);
  for (let guard = 0; guard < 1000; guard++, k++) { const due = stepDue(anchor, cadence, k); if (due >= from) return due; }
  return from;
}
/** Every due date from `from` to `to` (both included). */
export function dueDatesBetween(anchor: string, cadence: BillCadence, from: string, to: string): string[] {
  const out: string[] = [];
  let due = dueOnOrAfter(anchor, cadence, from);
  let k = 0;
  // Find the step index of `due` to keep stepping from the anchor (no drift).
  if (due !== anchor) { k = Math.max(0, Math.floor(daysBetween(anchor, due) / CADENCE_DAYS[cadence].days) - 1); while (stepDue(anchor, cadence, k) < due) k++; }
  for (let guard = 0; due <= to && guard < 400; guard++) { out.push(due); k++; due = stepDue(anchor, cadence, k); }
  return out;
}
/** Roughly how many times a month a cadence comes round (weekly: 52 ÷ 12), for a labelled monthly estimate. */
export const PER_MONTH: Record<BillCadence, [num: number, den: number]> = {weekly: [52, 12], monthly: [1, 1], quarterly: [1, 3], yearly: [1, 12]};
