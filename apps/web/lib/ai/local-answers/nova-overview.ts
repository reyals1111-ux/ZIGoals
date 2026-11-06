import {healthGoalLine, healthGoalProgress} from '../../health-goals/progress';
import type {HealthGoal} from '../../health-goals/schema';
import {formatGoalAmount} from '../../goal-summary';
import {dailyData} from '../../health-daily';
import {formatClock} from '../../visual-format';
import {NO_WATER_TODAY, waterText} from '../../health-units';
import {briefChatText} from '../proactive/brief';
import type {ToolEnv} from '../tools/env';
import {text as clean} from '../tools/format';
import {summaries} from '../tools/goals';
import {NOT_READ_HERE, UNREADABLE_HERE} from '../tools/nova-tools';
import {runTool} from '../tools/registry';
import type {ToolOk, ToolResult} from '../tools/types';
import type {LocalReply, ToolCallRecord} from './engine';
import {f9LocalAnswer} from './f9';
import {novaLocalAnswer} from './nova';
import {novaAreaClosed, novaHealthClosed, type NovaEnvInfo} from './nova-env';
import {amount, dayText, nlUnits, plural} from './words';

/**
 * Release review 2 (R2-2): the natural questions people ask NOVA first, answered on this device from the person's own
 * records with no AI and nothing sent, on NOVA's environment only (lib/nova/local-env.ts: NOVA → Permissions applied), so
 * ZIGi's answers and every pin of ZIGi's golden set stay exactly as they were. Consulted after Session AF's commands and
 * before the other lookups (engine.ts):
 * - goals: "How far am I on my goals?", "How are my goals doing?" — every active goal's progress, what is left and its next
 *   planned day (a goal named in the question stays the engine's own answer);
 * - due today: "What is due today?", "What do I have to do today?" — habits still open, tasks due or overdue, and what the
 *   agenda plans today (bills, contributions, meals, workouts, reviews), titles only;
 * - sleep: "How was my sleep?", "Hoe heb ik geslapen?" — the last 7 nights, or last night;
 * - the week: "What does my week look like?", "What do I have this week?" — the agenda (F9's answer);
 * - habits left: "How many habits are left today?"; water to go: "How much water to go?"; tasks due: "Tasks due today?";
 * - the day: "What does my day look like?", "What's next?" — the morning brief (or the evening recap after 3 PM UTC, as
 *   "Summarise my day" does).
 * English, and Dutch for goals, today, sleep and habits left (the families the existing layer answers in Dutch). Advice,
 * plans and anything that also asks for a change are never answered here. Unknown is never zero: a record not read says so.
 */
type Lang = 'en' | 'nl';
type Data = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const NOT_HERE = /\b(?:should|shall|recommend|advi[cs]e|suggest|better|worth|cut|reduce|improve|why|zou ik|advies|waarom)\b|\b(?:and|then|also|en|dan|ook)\s+(?:also\s+|ook\s+)?(?:log|add|set|mark|start|keep|put|remind|plan|tick|move|finish|delete|zet|voeg|vink|noteer|maak)\b/i;
const LEAD = String.raw`^(?:(?:hey|hi|hoi|ok|okay|so|nova|zigi|and|en),?\s+)*`;
const GOALS_EN = /\bhow (?:far|close|far along) (?:am i|are we) (?:on|with|to|in) (?:all )?(?:of )?my goals\b|\bhow (?:are|is) (?:all )?(?:of )?my goals(?: doing| going| coming along| looking)?\b|\bhow am i doing (?:on|with) (?:all )?(?:of )?my goals\b|\b(?:progress|status) (?:on|of|for) (?:all )?(?:of )?my goals\b|\bmy goals(?:'s?)? progress\b|\bwhere (?:am i|do i stand) (?:on|with) my goals\b|^(?:my )?goals (?:progress|status)\??$|^my goals\?$/i;
const GOALS_NL = /\bhoe (?:ver|staat het|sta ik) (?:ben ik )?(?:met|op|bij) (?:al )?mijn doelen\b|\bhoe gaat het met (?:al )?mijn doelen\b|\bhoe staan (?:al )?mijn doelen(?: ervoor)?\b|\b(?:voortgang|stand) van (?:al )?mijn doelen\b/i;
const DUE_EN = new RegExp(`${LEAD}(?:what(?:'s| is| do i have| have i got| are)(?: still)? (?:due|left|open|on|planned|scheduled)(?: for| to do)?(?: for)? today|what(?:'s| is) due(?: now)?|what do i (?:have|need|still have) to do today|what(?:'s| is) on (?:my plate|for) today|anything (?:due|left|open) today|what(?:'s| is) left (?:for|to do) today|due today|what(?:'s| is) today looking like)[.!?]?$`, 'i');
const DUE_NL = /\bwat (?:moet ik|staat er) vandaag(?: nog)?(?: op de planning| op het programma| doen| open| te doen)?\b|\bwat is er vandaag (?:nog )?(?:te doen|gepland)\b|\bwat staat (?:er )?(?:nog )?open (?:voor )?vandaag\b/i;
const SLEEP_EN = /\bhow (?:was|is|has been) my sleep\b|\bhow(?:'s| has) my sleep (?:been|going|looking)\b|\bhow have i (?:been )?sle(?:pt|eping)\b|\bhow am i sleeping\b|\bmy sleep (?:this|last) week\b/i;
const SLEEP_NL = /\bhoe heb ik (?:\S+ ){0,3}geslapen\b|\bhoe (?:was|is) mijn slaap\b|\bhoe slaap ik\b/i;
const LAST_NIGHT_NL = /\b(?:vannacht|afgelopen nacht|gisternacht|vorige nacht)\b/i;
const WEEK_EN = /\bwhat does my (week|day tomorrow) look like\b|\bwhat do i have (?:on |planned |coming up )?(this week|next week|tomorrow)\b|\bwhat(?:'s| is) (?:on |planned |happening )?(this week|next week|tomorrow)\b|\bmy (?:week|schedule) (this week|ahead)\b/i;
const HABITS_EN = /\b(?:how many|which|what) habits?\b.{0,30}\b(?:left|open|remaining|to do|not done(?: yet)?)\b(?:.{0,15}\btoday\b)?|\bhabits? (?:still )?(?:left|remaining|to do)\b(?: for)?(?: today)?[.!?]?$/i;
const HABITS_NL = /\b(?:welke|hoeveel) gewoontes?\b.{0,30}\b(?:nog )?(?:open|te doen|over|doen)\b/i;
const WATER_EN = /\bwater\b.{0,30}\b(?:to go|left|remaining|still|more)\b|\bhow (?:much|many) (?:more )?(?:water|glasses)\b.{0,30}\b(?:need|left|to go|still)\b|\b(?:how close|how far) (?:am i )?(?:to|from) my water (?:target|goal)\b/i;
const TASKS_EN = /^(?:(?:my|which|what|any) )?tasks? (?:are )?(?:due|for today|overdue)(?: today| now)?[.!?]?$|\b(?:which|what|any) tasks? (?:are |is )?(?:due|left|open|overdue)\b/i;
const DAY_EN = new RegExp(`${LEAD}(?:what does (?:my|the) day look like(?: today)?|how(?:'s| is) my day(?: today)?(?: looking| shaping up)?|what(?:'s| is) next(?: today| for me| on my list)?|what(?:'s| is) (?:my )?day like)[.!?]?$`, 'i');
const NL_WORD = /\b(?:wat|hoe|hoeveel|welke|mijn|ik|heb|ben|staat|staan|vandaag|doelen|gewoontes?|geslapen|slaap|moet|nog|er)\b/i;
const langOf = (q: string): Lang => NL_WORD.test(q) && !/\b(?:what|how|which|my|today|goals?|habits?|sleep)\b/i.test(q) ? 'nl' : 'en';
const say = (lang: Lang, en: string, nl: string) => lang === 'nl' ? nl : en;
const run = (tool: string, args: Record<string, unknown>, env: ToolEnv): {result: ToolResult; record: ToolCallRecord} => { const result = runTool(tool, args, env); return {result, record: {tool, args, label: result.label}}; };
const dataOf = (r: ToolResult): Data => (r as ToolOk).data as Data;
/** "9000 USD" → "9,000.00 USD"; anything else as it is. */
// Session AL (DV-078, P-DV-95): money with the app's formatter ("$0 of $500"), a count goal's word as typed ("20 books").
const money = (value: unknown) => { const m = /^(-?\d+(?:\.\d+)?) (\S+)$/.exec(String(value ?? '')); return !m ? String(value ?? '') : m[2] === 'USD' || m[2] === 'EUR' ? formatGoalAmount(m[1]!, m[2]).replace(/\.00(?!\d)/, '') : amount(m[1]!, m[2]!); };

export function novaOverviewAnswer(question: string, env: ToolEnv, info: NovaEnvInfo): LocalReply | null {
  const q = question.trim().replace(/[’`]/g, '\'').replace(/\s+/g, ' ');
  if (!q || q.length > 200 || NOT_HERE.test(q)) return null;
  const lang = langOf(q);
  if (GOALS_EN.test(q) || GOALS_NL.test(q)) return goalsAnswer(env, lang);
  if (DUE_EN.test(q) || DUE_NL.test(q)) return dueTodayAnswer(env, lang, info.todayScope !== false);
  if (SLEEP_EN.test(q) || SLEEP_NL.test(q)) return sleepAnswer(env, info, lang, lang === 'nl' && LAST_NIGHT_NL.test(q));
  if (HABITS_EN.test(q) || HABITS_NL.test(q)) return habitsLeftAnswer(env, lang);
  if (WATER_EN.test(q)) return waterAnswer(env, info);
  const week = WEEK_EN.exec(q);
  if ((week || TASKS_EN.test(q)) && info.todayScope === false) return {kind: 'refusal', text: novaAreaClosed('Today', lang), calls: []};
  if (week) { const when = (week[1] ?? week[2] ?? week[3] ?? week[4] ?? 'this week').toLowerCase(); return f9LocalAnswer(`What is on my agenda ${when === 'week' || when === 'ahead' ? 'this week' : when === 'day tomorrow' ? 'tomorrow' : when}?`, env); }
  if (TASKS_EN.test(q)) return novaLocalAnswer('Which tasks are due today?', env);
  if (DAY_EN.test(q)) return {kind: 'answer', text: briefChatText(env, env.now.getUTCHours() < 15 ? 'morning' : 'evening', {snapshot: env.earn}), calls: []};
  return null;
}

function goalsAnswer(env: ToolEnv, lang: Lang): LocalReply {
  const r = run('list_goals', {}, env);
  if (!r.result.ok) return env.areas.goals ? {kind: 'refusal', text: r.result.refusal, calls: [r.record]} : {kind: 'refusal', text: novaAreaClosed('Goals', lang), calls: []};
  const goals = (dataOf(r.result).goals ?? []) as Data[], active = goals.filter(g => g.status === 'active'), done = goals.filter(g => g.status === 'completed').length;
  // Session AL Part 14 (Denver DV-027c): the Health goals are goals too; they live in their own section of Goals (they read
  // the Health journal), so they are named after the others, with where to find them. Only with the Health gate (env).
  const health = healthGoalLines(env, lang);
  if (!active.length && health.length) return {kind: 'answer', text: [say(lang, `You have no active goals in Goals yet${done ? ` (${plural(done, 'goal')} completed)` : ''}.`, `Je hebt nog geen actieve doelen in Goals${done ? ` (${done} afgerond)` : ''}.`), ...health].join('\n'), calls: [r.record]};
  if (!active.length) return {kind: 'answer', text: say(lang, `You have no active goals yet${done ? ` (${plural(done, 'goal')} completed)` : ''}. Open Goals to create one, or tell me the goal and I will draft it as a card.`, `Je hebt nog geen actieve doelen${done ? ` (${done} afgerond)` : ''}. Open Goals om er een te maken, of vertel me het doel en ik maak er een kaart van.`), calls: [r.record]};
  // DV-078: up to twelve in the answer; any more are named as a count with where to see them all (a chat cannot unfold).
  const shown = active.slice(0, 12), year = env.habitDay.slice(0, 4);
  const line = (g: Data) => {
    const figures = g.now && g.target && g.now !== 'unknown' && g.target !== 'unknown' ? say(lang, ` — ${money(g.now)} of ${money(g.target)}`, ` — ${money(g.now)} van ${money(g.target)}`) : '';
    const left = g.remaining && !/^0(?:\.0+)? /.test(String(g.remaining)) && g.remaining !== 'unknown' ? say(lang, `, ${money(g.remaining)} to go`, `, nog ${money(g.remaining)} te gaan`) : '';
    const next = /^\d{4}-\d{2}-\d{2}$/.test(String(g.nextPlannedDate ?? '')) ? say(lang, `; next planned ${dayText(g.nextPlannedDate, year)}`, `; volgende geplande stap ${dayText(g.nextPlannedDate, year)}`) : '';
    return `• ${clean(String(g.name), 60)}: ${g.progress && g.progress !== 'unknown' ? g.progress : say(lang, 'progress unknown', 'voortgang onbekend')}${figures}${left}${next}`;
  };
  const head = say(lang, `${plural(active.length, 'active goal')}, from your own records:`, `${active.length} actieve ${active.length === 1 ? 'doel' : 'doelen'}, uit je eigen gegevens:`);
  const more = active.length > shown.length ? [say(lang, `…and ${plural(active.length - shown.length, 'more goal')}: Goals shows all ${active.length}.`, `…en nog ${active.length - shown.length}: Goals toont ze alle ${active.length}.`)] : [];
  const tail = [...(done ? [say(lang, `${plural(done, 'goal')} completed.`, `${done} ${done === 1 ? 'doel' : 'doelen'} afgerond.`)] : []), say(lang, 'Ask about one goal by its name for its plan and pace. Your own figures; not financial advice.', 'Vraag naar één doel bij naam voor het plan en het tempo. Je eigen cijfers; geen financieel advies.')];
  return {kind: 'answer', text: [head, ...shown.map(line), ...more, ...health, ...tail].join('\n'), calls: [r.record]};
}
/** DV-027c: the active Health goals with their progress as Goals → Health goals shows it (a heading, then one line each, at most six). */
function healthGoalLines(env: ToolEnv, lang: Lang): string[] {
  const list = (env.healthGoals ?? []).filter(g => g.status === 'active');
  if (!list.length || !env.health) return [];
  const shown = list.slice(0, 6), line = (g: HealthGoal) => { let text = say(lang, 'progress unknown', 'voortgang onbekend'); try { text = healthGoalLine(g, healthGoalProgress(g, env.health!, env.healthDay)); } catch { /* unknown, never zero */ } return `• ${clean(g.name, 60)}: ${text === 'No data yet' ? say(lang, 'no data yet', 'nog geen gegevens') : text}`; };
  return [say(lang, `${plural(list.length, 'health goal')} (Goals → Health goals, from your Health journal):`, `${list.length} ${list.length === 1 ? 'gezondheidsdoel' : 'gezondheidsdoelen'} (Goals → Health goals, uit je Health-dagboek):`), ...shown.map(line),
    ...(list.length > shown.length ? [say(lang, `…and ${list.length - shown.length} more under Goals → Health goals.`, `…en nog ${list.length - shown.length} onder Goals → Health goals.`)] : [])];
}

const AGENDA_KIND_NL: Record<string, string> = {bill: 'rekening', 'goal contribution': 'inleg voor een doel', meal: 'maaltijd', workout: 'training', unbonding: 'unbonding', review: 'review'};
function dueTodayAnswer(env: ToolEnv, lang: Lang, todayOpen: boolean): LocalReply {
  const today = env.habitDay, calls: ToolCallRecord[] = [], lines: string[] = [];
  let anything = false;
  // Habits still open today.
  const h = run('habits_due', {}, env);
  if (h.result.ok) {
    calls.push(h.record);
    const open = (dataOf(h.result).open ?? []) as Data[];
    if (open.length) { anything = true; lines.push(say(lang, `Habits still open: ${open.map(x => `${clean(String(x.title), 50)} (${typeof x.logged === 'number' ? `${x.loggedText ?? x.logged} of ${x.target}` : `target ${x.target}`})`).join(', ')}`, `Gewoontes nog open: ${open.map(x => `${clean(String(x.title), 50)} (${typeof x.logged === 'number' ? `${x.loggedText ?? x.logged} van ${nlUnits(String(x.target))}` : `doel ${nlUnits(String(x.target))}`})`).join(', ')}`)); }
    else lines.push(env.habits.habits.length ? say(lang, 'Habits: every habit planned for today is done.', 'Gewoontes: alles wat voor vandaag gepland stond is gedaan.') : say(lang, 'Habits: none kept yet.', 'Gewoontes: nog geen.'));
  } else lines.push(say(lang, 'Habits: off for NOVA, so not read (NOVA → Permissions).', 'Gewoontes: staan uit voor NOVA, dus niet gelezen (NOVA → Permissions).'));
  // Tasks due today or overdue (unknown when the list was not read).
  const t = run('tasks', {}, env);
  if (t.result.ok && todayOpen) {
    calls.push(t.record);
    const d = dataOf(t.result), rows = (d.open ?? []) as Data[];
    if (d.note === NOT_READ_HERE || d.note === UNREADABLE_HERE) lines.push(say(lang, 'Tasks: unknown here (the task list was not read).', 'Taken: onbekend hier (de takenlijst is niet gelezen).'));
    else {
      const dueNow = rows.filter(r => r.state === 'today'), late = rows.filter(r => r.state === 'overdue');
      const name = (r: Data) => `${clean(String(r.task), 80)}${r.time ? say(lang, ` at ${formatClock(r.time)}`, ` om ${formatClock(r.time)}`) : ''}${r.priority === 'high' ? say(lang, ' (high)', ' (hoog)') : ''}`;
      if (dueNow.length) { anything = true; lines.push(say(lang, `Tasks due today: ${dueNow.map(name).join(', ')}`, `Taken voor vandaag: ${dueNow.map(name).join(', ')}`)); }
      if (late.length) { anything = true; lines.push(say(lang, `Still open from earlier: ${late.map(r => `${clean(String(r.task), 80)} (since ${dayText(String(r.due), today.slice(0, 4))})`).join(', ')}`, `Nog open van eerder: ${late.map(r => `${clean(String(r.task), 80)} (sinds ${dayText(String(r.due), today.slice(0, 4))})`).join(', ')}`)); }
      if (!dueNow.length && !late.length) lines.push(say(lang, 'Tasks: none due today.', 'Taken: niets voor vandaag.'));
    }
  } else lines.push(say(lang, 'Tasks and the agenda: Today is off for NOVA, so not read (NOVA → Permissions).', 'Taken en agenda: Today staat uit voor NOVA, dus niet gelezen (NOVA → Permissions).'));
  // The agenda's other plans today (habits are above).
  const a = run('agenda', {from: today, days: 1}, env);
  if (a.result.ok && todayOpen) {
    calls.push(a.record);
    const items = ((dataOf(a.result).items ?? []) as Data[]).filter(i => i.kind !== 'habit' && i.state !== 'done' && i.state !== 'skipped');
    if (items.length) { anything = true; lines.push(say(lang, `Also planned today: ${items.slice(0, 12).map(i => `${i.time ? `${formatClock(i.time)} ` : ''}${clean(String(i.what), 80)} (${i.kind})`).join(', ')}`, `Ook gepland vandaag: ${items.slice(0, 12).map(i => `${i.time ? `${formatClock(i.time)} ` : ''}${clean(String(i.what), 80)} (${AGENDA_KIND_NL[i.kind] ?? i.kind})`).join(', ')}`)); }
  }
  const head = say(lang, `Today (${dayText(today)}), from your own records:`, `Vandaag (${dayText(today)}), uit je eigen gegevens:`);
  // Session AL fourth pass (L7-4b; Denver N-025): a habit's own target is shown ("0 of 2 liters"), so the line names what stays out: money.
  const tail = anything ? say(lang, 'Titles, times and habit targets, no money amounts; each item opens where it lives.', 'Titels, tijden en gewoontedoelen, geen geldbedragen; elk item opent waar het staat.') : say(lang, 'Nothing else is due today in your records.', 'Verder staat er vandaag niets in je gegevens.');
  return {kind: 'answer', text: [head, ...lines.map(l => `• ${l}`), tail].join('\n'), calls};
}

function sleepAnswer(env: ToolEnv, info: NovaEnvInfo, lang: Lang, lastNight: boolean): LocalReply {
  if (!env.health || !env.areas.health) return {kind: 'refusal', text: novaHealthClosed(info, lang), calls: []};
  if (lastNight) {
    const r = run('sleep_nights', {range: 'today'}, env);
    if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
    const night = ((dataOf(r.result).nights ?? []) as Data[]).at(-1);
    return {kind: 'answer', text: night ? `Afgelopen nacht: ${night.asleep} geslapen, ${night.inBed} in bed, van ${night.bedtime} tot ${night.wake}. Cijfers uit je gelogde nacht; geen medisch advies.` : 'Voor afgelopen nacht is geen nacht gelogd, dus dat is onbekend (niet nul).', calls: [r.record]};
  }
  const r = run('sleep_summary', {}, env);
  if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
  const d = dataOf(r.result), week = d.last7Days as Data | string | undefined;
  if (!week || typeof week === 'string' || !week.nightsLogged) return {kind: 'answer', text: say(lang, 'No night is logged in the last 7 days, so your sleep there is unknown (not zero).', 'Er is de afgelopen 7 dagen geen nacht gelogd, dus je slaap is daar onbekend (niet nul).'), calls: [r.record]};
  const goal = d.yourGoal && d.yourGoal !== 'none set' ? say(lang, `\nYour goal: ${d.yourGoal}.`, `\nJe doel: ${d.yourGoal}.`) : '';
  return {kind: 'answer', text: say(lang,
    `Over the last 7 days: ${plural(week.nightsLogged, 'night')} logged, ${week.averageAsleep} asleep on average, usually from ${week.usualBedtime} to ${week.usualWake}.${goal}\nFigures from your logged nights; not medical advice.`,
    `De afgelopen 7 dagen: ${week.nightsLogged} ${week.nightsLogged === 1 ? 'nacht' : 'nachten'} gelogd, gemiddeld ${week.averageAsleep} geslapen, meestal van ${week.usualBedtime} tot ${week.usualWake}.${goal}\nCijfers uit je gelogde nachten; geen medisch advies.`), calls: [r.record]};
}

function habitsLeftAnswer(env: ToolEnv, lang: Lang): LocalReply {
  const r = run('habits_due', {}, env);
  if (!r.result.ok) return env.areas.habits ? {kind: 'refusal', text: r.result.refusal, calls: [r.record]} : {kind: 'refusal', text: novaAreaClosed('Habits', lang), calls: []};
  const open = (dataOf(r.result).open ?? []) as Data[];
  if (!open.length && !env.habits.habits.length) return {kind: 'answer', text: say(lang, 'No habit is kept yet: Habits → New habit, or ask me to create one.', 'Er is nog geen gewoonte: Habits → New habit, of vraag mij er een te maken.'), calls: [r.record]};
  if (!open.length) return {kind: 'answer', text: say(lang, 'No habit is left today: every habit planned for today is done.', 'Er staat vandaag geen gewoonte meer open: alles wat gepland stond is gedaan.'), calls: [r.record]};
  const row = (x: Data) => `• ${clean(String(x.title), 60)}: ${typeof x.logged === 'number' ? say(lang, `${x.loggedText ?? x.logged} of ${x.target}`, `${x.loggedText ?? x.logged} van ${nlUnits(String(x.target))}`) : x.status === 'partial' ? say(lang, `partly done, target ${x.target}`, `deels gedaan, doel ${nlUnits(String(x.target))}`) : say(lang, `not yet, target ${x.target}`, `nog niet, doel ${nlUnits(String(x.target))}`)}`;
  return {kind: 'answer', text: [say(lang, `${plural(open.length, 'habit')} left today:`, `${open.length} ${open.length === 1 ? 'gewoonte' : 'gewoontes'} nog open vandaag:`), ...open.map(row)].join('\n'), calls: [r.record]};
}

function waterAnswer(env: ToolEnv, info: NovaEnvInfo): LocalReply {
  if (!env.health || !env.areas.health) return {kind: 'refusal', text: novaHealthClosed(info), calls: []};
  const r = run('water', {range: 'today'}, env);
  if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
  const d = dataOf(r.result), total = Number(d.totalMl), target = typeof d.yourDailyTargetMl === 'number' ? d.yourDailyTargetMl : null;
  let unit: 'ml' | 'fl-oz-us' = 'ml'; try { unit = dailyData(env.health).preferences.waterUnit; } catch { unit = 'ml'; }
  // Session AL (Part 13; NOVA review 2 M5): amounts in the words Today and Health use (lib/health-units.ts waterText: "1,000 mL",
  // never "1 L" beside Today's "1,000 mL"), and a day with nothing logged is said so, never "you logged 0 mL".
  const amount = (ml: number) => waterText(ml, unit), none = Number(d.daysWithWater) === 0;
  const had = Number.isFinite(total) ? amount(total) : 'unknown';
  if (!target) return {kind: 'answer', text: `No daily water target is set, so there is no amount to go (it is unknown, not zero). ${none ? `${NO_WATER_TODAY}.` : `Today you logged ${had}.`}`, calls: [r.record]};
  if (none) return {kind: 'answer', text: `${amount(target)} to go today: no water logged yet.`, calls: [r.record]};
  if (total >= target) return {kind: 'answer', text: `Your water target is reached today: ${had} of ${amount(target)}.`, calls: [r.record]};
  return {kind: 'answer', text: `${amount(target - total)} to go today: ${had} of ${amount(target)} logged.`, calls: [r.record]};
}

/** The questions NOVA's welcome offers, each answered by this layer or the engine on NOVA's environment (tested). */
export function novaExampleQuestions(env: ToolEnv): string[] {
  const out = ['What is due today?'];
  if (env.areas.goals && summaries(env).some(g => g.status === 'active')) out.push('How far am I on my goals?');
  if (env.areas.today) out.push('What\'s on my agenda this week?');
  if (env.health && env.areas.health) out.push('How did I sleep this week?');
  if (env.areas.habits && env.habits.habits.length) out.push('How many habits are left today?');
  return out;
}
