import {addDays, inQuiet, toMinutes, wallClock, weekdayBit, weekdayOf, zonedInstant} from './zone';
import {eveningTime, moodTimes, morningTime, typeOn, type NotifyPrefs} from './prefs';
import type {EnergyInput} from './energy-items';

/**
 * Session AK Part 2 (ADR-036 Q3, A1, A2): the notification plan of this device, pure. From what the page already knows
 * it derives (1) the snapshot the service worker composes notifications from — the due items of the next 48 hours,
 * with time, kind, id, the numbers each text needs and, only when the person opted in to names and the device lock is
 * off, the item's name — and (2) the registration the push Worker gets: recurring wake minutes on weekday masks,
 * one-off wake minutes, and minutes to skip. The registration never carries a name, a kind, a count or an amount, and
 * the snapshot keeps an amount (a contribution or a bill) only where names are allowed.
 */
export type ItemKind = 'habit' | 'water' | 'windDown' | 'review' | 'morning' | 'evening' | 'contribution' | 'bill' | 'supplement' | 'vote' | 'unbonding' | 'validator' | 'task' | 'countdown' | 'journal' | 'money' | 'meal' | 'mood' | 'energy';
export type PlanItem = {at: number; kind: ItemKind; id: string; label?: string; detail?: string; href: string; actionable: boolean};
export type Snapshot = {v: 1; written: number; zone: string; labels: boolean; quiet: {from: string; to: string}; items: PlanItem[]; summary: {date: string; done: number; total: number}; prices: PriceWatch[]};
export type PriceWatch = {alertId: string; coin: string; currency: 'USD' | 'EUR'; direction: 'above' | 'below'; price: string; label?: string; request: unknown};
export type Registration = {wakes: {m: number; d: number}[]; once: number[]; skips: number[]};
export type PlanInput = {
  now: number; zone: string; prefs: NotifyPrefs; quiet: {from: string; to: string}; labels: boolean;
  /**
   * A habit with a reminder time: its weekday mask for the coming week and whether today is already done. `title` only for
   * a habit not linked to Health (ADR-010's rule, security review F4): a Health-linked habit never shows its name.
   */
  habits: {id: string; title?: string; time: string; weekdays: number; doneToday: boolean; routine?: boolean}[];
  water?: {time: string; toGo: string | null; done: boolean};
  windDown?: {time: string; doneToday: boolean};
  review?: {time: string; weekday: number};
  /** A contribution reminder per day it is due (today and tomorrow): the date, the formatted amount, and whether it is recorded. */
  contributions: {goalId: string; title: string; time: string; date: string; amount: string; done: boolean}[];
  bills: {id: string; title: string; due: string; amount: string}[];
  /** Session AK (F5): supplement and medication reminders — times and weekdays only; never a name or a dose. */
  supplements?: {id: string; time: string; weekdays: number; doneToday: boolean}[];
  /** Owner follow-up 1 (F4): the governance reminders the person set on a proposal (its own opt-in): when to remind, nothing else. */
  votes?: {id: string; at: number}[];
  /** Session AL sweep 4 (C-DVG-68, C-BN-06): unstaked ZIG back today, a validator not earning (lib/notify/staking-items.ts). */
  staking?: {kind: 'unbonding' | 'validator'; id: string; date: string}[];
  /**
   * Session AV (follow-up 1, F-TASK-NOTIFY; Todoist, TickTick, Things): the reminders the person set on open tasks
   * (lib/tasks/reminders.ts reminderInstants): the instant and the task's id; its title only where names are allowed.
   */
  tasks?: {id: string; title?: string; at: number; /** Session AV lane 2 (LEDGER #31): a reminder written in a note opens its note and has no Done. */ note?: string}[];
  /**
   * Session AV (1c, q1 #44; TickTick): the mornings a countdown's reminder reaches the device (lib/countdowns/extras.ts
   * countdownWakes): the day, the countdown's id, how many days are left then; its title only where names are allowed.
   */
  countdowns?: {id: string; title?: string; date: string; days: number}[];
  /**
   * Session AV lane 2 (journal; LEDGER #40, Day One): the reminder to write the person set in the Journal
   * (lib/journal/reminder.ts reminderPlanInput): its time and weekdays, the days of the window already written, and the
   * streak a new entry keeps. Never a word of the journal.
   */
  journal?: {time: string; weekdays: number; written: readonly string[]; streak: number};
  /**
   * Session AV lane 2 (money; Copilot's custom alerts, Rocket Money): a budget near or over its amount, payday tomorrow,
   * the low-balance line ahead (lib/money-notices.ts moneyWakes) — the day and an id; a title and detail for names-on only.
   */
  money?: {id: string; date: string; title?: string; detail?: string}[];
  /**
   * Session AV lane 2 (food, LEDGER #90; MyFitnessPal): the meal reminders the person switched on in Health, at each meal's
   * usual time (lib/food-plus/meal-notify.ts mealWakes); the meal's own name only where names are allowed, never food.
   */
  meals?: {meal: string; label?: string; time: string; doneToday: boolean}[];
  /** Session AV lane 2 (LEDGER #180): whether today's mood is already answered (the first check-in then stays quiet). */
  mood?: {doneToday: boolean};
  /**
   * Session AV lane 2 (bodymind-r2; LEDGER #235, #236, Rise): the energy curve's reminders and the plan steps with a
   * reminder (lib/notify/energy-items.ts energyItems): one-off instants and recurring clock times, each with the app's own
   * line; an own habit's name only as a label, shown where names are allowed. Never a sleep figure.
   */
  energy?: EnergyInput;
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
  const label = (text: string | undefined) => labels && text ? text.slice(0, 60) : undefined;
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
  if (typeOn(prefs, 'habits')) for (const h of input.habits) daily('habit', h.id, h.time, h.weekdays, () => ({label: label(h.title), href: h.routine ? `/app/habits#routine=${encodeURIComponent(h.id)}&open` : '/app/habits', actionable: true}), date => date === today && h.doneToday);
  // Session AK (F5): never labelled, whatever the names switch says (a supplement or medicine's name is health data).
  if (typeOn(prefs, 'supplements')) for (const s of input.supplements ?? []) daily('supplement', s.id, s.time, s.weekdays, () => ({href: '/app/health', actionable: false}), date => date === today && s.doneToday);
  if (typeOn(prefs, 'water') && input.water) { const w = input.water; daily('water', 'water', w.time, EVERY, () => ({...(w.toGo ? {detail: `${w.toGo} to go`} : {}), href: '/app/health', actionable: false}), date => date === today && w.done); }
  if (typeOn(prefs, 'windDown') && input.windDown) { const w = input.windDown; daily('windDown', 'wind-down', w.time, EVERY, () => ({href: '/app/health?view=sleep', actionable: false}), date => date === today && w.doneToday); }
  if (typeOn(prefs, 'review') && input.review) daily('review', 'review', input.review.time, weekdayBit(input.review.weekday), () => ({href: '/app/review', actionable: false}), () => false);
  // Session AV lane 2 (journal; LEDGER #40): the reminder to write, on its weekdays, unless that day already has an entry;
  // its line keeps the streak ("keeps your 4-day streak"), a count only, never a word of the journal.
  if (typeOn(prefs, 'journal') && input.journal) { const j = input.journal; daily('journal', 'journal', j.time, j.weekdays & EVERY, () => ({...(j.streak > 0 ? {detail: `keeps your ${j.streak}-day streak`} : {}), href: '/app/journal', actionable: false}), date => j.written.includes(date)); }
  if (typeOn(prefs, 'morning')) daily('morning', 'morning', morningTime(prefs), EVERY, () => ({href: '/app/checklist', actionable: false}), () => false);
  if (typeOn(prefs, 'evening')) daily('evening', 'evening', eveningTime(prefs), EVERY, () => ({href: '/app/review', actionable: false}), () => false);
  if (typeOn(prefs, 'meals')) for (const m of input.meals ?? []) daily('meal', `meal:${m.meal}`, m.time, EVERY, () => ({label: label(m.label), href: '/app/health?view=diary', actionable: false}), date => date === today && m.doneToday);
  // Session AV lane 2 (LEDGER #180, Daylio): the mood check-in opens the mood question (Health's mood card); never a mood
  // or a name. The first stays quiet once today's mood is answered; a second time asks again (the newer answer wins).
  if (typeOn(prefs, 'mood')) moodTimes(prefs).forEach((time, i) => daily('mood', i ? 'mood-2' : 'mood', time, EVERY, () => ({href: '/app/health?mood=ask', actionable: false}), date => i === 0 && date === today && !!input.mood?.doneToday));
  // Session AV lane 2 (bodymind-r2; LEDGER #235, #236): the energy curve's reminders and the plan steps' reminders. An
  // evening step is a recurring wake at its clock time (quiet once ticked that evening); the curve's and a morning step's
  // times follow the wake time, so each is a one-off wake, refused inside quiet hours as a task reminder is.
  if (typeOn(prefs, 'energy') && input.energy) {
    for (const d of input.energy.daily) daily('energy', d.id, d.time, EVERY, () => ({detail: d.detail, label: label(d.label), href: '/app/health?view=sleep', actionable: false}), date => d.done.includes(date));
    for (const o of input.energy.once) {
      if (o.at <= now || o.at > until) continue;
      const time = wallClock(o.at, zone).time;
      if (inQuiet(time, quiet)) { refused.push({kind: 'energy', time}); continue; }
      once.set(Math.floor(o.at / 60000), 'energy');
      push({at: o.at, kind: 'energy', id: o.id, detail: o.detail, label: label(o.label), href: '/app/health?view=sleep', actionable: false});
    }
  }
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
  // Session AV (F-TASK-NOTIFY): a task reminder is a one-off wake at its own instant (the time the person chose), as a
  // contribution is; one inside quiet hours is said on the card and does not wake the device. Labelled only with names on.
  if (typeOn(prefs, 'tasks')) for (const t of input.tasks ?? []) {
    if (t.at <= now || t.at > now + ONCE_AHEAD_DAYS * 86_400_000) continue;
    const time = wallClock(t.at, zone).time;
    if (inQuiet(time, quiet)) { refused.push({kind: 'task', time}); continue; }
    once.set(Math.floor(t.at / 60000), 'task');
    push(t.note ? {at: t.at, kind: 'task', id: `note:${t.note}@${t.at}`, label: label(t.title), href: `/app/notes?note=${encodeURIComponent(t.note)}`, actionable: false}
      : {at: t.at, kind: 'task', id: `task:${t.id}@${t.at}`, label: label(t.title), href: `/app/tasks#task-${t.id}`, actionable: true});
  }
  // Session AV (1c, q1 #44): a countdown's reminder wakes at the morning time (the end of quiet hours when the morning is
  // quiet) on the first day of its reminder and on its day, as bills do. Labelled only with names on.
  if (typeOn(prefs, 'countdowns')) for (const c of input.countdowns ?? []) {
    if (c.date < today || c.date > addDays(today, ONCE_AHEAD_DAYS)) continue;
    const at = zonedInstant(c.date, inQuiet(morningTime(prefs), quiet) ? quiet.to : morningTime(prefs), zone); if (at < now) continue;
    once.set(Math.floor(at / 60000), 'countdown');
    push({at, kind: 'countdown', id: `countdown:${c.id}@${c.date}`, label: label(c.title), detail: c.days === 0 ? 'today' : c.days === 1 ? 'tomorrow' : `in ${c.days} days`, href: '/app', actionable: false});
  }
  // Session AV lane 2 (money): a money notice wakes at the morning time of its day (the end of quiet hours when the morning
  // is quiet), as a countdown does; its words only with names on.
  if (typeOn(prefs, 'money')) for (const m of input.money ?? []) {
    if (m.date < today || m.date > addDays(today, ONCE_AHEAD_DAYS)) continue;
    const at = zonedInstant(m.date, inQuiet(morningTime(prefs), quiet) ? quiet.to : morningTime(prefs), zone); if (at < now) continue;
    once.set(Math.floor(at / 60000), 'money');
    push({at, kind: 'money', id: m.id, label: label(m.title), ...(labels && m.detail ? {detail: m.detail} : {}), href: '/app/wealth?view=budgets', actionable: false});
  }
  // Owner follow-up 1 (F4; security review F10 R3-F1, R3-F2): a vote reminder wakes at the person's morning time on the
  // day it falls due (a day before voting ends), as bills do — never at a minute derived from the proposal's public end
  // time, which would tell the push Worker which proposal this device follows. A morning inside quiet hours moves to
  // their end; a day whose morning has passed wakes now, unless now is quiet (then nothing). Never labelled.
  for (const v of input.votes ?? []) {
    const day = wallClock(v.at, zone).date, time = inQuiet(morningTime(prefs), quiet) ? quiet.to : morningTime(prefs);
    let at = zonedInstant(day, time, zone);
    if (at > now + ONCE_AHEAD_DAYS * 86_400_000) continue;
    if (at < now) { if (day !== today || inQuiet(wallClock(now, zone).time, quiet)) continue; at = Math.ceil(now / 60000) * 60000; }
    once.set(Math.floor(at / 60000), 'vote');
    push({at, kind: 'vote', id: v.id, href: '/app/governance', actionable: false});
  }
  // Session AL sweep 4 (C-DVG-68, C-BN-06): staking items sit at the morning time of their day (the end of quiet hours
  // when the morning is quiet) and ride the wakes already planned: they add no wake minute, so what the push Worker gets
  // is unchanged. Never labelled.
  for (const s of input.staking ?? []) {
    if (s.date < today) continue;
    const time = inQuiet(morningTime(prefs), quiet) ? quiet.to : morningTime(prefs);
    push({at: zonedInstant(s.date, time, zone), kind: s.kind, id: s.id, href: s.kind === 'unbonding' ? '/app/earn#staking-clarity' : '/app/staking', actionable: false});
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
/**
 * Session AK (journey bug J5-2): a "Snooze 1 h" tapped on a notification, as the service worker queues it
 * (lib/notify/db.ts QueuedAction, type 'snooze': the tap's time and the items it named). The worker moves the items an
 * hour on in the snapshot and adds that wake minute; the page, which rewrites the snapshot from the records, keeps both.
 */
export const SNOOZE_MS = 3_600_000;
export type Snooze = {at: number; items: {kind: string; id: string; at: number}[]};
/**
 * The plan with each live snooze kept: the snoozed item comes back at the tap's time plus an hour (with the text it had
 * then), and its minute stays in the one-off wakes. An item done since (or switched off) is no longer in the plan built
 * for the tap's moment from today's records, so it does not come back. A snooze stays live as long as the plan keeps a
 * passed item (an hour). Pure; `input` is the one the plan was built from.
 */
export function withSnoozes(plan: Plan, input: PlanInput, snoozes: readonly Snooze[], now: number): Plan {
  const live = snoozes.filter(s => Number.isFinite(s.at) && s.at <= now && s.at + SNOOZE_MS > now - SNOOZE_MS && Array.isArray(s.items) && s.items.length);
  if (!live.length) return plan;
  const items = [...plan.snapshot.items], once = new Set(plan.registration.once), seen = new Set(items.map(i => `${i.kind}:${i.id}:${i.at}`));
  const then = new Map<number, Plan>();
  for (const s of live) {
    const until = s.at + SNOOZE_MS, earlier = then.get(s.at) ?? buildPlan({...input, now: s.at});
    then.set(s.at, earlier);
    for (const wanted of s.items) {
      const matches = earlier.snapshot.items.filter(i => i.kind === wanted.kind && i.id === wanted.id && Math.abs(i.at - wanted.at) < 40 * 60_000);
      const item = matches.find(i => i.at === wanted.at) ?? matches[0];
      if (!item || seen.has(`${item.kind}:${item.id}:${until}`)) continue;
      seen.add(`${item.kind}:${item.id}:${until}`);
      items.push({...item, at: until});
      if (until > now) once.add(Math.floor(until / 60_000));
    }
  }
  items.sort((a, b) => a.at - b.at || a.kind.localeCompare(b.kind));
  const onceList = [...once].sort((a, b) => a - b).slice(0, MAX_WAKES), room = MAX_WAKES - onceList.length;
  const dropped = plan.dropped + Math.max(0, plan.registration.wakes.length - room);
  return {...plan, snapshot: {...plan.snapshot, items: items.slice(0, 200)}, registration: {...plan.registration, once: onceList, wakes: plan.registration.wakes.slice(0, room)}, dropped};
}
