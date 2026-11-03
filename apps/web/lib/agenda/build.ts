import {habitDay, habitRuleOn, type Habit, type HabitData, type HabitRule} from '../habits';
import type {HealthData} from '../health';
import {dailyData} from '../health-daily';
import {addLocalDays, localWeekday} from '../local-date';
import {planScenario, type Platform, type PrivateGoal} from '../positions';
import {revisionInstallments} from '../plan-revisions';
import {scheduledFundingCredits} from '../goal-intelligence';
import {dueDatesBetween} from '../bills/cadence';
import type {BillsRecord} from '../bills/schema';
import type {Workouts} from '../workouts/schema';
import {PLAN_LABELS, type RemindersPlan} from '../reminders-plan/schema';
import type {WeeklyReview} from '../weekly-review/schema';
import {MEAL_TIMES, PART_OF_DAY} from '../timeline/build';
import {wallClock} from '../zone-time';

/**
 * The agenda (Session AK, F5d): one calendar of the person's own plans, read from each page's own record — habits on
 * their scheduled days, planned goal contributions, bills on their due dates, workouts (done, and planned ones another
 * feature passes in), planned meals, unbonding dates (passed in) and the weekly review and goal check-in from the
 * reminders plan. Pure: nothing is stored here and nothing is written. A day, a week or a month at a time
 * (`agendaRange`); every item says where it lives (`href`), so a tap opens the page that owns it.
 *
 * No amounts: a bill, a contribution or an unbonding shows its name and day, never a figure (the agenda can be exported,
 * and Hide amounts would not reach it). "Unknown is not zero": a goal whose plan cannot be worked out is left out, never
 * shown as nothing due.
 */
export const AGENDA_SOURCES = ['habit', 'contribution', 'bill', 'workout', 'meal', 'unbonding', 'review'] as const;
export type AgendaSource = (typeof AGENDA_SOURCES)[number];
export const SOURCE_LABEL: Record<AgendaSource, string> = {habit: 'Habits', contribution: 'Contributions', bill: 'Bills', workout: 'Workouts', meal: 'Meals', unbonding: 'Unbonding', review: 'Reviews'};
export type AgendaPillar = 'goals' | 'habits' | 'health' | 'wealth';
export const SOURCE_PILLAR: Record<AgendaSource, AgendaPillar> = {habit: 'habits', contribution: 'goals', bill: 'wealth', workout: 'health', meal: 'health', unbonding: 'wealth', review: 'goals'};
export type AgendaState = 'done' | 'skipped' | 'open';
export type AgendaItem = {
  /** Stable for the item on its day: `<source>:<key>:<date>` (the .ics UID is made from it). */
  id: string;
  source: AgendaSource; pillar: AgendaPillar;
  date: string;
  /** A wall-clock time ("HH:MM") where the record gives one; null is any time of the day. */
  time: string | null;
  /** Its length in minutes when it has a time (for an exported event); 0 is a moment. */
  minutes: number;
  title: string;
  detail?: string;
  href: string;
  state: AgendaState;
  /** A fictional Showcase item. */
  example?: boolean;
};
export type AgendaDay = {date: string; items: AgendaItem[]};
/** A planned workout another feature passes in (the workout log keeps only finished ones). */
export type AgendaPlanned = {id: string; date: string; title: string; time?: string | null; minutes?: number; href?: string; example?: boolean};
/** An unbonding date (Wealth's unbonding events, passed in by the page). */
export type AgendaUnbonding = {id: string; date: string; title: string; detail?: string; href?: string; example?: boolean};
export type AgendaInput = {
  today: string;
  /** Now, for plan instalments already funded (ms). */
  now: number;
  /** The device's zone, for the clock time of a finished workout. */
  zone?: string;
  habits?: HabitData | null;
  /** Each habit's own time (zigoals:habit-extras:v1 `times`) and its reminder time: the time the Day timeline uses too. */
  habitTimes?: Readonly<Record<string, string>>;
  habitReminders?: Readonly<Record<string, {time: string}>>;
  platform?: Platform | null;
  bills?: BillsRecord | null;
  workouts?: Workouts | null;
  plannedWorkouts?: readonly AgendaPlanned[] | null;
  health?: HealthData | null;
  unbonding?: readonly AgendaUnbonding[] | null;
  plan?: RemindersPlan | null;
  weeklyReview?: Pick<WeeklyReview, 'weekday' | 'reviews'> | null;
  /** Sources the person hid. */
  hidden?: readonly AgendaSource[];
};

export const MAX_RANGE_DAYS = 62, MAX_ITEMS = 4000, ITEM_MINUTES = 30;
const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/, DAY = /^\d{4}-\d{2}-\d{2}$/;
const clock = (t: string | null | undefined) => t && CLOCK.test(t) ? t : null;
const daysOf = (from: string, to: string) => { const out: string[] = []; for (let d = from; d <= to && out.length < MAX_RANGE_DAYS; d = addLocalDays(d, 1)) out.push(d); return out; };
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

/* ---- Views ---------------------------------------------------------------------------------------------------- */
export const AGENDA_VIEWS = ['day', 'week', 'month'] as const;
export type AgendaView = (typeof AGENDA_VIEWS)[number];
/** Monday of the week a day is in (weeks start on Monday, as habits' weeks do). */
export const weekStartOf = (date: string) => addLocalDays(date, -((localWeekday(date) + 6) % 7));
const monthEnd = (date: string) => { const [y, m] = date.split('-').map(Number); return addLocalDays(`${m === 12 ? y! + 1 : y}-${String(m === 12 ? 1 : m! + 1).padStart(2, '0')}-01`, -1); };
/**
 * The days a view shows around its anchor. A month is its whole weeks (Monday before the 1st to Sunday after the last),
 * so a grid has no gaps; `inMonth` says which days belong to the month itself.
 */
export function agendaRange(view: AgendaView, anchor: string): {from: string; to: string; first: string; last: string} {
  if (!DAY.test(anchor)) throw new Error('Choose a real calendar date.');
  if (view === 'day') return {from: anchor, to: anchor, first: anchor, last: anchor};
  if (view === 'week') { const from = weekStartOf(anchor); return {from, to: addLocalDays(from, 6), first: from, last: addLocalDays(from, 6)}; }
  const first = `${anchor.slice(0, 7)}-01`, last = monthEnd(anchor);
  return {from: weekStartOf(first), to: addLocalDays(weekStartOf(last), 6), first, last};
}
/** The anchor one view before or after (a month keeps its day where the month has it, else its last day). */
export function shiftAnchor(view: AgendaView, anchor: string, by: -1 | 1): string {
  if (view === 'day') return addLocalDays(anchor, by);
  if (view === 'week') return addLocalDays(anchor, 7 * by);
  const [y, m, d] = anchor.split('-').map(Number), month = m! - 1 + by, year = y! + Math.floor(month / 12), mm = ((month % 12) + 12) % 12 + 1;
  const first = `${year}-${String(mm).padStart(2, '0')}-01`, last = monthEnd(first);
  return Number(last.slice(8)) < d! ? last : `${first.slice(0, 8)}${String(d).padStart(2, '0')}`;
}

/* ---- Habits --------------------------------------------------------------------------------------------------- */
/** Whether a habit's rule falls on a day (lib/habits.ts's own recurrence, read here for days ahead too). */
export function ruleFallsOn(rule: HabitRule, date: string): boolean {
  if (rule.state !== 'active') return false;
  if (rule.endCondition.kind === 'date' && date > rule.endCondition.date) return false;
  const s = rule.schedule;
  if (s.kind === 'daily') return true;
  if (s.kind === 'weekdays') return s.days.includes(localWeekday(date));
  if (s.kind === 'interval') return date >= s.anchor && daysBetween(s.anchor, date) % s.every === 0;
  if (s.kind === 'month-dates') return s.days.includes(Number(date.slice(8)));
  return false; // frequency: any days in its period (see below)
}
const periodStart = (date: string, period: 'week' | 'month' | 'year') => period === 'week' ? weekStartOf(date) : period === 'month' ? `${date.slice(0, 7)}-01` : `${date.slice(0, 4)}-01-01`;
const TIMES_WORD = (n: number, period: string) => `${n === 1 ? 'Once' : n === 2 ? 'Twice' : `${n} times`} this ${period}, any day`;

function habitItems(h: Habit, days: readonly string[], input: AgendaInput): AgendaItem[] {
  const out: AgendaItem[] = [], seenPeriods = new Set<string>();
  const time = clock(input.habitTimes?.[h.id]) ?? clock(input.habitReminders?.[h.id]?.time) ?? (h.timeOfDay === 'anytime' ? null : PART_OF_DAY[h.timeOfDay]);
  for (const date of days) {
    if (date < h.startDate) continue;
    const rule = habitRuleOn(h, date);
    if (!rule || rule.state !== 'active') continue;
    let detail: string | undefined;
    if (rule.schedule.kind === 'frequency') {
      // A habit done "3 times a week" has no fixed days: it shows once, on the first day of its period in view.
      const key = `${rule.schedule.period}:${periodStart(date, rule.schedule.period)}`;
      if (seenPeriods.has(key) || (rule.endCondition.kind === 'date' && date > rule.endCondition.date)) continue;
      seenPeriods.add(key);
      detail = TIMES_WORD(rule.schedule.times, rule.schedule.period);
    } else if (!ruleFallsOn(rule, date)) continue;
    const day = habitDay(h, date, input.today);
    const state: AgendaState = rule.schedule.kind === 'frequency' ? 'open' : day.status === 'complete' ? 'done' : day.status === 'skipped' || day.status === 'planned-skip' ? 'skipped' : 'open';
    out.push({id: `habit:${h.id}:${date}`, source: 'habit', pillar: 'habits', date, time, minutes: time ? 20 : 0, title: h.title, ...(detail ? {detail} : {}), href: `/app/habits#habit-${h.id}`, state});
  }
  return out;
}

/* ---- Contributions -------------------------------------------------------------------------------------------- */
function contributionItems(platform: Platform, from: string, to: string, now: number): AgendaItem[] {
  const out: AgendaItem[] = [];
  for (const g of platform.goals) {
    if (g.status !== 'active' || g.type === 'PROJECT') continue;
    try { out.push(...goalPlanItems(platform, g, from, to, now)); } catch { /* a plan that cannot be worked out is left out, never shown as nothing due */ }
  }
  return out;
}
function goalPlanItems(platform: Platform, g: PrivateGoal, from: string, to: string, now: number): AgendaItem[] {
  const item = (date: string, done: boolean): AgendaItem => ({id: `contribution:${g.id}:${date}`, source: 'contribution', pillar: 'goals', date, time: null, minutes: 0, title: `Contribution · ${g.name}`, detail: done ? 'Funded' : 'Planned contribution', href: `/app/goals/tracked/${encodeURIComponent(g.id)}#funding-wealth`, state: done ? 'done' : 'open'});
  if (g.planRevisions?.length) return revisionInstallments(g, from, to, platform.contributions, now).map(x => item(x.date, BigInt(x.remaining) === 0n));
  if (!g.plan?.active) return [];
  const start = from > g.plan.nextDate ? from : g.plan.nextDate;
  if (start > to) return [];
  const all = planScenario(g, '0', g.plan, to, start).dates, open = new Set(planScenario(g, '0', g.plan, to, start, scheduledFundingCredits(platform, g, now)).dates);
  return all.map(date => item(date, !open.has(date)));
}

/* ---- Bills, workouts, meals, unbonding, reviews ---------------------------------------------------------------- */
const CADENCE_WORD = {weekly: 'Weekly bill', monthly: 'Monthly bill', quarterly: 'Quarterly bill', yearly: 'Yearly bill'} as const;
// A bill's day passing says nothing about whether it was paid, so a bill never reads as done.
function billItems(bills: BillsRecord, from: string, to: string): AgendaItem[] {
  const out: AgendaItem[] = [];
  for (const b of bills.bills) {
    let dates: string[] = [];
    try { dates = dueDatesBetween(b.nextDue, b.cadence, from, to); } catch { dates = []; }
    for (const date of dates) out.push({id: `bill:${b.id}:${date}`, source: 'bill', pillar: 'wealth', date, time: null, minutes: 0, title: b.title, detail: `${CADENCE_WORD[b.cadence]} due`, href: '/app/wealth?view=bills', state: 'open'});
    if (b.cancelBy && b.cancelBy >= from && b.cancelBy <= to) out.push({id: `bill-note:${b.id}:${b.cancelBy}`, source: 'bill', pillar: 'wealth', date: b.cancelBy, time: null, minutes: 0, title: `Decide on ${b.title}`, detail: 'Your note to self', href: '/app/wealth?view=bills', state: 'open'});
  }
  return out;
}
function workoutItems(input: AgendaInput, from: string, to: string): AgendaItem[] {
  const out: AgendaItem[] = [];
  for (const w of input.workouts?.workouts ?? []) {
    if (!w.endedAt || w.date < from || w.date > to) continue;
    let time: string | null = null;
    if (input.zone) try { const c = wallClock(Date.parse(w.startedAt), input.zone); if (c.date === w.date) time = c.clock; } catch { time = null; }
    const minutes = Math.max(5, Math.min(600, Math.round((Date.parse(w.endedAt) - Date.parse(w.startedAt)) / 60_000) || ITEM_MINUTES));
    out.push({id: `workout:${w.id}:${w.date}`, source: 'workout', pillar: 'health', date: w.date, time, minutes: time ? minutes : 0, title: w.name, detail: 'Workout done', href: '/app/health?view=workouts', state: 'done'});
  }
  for (const p of input.plannedWorkouts ?? []) {
    if (!DAY.test(p.date) || p.date < from || p.date > to) continue;
    const time = clock(p.time);
    out.push({id: `workout-plan:${p.id}:${p.date}`, source: 'workout', pillar: 'health', date: p.date, time, minutes: time ? Math.max(5, Math.min(600, p.minutes ?? 45)) : 0, title: p.title.slice(0, 120), detail: 'Planned workout', href: p.href ?? '/app/health?view=workouts', state: 'open', ...(p.example ? {example: true} : {})});
  }
  return out;
}
function mealItems(health: HealthData, from: string, to: string): AgendaItem[] {
  return dailyData(health).plans.filter(p => p.date >= from && p.date <= to).map(p => {
    const time = MEAL_TIMES[p.meal as keyof typeof MEAL_TIMES] ?? null;
    return {id: `meal:${p.id}:${p.date}`, source: 'meal' as const, pillar: 'health' as const, date: p.date, time, minutes: time ? 30 : 0, title: `${p.meal}: ${p.name}`, detail: p.loggedAt ? 'Logged' : 'Planned meal', href: '/app/health#planner', state: p.loggedAt ? 'done' as const : 'open' as const};
  });
}
function unbondingItems(list: readonly AgendaUnbonding[], from: string, to: string, today: string): AgendaItem[] {
  return list.filter(u => DAY.test(u.date) && u.date >= from && u.date <= to).map(u => ({id: `unbonding:${u.id}:${u.date}`, source: 'unbonding' as const, pillar: 'wealth' as const, date: u.date, time: null, minutes: 0, title: u.title.slice(0, 120), detail: u.detail?.slice(0, 160) ?? (u.date < today ? 'Unbonding ended' : 'Unbonding ends'), href: u.href ?? '/app/staking', state: u.date < today ? 'done' as const : 'open' as const, ...(u.example ? {example: true} : {})}));
}
function reviewItems(input: AgendaInput, days: readonly string[]): AgendaItem[] {
  const out: AgendaItem[] = [], review = input.plan?.items?.review, checkin = input.plan?.items?.['goal-checkin'];
  // One review day, Settings' (the weekly review's own weekday), as the reminder cards use (Session AH, SE2).
  const weekday = input.weeklyReview?.weekday ?? review?.weekday ?? 0;
  for (const date of days) {
    if (review?.on && localWeekday(date) === weekday) {
      const time = clock(review.time) ?? PLAN_LABELS.review.defaultTime, weekStart = addLocalDays(date, -6);
      const r = input.weeklyReview?.reviews.find(x => x.weekStart === weekStart);
      out.push({id: `review:weekly:${date}`, source: 'review', pillar: 'goals', date, time, minutes: 30, title: PLAN_LABELS.review.title, detail: 'A short look back at your week', href: '/app/review', state: r?.completedAt ? 'done' : r?.skipped ? 'skipped' : 'open'});
    }
    if (checkin?.on && localWeekday(date) === (checkin.weekday ?? 0)) {
      const time = clock(checkin.time) ?? PLAN_LABELS['goal-checkin'].defaultTime;
      out.push({id: `review:goal-checkin:${date}`, source: 'review', pillar: 'goals', date, time, minutes: 15, title: PLAN_LABELS['goal-checkin'].title, detail: PLAN_LABELS['goal-checkin'].blurb, href: '/app/goals', state: 'open'});
    }
  }
  return out;
}

const ORDER: Record<AgendaSource, number> = {review: 0, habit: 1, meal: 2, workout: 3, contribution: 4, bill: 5, unbonding: 6};
/** Items without a time first (they belong to the whole day), then by time; within that by source and title. */
export const compareItems = (a: AgendaItem, b: AgendaItem) => (a.time === null ? -1 : 0) - (b.time === null ? -1 : 0) || (a.time ?? '').localeCompare(b.time ?? '') || ORDER[a.source] - ORDER[b.source] || a.title.localeCompare(b.title);

/** Every item from `from` to `to` (at most 62 days), by day. A source that cannot be read is left out, never guessed. */
export function buildAgenda(input: AgendaInput, from: string, to: string): AgendaDay[] {
  if (!DAY.test(from) || !DAY.test(to) || from > to) throw new Error('Choose a real range of days.');
  const days = daysOf(from, to), end = days.at(-1)!, hidden = new Set(input.hidden ?? []), items: AgendaItem[] = [];
  const add = (source: AgendaSource, make: () => AgendaItem[]) => { if (hidden.has(source)) return; try { items.push(...make()); } catch { /* left out */ } };
  add('habit', () => (input.habits?.habits ?? []).flatMap(h => habitItems(h, days, input)));
  add('contribution', () => input.platform ? contributionItems(input.platform, from, end, input.now) : []);
  add('bill', () => input.bills ? billItems(input.bills, from, end) : []);
  add('workout', () => workoutItems(input, from, end));
  add('meal', () => input.health ? mealItems(input.health, from, end) : []);
  add('unbonding', () => input.unbonding ? unbondingItems(input.unbonding, from, end, input.today) : []);
  add('review', () => reviewItems(input, days));
  const byDay = new Map<string, AgendaItem[]>(days.map(d => [d, []]));
  for (const item of items.slice(0, MAX_ITEMS)) byDay.get(item.date)?.push(item);
  return days.map(date => ({date, items: byDay.get(date)!.sort(compareItems)}));
}

/** What each source holds at all (not only in view), for the empty start: a source with nothing yet teaches how to add it. */
export function sourcesWithRecords(input: AgendaInput): Set<AgendaSource> {
  const out = new Set<AgendaSource>();
  if (input.habits?.habits.some(h => h.rules.at(-1)?.state === 'active')) out.add('habit');
  if (input.platform?.goals.some(g => g.status === 'active' && g.type !== 'PROJECT' && (g.plan?.active || g.planRevisions?.some(r => r.terms?.active)))) out.add('contribution');
  if (input.bills?.bills.length) out.add('bill');
  if (input.workouts?.workouts.some(w => w.endedAt) || input.plannedWorkouts?.length) out.add('workout');
  if (input.health && dailyData(input.health).plans.length) out.add('meal');
  if (input.unbonding?.length) out.add('unbonding');
  if (input.plan?.items?.review?.on || input.plan?.items?.['goal-checkin']?.on) out.add('review');
  return out;
}
/** Counts per source in a list of days (the filter's numbers). */
export function countBySource(days: readonly AgendaDay[]): Record<AgendaSource, number> {
  const out = Object.fromEntries(AGENDA_SOURCES.map(s => [s, 0])) as Record<AgendaSource, number>;
  for (const d of days) for (const i of d.items) out[i.source]++;
  return out;
}
