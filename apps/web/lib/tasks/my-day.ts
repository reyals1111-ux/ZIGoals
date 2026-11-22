import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {TASK_PLAN_KEY} from './plan-key';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #223; Microsoft To Do's My Day): a pick for today. A task picked into My Day shows
 * in Tasks → Today for that day only; its own day and deadline are left alone (Plan for today, which moves the day, stays
 * beside it). The picks clear overnight by themselves: they hold the day they were made for, and a new day starts empty.
 * The last day's picks that are still open are offered back as "From yesterday" (or "From <weekday>") in Plan my day.
 *
 * Stored in the planning record `zigoals:task-plan:v1` as an additive, optional `myDay` (TIER 3 (stored format); its schema
 * is in plan-record.ts): `{day, ids, before?: {day, ids}}` — today's picks and the picks of the last day before. This
 * module has no schema of its own beyond a tolerant reader, so the Tasks page's first chunk can read the picks. Pure.
 */
export const MY_DAY_MAX = 100;
export type MyDayPicks = {day: string; ids: string[]};
export type MyDay = MyDayPicks & {before?: MyDayPicks};
const DAY = /^\d{4}-\d{2}-\d{2}$/, ID = /^[A-Za-z0-9_-]{1,80}$/;
const idsOf = (v: unknown): string[] | null => Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && ID.test(x)))].slice(0, MY_DAY_MAX) : null;
function picksOf(v: unknown): MyDayPicks | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as {day?: unknown; ids?: unknown}, ids = idsOf(o.ids);
  return typeof o.day === 'string' && DAY.test(o.day) && ids ? {day: o.day, ids} : null;
}
/** A stored `myDay` as this build reads it, or null (a value it cannot read is no picks, never an error). */
export function readMyDay(v: unknown): MyDay | null {
  const now = picksOf(v);
  if (!now) return null;
  const before = picksOf((v as {before?: unknown}).before);
  return before && before.day < now.day ? {...now, before} : now;
}
/** The planning record read for its picks only (the Tasks page: no planning schema in its first chunk). */
export const MY_DAY_VIEW: DeviceRecordSpec<MyDay | null> = {
  key: TASK_PLAN_KEY,
  schema: z.unknown().transform(v => v && typeof v === 'object' && (v as {version?: unknown}).version === 1 ? readMyDay((v as {myDay?: unknown}).myDay) : null),
  empty: () => null,
};
/** The ids picked for `today` (none once the day has passed). */
export const picksToday = (myDay: MyDay | null | undefined, today: string): string[] => myDay && myDay.day === today ? myDay.ids : [];
/** The last day before `today` with picks, and those picks (from `myDay` itself once its day has passed, else `before`). */
export function lastPicks(myDay: MyDay | null | undefined, today: string): MyDayPicks | null {
  if (!myDay) return null;
  const last = myDay.day < today ? myDay : myDay.before && myDay.before.day < today ? myDay.before : null;
  return last && last.ids.length ? {day: last.day, ids: last.ids} : null;
}
/**
 * The last day's picks still worth a look today: open, still on the list and not already picked today. `open` says
 * whether a task id is an open task (the caller's list). At most `limit`.
 */
export function carriedPicks(myDay: MyDay | null | undefined, today: string, open: (id: string) => boolean, limit = 10): {day: string; ids: string[]} | null {
  const last = lastPicks(myDay, today), now = new Set(picksToday(myDay, today));
  if (!last) return null;
  const ids = last.ids.filter(id => open(id) && !now.has(id)).slice(0, limit);
  return ids.length ? {day: last.day, ids} : null;
}
/**
 * Picks (`on`) or unpicks tasks for `today`. A first pick on a new day keeps the last day's picks as `before` (for
 * "From yesterday") and starts the day empty. With no picks left at all, `myDay` is taken off the record.
 */
export function pickForToday<T extends {myDay?: unknown}>(plan: T, ids: readonly string[], today: string, on: boolean): T {
  const current = readMyDay(plan.myDay);
  let base: MyDay;
  if (current && current.day === today) base = current;
  else {
    const before = current && current.day < today && current.ids.length ? {day: current.day, ids: current.ids} : current?.before && current.before.day < today ? current.before : undefined;
    base = {day: today, ids: [], ...(before ? {before} : {})};
  }
  const set = new Set(base.ids);
  for (const id of ids) { if (!ID.test(id)) continue; if (on) set.add(id); else set.delete(id); }
  if (on && set.size > MY_DAY_MAX) throw new Error(`My Day holds ${MY_DAY_MAX} tasks. Take one out first.`);
  const next: MyDay = {day: today, ids: [...set], ...(base.before ? {before: base.before} : {})};
  const out: Record<string, unknown> = {...plan};
  if (!next.ids.length && !next.before) delete out.myDay; else out.myDay = next;
  return out as T;
}
/** Takes ids that are no longer open tasks out of today's picks (a removed task, say); the same plan when none. */
export function tidyPicks<T extends {myDay?: unknown}>(plan: T, today: string, live: (id: string) => boolean): T {
  const now = readMyDay(plan.myDay);
  if (!now || now.day !== today || now.ids.every(live)) return plan;
  return pickForToday(plan, now.ids.filter(id => !live(id)), today, false);
}
