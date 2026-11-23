import {scaleNutrition, type HealthDiaryEntry} from '../../health';
import {readDeviceRecord} from '../../device-record';
import {addLocalDays} from '../../local-date';
import {MEAL_WORDS, type MealWords, type MealWordsEntry} from '../../meal-words/schema';
import {getAppStorage} from '../../showcase-storage';
import type {DayRange} from '../tools/range';
import {text as clean} from '../tools/format';
import type {ToolEnv} from '../tools/env';
import {answer, asked, count, MIXED, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';
import {n, nlSpan, span} from './words';

/**
 * Session AV lane 2 (fr-answers; FR-S-2, FR-TJ-3): meals logged in words ("Just describe it", `zigoals:meal-words:v1`,
 * lib/meal-words/schema.ts) are read by NOVA's and ZIGi's on-device answers, so a meal described in words is never
 * answered as "nothing logged". The words have no calories, so they are listed as words and never counted in a total
 * (unknown, never 0). Read only while Health is shared with the answer (the environment holds no Health otherwise), on
 * this device, at the moment of the question; nothing of them is sent anywhere.
 * - "what did I eat …", "wat heb ik … gegeten", "what did I have for dinner …": answered here when the day or week asked
 *   holds a meal in words (the diary's entries beside them); without one, the diary's own answers answer as before.
 * - "which meals did I log …", "welke maaltijden heb ik … gelogd": the diary's entries and the words, always.
 * - calories, energy, kcal for a day or week with a meal in words: the diary's known total, and the words as unknown.
 */
export function readMealWords(): MealWords | null {
  try { return typeof window === 'undefined' ? null : readDeviceRecord(getAppStorage(), MEAL_WORDS).data; } catch { return null; }
}
const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const;
const MEAL_NL: Record<string, string> = {Breakfast: 'Ontbijt', Lunch: 'Lunch', Dinner: 'Avondeten', Snacks: 'Tussendoor'};
const MEAL_ASKED: [RegExp, (typeof MEALS)[number]][] = [[/\b(?:breakfast|ontbijt|ontbeten)\b/, 'Breakfast'], [/\b(?:lunch|geluncht)\b/, 'Lunch'], [/\b(?:dinner|supper|avondeten|diner|avondmaal)\b/, 'Dinner'], [/\b(?:snacks?|tussendoor\w*)\b/, 'Snacks']];
const EAT_EN = /\bwhat (?:did i|have i|do i) (?:eat|ate|eaten|had|have)\b|\bwhat did i have for (?:breakfast|lunch|dinner|supper)\b|\bwhat was (?:my|in my) (?:breakfast|lunch|dinner|food diary)\b|\bwhat (?:is|was) in my food diary\b/;
const EAT_NL = /\bwat (?:heb ik|at ik|hebben we|had ik)\b.*\b(?:gegeten|op|gehad|als (?:ontbijt|lunch|avondeten))\b|\bwat at ik\b|\bwat (?:staat|stond) er in mijn eetdagboek\b/;
// "Which meals did I log", never the saved meals, the meals planned or the readings logged with a meal (their own answers).
const MEALS_LOGGED = /^(?:(?:and|so|ok)\s+)?(?:which|what) meals? (?:did|have) i (?:log|logged|eat|eaten|had)\b|^(?:(?:en|dus)\s+)?welke maaltijden (?:heb ik|had ik)\b(?:\s+\w+){0,3}\s+(?:gelogd|gegeten|ingevoerd|bijgehouden)$/;
const CALORIES = /\b(?:calories|calorie|kcal|calorieen|calorien)\b|\benergy (?:today|yesterday|this week|last week)\b|\bhow much (?:energy|did i eat)\b/;
const NOT_OURS = /\b(?:should|moet|zou|burn\w*|verbrand\w*|active energy|resting energy|target|doel|goal|in an?|in een|in my plate|per (?:100|portie|serving)|recipe|recept|average|gemiddeld|left|over|remaining|nog)\b/;
const WEEKDAYS: [RegExp, number][] = [[/\b(?:sunday|zondag)\b/, 0], [/\b(?:monday|maandag)\b/, 1], [/\b(?:tuesday|dinsdag)\b/, 2], [/\b(?:wednesday|woensdag)\b/, 3], [/\b(?:thursday|donderdag)\b/, 4], [/\b(?:friday|vrijdag)\b/, 5], [/\b(?:saturday|zaterdag)\b/, 6]];
const weekStart = (day: string) => addLocalDays(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));
/** The day or week a question names (the Health day's today by default); null for a period these answers do not read. */
function periodOf(a: Asked): DayRange | null {
  const today = a.env.healthDay, f = a.f;
  if (/\b(?:last week|vorige week)\b/.test(f)) { const from = addLocalDays(weekStart(today), -7); return {from, to: addLocalDays(from, 6), label: 'last week'}; }
  if (/\b(?:this week|deze week|week)\b/.test(f)) return {from: weekStart(today), to: today, label: 'this week'};
  if (/\b(?:yesterday|gisteren|gisteravond)\b/.test(f)) { const d = addLocalDays(today, -1); return {from: d, to: d, label: 'yesterday'}; }
  const wd = WEEKDAYS.find(([re]) => re.test(f));
  if (wd) { const now = new Date(`${today}T12:00:00Z`).getUTCDay(); let back = (now - wd[1] + 7) % 7; if (back === 0 && /\b(?:last|vorige)\b/.test(f)) back = 7; const d = addLocalDays(today, -back); return {from: d, to: d, label: d === today ? 'today' : d === addLocalDays(today, -1) ? 'yesterday' : d}; }
  if (/\b(?:month|maand|year|jaar|days|dagen|since|sinds)\b/.test(f)) return null;
  return {from: today, to: today, label: 'today'};
}
const inRange = (date: string, r: DayRange) => date >= r.from && date <= r.to;
const mealOrder = (m: string) => MEALS.indexOf(m as (typeof MEALS)[number]);
const mealName = (m: string, lang: Lang) => lang === 'nl' ? MEAL_NL[m] ?? m : m;
const when = (r: DayRange, a: Asked) => a.lang === 'nl' ? nlSpan(r, a.env.healthDay) : span(r, a.env.healthDay);
const capital = (s: string) => `${s[0]!.toUpperCase()}${s.slice(1)}`;
const dayOf = (iso: string, a: Asked) => a.lang === 'nl' ? nlSpan({from: iso, to: iso, label: iso}, a.env.healthDay).replace(/^op /, '') : span({from: iso, to: iso, label: iso}, a.env.healthDay).replace(/^on /, '');
const CALLS = [{tool: 'diary_entries', args: {}, label: 'Food diary'}];

export function mealWordsAnswer(question: string, env: ToolEnv, record: MealWords | null = readMealWords()): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !env.health) return null;
    const eat = EAT_EN.test(a.f) || EAT_NL.test(a.f), logged = MEALS_LOGGED.test(a.f), calories = CALORIES.test(a.f) && !NOT_OURS.test(a.f);
    if (!(eat || logged || calories)) return null;
    const range = periodOf(a);
    if (!range) return null;
    const meal = MEAL_ASKED.find(([re]) => re.test(a.f))?.[1];
    const words = (record?.entries ?? []).filter(e => inRange(e.date, range) && (!meal || e.meal === meal)).sort((x, y) => x.date.localeCompare(y.date) || mealOrder(x.meal) - mealOrder(y.meal) || x.at.localeCompare(y.at));
    // Without a meal in words, every question but "which meals did I log" keeps the diary's own answers, word for word.
    if (!words.length && !logged) return null;
    const diary = env.health.diary.filter(d => inRange(d.date, range) && (!meal || d.meal === meal)).sort((x, y) => x.date.localeCompare(y.date) || mealOrder(x.meal) - mealOrder(y.meal) || x.createdAt.localeCompare(y.createdAt));
    return calories && !eat && !logged ? caloriesAnswer(a, range, diary, words) : listAnswer(a, range, diary, words);
  } catch { return null; }
}
function wordsTail(lang: Lang, words: readonly MealWordsEntry[]): string {
  if (!words.length) return '';
  return lang === 'nl' ? ' Een maaltijd in woorden heeft geen calorieën, dus die telt in geen totaal mee (onbekend, nooit 0); “Find these foods” bij de maaltijd in Health maakt er voedingsmiddelen met calorieën van.'
    : ' A meal in words has no calories, so it is in no total (unknown, never 0); “Find these foods” beside it in Health turns it into foods with calories.';
}
function listAnswer(a: Asked, range: DayRange, diary: readonly HealthDiaryEntry[], words: readonly MealWordsEntry[]): LocalReply {
  const lang = a.lang, many = range.from !== range.to, period = when(range, a);
  if (!diary.length && !words.length) return answer(lang === 'nl' ? `Er staat ${period} niets in je eetdagboek, ook geen maaltijd in woorden.` : `Nothing is in your food diary ${period}, and no meal in words either.`, CALLS);
  const at = (date: string) => many ? `${dayOf(date, a)} · ` : '';
  const rows = [
    ...diary.map(d => ({date: d.date, meal: d.meal, line: (() => { const q = d.quantityMilli / 1000, kcal = scaleNutrition(d.snapshot.nutrients, d.quantityMilli).kcal; return `- ${at(d.date)}${mealName(d.meal, lang)}: ${clean(d.snapshot.name, 60)} (${n(q, 2)} ${lang === 'nl' ? (q === 1 ? 'portie' : 'porties') : (q === 1 ? 'serving' : 'servings')}${kcal !== null && kcal !== undefined ? `, ${n(Math.round(kcal), 0)} kcal` : ''})`; })()})),
    ...words.map(w => ({date: w.date, meal: w.meal, line: `- ${at(w.date)}${mealName(w.meal, lang)}, ${lang === 'nl' ? 'in woorden' : 'in words'}: “${clean(w.words, 120)}” (${lang === 'nl' ? 'calorieën onbekend' : 'calories unknown'})`})),
  ].sort((x, y) => x.date.localeCompare(y.date) || mealOrder(x.meal) - mealOrder(y.meal));
  const parts = [diary.length ? count(diary.length, lang, ['diary entry', 'diary entries'], ['regel in je eetdagboek', 'regels in je eetdagboek']) : '', words.length ? count(words.length, lang, ['meal in words', 'meals in words'], ['maaltijd in woorden', 'maaltijden in woorden']) : ''].filter(Boolean).join(lang === 'nl' ? ' en ' : ' and ');
  const head = lang === 'nl' ? `${capital(period)} logde je ${parts}:` : `${capital(period)} you logged ${parts}:`;
  return answer([head, ...rows.slice(0, 30).map(r => r.line)].join('\n') + (words.length ? `\n${wordsTail(lang, words).trim()}` : ''), CALLS);
}
function caloriesAnswer(a: Asked, range: DayRange, diary: readonly HealthDiaryEntry[], words: readonly MealWordsEntry[]): LocalReply {
  const lang = a.lang, period = when(range, a);
  const kcals = diary.map(d => scaleNutrition(d.snapshot.nutrients, d.quantityMilli).kcal), known = kcals.filter((k): k is number => typeof k === 'number'), unknown = kcals.length - known.length;
  const said = words.map(w => `${mealName(w.meal, lang)}: “${clean(w.words, 60)}”`).join('; ');
  const wordsPart = count(words.length, lang, ['meal in words', 'meals in words'], ['maaltijd in woorden', 'maaltijden in woorden']);
  if (!diary.length) return answer(lang === 'nl'
    ? `Je calorieën ${period} zijn onbekend: je logde ${wordsPart} (${said}), en woorden hebben geen calorieën, dus er is niets geteld (onbekend, nooit 0). “Find these foods” bij de maaltijd in Health maakt er voedingsmiddelen met calorieën van.`
    : `Your calories ${period} are unknown: you logged ${wordsPart} (${said}), and words have no calories, so nothing is counted (unknown, never 0). “Find these foods” beside the meal in Health turns it into foods with calories.`, CALLS);
  const total = n(Math.round(known.reduce((s, k) => s + k, 0)), 0), entries = count(diary.length, lang, ['diary entry', 'diary entries'], ['regel in je eetdagboek', 'regels in je eetdagboek']);
  const gap = unknown ? (lang === 'nl' ? ` (${unknown} daarvan zonder calorieën)` : ` (${unknown} of them without calories)`) : '';
  return answer(lang === 'nl'
    ? `Energie ${period}: ${total} kcal bekend uit ${entries}${gap}, plus ${wordsPart} zonder calorieën (${said}), die niet meetelt: het echte totaal is hoger en onbekend.`
    : `Energy ${period}: ${total} kcal known from ${entries}${gap}, plus ${wordsPart} without calories (${said}), not counted: the true total is higher and unknown.`, CALLS);
}
