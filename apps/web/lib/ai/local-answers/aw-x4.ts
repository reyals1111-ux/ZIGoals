import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, isQuestion, list, MIXED, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';
import {text as clean} from '../tools/format';
import {earliestRecord, yearReport, yearWindow} from '../../life-review/year';
import {canRepeat, repeatRows, type GoalRepeat, type RepeatEvery} from '../../goals/repeat';
import {unitWord} from '../../goals/goal-units';
import {formatNumber, formatMonth, formatDate} from '../../visual-format';
import {monthIn, nlDate} from './exact/period';

/**
 * Session AW (X4, Strides; LEDGER #446, #447): NOVA's and ZIGi's on-device answers to "how did my year go" (the Life
 * review's "This year", lib/life-review/year.ts) and "how many times did I reach my weekly reading goal" (a goal that
 * starts again, lib/goals/repeat.ts), in English and Dutch, from the same pure functions the pages show. Counts only, never
 * a grade; habits behind the Habits switch, goals behind the Goals switch. A question with an action in it is left alone.
 * Wired into engine.ts beside the AV lane 2 answers; the repeat record comes from this device (`extra.repeat`).
 */
export type AwX4Extra = {repeat?: GoalRepeat | null};
export function awX4Answer(question: string, env: ToolEnv, extra: AwX4Extra = {}): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    return yearAnswer(a) ?? reachedAnswer(a, extra.repeat ?? null);
  } catch { return null; }
}
const OPEN_REVIEW = [{tool: 'life_facts', args: {}, label: 'Life review'}];
const goalsShut = (a: Asked): LocalReply | null => a.env.areas.goals === false ? {kind: 'refusal', text: 'Goals isn’t shared with ZIGi here — its switch is off in Settings → ZIGi · your companion.', calls: []} : null;

/** "how did my year go", "how was my year so far", "hoe ging mijn jaar", "hoe was mijn jaar tot nu toe" (LEDGER #446). */
function yearAnswer(a: Asked): LocalReply | null {
  const en = /\bhow (?:did|was|has|is) my (?:whole )?year\b|\bhow did (?:this|the) year go\b|\bmy year so far\b|\bhow (?:has|was) (?:this|the) year been\b/.test(a.f);
  const nl = /\bhoe (?:ging|was|is|verliep) mijn (?:hele )?jaar\b|\bhoe (?:ging|was|verliep) (?:dit|het) jaar\b|\bmijn jaar tot nu toe\b|\bjaaroverzicht\b/.test(a.f);
  // "How was my year for money" is the money year's question (av2-money-year), never this one.
  if ((!en && !nl) || /\b(?:money|spend\w*|spent|budget|income|wealth|geld|uitgaven|uitgegeven|budget|inkomen|vermogen)\b/.test(a.f)) return null;
  const lang = a.lang, habitsOff = closed(a.env, 'habits'), goalsOff = goalsShut(a);
  if (habitsOff && goalsOff) return habitsOff;
  const habits = habitsOff ? [] : a.env.habits.habits, goals = goalsOff ? [] : a.env.platform.goals;
  const window = yearWindow({kind: 'year', year: Number(a.today.slice(0, 4))}, a.today, earliestRecord(habits, goals));
  const report = yearReport({window, habits, platform: goalsOff ? {...a.env.platform, goals: []} : a.env.platform, today: a.today, habitAreas: {}, goalAreas: {}, areas: []});
  const where = say(lang, 'Life review → This year shows it by life area.', 'Life review → This year toont het per levensgebied.');
  if (!report.habits.length && !report.goals.length) return answer(say(lang, `Nothing to count for ${window.start.slice(0, 4)} yet. Check in a habit or follow a goal; Life review \u2192 This year then counts each one by life area.`, `Nog niets te tellen voor ${window.start.slice(0, 4)}. Vink een gewoonte af of volg een doel; Life review \u2192 This year telt dan elk ervan per levensgebied.`), OPEN_REVIEW);
  const lines: string[] = [say(lang, `Your ${window.start.slice(0, 4)} so far (1 January to today), from your own records:`, `Je ${window.start.slice(0, 4)} tot nu toe (1 januari tot vandaag), uit je eigen gegevens:`)];
  if (report.habits.length) {
    lines.push(say(lang, `• Habits: ${formatNumber(report.totals.done)} of ${formatNumber(report.totals.due)} check-ins done.`, `• Gewoontes: ${formatNumber(report.totals.done)} van ${formatNumber(report.totals.due)} check-ins gedaan.`));
    const runs = [...report.habits].filter(h => h.longest > 1).sort((x, y) => y.longest - x.longest).slice(0, 3);
    if (runs.length) lines.push(say(lang, `• Longest runs: ${list(runs.map(h => `“${clean(h.title, 60)}” ${formatNumber(h.longest)} ${runUnit('en', h.unit, h.longest)}`), 'en')}.`, `• Langste reeksen: ${list(runs.map(h => `“${clean(h.title, 60)}” ${formatNumber(h.longest)} ${runUnit('nl', h.unit, h.longest)}`), 'nl')}.`));
  }
  if (report.goals.length) {
    const shown = report.goals.slice(0, 4).map(g => `“${clean(g.name, 60)}” ${pointText(lang, g.start)} → ${pointText(lang, g.end)}`);
    lines.push(say(lang, `• Goals, start → now of their target: ${list(shown, 'en')}${report.goals.length > 4 ? `, and ${report.goals.length - 4} more` : ''}.`, `• Doelen, begin → nu van hun doel: ${list(shown, 'nl')}${report.goals.length > 4 ? `, en nog ${report.goals.length - 4}` : ''}.`));
  }
  lines.push(say(lang, `Counts only, never a grade. ${where}`, `Alleen tellingen, nooit een cijfer. ${where}`));
  return answer(lines.join('\n'), OPEN_REVIEW);
}
const runUnit = (lang: Lang, unit: string, n: number) => {
  const en: Record<string, [string, string]> = {days: ['day', 'days'], weeks: ['week', 'weeks'], months: ['month', 'months'], years: ['year', 'years']};
  const nl: Record<string, [string, string]> = {days: ['dag', 'dagen'], weeks: ['week', 'weken'], months: ['maand', 'maanden'], years: ['jaar', 'jaar']};
  return (lang === 'nl' ? nl : en)[unit]![n === 1 ? 0 : 1];
};
const pointText = (lang: Lang, p: number | 'new' | null) => p === null ? say(lang, 'not recorded', 'niet vastgelegd') : p === 'new' ? say(lang, 'new this year', 'nieuw dit jaar') : `${p}%`;

const EVERY_EN: Record<RepeatEvery, [string, string]> = {week: ['week', 'weeks'], month: ['month', 'months'], year: ['year', 'years']};
const EVERY_NL: Record<RepeatEvery, [string, string]> = {week: ['week', 'weken'], month: ['maand', 'maanden'], year: ['jaar', 'jaar']};
/** Dutch stems of common goal words, to find "Read 2 books a week" from "mijn leesdoel". */
const NL_STEMS: Record<string, string> = {lees: 'read', boek: 'book', loop: 'run', hard: 'run', wandel: 'walk', schrijf: 'writ', sport: 'work', train: 'train', medit: 'medit', zwem: 'swim', fiets: 'cycl'};
/** The question's own words that name no goal (the period, the asking). */
const STOP = new Set(['week', 'mont', 'year', 'goal', 'doel', 'many', 'time', 'reac', 'ofte', 'have', 'weke', 'maan', 'jaar', 'geha', 'bere', 'beha', 'hoev', 'vaak', 'mijn', 'each', 'elke', 'keer', 'made', 'achi']);
function goalWords(name: string): string[] { return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z]+/).filter(w => w.length >= 4).map(w => { const stem = Object.keys(NL_STEMS).find(x => w.startsWith(x)); return (stem ? NL_STEMS[stem]! : w).slice(0, 4); }); }
/**
 * "how many times did I reach my weekly reading goal", "how often have I hit my monthly goal", "hoe vaak heb ik mijn
 * wekelijkse leesdoel gehaald" (LEDGER #447): the periods a repeating goal was reached, of those finished, and this one.
 */
function reachedAnswer(a: Asked, repeat: GoalRepeat | null): LocalReply | null {
  const en = /\bhow (?:many times|often) (?:did|have|has) i (?:reach|reached|hit|made|make|met|meet|achieved|achieve)\b/.test(a.f) && /\bgoals?\b|\b(?:weekly|monthly|yearly|each week|each month)\b/.test(a.f);
  const nl = /\bhoe (?:vaak|veel keer|veel keren) (?:heb|had) ik\b/.test(a.f) && /\b(?:gehaald|bereikt|behaald)\b/.test(a.f) && /doel/.test(a.f);
  if (!en && !nl) return null;
  const lang = a.lang, shut = goalsShut(a); if (shut) return shut;
  const every: RepeatEvery | null = /\b(?:weekly|each week|a week|per week|wekelijkse?|per week|elke week)\b/.test(a.f) ? 'week' : /\b(?:monthly|each month|a month|per month|maandelijkse?|per maand|elke maand)\b/.test(a.f) ? 'month' : /\b(?:yearly|each year|a year|per year|jaarlijkse?|per jaar|elk jaar)\b/.test(a.f) ? 'year' : null;
  const how = say(lang, 'On a count goal of your own unit (books, pages) or a project, its page → Starts again chooses each week, month or year; each period’s result is then kept as a row.', 'Op een telling in je eigen eenheid (boeken, pagina’s) of een project kies je op de pagina van het doel → Starts again: elke week, maand of jaar; het resultaat van elke periode blijft dan als rij bewaard.');
  const goals = a.env.platform.goals.filter(g => g.status !== 'closed' && canRepeat(g) && repeat?.goals[g.id] && (!every || repeat.goals[g.id]!.every === every));
  if (!goals.length) return answer(say(lang, `None of your goals starts again${every ? ` each ${every}` : ''} yet, so there are no periods to count. ${how}`, `Nog geen van je doelen begint opnieuw${every ? ` elke ${EVERY_NL[every][0]}` : ''}, dus er zijn geen periodes om te tellen. ${how}`));
  const words = new Set(a.f.split(' ').flatMap(w => { const stem = Object.keys(NL_STEMS).find(s => w.startsWith(s)); return stem ? [NL_STEMS[stem]!.slice(0, 4)] : w.length >= 4 && !STOP.has(w.slice(0, 4)) ? [w.slice(0, 4)] : []; }));
  const named = goals.filter(g => goalWords(g.name).some(w => words.has(w)));
  const goal = named.length === 1 ? named[0]! : goals.length === 1 ? goals[0]! : null;
  if (!goal) return answer(say(lang, `More than one goal starts again: ${list(goals.slice(0, 5).map(g => `“${clean(g.name, 60)}”`), 'en')}. Ask about one by its name.`, `Meer dan één doel begint opnieuw: ${list(goals.slice(0, 5).map(g => `“${clean(g.name, 60)}”`), 'nl')}. Vraag naar één bij zijn naam.`));
  const entry = repeat!.goals[goal.id]!, rows = repeatRows(a.env.platform, goal, entry, a.today), now = rows.at(-1)!, earlier = rows.slice(0, -1), reached = earlier.filter(r => r.reached).length;
  const unit = goal.type === 'PROJECT' ? say(lang, 'milestones', 'mijlpalen') : unitWord(goal.asset);
  const periods = (n: number) => `${formatNumber(n)} ${(lang === 'nl' ? EVERY_NL : EVERY_EN)[entry.every][n === 1 ? 0 : 1]}`;
  const name = (key: string) => { const [kind, v] = key.split(':') as [string, string]; return kind === 'month' ? (lang === 'nl' ? monthIn('nl', v) : formatMonth(`${v}-15T12:00:00Z`, {timeZone: 'UTC'})) : kind === 'week' ? say(lang, `week of ${formatDate(v)}`, `week van ${nlDate(v, a.today)}`) : v; };
  const row = earlier.slice(-4).map(r => `${name(r.period)} ${formatNumber(r.done)}/${formatNumber(r.of)}`).join(' · ');
  const nowLine = say(lang, `This ${entry.every}: ${formatNumber(now.done)} of ${formatNumber(now.of)} ${unit}${now.reached ? ', reached' : ' so far'}.`, `Deze ${EVERY_NL[entry.every][0]}: ${formatNumber(now.done)} van ${formatNumber(now.of)} ${unit}${now.reached ? ', gehaald' : ' tot nu toe'}.`);
  if (!earlier.length) return answer(say(lang, `“${clean(goal.name, 60)}” started again each ${entry.every} only this ${entry.every}, so no earlier ${entry.every} is finished yet. ${nowLine}`, `“${clean(goal.name, 60)}” begint pas deze ${EVERY_NL[entry.every][0]} elke ${EVERY_NL[entry.every][0]} opnieuw, dus er is nog geen eerdere ${EVERY_NL[entry.every][0]} afgerond. ${nowLine}`));
  return answer(say(lang, `“${clean(goal.name, 60)}”: reached in ${formatNumber(reached)} of ${periods(earlier.length)} (${row}). ${nowLine} Your own count, never a grade.`, `“${clean(goal.name, 60)}”: gehaald in ${formatNumber(reached)} van ${periods(earlier.length)} (${row}). ${nowLine} Je eigen telling, nooit een cijfer.`));
}
