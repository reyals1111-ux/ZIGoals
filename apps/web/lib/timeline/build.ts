import {habitDay, habitRuleOn, latestHabitRule, type HabitData} from '../habits';
import type {HealthData} from '../health';
import {dailyData, waterSummary} from '../health-daily';
import type {Reminders} from '../reminders/schema';
import type {WReminders} from '../reminders/w-schema';
import {PLAN_LABELS, type RemindersPlan} from '../reminders-plan/schema';
import type {Fasting} from '../fasting/schema';
import type {MeditationRun} from '../meditation/schema';
import type {Sleep} from '../sleep/schema';
import {wallClock} from '../zone-time';
import {localWeekday} from '../local-date';
import {clockMinutes, habitTimeKey, mealTimeKey, MEAL_SLOTS, type DayTimelineRecord, type MealSlot} from './store';
import type {TimelineBand, TimelineSourceItem} from './sources';

/**
 * The Day Timeline (Session AF, L5b; P9.2, ADR-028 D2 (a), H76): one vertical line of today from the person's own
 * records — habits at their times, meals by slot, last night's sleep and tonight's bedtime, a running fast, running
 * timers, reminders at their clock times, and the items other features register (the Checklist's dots). Nothing is
 * stored here: each block is read from its own page's record; the only thing the timeline keeps is a time the person
 * moved (`zigoals:day-timeline:v1`). A habit's time is the one the person moved it to, else its reminder time, else its
 * part of the day (morning 08:00, afternoon 14:00, evening 19:00); "anytime" habits wait on the Anytime shelf. Fasts and
 * running timers keep their own clocks and never move; reminders, sleep and Checklist dots move where they belong.
 */
export type BlockKind = 'habit' | 'meal' | 'sleep' | 'fast' | 'timer' | 'meditation' | 'reminder' | 'checklist';
export type BlockPillar = 'goals' | 'habits' | 'health' | 'wealth' | null;
export type TimelineBlock = {
  id: string; kind: BlockKind; title: string;
  /** Minutes since midnight; null on the Anytime shelf. */
  start: number | null;
  /** Length in minutes (0 for a reminder: a moment, not a block). */
  minutes: number;
  pillar: BlockPillar; href: string; done: boolean; skipped?: boolean;
  movable: boolean; lockedReason?: string;
  /** The override key a move writes (`habit:<id>`, `meal:<slot>`). */
  timeKey?: string;
  /** Where the time comes from, in plain words. */
  timeFrom: 'moved here' | 'its reminder' | 'its part of the day' | 'its meal slot' | 'its record' | 'Settings' | 'the Checklist' | 'no time yet';
  action: 'habit-done' | 'meal-log' | 'open';
  habitId?: string; mealPlanId?: string; slot?: MealSlot;
  /** The habit's reminder time ("HH:MM"), shown beside a moved block. */
  reminder?: string;
  note?: string;
  /** A habit that is also a dot on the Checklist. */
  onChecklist?: boolean;
};
export type DayTimeline = {date: string; nowMinute: number; blocks: TimelineBlock[]; anytime: TimelineBlock[]; leftovers: TimelineBlock[]; replanFrom: number; quiet: boolean};
export type TimelineInput = {
  /** Today, by the habits journal. */
  date: string;
  /** The Health journal's day (meals and water are written to it). */
  healthDay?: string;
  now: Date;
  /** The zone the clock is lived in (this device's, as reminders are). */
  zone: string;
  habits: HabitData; health?: HealthData | null;
  reminders?: Reminders | null; wReminders?: WReminders | null; plan?: RemindersPlan | null; reviewWeekday?: number;
  times?: DayTimelineRecord['times'];
  fasting?: Fasting | null; meditationRun?: MeditationRun | null; sleep?: Sleep | null;
  extra?: readonly TimelineSourceItem[];
};

export const PART_OF_DAY: Record<'morning' | 'afternoon' | 'evening', string> = {morning: '08:00', afternoon: '14:00', evening: '19:00'};
export const MEAL_TIMES: Record<MealSlot, string> = {Breakfast: '08:00', Lunch: '12:30', Snacks: '16:00', Dinner: '19:00'};
export const HABIT_MINUTES = 20, MEAL_MINUTES = 30, REPLAN_FROM = '20:00';
export const FAST_LOCK = 'A running fast keeps its own clock.', TIMER_LOCK = 'A running timer keeps its own clock.';
export type DayBand = 'night' | 'morning' | 'afternoon' | 'evening';
export const BANDS: {band: DayBand; label: string; from: number; to: number}[] = [
  {band: 'night', label: 'Night', from: 0, to: 300}, {band: 'morning', label: 'Morning', from: 300, to: 720},
  {band: 'afternoon', label: 'Afternoon', from: 720, to: 1020}, {band: 'evening', label: 'Evening', from: 1020, to: 1440},
];
export const bandOf = (minute: number): DayBand => BANDS.find(b => minute >= b.from && minute < b.to)?.band ?? 'evening';
const ORDER: Record<BlockKind, number> = {sleep: 0, fast: 1, reminder: 2, habit: 3, meal: 4, checklist: 5, timer: 6, meditation: 7};
const clampDay = (m: number) => Math.min(1439, Math.max(0, Math.round(m)));
const wall = (iso: string, zone: string) => wallClock(Date.parse(iso), zone);
const nowMinuteOf = (now: Date, zone: string) => wallClock(now.getTime(), zone).minutes;

function habitMinutes(rule: ReturnType<typeof habitRuleOn>): number {
  if (!rule || rule.measurement.kind !== 'duration' || rule.type !== 'build' || rule.target <= 0) return HABIT_MINUTES;
  const m = rule.measurement.unit === 'hours' ? rule.target * 60 : rule.target;
  return Math.min(600, Math.max(5, Math.round(m)));
}

export function buildDayTimeline(input: TimelineInput): DayTimeline {
  const {date, now, zone, habits} = input, times = input.times ?? {}, healthDay = input.healthDay ?? date, out: TimelineBlock[] = [];
  const nowMinute = nowMinuteOf(now, zone);

  // Habits due (or done, or skipped) today.
  const habitBlocks = new Map<string, TimelineBlock>();
  for (const h of habits.habits) {
    const day = habitDay(h, date, date), rule = habitRuleOn(h, date);
    if (!rule || !day.scheduled) continue;
    const key = habitTimeKey(h.id), moved = times[key], reminder = input.reminders?.habits[h.id]?.time;
    const part = h.timeOfDay === 'anytime' ? null : PART_OF_DAY[h.timeOfDay];
    const time = moved?.time ?? reminder ?? part;
    const block: TimelineBlock = {
      id: `habit:${h.id}`, kind: 'habit', title: h.title, start: time ? clockMinutes(time) : null, minutes: moved?.minutes ?? habitMinutes(rule),
      pillar: 'habits', href: `/app/habits#habit-${h.id}`, done: day.status === 'complete', ...(day.status === 'skipped' ? {skipped: true} : {}),
      movable: true, timeKey: key, timeFrom: moved ? 'moved here' : reminder ? 'its reminder' : part ? 'its part of the day' : 'no time yet',
      action: rule.type === 'build' && day.status !== 'complete' && day.status !== 'skipped' ? 'habit-done' : 'open', habitId: h.id,
      ...(reminder ? {reminder} : {}),
      ...(day.status === 'partial' ? {note: `${day.count} of ${day.target} so far`} : {}),
    };
    habitBlocks.set(h.id, block); out.push(block);
    // A running (or paused) timer on the habit: its own block, on its own clock.
    if (h.timer) {
      const t = h.timer, started = wall(t.startedAt, zone), elapsed = t.elapsedMs + (t.state === 'running' ? Math.max(0, now.getTime() - Date.parse(t.segmentStartedAt)) : 0);
      out.push({id: `timer:${h.id}`, kind: 'timer', title: `${h.title} · timer`, start: started.date === date ? started.minutes : 0, minutes: Math.max(5, Math.round(elapsed / 60_000)), pillar: 'habits', href: `/app/habits#habit-${h.id}`, done: false, movable: false, lockedReason: TIMER_LOCK, timeFrom: 'its record', action: 'open', habitId: h.id, note: t.state === 'paused' ? 'Paused' : 'Running'});
    }
  }

  // Meals: today's plans by slot; a slot with no plan shows what was logged in it.
  if (input.health) {
    const daily = dailyData(input.health), plans = daily.plans.filter(p => p.date === healthDay);
    for (const slot of MEAL_SLOTS) {
      const key = mealTimeKey(slot), moved = times[key], start = clockMinutes(moved?.time ?? MEAL_TIMES[slot]), minutes = moved?.minutes ?? MEAL_MINUTES;
      const timeFrom = moved ? 'moved here' as const : 'its meal slot' as const, slotPlans = plans.filter(p => p.meal === slot);
      for (const p of slotPlans) out.push({id: `meal-plan:${p.id}`, kind: 'meal', title: `${slot}: ${p.name}`, start, minutes, pillar: 'health', href: '/app/health?view=plan', done: !!p.loggedAt, movable: true, timeKey: key, timeFrom, action: p.loggedAt ? 'open' : 'meal-log', mealPlanId: p.id, slot, ...(p.loggedAt ? {note: 'Logged'} : {note: 'Planned'})});
      if (!slotPlans.length) {
        const eaten = input.health.diary.filter(e => e.date === healthDay && e.meal === slot);
        if (eaten.length) out.push({id: `meal:${slot}`, kind: 'meal', title: `${slot} logged`, start, minutes, pillar: 'health', href: '/app/health', done: true, movable: true, timeKey: key, timeFrom, action: 'open', slot, note: `${eaten.length} ${eaten.length === 1 ? 'item' : 'items'}`});
      }
    }
  }

  // Sleep: last night (to the morning), a night under way, tonight's bedtime.
  const nights = input.sleep?.nights ?? [];
  const lastNight = nights.filter(n => n.kind === 'night' && n.end && wall(n.end, n.timeZone).date === date).sort((a, b) => b.end!.localeCompare(a.end!))[0];
  if (lastNight) {
    const bed = wall(lastNight.start, lastNight.timeZone), wake = wall(lastNight.end!, lastNight.timeZone), start = bed.date === date ? bed.minutes : 0;
    out.push({id: `sleep:${lastNight.id}`, kind: 'sleep', title: 'Sleep', start, minutes: Math.max(5, wake.minutes - start), pillar: 'health', href: '/app/health?view=sleep', done: true, movable: false, lockedReason: 'Nights are kept on Health → Sleep.', timeFrom: 'its record', action: 'open', note: `In bed ${bed.date === date ? 'from' : 'since last night,'} ${bed.clock} · up ${wake.clock}`});
  }
  const running = nights.find(n => n.end === null);
  if (running) {
    const bed = wall(running.start, running.timeZone), start = bed.date === date ? bed.minutes : 0;
    out.push({id: `sleep:${running.id}`, kind: 'sleep', title: 'Asleep', start, minutes: Math.max(5, nowMinute - start), pillar: 'health', href: '/app/health?view=sleep', done: false, movable: false, lockedReason: 'A night under way keeps its own clock.', timeFrom: 'its record', action: 'open', note: `Since ${bed.clock}`});
  }
  const bedtime = input.plan?.items?.bedtime;
  if (bedtime?.on && !running) {
    const start = clockMinutes(bedtime.time ?? PLAN_LABELS.bedtime.defaultTime);
    out.push({id: 'sleep:tonight', kind: 'sleep', title: 'Bedtime', start, minutes: Math.max(15, 1440 - start), pillar: 'health', href: '/app/settings/reminders', done: false, movable: false, lockedReason: 'Its time is set in Settings → Reminders.', timeFrom: 'Settings', action: 'open'});
  }

  // A running fast, on its own clock.
  const fast = input.fasting?.sessions.find(s => s.endedAt === null);
  if (fast) {
    const started = wall(fast.startedAt, zone), start = started.date === date ? started.minutes : 0, endMs = Date.parse(fast.startedAt) + fast.targetHours * 3_600_000, end = wallClock(endMs, zone);
    const until = end.date === date ? end.minutes : end.date > date ? 1440 : start;
    out.push({id: `fast:${fast.id}`, kind: 'fast', title: `Fasting · ${fast.targetHours} h target`, start, minutes: Math.max(5, until - start), pillar: 'health', href: '/app/health#fasting', done: false, movable: false, lockedReason: FAST_LOCK, timeFrom: 'its record', action: 'open', note: `${started.date === date ? 'Since' : 'Since yesterday,'} ${started.clock} · target ${end.date === date ? end.clock : 'tomorrow'}`});
  }
  // A meditation session under way.
  const run = input.meditationRun?.run;
  if (run) {
    const started = wall(run.startedAt, zone);
    out.push({id: 'meditation:run', kind: 'meditation', title: 'Meditation', start: started.date === date ? started.minutes : 0, minutes: Math.max(1, Math.round(run.plannedSec / 60)), pillar: 'health', href: '/app/health?view=meditation', done: false, movable: false, lockedReason: TIMER_LOCK, timeFrom: 'its record', action: 'open', note: run.pausedAt ? 'Paused' : 'Running'});
  }

  // Reminders at their clock times (habit reminders sit on their habit's block).
  const reminder = (id: string, title: string, time: string, href: string, done: boolean) => out.push({id: `reminder:${id}`, kind: 'reminder', title, start: clockMinutes(time), minutes: 0, pillar: 'health', href, done, movable: false, lockedReason: 'Its time is set in Settings → Reminders.', timeFrom: 'Settings', action: 'open'});
  if (input.reminders?.water) reminder('water', 'Water reminder', input.reminders.water.time, '/app/health#water', !!input.health && waterSummary(input.health, healthDay).entries > 0);
  if (input.wReminders?.windDown) reminder('wind-down', 'Wind down', input.wReminders.windDown.time, '/app/health?view=sleep', false);
  if (input.wReminders?.meditation) reminder('meditation', 'Meditation time', input.wReminders.meditation.time, '/app/health?view=meditation', (input.health?.meditation?.sessions ?? []).some(s => wall(s.startedAt, zone).date === date));
  const weekday = localWeekday(date), review = input.plan?.items?.review, checkin = input.plan?.items?.['goal-checkin'];
  if (review?.on && (review.weekday ?? input.reviewWeekday ?? 0) === weekday) reminder('review', PLAN_LABELS.review.title, review.time ?? PLAN_LABELS.review.defaultTime, '/app/review', false);
  if (checkin?.on && (checkin.weekday ?? 0) === weekday) reminder('goal-checkin', PLAN_LABELS['goal-checkin'].title, checkin.time ?? PLAN_LABELS['goal-checkin'].defaultTime, '/app/goals', false);

  // Items other features register (the Checklist's dots): placed by time, else band, else the Anytime shelf.
  for (const item of input.extra ?? []) {
    if (item.habitId && habitBlocks.has(item.habitId)) { habitBlocks.get(item.habitId)!.onChecklist = true; continue; }
    const band: TimelineBand = item.band ?? 'anytime', time = item.time && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.time) ? item.time : band === 'anytime' ? null : PART_OF_DAY[band];
    out.push({id: item.id, kind: 'checklist', title: item.title, start: time ? clockMinutes(time) : null, minutes: 0, pillar: item.pillar ?? null, href: item.href || '/app/checklist', done: item.done, movable: false, lockedReason: 'Its place is set on the Checklist.', timeFrom: 'the Checklist', action: 'open', note: item.label ?? 'Checklist'});
  }

  const timed = out.filter(b => b.start !== null).map(b => ({...b, start: clampDay(b.start!)}))
    .sort((a, b) => a.start! - b.start! || ORDER[a.kind] - ORDER[b.kind] || a.title.localeCompare(b.title));
  const anytime = out.filter(b => b.start === null).sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || a.title.localeCompare(b.title));
  // Leftovers at the day's end (a Replan card, never a silent carry-over): from the wind-down time, else 20:00, every
  // habit not done or skipped whose time has passed, and every planned meal not logged after its slot.
  const replanFrom = clockMinutes(input.wReminders?.windDown?.time ?? REPLAN_FROM);
  const leftovers = nowMinute < replanFrom ? [] : [...timed, ...anytime].filter(b => !b.done && !b.skipped && ((b.kind === 'habit' && b.action === 'habit-done') || (b.kind === 'meal' && b.action === 'meal-log')) && (b.start === null || b.start + b.minutes <= nowMinute));
  return {date, nowMinute, blocks: timed, anytime, leftovers, replanFrom, quiet: timed.length === 0 && anytime.length === 0};
}

/** The next blocks from now (for Today's card): what is under way or still to come, earliest first. */
export function nextBlocks(day: DayTimeline, count = 3): TimelineBlock[] {
  return day.blocks.filter(b => !b.done && b.start! + Math.max(b.minutes, 1) > day.nowMinute).slice(0, count);
}
/** The habit's own default time and its source, for the picker's "Put it back" line. */
export function defaultHabitTime(habits: HabitData, habitId: string, reminders?: Reminders | null): string | null {
  const h = habits.habits.find(x => x.id === habitId); if (!h) return null;
  return reminders?.habits[habitId]?.time ?? (h.timeOfDay === 'anytime' ? null : PART_OF_DAY[h.timeOfDay]);
}
/** Whether a habit is a "build" habit whose Done is one tap (the Habits page's own smart Done). */
export const oneTapDone = (habits: HabitData, habitId: string) => { const h = habits.habits.find(x => x.id === habitId); return !!h && latestHabitRule(h).type === 'build'; };
