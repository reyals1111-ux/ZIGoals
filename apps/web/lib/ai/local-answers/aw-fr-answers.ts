import {scaleNutrition, type HealthDiaryEntry} from '../../health';
import {addLocalDays} from '../../local-date';
import type {MealWords, MealWordsEntry} from '../../meal-words/schema';
import type {DayRange} from '../tools/range';
import {text as clean} from '../tools/format';
import {novaEnvInfo, novaHealthClosed, zigiHealthClosedText} from './nova-env';
import type {ToolEnv} from '../tools/env';
import {answer, asked, count, MIXED, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';
import {readMealWords} from './fr-meal-words';
import {dayText, n, nlDayText, nlSpan, span} from './words';

/**
 * Session AW (fr-answers; the fresh-eyes persona walks, FRIEND_READINESS-aw rows FR-AW-5 and FR-AW-17): two food diary
 * questions NOVA and ZIGi answered wrongly on the device, answered here from the diary (`health.diary`) and this device's
 * meals in words (`zigoals:meal-words:v1`, lib/meal-words/schema.ts), read only while Health is shared with the answer.
 * - FR-AW-5, "what was my average calories this week", "gemiddeld hoeveel kcal per dag": a day that holds a meal in words
 *   or an entry without calories has an unknown total, so it is left out of the average and named with its reason
 *   (unknown is never 0, and never a complete day). Only when the period holds such a day: otherwise the diary's own
 *   average answers stand, word for word.
 * - FR-AW-17, "am I eating healthy", "eet ik gezond": what the food diary holds (entries per meal, the foods logged most,
 *   meals in words, the energy of the complete days), with no judgement and no diet or medical advice.
 */
const CALORIES = /\b(?:calories|calorie|kcal|calorieen|calorien|energy|energie)\b/;
const AVERAGE = /\b(?:average|avg|mean|on average|gemiddeld|gemiddelde|gemiddelden)\b/;
// Burned is the activity's answer (aw-kcal.ts); a target, a food's own figures and a plan are the diary's other answers.
const NOT_AVERAGE = /\b(?:burn\w*|verbrand\w*|active energy|resting energy|target|doel|goal|should|moet|zou|in an?|in een|per (?:100|portie|serving)|recipe|recept|plan\w*)\b/;
const HEALTHY_EN = /^(?:(?:so|and|ok|okay|nova|zigi)\s+)?(?:am i|do i|have i been|im|i am|is my|are my)\s+(?:\w+\s+){0,2}?(?:eating|eat|diet|food|meals?|eating habits)\b(?:\s+\w+){0,3}?\s+(?:healthy|healthily|well|right|good|ok|okay|balanced)\b|^(?:(?:so|and)\s+)?how (?:healthy|healthily|well|balanced) (?:am i eating|do i eat|is my (?:diet|food|eating))\b/;
const HEALTHY_NL = /^(?:(?:en|dus|nova|zigi)\s+)?(?:eet ik|ben ik)\s+(?:\w+\s+){0,2}?(?:gezond|goed|gevarieerd|evenwichtig|gezond aan het eten)\b|^(?:(?:en|dus)\s+)?is mijn (?:eten|dieet|voeding|eetpatroon)\s+(?:\w+\s+){0,2}?(?:gezond|goed|gevarieerd|evenwichtig)\b|^(?:(?:en|dus)\s+)?hoe gezond (?:eet ik|is mijn (?:eten|dieet|voeding|eetpatroon))\b/;
const CALLS = [{tool: 'diary_entries', args: {}, label: 'Food diary'}];
const weekStart = (day: string) => addLocalDays(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));
const monthStart = (day: string) => `${day.slice(0, 8)}01`;
/** The period a question names (the last 7 days by default, as the diary's own average answer has it). */
function periodOf(a: Asked, today: string): DayRange {
  const f = a.f;
  if (/\b(?:last week|vorige week)\b/.test(f)) { const from = addLocalDays(weekStart(today), -7); return {from, to: addLocalDays(from, 6), label: 'last week'}; }
  if (/\b(?:this week|deze week)\b/.test(f)) return {from: weekStart(today), to: today, label: 'this week'};
  if (/\b(?:last month|vorige maand)\b/.test(f)) { const end = addLocalDays(monthStart(today), -1); return {from: monthStart(end), to: end, label: 'last month'}; }
  if (/\b(?:this month|deze maand)\b/.test(f)) return {from: monthStart(today), to: today, label: 'this month'};
  if (/\b(?:last|past|afgelopen|laatste) (?:30|dertig) (?:days|dagen)\b/.test(f)) return {from: addLocalDays(today, -29), to: today, label: 'the last 30 days'};
  if (/\b(?:last|past|afgelopen|laatste) (?:14|veertien) (?:days|dagen)\b/.test(f)) return {from: addLocalDays(today, -13), to: today, label: 'the last 14 days'};
  return {from: addLocalDays(today, -6), to: today, label: 'the last 7 days'};
}
type DayState = {date: string; kcal: number | null; entries: number; words: number; unknownEntries: number};
/** Each day of the period that holds a diary entry or a meal in words: its energy when every entry says, else null. */
export function calorieDays(diary: readonly HealthDiaryEntry[], words: readonly MealWordsEntry[], range: DayRange): DayState[] {
  const by = new Map<string, DayState>();
  const at = (date: string) => { let d = by.get(date); if (!d) { d = {date, kcal: 0, entries: 0, words: 0, unknownEntries: 0}; by.set(date, d); } return d; };
  for (const e of diary) {
    if (e.date < range.from || e.date > range.to) continue;
    const d = at(e.date), kcal = scaleNutrition(e.snapshot.nutrients, e.quantityMilli).kcal;
    d.entries += 1;
    if (typeof kcal === 'number' && Number.isFinite(kcal)) { if (d.kcal !== null) d.kcal += kcal; } else { d.unknownEntries += 1; d.kcal = null; }
  }
  for (const w of words) if (w.date >= range.from && w.date <= range.to) { const d = at(w.date); d.words += 1; d.kcal = null; }
  return [...by.values()].sort((x, y) => x.date.localeCompare(y.date));
}
const dayOf = (iso: string, a: Asked) => a.lang === 'nl' ? nlDayText(iso, a.env.healthDay.slice(0, 4)) : dayText(iso, a.env.healthDay.slice(0, 4));
const when = (r: DayRange, a: Asked) => a.lang === 'nl' ? nlSpan(r, a.env.healthDay) : span(r, a.env.healthDay);
const days = (k: number, lang: Lang) => count(k, lang, ['day', 'days'], ['dag', 'dagen']);
function why(d: DayState, a: Asked): string {
  const parts = [d.words ? count(d.words, a.lang, ['meal in words', 'meals in words'], ['maaltijd in woorden', 'maaltijden in woorden']) : '', d.unknownEntries ? count(d.unknownEntries, a.lang, ['entry', 'entries'], ['regel', 'regels']) : ''].filter(Boolean);
  return `${dayOf(d.date, a)} (${parts.join(say(a.lang, ' and ', ' en '))} ${say(a.lang, 'without calories', 'zonder calorieën')})`;
}
function averageAnswer(a: Asked, diary: readonly HealthDiaryEntry[], words: readonly MealWordsEntry[]): LocalReply | null {
  const range = periodOf(a, a.env.healthDay), all = calorieDays(diary, words, range), complete = all.filter(d => d.kcal !== null), left = all.filter(d => d.kcal === null);
  // Every day with entries says its energy: the diary's own average answers stand.
  if (!left.length) return null;
  const lang = a.lang, period = when(range, a), out = left.map(d => why(d, a)).join('; ');
  const findFoods = left.some(d => d.words) ? say(lang, ' “Find these foods” beside a meal in words in Health turns it into foods with calories.', ' “Find these foods” bij een maaltijd in woorden in Health maakt er voedingsmiddelen met calorieën van.') : '';
  if (!complete.length) return answer(say(lang,
    `No day ${period} has a complete calorie total, so there is no average: it is unknown, never 0. Left out: ${out}.${findFoods}`,
    `Geen dag ${period} heeft een volledig calorietotaal, dus er is geen gemiddelde: het is onbekend, nooit 0. Niet meegeteld: ${out}.${findFoods}`), CALLS);
  const mean = complete.reduce((s, d) => s + d.kcal!, 0) / complete.length, counted = complete.map(d => dayOf(d.date, a)).join(', ');
  return answer(say(lang,
    `On average ${n(Math.round(mean), 0)} kcal a day ${period}, over the ${days(complete.length, 'en')} whose entries all say (${counted}). ${days(left.length, 'en')} ${left.length === 1 ? 'is' : 'are'} left out because ${left.length === 1 ? 'its' : 'their'} total is unknown: ${out}.${findFoods}`,
    `Gemiddeld ${n(Math.round(mean), 0)} kcal per dag ${period}, over de ${days(complete.length, 'nl')} waarop alle regels het zeggen (${counted}). ${days(left.length, 'nl')} ${left.length === 1 ? 'telt' : 'tellen'} niet mee, want het totaal is onbekend: ${out}.${findFoods}`), CALLS);
}
const MEAL_NL: Record<string, string> = {Breakfast: 'ontbijt', Lunch: 'lunch', Dinner: 'avondeten', Snacks: 'tussendoor'};
const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const;
function healthyAnswer(a: Asked, diary: readonly HealthDiaryEntry[], words: readonly MealWordsEntry[]): LocalReply {
  const lang = a.lang, range = /\b(?:week|month|maand|days|dagen)\b/.test(a.f) ? periodOf(a, a.env.healthDay) : {from: addLocalDays(a.env.healthDay, -6), to: a.env.healthDay, label: 'the last 7 days'};
  const period = when(range, a), inRange = diary.filter(e => e.date >= range.from && e.date <= range.to), said = words.filter(w => w.date >= range.from && w.date <= range.to);
  const noJudge = say(lang, 'Whether that is healthy is not something I judge, and I give no diet or medical advice; a GP or a dietitian can help with that.', 'Of dat gezond is, beoordeel ik niet, en ik geef geen voedings- of medisch advies; een huisarts of diëtist kan je daarbij helpen.');
  if (!inRange.length && !said.length) return answer(say(lang,
    `Your food diary holds nothing ${period}, so there is nothing to describe yet. Log a meal in Health → Food, or describe it in words, and ask again. ${noJudge}`,
    `Je eetdagboek bevat niets ${period}, dus er valt nog niets te beschrijven. Log een maaltijd in Health → Food, of beschrijf hem in woorden, en vraag het opnieuw. ${noJudge}`), CALLS);
  const dayCount = new Set([...inRange.map(e => e.date), ...said.map(w => w.date)]).size;
  const perMeal = MEALS.map(m => [m, inRange.filter(e => e.meal === m).length + said.filter(w => w.meal === m).length] as const).filter(([, k]) => k > 0).map(([m, k]) => `${lang === 'nl' ? MEAL_NL[m] : m.toLowerCase()} ${n(k, 0)}`).join(', ');
  const foods = new Map<string, number>();
  for (const e of inRange) { const name = clean(e.snapshot.name, 40); foods.set(name, (foods.get(name) ?? 0) + 1); }
  const top = [...foods].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, 3).map(([name, k]) => `${name} (${n(k, 0)})`).join(', ');
  const complete = calorieDays(diary, words, range).filter(d => d.kcal !== null && d.entries > 0);
  const lines = [say(lang, `What your food diary holds ${period}: ${count(inRange.length, 'en', ['entry', 'entries'], ['', ''])}${said.length ? ` and ${count(said.length, 'en', ['meal in words', 'meals in words'], ['', ''])}` : ''} on ${days(dayCount, 'en')}${perMeal ? ` (${perMeal})` : ''}.`,
    `Wat je eetdagboek bevat ${period}: ${count(inRange.length, 'nl', ['', ''], ['regel', 'regels'])}${said.length ? ` en ${count(said.length, 'nl', ['', ''], ['maaltijd in woorden', 'maaltijden in woorden'])}` : ''} op ${days(dayCount, 'nl')}${perMeal ? ` (${perMeal})` : ''}.`)];
  if (top) lines.push(say(lang, `- Logged most: ${top}`, `- Het vaakst gelogd: ${top}`));
  if (complete.length) lines.push(say(lang, `- Energy on the ${days(complete.length, 'en')} whose entries all say: on average ${n(Math.round(complete.reduce((s, d) => s + d.kcal!, 0) / complete.length), 0)} kcal a day`, `- Energie op de ${days(complete.length, 'nl')} waarop alle regels het zeggen: gemiddeld ${n(Math.round(complete.reduce((s, d) => s + d.kcal!, 0) / complete.length), 0)} kcal per dag`));
  if (said.length) lines.push(say(lang, '- A meal in words has no calories, so it is in no total (unknown, never 0)', '- Een maaltijd in woorden heeft geen calorieën, dus die telt in geen totaal mee (onbekend, nooit 0)'));
  lines.push(noJudge);
  return answer(lines.join('\n'), CALLS);
}
/** The food diary's answers above, or null for any other question (the layers after answer it). */
export function awFrAnswer(question: string, env: ToolEnv, record: MealWords | null = readMealWords()): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f)) return null;
    const average = CALORIES.test(a.f) && AVERAGE.test(a.f) && !NOT_AVERAGE.test(a.f), healthy = HEALTHY_EN.test(a.f) || HEALTHY_NL.test(a.f);
    if (!average && !healthy) return null;
    // Health closed: the one refusal every Health answer gives, in the question's language ("Eet ik gezond?" holds one Dutch
    // function word, so the engine's own reading would say it in English): NOVA's words on NOVA, ZIGi's with its one button.
    if (!env.health) {
      if (!healthy) return null;
      const nova = novaEnvInfo(env);
      return {kind: 'refusal', text: nova ? novaHealthClosed(nova, a.lang) : zigiHealthClosedText(env, a.lang), calls: []};
    }
    const words = record?.entries ?? [];
    return healthy ? healthyAnswer(a, env.health.diary, words) : averageAnswer(a, env.health.diary, words);
  } catch { return null; }
}
