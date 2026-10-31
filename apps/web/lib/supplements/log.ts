import {addLocalDays, localWeekday} from '../local-date';
import {EVERY_DAY, LOG_KEEP_DAYS, MAX_LOG, MAX_SUPPLEMENTS, supplementsSchema, type SupplementItem, type SupplementMark, type Supplements} from './schema';

/**
 * Session AK (F5b): the pure changes and views of the supplements and medication log (lib/supplements/schema.ts). Every
 * change validates the whole record. A day without a mark is "not logged": unknown, never counted as skipped or missed.
 */
export type SupplementDraft = {name: string; dose?: string; kind?: SupplementItem['kind']; times?: readonly string[]; weekdays?: number; note?: string; remind?: boolean};
/** The weekday mask bit of a calendar day (Monday = 1 … Sunday = 64), as the notification plan counts. */
export const dayBit = (date: string) => 1 << ((localWeekday(date) + 6) % 7);
export const scheduledOn = (item: Pick<SupplementItem, 'weekdays'>, date: string) => ((item.weekdays ?? EVERY_DAY) & dayBit(date)) !== 0;
const tidyTimes = (times: readonly string[] | undefined) => [...new Set((times ?? []).filter(Boolean))].sort();
const text = (value: string | undefined) => { const t = (value ?? '').replace(/\s+/g, ' ').trim(); return t || undefined; };
function itemFrom(draft: SupplementDraft, base: Pick<SupplementItem, 'id' | 'createdAt'>): SupplementItem {
  const name = text(draft.name);
  if (!name) throw new Error('Enter a name.');
  if (draft.weekdays !== undefined && !(draft.weekdays >= 1 && draft.weekdays <= EVERY_DAY)) throw new Error('Choose at least one day.');
  return {...base, name, ...(text(draft.dose) ? {dose: text(draft.dose)} : {}), kind: draft.kind ?? 'supplement', times: tidyTimes(draft.times), weekdays: draft.weekdays ?? EVERY_DAY, ...(text(draft.note) ? {note: text(draft.note)} : {}), ...(draft.remind ? {remind: true} : {})};
}
export function addSupplement(r: Supplements, draft: SupplementDraft, now: string, id = `supp_${crypto.randomUUID()}`): Supplements {
  if ((r.items ?? []).length >= MAX_SUPPLEMENTS) throw new Error(`At most ${MAX_SUPPLEMENTS} items on this device; remove one first.`);
  return supplementsSchema.parse({...r, items: [...(r.items ?? []), itemFrom(draft, {id, createdAt: now})]});
}
/** An item without the fields the form sets (a later build's own fields stay). */
function withoutChoices(item: SupplementItem): Record<string, unknown> {
  const rest: Record<string, unknown> = {...item};
  for (const key of ['name', 'dose', 'kind', 'times', 'weekdays', 'note', 'remind']) delete rest[key];
  return rest;
}
/** Changes an item; marks of a time it no longer has stay in the log (they happened) but are no longer shown for new days. */
export function editSupplement(r: Supplements, id: string, draft: SupplementDraft): Supplements {
  const prior = (r.items ?? []).find(i => i.id === id);
  if (!prior) throw new Error('This item is no longer here.');
  return supplementsSchema.parse({...r, items: (r.items ?? []).map(i => i.id === id ? {...withoutChoices(i), ...itemFrom(draft, {id, createdAt: prior.createdAt})} : i)});
}
/** Removes an item with its marks (the screen offers Undo). */
export function removeSupplement(r: Supplements, id: string): Supplements {
  return supplementsSchema.parse({...r, items: (r.items ?? []).filter(i => i.id !== id), log: (r.log ?? []).filter(m => m.itemId !== id)});
}
export const setSupplementReminder = (r: Supplements, id: string, on: boolean): Supplements =>
  supplementsSchema.parse({...r, items: (r.items ?? []).map(i => { if (i.id !== id) return i; const next: Record<string, unknown> = {...i}; if (on) next.remind = true; else delete next.remind; return next; })});
/**
 * Marks one dose of a day taken or skipped (`null` clears it). Keeps the log bounded: marks older than LOG_KEEP_DAYS before
 * `date` go first, then the oldest beyond MAX_LOG.
 */
export function markSupplement(r: Supplements, itemId: string, date: string, slot: string, status: SupplementMark['status'] | null, at: string): Supplements {
  if (!(r.items ?? []).some(i => i.id === itemId)) throw new Error('This item is no longer here.');
  const oldest = addLocalDays(date, -LOG_KEEP_DAYS);
  let log = (r.log ?? []).filter(m => !(m.itemId === itemId && m.date === date && m.slot === slot) && m.date >= oldest);
  if (status) log.push({itemId, date, slot, status, at});
  log.sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot) || a.itemId.localeCompare(b.itemId));
  if (log.length > MAX_LOG) log = log.slice(log.length - MAX_LOG);
  return supplementsSchema.parse({...r, log});
}
export type Dose = {itemId: string; name: string; dose?: string; kind: SupplementItem['kind']; slot: string; status: SupplementMark['status'] | null};
/** A day's doses in time order: each planned time on a scheduled weekday, then the as-needed items (slot "any"). */
export function dayDoses(r: Supplements, date: string): Dose[] {
  const marks = new Map((r.log ?? []).filter(m => m.date === date).map(m => [`${m.itemId}|${m.slot}`, m.status] as const));
  const out: Dose[] = [];
  for (const item of r.items ?? []) {
    const slots = item.times.length ? (scheduledOn(item, date) ? item.times : []) : ['any'];
    for (const slot of slots) out.push({itemId: item.id, name: item.name, ...(item.dose ? {dose: item.dose} : {}), kind: item.kind, slot, status: marks.get(`${item.id}|${slot}`) ?? null});
  }
  return out.sort((a, b) => (a.slot === 'any' ? 1 : 0) - (b.slot === 'any' ? 1 : 0) || a.slot.localeCompare(b.slot) || a.name.localeCompare(b.name));
}
export type SupplementSummary = {itemId: string; planned: number; taken: number; skipped: number; notLogged: number; days: number};
/**
 * The last `days` days through `today`, per item: planned doses (from the day the item was added), taken, skipped, and not
 * logged (unknown, said as such). An as-needed item counts only what was logged.
 */
export function supplementSummary(r: Supplements, today: string, days = 14): SupplementSummary[] {
  const from = addLocalDays(today, -(days - 1));
  return (r.items ?? []).map(item => {
    const since = item.createdAt.slice(0, 10) > from ? item.createdAt.slice(0, 10) : from;
    const marks = (r.log ?? []).filter(m => m.itemId === item.id && m.date >= since && m.date <= today);
    let planned = 0;
    if (item.times.length) for (let d = since; d <= today; d = addLocalDays(d, 1)) if (scheduledOn(item, d)) planned += item.times.length;
    const taken = marks.filter(m => m.status === 'taken').length, skipped = marks.filter(m => m.status === 'skipped').length;
    return {itemId: item.id, planned, taken, skipped, notLogged: Math.max(0, planned - taken - skipped), days};
  });
}
/**
 * Session AK (F5b) for lib/notify (the lead adds them to the plan input): one entry per reminder time of an item with its
 * reminder on, with its weekday mask and whether today's dose at that time is already marked. No name and no dose: the
 * notification says only that a reminder is due (Health-describing data never reaches a notification).
 */
export type SupplementReminder = {id: string; time: string; weekdays: number; doneToday: boolean};
export function supplementReminders(r: Supplements, today: string): SupplementReminder[] {
  const marked = new Set((r.log ?? []).filter(m => m.date === today).map(m => `${m.itemId}|${m.slot}`));
  return (r.items ?? []).filter(i => i.remind && i.times.length).flatMap(i => i.times.map(time => ({id: `supplement:${i.id}:${time}`, time, weekdays: i.weekdays ?? EVERY_DAY, doneToday: marked.has(`${i.id}|${time}`)})));
}
