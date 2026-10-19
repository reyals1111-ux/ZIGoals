'use client';
import {useCallback, useMemo} from 'react';
import {useRouter} from 'next/navigation';
import {habitCalendarDay} from '../../lib/habits';
import {dailyData, healthDay} from '../../lib/health-daily';
import {planAction, type Env, type Plan, type PlanResult, type Stores} from '../../lib/ai/actions/plan';
import {PREFILL_ROUTE, stashPrefill} from '../../lib/ai/actions/prefill';
import {BALANCE_PREFILL_EVENT, BALANCE_PREFILL_ROUTE, stashBalancePrefill} from '../../lib/ai/actions/balance-prefill';
import type {Action} from '../../lib/ai/actions/schema';
import type {Handle} from '../../lib/ai/context/types';
import {useFasting} from '../health/use-fasting';
import {useHealth} from '../health/use-health';
import {useHabits} from '../habits/use-habits';
import {usePlatform} from '../platform/use-platform';
import {useReminders} from '../reminders/use-reminders';
import {useWeeklyReview} from '../weekly-review/use-weekly-review';
import {useDeviceRecord} from './use-device-record';
import {AI_MEMORY, forgetAction, recordAction, ZIGI, ZIGI_REMINDERS} from '../../lib/ai/store/records';
import {confirmHref, effectStatus, lookPatched, runnerEffect} from './runner-effects';
import {applyDeviceWrite, deviceWriteSpec} from '../../lib/ai/actions/device-writes';
import {updateDeviceRecord} from '../../lib/device-record';
import {AI_ACTIONS_KEY, ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {getAppStorage} from '../../lib/showcase-storage';
import {usePrivateStore} from '../use-private-store';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings} from '../../lib/dashboard-settings';
import {STAKING_PREFILL_ROUTE, stashStakingPrefill} from '../../lib/ai/actions/staking-prefill';
import {earnSnapshot} from '../../lib/earn/snapshot';
import {readDeviceRecord} from '../../lib/device-record';
import {CHECKLIST, CHECKLIST_DAYS} from '../../lib/checklist/schema';
import {checklistDay} from '../../lib/checklist/day';
import type {ChecklistEnv} from '../../lib/ai/actions/plan';

/** Session AF (L4): the Checklist as this device holds it now, for a Checklist card; null when the storage cannot be read at all. */
function checklistEnv(now: Date): ChecklistEnv | null {
  try {
    const storage = getAppStorage(), record = readDeviceRecord(storage, CHECKLIST), days = readDeviceRecord(storage, CHECKLIST_DAYS);
    return {record: record.data, days: days.data, date: checklistDay(now), unreadable: record.unreadable || days.unreadable};
  } catch { return null; }
}

/**
 * Runs confirmed proposals through the same save paths as the forms (ADR-012, Part 5): usePrivateStore.update for
 * Health, Habits and the platform (sync outbox, Activity and conflict handling see an ordinary edit), the fasting
 * store's update for fasts. A plan's write receives the latest stored record, never a copy from when the card was shown;
 * the undo checks that the touched record is still what the write left before applying the inverse. The money hand-off
 * only stashes the form values and opens Wealth's own add-asset sheet.
 * Session V Part 7: reminders, ZIGi's own reminder kinds and the weekly review are written through their own hooks too,
 * and every confirmed card is noted in `zigoals:ai-actions:v1` for Activity's "Actions by ZIGi" (its Undo removes the note).
 * Part 8: a confirmed "Remember this?" card writes the person's notes (`zigoals:ai-memory:v1`) through the same record hook.
 * Session X-Local Part 5a: Today's settings (`zigoals:settings:v1`, a link or a widget) are written through the same
 * private store Today and Settings use.
 */
export const UNDO_REFUSED = 'Something changed since, so this undo was not applied. Your records are as they are now.';
export class UndoRefused extends Error { constructor() { super(UNDO_REFUSED); this.name = 'UndoRefused'; } }
type Written = keyof Stores;
type Updater<K extends Written> = (change: (latest: Stores[K]) => Stores[K]) => unknown;
export type ProposalRunner = {
  ready: boolean;
  stores: Stores;
  plan: (action: Action, handles: readonly Handle[], refs?: ReadonlyMap<string, {id: string; title: string}>) => PlanResult;
  /** Applies one plan; resolves with the stores as the write left them (the baseline for its undo). `auto`: added by ZIGi under auto-accept. */
  apply: (plan: Plan, auto?: boolean, prior?: Stores) => Promise<Stores>;
  /** Applies several plans in order on the latest stores; stops at the first failure. */
  applyAll: (plans: readonly Plan[]) => Promise<{after: Stores[]; error: string | null}>;
  /** Undoes plans newest first, each as the inverse through the normal path; refused as a whole when a record moved. */
  undo: (plans: readonly Plan[], after: readonly Stores[]) => Promise<string | null>;
  /** The money hand-off: stash the values, open Wealth's add-asset form. */
  openForm: (plan: Plan) => boolean;
  /**
   * Session Z-Cloud Gate B: a page to open, a record's own delete confirmation to open, or ZIGi's look to change
   * (runner-effects.ts). Resolves with the card's status text and whether a page opens, or null when the plan carries none.
   * Optional, so a runner made by hand (Z-Local's tests in lib/ai) still type-checks.
   */
  effect?: (plan: Plan) => {text: string; navigated: boolean} | null;
};
export function useProposals(): ProposalRunner {
  const health = useHealth(), habits = useHabits(), fasting = useFasting(), platform = usePlatform(), router = useRouter();
  const reminders = useReminders(), zigiReminders = useDeviceRecord(ZIGI_REMINDERS), weekly = useWeeklyReview(), memory = useDeviceRecord(AI_MEMORY);
  const settings = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings);
  const stores = useMemo<Stores>(() => ({health: health.data, habits: habits.data, fasting: fasting.data, platform: platform.data, reminders: reminders.data, zigiReminders: zigiReminders.data, weekly: weekly.data, memory: memory.data, settings: settings.data}), [health.data, habits.data, fasting.data, platform.data, reminders.data, zigiReminders.data, weekly.data, memory.data, settings.data]);
  const ready = health.loaded && habits.loaded && fasting.loaded && platform.loaded && reminders.loaded && zigiReminders.loaded && weekly.loaded && memory.loaded && settings.loaded && !health.error && !habits.error && !platform.error && !fasting.unreadable && !settings.error;
  const days = useCallback((now: Date) => {
    let day = now.toISOString().slice(0, 10), habitDay = day;
    try { day = healthDay(dailyData(health.data).preferences.timezone, now); } catch { /* an unknown zone falls back to the UTC date */ }
    try { habitDay = habitCalendarDay(habits.data, now); } catch { habitDay = day; }
    return {day, habitDay};
  }, [habits.data, health.data]);
  const plan = useCallback((action: Action, handles: readonly Handle[], refs?: ReadonlyMap<string, {id: string; title: string}>): PlanResult => {
    const now = new Date(), timeZone = habits.data.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone, {day, habitDay} = days(now);
    // Session AF (L4): the Checklist's records as this device holds them, read when a card is planned (its cards only), and
    // the validators the Earn page read in this visit (a staking card may name one by its name).
    const env: Env = {stores, handles, now, habitDay, healthDay: day, timeZone, ...(refs ? {refs} : {}), checklist: checklistEnv(now), earn: {validators: earnSnapshot().validators}};
    return planAction(action, env);
  }, [days, stores, habits.data]);
  /** "Actions by ZIGi" (Activity): a confirmed card is noted, an undone one forgotten; the note is a convenience and never blocks. */
  const note = useCallback((p: Plan, done: boolean, auto = false) => {
    if (!p.activity) return;
    try { if (done) recordAction(getAppStorage(), {activityId: p.activity.id.slice(0, 200), kind: p.card.kind, title: p.activity.title.slice(0, 160) || p.card.title.slice(0, 160), at: new Date().toISOString(), ...(auto ? {auto: true} : {})}); else forgetAction(getAppStorage(), p.activity.id.slice(0, 200)); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: AI_ACTIONS_KEY})); }
    catch { /* the record itself was written; only the note is missing */ }
  }, []);
  /** One write through a store's own update: the change sees the latest record, and the stores it leaves are returned. */
  const through = useCallback(async <K extends Written>(key: K, update: Updater<K>, change: (base: Stores) => Stores): Promise<Stores> => {
    let after = stores;
    await update(latest => { const base = {...stores, [key]: latest}; after = change(base); return after[key]; });
    return after;
  }, [stores]);
  const run = useCallback((p: Plan, write: (base: Stores) => Stores, prior?: Stores): Promise<Stores> => {
    // Session AF (L4): within one batch the next write sees what the one before it left (a plan's new habit, then its
    // reminder), with its own record still read fresh from its store; without `prior`, the render's stores as before.
    const change = prior && p.target !== 'form' ? (base: Stores) => write({...prior, [p.target]: base[p.target as Written]}) : write;
    switch (p.target) {
      case 'health': return through('health', health.update, change);
      case 'habits': return through('habits', habits.update, change);
      case 'platform': return through('platform', platform.update, change);
      case 'fasting': return through('fasting', fasting.update, change);
      case 'reminders': return through('reminders', next => reminders.update(days(new Date()).habitDay, next), change);
      case 'zigiReminders': return through('zigiReminders', zigiReminders.update, change);
      case 'weekly': return through('weekly', weekly.update, change);
      case 'memory': return through('memory', memory.update, change);
      case 'settings': return through('settings', settings.update, change);
      case 'form': return Promise.resolve(prior ?? stores);
    }
  }, [through, health.update, habits.update, platform.update, fasting.update, reminders, zigiReminders.update, weekly.update, memory.update, settings.update, days, stores]);
  const apply = useCallback(async (p: Plan, auto = false, prior?: Stores) => { const after = await run(p, base => ({...base, ...p.write(base)}), prior); note(p, true, auto); return after; }, [note, run]);
  const applyAll = useCallback(async (plans: readonly Plan[]) => {
    const after: Stores[] = [];
    for (const p of plans) {
      try { after.push(await apply(p, false, after.at(-1))); }
      catch (error) { return {after, error: error instanceof Error ? error.message : 'A proposal could not be written.'}; }
    }
    return {after, error: null};
  }, [apply]);
  const undo = useCallback(async (plans: readonly Plan[], after: readonly Stores[]): Promise<string | null> => {
    const pairs = plans.map((p, i) => ({p, undo: p.undo, baseline: after[i]})).filter((x): x is {p: Plan; undo: NonNullable<Plan['undo']>; baseline: Stores} => !!x.undo && !!x.baseline);
    // Every record must still be as the writes left it, checked on the latest stores before anything is undone.
    if (pairs.some(({undo: u, baseline}) => !u.unchanged(baseline, stores))) return UNDO_REFUSED;
    for (const {p, undo: u, baseline} of [...pairs].reverse()) {
      try { await run(p, base => { if (!u.unchanged(baseline, base)) throw new UndoRefused(); return {...base, ...u.write(base)}; }); note(p, false); }
      catch (error) { return error instanceof Error ? error.message : 'This undo could not be applied.'; }
    }
    return null;
  }, [note, run, stores]);
  const openForm = useCallback((p: Plan) => {
    // Session W Part 21: an account's balance goes to Wealth's own balance form the same way. Already on Wealth, the hash
    // is set directly so its accounts' fold opens on a phone (a router push changes no hash event).
    if (p.balance) {
      const stashed = stashBalancePrefill(p.balance);
      if (stashed) window.dispatchEvent(new Event(BALANCE_PREFILL_EVENT));
      if (window.location.pathname === '/app/wealth') window.location.hash = BALANCE_PREFILL_ROUTE.split('#')[1]!; else router.push(BALANCE_PREFILL_ROUTE);
      return stashed;
    }
    if (!p.prefill) return false;
    const {category, name, quantity, currency, value, symbol, notes} = p.prefill;
    const stashed = stashPrefill({category, name, quantity, currency, value, symbol, notes});
    router.push(PREFILL_ROUTE);
    return stashed;
  }, [router]);
  const look = useDeviceRecord(ZIGI);
  const effect = useCallback((p: Plan) => {
    // Session AF (ADR-028 D7, H47): the staking review, filled in. Only the plain fields are handed over; the Staking page
    // reads them once, and nothing is signed until the person reviews them there and signs in their own wallet.
    if (p.staking) {
      const stashed = stashStakingPrefill(p.staking), [path, hash] = STAKING_PREFILL_ROUTE.split('#') as [string, string];
      if (window.location.pathname === path) window.location.hash = hash; else router.push(STAKING_PREFILL_ROUTE);
      return {text: stashed ? 'The staking review is opening on Staking, filled in. Nothing is signed until you review it and sign in your own wallet.' : 'The values could not be handed over; type them into the staking form.', navigated: true};
    }
    // Session AA-Local, merged second (ADR-022 B53): a card that changes a device record AND opens a page (the calculator's figures, the Life review's period) applies the record first, then navigates.
    if (p.device && p.navigate) { const pre = runnerEffect({device: p.device}); if (pre?.kind === 'record') { const spec = deviceWriteSpec(pre.key); if (spec) { updateDeviceRecord(getAppStorage(), spec, r => applyDeviceWrite(pre.key, r, pre.patch)); try { window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: pre.key})); } catch { /* no window */ } } } }
    const e = runnerEffect(p);
    if (!e) return null;
    if (e.kind === 'device') { look.update(record => lookPatched(record, e.patch)); return {text: effectStatus(e), navigated: false}; }
    if (e.kind === 'record') { const spec = deviceWriteSpec(e.key); if (!spec) return null; updateDeviceRecord(getAppStorage(), spec, r => applyDeviceWrite(e.key, r, e.patch)); try { window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: e.key})); } catch { /* no window */ } return {text: effectStatus(e), navigated: false}; }
    const href = e.kind === 'confirm' ? confirmHref(e) : e.href, [path, hash] = href.split('#') as [string, string | undefined];
    // A hash on the page already shown is set directly (a router push changes no hash event), as openForm does.
    if (hash !== undefined && window.location.pathname + window.location.search === path) window.location.hash = hash; else router.push(href);
    return {text: effectStatus(e), navigated: true};
  }, [look, router]);
  return {ready, stores, plan, apply, applyAll, undo, openForm, effect};
}
