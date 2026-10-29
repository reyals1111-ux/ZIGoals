import {habitExtrasSchema, type HabitExtras, type QuitCost, type TimeSection} from './schema';

/** Pure changes to the habit extras record; every one validates the result and prunes ids the journal no longer has. */
const prune = <T>(map: Record<string, T> | undefined, keep: ReadonlySet<string> | null) => {
  if (!map) return undefined;
  const next = Object.fromEntries(Object.entries(map).filter(([id]) => !keep || keep.has(id)));
  return Object.keys(next).length ? next : undefined;
};
const tidy = (r: HabitExtras, keep: ReadonlySet<string> | null): HabitExtras => habitExtrasSchema.parse({...r, areas: prune(r.areas, keep), quitCost: prune(r.quitCost, keep), bells: prune(r.bells, keep), times: prune(r.times, keep)});
export function setHabitArea(r: HabitExtras, habitId: string, areaId: string | null, keep: ReadonlySet<string> | null = null): HabitExtras {
  const areas = {...(r.areas ?? {})};
  if (areaId) areas[habitId] = areaId; else delete areas[habitId];
  return tidy({...r, areas}, keep ? new Set([...keep, habitId]) : null);
}
export function setQuitCost(r: HabitExtras, habitId: string, cost: QuitCost | null, keep: ReadonlySet<string> | null = null): HabitExtras {
  const quitCost = {...(r.quitCost ?? {})};
  if (cost) quitCost[habitId] = cost; else delete quitCost[habitId];
  return tidy({...r, quitCost}, keep ? new Set([...keep, habitId]) : null);
}
export function setTimerBell(r: HabitExtras, habitId: string, on: boolean, keep: ReadonlySet<string> | null = null): HabitExtras {
  const bells = {...(r.bells ?? {})};
  if (on) bells[habitId] = true; else delete bells[habitId];
  return tidy({...r, bells}, keep ? new Set([...keep, habitId]) : null);
}
/** Session AJ (item 35): a habit's own clock time on every device (null clears it). */
export function setHabitTime(r: HabitExtras, habitId: string, time: string | null, keep: ReadonlySet<string> | null = null): HabitExtras {
  const times = {...(r.times ?? {})};
  if (time) times[habitId] = time; else delete times[habitId];
  return tidy({...r, times}, keep ? new Set([...keep, habitId]) : null);
}
export const habitTime = (r: HabitExtras, habitId: string): string | null => r.times?.[habitId] ?? null;
export function setSectionFold(r: HabitExtras, section: TimeSection, folded: boolean): HabitExtras {
  return habitExtrasSchema.parse({...r, folds: {...(r.folds ?? {}), [section]: folded}});
}
export const habitArea = (r: HabitExtras, habitId: string): string | null => r.areas?.[habitId] ?? null;
export const habitQuitCost = (r: HabitExtras, habitId: string): QuitCost | null => r.quitCost?.[habitId] ?? null;
export const habitBell = (r: HabitExtras, habitId: string): boolean => r.bells?.[habitId] === true;
/** Habit ids grouped by area id (for a Goals-side "habits in this area" line, AA_LOCAL_TO_CLOUD.md). */
export function habitsByArea(habitIds: readonly string[], r: HabitExtras): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const id of habitIds) { const area = r.areas?.[id]; if (area) (out[area] ??= []).push(id); }
  return out;
}
