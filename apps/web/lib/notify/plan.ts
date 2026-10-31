import {addDays, inQuiet, toMinutes, wallClock, weekdayBit, weekdayOf, zonedInstant} from './zone';
import {eveningTime, morningTime, typeOn, type NotifyPrefs} from './prefs';

/**
 * Session AK Part 2 (ADR-036 Q3, A1, A2): the notification plan of this device, pure. From what the page already knows
 * it derives (1) the snapshot the service worker composes notifications from — the due items of the next 48 hours,
 * with time, kind, id, the numbers each text needs and, only when the person opted in to names and the device lock is
 * off, the item's name — and (2) the registration the push Worker gets: recurring wake minutes on weekday masks,
 * one-off wake minutes, and minutes to skip. The registration never carries a name, a kind, a count or an amount, and
 * the snapshot keeps an amount (a contribution or a bill) only where names are allowed.
 */
export type ItemKind = 'habit' | 'water' | 'windDown' | 'review' | 'morning' | 'evening' | 'contribution' | 'bill';
export type PlanItem = {at: number; kind: ItemKind; id: string; label?: string; detail?: string; href: string; actionable: boolean};
export type Snapshot = {v: 1; written: number; zone: string; labels: boolean; quiet: {from: string; to: string}; items: PlanItem[]; summary: {date: string; done: number; total: number}; prices: PriceWatch[]};
export type PriceWatch = {alertId: string; coin: string; currency: 'USD' | 'EUR'; direction: 'above' | 'below'; price: string; label?: string; request: unknown};
export type Registration = {wakes: {m: number; d: number}[]; once: number[]; skips: number[]};
export type PlanInput = {
  now: number; zone: string; prefs: NotifyPrefs; quiet: {from: string; to: string}; labels: boolean;
  /** A habit with a reminder time: its weekday mask for the coming week and whether today is already done. */
  habits: {id: string; title: string; time: string; weekdays: number; doneToday: boolean}[];
  water?: {time: string; toGo: string | null; done: boolean};
  windDown?: {time: string; doneToday: boolean};
  review?: {time: string; weekday: number};
  /** A contribution reminder per day it is due (today and tomorrow): the date, the formatted amount, and whether it is recorded. */
  contributions: {goalId: string; title: string; time: string; date: string; amount: string; done: boolean}[];
  bills: {id: string; title: string; due: string; amount: string}[];
  orbit: {done: number; total: number};
  prices: PriceWatch[];
};
export const MAX_WAKES = 48, WINDOW_MS = 48 * 3_600_000, ONCE_AHEAD_DAYS = 30;
export type Plan = {snapshot: Snapshot; registration: Registration; refused: {kind: ItemKind; time: string}[]; dropped: number};

/** A copy without its `label` (no name may reach the snapshot without the opt-in). */
function withoutLabel<T extends {label?: string}>(value: T): Omit<T, 'label'> { const copy = {...value}; delete copy.label; return copy; }

export function buildPlan(input: PlanInput): Plan {
  const {now, zone, prefs, quiet, labels} = input, today = wallClock(now, zone).date, until = now + WINDOW_MS;
  const items: PlanItem[] = [], recurring: {m: number; d: number; kind: ItemKind; id: string; done: (date: string) => boolean}[] = [], once = new Map<number, ItemKind>(), refused: Plan['refused'] = [];
  const dates = [today, addDays(today, 1), addDays(today, 2)];
  const label = (text: string) => labels ? text.slice(0, 60) : undefined;
  const push = (item: Omit<PlanItem, 'label'> & {label?: string}) => { if (item.at > now - 3_600_000 && item.at <= until) items.push(item.label === undefined ? withoutLabel(item) as PlanItem : item as PlanItem); };
  /** A recurring reminder: refused inside quiet hours (said on the card), otherwise a wake and its items for 48 h. */
  const daily = (kind: ItemKind, id: string, time: string, mask: number, make: (date: string, at: number) => Omit<PlanItem, 'at' | 'kind' | 'id'> | null, done: (date: string) => boolean) => {
    if (!mask) return;
    if (inQuiet(time, quiet)) { refused.push({kind, time}); return; }
    recurring.push({m: toMinutes(time), d: mask, kind, id, done});
    for (const date of dates) {
      if (!(mask & weekdayBit(weekdayOf(date)))) continue;
      const at = zonedInstant(date, time, zone), made = done(date) ? null : make(date, at);
      if (made) push({at, kind, id, ...made});
    }
  };
  const EVERY = 127;
  if (typeOn(prefs, 'habits')) for (const h of input.habits) daily('habit', h.id, h.time, h.weekdays, () => ({label: label(h.title), href: '/app/habits', actionable: true}), date => date === today && h.doneToday);
  if (typeOn(prefs, 'water') && input.water) { const w = input.water; daily('water', 'water', w.time, EVERY, () => ({...(w.toGo ? {detail: `${w.toGo} to go`} : {}), href: '/app/health', actionable: false}), date => date === today && w.done); }
  if (typeOn(prefs, 'windDown') && input.windDown) { const w = input.windDown; daily('windDown', 'wind-down', w.time, EVERY, () => ({href: '/app/health?view=sleep', actionable: false}), date => date === today && w.doneToday); }
  if (typeOn(prefs, 'review') && input.review) daily('review', 'review', input.review.time, weekdayBit(input.review.weekday), () => ({href: '/app/review', actionable: false}), () => false);
  if (typeOn(prefs, 'morning')) daily('morning', 'morning', morningTime(prefs), EVERY, () => ({href: '/app/checklist', actionable: false}), () => false);
  if (typeOn(prefs, 'evening')) daily('evening', 'evening', eveningTime(prefs), EVERY, () => ({href: '/app/review', actionable: false}), () => false);
  // One-off wakes: contributions on the days they are due (today, tomorrow), bills on the morning before they are due.
  if (typeOn(prefs, 'contributions')) for (const c of input.contributions) {
    if (c.done || inQuiet(c.time, quiet)) continue;
    const at = zonedInstant(c.date, c.time, zone); if (at < now) continue;
    once.set(Math.floor(at / 60000), 'contribution');
    push({at, kind: 'contribution', id: `contribution:${c.goalId}`, label: label(c.title), ...(labels && c.amount ? {detail: `${c.amount} due`} : {}), href: `/app/goals/tracked/${encodeURIComponent(c.goalId)}?contribute=1`, actionable: false});
  }
  if (typeOn(prefs, 'bills')) for (const b of input.bills) {
    const day = addDays(b.due, -1); if (day < today || day > addDays(today, ONCE_AHEAD_DAYS)) continue;
    const at = zonedInstant(day, morningTime(prefs), zone); if (at < now) continue;
    once.set(Math.floor(at / 60000), 'bill');
    push({at, kind: 'bill', id: `bill:${b.id}`, label: label(b.title), ...(labels && b.amount ? {detail: `${b.amount} due tomorrow`} : {}), href: '/app/wealth?view=bills', actionable: false});
  }
  // Wakes: one per minute of the day, its weekday masks joined; skips: today's instants whose items are all done.
  const byMinute = new Map<number, number>();
  for (const r of recurring) byMinute.set(r.m, (byMinute.get(r.m) ?? 0) | r.d);
  const skips: number[] = [];
  for (const [m, d] of byMinute) for (const date of dates.slice(0, 2)) {
    if (!(d & weekdayBit(weekdayOf(date)))) continue;
    const here = recurring.filter(r => r.m === m && r.d & weekdayBit(weekdayOf(date)));
    const at = zonedInstant(date, `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, zone);
    if (at > now && here.every(r => r.done(date))) skips.push(Math.floor(at / 60000));
  }
  // A one-off at a skipped minute keeps that minute: the Worker never skips what a one-off still needs.
  for (let i = skips.length - 1; i >= 0; i--) if (once.has(skips[i]!)) skips.splice(i, 1);
  let wakes = [...byMinute].map(([m, d]) => ({m, d})).sort((a, b) => a.m - b.m), onceList = [...once.keys()].sort((a, b) => a - b);
  // The cap: the earliest one-offs first (they are dated), then the earliest recurring wakes.
  const room = MAX_WAKES - Math.min(onceList.length, MAX_WAKES), dropped = Math.max(0, onceList.length - MAX_WAKES) + Math.max(0, wakes.length - room);
  onceList = onceList.slice(0, MAX_WAKES); wakes = wakes.slice(0, room);
  items.sort((a, b) => a.at - b.at || a.kind.localeCompare(b.kind));
  return {
    snapshot: {v: 1, written: now, zone, labels, quiet, items: items.slice(0, 200), summary: {date: today, ...input.orbit}, prices: typeOn(prefs, 'prices') ? input.prices.slice(0, 20).map(p => labels ? p : withoutLabel(p)) : []},
    registration: {wakes, once: onceList, skips: skips.sort((a, b) => a - b).slice(0, 96)},
    refused, dropped,
  };
}
/** A stable string of the registration, to send it again only when it changed. */
export const registrationKey = (zone: string, quiet: {from: string; to: string}, r: Registration) => JSON.stringify([zone, quiet.from, quiet.to, r.wakes, r.once, r.skips]);
