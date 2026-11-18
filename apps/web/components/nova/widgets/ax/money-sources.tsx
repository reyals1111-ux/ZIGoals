'use client';
import {useMemo, type ReactNode} from 'react';
import type {Accounts} from '../../../../lib/accounts/schema';
import {ACCOUNTS} from '../../../../lib/accounts/schema';
import {BILLS, type BillsRecord} from '../../../../lib/bills/schema';
import {BUDGETS, type BudgetsRecord} from '../../../../lib/budgets/schema';
import {paceForecast, privateGoalPoints, type Forecast} from '../../../../lib/goal-forecast';
import type {GoalSummary} from '../../../../lib/goal-summary';
import {localDate} from '../../../../lib/local-date';
import {MONEY_LOG, type MoneyEntry} from '../../../../lib/money-log/schema';
import {NETWORTH_HISTORY, type NetworthHistory} from '../../../../lib/networth-history';
import {focusGoal, type FocusGoal} from '../../../../lib/nova/cards/goal-focus';
import type {GoalArc} from '../../../../lib/nova/holo/goals';
import {useDeviceRecord} from '../../../ai/use-device-record';
import {useEvidenceNow} from '../../../platform/use-evidence-now';
import {usePlatform} from '../../../platform/use-platform';
import {useLocalToday} from '../../../use-local-today';
import {CardNotice} from '../../cards/kit';
import {HoloHidden, HoloReading, HoloUnread} from '../../holo/parts';
import {useGoalsHud, usePillarShown} from '../../holo/use-hud-data';

/**
 * Session AS (ADR-042 Part 2, Wealth and Goals): where the answer widgets of this group get their records — the pages'
 * own stores, through the hooks the other Wealth and Goals widgets use, each behind its pillar's switch. A source handles
 * every state that has no figure (the pillar switched off, reading, unreadable, nothing kept yet) and hands the live
 * records to its child, so a widget kind is only its instrument. Everything is read only: nothing here pays, moves or
 * records anything.
 */
type Kind = 'expense' | 'income';
export function MoneyLogSource({kind, children}: {/** The entries the widget needs at least one of; absent: any entry. */ kind?: Kind; children: (entries: readonly MoneyEntry[], today: string) => ReactNode}) {
  const shown = usePillarShown('wealth'), log = useDeviceRecord(MONEY_LOG), today = useLocalToday();
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!log.loaded) return <HoloReading/>;
  if (log.unreadable) return <HoloUnread what="Your money log"/>;
  const entries = log.data.entries;
  if (!(kind ? entries.some(e => e.kind === kind) : entries.length)) return kind === 'income'
    ? <CardNotice kind="empty" ghost="bars" title="No income logged yet" href="/app/wealth#spending" action="Log income">Log what comes in on Wealth and it shows here.</CardNotice>
    : <CardNotice kind="empty" ghost="bars" title="Nothing logged yet" href="/app/wealth#spending" action="Log what you spent">Log what you spend on Wealth and it shows here, day by day.</CardNotice>;
  return <>{children(entries, today)}</>;
}
export function BillsSource({children}: {children: (bills: BillsRecord, today: string) => ReactNode}) {
  const shown = usePillarShown('wealth'), bills = useDeviceRecord(BILLS), today = useLocalToday();
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!bills.loaded) return <HoloReading/>;
  if (bills.unreadable) return <HoloUnread what="Your bill reminders"/>;
  if (!bills.data.bills.length) return <CardNotice kind="empty" ghost="rows" title="No bills kept yet" href="/app/wealth?view=bills" action="Add a bill">Add a bill or a subscription on Wealth and its due dates show here.</CardNotice>;
  return <>{children(bills.data, today)}</>;
}
export function BudgetsSource({children}: {children: (budgets: BudgetsRecord, entries: readonly MoneyEntry[], today: string) => ReactNode}) {
  const shown = usePillarShown('wealth'), budgets = useDeviceRecord(BUDGETS), log = useDeviceRecord(MONEY_LOG), today = useLocalToday();
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!budgets.loaded || !log.loaded) return <HoloReading/>;
  if (budgets.unreadable || log.unreadable) return <HoloUnread what="Your budgets"/>;
  if (!budgets.data.budgets.length) return <CardNotice kind="empty" ghost="ring" title="No budget yet" href="/app/wealth?view=budgets" action="Set a budget">Give a category a monthly amount on Wealth and its gauge fills here as you log.</CardNotice>;
  return <>{children(budgets.data, log.data.entries, today)}</>;
}
export function AccountsSource({children}: {children: (accounts: Accounts, today: string) => ReactNode}) {
  const shown = usePillarShown('wealth'), accounts = useDeviceRecord(ACCOUNTS), today = useLocalToday();
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!accounts.loaded) return <HoloReading/>;
  if (accounts.unreadable) return <HoloUnread what="Your accounts and debts"/>;
  return <>{children(accounts.data, today)}</>;
}
export function WorthSource({children}: {children: (history: NetworthHistory, today: string) => ReactNode}) {
  const shown = usePillarShown('wealth'), history = useDeviceRecord(NETWORTH_HISTORY), today = useLocalToday();
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!history.loaded) return <HoloReading/>;
  if (history.unreadable) return <HoloUnread what="Your net-worth history"/>;
  if (!history.data.days.length) return <CardNotice kind="empty" ghost="trend" title="No day recorded yet" href="/app/wealth#wealth-history" action="Record today on Wealth">Wealth records your net worth once on each day you open it. Days you do not open stay empty.</CardNotice>;
  return <>{children(history.data, today)}</>;
}
export const NoGoals = () => <CardNotice kind="empty" ghost="ring" title="No active goals yet" href="/app/goals/new" action="Set a goal">Set one and its progress shows here.</CardNotice>;
/** The goals as Today and Goals read them, and the Goals HUD's own active arcs (seven at most). */
export function GoalsSource({children}: {children: (goals: readonly GoalSummary[], hud: {arcs: GoalArc[]; more: number; active: number}, today: string) => ReactNode}) {
  const shown = usePillarShown('goals'), data = useGoalsHud(), today = useLocalToday();
  if (!shown) return <HoloHidden pillar="Goals"/>;
  if (!data.loaded) return <HoloReading/>;
  if (data.error || !data.arcs) return <HoloUnread what="Your goals"/>;
  if (!data.arcs.active) return <NoGoals/>;
  return <>{children('goals' in data && data.goals ? data.goals : [], data.arcs, today)}</>;
}
/**
 * One goal and its pace, as NOVA's "Goal" widget reads them (components/nova/widgets/goal-focus.tsx): the goal the answer
 * named (`ref`), else the lead goal of the Goals HUD; the forecast is the HUD's own when this is its lead goal, else the
 * same functions over this goal's own records. `null`: not readable; `goal: null`: no active goal.
 */
export function useGoalFocus(ref: string | undefined): {loaded: boolean; error: boolean; focus: {goal: FocusGoal | null; forecast: Forecast | null} | null} {
  const data = useGoalsHud(), platform = usePlatform(), now = useEvidenceNow(platform.data, 0);
  const focus = useMemo((): {goal: FocusGoal | null; forecast: Forecast | null} | null => {
    if (!data.loaded || data.error || !data.arcs) return null;
    const goals = 'goals' in data && data.goals ? data.goals : [], goal = focusGoal(goals, data.arcs.arcs, ref, data.pace?.href ?? null);
    if (!goal) return {goal: null, forecast: null};
    if (data.pace && data.pace.href === goal.href) return {goal, forecast: data.pace.forecast};
    const summary = goals.find(g => g.key === goal.key), stored = platform.loaded && !platform.error ? platform.data.goals.find(g => `private:${g.id}` === goal.key) : undefined;
    const current = Number(summary?.current), target = Number(summary?.target);
    if (!summary || !stored || stored.type === 'PROJECT' || summary.progressBound === 'unavailable' || !Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return {goal, forecast: null};
    const today = localDate(new Date(now)), points = privateGoalPoints(stored, platform.data.contributions ?? [], current, today);
    return {goal, forecast: paceForecast(points, current, target, today)};
  }, [data, ref, platform.loaded, platform.error, platform.data, now]);
  return {loaded: data.loaded, error: !!data.error, focus};
}
