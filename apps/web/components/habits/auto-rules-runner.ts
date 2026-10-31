'use client';
import {useCallback, useEffect, useRef} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {everyHalfMinute} from '../half-minute';
import type {HabitsStore} from './use-habits';
import {habitCalendarDay} from '../../lib/habits';
import {AUTO_RULES, type AutoApplied} from '../../lib/auto-rules/schema';
import {applyAutoTick, autoTickOn, markAutoTickUndone, proposeAutoTicks, recordAutoTick, ruleHabitDays, undoAutoTick, type DaySources} from '../../lib/auto-rules/engine';

/**
 * Session AK (5.6): runs the auto-complete rules, as useAutoCheckIns runs AH's Health links: once the journal, the
 * rules and the day's sources are ready, on each change, on focus and every 30 s. Each tick goes through the habits
 * store's own update and re-checks there that the day is still open; its marker is written only after the journal
 * changed. `sources(date)` gives the habit day's values (lib/auto-rules/sources.ts `daySources`); `healthApplied` is AH's
 * markers, so a day Health ticked is never ticked again. Returns the rules record and the Undo for a tick.
 */
export function useAutoRules({habits, sources, healthApplied, ready}: {
  habits: Pick<HabitsStore, 'data' | 'loaded' | 'error' | 'update'>;
  sources: (date: string) => DaySources;
  healthApplied: readonly {habitId: string; date: string}[];
  /** False until every store the sources read has loaded (and the journal zone is known). */
  ready: boolean;
}) {
  const record = useDeviceRecord(AUTO_RULES);
  const running = useRef(false), check = useRef<() => void>(() => {});
  useEffect(() => {
    const again = () => check.current();
    const stop = everyHalfMinute(again);
    window.addEventListener('focus', again);
    return () => { stop(); window.removeEventListener('focus', again); };
  }, []);
  const {data: rules, loaded: rulesLoaded, unreadable, update: updateRules} = record;
  const {data: habitData, loaded: habitsLoaded, error: habitsError, update: updateHabits} = habits;
  useEffect(() => {
    const run = () => {
      if (!ready || !habitsLoaded || habitsError || !rulesLoaded || unreadable || running.current || !rules.rules.length) return;
      const date = habitCalendarDay(habitData, new Date());
      const ticks = proposeAutoTicks({record: rules, date, sources: sources(date), days: ruleHabitDays(rules, habitData, date), healthApplied});
      if (!ticks.length) return;
      running.current = true;
      void (async () => {
        for (const tick of ticks) {
          const out: {marker?: AutoApplied} = {};
          try {
            await updateHabits(data => { const applied = applyAutoTick(data, tick, new Date()); if (!applied) return data; out.marker = applied.marker; return applied.data; });
            const marker = out.marker;
            if (marker) updateRules(current => recordAutoTick(current, marker));
          } catch { /* retried on the next run; the day stays as it was */ }
        }
      })().finally(() => { running.current = false; });
    };
    check.current = run;
    run();
  }, [ready, habitData, habitsLoaded, habitsError, rules, rulesLoaded, unreadable, updateHabits, updateRules, sources, healthApplied]);
  /** Undo one automatic tick: the day goes back to its value before, and no rule ticks it again that day. */
  const undo = useCallback(async (habitId: string, date: string) => {
    const marker = autoTickOn(rules, habitId, date);
    if (!marker || marker.undone) return;
    updateRules(current => markAutoTickUndone(current, habitId, date));
    await updateHabits(data => undoAutoTick(data, marker, new Date()));
  }, [rules, updateRules, updateHabits]);
  return {record, undo};
}
