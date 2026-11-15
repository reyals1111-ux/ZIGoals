import {addLocalDays, localDate} from './local-date';

/**
 * Session AO (C-DVG-22): "My day ends at"'s zod-free core for the shell, Habits and the Checklist (lib/day-boundary.ts holds
 * the record's schema and re-exports these). No other imports, so the shell carries nothing more for it (route weights).
 */
export type DayEnds = {version: 1; endsAt: number; change?: {at: string; from: number}};
export const emptyDayEnds = (): DayEnds => ({version: 1, endsAt: 0});
const minutes = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 360 && v % 30 === 0;
/** A stored value read without the schema: exactly the record's rules (lib/day-boundary.ts dayEndsSchema), else midnight. */
export function readDayEnds(raw: string | null | undefined): DayEnds {
  if (!raw) return emptyDayEnds();
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (!v || typeof v !== 'object' || Array.isArray(v) || v.version !== 1 || !minutes(v.endsAt) || Object.keys(v).some(k => !['version', 'endsAt', 'change'].includes(k))) return emptyDayEnds();
    if (v.change === undefined) return {version: 1, endsAt: v.endsAt};
    const c = v.change as Record<string, unknown>;
    if (!c || typeof c !== 'object' || Array.isArray(c) || typeof c.at !== 'string' || !Number.isFinite(Date.parse(c.at)) || !/^\d{4}-\d{2}-\d{2}T/.test(c.at) || !minutes(c.from) || Object.keys(c).some(k => k !== 'at' && k !== 'from')) return emptyDayEnds();
    return {version: 1, endsAt: v.endsAt, change: {at: c.at, from: c.from}};
  } catch { return emptyDayEnds(); }
}

/** The calendar day an instant belongs to when the day ends `endsAt` minutes after midnight, in `zone` (null: this device). */
export function dayUnder(endsAt: number, now: Date, zone: string | null): string {
  if (zone) {
    // The zone's wall clock (lib/zone-time.ts wallClock reads the same; kept inline so pages carry no extra module).
    const parts = new Intl.DateTimeFormat('en-US', {timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}).formatToParts(now);
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
    const date = `${get('year')}-${get('month')}-${get('day')}`, minutes = (Number(get('hour')) % 24) * 60 + Number(get('minute'));
    return endsAt > 0 && minutes < endsAt ? addLocalDays(date, -1) : date;
  }
  const date = localDate(now);
  return endsAt > 0 && now.getHours() * 60 + now.getMinutes() < endsAt ? addLocalDays(date, -1) : date;
}

/** The day `now` counts for under a stored setting, with owner rule 1's change rule. */
export function activityDay(setting: DayEnds, now: Date, zone: string | null): string {
  const change = setting.change;
  // Session AO security delta (Low): a change dated in the future (a restored record, a clock set back) is ignored, so it can
  // never keep an old end in force while Settings shows the new one.
  if (!change || Date.parse(change.at) > Date.now() + 5 * 60_000) return dayUnder(setting.endsAt, now, zone);
  const at = new Date(change.at);
  if (now.getTime() < at.getTime()) return dayUnder(change.from, now, zone);
  const oldAtChange = dayUnder(change.from, at, zone);
  // At the change the two rules named different days: the old rule keeps that day until it ends under the old rule.
  if (oldAtChange !== dayUnder(setting.endsAt, at, zone) && dayUnder(change.from, now, zone) === oldAtChange) return oldAtChange;
  return dayUnder(setting.endsAt, now, zone);
}

// The setting in effect on this page, set by the shell from the device record (components/shell.tsx), as the journal zone
// is. On the server, in tests and before it is read: midnight, exactly as before.
let current: DayEnds = emptyDayEnds();
const listeners = new Set<() => void>();
export function currentDayEnds(): DayEnds { return current; }
export function setCurrentDayEnds(next: DayEnds): void {
  if (next.endsAt === current.endsAt && next.change?.at === current.change?.at && next.change?.from === current.change?.from) return;
  current = next;
  for (const listener of listeners) listener();
}
export function subscribeDayEnds(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
/** The day `now` counts for, with the setting in effect (midnight unless the person chose another end). */
export function boundaryDay(now: Date, zone: string | null): string { return activityDay(current, now, zone); }
