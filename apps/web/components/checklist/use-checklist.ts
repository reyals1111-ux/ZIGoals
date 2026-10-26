'use client';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {useSleep} from '../health/sleep/use-sleep';
import {useMeditation} from '../health/meditation/use-meditation';
import {useFasting} from '../health/use-fasting';
import {usePlatform} from '../platform/use-platform';
import {useDeviceRecord} from '../ai/use-device-record';
import {zigiSignals} from '../zigi/bus';
import {showToast} from '../ui/undo-toast';
import {useUiPrefs} from '../../lib/ui-prefs/use-ui-prefs';
import {checklistPrefsOf, type ChecklistPrefs} from '../../lib/ui-prefs/schema';
import {GAME} from '../../lib/game/schema';
import {REMINDERS_PLAN, quietHours} from '../../lib/reminders-plan/schema';
import {dailyData, healthDay} from '../../lib/health-daily';
import {latestHabitRule} from '../../lib/habits';
import {sealDay, todayOf} from '../../lib/checklist/day';
import {deriveDots, summarise, type DerivedDot, type DeriveSources} from '../../lib/checklist/derive';
import {TickRefused, fastPlan, focusPlan, meditationTimerPlan, planTick, sleepPlan, type TickContext, type TickPlan, type Write} from '../../lib/checklist/adapters';
import {checklistStreak} from '../../lib/checklist/streak';
import {tickFeedback} from '../../lib/checklist/feedback';
import {addCustom, addFavourite, newChecklistId, rememberValue, type FavouriteRef} from '../../lib/checklist/store';
import {checklistSummary, registerChecklistCommands, type TimerKind} from '../../lib/checklist/commands';
import {storageMessageOr} from '../../lib/storage-error-copy';
import {useChecklistDay} from './use-checklist-day';
import {useChecklistDays, useChecklistRecord} from './use-checklist-record';

/**
 * Everything the Checklist shows and does (Session AF, L3). It reads the person's real records with each page's own hook
 * (Habits, Health, sleep, meditation, fasting, Goals), derives today's dots from them, seals yesterday into the history on
 * the first read of a new day, and ticks through the plans in lib/checklist/adapters.ts, each write through the store
 * that owns it. Nothing the Checklist shows is a copy of a record.
 */
export type TickOutcome = {ok: true; message: string} | {ok: false; message: string};
const errorText = (e: unknown, fallback: string) => e instanceof TickRefused ? e.message : storageMessageOr(e, fallback);

export function useChecklist({commands = false}: {commands?: boolean} = {}) {
  const record = useChecklistRecord(), days = useChecklistDays(), {date, zone: dayZone} = useChecklistDay();
  const habits = useHabits(), health = useHealth(), sleep = useSleep(), meditation = useMeditation(), fasting = useFasting(), platform = usePlatform();
  const prefsRecord = useUiPrefs(), reminders = useDeviceRecord(REMINDERS_PLAN), game = useDeviceRecord(GAME);
  const prefs: ChecklistPrefs = useMemo(() => checklistPrefsOf(prefsRecord.data), [prefsRecord.data]);
  const quiet = useMemo(() => quietHours(reminders.data), [reminders.data]);
  const gameOn = game.loaded && !game.unreadable && game.data.enabled;
  const healthTz = health.loaded ? dailyData(health.data).preferences.timezone : null;
  const loaded = !!date && record.loaded && days.loaded && habits.loaded && health.loaded && sleep.loaded && meditation.loaded && fasting.loaded && platform.loaded;
  const hDay = useMemo(() => date ? healthDay(healthTz) : '', [date, healthTz]);

  const sourcesFor = useCallback((day: string): DeriveSources => ({
    habits: habits.data, habitsDay: day === date ? habits.today : day, health: health.data, healthDay: day === date ? hDay : day,
    sleep: sleep.sleep, meditation: meditation.meditation, meditationRun: meditation.run.data, fasting: fasting.data, platform: platform.data, zone: sleep.zone, now: new Date(),
  }), [habits.data, habits.today, date, health.data, hDay, sleep.sleep, sleep.zone, meditation.meditation, meditation.run.data, fasting.data, platform.data]);
  const today = useMemo(() => date ? todayOf(days.data, date) : null, [days.data, date]);
  const dots = useMemo<DerivedDot[]>(() => loaded && date && today ? deriveDots(record.data, today, date, sourcesFor(date)) : [], [loaded, date, today, record.data, sourcesFor]);
  const summary = useMemo(() => today ? summarise(dots, today) : null, [dots, today]);
  const streak = useMemo(() => date && summary ? checklistStreak(days.data, date, summary) : null, [days.data, date, summary]);

  // The first read on a new day seals the day the record still holds (P7.15). Never over unreadable bytes.
  const sealing = useRef<string | null>(null);
  useEffect(() => {
    if (!loaded || !date || days.unreadable || record.unreadable || days.data.today?.date === date || sealing.current === date) return;
    sealing.current = date;
    const summariser = (day: Parameters<Parameters<typeof sealDay>[2]>[0], {receipts}: {receipts: boolean}) => {
      const all = deriveDots(record.data, receipts ? day : {...day, ticks: [], custom: []}, day.date, sourcesFor(day.date));
      const counted = receipts ? all : all.filter(dot => dot.kind !== 'custom');
      const s = summarise(counted, day); return {total: s.total, done: s.done, ...(s.perfect ? {perfect: true} : {})};
    };
    // Viewing writes nothing (the project's rule; help-page and guide specs): seal only when it changes the history or the
    // held day carries ticks, custom items or nudges to clear. An empty path's first read stores no record at all, and the
    // tick writers start today's entry themselves (todayOf).
    const held = days.data.today, next = sealDay(days.data, date, summariser);
    const historyChanged = JSON.stringify(next.days ?? {}) !== JSON.stringify(days.data.days ?? {});
    const heldHasContent = !!held && (held.ticks.length > 0 || held.custom.length > 0 || held.nudged.length > 0);
    if (!historyChanged && !heldHasContent) return;
    try {
      days.update(d => sealDay(d, date, summariser));
    } catch { /* sealing waits for the next read; the path still shows today */ }
  }, [loaded, date, days, record.data, record.unreadable, sourcesFor]);

  const writers = useMemo(() => ({
    habits: habits.update, health: health.update, sleep: sleep.update, meditation: meditation.update,
    meditationRun: (change: Parameters<typeof meditation.run.update>[0]) => meditation.run.update(change),
    fasting: fasting.update, platform: platform.update, days: (change: Parameters<typeof days.update>[0]) => days.update(change),
  }), [habits.update, health.update, sleep.update, meditation, fasting.update, platform.update, days]);
  const apply = useCallback(async (writes: Write[]) => {
    for (const write of writes) await (writers[write.store] as (change: unknown) => unknown)(write.change);
  }, [writers]);

  const ctxFor = useCallback((value?: number): TickContext | null => date ? {date, habitsDay: habits.today, healthDay: hDay, zone: sleep.zone, now: new Date(), ...(value !== undefined ? {value} : {}), snapshot: {sleep: sleep.sleep, fasting: fasting.data, meditationRun: meditation.run.data}} : null, [date, habits.today, hDay, sleep.zone, sleep.sleep, fasting.data, meditation.run.data]);
  const lastPlans = useRef(new Map<string, TickPlan>());
  const [announce, setAnnounce] = useState('');

  const run = useCallback(async (plan: TickPlan, dotId?: string): Promise<TickOutcome> => {
    try { await apply(plan.writes); }
    // Session AH (VA7): a failed tick never leaves the last success in the live region.
    catch (e) { setAnnounce(''); return {ok: false, message: errorText(e, 'Not saved. Try again.')}; }
    if (dotId) lastPlans.current.set(dotId, plan);
    if (plan.done) void tickFeedback({sounds: prefs.sounds, haptics: prefs.haptics, now: new Date(), quiet});
    zigiSignals.emitValidated(plan.signal);
    setAnnounce(plan.message);
    showToast({message: plan.message, ...(plan.undo.length ? {undo: async () => { await apply(plan.undo); if (dotId) lastPlans.current.delete(dotId); setAnnounce(plan.undone); }, undone: plan.undone} : {})});
    return {ok: true, message: plan.message};
  }, [apply, prefs.sounds, prefs.haptics, quiet, setAnnounce]);

  const tick = useCallback(async (dot: DerivedDot, intent: 'tick' | 'value', value?: number): Promise<TickOutcome> => {
    const ctx = ctxFor(value); if (!ctx) return {ok: false, message: 'Still loading.'};
    let plan: TickPlan;
    try { plan = planTick(dot, ctx, intent); } catch (e) { return {ok: false, message: errorText(e, 'This dot cannot be ticked here.')}; }
    const outcome = await run(plan, dot.id);
    if (outcome.ok && value !== undefined) { try { record.update(r => rememberValue(r, dot.id, value)); } catch { /* the value is logged; only the stepper's memory was not saved */ } }
    return outcome;
  }, [ctxFor, run, record]);
  const undoLast = useCallback(async (dotId: string): Promise<TickOutcome> => {
    const plan = lastPlans.current.get(dotId); if (!plan || !plan.undo.length) return {ok: false, message: 'Nothing to undo here. Change it on its own page.'};
    try { await apply(plan.undo); lastPlans.current.delete(dotId); setAnnounce(plan.undone); return {ok: true, message: plan.undone}; } catch (e) { setAnnounce(''); return {ok: false, message: errorText(e, 'Not undone. Try again.')}; }
  }, [apply, setAnnounce]);
  const canUndo = useCallback((dotId: string) => (lastPlans.current.get(dotId)?.undo.length ?? 0) > 0, []);

  /** The corner timers (P7.16): each starts or ends the page's own timer; a dot on the path for it gets its receipt. */
  const focusHabit = useMemo(() => dots.filter(d => d.kind === 'habit' && !d.missing).map(d => habits.data.habits.find(h => h.id === (d.item.ref as {habitId?: string} | undefined)?.habitId)).find(h => h && latestHabitRule(h).measurement.kind === 'duration' && latestHabitRule(h).state === 'active'), [dots, habits.data.habits]);
  const timer = useCallback(async (kind: TimerKind): Promise<TickOutcome> => {
    const ctx = ctxFor(); if (!ctx) return {ok: false, message: 'Still loading.'};
    const dotFor = (input: string) => dots.find(d => d.kind === 'health' && d.input === input) ?? null;
    let plan: TickPlan;
    try {
      plan = kind === 'sleep' ? sleepPlan(dotFor('sleep'), ctx) : kind === 'fast' ? fastPlan(dotFor('fast'), ctx, fasting.data.sessions.at(-1)?.targetHours ?? 16) : kind === 'meditate' ? meditationTimerPlan(ctx, dotFor('meditation')?.item.defaultValue ?? 10) : focusPlan(focusHabit, ctx);
    } catch (e) { return {ok: false, message: errorText(e, 'This timer cannot start here.')}; }
    return run(plan);
  }, [ctxFor, dots, fasting.data.sessions, focusHabit, run]);

  const setPrefs = useCallback((patch: Partial<Omit<ChecklistPrefs, 'celebratedOn'>> & {celebratedOn?: string}) => { try { prefsRecord.update(p => ({...p, checklist: {...(p.checklist ?? {}), ...patch}})); return true; } catch { return false; } }, [prefsRecord]);

  // ZIGi's live surface while the Checklist is open (lib/checklist/commands.ts).
  useEffect(() => {
    if (!commands || !loaded || !date) return;
    return registerChecklistCommands({
      tick: async (id, value) => { const dot = dots.find(d => d.id === id); if (!dot) return 'That item is not on your path.'; return (await tick(dot, dot.intent === 'value' ? 'value' : 'tick', value)).message; },
      addFavourite: async (ref: FavouriteRef, label?: string) => { try { record.update(r => addFavourite(r, ref, {id: newChecklistId(), at: new Date(), ...(label ? {label} : {})})); return `${label ?? 'It'} is on your path.`; } catch (e) { return errorText(e, 'Not added.'); } },
      addCustom: async (label: string) => { try { record.update(r => addCustom(r, {label}, {id: newChecklistId(), at: new Date()})); return `${label.trim()} is on your path.`; } catch (e) { return errorText(e, 'Not added.'); } },
      startTimer: async kind => (await timer(kind)).message,
      summary: () => checklistSummary(date, dots),
    });
  }, [commands, loaded, date, dots, tick, timer, record]);

  return {loaded, date, dayZone, record, days, dots, summary, streak, prefs, setPrefs, prefsLoaded: prefsRecord.loaded && !prefsRecord.unreadable, quiet, gameOn, tick, timer, undoLast, canUndo, announce,
    stores: {habits, health, sleep, meditation, fasting, platform}, focusHabit, unreadable: record.unreadable || days.unreadable};
}
export type ChecklistState = ReturnType<typeof useChecklist>;
