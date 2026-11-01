import {addLocalDays} from '../../local-date';
import {latestHabitRule} from '../../habits';
import {dailyData} from '../../health-daily';
import {byCategory, fromCents} from '../../money-log/engine';
import {themesOf} from '../../journal/reflect';
import {inboxOf} from '../../notes/store';
import {ACTION_FENCE} from '../../ai/context/specialists';
import {ACTION_KINDS} from '../../ai/actions/schema';
import {goalsNeedingStep} from '../../ai/proactive/brief-sources';
import {shortName} from '../../ai/proactive/calm';
import {summaries} from '../../ai/tools/goals';
import {formatMinutes} from '../../zone-time';
import {habitWeek, lastWeek, latestEntry, nightsBetween, type WorkflowSources} from './readers';

/**
 * The cards a workflow proposes (Session AK, owner follow-up 2 N6), made on the device as ZIGi's own proposal blocks, so
 * they go through the one confirm engine (lib/ai/actions/parse.ts → plan → the person's Add, with Undo): nothing is
 * written until the person adds a card, every card is checked against the records when it shows, and money is never
 * accepted for them. Only kinds the engine knows are proposed; a kind it does not know yet is never sent as a card.
 */
export type ProposerId = 'review-intention' | 'journal-goal' | 'meals-plan' | 'money-review' | 'focus-tasks' | 'notes-file';
export type Proposal = {actions: Record<string, unknown>[]; note?: string};
const KNOWN: ReadonlySet<string> = new Set<string>(ACTION_KINDS);
export const knownKind = (kind: string) => KNOWN.has(kind);
/** The actions as the reply text the parser reads: one fenced block per card. */
export const asBlocks = (actions: readonly Record<string, unknown>[]) => actions.filter(a => knownKind(String(a.kind))).map(a => `\`\`\`${ACTION_FENCE}\n${JSON.stringify(a)}\n\`\`\``).join('\n\n');

/**
 * "Review my week": up to three adjustments from the week's own records, as plain observations to act on (never advice
 * about health or money): the habit done least often, the goal step coming up, the biggest spending category, the
 * sleep average. Kept as the weekly review's intention on the person's Add.
 */
export function weekAdjustments(sources: WorkflowSources): string[] {
  const env = sources.env, out: string[] = [];
  const weakest = habitWeek(env).find(r => r.scheduled >= 3 && r.done / r.scheduled < 0.7);
  if (weakest) out.push(`Make ${weakest.title} easier to start: a smaller step or a set time (done on ${weakest.done} of ${weakest.scheduled} days).`);
  if (env.areas.goals) { const step = goalsNeedingStep(env)[0]; if (step) out.push(`Plan the step for ${step}.`); }
  if (env.areas.wealth && env.moneyLog?.entries.length) {
    const {from, to} = lastWeek(env.habitDay), top = byCategory(env.moneyLog.entries, from, to)[0];
    if (top) out.push(`Look at ${top.category}, your biggest category this week (${fromCents(top.total)} ${top.currency}).`);
  }
  if (out.length < 3 && env.health) {
    const {from, to} = lastWeek(env.healthDay), nights = nightsBetween(env, from, to);
    if (nights.length >= 3) out.push(`Notice your evenings: nights averaged ${formatMinutes(Math.round(nights.reduce((n, x) => n + x.minutes, 0) / nights.length))} asleep this week.`);
  }
  return out.slice(0, 3);
}
/** A journal theme's habit, worded as a small daily step (the person edits or dismisses the card). */
const THEME_HABITS: Record<string, Record<string, unknown>> = {
  sleep: {title: 'Wind down before bed', timeOfDay: 'evening'},
  stress: {title: 'Breathe for five minutes', measurement: 'minutes', target: 5},
  work: {title: "Plan tomorrow's first task", timeOfDay: 'evening'},
  exercise: {title: 'Move for 20 minutes', measurement: 'minutes', target: 20},
  people: {title: 'Reach out to someone you care about', schedule: {timesPerWeek: 2}},
  gratitude: {title: 'Write one thing you are grateful for', timeOfDay: 'evening'},
  money: {title: 'Log what you spend', timeOfDay: 'evening'},
  goal: {title: 'Take one small step on your goal'},
};
/** The goal's name from the entry: its first sentence, cut at a word, at most 60 characters. */
export function goalNameFrom(text: string): string {
  const first = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s/)[0]!.replace(/[.!?]+$/, '');
  if (first.length <= 60) return first;
  const cut = first.slice(0, 60), space = cut.lastIndexOf(' ');
  return `${(space > 30 ? cut.slice(0, space) : cut).trim()}…`;
}
export function propose(id: ProposerId, sources: WorkflowSources, options: {intention?: string | null} = {}): Proposal {
  const env = sources.env;
  switch (id) {
    case 'review-intention': {
      const lines = options.intention ? [options.intention] : weekAdjustments(sources).map((a, i) => `${i + 1}. ${a}`);
      if (!lines.length) return {actions: [], note: 'Nothing to adjust from this week\'s records yet.'};
      return {actions: [{kind: 'review-intention', intention: lines.join('\n').slice(0, 2000)}]};
    }
    case 'journal-goal': {
      if (sources.scopes?.journal === false) return {actions: [], note: 'Your journal is not shared with NOVA (Permissions).'};
      const entry = latestEntry(env); if (!entry) return {actions: [], note: 'Write a journal entry first; this workflow starts from it.'};
      const name = goalNameFrom(entry.text);
      const habits = themesOf(entry.text).map(t => THEME_HABITS[t]).filter((h): h is Record<string, unknown> => !!h).slice(0, 2);
      if (!env.areas.goals && !env.areas.habits) return {actions: [], note: 'Goals and Habits are not shared with NOVA (Permissions).'};
      return {actions: [
        ...(env.areas.goals ? [{kind: 'create-goal', name, type: 'PROJECT', milestones: ['Decide the first step', 'Take the first step'], notes: `From your journal entry of ${entry.date}.`}] : []),
        ...(env.areas.habits ? habits.map(h => ({kind: 'create-habit', ...h})) : []),
      ]};
    }
    case 'meals-plan': {
      if (!env.health) return {actions: [], note: 'Meals and the grocery list need Health shared with NOVA.'};
      const recipes = env.health.recipes;
      if (!recipes.length) return {actions: [{kind: 'open-page', page: 'health', view: 'planner'}], note: 'Add a recipe in Health first; NOVA plans only from your own recipes.'};
      const daily = dailyData(env.health), planned = new Set(daily.plans.filter(p => p.meal === 'Dinner').map(p => p.date));
      const days = Array.from({length: 7}, (_, i) => addLocalDays(env.healthDay, i + 1)).filter(d => !planned.has(d));
      const meals = days.map((day, i) => ({kind: 'plan-meal', recipe_name: recipes[i % recipes.length]!.name, meal: 'Dinner', servings: 1, day}));
      const used = new Set(meals.map(m => m.recipe_name)), items = [...new Set(recipes.filter(r => used.has(r.name)).flatMap(r => r.ingredients.map(i => i.snapshot.name.trim())).filter(Boolean))].slice(0, 20);
      return {actions: [...meals.slice(0, 7), ...(items.length ? [{kind: 'grocery-list', items, week: 'next'}] : [])], ...(meals.length ? {} : {note: 'Every dinner of the next seven days is already planned.'})};
    }
    case 'money-review': return {actions: [{kind: 'open-review', period: 'month'}]};
    case 'focus-tasks': {
      if (!env.areas.goals) return {actions: [], note: 'Goals are not shared with NOVA (Permissions).'};
      const week = addLocalDays(env.habitDay, 7), goals = summaries(env).filter(g => g.status === 'active' && g.nextContributionDate && g.nextContributionDate <= week).slice(0, 2);
      if (!goals.length) return {actions: [], note: 'No goal has a step coming up, so there is no focus block to add.'};
      return {actions: goals.map(g => ({kind: 'add-task', title: `Focus block: next step for ${shortName(g.name, 80)}`, due: 'tomorrow', priority: 'high', goal: g.name.slice(0, 120)}))};
    }
    case 'notes-file': {
      if (sources.scopes?.notes === false) return {actions: [], note: 'Notes are not shared with NOVA (Permissions).'};
      const inbox = sources.notes ? inboxOf(sources.notes) : [];
      if (!inbox.length) return {actions: [], note: 'Your notes inbox is empty.'};
      return {actions: inbox.slice(0, 8).map(n => fileTarget(n, sources))};
    }
  }
}
/**
 * Where an inbox note could go, by rule on the device: beside the goal or habit it names (an active one, named in full as
 * whole words, six letters or more or several words), else the daily note of the day it was captured, else a topic note of its own. The person files
 * it with the card's "File it" (lane NE's `file-note`, lane B's `fileNote`), with Undo.
 */
export function fileTarget(note: {id: string; title: string; body: string; day?: string | undefined}, sources: WorkflowSources): Record<string, unknown> {
  const env = sources.env, text = ` ${`${note.title} ${note.body}`.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  // A name counts only in full, as whole words, and only when it is specific (six letters or more, or several words).
  const words = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const names = (list: string[]) => list.filter(n => { const w = words(n); return w.length >= 6 || w.includes(' '); }).sort((a, b) => b.length - a.length).find(n => text.includes(` ${words(n)} `));
  const goal = env.areas.goals ? names(summaries(env).filter(g => g.status === 'active').map(g => g.name)) : undefined;
  if (goal) return {kind: 'file-note', note: note.id, to: 'goal', name: goal.slice(0, 120)};
  const habit = env.areas.habits ? names(env.habits.habits.filter(h => latestHabitRule(h).state === 'active').map(h => h.title)) : undefined;
  if (habit) return {kind: 'file-note', note: note.id, to: 'habit', name: habit.slice(0, 120)};
  if (note.day) return {kind: 'file-note', note: note.id, to: 'daily', day: note.day};
  return {kind: 'file-note', note: note.id, to: 'topic', title: shortName((note.title || note.body).replace(/\s+/g, ' ').trim(), 60) || 'Inbox note'};
}
