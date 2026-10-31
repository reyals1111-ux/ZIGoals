'use client';
import {useCallback, useEffect, useMemo} from 'react';
import type {HabitsStore} from './use-habits';
import type {useHealth} from '../health/use-health';
import type {ContributionEvent, PrivateGoal} from '../../lib/positions';
import {useAutoRules} from './auto-rules-runner';
import {AutoTickBadge} from './auto-rules-editor';
import {useWorkouts} from '../health/workouts/use-workouts';
import {useJournalZone} from '../use-journal-zone';
import {daySources} from '../../lib/auto-rules/sources';
import {autoTickLabel, autoTickOn, removeAutoRule, setAutoRule} from '../../lib/auto-rules/engine';
import type {AutoRule, AutoRules} from '../../lib/auto-rules/schema';
import {dailyData, healthDay} from '../../lib/health-daily';
import type {AutoRulesApi} from './auto-rules-context';

/**
 * Session AK (5.6): runs the auto-complete rules on the Habits page (lib/auto-rules, through lane G's `useAutoRules`)
 * and hands the page what its cards and rules section need (`onApi`); renders nothing. Its own chunk, loaded after the
 * page, so the page's first scripts stay as they were. The day's sources are read from the stores already loaded here
 * (Health, workouts, the private goals and their contributions); a store that is not ready reads as unknown, never zero.
 */
export function AutoRulesKeeper({store, health, healthApplied, healthLinkedIds, goals, events, goalsReady, onApi}: {
  store: HabitsStore; health: Pick<ReturnType<typeof useHealth>, 'data' | 'loaded' | 'error'>;
  healthApplied: readonly {habitId: string; date: string}[];
  /** Habits with an AH Health link: a Health-source rule on one is refused (one automatic Health source per habit). */
  healthLinkedIds: readonly string[];
  goals: readonly PrivateGoal[]; events: readonly ContributionEvent[]; goalsReady: boolean;
  onApi: (api: AutoRulesApi | null) => void;
}) {
  const workouts = useWorkouts(), {ready: zoneReady} = useJournalZone();
  const healthData = health.loaded && !health.error ? health.data : undefined;
  const workoutData = workouts.loaded && !workouts.unreadable ? workouts.data : undefined;
  const sources = useCallback((date: string) => daySources({
    health: healthData, healthDate: healthData ? healthDay(dailyData(healthData).preferences.timezone) : undefined,
    workouts: workoutData, date, ...(goalsReady ? {goals, events} : {}),
  }), [healthData, workoutData, goalsReady, goals, events]);
  const ready = zoneReady && health.loaded && workouts.loaded && goalsReady;
  const {record, undo} = useAutoRules({habits: store, sources, healthApplied, ready});
  const linked = healthLinkedIds.join('|');
  // Built from the record's own fields (its state object is new on every render), so the page re-renders only on a change.
  const {data: rulesData, loaded: rulesLoaded, unreadable, update: updateRules} = record, today = store.today;
  const api = useMemo<AutoRulesApi | null>(() => {
    if (!rulesLoaded) return null;
    const write = (change: (current: AutoRules) => AutoRules) => { if (unreadable) throw Error('Your rules on this device could not be read, so nothing was changed.'); updateRules(change); };
    const healthLinked = () => new Set(linked ? linked.split('|') : []);
    const goalName = (id?: string) => goals.find(g => g.id === id)?.name;
    return {
      rules: rulesData.rules, unreadable,
      save: rule => write(r => setAutoRule(r, rule, {healthLinkedHabitIds: healthLinked()})),
      remove: ruleId => write(r => removeAutoRule(r, ruleId)),
      // `paused` is `true` or absent: resuming drops the field.
      pause: (rule, paused) => { const {paused: _was, ...rest} = rule; void _was; write(r => setAutoRule(r, (paused ? {...rest, paused: true} : rest) as AutoRule, {healthLinkedHabitIds: healthLinked()})); },
      badge: (habitId, habitTitle) => {
        const marker = unreadable ? undefined : autoTickOn(rulesData, habitId, today);
        if (!marker) return null;
        const rule = rulesData.rules.find(r => r.id === marker.ruleId);
        return <AutoTickBadge habitTitle={habitTitle} label={autoTickLabel(marker, {goalName: goalName(rule?.goalId)})} onUndo={marker.undone ? undefined : () => { void undo(habitId, marker.date).catch(() => undefined); }}/>;
      },
    };
  }, [rulesData, rulesLoaded, unreadable, updateRules, undo, linked, goals, today]);
  useEffect(() => { onApi(api); }, [api, onApi]);
  useEffect(() => () => onApi(null), [onApi]);
  return null;
}
export default AutoRulesKeeper;
