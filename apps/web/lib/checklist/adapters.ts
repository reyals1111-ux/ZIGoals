import {habitCalendarDay, habitDataSchema, habitRuleOn, logHabitValue, setHabitEntryStatus, smartDoneValue, type Habit, type HabitData} from '../habits';
import {logHealthItem, newHealthId, removeHealthItem, saveWeight, type HealthData} from '../health';
import {addWater, removeWater} from '../health-daily';
import type {Platform} from '../positions';
import {deleteNight, endNight, runningNights, startNight} from '../sleep/engine';
import type {Sleep} from '../sleep/schema';
import {addSession, deleteSession, newSessionId, saveManual} from '../meditation/engine';
import {emptyMeditationRun, type Meditation, type MeditationRun} from '../meditation/schema';
import {endedSession, sessionFrom, startRun} from '../meditation/timer';
import {logFastToHabit, removeFast, runningSession, startFast, stopFast} from '../fasting/engine';
import type {Fasting} from '../fasting/schema';
import {wallClock} from '../zone-time';
import {addReceipt, dropReceipt, setCustomDone} from './day';
import {mealAt, type DerivedDot} from './derive';
import type {ChecklistDays} from './schema';

/**
 * Ticking a dot writes the real record through its page's own functions (Session AF, L3; P7.10): a habit check-in
 * (`logHabitValue`, the change behind Habits' Complete and Add), a goal step (the milestone's `done`, as the Goal's own
 * checkbox writes it), water (`addWater`), a diary entry (`logHealthItem`), a weight (`saveWeight`, an upsert for the
 * day), a night (`startNight` / `endNight`), mindful minutes (`saveManual`), a fast (`startFast` / `stopFast`, and the
 * linked habit's time as Health's own Stop adds it). Nothing here keeps a second copy of what was done.
 *
 * A plan is a list of changes, each for one store, applied in order through that store's own `update` by the caller
 * (components/checklist/use-checklist.ts); `undo` reverses exactly what the plan did, on the latest record: the entry it
 * created is removed, the value it replaced is put back. Undo of an ended night reopens it as a new running night with the
 * original start (no function reopens a night); undo of a stopped fast restarts it with its original start. Each plan
 * that leaves its dot done also writes a receipt (which dot, when, the entry it created), for Perfect orbit and Undo.
 */
export type Stores = {habits: HabitData; health: HealthData; sleep: Sleep; meditation: Meditation; meditationRun: MeditationRun; fasting: Fasting; platform: Platform; days: ChecklistDays};
export type StoreName = keyof Stores;
export type Write = {[K in StoreName]: {store: K; change: (current: Stores[K]) => Stores[K]}}[StoreName];
export type TickPlan = {writes: Write[]; undo: Write[]; message: string; undone: string; done: boolean; signal: string};
export type TickContext = {date: string; habitsDay: string; healthDay: string; zone: string; now: Date; value?: number; snapshot?: Partial<Pick<Stores, 'fasting' | 'meditationRun' | 'sleep'>>};
export class TickRefused extends Error {}

const w = <K extends StoreName>(store: K, change: (current: Stores[K]) => Stores[K]): Write => ({store, change} as unknown as Write);
const receiptWrites = (dot: DerivedDot, ctx: TickContext, record?: {kind: string; id: string}): {apply: Write; undo: Write} => ({
  apply: w('days', d => addReceipt(d, ctx.date, {id: dot.id, at: ctx.now, ...(record ? {record} : {})})),
  undo: w('days', d => dropReceipt(d, ctx.date, dot.id)),
});
const forDay = (day: string, date: string) => day === date ? 'today' : day;
const round = (n: number, step: number) => Math.round(n / step) * step;
const valueOf = (dot: DerivedDot, ctx: TickContext) => {
  const v = ctx.value ?? dot.value?.current ?? dot.value?.suggested;
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new TickRefused('Enter a number first.');
  if (dot.value && (v < dot.value.min || v > dot.value.max)) throw new TickRefused(`Choose a value from ${dot.value.min} to ${dot.value.max} ${dot.value.unit}.`.replace(/ $/, ''));
  return v;
};

type Entry = Habit['entries'][number];
/** Puts one habit day back exactly as it was before a tick: the earlier entry, or no entry at all. */
export function restoreHabitDay(data: HabitData, id: string, date: string, previous: Entry | undefined): HabitData {
  const habit = data.habits.find(h => h.id === id); if (!habit) return data;
  if (previous?.disposition === 'logged') return logHabitValue(data, id, date, previous.count, {note: previous.note, ...(previous.mood ? {mood: previous.mood} : {})});
  if (previous) return setHabitEntryStatus(data, id, date, previous.disposition, previous.note);
  if (!habit.entries.some(e => e.date === date)) return data;
  return habitDataSchema.parse({...data, habits: data.habits.map(h => h.id === id ? {...h, entries: h.entries.filter(e => e.date !== date)} : h)});
}

function habitPlan(dot: DerivedDot, ctx: TickContext, intent: 'tick' | 'value'): TickPlan {
  const ref = dot.item.ref as {habitId?: unknown} | undefined, id = typeof ref?.habitId === 'string' ? ref.habitId : ''; if (!id) throw new TickRefused('This habit is no longer on Habits.');
  const day = ctx.habitsDay; let previous: Entry | undefined; let captured = false;
  const capture = (d: HabitData) => { if (!captured) { previous = d.habits.find(h => h.id === id)?.entries.find(e => e.date === day); captured = true; } };
  const r = receiptWrites(dot, ctx, {kind: 'habit', id: `${id}:${day}`});
  if (intent === 'value') {
    const v = valueOf(dot, ctx), unit = dot.value?.unit ?? '';
    return {writes: [w('habits', d => { capture(d); return logHabitValue(d, id, day, v, {mode: 'add'}); }), r.apply], undo: [w('habits', d => restoreHabitDay(d, id, day, previous)), r.undo], message: `${v} ${unit} added to ${dot.label}`.replace(/\s+/g, ' ').trim() + (day !== ctx.date ? ` (for ${day}).` : '.'), undone: `${dot.label}: back as it was.`, done: true, signal: 'checklist_tick'};
  }
  return {writes: [w('habits', d => { capture(d); const habit = d.habits.find(h => h.id === id); if (!habit) throw new TickRefused('This habit is no longer on Habits.'); const rule = habitRuleOn(habit, day); if (!rule) throw new TickRefused('This habit is not active today.'); return logHabitValue(d, id, day, smartDoneValue(rule)); }), r.apply],
    undo: [w('habits', d => restoreHabitDay(d, id, day, previous)), r.undo], message: `${dot.label} logged for ${forDay(day, ctx.date)}.`, undone: `${dot.label}: back as it was.`, done: true, signal: 'checklist_tick'};
}

function goalStepPlan(dot: DerivedDot, ctx: TickContext): TickPlan {
  const ref = dot.item.ref as {goalId?: string; milestoneId?: string} | undefined; if (!ref?.goalId || !ref.milestoneId) throw new TickRefused('This goal step is no longer on its Goal.');
  const {goalId, milestoneId} = ref;
  const flip = (done: boolean) => (s: Platform): Platform => {
    const goal = s.goals.find(g => g.id === goalId);
    if (!goal || !goal.milestones.some(m => m.id === milestoneId)) throw new TickRefused('This goal step is no longer on its Goal.');
    if (goal.status === 'closed') throw new TickRefused('This Goal is closed.');
    return {...s, goals: s.goals.map(g => g.id === goalId ? {...g, milestones: g.milestones.map(m => m.id === milestoneId ? {...m, done} : m)} : g)} as Platform;
  };
  const r = receiptWrites(dot, ctx, {kind: 'goal-step', id: `${goalId}:${milestoneId}`});
  return {writes: [w('platform', flip(true)), r.apply], undo: [w('platform', flip(false)), r.undo], message: `“${dot.label}” done.`, undone: `“${dot.label}” is open again.`, done: true, signal: 'checklist_tick'};
}

const LB = 453.59237;
function healthPlan(dot: DerivedDot, ctx: TickContext, intent: 'tick' | 'value'): TickPlan {
  const at = ctx.now.toISOString(), day = ctx.healthDay;
  switch (dot.input) {
    case 'water': {
      const v = valueOf(dot, ctx), unit = dot.value?.unit === 'fl oz' ? 'fl-oz-us' as const : 'ml' as const, id = newHealthId(), r = receiptWrites(dot, ctx, {kind: 'water', id});
      return {writes: [w('health', h => addWater(h, {id, date: day, amountMilli: Math.round(v * 1000), unit}, at)), r.apply], undo: [w('health', h => removeWater(h, id)), r.undo], message: `${v} ${unit === 'ml' ? 'ml' : 'fl oz'} of water logged.`, undone: 'Water entry removed.', done: true, signal: 'checklist_tick'};
    }
    case 'diary': {
      const ref = dot.item.ref as {sourceKind?: string; sourceId?: string} | undefined;
      if (!ref?.sourceId || (ref.sourceKind !== 'food' && ref.sourceKind !== 'recipe')) throw new TickRefused('This food is no longer in your foods.');
      const id = newHealthId(), servings = dot.item.defaultValue && dot.item.defaultValue > 0 ? dot.item.defaultValue : 1, r = receiptWrites(dot, ctx, {kind: 'diary', id});
      const draft = {id, sourceId: ref.sourceId, sourceKind: ref.sourceKind as 'food' | 'recipe', date: day, meal: mealAt(ctx.now, ctx.zone), quantityMilli: Math.round(servings * 1000)};
      return {writes: [w('health', h => logHealthItem(h, draft, at)), r.apply], undo: [w('health', h => removeHealthItem(h, 'diary', id)), r.undo], message: `${dot.label} logged (${draft.meal.toLowerCase()}).`, undone: `${dot.label} removed from the diary.`, done: true, signal: 'checklist_tick'};
    }
    case 'weight': {
      const v = round(valueOf(dot, ctx), 0.1), lb = dot.value?.unit === 'lb', grams = Math.round(lb ? v * LB : v * 1000), fresh = newHealthId();
      let previous: {id: string; grams: number} | undefined, captured = false;
      const r = receiptWrites(dot, ctx, {kind: 'weight', id: fresh});
      return {writes: [w('health', h => { if (!captured) { const old = h.weights.find(x => x.date === day); previous = old ? {id: old.id, grams: old.grams} : undefined; captured = true; } return saveWeight(h, {id: fresh, date: day, grams}, at); }), r.apply],
        undo: [w('health', h => previous ? saveWeight(h, {id: previous.id, date: day, grams: previous.grams}, new Date().toISOString()) : removeHealthItem(h, 'weights', h.weights.find(x => x.date === day && x.id === fresh)?.id ?? fresh)), r.undo],
        message: `${v} ${lb ? 'lb' : 'kg'} logged for ${forDay(day, ctx.date)}.`, undone: 'Weight put back as it was.', done: true, signal: 'checklist_tick'};
    }
    case 'meditation': {
      if (intent !== 'value') throw new TickRefused('Choose the minutes first.');
      // Mindful minutes that just ended: they started `minutes` ago. saveManual names a new session itself (an id would
      // mean "edit"), so the new id is read back from the result for Undo.
      const minutes = Math.round(valueOf(dot, ctx)), start = wallClock(ctx.now.getTime() - minutes * 60_000, ctx.zone), r = receiptWrites(dot, ctx);
      let created: string | null = null;
      return {writes: [w('meditation', m => { const before = new Set(m.sessions.map(s => s.id)), next = saveManual(m, {date: start.date, time: start.clock, minutes, timeZone: ctx.zone}, ctx.now); created = next.sessions.find(s => !before.has(s.id))?.id ?? null; return next; }), r.apply],
        undo: [w('meditation', m => created && m.sessions.some(s => s.id === created) ? deleteSession(m, created) : m), r.undo], message: `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} of meditation logged.`, undone: 'Meditation session removed.', done: true, signal: 'checklist_tick'};
    }
    case 'sleep': return sleepPlan(dot, ctx);
    case 'fast': return fastPlan(dot, ctx);
    default: throw new TickRefused('Open Health to log this.');
  }
}

/** Sleep: at bedtime one tap starts the night; on waking the next ends it, and the full night is on Health (P7.16). */
export function sleepPlan(dot: DerivedDot | null, ctx: TickContext): TickPlan {
  const running = ctx.snapshot?.sleep ? runningNights(ctx.snapshot.sleep)[0] : undefined;
  if (running) {
    const original = {start: running.start, timeZone: running.timeZone}, r = dot ? receiptWrites(dot, ctx, {kind: 'sleep', id: running.id}) : null;
    return {writes: [w('sleep', s => endNight(s, running.id, ctx.now)), ...(r ? [r.apply] : [])], undo: [w('sleep', s => { const held = s.nights.find(n => n.id === running.id); const without = held ? deleteNight(s, running.id) : s; return startNight(without, new Date(original.start), original.timeZone); }), ...(r ? [r.undo] : [])],
      message: 'Good morning. Your night is saved on Health.', undone: 'The night is running again.', done: true, signal: 'checklist_tick'};
  }
  const id = `health_sleep-${crypto.randomUUID()}`;
  return {writes: [w('sleep', s => startNight(s, ctx.now, ctx.zone, id))], undo: [w('sleep', s => s.nights.some(n => n.id === id) ? deleteNight(s, id) : s)], message: 'Sleep started. Tap again when you wake.', undone: 'Sleep not started.', done: false, signal: 'checklist_tick'};
}
/** Fasting: one tap starts the fast with the last target (16 h by default); the next stops it, as Health's Stop does. */
export function fastPlan(dot: DerivedDot | null, ctx: TickContext, targetHours = 16): TickPlan {
  const running = ctx.snapshot?.fasting ? runningSession(ctx.snapshot.fasting) : undefined;
  if (running) {
    const r = dot ? receiptWrites(dot, ctx, {kind: 'fast', id: running.id}) : null;
    // The linked duration habit gets the fast's time on the habit journal's day of the stop, as Health's Stop adds it.
    const stopped = stopFast(ctx.snapshot!.fasting!, running.id, ctx.now).sessions.find(s => s.id === running.id)!, habitId = running.habitId;
    let before: Entry | undefined, loggedDay: string | undefined;
    const habitWrites: Write[] = habitId ? [w('habits', h => { const day = habitCalendarDay(h, new Date(stopped.endedAt!)); before = h.habits.find(x => x.id === habitId)?.entries.find(e => e.date === day); const out = logFastToHabit(h, stopped, ctx.now); if (out.logged !== null) loggedDay = day; return out.data; })] : [];
    const habitUndo: Write[] = habitId ? [w('habits', h => loggedDay ? restoreHabitDay(h, habitId, loggedDay, before) : h)] : [];
    return {writes: [w('fasting', f => stopFast(f, running.id, ctx.now)), ...habitWrites, ...(r ? [r.apply] : [])],
      undo: [w('fasting', f => { const held = f.sessions.find(s => s.id === running.id); if (!held || held.endedAt === null) return f; return startFast(removeFast(f, running.id), {id: running.id, now: new Date(running.startedAt), targetHours: running.targetHours, timeZone: running.timeZone, ...(running.habitId ? {habitId: running.habitId} : {})}); }), ...habitUndo, ...(r ? [r.undo] : [])],
      message: 'Fast stopped and saved on Health.', undone: 'The fast is running again.', done: true, signal: 'checklist_tick'};
  }
  const id = `fast_${crypto.randomUUID()}`, hours = Math.min(18, Math.max(1, Math.round(dot?.item.defaultValue ?? targetHours)));
  return {writes: [w('fasting', f => startFast(f, {id, now: ctx.now, targetHours: hours, timeZone: ctx.zone}))], undo: [w('fasting', f => f.sessions.some(s => s.id === id && s.endedAt === null) ? removeFast(f, id) : f)], message: `Fast started: ${hours} h target.`, undone: 'Fast not started.', done: false, signal: 'checklist_tick'};
}
/** Meditate (the corner timer): one tap starts Health's meditation timer for the minutes chosen (10 by default); the
 *  next ends it and saves the time actually spent, as the timer's own Save does. */
export function meditationTimerPlan(ctx: TickContext, minutes = 10): TickPlan {
  const run = ctx.snapshot?.meditationRun?.run;
  if (run) {
    const ended = endedSession(run, ctx.now.getTime()), held: MeditationRun = {version: 1, run};
    if (!ended) return {writes: [w('meditationRun', () => emptyMeditationRun())], undo: [w('meditationRun', () => held)], message: 'Less than a second: nothing to save.', undone: 'The session is running again.', done: false, signal: 'checklist_tick'};
    const session = sessionFrom(ended, {id: newSessionId(), timeZone: ctx.zone, now: ctx.now});
    return {writes: [w('meditation', m => addSession(m, session)), w('meditationRun', () => emptyMeditationRun())], undo: [w('meditation', m => m.sessions.some(s => s.id === session.id) ? deleteSession(m, session.id) : m), w('meditationRun', () => held)],
      message: `Meditation saved on Health: ${Math.max(1, Math.round(ended.seconds / 60))} min.`, undone: 'The session is running again.', done: true, signal: 'checklist_tick'};
  }
  return {writes: [w('meditationRun', () => startRun({now: ctx.now, minutes}))], undo: [w('meditationRun', () => emptyMeditationRun())], message: `Meditation started: ${minutes} minutes.`, undone: 'Meditation not started.', done: false, signal: 'checklist_tick'};
}

/** The plan for pressing a dot. A dot whose page would refuse (a rest day, a closed Goal, a record that is gone) is
 *  refused here with the same words, and nothing is written. */
export function planTick(dot: DerivedDot, ctx: TickContext, intent: 'tick' | 'value' = dot.intent === 'value' ? 'value' : 'tick'): TickPlan {
  if (dot.missing) throw new TickRefused('This item is no longer on its page. Edit your path to take it off.');
  if (dot.refusal) throw new TickRefused(dot.refusal);
  if (dot.kind === 'custom') {
    const done = dot.state !== 'done', r = receiptWrites(dot, ctx);
    return {writes: [w('days', d => setCustomDone(d, ctx.date, dot.id, done)), ...(done ? [r.apply] : [r.undo])], undo: [w('days', d => setCustomDone(d, ctx.date, dot.id, !done)), ...(done ? [r.undo] : [])], message: done ? `${dot.label} done.` : `${dot.label} is open again.`, undone: done ? `${dot.label} is open again.` : `${dot.label} done.`, done, signal: 'checklist_tick'};
  }
  if (dot.state === 'done' && !(dot.kind === 'health' && (dot.input === 'water' || dot.input === 'sleep' || dot.input === 'fast' || (dot.input === 'meditation' && intent === 'value')))) throw new TickRefused(`${dot.label} is already done today.`);
  if (dot.kind === 'habit') return habitPlan(dot, ctx, intent);
  if (dot.kind === 'goal-step') return goalStepPlan(dot, ctx);
  return healthPlan(dot, ctx, intent);
}
