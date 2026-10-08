import {latestHabitRule, measurementUnit} from '../../habits';
import type {Gates} from '../gates';
import {Handles, type Handle} from '../handles';
import {detectSubjects, localAnswer, type ToolCallRecord} from '../local-answers/engine';
import {detectIntent} from '../intent';
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
/** Dutch and French cue words as their English equivalents, so the English subject detection reads them; the periods are already multilingual. */
const CUES: [RegExp, string][] = [
  // Phase 2 round 4 (ADR-017 S66): the cues the fix-round misses named, each to the English words the engine already reads.
  [/\bmindful minuten\b|\bminutes de pleine conscience\b/g, 'mindful minutes'], [/\bwat ben ik schuldig\b|\bque dois-je\b|\bmijn schulden\b|\bmes dettes\b/g, 'what do i owe'],
  [/\bwaar moet ik (?:vandaag )?op letten\b|\bà quoi dois-je faire attention(?: aujourd'hui)?\b/g, 'what should i pay attention to today'], [/\béchéances?\b|\bvervaldat(?:um|a)\b|\bdeadlines?\b/g, 'deadlines'],
  [/\bbezit(?:tingen)?\b|\bavoirs?\b|\bgrootste positie\b|\bplus grosse position\b/g, 'holding'], [/\blangste\b|\bplus longue\b|\bplus long\b/g, 'longest'], [/\bkortste\b|\bplus courte\b/g, 'shortest'],
  [/\bstappen\b|\bpas\b/g, 'steps'], [/\bgewicht\b|\bwoog\b|\bweeg\b|\bpoids\b|\bpesais\b|\bpèse\b/g, 'weight'], [/\bgeslapen\b|\bslaap\w*|\bslapen\b|\bvannacht\b|\bsommeil\b|\bdormi\b|\bdors\b|\bnuit\b|\bsieste\b|\bdutje\b/g, 'sleep'],
  [/\bgemediteerd\b|\bmediteer\w*|\bmeditatie\b|\bmédit\w*|\bpleine conscience\b/g, 'meditation'], [/\bcalorieën\b|\bcalorieen\b/g, 'calories'], [/\beiwit\w*|\bprotéines?\b/g, 'protein'], [/\bgegeten\b|\beten\b|\bmaaltijd\w*|\bontbijt\b|\bmangé\b|\bmanger\b|\brepas\b|\bdéjeuner\b|\bdîner\b/g, 'food'],
  [/\bwater\b|\beau\b|\bgedronken\b|\bbu\b/g, 'water'], [/\bnettovermogen\b|\bnetto vermogen\b|\bvaleur nette\b|\bpatrimoine\b/g, 'net worth'], [/\bper valuta\b|\bpar devise\b|\btotalen\b|\btotaux\b/g, 'per currency'], [/\bschuldig\b|\bschulden\b|\bdettes?\b|\bque dois-je\b/g, 'my debts'],
  [/\bportefeuille\b/g, 'portfolio'], [/\bschaak\w*|\béchecs\b/g, 'chess'], [/\bliens?\b/g, 'links'], [/\bmijlpa(?:a)?l(?:en)?\b|\bjalons?\b/g, 'milestones'], [/\buitdaging(?:en)?\b|\bdéfis?\b/g, 'challenges'], [/\breeks(?:en)?\b|\bséries?\b/g, 'streak'], [/\bminuten\b|\bminutes\b/g, 'minutes'], [/\buur\b|\buren\b|\bheures?\b/g, 'hours'],
  [/\bgelezen\b|\blezen\b|\blu\b|\blire\b|\bpagina'?s?\b|\bpages\b/g, 'read'], [/\bgewandeld\b|\bwandel\w*|\bmarche\b|\bmarché\b/g, 'walk'], [/\bgesport\b|\bsporten\b|\bexercice\b/g, 'exercise'], [/\bdoel(?:en)?\b|\bobjectifs?\b/g, 'goal'], [/\bgewoonte(?:s|n)?\b|\bhabitudes?\b/g, 'habit'],
  [/\bnoodfonds\b|\bfonds d'urgence\b/g, 'emergency fund'], [/\bhoeveel\b|\bcombien\b/g, 'how much'], [/\bwelke\b|\bquel(?:le)?s?\b/g, 'which'], [/\bhoe ver\b|\boù en\b/g, 'how far'], [/\bwat is\b|\bwat was\b|\bqu'est-ce que\b/g, 'what is'], [/\bwanneer\b|\bquand\b/g, 'when'], [/\bapparaten\b|\bappareils?\b|\bgeïmporteerd\b|\bimporté\b/g, 'devices'], [/\bhartslag\b|\bfréquence cardiaque\b/g, 'heart rate'],
];
export function translateCues(question: string): string { let q = question.toLowerCase(); for (const [re, word] of CUES) q = q.replace(re, word); return q; }
/** A habit measure asked for without a habit's name (minutes read, a streak, pages): every timed habit's figures are pre-run. */
const HABIT_MEASURE = /\b(minutes?|minuten|streaks?|reeks|série|pages?|pagina|consistent|consistency|rate|check-?ins?|how often|hoe vaak|combien de fois)\b/;
const GOAL_WORDS = /\b(how far|progress|left|remaining|how close|which|list|dates?|coming up|hoe ver|ontbreekt|welke|où en|manque|quels|échéances)\b/;
/** The tool calls a question asks for: the lookup's own, or the figures of each record it names. */
export function questionCalls(question: string, sources: ToolSources, gates: Gates): ToolCallRecord[] {
  const env = toolEnv(sources, gates, 'provider');
  const reply = localAnswer(question, env);
  if ((reply.kind === 'answer' || reply.kind === 'refusal') && reply.calls.length) return reply.calls;
  // Phase 2 P2.3: an ask to add a widget or a link is a card, not a lookup; the figures it names ("a water widget") are not
  // pre-run, or the model answers with them and never sends the card (seen on every model).
  const intent = detectIntent(question);
  if ((intent.log || intent.plan) && /widget|\blinks?\b|\bliens?\b|koppeling/i.test(question)) return [];
  // Phase 2 (P2.2a): the subject detection reads English; a Dutch or French question is translated cue by cue first,
  // for this router only (the local engine keeps its English-only answers, by the golden set's rule).
  const s = detectSubjects(translateCues(question), env), calls: ToolCallRecord[] = [];
  const phrase = (fallback: string) => s.ranges[0]?.phrase ?? fallback;
  const add = (tool: string, args: Record<string, unknown>) => calls.push({tool, args, label: tool});
  for (const habit of s.habits) {
    const rule = latestHabitRule(habit), timed = rule.measurement.kind === 'duration' || MIN_UNITS.test(measurementUnit(rule));
    add('habit_stats', {habit: clean(habit.title, 120), range: phrase('this month'), metric: timed ? 'minutes' : rule.measurement.kind === 'boolean' ? 'count' : 'quantity'});
  }
  for (const goal of s.goals) add('goal_progress', {goal: clean(goal.name, 120)});
  if (s.contributions) add('goal_contributions', {...(s.goals.length === 1 ? {goal: clean(s.goals[0]!.name, 120)} : {}), range: phrase('this month')});
  if (s.asset) add('holdings', {asset: s.asset});
  // Round 4: as the local engine does in English, net worth joins the totals when accounts or debts exist on the device.
  if (s.wealthTotal) { add('totals_per_currency', {}); if ((env.accounts?.items ?? []).some(a => !a.archivedAt)) add('net_worth', {}); }
  const h = s.health;
  if (h.nutrient) add('nutrient_totals', {range: phrase('the last 7 days'), nutrient: h.nutrient});
  else if (h.diary) add('diary_entries', {range: phrase('today')});
  if (h.water) add('water', {range: phrase('the last 7 days')});
  if (h.steps || h.active) add('steps', {range: phrase('the last 7 days')});
  if (h.weight) add('weight', {range: phrase('the last 30 days')});
  if (h.measurement) add('body_measurements', {range: phrase('the last 90 days')});
  if (h.fasting) add('fasting', {range: phrase('the last 30 days')});
  if (h.counter) add('counters', {range: phrase('the last 7 days'), ...(typeof h.counter === 'string' ? {counter: h.counter} : {})});
  // Session W Part 21: sleep, meditation, vitals and devices (Health, behind its gate), then the other new areas.
  if (h.sleep) add('sleep_summary', {});
  if (h.meditation) add('meditation_summary', {});
  if (h.vitals) add('vitals', {range: phrase('the last 7 days')});
  if (h.devices) add('devices', {});
  // Session X-Local Phase 2 (P2.2a): families of asks the subject detection alone did not cover, in three languages:
  // what is open today, which goals or habits, a brief or a day's story, "what do you know about me", the portfolio,
  // staking, imports; sleep and meditation bring their nights and sessions beside the summary; a habit measure asked
  // without a named habit brings every timed habit's figures for the period. The question-aware chips stay removable.
  const q = question.toLowerCase();
  const OPEN_TODAY = /\b(still open|left today|open today|what(?:'s| is) open|still to do|remaining today|left to do|to do today|due today|habits (?:are )?left|nog open|nog te doen|staat er .*open|reste-t-il|encore à faire|à faire aujourd'hui|open for me)\b/;
  const LIST_GOALS = /\b(which goals?|what goals?|my goals|goals do i have|list (?:my )?goals|goal dates|goals? (?:are|is) (?:coming|due|closest|furthest|behind)|closest to done|furthest behind|welke doelen|mijn doelen|doeldatums|quels objectifs|mes objectifs|échéances)\b/;
  const LIST_HABITS = /\b(which habits?|what habits?|my habits|habits do i have|list (?:my )?habits|my streaks|how are my streaks|welke gewoontes?|mijn gewoontes?|mijn reeksen|mes habitudes|quelles habitudes|mes séries)\b/;
  const BRIEF = /\b(brief|briefing|focus on today|pay attention|what should i|how is my (?:week|day|month)|my (?:week|month|day) (?:going|so far)|story of my|summar|wrap-?up|weekly review|weekend|weekdays|résumé|samenvat|overzicht|waar moet ik op letten|à quoi dois-je|ma semaine|mijn week|hoe gaat mijn)\b/;
  const DID = /\b(what did i (?:do|log)|what have i logged|busiest day|what happened|wat heb ik (?:gedaan|gelogd)|qu'ai-je fait|qu'est-ce que j'ai fait)\b/;
  const ABOUT_ME = /\b(know about me|about me|over mij|sur moi)\b/;
  const PORTFOLIO = /\b(portfolios?|portefeuilles?)\b/, STAKING = /\b(stak(?:ing|ed)|validators?|staken|rewards?)\b/;
  if (OPEN_TODAY.test(q)) { add('habits_due', {}); add('list_habits', {}); }
  if (LIST_GOALS.test(q) || (!s.goals.length && /\b(goals?|doel(?:en)?|objectifs?)\b/.test(q) && GOAL_WORDS.test(q))) add('list_goals', {});
  if (LIST_HABITS.test(q)) add('list_habits', {});
  if (BRIEF.test(q)) { add('today_summary', {}); add('list_habits', {}); add('habits_due', {}); }
  if (DID.test(q)) add('recent_activity', {range: phrase('today')});
  if (ABOUT_ME.test(q)) add('about_me', {});
  if (PORTFOLIO.test(q)) add('portfolios', {});
  if (STAKING.test(q)) add('staking_watch', {});
  // Phase 2 round 4 (ADR-017 S66): the families the fix-round misses named, on the translated question.
  const tq = translateCues(q);
  const DEADLINES = /\b(deadlines?|coming up|due dates?|which dates?)\b/, HOLDINGS = /\b(?:biggest|largest|smallest|main) (?:holding|position|asset)s?\b|\bholdings?\b/;
  const SLEEP_WORDS = /\b(sleep|slept|sleeping|nights?|sommeil|dormi|dors|nuits?|slaap|geslapen|slapen)\b/, MED_WORDS = /\b(meditat\w*|mindful|médit\w*)\b/, SESSION_WORDS = /\b(longest|shortest|last session|sessions?)\b/;
  const DEVICES = /\b(imports?|imported|devices?|manual entries|bluetooth|linked service|apparaten|appareils?)\b/, TIME_OF_DAY = /\b(when in the day|time of day|morning or evening|op welk moment|wanneer op de dag|à quel moment)\b/, WEEKEND = /\b(weekends?|week-?ends?|weekdays?|weekdag(?:en)?|semaine ou week-end)\b/;
  if (DEADLINES.test(tq)) add('list_goals', {});
  if (HOLDINGS.test(tq) && !s.asset) add('holdings', {});
  if (!h.sleep && SLEEP_WORDS.test(tq)) { add('sleep_summary', {}); add('sleep_nights', {range: phrase('the last 14 days')}); }
  if (MED_WORDS.test(tq) && SESSION_WORDS.test(tq)) add('meditation_sessions', {range: phrase('this month')});
  if (DEVICES.test(tq)) { add('devices', {}); add('steps', {range: phrase('this week')}); }
  if (TIME_OF_DAY.test(tq)) { add('list_habits', {}); for (const habit of env.habits.habits.filter(hb => latestHabitRule(hb).state !== 'archived').slice(0, 3)) add('habit_checkins', {habit: clean(habit.title, 120), range: phrase('the last 14 days')}); }
  if (WEEKEND.test(tq)) add('steps', {range: phrase('the last 14 days')});
  const healthSubject = h.nutrient !== null || h.water || h.steps || h.active || h.weight || h.measurement || h.fasting || h.diary || h.counter !== null || h.sleep || h.meditation || h.vitals || h.devices;
  if (!s.habits.length && !s.goals.length && !healthSubject && (HABIT_MEASURE.test(translateCues(q)) || WEEKEND.test(tq))) {
    add('list_habits', {});
    for (const habit of env.habits.habits.filter(hb => latestHabitRule(hb).state !== 'archived').slice(0, 4)) { const rule = latestHabitRule(habit), timed = rule.measurement.kind === 'duration' || MIN_UNITS.test(measurementUnit(rule)); add('habit_stats', {habit: clean(habit.title, 120), range: phrase('this week'), metric: timed ? 'minutes' : rule.measurement.kind === 'boolean' ? 'count' : 'quantity'}); }
  }
  const l = s.life;
  if (l.accounts) add('net_worth', {});
  if (l.milestones) add('milestones', s.goals.length === 1 ? {goal: clean(s.goals[0]!.name, 120)} : {});
  if (l.challenges) add('challenges', {});
  if (l.chess) add('chess_ratings', {});
  if (l.links) add('links_count', {});
  const seen = new Set<string>();
  return calls.filter(c => { const id = sourceId(c); if (seen.has(id)) return false; seen.add(id); return true; }).slice(0, 10);
}
/** The person's notes for ZIGi (Part 8), with every message while "Use my notes" is on; a removable chip like the others. */
export const NOTES_CALL: ToolCallRecord = {tool: 'about_me', args: {}, label: 'About me'};
/** The question's sources, run now for the person's AI; `removed` holds the ids of chips the person took off. */
export function questionContext(question: string, sources: ToolSources | null, gates: Gates, pageHandles: readonly Handle[] = [], removed: ReadonlySet<string> = new Set(), pinned: readonly ToolCallRecord[] = []): QuestionContext | null {
  const q = question.trim();
  if (!sources || gates.paused) return null;
  const handles = new Handles(pageHandles), env = toolEnv(sources, gates, 'provider', handles);
  const notes = env.notes?.length ? [NOTES_CALL] : [];
  // Part 9: the records behind a number the person asked about ("Ask ZIGi about this") come right after the notes.
  const asked = Object.values(gates.areas).some(Boolean) ? [...pinned, ...(q.length >= 3 ? questionCalls(q, sources, gates) : [])] : [];
  const seen = new Set<string>(), calls = [...notes, ...asked].filter(c => { const id = sourceId(c); if (seen.has(id)) return false; seen.add(id); return true; });
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
