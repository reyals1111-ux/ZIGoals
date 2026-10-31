import * as z from 'zod';
import {ruleSentence} from '../../auto-rules/engine';
import type {AutoRules} from '../../auto-rules/schema';
import {billOccurrences, monthlyEstimate} from '../../bills/store';
import type {BillsRecord} from '../../bills/schema';
import {fromCents} from '../../money-log/engine';
import {alertLine} from '../../price-alerts/engine';
import type {PriceAlerts} from '../../price-alerts/schema';
import {privateGoalPoints} from '../../goal-forecast';
import {PROJECTION_LABEL, pace30, requiredPace, whatIf} from '../../goals/what-if';
import {AVAILABLE, purposeAssets, purposeFlows} from '../../allocation/purpose';
import {wealthOverview} from '../../wealth';
import {moneyText} from '../context/builders';
import type {ToolEnv} from './env';
import {capRows, num, ok, plural, provenance, refuse, text} from './format';
import {findGoal} from './goals';
import {NO_ARGS, type ToolDefinition} from './types';

/**
 * Session AK (Part 12): ZIGi's read-only tools for this session's features, over the person's own device records only
 * (each behind its area's switch, like every tool): the habits' auto-complete rules, the bills and subscriptions, the
 * price alerts, a goal's what-if (a projection, labelled so) and the purpose allocation (what each asset is set aside
 * for). Nothing here writes, fetches or suggests an amount; money stays per currency, never converted; a value the app
 * does not know is "unknown", never 0. Names are the person's own words, escaped as data (text()).
 */
export type AkToolSources = {autoRules?: AutoRules | null; bills?: BillsRecord | null; priceAlerts?: PriceAlerts | null};
const where = (env: ToolEnv, journal: string, subject: string | null = null) => provenance(env, journal, subject, null, null);

export const autoRulesTool: ToolDefinition<Record<string, never>> = {
  name: 'auto_rules', title: 'Auto-complete rules', area: 'habits',
  description: 'The person\'s auto-complete rules: which habit ticks itself off from which of their own records (steps, sleep, water, active minutes, workouts, a goal\'s contributions), each as a sentence with the habit\'s handle, and whether it is paused; with the days ticked by a rule over the last week.',
  parameters: {type: 'object', properties: {}}, args: NO_ARGS,
  label: () => 'Auto-complete rules',
  run(_args, env, label) {
    const record = env.ak?.autoRules;
    if (!record || !record.rules.length) return ok('auto_rules', label, where(env, 'Habits'), {rules: [], note: 'No auto-complete rules yet. A rule is set in a habit ("When steps ≥ 8,000 → Walk is done"), or ZIGi proposes one as a card.'});
    const goals = new Map(env.platform.goals.map(g => [g.id, g.name]));
    const rows = record.rules.flatMap(rule => {
      const habit = env.habits.habits.find(h => h.id === rule.habitId); if (!habit) return [];
      return [{habit: env.handles.add('habit', habit.id, habit.title), sentence: text(ruleSentence(rule, habit.title, rule.goalId ? goals.get(rule.goalId) : undefined), 160), source: rule.source, paused: !!rule.paused}];
    });
    const week = env.habitDay, since = new Date(Date.parse(`${week}T00:00:00Z`) - 6 * 86_400_000).toISOString().slice(0, 10);
    const ticked = record.applied.filter(a => a.date >= since && a.date <= week && !a.undone).length;
    const capped = capRows(rows, env, false);
    return ok('auto_rules', label, where(env, 'Habits'), {rules: capped.rows, count: rows.length, daysTickedByARuleThisWeek: ticked}, capped.truncated);
  },
};

export const billsTool: ToolDefinition<{days?: number}> = {
  name: 'bills', title: 'Bills', area: 'wealth',
  description: 'The bills and subscriptions the person keeps as reminders (Wealth → Upcoming bills): what is due in the next days (default 30) with amounts in each bill\'s own currency, the monthly estimate per currency (a weekly bill counts 52 ÷ 12 times), and their notes to self. ZIGoals never pays or cancels anything.',
  parameters: {type: 'object', properties: {days: {type: 'integer', description: 'How many days ahead, 1 to 90 (default 30).'}}},
  args: z.object({days: z.number().int().min(1).max(90).optional()}),
  label: args => `Bills · next ${args.days ?? 30} days`,
  run(args, env, label) {
    const record = env.ak?.bills;
    if (!record || !record.bills.length) return ok('bills', label, where(env, 'Bills'), {due: [], note: 'No bills or subscriptions are kept yet (Wealth → Upcoming bills).'});
    const due = billOccurrences(record, env.habitDay, args.days ?? 30).map(o => ({bill: text(o.title, 80), due: o.due, amount: `${fromCents(o.amountCents)} ${o.currency}`, every: o.cadence, ...(o.cancelNote ? {note: text(o.cancelNote, 160)} : {}), ...(o.cancelBy ? {actBy: o.cancelBy} : {})}));
    const capped = capRows(due, env, false);
    return ok('bills', label, where(env, 'Bills'), {due: capped.rows, bills: record.bills.length, monthlyEstimate: monthlyEstimate(record).map(m => `${fromCents(m.cents)} ${m.currency}`),
      rule: 'reminders only, per currency, never converted; the monthly figure is an estimate'}, capped.truncated);
  },
};

export const priceAlertsTool: ToolDefinition<Record<string, never>> = {
  name: 'price_alerts', title: 'Price alerts', area: 'wealth',
  description: 'The person\'s price alerts (a coin above or below a price, or when a coin puts a goal at a percent): each as a line, whether it is on, and when it last went off. Alerts are checked with prices the app already reads; nothing buys or sells.',
  parameters: {type: 'object', properties: {}}, args: NO_ARGS,
  label: () => 'Price alerts',
  run(_args, env, label) {
    const record = env.ak?.priceAlerts;
    if (!record || !record.alerts.length) return ok('price_alerts', label, where(env, 'Price alerts'), {alerts: [], note: 'No price alerts yet.'});
    const rows = record.alerts.map(a => ({alert: text(alertLine(a), 160), on: a.active, ...(a.firedAt ? {wentOff: a.firedAt.slice(0, 10)} : {})}));
    return ok('price_alerts', label, where(env, 'Price alerts'), {alerts: rows, count: rows.length, rule: 'never advice; nothing is bought, sold or moved'});
  },
};

type WhatIfArgs = {goal: string; extra_per_month?: number; regular_amount?: number; regular_every?: 'week' | 'two-weeks' | 'month'; target_date?: string};
export const goalWhatIfTool: ToolDefinition<WhatIfArgs> = {
  name: 'goal_what_if', title: 'What if', area: 'goals',
  description: 'A projection for one of the person\'s own goals from its own records: the 30-day pace and the date it reaches the target at that pace, and with the changes asked about (an extra amount a month, a regular amount instead, or a target date and the pace it needs). Always a projection, never a guarantee; it assumes no growth.',
  parameters: {type: 'object', properties: {goal: {type: 'string', description: 'The goal: a handle (g1) or its name.'}, extra_per_month: {type: 'number', description: 'An extra amount every month, in the goal\'s currency.'}, regular_amount: {type: 'number', description: 'A regular amount instead of the recorded pace.'}, regular_every: {type: 'string', enum: ['week', 'two-weeks', 'month'], description: 'How often the regular amount comes (default month).'}, target_date: {type: 'string', description: 'A target date, YYYY-MM-DD.'}}, required: ['goal']},
  args: z.object({goal: z.string().trim().min(1).max(120), extra_per_month: z.number().finite().min(0).max(1e9).optional(), regular_amount: z.number().finite().min(0).max(1e9).optional(), regular_every: z.enum(['week', 'two-weeks', 'month']).optional(), target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()}),
  label: args => `What if · ${text(args.goal, 40)}`,
  run(args, env, label) {
    const found = findGoal(env, args.goal, 'goal_what_if'); if (!found.ok) return found;
    const summary = found.goal, goal = summary.key.startsWith('private:') ? env.platform.goals.find(g => `private:${g.id}` === summary.key) : undefined;
    if (!goal || goal.type === 'PROJECT') return refuse('goal_what_if', label, 'not-found', `${text(summary.name, 60)} has no amount to project (a project goal counts milestones).`);
    const current = Number(summary.current), target = Number(summary.target), today = env.habitDay;
    if (summary.progressBound === 'unavailable' || !Number.isFinite(current) || !(target > 0)) return ok('goal_what_if', label, where(env, 'Goals', text(summary.name, 60)), {goal: found.handle, projection: 'unknown', note: 'This goal\'s value is not known here, so no projection is made (unknown is not zero).'});
    const pace = pace30(privateGoalPoints(goal, env.platform.contributions ?? [], current, today), current, target, today);
    const targetDate = args.target_date && args.target_date > today ? args.target_date : null;
    const result = whatIf({current, target, today, pace}, {extraPerMonth: args.extra_per_month, regular: args.regular_amount ? {amount: args.regular_amount, every: args.regular_every ?? 'month'} : null, targetDate});
    const needed = targetDate ? requiredPace(current, target, today, targetDate) : null, unit = summary.currency;
    return ok('goal_what_if', label, where(env, 'Goals', text(summary.name, 60)), {goal: found.handle, now: `${num(current, 2)} ${unit}`, target: `${num(target, 2)} ${unit}`,
      recordedPace: {state: pace.state, perMonth: pace.perMonth === null ? 'unknown' : `${num(pace.perMonth, 2)} ${unit}`, reachesOn: pace.date ?? 'not at this pace'},
      withChanges: {basis: result.basis, perMonth: `${num(result.perMonth, 2)} ${unit}`, reachesOn: result.date ?? 'not at this pace', daysSooner: result.shiftDays === null ? 'unknown' : -result.shiftDays},
      ...(needed ? {targetDate: {date: targetDate, needsPerMonth: `${num(needed.perMonth, 2)} ${unit}`, met: result.meetsTargetDate}} : {}),
      label: PROJECTION_LABEL, rule: 'from the goal\'s own records; no growth assumed; not advice'});
  },
};

export const purposeTool: ToolDefinition<Record<string, never>> = {
  name: 'purpose_allocation', title: 'What each asset is for', area: 'wealth',
  description: 'The purpose allocation from the person\'s own records: per currency, how much of their known value is set aside for each open goal (from the allocations they made), what is still available, and which assets have no known value (left out, never counted as 0). Read-only; explains, never advises.',
  parameters: {type: 'object', properties: {}}, args: NO_ARGS,
  label: () => 'What each asset is for',
  run(_args, env, label) {
    const rows = wealthOverview(env.platform, env.now.getTime(), env.quotes).rows;
    const {views, unvalued} = purposeFlows({assets: purposeAssets(rows), goals: env.platform.goals, allocations: env.platform.allocations});
    if (!views.length) return ok('purpose_allocation', label, where(env, 'Wealth'), {views: [], unvalued: unvalued.length, note: 'No asset with a known value yet, so nothing can be shown as set aside. Add a valued asset and allocate it to a goal.'});
    const share = (part: bigint, total: bigint) => total > 0n ? `${(Number(part * 1000n / total) / 10).toFixed(1)} %` : 'unknown';
    const out = views.map(v => ({currency: v.currency, knownValue: `${moneyText(v.total)} ${v.currency}`,
      setAside: v.targets.filter(t => t.kind === 'goal').map(t => ({goal: env.handles.add('goal', t.id.replace(/^goal:/, 'private:'), t.label), name: text(t.label, 60), value: `${moneyText(t.value)} ${v.currency}`, share: share(t.value, v.total)})),
      stillAvailable: `${moneyText(v.targets.find(t => t.id === AVAILABLE)?.value ?? 0n)} ${v.currency}`,
      assets: v.assets.slice(0, 12).map(a => ({asset: text(a.label, 30), value: `${moneyText(a.value)} ${v.currency}`, for: v.flows.filter(f => f.from === a.id).map(f => f.to === AVAILABLE ? 'still available' : text(v.targets.find(t => t.id === f.to)?.label ?? 'a goal', 60))}))}));
    return ok('purpose_allocation', label, where(env, 'Wealth'), {views: out, ...(unvalued.length ? {withoutAKnownValue: plural(unvalued.length, 'asset')} : {}),
      rule: 'from the person\'s own allocations; one currency at a time, never converted; an over-promised asset is scaled down as Goals does'});
  },
};
export const AK_TOOLS = [autoRulesTool, billsTool, priceAlertsTool, goalWhatIfTool, purposeTool] as const;
