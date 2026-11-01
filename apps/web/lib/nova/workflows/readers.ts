import {habitDay, latestHabitRule} from '../../habits';
import {dailyData} from '../../health-daily';
import {addLocalDays} from '../../local-date';
import {byCategory, fromCents, monthOf, roomToSpend, totals} from '../../money-log/engine';
import {asleep, nightDay} from '../../sleep/engine';
import {healthGroupIn} from '../../vault/w-homes';
import {formatMinutes} from '../../zone-time';
import {billOccurrences} from '../../bills/store';
import {compare, factorOptions, type CompareSources} from '../../compare/engine';
import {themesOf} from '../../journal/reflect';
import {focusMinutesBetween} from '../../focus-sessions/engine';
import type {FocusSessions} from '../../focus-sessions/schema';
import {inboxOf} from '../../notes/store';
import type {Notes} from '../../notes/schema';
import {openTasks, taskState} from '../../tasks/engine';
import type {Tasks} from '../../tasks/schema';
import {goalsNeedingStep} from '../../ai/proactive/brief-sources';
import {listNames, shortName} from '../../ai/proactive/calm';
import type {ToolEnv} from '../../ai/tools/env';
import type {NovaScopes} from '../../ai/context-pack/nova';
import {summaries} from '../../ai/tools/goals';

/**
 * The on-device steps of NOVA's workflows (Session AK, owner follow-up 2 N6): each reads the person's own records inside
 * the scopes the environment carries (a closed pillar reads as "not shared", Health only through its gate) and returns
 * plain facts — counts, names, dates and amounts in their own currency, never converted, nothing projected. An unknown is
 * said as unknown, never as zero. The same readers make the words a model may see, from the environment of that path.
 */
export type WorkflowSources = {
  env: ToolEnv;
  /** NOVA's permissions (lib/nova/scopes.ts); absent in a caller that narrowed `env` and the records itself. */
  scopes?: NovaScopes;
  focus?: FocusSessions | null;
  tasks?: Tasks | null;
  notes?: Notes | null;
  workouts?: CompareSources['workouts'];
};
/** What one reading found: facts to show (and, from the sending environment, to word), or why there was nothing. */
export type Reading = {facts: string[]; empty?: string};
export type ReaderId = 'week-habits' | 'week-goals' | 'week-money' | 'week-sleep' | 'journal-latest' | 'meals-next-week' | 'money-month' | 'money-checkin' | 'bills-next' | 'sleep-factors' | 'focus-tomorrow' | 'tasks-tomorrow' | 'notes-inbox';
const NOT_SHARED = (pillar: string) => `${pillar} is not shared with NOVA (Permissions).`;
const money = (c: number, currency: string) => `${fromCents(c)} ${currency}`;
/** The last seven days, today included. */
export const lastWeek = (today: string) => ({from: addLocalDays(today, -6), to: today});

export type HabitWeek = {id: string; title: string; done: number; scheduled: number};
export function habitWeek(env: ToolEnv): HabitWeek[] {
  if (!env.areas.habits) return [];
  const today = env.habitDay, days = Array.from({length: 7}, (_, i) => addLocalDays(today, i - 6));
  return env.habits.habits.filter(h => latestHabitRule(h).state === 'active').map(h => {
    let done = 0, scheduled = 0;
    for (const d of days) { const s = habitDay(h, d, today).status; if (['complete', 'partial', 'due', 'failed', 'skipped'].includes(s)) { scheduled++; if (s === 'complete') done++; } }
    return {id: h.id, title: shortName(h.title), done, scheduled};
  }).filter(r => r.scheduled > 0).sort((a, b) => a.done / a.scheduled - b.done / b.scheduled || a.title.localeCompare(b.title));
}
function weekHabits(env: ToolEnv): Reading {
  if (!env.areas.habits) return {facts: [], empty: NOT_SHARED('Habits')};
  const rows = habitWeek(env);
  if (!rows.length) return {facts: [], empty: 'No habit was scheduled in the last seven days.'};
  return {facts: rows.slice(0, 6).map(r => `${r.title}: done on ${r.done} of ${r.scheduled} scheduled days.`)};
}
function weekGoals(env: ToolEnv): Reading {
  if (!env.areas.goals) return {facts: [], empty: NOT_SHARED('Goals')};
  const steps = goalsNeedingStep(env);
  return steps.length ? {facts: steps.map(s => `Goal with a step this week: ${s}.`)} : {facts: [], empty: 'No goal has a planned step this week.'};
}
function spendBetween(env: ToolEnv, from: string, to: string, label: string): Reading {
  if (!env.areas.wealth) return {facts: [], empty: NOT_SHARED('Wealth')};
  const log = env.moneyLog; if (!log?.entries.length) return {facts: [], empty: 'Nothing is in your money log yet.'};
  const sums = totals(log.entries, from, to).filter(t => t.expenses > 0 || t.income > 0);
  if (!sums.length) return {facts: [], empty: `Nothing was logged ${label}.`};
  const facts = sums.map(t => `${label[0]!.toUpperCase()}${label.slice(1)} in ${t.currency}: spent ${money(t.expenses, t.currency)}${t.income ? `, income ${money(t.income, t.currency)}` : ''}.`);
  for (const row of byCategory(log.entries, from, to).slice(0, 5)) facts.push(`${row.category}: ${money(row.total, row.currency)} over ${row.count} ${row.count === 1 ? 'entry' : 'entries'}.`);
  return {facts};
}
type Night = {minutes: number; estimated: boolean};
export function nightsBetween(env: ToolEnv, from: string, to: string): Night[] {
  if (!env.health) return [];
  return (healthGroupIn(env.health, 'sleep')?.nights ?? []).filter(n => { if (n.kind !== 'night' || n.end === null) return false; const d = nightDay(n); return d !== null && d >= from && d <= to; })
    .map(n => asleep(n)).filter((a): a is NonNullable<typeof a> => !!a).map(a => ({minutes: a.minutes, estimated: a.estimated}));
}
function weekSleep(env: ToolEnv): Reading {
  if (!env.health) return {facts: [], empty: NOT_SHARED('Health')};
  const {from, to} = lastWeek(env.healthDay), nights = nightsBetween(env, from, to);
  if (!nights.length) return {facts: [], empty: 'No night was logged in the last seven days.'};
  const avg = Math.round(nights.reduce((n, x) => n + x.minutes, 0) / nights.length);
  return {facts: [`Sleep: ${nights.length} ${nights.length === 1 ? 'night' : 'nights'} logged, ${formatMinutes(avg)} asleep on average${nights.some(n => n.estimated) ? ' (some estimated)' : ''}.`]};
}
export const latestEntry = (env: ToolEnv) => [...(env.journal?.entries ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0] ?? null;
function journalLatest(env: ToolEnv, sending: boolean, scopes?: NovaScopes): Reading {
  if (scopes?.journal === false) return {facts: [], empty: NOT_SHARED('Your journal')};
  const entry = latestEntry(env);
  if (!entry) return {facts: [], empty: 'Your journal has no entry yet.'};
  // A journal entry reaches a model only when the person turned journal sharing on (Journal's own switch).
  if (sending && env.journal?.shareWithAi !== true) return {facts: [`Latest journal entry: ${entry.date} (its words stay on this device: journal sharing is off).`]};
  const themes = themesOf(entry.text);
  return {facts: [`Latest journal entry (${entry.date}): "${entry.text.slice(0, 400)}${entry.text.length > 400 ? '…' : ''}"`, ...(themes.length ? [`It touches on: ${themes.join(', ')}.`] : [])]};
}
function mealsNextWeek(env: ToolEnv): Reading {
  if (!env.health) return {facts: [], empty: NOT_SHARED('Health')};
  const from = addLocalDays(env.healthDay, 1), to = addLocalDays(env.healthDay, 7), daily = dailyData(env.health);
  const planned = daily.plans.filter(p => p.date >= from && p.date <= to), recipes = env.health.recipes;
  const facts = [`Meals already planned for the next seven days: ${planned.length}.`, `Recipes in Health: ${recipes.length}${recipes.length ? ` (${listNames(recipes.map(r => shortName(r.name)), 5)})` : ''}.`];
  const dinners = new Set(planned.filter(p => p.meal === 'Dinner').map(p => p.date));
  facts.push(`Days without a dinner planned: ${7 - dinners.size}.`);
  return {facts};
}
function moneyMonth(env: ToolEnv): Reading {
  const month = monthOf(env.habitDay);
  return spendBetween(env, month.start, env.habitDay, 'this month so far');
}
function moneyCheckin(env: ToolEnv): Reading {
  if (!env.areas.wealth) return {facts: [], empty: NOT_SHARED('Wealth')};
  const month = monthOf(env.habitDay), lastEnd = addLocalDays(month.start, -1), last = monthOf(lastEnd), facts: string[] = [];
  const log = env.moneyLog;
  if (log?.entries.length) {
    const now = totals(log.entries, month.start, env.habitDay), before = totals(log.entries, last.start, last.end);
    for (const t of now) facts.push(`This month so far in ${t.currency}: spent ${money(t.expenses, t.currency)}, income ${money(t.income, t.currency)}.`);
    for (const t of before) facts.push(`Last month in ${t.currency}: spent ${money(t.expenses, t.currency)}, income ${money(t.income, t.currency)}.`);
    const room = roomToSpend(log, env.habitDay);
    if (room) facts.push(`Room to spend this week: ${money(room.left, room.currency)} of ${money(room.budget, room.currency)} (${room.daysLeft} ${room.daysLeft === 1 ? 'day' : 'days'} left).`);
  }
  const accounts = env.accounts?.items ?? [];
  if (accounts.length) {
    const latest = accounts.flatMap(a => a.snapshots.map(s => s.date)).sort().at(-1);
    facts.push(`Accounts you track: ${accounts.length}; last balance entered ${latest ?? 'never (unknown)'}.`);
  }
  return facts.length ? {facts} : {facts: [], empty: 'Nothing is in your money log or accounts yet.'};
}
function billsNext(env: ToolEnv): Reading {
  if (!env.areas.wealth) return {facts: [], empty: NOT_SHARED('Wealth')};
  const bills = env.ak?.bills; if (!bills?.bills.length) return {facts: [], empty: 'No bills or subscriptions are tracked.'};
  const due = billOccurrences(bills, env.habitDay, 30);
  if (!due.length) return {facts: ['No bill is due in the next 30 days.']};
  const by = new Map<string, number>(); for (const d of due) by.set(d.currency, (by.get(d.currency) ?? 0) + d.amountCents);
  return {facts: [`Bills due in the next 30 days: ${due.length} (${[...by].map(([c, n]) => money(n, c)).join('; ')}).`, ...due.slice(0, 3).map(d => `${shortName(d.title)}: ${money(d.amountCents, d.currency)} on ${d.due}.`)]};
}
/** The Compare explorer's sources from the environment (Health only through its gate; the money log only with Wealth). */
export function compareSources(env: ToolEnv, workouts: CompareSources['workouts'] = null): CompareSources {
  return {
    habits: env.areas.habits ? env.habits : null, health: env.health,
    energy: env.energy ? {days: env.energy.days} : null,
    journal: env.journal ? {entries: env.journal.entries} : null,
    workouts: env.health ? workouts ?? null : null,
    fasting: env.fasting ? {sessions: env.fasting.sessions} : null,
    money: env.areas.wealth && env.moneyLog ? {entries: env.moneyLog.entries} : null,
  };
}
function sleepFactors(env: ToolEnv, workouts: CompareSources['workouts']): Reading {
  if (!env.health) return {facts: [], empty: NOT_SHARED('Health')};
  const src = compareSources(env, workouts), today = env.healthDay, options = factorOptions(src, today).slice(0, 24);
  if (!options.length) return {facts: [], empty: 'Nothing to compare sleep with yet: habits, tags, workouts or spending.'};
  const ready = options.flatMap(f => (['same', 'next'] as const).map(lag => compare(src, f.id, 'sleep', lag, today))).filter((r): r is NonNullable<typeof r> => !!r && r.state === 'ready' && !!r.sentence);
  const pending = options.length - new Set(ready.map(r => r.factor.id)).size;
  const facts = ready.sort((a, b) => Math.abs((b.withValue ?? 0) - (b.withoutValue ?? 0)) - Math.abs((a.withValue ?? 0) - (a.withoutValue ?? 0))).slice(0, 3).map(r => `${r.sentence} (${r.counts}; ${r.confounder}.)`);
  if (!facts.length) return {facts: [`None of ${options.length} things compared with your sleep shows a clear difference yet: each side needs 14 days, and close results are not findings.`]};
  return {facts: [...facts, ...(pending > 0 ? [`${pending} other ${pending === 1 ? 'comparison is' : 'comparisons are'} still collecting days or close.`] : []), 'Days that happened together are not proof that one brings the other.']};
}
function focusTomorrow(env: ToolEnv, focus: FocusSessions | null | undefined): Reading {
  const tomorrow = addLocalDays(env.habitDay, 1), facts: string[] = [];
  if (env.areas.habits) {
    const due = env.habits.habits.filter(h => latestHabitRule(h).state === 'active' && habitDay(h, tomorrow, tomorrow).status === 'due');
    facts.push(due.length ? `Habits scheduled tomorrow: ${listNames(due.map(h => shortName(h.title)), 5)}.` : 'No habit is scheduled tomorrow.');
  }
  if (env.areas.goals) {
    const week = addLocalDays(env.habitDay, 7), goals = summaries(env).filter(g => g.status === 'active' && g.nextContributionDate && g.nextContributionDate <= week);
    if (goals.length) facts.push(`Goals with a step soon: ${listNames(goals.map(g => `${shortName(g.name)} (${g.nextContributionDate})`), 3)}.`);
  }
  if (focus?.sessions.length) { const {minutes, sessions} = focusMinutesBetween(focus, addLocalDays(env.habitDay, -6), env.habitDay); facts.push(`Focus in the last seven days: ${sessions} ${sessions === 1 ? 'session' : 'sessions'}, ${minutes} minutes.`); }
  return facts.length ? {facts} : {facts: [], empty: NOT_SHARED('Habits and Goals')};
}
function tasksTomorrow(env: ToolEnv, tasks: Tasks | null | undefined): Reading {
  if (!env.areas.today) return {facts: [], empty: NOT_SHARED('Today')};
  if (!tasks?.tasks.length) return {facts: [], empty: 'Your task list is empty.'};
  const tomorrow = addLocalDays(env.habitDay, 1), open = openTasks(tasks, env.habitDay);
  const due = open.filter(t => t.due === tomorrow || taskState(t, env.habitDay) === 'overdue');
  return {facts: [`Open tasks: ${open.length}; due tomorrow or overdue: ${due.length}${due.length ? ` (${listNames(due.map(t => shortName(t.title)), 3)})` : ''}.`]};
}
function notesInbox(env: ToolEnv, notes: Notes | null | undefined, scopes?: NovaScopes): Reading {
  if (scopes?.notes === false) return {facts: [], empty: NOT_SHARED('Notes')};
  if (!env.areas.today) return {facts: [], empty: NOT_SHARED('Today')};
  const inbox = notes ? inboxOf(notes) : [];
  if (!inbox.length) return {facts: [], empty: 'Your notes inbox is empty.'};
  return {facts: [`Notes in your inbox: ${inbox.length}.`, ...inbox.slice(0, 8).map(n => `"${shortName((n.title || n.body).replace(/\s+/g, ' '), 80)}" (${n.createdAt.slice(0, 10)}).`)]};
}
/** Runs one reader. `sending`: the words are for a model (the journal then follows its own sharing switch). */
export function readStep(id: ReaderId, sources: WorkflowSources, sending = false): Reading {
  const env = sources.env, week = lastWeek(env.habitDay);
  switch (id) {
    case 'week-habits': return weekHabits(env);
    case 'week-goals': return weekGoals(env);
    case 'week-money': return spendBetween(env, week.from, week.to, 'the last seven days');
    case 'week-sleep': return weekSleep(env);
    case 'journal-latest': return journalLatest(env, sending, sources.scopes);
    case 'meals-next-week': return mealsNextWeek(env);
    case 'money-month': return moneyMonth(env);
    case 'money-checkin': return moneyCheckin(env);
    case 'bills-next': return billsNext(env);
    case 'sleep-factors': return sleepFactors(env, sources.workouts ?? null);
    case 'focus-tomorrow': return focusTomorrow(env, sources.focus);
    case 'tasks-tomorrow': return tasksTomorrow(env, sources.tasks);
    case 'notes-inbox': return notesInbox(env, sources.notes, sources.scopes);
  }
}
