/**
 * Session AK (F5b): the before/after slider over two progress photos (lib/health-aa/photos.ts; nothing new is stored, the
 * images never leave the device). Pure helpers: which photo is "before", how far apart they are, a plain note when the
 * poses differ, and the slider position kept within 0–100.
 */
export type ComparePhoto = {id: string; date: string; at: string; pose: string};
/** The older photo first (by day, then by when it was added). */
export function beforeAfter<T extends ComparePhoto>(a: T, b: T): {before: T; after: T} {
  const aFirst = a.date < b.date || (a.date === b.date && a.at <= b.at);
  return aFirst ? {before: a, after: b} : {before: b, after: a};
}
export const daysApart = (a: {date: string}, b: {date: string}) => Math.abs(Math.round((Date.parse(`${a.date}T12:00:00Z`) - Date.parse(`${b.date}T12:00:00Z`)) / 86_400_000));
/** Null when both photos share a pose; otherwise a calm note that the comparison may mislead. */
export function poseNote(a: {pose: string}, b: {pose: string}): string | null {
  return a.pose === b.pose ? null : `Different poses (${a.pose} and ${b.pose}): the comparison may mislead.`;
}
export const SLIDER_STEP = 5;
/** A slider position: where the divider sits, from the left, in percent (the "before" photo shows left of it, the "after" photo right of it); a whole number within 0–100, anything else is the middle. */
export function clampPosition(value: number): number { return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 50; }
/** The words a screen reader hears for a position. */
export function positionText(value: number): string {
  const p = clampPosition(value);
  return p === 0 ? 'After only' : p === 100 ? 'Before only' : `${p}% before, ${100 - p}% after`;
}
