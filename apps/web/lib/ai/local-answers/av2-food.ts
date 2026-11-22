import {formatNutrient} from '../../health';
import {healthZone, dailyData} from '../../health-daily';
import {readDeviceRecord} from '../../device-record';
import {FOOD_PLUS, type FoodPlus} from '../../food-plus/schema';
import {DAY_PARTS, dayTimeline, eatingWindow, nutrientTiming, share, type DayPartKey, type TimingKey} from '../../food-plus/times';
import {addLocalDays} from '../../local-date';
import {text as clean} from '../tools/format';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, count, dayIn, hm, list, MIXED, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (food): NOVA's and ZIGi's on-device answers to the questions the lane's food features raise, in
 * English and Dutch, each read from the feature's own pure function (the figures the page shows) and only while Health is
 * shared (its three-part gate, av-words `closed`). Modelled on av-answers.ts / av-life.ts; the lead asks it beside
 * `avAnswer` in engine.ts. `food` is this device's `zigoals:food-plus:v1` record (lib/food-plus/schema.ts), read by the
 * caller with `readFoodSources(storage)`; without it every answer reads as on a device where nothing was changed
 * (an entry's time is the one it was logged at).
 */
export type FoodSources = {food?: FoodPlus | null};
export function readFoodSources(storage: Pick<Storage, 'getItem'>): FoodSources {
  try { return {food: readDeviceRecord(storage, FOOD_PLUS).data}; } catch { return {food: null}; }
}
type Ask = Asked & {food: FoodPlus | null};
export function av2FoodAnswer(question: string, env: ToolEnv, sources: FoodSources = {}): LocalReply | null {
  try {
    const base = asked(question, env);
    if (!base || MIXED.test(base.f)) return null;
    const a: Ask = {...base, food: sources.food ?? null};
    for (const one of HANDLERS) { const r = one(a); if (r) return r; }
    return null;
  } catch { return null; }
}

const MEAL_NL: Record<string, string> = {Breakfast: 'Ontbijt', Lunch: 'Lunch', Dinner: 'Avondeten', Snacks: 'Tussendoor'};
const MEAL_WORDS: Record<string, RegExp> = {Breakfast: /\b(?:breakfast|ontbijt)\b/, Lunch: /\blunch\b/, Dinner: /\b(?:dinner|supper|avondeten|diner|avondmaal)\b/, Snacks: /\b(?:snacks?|tussendoor(?:tjes)?)\b/};
const mealWord = (m: string, lang: Lang) => lang === 'nl' ? MEAL_NL[m] ?? m : m;
const zoneOf = (a: Asked) => healthZone(dailyData(a.env.health!).preferences.timezone);
const dayAsked = (a: Asked) => /\b(?:yesterday|gisteren)\b/.test(a.f) ? addLocalDays(a.env.healthDay, -1) : a.env.healthDay;
const DIARY = [{tool: 'diary_entries', args: {}, label: 'Food diary'}];
/** "today", "yesterday", "on Tue, Nov 17" / "vandaag", "gisteren", "op di 17 nov". */
const onDay = (a: Asked, day: string) => day === a.env.healthDay ? say(a.lang, 'today', 'vandaag') : day === addLocalDays(a.env.healthDay, -1) ? say(a.lang, 'yesterday', 'gisteren') : `${say(a.lang, 'on', 'op')} ${dayIn(a.lang, day, a.today)}`;

// ── Diary times (LEDGER #101) and nutrient timing (#108) ───────────────────────────────────────────────────────────

/** "when did I eat today", "what time did I have lunch", "hoe laat heb ik geluncht", "wanneer at ik vandaag". */
function whenEaten(a: Ask): LocalReply | null {
  const en = /\b(?:when|what time)\b.*\b(?:did i|have i)\b.*\b(?:eat|ate|have|had|log|logged)\b|\bwhat time\b.*\b(?:breakfast|lunch|dinner|snack)/.test(a.f);
  const nl = /\b(?:wanneer|hoe laat)\b.*\b(?:at ik|heb ik|had ik)\b.*\b(?:gegeten|geluncht|ontbeten|gegeten|op|gehad|gelogd)\b|\b(?:wanneer|hoe laat)\b.*\b(?:at|eet) ik\b|\bhoe laat\b.*\b(?:ontbijt|lunch|avondeten)\b/.test(a.f);
  if (!(en || nl) || /\bshould\b|\bmoet ik\b|\bwater\b/.test(a.f)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, day = dayAsked(a), zone = zoneOf(a), meal = Object.keys(MEAL_WORDS).find(m => MEAL_WORDS[m]!.test(a.f));
  const rows = dayTimeline(a.env.health!, a.food, zone, day).filter(r => !meal || r.entry.meal === meal);
  const when = onDay(a, day);
  if (!rows.length) return answer(say(lang, `Nothing${meal ? ` for ${meal.toLowerCase()}` : ''} is in your food diary ${when}.`, `Er staat ${when} ${meal ? `voor ${mealWord(meal, 'nl').toLowerCase()} ` : ''}niets in je eetdagboek.`), DIARY);
  const line = (r: (typeof rows)[number]) => `• ${r.at ? r.at.clock : say(lang, 'no time', 'geen tijd')}: ${clean(r.entry.snapshot.name, 60)} (${mealWord(r.entry.meal, lang)})`;
  const timed = rows.filter(r => r.at).length;
  const head = say(lang, `What you ate ${when}, in order${timed < rows.length ? ` (${rows.length - timed} without a time)` : ''}:`, `Wat je ${when} at, op volgorde${timed < rows.length ? ` (${rows.length - timed} zonder tijd)` : ''}:`);
  const note = say(lang, 'Each time is when the entry was logged, or the time you set in Health → Diary (tap the time on an entry).', 'Elke tijd is wanneer het gelogd werd, of de tijd die je zelf zette in Health → Diary (tik op de tijd bij een item).');
  return answer([head, ...rows.slice(0, 20).map(line), note].join('\n'), DIARY);
}
/** "what is my eating window", "wat is mijn eetvenster vandaag". */
function eatingWindowAnswer(a: Ask): LocalReply | null {
  if (!/\beating window\b|\beetvenster\b|\beet ?raam\b|\bfirst and last meal\b|\beerste en laatste maaltijd\b/.test(a.f)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, day = dayAsked(a), w = eatingWindow(a.env.health!, a.food, zoneOf(a), day), when = onDay(a, day);
  if (!w) return answer(say(lang, `No entry ${when} has a time yet, so there is no eating window. Entries take the time they were logged on their own day; you can set one in Health → Diary.`, `Nog geen item van ${when} heeft een tijd, dus er is geen eetvenster. Items krijgen de tijd waarop ze die dag gelogd werden; je kunt er een zetten in Health → Diary.`), DIARY);
  return answer(say(lang, `Your eating window ${when}: ${w.first} to ${w.last}, ${hm(w.minutes)}. From the times in your food diary; nothing is estimated.`, `Je eetvenster ${when}: ${w.first} tot ${w.last}, ${hm(w.minutes)}. Uit de tijden in je eetdagboek; er wordt niets geschat.`), DIARY);
}
const TIMING_NUTRIENT: [RegExp, TimingKey, string, string, number][] = [
  [/\b(?:protein|eiwit(?:ten)?|proteine)\b/, 'proteinMg', 'protein', 'eiwit', 1000], [/\b(?:carbs?|carbohydrates?|koolhydraten)\b/, 'carbsMg', 'carbs', 'koolhydraten', 1000],
  [/\b(?:fat|fats|vet|vetten)\b/, 'fatMg', 'fat', 'vet', 1000], [/\b(?:fiber|fibre|vezels?)\b/, 'fiberMg', 'fiber', 'vezels', 1000], [/\b(?:calories|kcal|calorieen|calorie)\b/, 'kcal', 'calories', 'calorieën', 1],
];
const PART_WORDS: [RegExp, DayPartKey][] = [[/\b(?:morning|ochtend|s ochtends|smorgens|morgens|breakfast|ontbijt)\b/, 'morning'], [/\b(?:midday|noon|lunchtime|middag|s middags|tussen de middag)\b/, 'midday'], [/\b(?:afternoon|namiddag)\b/, 'afternoon'], [/\b(?:evening|avond|s avonds|avonds)\b/, 'evening'], [/\b(?:late|at night|night|late night|laat|s nachts|nacht)\b/, 'late']];
/** "how much protein do I eat in the morning", "when do I eat most of my carbs", "hoeveel eiwit eet ik 's ochtends". */
function timingAnswer(a: Ask): LocalReply | null {
  const n = TIMING_NUTRIENT.find(([re]) => re.test(a.f));
  if (!n) return null;
  const part = PART_WORDS.find(([re]) => re.test(a.f))?.[1];
  const en = (/\bwhen do i (?:eat|get|have)\b.*\bmost\b/.test(a.f) || (!!part && /\b(?:how much|in the|at)\b/.test(a.f) && /\b(?:eat|get|have|do i)\b/.test(a.f))) || /\b(?:nutrient|protein|carb|calorie) timing\b|\bpart of the day\b/.test(a.f);
  const nl = (/\bwanneer (?:eet|krijg) ik\b.*\b(?:meeste|het meest)\b/.test(a.f) || (!!part && /\bhoeveel\b/.test(a.f) && /\b(?:eet|krijg|neem) ik\b/.test(a.f))) || /\bdeel van de dag\b|\bmomenten van de dag\b/.test(a.f);
  if (!(en || nl) || /\btoday\b|\bvandaag\b/.test(a.f) && !part) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, [, key, enName, nlName, scale] = n, days = /\b30\b|\bmonth\b|\bmaand\b/.test(a.f) ? 30 : 7, t = nutrientTiming(a.env.health!, a.food, zoneOf(a), a.env.healthDay, days);
  const calls = [{tool: 'nutrient_totals', args: {}, label: 'Nutrient timing'}], unit = scale === 1 ? 'kcal' : 'g';
  if (!t.timedEntries || !t.totals[key]) return answer(say(lang, `No entry with a time in the last ${days} days carries ${enName}, so I can’t say when you eat it. Health → Insights → “When you eat” fills in as you log.`, `Geen item met een tijd in de afgelopen ${days} dagen heeft ${nlName}, dus ik kan niet zeggen wanneer je het eet. Health → Insights → “When you eat” vult zich terwijl je logt.`), calls);
  const label = (k: DayPartKey) => { const p = DAY_PARTS.find(x => x.key === k)!; return (lang === 'nl' ? p.nl : p.en).toLowerCase(); };
  const perDay = (v: number) => formatNutrient(Math.round(v / Math.max(1, t.daysWithTimes) / (scale === 1 ? 1 : 100)) * (scale === 1 ? 1 : 100), scale);
  const ranked = [...t.parts].filter(p => p[key] > 0).sort((x, y) => y[key] - x[key]);
  const rows = ranked.map(p => `${label(p.key)} ${share(t, p, key)} %`);
  const named = part ? t.parts.find(p => p.key === part)! : null;
  const lead = named
    ? say(lang, `In the ${label(named.key).split(' (')[0]} you ate ${perDay(named[key])} ${unit} of ${enName} a day on average (${share(t, named, key) ?? 0} % of the timed ${enName}), over the ${t.daysWithTimes} days with times in the last ${days}.`, `In de ${label(named.key).split(' (')[0]} at je gemiddeld ${perDay(named[key])} ${unit} ${nlName} per dag (${share(t, named, key) ?? 0} % van de ${nlName} met een tijd), over de ${t.daysWithTimes} dagen met tijden in de afgelopen ${days}.`)
    : say(lang, `Most of your ${enName} comes in the ${label(ranked[0]!.key).split(' (')[0]}, over the ${t.daysWithTimes} days with times in the last ${days}.`, `Het meeste ${nlName} eet je in de ${label(ranked[0]!.key).split(' (')[0]}, over de ${t.daysWithTimes} dagen met tijden in de afgelopen ${days}.`);
  const tail = say(lang, `By part of the day: ${list(rows, 'en')}.${t.untimedEntries ? ` ${count(t.untimedEntries, 'en', ['entry', 'entries'], ['', ''])} without a time are left out.` : ''} Health → Insights → “When you eat”.`, `Per deel van de dag: ${list(rows, 'nl')}.${t.untimedEntries ? ` ${count(t.untimedEntries, 'nl', ['', ''], ['item', 'items'])} zonder tijd tellen niet mee.` : ''} Health → Insights → “When you eat”.`);
  return answer(`${lead} ${tail}`, calls);
}

const HANDLERS: readonly ((a: Ask) => LocalReply | null)[] = [eatingWindowAnswer, timingAnswer, whenEaten];
export const AV2_FOOD_HANDLER_COUNT = HANDLERS.length;
