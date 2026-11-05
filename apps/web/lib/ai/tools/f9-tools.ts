import * as z from 'zod';
import type {DebtPlannerRecord} from '../../debt-planner/store';
import type {Supplements} from '../../supplements/schema';
import {dayDoses, supplementSummary} from '../../supplements/log';
import type {SavingsChallenges} from '../../savings-challenges/challenges';
import {challengeWeek} from '../../savings-challenges/challenges';
import type {Workouts} from '../../workouts/schema';
import type {RemindersPlan} from '../../reminders-plan/schema';
import {buildAgenda, type AgendaInput} from '../../agenda/build';
import {showcaseAgendaExtras} from '../../agenda/showcase';
import {taskAgendaItems, withExtras, type DayWithExtras} from '../../agenda/time-items';
import {unbondingEvents} from '../../zigchain-eco/staking-clarity';
import {STATUS_WORDS, TOP_N, nakamotoCount, powerRanks, spreadLine, statusOf, type ChooserValidator} from '../../zigchain-eco/validators';
import type {EarnSnapshot} from '../../earn/snapshot';
import {addLocalDays} from '../../local-date';
import type {ToolEnv} from './env';
import {capRows, goalQty, ok, provenance, text} from './format';
import {DEBT_MODEL, DEBT_PLANNER_WHERE, debtFreeMonth, debtMoney, debtView} from './f9-debt';
import {NO_ARGS, type ToolDefinition} from './types';

/**
 * Owner follow-up 1 (F9): ZIGi's read-only tools for the F4–F5 features, over the person's own device records (each
 * behind its area's switch like every tool; the supplements log behind the Health gate) and, for validators, the public
 * figures the Earn or Staking page read in this visit (ZIGi never fetches one):
 * - `debt_plan`: the debt payoff planner's plans per currency (a model, not advice), or the figure it still needs;
 * - `supplements`: the day's doses and a 14-day count (taken, skipped, not logged; unknown is never "missed");
 * - `agenda`: the calendar of the person's plans for some days (titles, times and states; no amounts, as the agenda);
 * - `validators`: ZIGChain's validators in plain words (status, the 10 largest, the spread of stake);
 * - `savings_challenges`: the challenges beside the person's goals and their week.
 * Nothing here writes, fetches or advises. Names are the person's own words, escaped as data (text()).
 */
export type F9ToolSources = {debtPlanner?: DebtPlannerRecord | null; supplements?: Supplements | null; savingsChallenges?: SavingsChallenges | null; workouts?: Workouts | null; remindersPlan?: RemindersPlan | null; habitTimes?: Readonly<Record<string, string>> | null};
const where = (env: ToolEnv, journal: string, subject: string | null = null) => provenance(env, journal, subject, null, null);

export const debtPlanTool: ToolDefinition<Record<string, never>> = {
  name: 'debt_plan', title: 'Debt payoff plan', area: 'wealth',
  description: 'The debt payoff planner from the person\'s own debts and the figures they kept: per currency, the month they are debt-free with avalanche, snowball and minimums only, the interest each costs, or the figure still missing. A model, not advice.',
  parameters: {type: 'object', properties: {}}, args: NO_ARGS,
  label: () => 'Debt payoff plan',
  run(_args, env, label) {
    const views = debtView(env.accounts, env.ak?.debtPlanner, env.habitDay);
    if (!views.length) return ok('debt_plan', label, where(env, 'accounts and debts'), {plans: [], note: 'No debt with a balance is recorded on this device (Wealth → Accounts, debts & net worth), so there is nothing to plan.'});
    const plans = views.map(v => ({currency: v.currency, debts: v.debts.map(d => ({debt: text(d.name, 60), owes: debtMoney(d.owed, v.currency), yearlyRate: d.ratePercent ? `${d.ratePercent} %` : 'not known', minimumPayment: d.minimum !== null ? debtMoney(d.minimum, v.currency) : 'not kept'})),
      extraPerMonth: debtMoney(v.extra, v.currency),
      ...(v.comparison ? Object.fromEntries((['avalanche', 'snowball', 'minimums'] as const).map(k => { const r = v.comparison![k]; return [k === 'minimums' ? 'minimumsOnly' : k, {debtFreeIn: debtFreeMonth(env.habitDay, r.months) ?? 'not within 100 years', months: r.months ?? 'more than 1,200', interest: debtMoney(r.totalInterest, v.currency)}]; })) : {missing: v.issue}),
    }));
    return ok('debt_plan', label, where(env, 'accounts and the debt planner'), {plans, where: DEBT_PLANNER_WHERE, rule: `${DEBT_MODEL} Per currency, never converted; nothing is paid or moved.`});
  },
};

export const supplementsTool: ToolDefinition<{days?: number}> = {
  name: 'supplements', title: 'Supplements and medication', area: 'health',
  description: 'The person\'s own supplements and medication log (Health → Diary): today\'s doses with taken, skipped or not logged, and per item the last days\' counts. Their own words; no advice, no dose checks, no interaction claims.',
  parameters: {type: 'object', properties: {days: {type: 'integer', description: 'How many days to count back, 1 to 60 (default 14).'}}},
  args: z.object({days: z.number().int().min(1).max(60).optional()}),
  label: args => `Supplements · last ${args.days ?? 14} days`,
  run(args, env, label) {
    const record = env.ak?.supplements;
    if (!record || !(record.items ?? []).length) return ok('supplements', label, where(env, 'supplements log'), {today: [], note: 'Nothing is kept in the supplements and medication log yet (Health → Diary → Supplements and medication).'});
    const names = new Map((record.items ?? []).map(i => [i.id, i.name]));
    const today = dayDoses(record, env.healthDay).map(d => ({item: text(d.name, 60), ...(d.dose ? {dose: text(d.dose, 60)} : {}), time: d.slot === 'any' ? 'as needed' : d.slot, status: d.status ?? 'not logged'}));
    const summary = supplementSummary(record, env.healthDay, args.days ?? 14).map(s => ({item: text(names.get(s.itemId) ?? '', 60), planned: s.planned, taken: s.taken, skipped: s.skipped, notLogged: s.notLogged}));
    return ok('supplements', label, where(env, 'supplements log'), {day: env.healthDay, today, summary, rule: 'the person\'s own log; not logged is unknown, never missed; no advice'});
  },
};

/** The agenda's input from ZIGi's records, each source only where its area is open (meals and workouts behind the Health gate). */
export function agendaInputOf(env: ToolEnv): AgendaInput {
  const now = env.now.getTime(), extras = env.showcase ? showcaseAgendaExtras(env.habitDay) : {plannedWorkouts: [], unbonding: env.areas.wealth ? unbondingEvents(env.platform.positions, {now}).map(e => ({id: e.id, date: e.date, title: e.title, href: e.href})) : []};
  return {today: env.habitDay, now, habits: env.areas.habits ? env.habits : null, habitTimes: env.ak?.habitTimes ?? {}, platform: env.areas.goals ? env.platform : null, bills: env.areas.wealth ? env.ak?.bills ?? null : null,
    workouts: env.health ? env.ak?.workouts ?? null : null, plannedWorkouts: env.health ? extras.plannedWorkouts : [], health: env.health, unbonding: env.areas.wealth ? extras.unbonding : [],
    plan: env.ak?.remindersPlan ?? null, weeklyReview: env.weekly};
}
/** The local day a task was finished on, in the person's zone (the habits' zone; UTC when it cannot be read). */
const doneDayIn = (zone: string) => (iso: string) => { try { return new Date(iso).toLocaleDateString('en-CA', {timeZone: zone}); } catch { return iso.slice(0, 10); } };
/**
 * The agenda's days for ZIGi and NOVA. Session AL second pass (Lisbon LA-022, P-LA-14; L5 LS:st2-h): the person's tasks are
 * on the Agenda page, so they are in every agenda answer too (lib/agenda/time-items.ts, the page's own reading), in the
 * page's order; a task list that was not read stays out (unknown, never "no tasks").
 */
export function agendaDays(env: ToolEnv, from: string, days: number): DayWithExtras[] {
  const to = addLocalDays(from, Math.max(1, Math.min(31, days)) - 1);
  return withExtras(buildAgenda(agendaInputOf(env), from, to), env.nova?.tasks ? taskAgendaItems(env.nova.tasks, from, to, env.habitDay, doneDayIn(env.habitZone)) : []);
}
const SOURCE: Record<DayWithExtras['items'][number]['source'], string> = {habit: 'habit', contribution: 'goal contribution', bill: 'bill', workout: 'workout', meal: 'meal', unbonding: 'unbonding', review: 'review', task: 'task', event: 'calendar event'};
export const agendaTool: ToolDefinition<{from?: string; days?: number}> = {
  name: 'agenda', title: 'Agenda', area: 'today',
  description: 'The agenda: the person\'s plans from every page in one calendar for some days (habits on their days, tasks with their time and priority, planned contributions, bills, meals, workouts, unbonding dates, reviews), with titles, times and whether each is done. No amounts.',
  parameters: {type: 'object', properties: {from: {type: 'string', description: 'The first day, YYYY-MM-DD (default today).'}, days: {type: 'integer', description: 'How many days, 1 to 31 (default 7).'}}},
  args: z.object({from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), days: z.number().int().min(1).max(31).optional()}),
  label: args => `Agenda · ${args.days ?? 7} days`,
  run(args, env, label) {
    // Tasks come with their time and priority (agendaDays adds them, in the Agenda page's order).
    const days = agendaDays(env, args.from ?? env.habitDay, args.days ?? 7);
    const rows = days.flatMap(d => d.items.map(i => ({day: d.date, ...(i.time ? {time: i.time} : {}), what: text(i.title, 80), kind: i.source === 'task' && i.priority !== 'normal' ? `task, ${i.priority} priority` : SOURCE[i.source], state: i.state})));
    const capped = capRows(rows, env, false);
    return ok('agenda', label, where(env, 'agenda (read from each page\'s records)'), {from: days[0]?.date, to: days.at(-1)?.date, items: capped.rows, ...(rows.length ? {} : {note: 'Nothing planned on these days.'}), rule: 'titles and days only, no amounts; each item lives on its own page'}, capped.truncated);
  },
};

/** The validators the Earn or Staking page read in this visit, as the chooser reads them; empty when none was read. */
export function chooserValidators(snapshot: EarnSnapshot | null | undefined): ChooserValidator[] {
  return (snapshot?.validators ?? []).map(v => ({operator: v.operator, moniker: v.moniker, status: v.status === 'bonded' || v.status === 'unbonding' ? v.status : 'unbonded', jailed: v.jailed, tombstoned: v.tombstoned ?? null, tokens: v.tokens ?? '0'}));
}
export const VALIDATORS_NOT_READ = 'ZIGi has not read the validators in this visit: open Earn → Validators (or the validator picker on Staking) first, then ask again.';
export const validatorsTool: ToolDefinition<Record<string, never>> = {
  name: 'validators', title: 'ZIGChain validators', area: 'wealth',
  description: 'ZIGChain\'s validators in plain words, as the Earn or Staking page read them in this visit: each one\'s status and what it means, the 10 largest by stake, those outside them, and how spread the stake is. Public figures; never ranked by return, never advice.',
  parameters: {type: 'object', properties: {}}, args: NO_ARGS,
  label: () => 'ZIGChain validators',
  run(_args, env, label) {
    const list = chooserValidators(env.earn), source = where(env, 'Earn page reads in this visit (public figures, as read)');
    if (!list.length) return ok('validators', label, source, {validators: [], note: VALIDATORS_NOT_READ});
    const ranks = powerRanks(list), staked = list.some(v => v.tokens !== '0');
    const rows = list.map(v => ({name: text(v.moniker || v.operator, 60), status: STATUS_WORDS[statusOf(v)].label, ...(staked && ranks.has(v.operator) ? {rankByStake: ranks.get(v.operator)} : {})}));
    const capped = capRows(rows, env, false);
    return ok('validators', label, source, {validators: capped.rows, active: ranks.size, ...(staked ? {spread: spreadLine(list), smallestGroupThatCouldHalt: nakamotoCount(list), largest: TOP_N} : {stake: 'unknown in this read'}),
      statusWords: Object.fromEntries(Object.values(STATUS_WORDS).map(s => [s.label, s.means])), rule: 'never ranked by return; spreading stake keeps the network in many hands; not advice'}, capped.truncated);
  },
};

export const savingsChallengesTool: ToolDefinition<Record<string, never>> = {
  name: 'savings_challenges', title: 'Savings challenges', area: 'goals',
  description: 'The savings challenges beside the person\'s goals (52-week, no-spend days, round-ups by hand): which goal, since when, the week it is in and its own figures. Progress comes only from what the person records; nothing moves money.',
  parameters: {type: 'object', properties: {}}, args: NO_ARGS,
  label: () => 'Savings challenges',
  run(_args, env, label) {
    const record = env.ak?.savingsChallenges, goals = new Map(env.platform.goals.map(g => [g.id, g]));
    const rows = Object.entries(record?.goals ?? {}).flatMap(([id, c]) => { const g = goals.get(id); if (!g) return [];
      return [{goal: env.handles.add('goal', `private:${g.id}`, g.name), name: text(g.name, 60), challenge: c.kind, since: c.startedOn, week: challengeWeek(c.startedOn, env.habitDay),
        ...(c.kind === '52-week' ? {step: c.step == null ? 'not set' : goalQty(String(c.step), g.asset), order: c.order ?? 'up'} : c.kind === 'no-spend' ? {aimDays: c.targetDays ?? 'not set', markedDays: (c.noSpendDays ?? []).length} : {roundTo: c.roundTo ?? 1})}]; });
    if (!rows.length) return ok('savings_challenges', label, where(env, 'Goals'), {challenges: [], note: 'No savings challenge is set up. One starts from a challenge template in Goals, or ZIGi proposes one as a card.'});
    return ok('savings_challenges', label, where(env, 'Goals'), {challenges: rows, rule: 'progress only from the person\'s own records; the goal page shows it; nothing moves money'});
  },
};
export const F9_TOOLS = [debtPlanTool, supplementsTool, agendaTool, validatorsTool, savingsChallengesTool] as const;
