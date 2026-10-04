'use client';
import {useCallback, useMemo} from 'react';
import {useRouter} from 'next/navigation';
import {habitCalendarDay} from '../../lib/habits';
import {dailyData, healthDay} from '../../lib/health-daily';
import {planAction, type Env, type Plan, type PlanResult, type Stores} from '../../lib/ai/actions/plan';
import {PREFILL_ROUTE, stashPrefill} from '../../lib/ai/actions/prefill';
import type {Action} from '../../lib/ai/actions/schema';
import type {Handle} from '../../lib/ai/context/types';
import {useFasting} from '../health/use-fasting';
import {useHealth} from '../health/use-health';
import {useHabits} from '../habits/use-habits';
import {usePlatform} from '../platform/use-platform';

/**
 * Runs confirmed proposals through the same save paths as the forms (ADR-012, Part 5): usePrivateStore.update for
 * Health, Habits and the platform (sync outbox, Activity and conflict handling see an ordinary edit), the fasting
 * store's update for fasts. A plan's write receives the latest stored record, never a copy from when the card was shown;
 * the undo checks that the touched record is still what the write left before applying the inverse. The money hand-off
 * only stashes the form values and opens Wealth's own add-asset sheet.
 */
export const UNDO_REFUSED = 'Something changed since, so this undo was not applied. Your records are as they are now.';
export class UndoRefused extends Error { constructor() { super(UNDO_REFUSED); this.name = 'UndoRefused'; } }
type Written = keyof Stores;
type Updater<K extends Written> = (change: (latest: Stores[K]) => Stores[K]) => unknown;
export type ProposalRunner = {
  ready: boolean;
  stores: Stores;
  plan: (action: Action, handles: readonly Handle[]) => PlanResult;
  /** Applies one plan; resolves with the stores as the write left them (the baseline for its undo). */
  apply: (plan: Plan) => Promise<Stores>;
  /** Applies several plans in order on the latest stores; stops at the first failure. */
  applyAll: (plans: readonly Plan[]) => Promise<{after: Stores[]; error: string | null}>;
  /** Undoes plans newest first, each as the inverse through the normal path; refused as a whole when a record moved. */
  undo: (plans: readonly Plan[], after: readonly Stores[]) => Promise<string | null>;
  /** The money hand-off: stash the values, open Wealth's add-asset form. */
  openForm: (plan: Plan) => boolean;
};
export function useProposals(): ProposalRunner {
  const health = useHealth(), habits = useHabits(), fasting = useFasting(), platform = usePlatform(), router = useRouter();
  const stores = useMemo<Stores>(() => ({health: health.data, habits: habits.data, fasting: fasting.data, platform: platform.data}), [health.data, habits.data, fasting.data, platform.data]);
  const ready = health.loaded && habits.loaded && fasting.loaded && platform.loaded && !health.error && !habits.error && !platform.error && !fasting.unreadable;
  const plan = useCallback((action: Action, handles: readonly Handle[]): PlanResult => {
    const now = new Date(), timeZone = habits.data.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    let day = now.toISOString().slice(0, 10), habitDay = day;
    try { day = healthDay(dailyData(health.data).preferences.timezone, now); } catch { /* an unknown zone falls back to the UTC date */ }
    try { habitDay = habitCalendarDay(habits.data, now); } catch { habitDay = day; }
    const env: Env = {stores, handles, now, habitDay, healthDay: day, timeZone};
    return planAction(action, env);
  }, [stores, habits.data, health.data]);
  /** One write through a store's own update: the change sees the latest record, and the stores it leaves are returned. */
  const through = useCallback(async <K extends Written>(key: K, update: Updater<K>, change: (base: Stores) => Stores): Promise<Stores> => {
    let after = stores;
    await update(latest => { const base = {...stores, [key]: latest}; after = change(base); return after[key]; });
    return after;
  }, [stores]);
  const run = useCallback((p: Plan, change: (base: Stores) => Stores): Promise<Stores> => {
    switch (p.target) {
      case 'health': return through('health', health.update, change);
      case 'habits': return through('habits', habits.update, change);
      case 'platform': return through('platform', platform.update, change);
      case 'fasting': return through('fasting', fasting.update, change);
      case 'form': return Promise.resolve(stores);
    }
  }, [through, health.update, habits.update, platform.update, fasting.update, stores]);
  const apply = useCallback((p: Plan) => run(p, base => ({...base, ...p.write(base)})), [run]);
  const applyAll = useCallback(async (plans: readonly Plan[]) => {
    const after: Stores[] = [];
    for (const p of plans) {
      try { after.push(await apply(p)); }
      catch (error) { return {after, error: error instanceof Error ? error.message : 'A proposal could not be written.'}; }
    }
    return {after, error: null};
  }, [apply]);
  const undo = useCallback(async (plans: readonly Plan[], after: readonly Stores[]): Promise<string | null> => {
    const pairs = plans.map((p, i) => ({p, undo: p.undo, baseline: after[i]})).filter((x): x is {p: Plan; undo: NonNullable<Plan['undo']>; baseline: Stores} => !!x.undo && !!x.baseline);
    // Every record must still be as the writes left it, checked on the latest stores before anything is undone.
    if (pairs.some(({undo: u, baseline}) => !u.unchanged(baseline, stores))) return UNDO_REFUSED;
    for (const {p, undo: u, baseline} of [...pairs].reverse()) {
      try { await run(p, base => { if (!u.unchanged(baseline, base)) throw new UndoRefused(); return {...base, ...u.write(base)}; }); }
      catch (error) { return error instanceof Error ? error.message : 'This undo could not be applied.'; }
    }
    return null;
  }, [run, stores]);
  const openForm = useCallback((p: Plan) => {
    if (!p.prefill) return false;
    const {category, name, quantity, currency, value, symbol, notes} = p.prefill;
    const stashed = stashPrefill({category, name, quantity, currency, value, symbol, notes});
    router.push(PREFILL_ROUTE);
    return stashed;
  }, [router]);
  return {ready, stores, plan, apply, applyAll, undo, openForm};
}
