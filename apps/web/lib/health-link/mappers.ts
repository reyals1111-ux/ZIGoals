import type {HealthData} from '../health';
import {healthSchema} from '../health';
import {healthGroupIn, withHealthGroup} from '../vault/w-homes';
import {emptyItems, type ImportItems} from '../import/switch/apply';
import {buildNight, buildSession, buildVital, isoOf, LastOfDay, localDay, parseStamp, zoneFor} from '../import/switch/common';
import {activityImportId, weightImportId} from '../import/switch/ids';
import {workoutName} from '../import/switch/apple';
import type {LinkProvider} from './providers';

/**
 * A linked service's answers as Health records (Session W Part 8; field names and units from each provider's official
 * API reference, read 2026-10-07, listed in docs/run11/HEALTH_LINK_ACTIVATION.md). The same rules as an import:
 * deterministic ids (`<provider>-link` as the source), the source's own "asleep", stages only when complete, one source
 * per day, nothing estimated. Two rules of its own:
 * - a day's totals (steps, energy, weight) come only once the day has ended in the journal's zone, so the figure kept is
 *   final (a sync never replaces a record already in the journal);
 * - a value whose unit the reference does not state is not kept (Polar's daily calories, Oura's lowest heart rate),
 *   nor records the journal has no place for (Withings' meditation sessions, body fat).
 */
type Json = Record<string, unknown>;
type Ctx = {zone: string; now: number};
type Params = Record<string, string>;
/** The sync's window: the journal's day 30 days ago and today. */
export type LinkWindow = {fromDay: string; toDay: string; fromEpoch: number; toEpoch: number};
type Request = {name: string; params?: (w: LinkWindow) => Params; next?: (json: unknown, params: Params | undefined, page: number, w: LinkWindow) => Params | null};
const obj = (v: unknown): Json | null => v && typeof v === 'object' && !Array.isArray(v) ? v as Json : null;
const arr = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const num = (v: unknown): number | null => typeof v === 'number' && Number.isFinite(v) ? v : null;
const str = (v: unknown): string | null => typeof v === 'string' && v ? v : null;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** A calendar day plus n days ("2026-10-31" + 1 → "2026-11-01"). */
export const addDays = (day: string, n: number) => { const [y, m, d] = day.split('-').map(Number); return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10); };
const minDay = (a: string, b: string) => a < b ? a : b;
const ouraPage = (collection: string): Request => ({name: `oura.${collection}`, params: w => ({start_date: w.fromDay, end_date: w.toDay}), next: (json, params) => { const token = str(obj(json)?.next_token); return token ? {...params, next_token: token} : null; }});
/** Withings' getmeas, getactivity and getworkouts page with `offset` after `more` (an integer for getmeas, a boolean for the others). */
const withingsNext = (json: unknown, params: Params | undefined): Params | null => { const body = obj(obj(json)?.body), offset = num(body?.offset); return (body?.more === true || body?.more === 1) && offset !== null ? {...params, offset: String(offset)} : null; };
/**
 * The window in pieces of at most `days` days, oldest first, each piece its own call: Withings' sleep summary (its
 * reference says "a single call can span up to 7 days maximum" and documents no paging parameter for it) and Polar's
 * daily activity ("the maximum range between from and to is 28 days").
 */
const pieces = (name: string, fromKey: string, toKey: string, days: number): Request => ({
  name,
  params: w => ({[fromKey]: w.fromDay, [toKey]: minDay(addDays(w.fromDay, days - 1), w.toDay)}),
  next: (_json, params, _page, w) => { const last = params?.[toKey]; if (!last || last >= w.toDay) return null; const start = addDays(last, 1); return {[fromKey]: start, [toKey]: minDay(addDays(start, days - 1), w.toDay)}; },
});
/** Strava's default page size ("Defaults to 30"): a full page means there may be another. */
const STRAVA_PAGE = 30;
/** The requests one sync makes, in order, each with its window and its next page. */
export const LINK_REQUESTS: Record<LinkProvider, Request[]> = {
  oura: [ouraPage('sleep'), ouraPage('daily_activity'), ouraPage('session'), ouraPage('workout')],
  withings: [
    pieces('withings.sleep', 'startdateymd', 'enddateymd', 7),
    {name: 'withings.weight', params: w => ({startdate: String(w.fromEpoch), enddate: String(w.toEpoch)}), next: withingsNext},
    {name: 'withings.activity', params: w => ({startdateymd: w.fromDay, enddateymd: w.toDay}), next: withingsNext},
    {name: 'withings.workouts', params: w => ({startdateymd: w.fromDay, enddateymd: w.toDay}), next: withingsNext},
  ],
  polar: [{name: 'polar.sleep'}, pieces('polar.activities', 'from', 'to', 28), {name: 'polar.exercises'}],
  strava: [{name: 'strava.activities', params: w => ({after: String(w.fromEpoch), page: '1'}), next: (json, params, page) => arr(json).length === STRAVA_PAGE ? {...params, page: String(page + 2)} : null}],
};
const minutesFromIso = (text: string): number | null => { const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(text); return m && text !== 'PT' ? Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0) + Number(m[3] ?? 0) / 60 : null; };
const titled = (text: string) => text ? `${text[0]!.toUpperCase()}${text.slice(1).toLowerCase().replace(/_/g, ' ')}` : text;
function isZone(zone: string | null): zone is string { if (!zone) return false; try { new Intl.DateTimeFormat('en', {timeZone: zone}); return true; } catch { return false; } }

function ouraItems(responses: Record<string, unknown[]>, ctx: Ctx, items: ImportItems) {
  for (const page of responses['oura.sleep'] ?? []) for (const raw of arr(obj(page)?.data)) {
    const r = obj(raw); if (!r) continue;
    // "rest": falsely detected and rejected by the person; "deleted": deleted by the person.
    const type = str(r.type); if (type === 'rest' || type === 'deleted') continue;
    const start = parseStamp(str(r.bedtime_start) ?? ''), end = parseStamp(str(r.bedtime_end) ?? '');
    if (!start || !end) continue;
    const deep = num(r.deep_sleep_duration), rem = num(r.rem_sleep_duration), light = num(r.light_sleep_duration), total = num(r.total_sleep_duration), latency = num(r.latency);
    const night = buildNight('oura-link', {startMs: start.ms, endMs: end.ms, zone: zoneFor(end.ms, end.offset, ctx.zone).zone, now: ctx.now, ...(type === 'late_nap' ? {kind: 'nap' as const} : {}),
      ...(total !== null && total >= 0 ? {asleepMin: total / 60} : {}), ...(latency !== null && latency >= 0 ? {latencyMin: latency / 60} : {}),
      ...(deep !== null && rem !== null && light !== null ? {stages: {deepMin: deep / 60, remMin: rem / 60, coreMin: light / 60}} : {})});
    if (typeof night !== 'string') items.sleep.push(night);
  }
  for (const page of responses['oura.daily_activity'] ?? []) for (const raw of arr(obj(page)?.data)) {
    const r = obj(raw), day = str(r?.day), steps = num(r?.steps), kcal = num(r?.active_calories);
    if (!day || !DAY.test(day)) continue;
    if (steps !== null && steps >= 1) items.activity.push({id: activityImportId('oura-link', `steps|${day}`), date: day, name: 'Steps · Oura', steps: Math.round(steps), minutes: 0});
    // "Active calories expended in kilocalories."
    if (kcal !== null && kcal >= 0) { const v = buildVital('oura-link', day, {activeKcal: kcal}, ctx.now); if (v) items.vitals.push(v); }
  }
  for (const page of responses['oura.session'] ?? []) for (const raw of arr(obj(page)?.data)) {
    const r = obj(raw), type = str(r?.type), start = parseStamp(str(r?.start_datetime) ?? ''), end = parseStamp(str(r?.end_datetime) ?? '');
    if (!start || !end || (type !== 'meditation' && type !== 'breathing')) continue;
    const s = buildSession('oura-link', {startMs: start.ms, seconds: (end.ms - start.ms) / 1000, zone: zoneFor(start.ms, start.offset, ctx.zone).zone, now: ctx.now});
    if (typeof s !== 'string') items.meditation.push(s);
  }
  for (const page of responses['oura.workout'] ?? []) for (const raw of arr(obj(page)?.data)) {
    const r = obj(raw), start = parseStamp(str(r?.start_datetime) ?? ''), end = parseStamp(str(r?.end_datetime) ?? ''), activity = str(r?.activity) ?? 'workout';
    if (!start || !end) continue;
    const minutes = (end.ms - start.ms) / 60_000;
    if (minutes >= 1 && minutes <= 1440) items.activity.push({id: activityImportId('oura-link', `workout|${isoOf(start.ms)}`), date: localDay(start.ms, zoneFor(start.ms, start.offset, ctx.zone).zone), name: `${titled(activity)} · Oura`.slice(0, 120), steps: 0, minutes: Math.round(minutes)});
  }
}
function withingsItems(responses: Record<string, unknown[]>, ctx: Ctx, items: ImportItems) {
  const body = (page: unknown) => obj(obj(page)?.body);
  for (const page of responses['withings.sleep'] ?? []) for (const raw of arr(body(page)?.series)) {
    const r = obj(raw), d = obj(r?.data), start = num(r?.startdate), end = num(r?.enddate), zone = str(r?.timezone);
    if (start === null || end === null || !d) continue;
    // "Total time spent asleep", or, for a night from another source, "asleepduration" (its stage durations are null then).
    const deep = num(d.deepsleepduration), light = num(d.lightsleepduration), rem = num(d.remsleepduration), total = num(d.total_sleep_time) ?? num(d.asleepduration), latency = num(d.sleep_latency);
    const night = buildNight('withings-link', {startMs: start * 1000, endMs: end * 1000, zone: isZone(zone) ? zone : ctx.zone, now: ctx.now,
      ...(total !== null && total >= 0 ? {asleepMin: total / 60} : {}), ...(latency !== null && latency >= 0 ? {latencyMin: latency / 60} : {}),
      ...(deep !== null && light !== null && rem !== null ? {stages: {deepMin: deep / 60, remMin: rem / 60, coreMin: light / 60}} : {})});
    if (typeof night !== 'string') items.sleep.push(night);
  }
  const weights = new LastOfDay();
  for (const page of responses['withings.weight'] ?? []) {
    // getmeas gives one "timezone" for the whole answer, not one per group.
    const b = body(page), zone = str(b?.timezone), dayZone = isZone(zone) ? zone : ctx.zone;
    for (const raw of arr(b?.measuregrps)) {
      const g = obj(raw), at = num(g?.date);
      if (at === null) continue;
      // Type 1 is weight in kg: value × 10^unit.
      for (const m of arr(g?.measures)) { const x = obj(m); if (num(x?.type) !== 1) continue; const value = num(x?.value), unit = num(x?.unit); if (value === null || unit === null) continue; weights.add(localDay(at * 1000, dayZone), at * 1000, value * 10 ** unit * 1000); }
    }
  }
  for (const {date, value} of weights.entries()) if (value >= 1000 && value <= 1_000_000) items.weights.push({id: weightImportId('withings-link', date), date, grams: Math.round(value)});
  for (const page of responses['withings.activity'] ?? []) for (const raw of arr(body(page)?.activities)) {
    const r = obj(raw), day = str(r?.date), steps = num(r?.steps), active = num(r?.calories), total = num(r?.totalcalories);
    if (!day || !DAY.test(day)) continue;
    if (steps !== null && steps >= 1) items.activity.push({id: activityImportId('withings-link', `steps|${day}`), date: day, name: 'Steps · Withings', steps: Math.round(steps), minutes: 0});
    // "Active calories burned (in Kcal)"; "totalcalories" is active plus passive, so resting = total − active.
    const v = buildVital('withings-link', day, {...(active !== null ? {activeKcal: active} : {}), ...(active !== null && total !== null && total >= active ? {restingKcal: total - active} : {})}, ctx.now);
    if (v) items.vitals.push(v);
  }
  for (const page of responses['withings.workouts'] ?? []) for (const raw of arr(body(page)?.series)) {
    const r = obj(raw), category = num(r?.category), start = num(r?.startdate), end = num(r?.enddate), zone = str(r?.timezone);
    // 551 Meditation and 560 Breathing exercises: Withings' meditation sessions have no home in this release.
    if (start === null || end === null || category === 551 || category === 560) continue;
    const minutes = (end - start) / 60;
    if (minutes >= 1 && minutes <= 1440) items.activity.push({id: activityImportId('withings-link', `workout|${start}`), date: localDay(start * 1000, isZone(zone) ? zone : ctx.zone), name: 'Workout · Withings', steps: 0, minutes: Math.round(minutes)});
  }
}
function polarItems(responses: Record<string, unknown[]>, ctx: Ctx, items: ImportItems) {
  for (const page of responses['polar.sleep'] ?? []) for (const raw of arr(obj(page)?.nights)) {
    const r = obj(raw), start = parseStamp(str(r?.sleep_start_time) ?? ''), end = parseStamp(str(r?.sleep_end_time) ?? '');
    if (!start || !end) continue;
    // Seconds in each stage; sleep the watch could not place in a stage still counts as asleep, but then the stages are
    // incomplete and are not kept. Time awake between falling asleep and waking: "total_interruption_duration".
    const light = num(r?.light_sleep), deep = num(r?.deep_sleep), rem = num(r?.rem_sleep), unplaced = num(r?.unrecognized_sleep_stage) ?? 0, awake = num(r?.total_interruption_duration);
    const known = light !== null && deep !== null && rem !== null && unplaced >= 0;
    const night = buildNight('polar-link', {startMs: start.ms, endMs: end.ms, zone: zoneFor(end.ms, end.offset, ctx.zone).zone, now: ctx.now,
      ...(known ? {asleepMin: (deep! + rem! + light! + unplaced) / 60} : awake !== null && awake >= 0 ? {awakeMin: awake / 60} : {}),
      ...(known && unplaced === 0 ? {stages: {deepMin: deep! / 60, remMin: rem! / 60, coreMin: light! / 60}} : {})});
    if (typeof night !== 'string') items.sleep.push(night);
  }
  for (const page of responses['polar.activities'] ?? []) for (const raw of arr(page)) {
    // The day is "samples.date" ("Activity day date"); the start time is in UTC, so its date may be another day. The
    // daily calories are left out: the reference does not state their unit.
    const r = obj(raw), day = str(obj(r?.samples)?.date), steps = num(r?.steps);
    if (!day || !DAY.test(day)) continue;
    if (steps !== null && steps >= 1) items.activity.push({id: activityImportId('polar-link', `steps|${day}`), date: day, name: 'Steps · Polar', steps: Math.round(steps), minutes: 0});
  }
  for (const page of responses['polar.exercises'] ?? []) for (const raw of arr(page)) {
    // "start_time" is local time without an offset; "start_time_utc_offset" is that offset in minutes. The day is the
    // local one where it was lived.
    const r = obj(raw), local = str(r?.start_time) ?? '', start = parseStamp(local), offset = num(r?.start_time_utc_offset), minutes = minutesFromIso(str(r?.duration) ?? ''), sport = str(r?.sport) ?? 'Exercise';
    if (!start || minutes === null || minutes < 1 || minutes > 1440) continue;
    const key = start.offset !== null ? isoOf(start.ms) : offset !== null && Math.abs(offset) <= 14 * 60 ? isoOf(start.ms - offset * 60_000) : `local ${local}`;
    items.activity.push({id: activityImportId('polar-link', `workout|${key}`), date: local.slice(0, 10), name: `${titled(sport)} · Polar`.slice(0, 120), steps: 0, minutes: Math.round(minutes)});
  }
}
function stravaItems(responses: Record<string, unknown[]>, ctx: Ctx, items: ImportItems) {
  for (const page of responses['strava.activities'] ?? []) for (const raw of arr(page)) {
    const r = obj(raw), start = parseStamp(str(r?.start_date) ?? ''), seconds = num(r?.elapsed_time), sport = str(r?.sport_type) ?? str(r?.type) ?? 'Workout', id = num(r?.id);
    if (!start || seconds === null || id === null) continue;
    // "timezone" reads like "(GMT-08:00) America/Los_Angeles"; failing that, "start_date_local" holds the local date.
    const named = /\)\s+(\S+\/\S+)$/.exec(str(r?.timezone) ?? '')?.[1] ?? null, localDate = (str(r?.start_date_local) ?? '').slice(0, 10), minutes = seconds / 60;
    const date = isZone(named) ? localDay(start.ms, named) : DAY.test(localDate) ? localDate : localDay(start.ms, ctx.zone);
    if (minutes >= 1 && minutes <= 1440) items.activity.push({id: activityImportId('strava-link', `workout|${id}`), date, name: `${workoutName(sport)} · Strava`.slice(0, 120), steps: 0, minutes: Math.round(minutes)});
  }
}
/** Every answer of one sync as the records it brings (a day's totals only once that day has ended). */
export function mapResponses(provider: LinkProvider, responses: Record<string, unknown[]>, ctx: Ctx): ImportItems {
  const items = emptyItems();
  if (provider === 'oura') ouraItems(responses, ctx, items);
  else if (provider === 'withings') withingsItems(responses, ctx, items);
  else if (provider === 'polar') polarItems(responses, ctx, items);
  else stravaItems(responses, ctx, items);
  const today = localDay(ctx.now, ctx.zone);
  items.activity = items.activity.filter(a => a.steps === 0 || a.date < today);
  items.vitals = items.vitals.filter(v => v.date < today);
  items.weights = items.weights.filter(w => w.date < today);
  return items;
}
/** The journal without what a linked service brought (Disconnect → "Also remove what it brought"). */
export function removeLinkedRecords(health: HealthData, provider: LinkProvider): HealthData {
  const source = `${provider}-link`, prefixes = [`health_imp-${source}-`, `health_imw-${source}-`];
  let next: HealthData = {...health, activity: health.activity.filter(a => !a.id.startsWith(prefixes[0]!)), weights: health.weights.filter(w => !w.id.startsWith(prefixes[1]!))};
  const sleep = healthGroupIn(next, 'sleep'), meditation = healthGroupIn(next, 'meditation'), vitals = healthGroupIn(next, 'vitals');
  if (sleep?.nights.some(n => n.source === source)) next = withHealthGroup(next, 'sleep', {...sleep, nights: sleep.nights.filter(n => n.source !== source)}, false);
  if (meditation?.sessions.some(s => s.source === source)) next = withHealthGroup(next, 'meditation', {...meditation, sessions: meditation.sessions.filter(s => s.source !== source)}, false);
  if (vitals?.days.some(d => d.source === source)) next = withHealthGroup(next, 'vitals', {...vitals, days: vitals.days.filter(d => d.source !== source)}, false);
  return healthSchema.parse(next);
}
