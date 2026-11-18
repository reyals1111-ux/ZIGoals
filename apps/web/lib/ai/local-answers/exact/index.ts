import {latestHabitRule} from '../../../habits';
import type {ToolEnv} from '../../tools/env';
import {HEALTH_CLOSED} from '../../tools/format';
import {habitsAnswer} from './habits';
import {agendaAnswer, checklistAnswer, focusAnswer, goalsAnswer, journalAnswer, lifeAnswer, notesAnswer, novaAnswer, tasksAnswer} from './day';
import {healthAnswer} from './health';
import {billsAnswer, budgetsAnswer, netWorthAnswer, spendingAnswer} from './money';
import {resolvePeriod, periodWords} from './period';
import {fold, t} from './text';
import {DOMAIN_GATE, type Exact, type ExactWidget, type Query} from './types';
import {topicOf, understand, type Records} from './understand';

/**
 * Session AS (ADR-042, Part 1): the exact layer. `exactQuery` reads a question, `answerQuery` answers it from the records
 * of one reply's environment (the same `ToolEnv` every tool reads, so a closed switch is closed here too and Health is
 * not there at all with its gate closed), and `exactReplyParts` gives the engine what it needs for its own reply.
 *
 * - Strict claims (before the layers that were there): a Dutch question, or one that asks what was missed, skipped, not
 *   done or late, which days, or on a weekday. Those are the questions the older layers answered with something else.
 * - Everything else it understands is offered after those layers had nothing (`strict: false`).
 */
export function recordsOf(env: ToolEnv): Records {
  const open = (area: 'habits' | 'goals' | 'wealth') => env.areas[area] !== false;
  return {
    today: env.habitDay,
    habits: open('habits') ? env.habits.habits.map(h => ({id: h.id, title: h.title, archived: latestHabitRule(h).state === 'archived'})) : [],
    goals: open('goals') ? [...env.platform.goals.filter(g => g.status !== 'closed').map(g => ({id: g.id, name: g.name})), ...(env.averageGoals ?? []).filter(g => g.status !== 'closed').map(g => ({id: g.id, name: g.name}))] : [],
    categories: open('wealth') ? [...new Set([...(env.nova?.budgets?.budgets ?? []).map(b => b.category), ...(env.moneyLog?.entries ?? []).map(e => e.category).filter((c): c is string => !!c)])] : [],
    bills: open('wealth') ? (env.ak?.bills?.bills ?? []).map(b => ({id: b.id, title: b.title})) : [],
  };
}
/**
 * The question with its slips of the hand set right ("how much did i sleep last nite"), when the exact layer reads the
 * fixed words and they differ from what was typed: the older layers are asked those words, so a typo costs no answer.
 */
export function fixedWords(question: string, env: ToolEnv): string | null {
  try {
    const q = understand(question, recordsOf(env));
    if (!q) return null;
    const fixed = q.read.replace(/\blast nite\b/g, 'last night');
    return fixed !== fold(question) ? fixed : null;
  } catch { return null; }
}
export function exactQuery(question: string, env: ToolEnv): Query | null {
  try { return understand(question, recordsOf(env)); } catch { return null; }
}
/** The part of life a question names when nothing more is understood (for the honest fallback): its plain overview. */
export function exactTopic(question: string, env: ToolEnv): Query | null {
  try { return topicOf(question, recordsOf(env)); } catch { return null; }
}
const TRACKS: ReadonlySet<string> = new Set(['water', 'steps', 'sleep', 'weight', 'calories', 'protein', 'workouts', 'meditation', 'vitals', 'journal', 'focus']);
/**
 * Whether the exact layer answers before the older layers: the classes of question those layers answered with something
 * else (ADR-042, "Why this session exists" and the corpus). Everything else stays theirs, word for word.
 */
export function strictClaim(q: Query): boolean {
  // A Dutch request to show something ("Toon mijn vermogen dit jaar") is the stage's own: it makes the widget with its range.
  if (/^(?:toon|laat|zet) /.test(q.read)) return false;
  if (q.ask === 'why') return false;
  if (q.domain === 'nova') return false;
  // "How is my day going" (the older layers read "day" as a goal's name); "my day" and the week keep their own briefs.
  if (q.domain === 'life') return /\b(?:day going|gaat mijn dag|mijn dag gaat)\b/.test(q.read);
  // "Which habits am I behind on" has its own answer (behind on schedule over seven days); a goal behind plan is ours.
  if (q.domain === 'habits' && q.ask === 'late') return false;
  // What was missed, skipped, not done or late; which days; on a weekday.
  if (q.ask === 'missed' || q.ask === 'not-done' || q.ask === 'skipped' || q.ask === 'late' || q.weekday !== null) return true;
  // "Which days …": the days of a habit or a log ("when did I last …" and a goal's date keep the older layers' answers).
  if (q.shape === 'dates' && q.ask !== 'last' && q.ask !== 'next' && (q.domain === 'habits' || TRACKS.has(q.domain) || q.domain === 'spending' || q.domain === 'income' || q.domain === 'tasks')) return true;
  // "Did I work out yesterday", "did I journal today": one day's own state for a log (a habit by its name keeps its
  // answer, and "did I sleep enough" keeps the older layers' answer over the week).
  const oneDay = !q.period || q.period === 'today' || q.period === 'yesterday' || q.period.startsWith('on:');
  if (q.shape === 'yes-no' && TRACKS.has(q.domain) && (q.ask === 'done' || q.ask === 'open') && oneDay && !/\b(?:enough|genoeg)\b/.test(q.read)) return true;
  // A period the older layers did not keep to: workouts, focus, the journal and finished tasks over a named period.
  // (Their own fixed period keeps their answer: workouts "this week", focus "the last 7 days".)
  if (q.period && q.period !== 'today' && ((q.domain === 'workouts' && q.period !== 'this-week') || (q.domain === 'focus' && q.period !== 'last-7-days') || q.domain === 'journal' || (q.domain === 'tasks' && q.ask === 'done'))) return true;
  // Sleep's average, best and shortest night (the older answer lists the nights); "how is my health".
  if (q.domain === 'sleep' && (q.ask === 'average' || q.ask === 'best' || q.ask === 'worst')) return true;
  if (q.domain === 'health') return true;
  // One period beside another, for every habit together, a log, or the money log.
  // (Water keeps the older answer where it has one; what that leaves comes back with no model, `noModelFirst`.)
  if (q.ask === 'compare' && ((q.domain === 'habits' && !q.subject) || (TRACKS.has(q.domain) && q.domain !== 'water') || q.domain === 'spending' || q.domain === 'income')) return true;
  // Where the money went, and the largest entry; and a period the older answer did not keep to ("yesterday" gave the month).
  if (q.domain === 'spending' && (q.ask === 'best' || q.ask === 'worst')) return true;
  if ((q.domain === 'spending' || q.domain === 'income') && q.period && q.period !== 'this-month' && q.period !== 'last-month' && q.period !== 'this-week') return true;
  // Bills due this week, and what the bills come to (the older answer lists every bill); the next thing on the agenda.
  if (q.domain === 'bills' && (/\bweek\b/.test(q.read) || q.period === 'this-week' || q.ask === 'total' || q.shape === 'amount')) return true;
  if (q.domain === 'agenda' && q.ask === 'next') return true;
  // Goals as a whole: the closest and the furthest, those behind, the next date, those reached (a goal by its name keeps its answer).
  if (q.domain === 'goals' && !q.subject && /\b(?:goals|goal|doelen|doel)\b/.test(q.read) && (((q.ask === 'next' || q.ask === 'done') && (q.shape === 'list' || q.shape === 'count') && /\b(?:goals|doelen|which goal|welk doel)\b/.test(q.read)) || /\b(?:closest|nearest|furthest|farthest|least progress|dichtst|verst|minste voortgang)\b/.test(q.read) || (q.ask === 'next' && /\b(?:deadline|deadlines|target date|streefdatum)\b/.test(q.read)))) return true;
  // The journal: its days, its run and its last entry (the older layers answer with patterns of its words).
  if (q.domain === 'journal' && !/\b(?:pattern|patterns|about|theme|themes|patroon|patronen|over|thema)\b/.test(q.read)) return true;
  // Session AS (held-out questions): calories or protein over a named period (the stage put the Health HUD's today figures
  // beside "how many calories did I eat this week"); one spending category asked in Dutch ("boodschappen" was answered as nothing);
  // net worth over a period or as a trend (read as a goal's name).
  if ((q.domain === 'calories' || q.domain === 'protein') && q.period && q.period !== 'today' && q.period !== 'yesterday' && !q.period.startsWith('on:') && q.ask !== 'average' && (q.shape === 'amount' || q.ask === 'total')) return true;
  // "On how many days did I walk last week": one habit's days (the older answer gave its steps).
  if (q.domain === 'habits' && q.subject && q.shape === 'count' && /\b(?:days|dagen)\b/.test(q.read)) return true;
  if ((q.domain === 'spending' || q.domain === 'income') && q.subject?.kind === 'category' && q.lang === 'nl') return true;
  if (q.domain === 'networth' && (!!q.period || q.ask === 'trend' || q.ask === 'compare')) return true;
  // Tasks due tomorrow or this week (the older answer lists every open task).
  if (q.domain === 'tasks' && (q.ask === 'open' || q.ask === 'status') && /\b(?:tomorrow|morgen|week)\b/.test(q.read)) return true;
  return false;
}
/**
 * A Dutch question the exact layer reads, asked with no model: answered before the older no-model path can take its
 * words for a line to log (it made a card of "hoeveel calorieën heb ik vandaag gegeten"). That path's own Dutch answers
 * stay: "behind on" for habits, and "how was my week".
 */
// (A request to show something, "Toon mijn gewoontes deze week", is the stage's own: it names the widget it makes.)
export const dutchFirst = (q: Query): boolean => q.lang === 'nl' && !/^(?:toon|laat|open|zet) /.test(q.read) && q.ask !== 'why' && q.domain !== 'nova' && q.domain !== 'life' && !(q.domain === 'habits' && q.ask === 'late');
/** With no model: a Dutch question, or one period beside another in any language, before the older no-model path can take its words for a line to log. */
export const noModelFirst = (q: Query): boolean => dutchFirst(q) || (q.ask === 'compare' && q.domain !== 'nova' && q.domain !== 'life');
const AREA_NAME: Record<string, string> = {today: 'Today', goals: 'Goals', habits: 'Habits', wealth: 'Wealth'};
/** The same sentences the tools' registry says for a closed switch (lib/ai/tools/registry.ts), so NOVA's wording applies to them. */
function closed(q: Query, env: ToolEnv): Exact | null {
  const gate = DOMAIN_GATE[q.domain], refuse = (text: string): Exact => ({kind: 'refusal', text, facts: {closed: gate}, widgets: [], query: q, source: ''});
  if (gate === 'none') return null;
  if (gate === 'health') return env.health && env.areas.health !== false ? null : refuse(HEALTH_CLOSED);
  const area = gate === 'notes' || gate === 'journal' ? 'today' : gate;
  if (env.areas[area] === false) return refuse(`${AREA_NAME[area]} isn't shared with ZIGi here — its switch is off in Settings → ZIGi · Your Personal AI Companion.`);
  return null;
}
export function answerQuery(q: Query, env: ToolEnv): Exact | null {
  const shut = closed(q, env);
  if (shut) return shut;
  if (q.choices?.length) return {kind: 'choices', text: t(q.lang, `More than one habit matches: ${q.choices.map(c => c.name).join(', ')}. Which one do you mean?`, `Meer dan één gewoonte past: ${q.choices.map(c => c.name).join(', ')}. Welke bedoel je?`), facts: {choices: q.choices.map(c => c.name)}, widgets: [], query: q, source: ''};
  switch (q.domain) {
    case 'habits': return habitsAnswer(q, env.habits.habits, env.habitDay);
    case 'water': case 'steps': case 'sleep': case 'weight': case 'calories': case 'protein': case 'workouts': case 'meditation': case 'vitals': case 'health':
    {
      if (!env.health) return null;
      const own = healthAnswer(q, env.health, env.ak?.workouts ?? null, env.healthDay);
      // The words also name a habit ("gesport" with a habit called Exercise) and the log itself is empty: the habit answers.
      if (q.alt && own && own.facts.logged === 0 && env.areas.habits !== false) return habitsAnswer({...q, domain: 'habits', subject: q.alt}, env.habits.habits, env.habitDay) ?? own;
      return own;
    }
    case 'spending': case 'income': return spendingAnswer(q, env);
    case 'budgets': return budgetsAnswer(q, env);
    case 'bills': return billsAnswer(q, env);
    case 'networth': return netWorthAnswer(q, env);
    case 'goals': return goalsAnswer(q, env);
    case 'tasks': return tasksAnswer(q, env);
    case 'journal': return journalAnswer(q, env);
    case 'focus': return focusAnswer(q, env);
    case 'notes': return notesAnswer(q, env);
    case 'agenda': return agendaAnswer(q, env);
    case 'checklist': return checklistAnswer(q, env);
    case 'nova': return novaAnswer(q, env);
    case 'life': return lifeAnswer(q, env);
    default: return null;
  }
}
/** The arguments of the `life_facts` lookup for a query (what the call record and a connected model's tool call carry). */
export function queryArgs(q: Query): Record<string, unknown> {
  return {about: q.domain, ask: q.ask, shape: q.shape, ...(q.period ? {period: q.period} : {}), ...(q.versus ? {versus: q.versus} : {}), ...(q.weekday !== null ? {weekday: q.weekday} : {}), ...(q.subject ? {name: q.subject.name} : {}), ...(q.lang === 'nl' ? {language: 'nl'} : {}), ...(q.read ? {words: q.read.slice(0, 300)} : {})};
}
/** The chip's words for a lookup: "Meditate · not done · this month". */
export function queryLabel(q: Query, today: string): string {
  const p = q.period ? resolvePeriod(q.period, today) : null;
  return [q.subject?.name ?? `${q.domain[0]!.toUpperCase()}${q.domain.slice(1)}`, q.ask.replace('-', ' '), p ? periodWords(p, 'en', today) : null].filter(Boolean).join(' · ').slice(0, 80);
}
/**
 * The widgets of an answer as short strings, "id|ref|period|range|fallback" (empty parts left empty): what the lookup's
 * call carries so NOVA's stage makes the widgets of that answer (lib/nova/summon/summon.ts reads them back and checks
 * every part against the closed catalogue). Three at most.
 */
export const showOf = (widgets: readonly ExactWidget[]): string[] => widgets.slice(0, 3).map(w => [w.id, w.ref ?? '', w.period ?? '', w.range ?? '', w.fallback ?? ''].join('|').slice(0, 200));
export type {Exact, ExactWidget, Query} from './types';
