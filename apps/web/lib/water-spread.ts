import {notifyPrefsSchema, type NotifyPrefs} from './notify/prefs';
/**
 * Session AV lane 2 (health r3; LEDGER #280, Waterllama's reminders through the day): water reminders every 1, 2 or 3
 * hours between a start and an end time, each skipped when the day is on pace for the person's own target. Pure.
 *
 * On pace at a reminder means the water logged so far is at least the target's share for that moment of the day, a
 * straight line from nothing at the start time to the whole target at the end time (half the target halfway). The first
 * reminder, at the start time, is skipped once anything is logged. With no target there is no pace: every reminder comes
 * (after the first), and the card says a target lets them skip. Quiet hours are kept by the notification plan.
 */
export type WaterSpread = {on: boolean; from: string; to: string; every: 60 | 120 | 180};
export const SPREAD_EVERY = [60, 120, 180] as const;
export const DEFAULT_SPREAD: WaterSpread = {on: true, from: '09:00', to: '21:00', every: 120};
export const MAX_SPREAD = 12;
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** The reminder times of a day: the start, then every step up to the end (at most 12). An end before the start is the start alone. */
export function spreadTimes(s: Pick<WaterSpread, 'from' | 'to' | 'every'>): string[] {
  const from = minutes(s.from), to = minutes(s.to), out: string[] = [];
  for (let m = from; m <= Math.max(from, to) && out.length < MAX_SPREAD; m += s.every) out.push(clock(m));
  return out;
}
/** The millilitres due by `time` for the pace (rounded to 10 mL), or null without a target. */
export function paceDue(s: Pick<WaterSpread, 'from' | 'to'>, targetMl: number | null, time: string): number | null {
  if (!targetMl || targetMl <= 0) return null;
  const from = minutes(s.from), to = minutes(s.to), m = minutes(time);
  if (to <= from) return m >= from ? targetMl : 0;
  const share = Math.min(1, Math.max(0, (m - from) / (to - from)));
  return Math.round(targetMl * share / 10) * 10;
}
export type SpreadSlot = {time: string; due: number | null; onPace: boolean};
/** Each reminder of today with what the pace asks by then and whether the day is already on pace for it. */
export function spreadSlots(s: WaterSpread, day: {targetMl: number | null; millilitres: number; entries: number}): SpreadSlot[] {
  const reached = !!day.targetMl && day.millilitres >= day.targetMl;
  return spreadTimes(s).map((time, i) => {
    const due = paceDue(s, day.targetMl, time);
    const onPace = reached || (i === 0 ? day.entries > 0 : due !== null && day.millilitres >= due);
    return {time, due, onPace};
  });
}
/** Saves the spread (switching it on also switches the Water notifications on: one tap, where it is chosen). */
export function withWaterSpread(p: NotifyPrefs, s: WaterSpread): NotifyPrefs {
  return notifyPrefsSchema.parse({...p, waterSpread: {on: s.on, from: s.from, to: s.to, every: s.every}, ...(s.on ? {types: {...p.types, water: true}} : {})});
}
