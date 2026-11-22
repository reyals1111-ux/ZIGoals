import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {addLocalDays} from '../local-date';
import type {Workouts} from './schema';

/**
 * Session AV lane 2, round 4 (health; LEDGER #330, Runna's training calendar and plan realignment, and Strong's workout
 * scheduling; TIER 3 (stored format), a new device record): workouts the person plans on a day (and a time) — one of
 * their routines, one of their circuits (round 3's #289), a run (a distance and an easy, steady or fast word) or something
 * of their own — moved to another day by dragging on the plan's calendar or with "Move to"; "I missed some" moves this
 * week's missed planned workouts on in order (each on the next day from today, pushing later ones along where they would
 * meet, with Undo); "Away until …" sets the planned workouts in a range aside. The Agenda and the Day Timeline draw them.
 *
 * Its own key, `zigoals:planned-workouts:v1`, loose and versioned (the workout log keeps only finished workouts and is read
 * by every build); an unreadable item is dropped and the others kept. Device-only; exported, restored and erased with the
 * account. A planned workout is "done" when a finished workout is logged on its day (one finished workout per planned one,
 * in time order); "missed" when its day has passed without one. Plan-based realignment of Runna's own programmes stays with
 * LEDGER #113 (Carried: needs content). Pure.
 */
export const PLANNED_KEY = 'zigoals:planned-workouts:v1';
export const PLANNED_MAX = 300, PLANNED_NAME_MAX = 80;
export const EFFORTS = ['easy', 'steady', 'fast'] as const;
export type Effort = (typeof EFFORTS)[number];
export const EFFORT_WORDS: Record<Effort, {en: string; nl: string}> = {easy: {en: 'Easy', nl: 'Rustig'}, steady: {en: 'Steady', nl: 'Gelijkmatig'}, fast: {en: 'Fast', nl: 'Snel'}};
const day = z.iso.date(), clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const plannedSchema = z.looseObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  date: day,
  time: clock.optional().catch(undefined),
  kind: z.enum(['routine', 'circuit', 'run', 'other']),
  /** The routine's or circuit's id, so a later rename still finds it. */
  refId: z.string().min(1).max(80).optional().catch(undefined),
  name: z.string().trim().min(1).max(PLANNED_NAME_MAX),
  distanceKm: z.number().finite().min(0.1).max(500).optional().catch(undefined),
  effort: z.enum(EFFORTS).optional().catch(undefined),
  minutes: z.number().int().min(5).max(600).optional().catch(undefined),
  createdAt: z.iso.datetime(),
});
export type Planned = z.infer<typeof plannedSchema>;
const itemsSchema = z.preprocess(v => Array.isArray(v) ? v.filter(x => plannedSchema.safeParse(x).success).slice(0, PLANNED_MAX) : v, z.array(plannedSchema).max(PLANNED_MAX));
const awaySchema = z.looseObject({from: day, to: day}).refine(a => a.from <= a.to);
/**
 * Session AV lane 2, round 5 (gym; LEDGER #374, Gentler Streak's activity status; TIER 3 (stored format), additive): a status
 * set in Workouts — ill, injured, a break or travelling — from a day until it is cleared (`to`, the last day it covered).
 * Kept (up to 50) so the week streak keeps passing over the weeks it covered; the open one has no `to`. While a status
 * covers a day its planned workouts are set aside, never missed. The reason stays on this device and never goes in a
 * notification. An unreadable status is dropped, the others kept; older builds keep the list untouched (loose record).
 */
export const STATUS_KINDS = ['ill', 'injured', 'break', 'travel'] as const;
export type StatusKind = (typeof STATUS_KINDS)[number];
export const statusSchema = z.looseObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  kind: z.enum(STATUS_KINDS),
  from: day,
  to: day.optional(),
  createdAt: z.iso.datetime(),
}).refine(s => !s.to || s.from <= s.to);
export type WorkoutStatus = z.infer<typeof statusSchema>;
export const STATUSES_MAX = 50;
const statusesSchema = z.preprocess(v => Array.isArray(v) ? v.filter(x => statusSchema.safeParse(x).success).slice(-STATUSES_MAX) : v, z.array(statusSchema).max(STATUSES_MAX));
export const plannedRecordSchema = z.looseObject({version: z.literal(1), items: itemsSchema.default([]), away: awaySchema.optional().catch(undefined), statuses: statusesSchema.optional().catch(undefined)});
export type PlannedRecord = z.infer<typeof plannedRecordSchema>;
export const emptyPlanned = (): PlannedRecord => ({version: 1, items: []});
export const PLANNED_WORKOUTS: DeviceRecordSpec<PlannedRecord> = {key: PLANNED_KEY, schema: plannedRecordSchema, empty: emptyPlanned};

export type PlanDraft = {kind: Planned['kind']; refId?: string; name: string; date: string; time: string; distanceKm?: string; effort?: Effort; minutes?: string};
export type PlanIssue = {field: 'what' | 'name' | 'date' | 'time' | 'distance' | 'minutes'; message: string};
/** A run's own name: "Easy 5 km run". */
export const runName = (km: number, effort?: Effort) => `${effort ? `${EFFORT_WORDS[effort].en} ` : ''}${km.toLocaleString('en-US', {maximumFractionDigits: 2})} km run`;
const sorted = (items: Planned[]) => [...items].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '99').localeCompare(b.time ?? '99') || a.createdAt.localeCompare(b.createdAt));
/** Plans a workout from the form, or says which field to fix. */
export function planWorkout(rec: PlannedRecord, d: PlanDraft, id: string, now: string): {ok: true; value: PlannedRecord; item: Planned} | {ok: false; issue: PlanIssue} {
  if (rec.items.length >= PLANNED_MAX) return {ok: false, issue: {field: 'date', message: `This device keeps up to ${PLANNED_MAX} planned workouts. Remove a past one first.`}};
  if (!day.safeParse(d.date).success) return {ok: false, issue: {field: 'date', message: 'Choose a day.'}};
  if (d.time.trim() && !clock.safeParse(d.time.trim()).success) return {ok: false, issue: {field: 'time', message: 'Enter a time like 07:30, or leave it blank.'}};
  if ((d.kind === 'routine' || d.kind === 'circuit') && !d.refId) return {ok: false, issue: {field: 'what', message: 'Choose what to plan.'}};
  let km: number | undefined, minutes: number | undefined;
  if (d.kind === 'run') {
    const text = (d.distanceKm ?? '').trim().replace(',', '.');
    km = Number(text);
    if (!text || !Number.isFinite(km) || km < 0.1 || km > 500) return {ok: false, issue: {field: 'distance', message: 'Enter the distance in km, from 0.1 to 500.'}};
    km = Math.round(km * 100) / 100;
  }
  const mText = (d.minutes ?? '').trim();
  if (mText) { minutes = Number(mText); if (!/^\d+$/.test(mText) || minutes < 5 || minutes > 600) return {ok: false, issue: {field: 'minutes', message: 'Enter whole minutes from 5 to 600, or leave it blank.'}}; }
  const name = d.kind === 'run' ? runName(km!, d.effort) : d.name.trim();
  if (!name) return {ok: false, issue: {field: 'name', message: 'Give it a name.'}};
  if (name.length > PLANNED_NAME_MAX) return {ok: false, issue: {field: 'name', message: `Keep the name to ${PLANNED_NAME_MAX} characters or fewer.`}};
  const item = plannedSchema.parse({id, date: d.date, ...(d.time.trim() ? {time: d.time.trim()} : {}), kind: d.kind, ...(d.refId && d.kind !== 'run' && d.kind !== 'other' ? {refId: d.refId} : {}), name,
    ...(km !== undefined ? {distanceKm: km} : {}), ...(d.kind === 'run' && d.effort ? {effort: d.effort} : {}), ...(minutes !== undefined ? {minutes} : {}), createdAt: now});
  return {ok: true, value: plannedRecordSchema.parse({...rec, items: sorted([...rec.items, item])}), item};
}
export function moveWorkout(rec: PlannedRecord, id: string, date: string): PlannedRecord {
  if (!day.safeParse(date).success) throw Error('Choose a day.');
  if (!rec.items.some(i => i.id === id)) throw Error('This planned workout is no longer here.');
  return plannedRecordSchema.parse({...rec, items: sorted(rec.items.map(i => i.id === id ? {...i, date} : i))});
}
export const removePlanned = (rec: PlannedRecord, id: string): PlannedRecord => plannedRecordSchema.parse({...rec, items: rec.items.filter(i => i.id !== id)});
export const restorePlanned = (rec: PlannedRecord, item: Planned): PlannedRecord => rec.items.some(i => i.id === item.id) ? rec : plannedRecordSchema.parse({...rec, items: sorted([...rec.items, item])});

export type PlanState = 'planned' | 'done' | 'missed' | 'aside';
// Session AV lane 2, round 5 (LEDGER #374): a day under a workout status (open: until it is cleared) is set aside as well.
const inStatus = (rec: PlannedRecord, date: string) => (rec.statuses ?? []).some(s => date >= s.from && (!s.to || date <= s.to));
const inAway = (rec: PlannedRecord, date: string) => (!!rec.away && date >= rec.away.from && date <= rec.away.to) || inStatus(rec, date);
/** Each planned workout's state today: done (a finished workout that day, one each, in time order), missed, set aside or planned. */
export function planStates(rec: PlannedRecord, w: Workouts | null, today: string): Map<string, PlanState> {
  const finishedOn = new Map<string, number>(), out = new Map<string, PlanState>();
  for (const x of w?.workouts ?? []) if (x.endedAt) finishedOn.set(x.date, (finishedOn.get(x.date) ?? 0) + 1);
  const used = new Map<string, number>();
  for (const i of sorted(rec.items)) {
    const n = used.get(i.date) ?? 0;
    if (n < (finishedOn.get(i.date) ?? 0)) { used.set(i.date, n + 1); out.set(i.id, 'done'); continue; }
    out.set(i.id, inAway(rec, i.date) ? 'aside' : i.date < today ? 'missed' : 'planned');
  }
  return out;
}
/** The Monday of the week holding `date`. */
export const mondayOf = (date: string) => addLocalDays(date, -((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7));
/** This week's missed planned workouts (Monday first), earliest first. */
export function missedThisWeek(rec: PlannedRecord, w: Workouts | null, today: string): Planned[] {
  const states = planStates(rec, w, today), from = mondayOf(today);
  return sorted(rec.items).filter(i => i.date >= from && i.date < today && states.get(i.id) === 'missed');
}
/**
 * "I missed some": this week's missed planned workouts move on in order, the first to today, each next one to the day after;
 * a later planned workout keeps its day unless the moved chain reaches it (its day is one the chain already fills), then it
 * moves on to the chain's next day too. Nothing the chain does not reach moves, in any week. Days set aside (away) are
 * skipped. Returns the record, how many moved (exactly the workouts whose day changed) and each move.
 * Review B4E-1: every later workout went through the chain's cursor, so a second workout on one day moved a day on even
 * when nothing reached it.
 */
export type PlanMove = {id: string; from: string; to: string};
export function realign(rec: PlannedRecord, w: Workouts | null, today: string): {value: PlannedRecord; moved: number; moves: PlanMove[]} {
  const missed = missedThisWeek(rec, w, today);
  if (!missed.length) return {value: rec, moved: 0, moves: []};
  const states = planStates(rec, w, today), later = sorted(rec.items).filter(i => i.date >= today && states.get(i.id) === 'planned');
  // Round 5: a status day is skipped one day at a time (an open status has no end, so it is capped at a year).
  const next = (d: string) => { let x = d; for (let i = 0; i < 400 && inAway(rec, x); i++) x = rec.away && x >= rec.away.from && x <= rec.away.to ? addLocalDays(rec.away.to, 1) : addLocalDays(x, 1); return x; };
  const dates = new Map<string, string>();
  // `cursor` is the first day after the days the moved chain fills.
  let cursor = next(today);
  for (const i of missed) { dates.set(i.id, cursor); cursor = next(addLocalDays(cursor, 1)); }
  for (const i of later) {
    if (i.date >= cursor) continue; // the chain has not reached its day: it keeps it
    dates.set(i.id, cursor); cursor = next(addLocalDays(cursor, 1));
  }
  const moves = [...dates].flatMap(([id, to]) => { const from = rec.items.find(i => i.id === id)!.date; return from === to ? [] : [{id, from, to}]; });
  return {value: plannedRecordSchema.parse({...rec, items: sorted(rec.items.map(i => dates.has(i.id) ? {...i, date: dates.get(i.id)!} : i))}), moved: moves.length, moves};
}
/**
 * Undo of "I missed some" (review B4E-2): the inverse of its own moves only — each moved workout goes back to its day where
 * it still has the day it was moved to; anything planned, moved or removed since is left as it is.
 */
export function undoRealign(rec: PlannedRecord, moves: readonly PlanMove[]): PlannedRecord {
  const back = new Map(moves.map(m => [m.id, m]));
  return plannedRecordSchema.parse({...rec, items: sorted(rec.items.map(i => { const m = back.get(i.id); return m && i.date === m.to ? {...i, date: m.from} : i; }))});
}
export function setAway(rec: PlannedRecord, from: string, to: string): PlannedRecord {
  if (!day.safeParse(from).success || !day.safeParse(to).success) throw Error('Choose the day you are back.');
  if (to < from) throw Error('Choose a day from today on.');
  return plannedRecordSchema.parse({...rec, away: {from, to}});
}
export const clearAway = (rec: PlannedRecord): PlannedRecord => { const rest: Record<string, unknown> = {...rec}; delete rest.away; return plannedRecordSchema.parse(rest); };
/** The planned workouts the Agenda and the Day Timeline draw: still to do or missed, never one set aside or done. */
export function agendaPlanned(rec: PlannedRecord | null, w: Workouts | null, today: string): {id: string; date: string; title: string; time?: string | null; minutes?: number; href: string}[] {
  if (!rec) return [];
  const states = planStates(rec, w, today);
  return rec.items.filter(i => { const s = states.get(i.id); return s === 'planned' || s === 'missed'; }).map(i => ({id: i.id, date: i.date, title: i.name, ...(i.time ? {time: i.time} : {}), ...(i.minutes ? {minutes: i.minutes} : {}), href: '/app/health?view=workouts#workouts-plan'}));
}
/** A planned workout in a line: "Easy 5 km run · 18:00". */
export const plannedLine = (i: Planned) => `${i.name}${i.time ? ` · ${i.time}` : ''}${i.minutes ? ` · about ${i.minutes} min` : ''}`;
/**
 * Review B4E-12: after "Remove from the plan" focus goes to the next planned workout on the calendar (in its order), else
 * the one before, else nowhere on the calendar (the caller then focuses the plan form): never to the document.
 */
export function focusAfterRemove(order: readonly string[], removed: string): string | null {
  const at = order.indexOf(removed), rest = order.filter(id => id !== removed);
  if (!rest.length) return null;
  return at < 0 ? rest[0]! : rest[Math.min(at, rest.length - 1)]!;
}

