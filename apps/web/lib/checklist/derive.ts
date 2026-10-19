import {habitDay, habitRuleOn, latestHabitRule, measurementUnit, type HabitData} from '../habits';
import {HEALTH_MEALS, type HealthData} from '../health';
import {dailyData, waterSummary} from '../health-daily';
import type {Platform} from '../positions';
import type {Sleep} from '../sleep/schema';
import {nightDay, runningNights} from '../sleep/engine';
import type {Meditation, MeditationRun} from '../meditation/schema';
import type {Fasting} from '../fasting/schema';
import {runningSession} from '../fasting/engine';
import {wallClock} from '../zone-time';
import {formatNumber} from '../visual-format';
import {pathColour, type PathColour} from '../path/colours';
import type {PathMilestone, PathModel, PathStep, StepIntent, StepState, StepValue} from '../path/model';
import {isHealthItem, itemKey, orderedItems, sectionOfItem, sectionsOf} from './store';
import type {Checklist, ChecklistDaySummary, ChecklistHealthItem, ChecklistItem, ChecklistToday, HealthInput} from './schema';

/**
 * A dot's state is derived from the real record, never stored (Session AF, L3; P7.1, P7.10). The habit's own day, the
 * milestone's own tick, today's water, diary, weight, night, session or fast: whatever each page's record says is what
 * the dot shows, so a habit ticked on Habits lights its dot here and an entry removed on Health puts it out. The path's
 * receipts only say which dots were ticked on the path and when (for Perfect orbit and Undo); custom items are the only
 * dots the path itself keeps.
 */
export type DeriveSources = {
  habits: HabitData | null; habitsDay: string;
  health: HealthData | null; healthDay: string;
  sleep: Sleep | null; meditation: Meditation | null; meditationRun: MeditationRun | null; fasting: Fasting | null;
  platform: Platform | null;
  /** The zone new entries are lived in (Health's zone, then the journal's, then the device's). */
  zone: string;
  now: Date;
};
export type DotKind = 'habit' | 'goal' | 'goal-step' | 'custom' | 'health';
export type DerivedDot = {
  id: string; key: string | null; kind: DotKind; input?: HealthInput; section: string; label: string; colour: PathColour; glyph: string;
  state: StepState; counted: boolean; partial?: number; note?: string; href?: string; intent?: StepIntent; value?: StepValue; doneAt?: string;
  /** The day the dot's page writes to (its own zone), when it differs from the Checklist's day. */
  writesFor?: string;
  /** Its record is gone from its page (a habit deleted, a food removed): shown so the person can take it off the path. */
  missing?: boolean;
  /** Why ticking it here would be refused, in the page's own words. */
  refusal?: string;
  /** A goal favourite: the milestone a tick completes (its next open step). */
  milestoneId?: string;
  item: ChecklistItem | ChecklistHealthItem;
};

const DEFAULT_COLOUR: Record<string, PathColour> = {habit: 'cyan', goal: 'purple', 'goal-step': 'purple', custom: 'gold', water: 'blue', diary: 'pink', meal: 'pink', weight: 'pink', sleep: 'magenta', meditation: 'teal', fast: 'gold'};
const GLYPH: Record<string, string> = {goal: 'flag', 'goal-step': 'flag', custom: 'sparkle', water: 'drop', diary: 'leaf', meal: 'meal', weight: 'scale', sleep: 'moon', meditation: 'lotus', fast: 'hourglass'};
const SUPPLEMENT = /vitamin|supplement|omega|magnesium|zinc|iron|calcium|probiotic|capsule|tablet|pill|creatine/i;
const MEAL_WORDS: Record<string, string> = {Breakfast: 'Log breakfast', Lunch: 'Log lunch', Dinner: 'Log dinner', Snacks: 'Log a snack'};
const LB = 453.59237;
const clock = (iso: string, zone: string) => wallClock(Date.parse(iso), zone).clock;
const dayIn = (iso: string, zone: string) => wallClock(Date.parse(iso), zone).date;
const forDay = (writesFor: string, date: string) => writesFor !== date ? {writesFor} : {};
/** "1 time", "1 glass", "2 times": a unit word in the singular for exactly one. */
export const unitFor = (count: number, unit: string) => count !== 1 || !unit.endsWith('s') || unit.endsWith('ss') ? unit : /(ss|sh|ch|x)es$/.test(unit) ? unit.slice(0, -2) : unit.slice(0, -1);
/** The meal a one-tap diary favourite logs to, by the hour where it is lived. */
export function mealAt(now: Date, zone: string): (typeof HEALTH_MEALS)[number] {
  const h = Math.floor(wallClock(now.getTime(), zone).minutes / 60);
  return h >= 4 && h < 11 ? 'Breakfast' : h >= 11 && h < 15 ? 'Lunch' : h >= 17 && h < 22 ? 'Dinner' : 'Snacks';
}

function habitDot(item: ChecklistItem, base: Base, s: DeriveSources, date: string): DerivedDot {
  const habit = s.habits?.habits.find(h => h.id === item.ref?.habitId);
  if (!habit) return {...base, label: item.label ?? 'A habit', state: 'undone', counted: false, missing: true, note: 'No longer on Habits', href: '/app/habits', intent: 'open'};
  const day = habitDay(habit, s.habitsDay, s.habitsDay), rule = habitRuleOn(habit, s.habitsDay) ?? latestHabitRule(habit), entry = habit.entries.find(e => e.date === s.habitsDay);
  const dot = {...base, label: habit.title, glyph: rule.measurement.kind === 'duration' ? 'focus' : rule.type === 'quit' ? 'heart' : 'habits', ...forDay(s.habitsDay, date), href: '/app/habits'};
  const rest = (note: string): DerivedDot => ({...dot, state: 'undone', counted: false, note, intent: 'open', refusal: note});
  switch (day.status) {
    case 'paused': return rest('Paused: rests off the path');
    case 'archived': return rest('Archived');
    case 'not-scheduled': return rest('Not today');
    case 'planned-skip': return rest('A rest day you planned');
    case 'skipped': {
      const why = (entry?.note ?? '').replace(/^Planned skip(?: · )?/, '').trim();
      return rest(entry?.note === 'Streak freeze' ? 'Kept by a streak freeze' : why ? `Rest day · ${why}` : entry?.note?.startsWith('Planned skip') ? 'A rest day you planned' : 'Skipped today');
    }
    case 'not-started': case 'future': return rest('Starts later');
    default: break;
  }
  const running = habit.timer?.state === 'running';
  const value: StepValue | undefined = rule.type !== 'quit' && rule.measurement.kind !== 'boolean' && (rule.type === 'limit' || rule.target > 1 || rule.measurement.kind === 'duration')
    ? {current: item.lastValue ?? item.defaultValue ?? null, unit: measurementUnit(rule), suggested: item.defaultValue ?? (rule.type === 'limit' ? 0 : Math.max(1, Math.round((rule.target - day.count) * 100) / 100)), min: rule.type === 'limit' ? 0 : rule.measurement.kind === 'count' ? 1 : 0.5, max: 100_000, step: rule.measurement.kind === 'count' ? 1 : rule.measurement.kind === 'duration' ? 5 : 0.5}
    : undefined;
  const state: StepState = day.status === 'complete' ? 'done' : running ? 'running' : 'undone';
  const progress = day.status === 'partial' && day.target > 0 ? Math.min(.99, Math.max(.01, day.count / day.target)) : undefined;
  const note = day.status === 'complete' ? (rule.type === 'quit' ? 'Stayed clear' : rule.measurement.kind === 'boolean' ? undefined : `${formatNumber(day.count)} ${unitFor(day.count, measurementUnit(rule))}`.trim())
    : day.status === 'failed' ? 'Marked missed today' : running ? 'Timer running' : day.status === 'partial' ? `${formatNumber(day.count)} of ${formatNumber(day.target)} ${measurementUnit(rule)}`.trim() : undefined;
  return {...dot, state, counted: true, ...(progress ? {partial: progress} : {}), ...(note ? {note} : {}), ...(value ? {value, intent: 'value'} : {intent: 'tick'}), ...(state === 'done' && entry ? {doneAt: entry.updatedAt} : {})};
}

/** A private Goal's own page (lib/goal-summary.ts names it so). */
export const goalHref = (id: string) => `/app/goals/tracked/${encodeURIComponent(id)}`;
const milestoneChangedToday = (s: DeriveSources, goalId: string, date: string) => s.platform?.goalHistory.some(h => h.kind === 'milestone' && 'goalId' in h && h.goalId === goalId && 'capturedAt' in h && typeof h.capturedAt === 'string' && dayIn(h.capturedAt, s.zone) === date) ?? false;
/** A Goal on the path is its next open step: ticking it completes that milestone; the one ticked here today stays lit. */
function goalDot(item: ChecklistItem, base: Base, s: DeriveSources, today: ChecklistToday): DerivedDot {
  const goal = s.platform?.goals.find(g => g.id === item.ref?.goalId);
  if (!goal) return {...base, label: item.label ?? 'A Goal', state: 'undone', counted: false, missing: true, note: 'No longer on Goals', href: '/app/goals', intent: 'open'};
  const href = goalHref(goal.id), ticked = today.ticks.filter(t => t.id === item.id && t.record?.kind === 'goal-step').map(t => t.record!.id.slice(t.record!.id.lastIndexOf(':') + 1));
  const doneHere = goal.milestones.find(m => m.done && ticked.includes(m.id));
  if (goal.status === 'closed') return {...base, label: goal.name, state: 'undone', counted: false, note: 'Closed', href, intent: 'open', refusal: 'This Goal is closed.'};
  if (doneHere) return {...base, label: doneHere.title, state: 'done', counted: true, note: goal.name, href, intent: 'tick', milestoneId: doneHere.id};
  const next = goal.milestones.find(m => !m.done);
  if (!next) return {...base, label: goal.name, state: goal.milestones.length ? 'done' : 'undone', counted: false, note: goal.milestones.length ? 'Every step is done' : 'Add a step on its page', href, intent: 'open'};
  return {...base, label: next.title, state: 'undone', counted: true, note: `${goal.name} · next step`, href, intent: 'tick', milestoneId: next.id};
}

function goalStepDot(item: ChecklistItem, base: Base, s: DeriveSources, date: string, receipts: Set<string>): DerivedDot {
  const goal = s.platform?.goals.find(g => g.id === item.ref?.goalId), milestone = goal?.milestones.find(m => m.id === item.ref?.milestoneId);
  const href = goal ? goalHref(goal.id) : '/app/goals';
  if (!goal || !milestone) return {...base, label: item.label ?? 'A goal step', state: 'undone', counted: false, missing: true, note: 'No longer on its Goal', href, intent: 'open'};
  const dot = {...base, label: milestone.title, href};
  if (goal.status === 'closed') return {...dot, state: milestone.done ? 'done' : 'undone', counted: false, note: `${goal.name} · closed`, intent: 'open', refusal: 'This Goal is closed.'};
  // A step done before today stays lit, out of today's count: it is not today's work. Done today (here, or on the Goal:
  // its milestones changed today) it counts.
  const changedToday = milestoneChangedToday(s, goal.id, date);
  const counted = !milestone.done || receipts.has(item.id) || changedToday;
  return {...dot, state: milestone.done ? 'done' : 'undone', counted, note: milestone.done && !counted ? `${goal.name} · done earlier` : goal.name, intent: 'tick'};
}

function healthDot(item: ChecklistHealthItem, base: Base, s: DeriveSources, date: string): DerivedDot {
  const h = s.health, day = s.healthDay, prefs = h ? dailyData(h).preferences : null, here = {...base, href: '/app/health', ...forDay(day, date)};
  switch (item.input) {
    case 'water': {
      const unit = prefs?.waterUnit === 'fl-oz-us' ? 'fl oz' : 'ml', sum = h ? waterSummary(h, day) : {entries: 0, millilitres: 0, targetMl: null};
      const suggested = item.defaultValue ?? (unit === 'ml' ? 250 : 8);
      const note = sum.entries ? `${Math.round(sum.millilitres)} ml today${sum.targetMl ? ` of ${sum.targetMl}` : ''}` : undefined;
      return {...here, label: item.label ?? 'Water', state: sum.entries ? 'done' : 'undone', counted: true, ...(note ? {note} : {}), intent: 'value', value: unit === 'ml' ? {current: item.lastValue ?? null, unit, suggested, min: 50, max: 3000, step: 50} : {current: item.lastValue ?? null, unit, suggested, min: 1, max: 100, step: 1}};
    }
    case 'diary': {
      const sourceId = item.ref?.sourceId, kind = item.ref?.sourceKind;
      const source = kind === 'recipe' ? h?.recipes.find(r => r.id === sourceId) : h?.foods.find(f => f.id === sourceId);
      if (!source) return {...here, label: item.label ?? 'A food', state: 'undone', counted: false, missing: true, note: 'No longer in your foods', intent: 'open'};
      const logged = h!.diary.filter(e => e.sourceId === sourceId && e.date === day);
      return {...here, label: item.label ?? source.name, glyph: SUPPLEMENT.test(source.name) ? 'pill' : 'leaf', state: logged.length ? 'done' : 'undone', counted: true, note: logged.length ? `Logged · ${logged[logged.length - 1]!.meal}` : 'One serving', intent: 'tick', ...(logged.length ? {doneAt: logged[logged.length - 1]!.createdAt} : {})};
    }
    case 'meal': {
      const meal = item.ref?.meal ?? 'Breakfast', logged = h?.diary.filter(e => e.date === day && e.meal === meal) ?? [];
      return {...here, label: item.label ?? MEAL_WORDS[meal] ?? `Log ${meal}`, state: logged.length ? 'done' : 'undone', counted: true, note: logged.length ? `${logged.length} ${logged.length === 1 ? 'item' : 'items'} logged` : 'Choose on Health', intent: 'open', href: '/app/health'};
    }
    case 'weight': {
      const today = h?.weights.find(w => w.date === day), latest = h ? [...h.weights].sort((a, b) => b.date.localeCompare(a.date))[0] : undefined;
      const lb = prefs?.weightUnit === 'lb', show = (g: number) => Math.round((lb ? g / LB : g / 1000) * 10) / 10;
      const last = item.lastValue ?? latest?.grams ?? null;
      return {...here, label: item.label ?? 'Weigh in', state: today ? 'done' : 'undone', counted: true, ...(today ? {note: `${show(today.grams)} ${lb ? 'lb' : 'kg'}`, doneAt: today.updatedAt} : {}), intent: 'value',
        value: {current: last === null ? null : show(last), unit: lb ? 'lb' : 'kg', suggested: last === null ? (lb ? 150 : 70) : show(last), min: lb ? 44 : 20, max: lb ? 880 : 400, step: 0.1}};
    }
    case 'sleep': {
      const nights = s.sleep?.nights ?? [], ended = nights.filter(n => n.end !== null && nightDay(n) === day).sort((a, b) => (b.end ?? '').localeCompare(a.end ?? ''))[0], running = s.sleep ? runningNights(s.sleep)[0] : undefined;
      const state: StepState = ended ? 'done' : running ? 'running' : 'undone';
      const note = running ? `In bed since ${clock(running.start, running.timeZone)} · tap when you wake` : ended ? `Woke at ${clock(ended.end!, ended.timeZone)}` : 'Tap at bedtime';
      return {...here, label: item.label ?? 'Sleep', state, counted: true, note, intent: 'tick', ...(ended ? {doneAt: ended.end!} : {})};
    }
    case 'meditation': {
      const today = (s.meditation?.sessions ?? []).filter(x => dayIn(x.startedAt, x.timeZone ?? s.zone) === day), running = !!s.meditationRun?.run;
      const minutes = Math.round(today.reduce((n, x) => n + x.seconds, 0) / 60);
      return {...here, label: item.label ?? 'Meditate', state: today.length ? 'done' : running ? 'running' : 'undone', counted: true, note: today.length ? `${minutes} min today` : running ? 'Session running' : undefined, intent: 'value',
        value: {current: item.lastValue ?? null, unit: 'min', suggested: item.defaultValue ?? 10, min: 1, max: 240, step: 1}};
    }
    case 'fast': {
      const sessions = s.fasting?.sessions ?? [], running = s.fasting ? runningSession(s.fasting) : undefined;
      const ended = sessions.filter(f => f.endedAt !== null && dayIn(f.endedAt, f.timeZone) === day).sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))[0];
      const state: StepState = ended ? 'done' : running ? 'running' : 'undone';
      const note = running ? `Fasting since ${clock(running.startedAt, running.timeZone)} · target ${running.targetHours} h` : ended ? `${Math.round((Date.parse(ended.endedAt!) - Date.parse(ended.startedAt)) / 360_000) / 10} h done` : `Tap to start · ${item.defaultValue ?? 16} h`;
      return {...here, label: item.label ?? 'Fast', state, counted: true, note, intent: 'tick', ...(ended ? {doneAt: ended.endedAt!} : {})};
    }
    default: return {...here, label: item.label ?? 'Health', state: 'undone', counted: false, missing: true};
  }
}

type Base = Omit<DerivedDot, 'label' | 'state' | 'counted'>;
/** Every dot on today's path, in the person's order (P7.4), each derived from its own page's record. */
export function deriveDots(record: Checklist, today: ChecklistToday, date: string, sources: DeriveSources): DerivedDot[] {
  const receipts = new Set(today.ticks.map(t => t.id)), custom = new Set(today.custom);
  return orderedItems(record).map(item => {
    const health = isHealthItem(item), kind: DotKind = health ? 'health' : item.kind as DotKind, sub = health ? item.input : item.kind;
    const colour = pathColour(item.colour, DEFAULT_COLOUR[sub] ?? 'cyan');
    const base: Base = {id: item.id, key: itemKey(item), kind, ...(health ? {input: item.input as HealthInput} : {}), section: sectionOfItem(record, item), colour, glyph: GLYPH[sub] ?? 'sparkle', item};
    if (health) return healthDot(item, base, sources, date);
    if (item.kind === 'habit') return habitDot(item, base, sources, date);
    if (item.kind === 'goal') return goalDot(item, base, sources, today);
    if (item.kind === 'goal-step') return goalStepDot(item, base, sources, date, receipts);
    return {...base, label: item.label ?? 'My item', state: custom.has(item.id) ? 'done' : 'undone', counted: true, intent: 'tick'} satisfies DerivedDot;
  });
}

/**
 * Today's count and whether it was a Perfect orbit (P7.13): every counted dot done, each ticked on the path today, in
 * path order. A dot done on its own page has no receipt: the day is still complete, its order unknown (never a penalty).
 */
export type DaySummary = ChecklistDaySummary & {orderKnown: boolean; next: DerivedDot | null};
export function summarise(dots: DerivedDot[], today: ChecklistToday): DaySummary {
  const counted = dots.filter(d => d.counted), done = counted.filter(d => d.state === 'done');
  const at = new Map(today.ticks.map(t => [t.id, t.at]));
  const orderKnown = done.every(d => at.has(d.id));
  const ordered = done.map(d => at.get(d.id) ?? '').every((stamp, i, list) => i === 0 || list[i - 1]! <= stamp);
  const perfect = counted.length > 0 && done.length === counted.length && orderKnown && ordered;
  return {total: counted.length, done: done.length, perfect, orderKnown, next: counted.find(d => d.state !== 'done') ?? null};
}

/** The chests (P7.7): half way and all lit; their reward lines only with the game layer on. */
export function checklistMilestones(game: {on: boolean; dayXp: number; badge?: string | null}): PathMilestone[] {
  return [
    {id: 'half', at: 'half', label: 'Half way', reachedLabel: 'Half way. The orbit is warming up.'},
    {id: 'end', at: 'end', label: 'All dots lit', reachedLabel: 'All dots lit. See you tomorrow.', ...(game.on ? {reward: {xp: game.dayXp, ...(game.badge ? {badge: game.badge} : {})}} : {})},
  ];
}
/** The path engine's model of today's path: the person's orbits in their order (empty orbits left out), dots in order. */
export function checklistPath(record: Checklist, dots: DerivedDot[], milestones: PathMilestone[]): PathModel {
  const sections = sectionsOf(record).map(section => ({id: section.id, label: section.label, colour: pathColour(section.colour, 'cyan'), steps: dots.filter(d => d.section === section.id).map((d): PathStep => ({
    id: d.id, label: d.label, colour: d.colour, state: d.state, glyph: d.glyph, ...(d.note ? {note: d.writesFor ? `${d.note} · for ${d.writesFor}` : d.note} : d.writesFor ? {note: `for ${d.writesFor}`} : {}),
    ...(d.intent === 'open' && d.href ? {href: d.href, intent: 'open' as const} : d.intent ? {intent: d.intent} : {}), ...(d.value ? {value: d.value} : {}), ...(d.partial ? {partial: d.partial} : {}), ...(d.doneAt ? {doneAt: d.doneAt} : {}), ...(d.counted ? {} : {counted: false}),
  }))})).filter(s => s.steps.length);
  return {id: 'checklist-today', label: "Today's path", sections, milestones};
}
