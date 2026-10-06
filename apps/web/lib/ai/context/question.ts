import {latestHabitRule, measurementUnit} from '../../habits';
import type {Gates} from '../gates';
import {Handles, type Handle} from '../handles';
import {detectSubjects, localAnswer, type ToolCallRecord} from '../local-answers/engine';
import {toolEnv, type ToolSources} from '../tools/env';
import {text as clean} from '../tools/format';
import {runTool, toolText} from '../tools/registry';
import {ANSWER_CHARS} from '../tools/types';

/**
 * Question-aware context (Session V Part 4, the owner's finding): the records sent with a question are chosen from the
 * question as well as the page. "How many minutes did I meditate this month?" asked on Health brings the Meditate
 * habit's figures for this month, not only today's Health snapshot. The question is read by the same engine as the local
 * answers; a habit, goal, food, coin or Health measure it names brings that record's figures for the period it names
 * (or a short default period). Every source runs through ZIGi's tools under the outbound gate (the area switches, the
 * three-part Health gate, sensitive screens), so a closed area adds nothing: it is listed as not included. Each source
 * is a removable chip, and the exact text is what "What your AI sees" shows. At most 16,000 characters are added.
 * Part 8: while "Use my notes" is on, the person's notes go first with every message, as one more removable chip (never on
 * Settings or a private screen; notes about health or diet only through the Health gate).
 */
export type QuestionSource = {id: string; label: string; call: ToolCallRecord; text: string};
const notesCount = (result: {ok: true; data: Record<string, unknown>}) => { const n = Array.isArray(result.data.notes) ? result.data.notes.length : 0; return `${n} note${n === 1 ? '' : 's'}`; };
export type QuestionContext = {sources: QuestionSource[]; withheld: string[]; text: string; handles: Handle[]; capped: boolean};
export const QUESTION_HEADING = '## For this question (records chosen by ZIGi, on this device)';
const MIN_UNITS = /^(minutes?|mins?|min|hours?|h|hrs?)$/i;
const sourceId = (call: ToolCallRecord) => `${call.tool}:${JSON.stringify(call.args)}`;
/** The tool calls a question asks for: the lookup's own, or the figures of each record it names. */
export function questionCalls(question: string, sources: ToolSources, gates: Gates): ToolCallRecord[] {
  const env = toolEnv(sources, gates, 'provider');
  const reply = localAnswer(question, env);
  if ((reply.kind === 'answer' || reply.kind === 'refusal') && reply.calls.length) return reply.calls;
  const s = detectSubjects(question, env), calls: ToolCallRecord[] = [];
  const phrase = (fallback: string) => s.ranges[0]?.phrase ?? fallback;
  const add = (tool: string, args: Record<string, unknown>) => calls.push({tool, args, label: tool});
  for (const habit of s.habits) {
    const rule = latestHabitRule(habit), timed = rule.measurement.kind === 'duration' || MIN_UNITS.test(measurementUnit(rule));
    add('habit_stats', {habit: clean(habit.title, 120), range: phrase('this month'), metric: timed ? 'minutes' : rule.measurement.kind === 'boolean' ? 'count' : 'quantity'});
  }
  for (const goal of s.goals) add('goal_progress', {goal: clean(goal.name, 120)});
  if (s.contributions) add('goal_contributions', {...(s.goals.length === 1 ? {goal: clean(s.goals[0]!.name, 120)} : {}), range: phrase('this month')});
  if (s.asset) add('holdings', {asset: s.asset});
  if (s.wealthTotal) add('totals_per_currency', {});
  const h = s.health;
  if (h.nutrient) add('nutrient_totals', {range: phrase('the last 7 days'), nutrient: h.nutrient});
  else if (h.diary) add('diary_entries', {range: phrase('today')});
  if (h.water) add('water', {range: phrase('the last 7 days')});
  if (h.steps || h.active) add('steps', {range: phrase('the last 7 days')});
  if (h.weight) add('weight', {range: phrase('the last 30 days')});
  if (h.measurement) add('body_measurements', {range: phrase('the last 90 days')});
  if (h.fasting) add('fasting', {range: phrase('the last 30 days')});
  if (h.counter) add('counters', {range: phrase('the last 7 days'), ...(typeof h.counter === 'string' ? {counter: h.counter} : {})});
  const seen = new Set<string>();
  return calls.filter(c => { const id = sourceId(c); if (seen.has(id)) return false; seen.add(id); return true; }).slice(0, 8);
}
/** The person's notes for ZIGi (Part 8), with every message while "Use my notes" is on; a removable chip like the others. */
export const NOTES_CALL: ToolCallRecord = {tool: 'about_me', args: {}, label: 'About me'};
/** The question's sources, run now for the person's AI; `removed` holds the ids of chips the person took off. */
export function questionContext(question: string, sources: ToolSources | null, gates: Gates, pageHandles: readonly Handle[] = [], removed: ReadonlySet<string> = new Set()): QuestionContext | null {
  const q = question.trim();
  if (!sources || gates.paused) return null;
  const handles = new Handles(pageHandles), env = toolEnv(sources, gates, 'provider', handles);
  const notes = env.notes?.length ? [NOTES_CALL] : [];
  const calls = [...notes, ...(q.length >= 3 && Object.values(gates.areas).some(Boolean) ? questionCalls(q, sources, gates) : [])];
  if (!calls.length) return null;
  const out: QuestionSource[] = [], withheld: string[] = [];
  let total = 0, capped = false;
  for (const call of calls) {
    const result = runTool(call.tool, call.args, env);
    if (!result.ok) { if (!withheld.includes(result.refusal)) withheld.push(result.refusal); continue; }
    const id = sourceId(call);
    if (removed.has(id)) continue;
    const text = toolText(result, env);
    if (total + text.length > ANSWER_CHARS) { capped = true; continue; }
    total += text.length;
    const label = call === NOTES_CALL ? `About me · ${notesCount(result)}` : result.label;
    out.push({id, label, call: {...call, label}, text});
  }
  if (!out.length && !withheld.length) return null;
  return {sources: out, withheld, text: out.length ? `${QUESTION_HEADING}\n${out.map(s => s.text).join('\n')}${capped ? '\n(Some records were left out to keep this within 16,000 characters.)' : ''}` : '', handles: [...handles.list], capped};
}
