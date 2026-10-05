import {z} from 'zod';
import {formatUnits, TESTNET} from '@zigoals/chain-config';
import {createEmptyHealth} from '../../health';
import {fundingHealth} from '../../goal-intelligence';
import {progressText, unifiedGoalSummaries, type GoalSummary} from '../../goal-summary';
import {planDay, planZone} from '../../plan-revisions';
import {reviewState, reviewWindow, weekSummary} from '../../weekly-review/engine';
import {addLocalDays} from '../../local-date';
import type {ToolEnv} from './env';
import {capRows, ok, plural, provenance, refuse, text} from './format';
import {parseRange, type DayRange} from './range';
import {matchByName} from './subjects';
import type {ToolDefinition, ToolRefusal} from './types';

/**
 * Goal tools (Session V Part 2): the goals the person sees in Goals, from the app's own summaries (`unifiedGoalSummaries`,
 * `fundingHealth`, `goalTimeline`'s events), named by handle (g1), never by identifier. Money is the app's own exact
 * decimal text with its currency, one total per currency and never converted; a value the app does not know is said to
 * be unknown. Nothing here suggests an amount, a date or an investment: the plan's figures are the person's own plan.
 */
export const summaries = (env: ToolEnv) => unifiedGoalSummaries(env.localGoals, env.metadata, env.platform, env.quotes, env.now.getTime());
const where = (env: ToolEnv, subject: string | null, range: DayRange | null, zone: string | null = null) => provenance(env, 'Goals', subject, range, zone);
const amount = (value: string | undefined, currency: string) => value === undefined ? 'unknown' : `${value} ${currency}`;
function goalRow(env: ToolEnv, goal: GoalSummary, full: boolean) {
  const base = {handle: env.handles.add('goal', goal.key, goal.name), name: text(goal.name), status: goal.status, progress: progressText(goal.progressPct, goal.progressBound), nextPlannedDate: goal.nextContributionDate ?? 'none', targetDate: goal.targetDate ?? 'none'};
  if (!full) return base;
  return {...base, type: text(goal.type, 40), source: goal.source, now: goal.progressBound === 'unavailable' && goal.heldAsset ? `${goal.current} ${goal.heldAsset} held (value unknown)` : amount(goal.current, goal.currency), target: amount(goal.target, goal.currency), remaining: goal.progressBound === 'unavailable' ? 'unknown' : amount(goal.remaining, goal.currency), funding: goal.fundingHealth.toLowerCase(), needsReview: goal.requiresReview, ...(goal.valuationLabel ? {valuation: text(goal.valuationLabel, 160)} : {}), ...(goal.unvaluedSources ? {unvaluedSources: `${plural(goal.unvaluedSources, 'source')} without a value; progress is at least this`} : {})};
}
/** One goal from a handle or the person's words; equally good matches come back as choices. */
export function findGoal(env: ToolEnv, ref: string, tool: string): {ok: true; goal: GoalSummary; handle: string} | ToolRefusal {
  const all = summaries(env), label = text(ref, 40);
  if (/^g\d{1,3}$/i.test(ref.trim())) {
    const handle = env.handles.find(ref, 'goal'), goal = handle ? all.find(g => g.key === handle.id) : undefined;
    return goal && handle ? {ok: true, goal, handle: handle.handle} : refuse(tool, label, 'not-found', `No goal ${ref.trim()} in this conversation; name the goal instead.`);
  }
  const match = matchByName(all, ref, g => g.name, g => g.key);
  if (match.kind === 'none') return refuse(tool, label, 'not-found', `No goal matches "${label}".`);
  if (match.kind === 'many') return refuse(tool, label, 'ambiguous', `Two or more goals match "${label}". Which one?`, match.choices.map(c => ({label: text(c.label, 60), handle: env.handles.add('goal', c.id, c.label)})));
  return {ok: true, goal: match.item, handle: env.handles.add('goal', match.item.key, match.item.name)};
}
const GOAL_PROP = {type: 'string', description: 'The goal: a handle from this conversation (g1) or its name as the person said it.'} as const;

export const listGoals: ToolDefinition<{include_closed?: boolean}> = {
  name: 'list_goals', title: 'Goals', area: 'goals',
  description: 'Lists the person\'s goals with a handle each: status, progress, what is held now, target, what remains (each in the goal\'s own currency), target date, next planned date and funding status.',
  parameters: {type: 'object', properties: {include_closed: {type: 'boolean', description: 'Also list closed goals (default false).'}}},
  args: z.object({include_closed: z.boolean().optional()}),
  label: () => 'Your goals',
  run(args, env, label) {
    const rows = summaries(env).filter(g => args.include_closed || g.status !== 'closed').map(g => goalRow(env, g, true));
    const capped = capRows(rows, env, false);
    return ok('list_goals', label, where(env, null, null), {goals: capped.rows, count: rows.length, ...(rows.length ? {} : {note: 'No goals yet.'})}, capped.truncated);
  },
};

export const goalProgress: ToolDefinition<{goal: string}> = {
  name: 'goal_progress', title: 'Goal progress', area: 'goals',
  description: 'One goal in detail: progress, held now, target, remaining, dates, the plan\'s own figures as the app shows them, funding status and any notes that need review.',
  parameters: {type: 'object', properties: {goal: GOAL_PROP}, required: ['goal']},
  args: z.object({goal: z.string().trim().min(1).max(120)}),
  label: args => `Goal · ${text(args.goal, 40)}`,
  run(args, env) {
    const found = findGoal(env, args.goal, 'goal_progress'); if (!found.ok) return found;
    const goal = found.goal, label = `Goal · ${text(goal.name, 40)}`, data: Record<string, unknown> = {...goalRow(env, goal, true), planFigures: goal.metadata.map(m => `${text(m.label, 40)}: ${text(m.value, 60)}`)};
    const privateGoal = goal.key.startsWith('private:') ? env.platform.goals.find(g => `private:${g.id}` === goal.key) : undefined;
    if (privateGoal && privateGoal.type !== 'PROJECT') {
      try {
        const pulse = fundingHealth(env.platform, privateGoal.id, env.now.getTime(), env.quotes);
        data.plan = {contributedNet: `${formatUnits(pulse.actual, privateGoal.decimals)} ${privateGoal.asset}`, plannedThroughToday: `${formatUnits(pulse.plannedThroughToday, privateGoal.decimals)} ${privateGoal.asset}`, aheadOrBehind: BigInt(pulse.variance) === 0n ? 'on plan' : `${BigInt(pulse.variance) > 0n ? 'ahead by' : 'behind by'} ${formatUnits((BigInt(pulse.variance) < 0n ? -BigInt(pulse.variance) : BigInt(pulse.variance)).toString(), privateGoal.decimals)} ${privateGoal.asset}`, nextDate: pulse.nextDate ?? 'none', projectedCompletion: pulse.completionDate ?? 'unknown', status: pulse.status.replaceAll('_', ' ').toLowerCase(), notes: pulse.warnings.map(w => text(w, 200))};
      } catch { data.plan = 'needs review in Goals'; }
    }
    return ok('goal_progress', label, where(env, text(goal.name, 60), null), data);
  },
};

/** The contribution events of the range, by the plan's day (the plan's zone, UTC until a zone is saved). */
export const goalContributions: ToolDefinition<{goal?: string; range?: string}> = {
  name: 'goal_contributions', title: 'Contributions', area: 'goals',
  description: 'Contributions, withdrawals and recorded income for one goal or all goals over a period: each event with its day and amount, and totals per asset (never converted). Events without a value in the goal\'s unit are counted, not zeroed.',
  parameters: {type: 'object', properties: {goal: {...GOAL_PROP, description: 'One goal (default: all goals).'}, range: {type: 'string', description: 'A period such as "this month", "last month", "this year" or "since 2026-01-01". Default: this month.'}}},
  args: z.object({goal: z.string().trim().min(1).max(120).optional(), range: z.string().trim().max(80).optional()}),
  label: args => `${args.goal ? text(args.goal, 30) : 'Goal'} contributions · ${args.range?.trim() || 'this month'}`,
  run(args, env, label) {
    let only: GoalSummary | null = null;
    if (args.goal) { const found = findGoal(env, args.goal, 'goal_contributions'); if (!found.ok) return found; only = found.goal; }
    const today = planDay(env.now.getTime(), 'UTC'), parsed = parseRange(args.range?.trim() || 'this month', today);
    if (!parsed.ok) return refuse('goal_contributions', label, 'range', parsed.message);
    const range: DayRange = {from: parsed.from, to: parsed.to, label: parsed.label};
    const all = summaries(env), byKey = new Map(all.map(g => [g.key, g]));
    const rows: {day: string; goal: string; handle: string; kind: string; amount: string; asset: string}[] = [], totals = new Map<string, {asset: string; decimals: number; in: bigint; out: bigint; income: bigint; events: number}>();
    for (const e of env.platform.contributions) {
      const key = e.goalScope === 'private' ? `private:${e.goalId}` : `legacy:${e.goalId}`, goal = byKey.get(key);
      if (!goal || (only && only.key !== key) || Date.parse(e.occurredAt) > env.now.getTime()) continue;
      const privateGoal = e.goalScope === 'private' ? env.platform.goals.find(g => g.id === e.goalId) : undefined;
      const day = planDay(Date.parse(e.occurredAt), planZone(privateGoal));
      if (day < range.from || day > range.to) continue;
      const kind = e.reversesId ? 'correction' : e.provenance === 'REWARD_INCOME' ? 'recorded income' : e.direction === 'IN' ? 'contribution' : 'withdrawal';
      rows.push({day, goal: text(goal.name, 60), handle: env.handles.add('goal', goal.key, goal.name), kind, amount: `${e.direction === 'OUT' ? '-' : ''}${formatUnits(e.quantity, e.decimals)}`, asset: text(e.asset, 20)});
      const t = totals.get(`${e.asset}:${e.decimals}`) ?? {asset: e.asset, decimals: e.decimals, in: 0n, out: 0n, income: 0n, events: 0};
      const q = BigInt(e.quantity);
      if (e.provenance === 'REWARD_INCOME') t.income += e.direction === 'IN' ? q : -q; else if (e.direction === 'IN') t.in += q; else t.out += q;
      t.events++; totals.set(`${e.asset}:${e.decimals}`, t);
    }
    // The local simulation's own deposits and withdrawals (Local Demo goals), in ZIG's base units.
    for (const a of env.localActivity ?? []) {
      if (a.action !== 'deposit' && a.action !== 'withdraw') continue;
      const key = `legacy:${a.goalId}`, goal = byKey.get(key), day = a.timestamp.slice(0, 10);
      if (!goal || (only && only.key !== key) || day < range.from || day > range.to || !/^\d+$/.test(a.amount)) continue;
      rows.push({day, goal: text(goal.name, 60), handle: env.handles.add('goal', goal.key, goal.name), kind: a.action === 'deposit' ? 'deposit (local simulation)' : 'withdrawal (local simulation)', amount: `${a.action === 'withdraw' ? '-' : ''}${formatUnits(a.amount, TESTNET.nativeAsset.decimals)}`, asset: 'ZIG'});
      const zig = `ZIG:${TESTNET.nativeAsset.decimals}`, t = totals.get(zig) ?? {asset: 'ZIG', decimals: TESTNET.nativeAsset.decimals, in: 0n, out: 0n, income: 0n, events: 0};
      if (a.action === 'deposit') t.in += BigInt(a.amount); else t.out += BigInt(a.amount);
      t.events++; totals.set(zig, t);
    }
    rows.sort((a, b) => a.day.localeCompare(b.day));
    const perAsset = [...totals.values()].map(t => ({asset: text(t.asset, 20), contributed: formatUnits(t.in.toString(), t.decimals), withdrawn: formatUnits(t.out.toString(), t.decimals), net: `${t.in - t.out < 0n ? '-' : ''}${formatUnits((t.in - t.out < 0n ? t.out - t.in : t.in - t.out).toString(), t.decimals)}`, ...(t.income ? {recordedIncome: formatUnits((t.income < 0n ? -t.income : t.income).toString(), t.decimals)} : {}), events: t.events}));
    const capped = capRows(rows, env);
    return ok('goal_contributions', label, where(env, only ? text(only.name, 60) : null, range, 'each plan\'s own zone, UTC when none is saved'), {events: capped.rows, count: rows.length, totalsPerAsset: perAsset.length ? perAsset : 'none in this period', note: 'Totals are per asset and never converted.'}, capped.truncated);
  },
};

export const weeklyReviewTool: ToolDefinition<{week?: 'this' | 'last'}> = {
  name: 'weekly_review', title: 'Weekly review', area: 'today',
  description: 'The figures of the person\'s weekly review week (ending on their chosen review day): habit check-ins, goal contributions, the busiest day, each habit\'s scheduled and done days, the review\'s state and last week\'s intention. Health lines only when Health is shared.',
  parameters: {type: 'object', properties: {week: {type: 'string', enum: ['this', 'last'], description: 'The current review week (default) or the one before.'}}},
  args: z.object({week: z.enum(['this', 'last']).optional()}),
  label: args => `Weekly review · ${args.week === 'last' ? 'last week' : 'this week'}`,
  run(args, env, label) {
    if (!env.weekly) return refuse('weekly_review', label, 'not-found', 'The weekly review is not available on this device yet.');
    const current = reviewWindow(env.weekly.weekday, env.habitDay), end = args.week === 'last' ? addLocalDays(current.weekEnd, -7) : current.weekEnd, start = addLocalDays(end, -6);
    try {
      const week = weekSummary({weekStart: start, weekEnd: end, habits: env.habits, health: env.health ?? createEmptyHealth(), platform: env.platform, localGoals: env.localGoals, metadata: env.metadata, quotes: env.quotes, now: env.now.getTime(), financial: false, review: env.weekly});
      return ok('weekly_review', label, where(env, null, {from: start, to: end, label: args.week === 'last' ? 'last review week' : 'this review week'}, env.habitZone), {
        review: reviewState(env.weekly, start), habitCheckIns: week.wentWell.habitCheckIns, ...(env.health ? {healthEntries: week.wentWell.healthEntries} : {}), goalContributions: week.wentWell.goalContributions, busiestDay: week.wentWell.bestDay ?? 'none',
        habits: week.habits.slice(0, env.limits.rows).map(h => ({habit: text(h.title), done: h.done, scheduled: h.scheduled, skipped: h.skipped, streak: `${h.streak} ${h.unit}`})),
        ...(env.health ? {health: week.health.slice(0, 12).map(line => text(line, 160))} : {}),
        lastIntention: week.lastIntention ? text(week.lastIntention, 300) : 'none written', writtenBy: 'The person writes the review themselves; ZIGi only reads these counts.',
        ...(env.health ? {} : {heldBack: 'Health lines are not included: Health isn\'t shared with ZIGi.'}),
      });
    } catch { return refuse('weekly_review', label, 'not-found', 'The weekly review could not be read; open it in Today.'); }
  },
};
export const GOAL_TOOLS = [listGoals, goalProgress, goalContributions, weeklyReviewTool] as const;
