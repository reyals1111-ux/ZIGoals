'use client';
import {useMemo} from 'react';
import {useHealth} from '../../health/use-health';
import {useHealthToday} from '../../health/use-health-today';
import {useHabits} from '../../habits/use-habits';
import {usePlatform} from '../../platform/use-platform';
import {useGoals} from '../../goal-provider';
import {useMarketQuotes} from '../../platform/use-market-quotes';
import {useEvidenceNow} from '../../platform/use-evidence-now';
import {usePagesView} from '../../pages/use-pages-view';
import {useDeviceRecord} from '../../ai/use-device-record';
import {isShown} from '../../../lib/pages/visibility';
import {dailyData} from '../../../lib/health-daily';
import {wealthMarketRequests, wealthOverview} from '../../../lib/wealth';
import {uniqueMarketRequests} from '../../../lib/market-assets';
import {privateGoalSummary, unifiedGoalSummaries} from '../../../lib/goal-summary';
import {paceForecast, privateGoalPoints} from '../../../lib/goal-forecast';
import {purposeAssets, purposeFlows} from '../../../lib/allocation/purpose';
import {localDate} from '../../../lib/local-date';
import {NOVA_SETUP} from '../../../lib/nova/setup';
import {scopesOf} from '../../../lib/nova/scopes';
import {healthHud} from '../../../lib/nova/holo/health';
import {habitsHud} from '../../../lib/nova/holo/habits';
import {goalArcs, paceChart} from '../../../lib/nova/holo/goals';
import {wealthHud} from '../../../lib/nova/holo/wealth';

/**
 * Session AL Part 11 (lane L8): the HUD's data, each through the page's own store hook (so a change anywhere — this tab,
 * another tab through the app's BroadcastChannel `zigoals:private-updates:v1` and storage events — updates the HUD at
 * once) and the pure selectors in lib/nova/holo. Each hook loads only with the panels that need it.
 */
export type Pillar = 'health' | 'habits' | 'goals' | 'wealth';
/** Whether the pillar's page is switched on under Your pages & buttons (a hidden pillar's panel says so instead). */
export function usePillarShown(pillar: Pillar): boolean { return isShown(usePagesView(), pillar); }
/** NOVA's own Health permission (its chat reads Health only when the person allowed it); the HUD says so on Health panels. */
export function useHealthShared(): boolean {
  const setup = useDeviceRecord(NOVA_SETUP);
  return scopesOf(setup.loaded && !setup.unreadable ? setup.data : {version: 1}).health;
}

export function useHealthHud() {
  const health = useHealth(), zone = health.loaded && !health.error ? dailyData(health.data).preferences.timezone : null;
  // The Health journal's day, as the Health page and Today's health card read it.
  const day = useHealthToday(zone);
  const hud = useMemo(() => { if (!health.loaded || health.error) return null; try { return healthHud(health.data, day); } catch { return null; } }, [health.loaded, health.error, health.data, day]);
  return {hud, day, loaded: health.loaded, error: !!health.error || (health.loaded && !health.error && !hud), health};
}

export function useHabitsHud() {
  const habits = useHabits();
  const hud = useMemo(() => habits.loaded && !habits.error ? habitsHud(habits.data.habits, habits.today) : null, [habits.loaded, habits.error, habits.data, habits.today]);
  return {hud, loaded: habits.loaded, error: !!habits.error, habits};
}

/** The goals as Today summarises them (with the same prices), and the lead private goal's pace (its forecast panel's). */
export function useGoalsHud() {
  const platform = usePlatform(), legacy = useGoals();
  const requests = platform.loaded && !platform.error && platform.data.goals.length ? wealthMarketRequests(platform.data) : false;
  const market = useMarketQuotes(requests), now = useEvidenceNow(platform.data, market.now);
  return useMemo(() => {
    if (!platform.loaded || platform.error) return {loaded: platform.loaded && legacy.loaded, error: !!platform.error, arcs: null, pace: null};
    const goals = unifiedGoalSummaries(legacy.goals, legacy.metadata?.goals ?? {}, platform.data, market.quotes, now, legacy.mode === 'local' ? 'Local simulation' : 'Future Goal Manager')
      .filter(g => !g.key.startsWith('legacy:') || !platform.data.legacyGoalUi?.[`${legacy.chain}:${legacy.owner}:${g.id}`]?.archived);
    const today = localDate(new Date(now));
    let pace: {name: string; href: string; chart: NonNullable<ReturnType<typeof paceChart>>; forecast: ReturnType<typeof paceForecast>; current: number; target: number} | null = null;
    for (const goal of platform.data.goals.filter(g => g.status === 'active' && g.type !== 'PROJECT')) {
      const summary = privateGoalSummary(platform.data, goal, market.quotes, now), current = Number(summary.current), target = Number(summary.target);
      if (summary.progressBound === 'unavailable' || !Number.isFinite(current) || !Number.isFinite(target) || target <= 0) continue;
      const points = privateGoalPoints(goal, platform.data.contributions ?? [], current, today), forecast = paceForecast(points, current, target, today);
      const chart = paceChart(points, current, target, today, forecast);
      if (chart) { pace = {name: goal.name, href: summary.href, chart, forecast, current, target}; break; }
    }
    return {loaded: legacy.loaded, error: false, arcs: goalArcs(goals, 7), pace, goals};
  }, [platform.loaded, platform.error, platform.data, legacy.loaded, legacy.goals, legacy.metadata, legacy.mode, legacy.chain, legacy.owner, market.quotes, now]);
}

/** Wealth's own overview (the same requests and quotes as the Wealth page) and its purpose flow. Reads only. */
export function useWealthHud() {
  const store = usePlatform();
  const requests = useMemo(() => store.loaded && !store.error ? uniqueMarketRequests([...wealthMarketRequests(store.data), ...store.data.positions.flatMap(p => p.marketRef && !p.archivedAt && (p.marketRef.kind !== 'rwa' || (p.quoteCurrency ?? 'USD') === 'USD') ? [{marketRef: p.marketRef, currency: p.quoteCurrency ?? 'USD' as const}] : [])]) : false, [store.loaded, store.error, store.data]);
  const market = useMarketQuotes(requests), now = useEvidenceNow(store.data, market.now);
  const hud = useMemo(() => {
    if (!store.loaded || store.error) return null;
    const overview = wealthOverview(store.data, now, market.quotes);
    const {views} = purposeFlows({assets: purposeAssets(overview.rows, r => r.position.providerId || r.position.asset), goals: store.data.goals, allocations: store.data.allocations});
    return {...wealthHud(overview, views), nowAt: new Date(now).toISOString()};
  }, [store.loaded, store.error, store.data, now, market.quotes]);
  return {hud, loaded: store.loaded, error: !!store.error};
}
