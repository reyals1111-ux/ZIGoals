import {formatNutrient, recipeNutrition, scaleNutrition} from '../../health';
import {oracleNutrient} from '../../food-plus/oracle';
import {challengeWeek} from '../../food-plus/challenge';
import {mealWakes} from '../../food-plus/meal-notify';
import {HEALTH_EXTRAS, type HealthExtras} from '../../health-extras';
import {mealRemindersOn} from '../../meal-reminders';
import {coachCheckIn} from '../../health-aa/coach';
import {weightChangeText, weightText} from '../../health-units';
import {RECIPE_BOOK, type BookStyle} from '../../food-plus/recipe-book';
import {fitCandidates, fitPlans} from '../../food-plus/fit-plan';
import {fitsStyle, STYLE_WORDS as EATING_WORDS, type EatingStyle} from '../../food-plus/marks';
import {fold} from './exact/text';
import {dayTargets, sugarAlcoholMg, weekdayOfDay} from '../../food-plus/day-target';
import {netCarbs} from '../../health-aa/macro-mode';
import {healthZone, dailyData} from '../../health-daily';
import {readDeviceRecord} from '../../device-record';
import {FOOD_PLUS, type FoodPlus} from '../../food-plus/schema';
import {DAY_PARTS, dayTimeline, eatingWindow, nutrientTiming, share, type DayPartKey, type TimingKey} from '../../food-plus/times';
import {addLocalDays} from '../../local-date';
import {text as clean} from '../tools/format';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, count, dayIn, hm, list, MIXED, num, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (food): NOVA's and ZIGi's on-device answers to the questions the lane's food features raise, in
 * English and Dutch, each read from the feature's own pure function (the figures the page shows) and only while Health is
 * shared (its three-part gate, av-words `closed`). Modelled on av-answers.ts / av-life.ts; the lead asks it beside
 * `avAnswer` in engine.ts. `food` is this device's `zigoals:food-plus:v1` record (lib/food-plus/schema.ts), read by the
 * caller with `readFoodSources(storage)`; without it every answer reads as on a device where nothing was changed
 * (an entry's time is the one it was logged at).
 */
export type FoodSources = {food?: FoodPlus | null; extras?: HealthExtras | null};
export function readFoodSources(storage: Pick<Storage, 'getItem'>): FoodSources {
  const one = <T,>(read: () => T): T | null => { try { return read(); } catch { return null; } };
  return {food: one(() => readDeviceRecord(storage, FOOD_PLUS).data), extras: one(() => readDeviceRecord(storage, HEALTH_EXTRAS).data)};
}
type Ask = Asked & {food: FoodPlus | null; extras: HealthExtras | null};
export function av2FoodAnswer(question: string, env: ToolEnv, sources: FoodSources = {}): LocalReply | null {
  try {
    const base = asked(question, env);
    if (!base || MIXED.test(base.f)) return null;
    const a: Ask = {...base, food: sources.food ?? null, extras: sources.extras ?? null};
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

// ── Targets by weekday (LEDGER #88, #97, #107) and net carbs ────────────────────────────────────────────────────────

const WEEKDAY_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'], WEEKDAY_NL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const WEEKDAY_SHOW_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const targetLine = (t: {kcal: number | null; proteinMg: number | null; carbsMg: number | null; fatMg: number | null}, lang: Lang) => {
  const parts = [t.kcal !== null ? `${num(t.kcal)} kcal` : null, t.proteinMg !== null ? `${say(lang, 'protein', 'eiwit')} ${num(t.proteinMg / 1000)} g` : null, t.carbsMg !== null ? `${say(lang, 'carbs', 'koolhydraten')} ${num(t.carbsMg / 1000)} g` : null, t.fatMg !== null ? `${say(lang, 'fat', 'vet')} ${num(t.fatMg / 1000)} g` : null].filter(Boolean) as string[];
  return parts.length ? list(parts, lang) : say(lang, 'no target', 'geen doel');
};
/** "what is my calorie target on saturday", "what are my targets by weekday", "wat is mijn doel voor zaterdag". */
function weekdayTargets(a: Ask): LocalReply | null {
  const food = /\b(?:kcal|calories?|macros?|protein|carbs?|fat|nutrition|food|eat|eiwit|koolhydraten|vet|voeding|eten|calorieen|calorie)\b/.test(a.f);
  const perDay = /\b(?:by|per|each|every) (?:weekday|day of the week)\b|\bper weekdag\b|\bper dag van de week\b|\belke weekdag\b/.test(a.f);
  const target = /\btargets?\b|\bstreefwaarden?\b|\bcaloriedoel\b|\bweekdagdoelen\b/.test(a.f) || ((food || perDay) && /\b(?:goals?|budget|doel(?:en)?)\b/.test(a.f));
  if (!target) return null;
  const en = WEEKDAY_EN.findIndex(d => new RegExp(`\\b${d}s?\\b`).test(a.f)), nl = WEEKDAY_NL.findIndex(d => new RegExp(`\\b${d}\\b`).test(a.f));
  const named = en >= 0 ? en : nl;
  const all = /\b(?:by|per|each|every) (?:weekday|day of the week)\b|\bweekday targets?\b|\bper weekdag\b|\bweekdagdoelen\b|\bper dag van de week\b|\belke weekdag\b/.test(a.f);
  const own = a.food?.weekdays ?? {}, has = Object.keys(own).length > 0;
  const todayAsked = /\b(?:today|todays|vandaag)\b/.test(a.f) && has;
  if (named < 0 && !all && !todayAsked) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, base = a.env.health!.targets, calls = [{tool: 'nutrient_totals', args: {}, label: 'Targets'}];
  const dayName = (i: number) => lang === 'nl' ? WEEKDAY_NL[i]! : WEEKDAY_SHOW_EN[i]!;
  const where = say(lang, 'Health → Targets → “Targets by weekday” sets them; a blank field keeps your Targets.', 'Health → Targets → “Targets by weekday” stelt ze in; een leeg veld houdt je gewone doelen.');
  if (all || (!has && named < 0)) {
    if (!has) return answer(say(lang, `No weekday has its own targets, so every day uses your Targets: ${targetLine(base, 'en')}. ${where}`, `Geen weekdag heeft eigen doelen, dus elke dag gebruikt je gewone doelen: ${targetLine(base, 'nl')}. ${where}`), calls);
    const rows = [1, 2, 3, 4, 5, 6, 0].map(i => { const d = dayTargets(base, sampleDay(i), own); return `• ${dayName(i)}: ${targetLine(d, lang)}${d.byWeekday.length ? '' : say(lang, ' (your Targets)', ' (je gewone doelen)')}`; });
    return answer([say(lang, 'Your targets by weekday:', 'Je doelen per weekdag:'), ...rows, where].join('\n'), calls);
  }
  const i = named >= 0 ? named : weekdayOfDay(a.env.healthDay), d = dayTargets(base, sampleDay(i), own);
  const which = named >= 0 ? dayName(i) : say(lang, `today (${WEEKDAY_SHOW_EN[i]})`, `vandaag (${WEEKDAY_NL[i]})`);
  return answer(d.byWeekday.length
    ? say(lang, `Your targets for ${which}: ${targetLine(d, 'en')} — ${WEEKDAY_SHOW_EN[i]}’s own. ${where}`, `Je doelen voor ${which}: ${targetLine(d, 'nl')} — die van ${WEEKDAY_NL[i]} zelf. ${where}`)
    : say(lang, `${which.charAt(0).toUpperCase()}${which.slice(1)} has no targets of its own, so it uses your Targets: ${targetLine(d, 'en')}. ${where}`, `${which.charAt(0).toUpperCase()}${which.slice(1)} heeft geen eigen doelen, dus gebruikt je gewone doelen: ${targetLine(d, 'nl')}. ${where}`), calls);
}
/** A date that falls on weekday `i` (0 Sunday), for dayTargets. */
const sampleDay = (i: number) => addLocalDays('2026-11-22', i);
/** "what are my net carbs today", "hoeveel netto koolhydraten heb ik vandaag": carbs minus fiber and sugar alcohols. */
function netCarbsAnswer(a: Ask): LocalReply | null {
  if (!/\bnet carbs?\b|\bnetto(?:[ -]?koolhydraten)?\b|\bnetto koolhydraten\b/.test(a.f)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, day = dayAsked(a), entries = a.env.health!.diary.filter(e => e.date === day), when = onDay(a, day), calls = [{tool: 'nutrient_totals', args: {}, label: 'Nutrients'}];
  if (!entries.length) return answer(say(lang, `Nothing is logged ${when}, so there are no net carbs to count.`, `Er is ${when} niets gelogd, dus er zijn geen netto koolhydraten te tellen.`), calls);
  const sa = sugarAlcoholMg(entries, a.food?.sugarAlcohols ?? {}), n = netCarbs(entries.map(e => scaleNutrition(e.snapshot.nutrients, e.quantityMilli)), sa);
  if (n.grams === null) return answer(say(lang, `None of ${when}’s entries carries carbs, so net carbs are unknown (never 0).`, `Geen van de items van ${when} heeft koolhydraten, dus netto koolhydraten zijn onbekend (nooit 0).`), calls);
  const minus = [n.net ? say(lang, 'fiber', 'vezels') : null, sa ? say(lang, `${num(sa / 1000)} g sugar alcohols`, `${num(sa / 1000)} g suikeralcoholen`) : null].filter(Boolean) as string[];
  const fiberNote = n.net ? '' : say(lang, ` Fiber is not taken off: ${n.fiberKnownOf} of ${entries.length} entries carry it.`, ` Vezels zijn er niet af gehaald: ${n.fiberKnownOf} van ${entries.length} items hebben ze.`);
  return answer(say(lang, `Net carbs ${when}: ${n.grams} g${minus.length ? ` (carbs minus ${list(minus, 'en')})` : ' (plain carbs)'}.${fiberNote} Sugar alcohols per food: Health → Targets → “Sugar alcohols for net carbs”.`,
    `Netto koolhydraten ${when}: ${n.grams} g${minus.length ? ` (koolhydraten min ${list(minus, 'nl')})` : ' (gewone koolhydraten)'}.${fiberNote} Suikeralcoholen per voedingsmiddel: Health → Targets → “Sugar alcohols for net carbs”.`), calls);
}

// ── The Oracle: protein and the vitamins (LEDGER #100) ─────────────────────────────────────────────────────────────

const ORACLE_WORDS: [RegExp, string][] = [
  [/\b(?:protein|eiwit(?:ten)?|proteine)\b/, 'protein'], [/\bvitamine? ?b ?12\b|\bb12\b/, 'vitamin-b12'], [/\bvitamine? ?b ?6\b/, 'vitamin-b6'],
  [/\bvitamine? ?b ?1\b|\bthiamine?\b/, 'vitamin-b1'], [/\bvitamine? ?b ?2\b|\bribofla(?:vin|vine)\b/, 'vitamin-b2'], [/\bvitamine? ?b ?3\b|\bniacine?\b/, 'vitamin-b3'],
  [/\bvitamine? ?a\b/, 'vitamin-a'], [/\bvitamine? ?c\b/, 'vitamin-c'], [/\bvitamine? ?d\b/, 'vitamin-d'], [/\bvitamine? e\b|\bvitamine$/, 'vitamin-e'], [/\bvitamine? ?k\b/, 'vitamin-k'],
  [/\bfolate\b|\bfolic acid\b|\bfoliumzuur\b/, 'folate'], [/\bmagnesium\b/, 'magnesium'], [/\bzinc\b|\bzink\b/, 'zinc'], [/\bomega ?3\b/, 'omega-3'],
];
/** "which foods are high in protein", "what is rich in vitamin C", "welk eten bevat veel eiwit": own foods for protein; where the Oracle is. */
function oracleAnswer(a: Ask): LocalReply | null {
  const hit = ORACLE_WORDS.find(([re]) => re.test(a.f));
  if (!hit) return null;
  const en = /\b(?:high|rich) in\b|\b(?:most|lots of|a lot of|full of)\b.*\b(?:foods?)\b|\bfoods?\b.*\b(?:most|highest|with)\b|\bwhat (?:has|contains|gives)\b|\bgood source of\b|\bsources? of\b/.test(a.f);
  const nl = /\b(?:veel|rijk aan|hoog in|het meeste|bron van|bevat)\b/.test(a.f) && /\b(?:eten|voedsel|voeding|producten|voedingsmiddelen|welk|welke|wat)\b/.test(a.f);
  if (!(en || nl) || /\b(?:today|vandaag|average|gemiddeld|target|doel)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, nutrient = oracleNutrient(hit[1])!, shown = lang === 'nl' ? nutrient.nl : nutrient.label, name = /^vitamin/i.test(shown) ? `${shown.charAt(0).toLowerCase()}${shown.slice(1)}` : shown.toLowerCase(), calls = [{tool: 'search_foods', args: {}, label: 'Your foods'}];
  const where = say(lang, `The offline food library’s richest foods in ${name}, by a usual portion or per 100 kcal: Health → Insights → “Foods high in a nutrient (the Oracle)”. From public food tables; information, not advice.`,
    `De rijkste voedingsmiddelen uit de offline bibliotheek voor ${name}, per gewone portie of per 100 kcal: Health → Insights → “Foods high in a nutrient (the Oracle)”. Uit openbare voedingstabellen; informatie, geen advies.`);
  if (hit[1] !== 'protein') return answer(where, calls);
  const health = a.env.health!;
  const own = [...health.foods.map(f => ({name: f.name, mg: f.nutrients.proteinMg})), ...health.recipes.map(r => ({name: r.name, mg: recipeNutrition(r).proteinMg}))].filter((f): f is {name: string; mg: number} => typeof f.mg === 'number' && f.mg > 0).sort((x, y) => y.mg - x.mg).slice(0, 6);
  if (!own.length) return answer(`${say(lang, 'None of your own foods carries protein yet.', 'Nog geen van je eigen voedingsmiddelen heeft eiwit.')} ${where}`, calls);
  const rows = own.map(f => `${clean(f.name, 50)} ${num(Math.round(f.mg / 100) / 10)} g ${say(lang, 'per serving', 'per portie')}`);
  return answer(`${say(lang, `Your own foods highest in protein: ${list(rows, 'en')}.`, `Je eigen voedingsmiddelen met het meeste eiwit: ${list(rows, 'nl')}.`)} ${where}`, calls);
}

// ── Meal reminders and the logging challenge (LEDGER #90) ──────────────────────────────────────────────────────────

/** "when are my meal reminders", "welke maaltijdherinneringen heb ik". */
function mealRemindersAnswer(a: Ask): LocalReply | null {
  const en = /\bmeal reminders?\b|\breminders?\b.*\b(?:meals?|breakfast|lunch|dinner)\b|\bremind(?:ed)? to (?:eat|log)\b/.test(a.f), nl = /\bmaaltijdherinnering(?:en)?\b|\bherinnering(?:en)?\b.*\b(?:maaltijd(?:en)?|ontbijt|lunch|avondeten)\b/.test(a.f);
  if (!(en || nl) || /\b(?:set|turn|zet)\b.*\b(?:on|off|aan|uit)\b/.test(a.f) && !/\?$/.test(a.raw)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, wakes = mealWakes(a.extras, a.env.health!, a.env.now), calls = [{tool: 'diary_entries', args: {}, label: 'Meal reminders'}];
  const where = say(lang, 'Health → Diary → “Name your meals and set their times” switches them on; Settings → Notifications → “Meal reminders” sends them to this device too.', 'Health → Diary → “Name your meals and set their times” zet ze aan; Settings → Notifications → “Meal reminders” stuurt ze ook naar dit apparaat.');
  if (!mealRemindersOn(a.extras)) return answer(`${say(lang, 'Meal reminders are off.', 'Maaltijdherinneringen staan uit.')} ${where}`, calls);
  if (!wakes.length) return answer(`${say(lang, 'Meal reminders are on, but no meal has a usual time yet, so none comes.', 'Maaltijdherinneringen staan aan, maar geen maaltijd heeft nog een vaste tijd, dus er komt er geen.')} ${where}`, calls);
  const rows = wakes.map(w => `${clean(w.label, 24)} ${w.time}${w.doneToday ? say(lang, ' (done today)', ' (vandaag klaar)') : ''}`);
  return answer(`${say(lang, `Your meal reminders: ${list(rows, 'en')}. Each comes at its time until that meal is logged that day.`, `Je maaltijdherinneringen: ${list(rows, 'nl')}. Elke komt op zijn tijd tot die maaltijd die dag gelogd is.`)} ${where}`, calls);
}
/** "how is my logging challenge going", "hoe gaat mijn logchallenge". */
function challengeAnswer(a: Ask): LocalReply | null {
  if (!/\b(?:logging|food|diary|log) challenge\b|\bchallenge\b.*\b(?:log|logging|food|diary)\b|\blog ?challenge\b|\b(?:eet|log)uitdaging\b|\buitdaging\b.*\b(?:loggen|eten|eetdagboek)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, w = challengeWeek(a.env.health!, a.food, a.env.healthDay), calls = [{tool: 'diary_entries', args: {}, label: 'Logging challenge'}];
  if (!w) return answer(say(lang, 'No logging challenge is running. Health → Insights → “Weekly logging challenge” sets one: log your food on a number of days a week, Monday to Sunday.', 'Er loopt geen logchallenge. Health → Insights → “Weekly logging challenge” zet er een: je eten loggen op een aantal dagen per week, maandag tot zondag.'), calls);
  const state = w.met ? say(lang, `done for this week: ${w.logged} of ${w.daysPerWeek} days logged`, `klaar voor deze week: ${w.logged} van ${w.daysPerWeek} dagen gelogd`)
    : w.reachable ? say(lang, `${w.logged} of ${w.daysPerWeek} days logged this week, ${w.daysPerWeek - w.logged} more to go`, `${w.logged} van ${w.daysPerWeek} dagen gelogd deze week, nog ${w.daysPerWeek - w.logged} te gaan`)
    : say(lang, `${w.logged} of ${w.daysPerWeek} days logged; this week can’t reach it any more`, `${w.logged} van ${w.daysPerWeek} dagen gelogd; deze week haalt het niet meer`);
  return answer(say(lang, `Your logging challenge (${w.daysPerWeek} days a week): ${state}. ${w.weeksInRow} ${w.weeksInRow === 1 ? 'week' : 'weeks'} met in a row; ${w.weeksMet} of ${w.weeksTotal} since it started.`,
    `Je logchallenge (${w.daysPerWeek} dagen per week): ${state}. ${w.weeksInRow} ${w.weeksInRow === 1 ? 'week' : 'weken'} op rij gehaald; ${w.weeksMet} van ${w.weeksTotal} sinds de start.`), calls);
}

// ── The weekly check-in day, partly logged days and the goal date (LEDGER #106, #107) ──────────────────────────────

const coachOf = (a: Ask) => {
  const health = a.env.health!, unit = dailyData(health).preferences.weightUnit;
  const options = {checkInWeekday: a.food?.checkIn?.weekday ?? null, partialDays: new Set(a.food?.checkIn?.partial ?? []), paceKg: typeof a.food?.pace === 'number' ? a.food.pace : null};
  return {c: coachCheckIn(health, a.env.coach ?? {version: 1}, a.env.healthDay, unit, options), unit};
};
/** "when will I reach my goal weight", "wanneer bereik ik mijn streefgewicht". */
function goalDateAnswer(a: Ask): LocalReply | null {
  const en = /\bwhen\b.*\b(?:reach|hit|get to|be at)\b.*\b(?:goal|target)(?: weight)?\b|\bgoal (?:weight )?(?:date|eta)\b|\bhow long\b.*\b(?:goal|target) weight\b/.test(a.f);
  const nl = /\bwanneer\b.*\b(?:bereik|haal|ben ik op)\b.*\b(?:streefgewicht|doelgewicht|gewichtsdoel|doel)\b|\bhoe lang\b.*\b(?:streefgewicht|doelgewicht)\b/.test(a.f);
  if (!(en || nl) || !/\b(?:weight|gewicht|streefgewicht|doelgewicht|gewichtsdoel|kg|lb)\b/.test(a.f) && !/\bgoal (?:date|eta)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, {c, unit} = coachOf(a), e = c.eta, calls = [{tool: 'weight_trend', args: {}, label: 'Weight trend'}];
  if (!e) return answer(say(lang, 'No goal weight is set, or there is no trend weight yet, so there is no goal date. Health → Targets sets a weight goal; a few weigh-ins give the trend.', 'Er is geen streefgewicht ingesteld, of nog geen trendgewicht, dus er is geen doeldatum. Health → Targets zet een gewichtsdoel; een paar wegingen geven de trend.'), calls);
  // A chosen pace is said as chosen (−0.25 kg), not rounded to the trend's tenth.
  const goal = weightText(e.goalGrams, unit), rate = (grams: number) => `${unit === 'kg' && grams % 100 !== 0 ? `${grams < 0 ? '−' : '+'}${num(Math.abs(grams) / 1000)} kg` : weightChangeText(grams, unit)}/week`;
  if (Math.abs(e.goalGrams - e.latestGrams) < 100) return answer(say(lang, `Your trend weight is at your goal (${goal}).`, `Je trendgewicht is op je doel (${goal}).`), calls);
  const parts: string[] = [];
  if (e.byTrend) parts.push(e.byTrend.date ? say(lang, `at your trend (${rate(e.byTrend.weeklyGrams)}) about ${dayIn('en', e.byTrend.date, a.today)}`, `bij je trend (${rate(e.byTrend.weeklyGrams)}) rond ${dayIn('nl', e.byTrend.date, a.today)}`) : say(lang, `your trend (${rate(e.byTrend.weeklyGrams)}) is moving away from it`, `je trend (${rate(e.byTrend.weeklyGrams)}) gaat er vanaf`));
  else parts.push(say(lang, 'there is no weekly trend yet (readings at least seven days apart)', 'er is nog geen weektrend (wegingen minstens zeven dagen uit elkaar)'));
  if (e.byPace?.chosen) parts.push(e.byPace.date ? say(lang, `at your chosen pace (${rate(e.byPace.weeklyGrams)}) about ${dayIn('en', e.byPace.date, a.today)}`, `bij je gekozen tempo (${rate(e.byPace.weeklyGrams)}) rond ${dayIn('nl', e.byPace.date, a.today)}`) : say(lang, `your chosen pace (${rate(e.byPace.weeklyGrams)}) does not lead there`, `je gekozen tempo (${rate(e.byPace.weeklyGrams)}) leidt er niet heen`));
  return answer(say(lang, `Goal ${goal}: ${parts.join('; ')}. A date from the trend so far, not a promise; Health → Weight → Your coach.`, `Doel ${goal}: ${parts.join('; ')}. Een datum uit de trend tot nu, geen belofte; Health → Weight → Your coach.`), calls);
}
const WEEKDAY_LONG_EN = WEEKDAY_SHOW_EN, WEEKDAY_LONG_NL = WEEKDAY_NL;
/** "when is my check-in", "which days are partly logged", "wanneer is mijn weekcheck". */
function checkInAnswer(a: Ask): LocalReply | null {
  const day = /\bcheck ?-?in (?:day|days)\b|\bwhen is my (?:weekly )?check ?-?in\b|\bcoach check ?-?in\b|\bweekcheck\b|\bincheckdag\b|\bwanneer is mijn (?:wekelijkse )?(?:check ?-?in|weekcheck|incheck)\b/.test(a.f);
  const partial = /\bpartly logged\b|\bpartially logged\b|\bincomplete days?\b|\bgedeeltelijk gelogd\b|\bonvolledige dagen\b/.test(a.f);
  if (!(day || partial)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, {c} = coachOf(a), calls = [{tool: 'coach_check_in', args: {}, label: 'Weekly check-in'}];
  const weekday = lang === 'nl' ? WEEKDAY_LONG_NL[c.checkInWeekday]! : WEEKDAY_LONG_EN[c.checkInWeekday]!;
  const marked = [...(a.food?.checkIn?.partial ?? [])].sort().reverse().slice(0, 8);
  const partLine = marked.length ? say(lang, `Days marked partly logged (left out of the maintenance estimate): ${list(marked.map(d => dayIn('en', d, a.today)), 'en')}.`, `Dagen gemarkeerd als gedeeltelijk gelogd (niet in de onderhoudsschatting): ${list(marked.map(d => dayIn('nl', d, a.today)), 'nl')}.`)
    : say(lang, 'No day is marked partly logged; under the Diary’s meals, “This day is only partly logged” leaves a day out of the estimate.', 'Geen dag is gemarkeerd als gedeeltelijk gelogd; onder de maaltijden in de Diary laat “This day is only partly logged” een dag buiten de schatting.');
  const dayLine = say(lang, `Your weekly check-in day is ${weekday}${c.answered ? `; this week you ${c.answered === 'keep' ? 'kept' : 'adjusted'} your target` : ''}. Change it in Health → Weight → Your coach → Check-in day.`, `Je wekelijkse check-in is op ${weekday}${c.answered ? `; deze week heb je je doel ${c.answered === 'keep' ? 'gehouden' : 'aangepast'}` : ''}. Verander het in Health → Weight → Your coach → Check-in day.`);
  return answer(day && partial ? `${dayLine} ${partLine}` : day ? dayLine : partLine, calls);
}

/** "where are my package photos", "kan ik een foto van de verpakking bewaren": the place; the photos stay unread here. */
function packPhotosAnswer(a: Ask): LocalReply | null {
  if (!/\b(?:package|packaging|pack|label|product) (?:photos?|pictures?)\b|\bphotos? of (?:the |a |my )?(?:package|packaging|pack)\b|\bverpakkingsfoto'?s?\b|\bfoto'?s? van (?:de |een )?verpakking\b/.test(a.f)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  return answer(say(a.lang, 'Package photos are kept with your own foods: Health → Foods & recipes → “Package photos (optional)”. Choose the food, then take or choose a photo of its front; it shows beside the food’s name. The photos stay in this browser only and nothing reads them (not me either), so the name and numbers stay what you typed.',
    'Verpakkingsfoto’s bewaar je bij je eigen voedingsmiddelen: Health → Foods & recipes → “Package photos (optional)”. Kies het voedingsmiddel en maak of kies een foto van de voorkant; die staat naast de naam. De foto’s blijven alleen in deze browser en niets leest ze (ik ook niet), dus naam en getallen blijven wat je typte.'), [{tool: 'search_foods', args: {}, label: 'Your foods'}]);
}

// ── The recipe collection (LEDGER #91) and a recipe's method (LEDGER #200) ─────────────────────────────────────────

const STYLE_WORDS: [RegExp, BookStyle | null][] = [[/\bvegan\b|\bveganistisch\w*\b|\bplantaardig\w*\b/, 'vegan'], [/\bvegetari\w*\b|\bvega\b/, 'vegetarian'], [/\bmediterr?an\w*\b|\bmediterraan\w*\b/, 'mediterranean']];
/** "give me a vegan recipe", "recipe ideas", "geef me een vegetarisch recept": the built-in collection's names. */
function recipeIdeas(a: Ask): LocalReply | null {
  const en = /\brecipes?\b/.test(a.f) && /\b(?:idea|ideas|give me|suggest|show me|any|some|built ?in|collection|to start)\b/.test(a.f), nl = /\brecept(?:en)?\b/.test(a.f) && /\b(?:idee|ideeen|geef|stel|laat|een paar|sommige|ingebouwde|verzameling)\b/.test(a.f);
  if (!(en || nl) || /\b(?:import|my recipes|mijn recepten|save|bewaar)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang: Lang = nl && !en ? 'nl' : en && !nl ? 'en' : a.lang, style = STYLE_WORDS.find(([re]) => re.test(a.f))?.[1] ?? null;
  const rows = RECIPE_BOOK.filter(r => !style || r.styles.includes(style)).slice(0, 8).map(r => `${lang === 'nl' ? r.nl : r.en} (${r.minutes} min)`);
  const where = say(lang, 'Health → Foods & recipes → “Recipes to start from” shows each one’s nutrition from the offline food library, its ingredients and method, and saves it to your recipes in a tap. Information, not advice.', 'Health → Foods & recipes → “Recipes to start from” toont van elk de voedingswaarde uit de offline bibliotheek, de ingrediënten en de bereiding, en bewaart het met één tik bij je recepten. Informatie, geen advies.');
  const which = style ? say(lang, `${style} recipes`, ({vegan: 'veganistische', vegetarian: 'vegetarische', mediterranean: 'mediterrane'} as const)[style] + ' recepten') : say(lang, 'recipes', 'recepten');
  return answer(`${say(lang, `Some ${which} to start from: ${list(rows, 'en')}.`, `Een paar ${which} om mee te beginnen: ${list(rows, 'nl')}.`)} ${where}`, [{tool: 'search_foods', args: {}, label: 'Recipes'}]);
}
/** "how do I make my lentil soup", "what are the steps for …", "hoe maak ik …": the method kept with one of your recipes. */
function recipeMethod(a: Ask): LocalReply | null {
  const en = /\b(?:how do i (?:make|cook|prepare)|steps? for|method for|recipe steps|instructions for)\b/.test(a.f), nl = /\b(?:hoe maak ik|hoe bereid ik|hoe kook ik|bereiding van|stappen voor|stappen van)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, health = a.env.health!, words = a.f.split(' ').filter(w => w.length >= 4 && !/^(?:make|cook|prepare|steps|step|method|recipe|instructions|maak|bereid|kook|bereiding|stappen|mijn|voor)$/.test(w));
  const recipe = [...health.recipes].map(r => ({r, hits: words.filter(w => fold(r.name).includes(w)).length})).filter(x => x.hits).sort((x, y) => y.hits - x.hits)[0]?.r;
  const calls = [{tool: 'search_foods', args: {}, label: 'Your recipes'}];
  if (!recipe) return null;
  const steps = a.food?.steps?.[recipe.id] ?? [];
  if (!steps.length) return answer(say(lang, `“${clean(recipe.name, 60)}” has no method kept yet. In Health → Foods & recipes, “Add the method” beside it keeps one, a step a line; then “Cook” shows it step by step.`, `Bij “${clean(recipe.name, 60)}” is nog geen bereiding bewaard. In Health → Foods & recipes bewaart “Add the method” ernaast er een, een stap per regel; daarna toont “Cook” hem stap voor stap.`), calls);
  return answer([say(lang, `${clean(recipe.name, 60)}, in ${steps.length} ${steps.length === 1 ? 'step' : 'steps'}:`, `${clean(recipe.name, 60)}, in ${steps.length} ${steps.length === 1 ? 'stap' : 'stappen'}:`), ...steps.slice(0, 20).map((s, i) => `${i + 1}. ${clean(s, 300)}`), say(lang, 'Health → Foods & recipes → Cook shows them one at a time.', 'Health → Foods & recipes → Cook toont ze een voor een.')].join('\n'), calls);
}

// ── A day planned from your recipes to fit your targets (LEDGER #89) ───────────────────────────────────────────────

/** "plan my meals for tomorrow to fit my targets", "plan mijn maaltijden voor morgen". */
function fitPlanAnswer(a: Ask): LocalReply | null {
  const en = /\bplan\b.*\b(?:meals?|food|eating|menu)\b|\bmeal plan\b.*\b(?:fit|fits|target|targets|macros|calories)\b|\b(?:meals?|menu)\b.*\bfit(?:s)? my (?:targets?|macros|calories)\b/.test(a.f);
  const nl = /\bplan\b.*\b(?:maaltijden|eten|menu)\b|\bmaaltijdplan\b.*\b(?:doel|doelen|macros|calorieen)\b/.test(a.f);
  if (!(en || nl) || /\b(?:planned|gepland|staan|are|what|which|welke|wat)\b/.test(a.f)) return null;
  // Lead (batch 2): "plan my meals for next week" is a plan request for the person's own AI (engine.test, no-model.test); this
  // answers only the targets-fitting day it builds from your recipes.
  if (!/\b(?:fit|fits|targets?|macros|calories|doel|doelen|calorie(?:en|ën)?)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, day = /\b(?:today|vandaag)\b/.test(a.f) ? a.env.healthDay : addLocalDays(a.env.healthDay, 1), health = a.env.health!;
  const targets = dayTargets(health.targets, day, a.food?.weekdays ?? {}), calls = [{tool: 'meal_plan', args: {}, label: 'Meal plan'}];
  const where = say(lang, 'Health → Planner → “Plan a day that fits my targets” shows it and plans it in a tap (logged only when you eat it).', 'Health → Planner → “Plan a day that fits my targets” toont het en plant het met één tik (pas gelogd als je het eet).');
  if (!targets.kcal) return answer(`${say(lang, 'There is no calorie target to plan toward. Set one in Health → Targets.', 'Er is geen caloriedoel om naartoe te plannen. Zet er een in Health → Targets.')} ${where}`, calls);
  const plan = fitPlans(health, targets, 1)[0];
  if (!plan) return answer(`${say(lang, `A plan needs at least three of your recipes with known calories (${fitCandidates(health).length} so far).`, `Een plan heeft minstens drie van je recepten met bekende calorieën nodig (nu ${fitCandidates(health).length}).`)} ${where}`, calls);
  const rows = plan.picks.map(p => `${mealWord(p.meal, lang)}: ${clean(p.recipe.name, 50)} × ${num(p.portionsMilli / 1000)} (${p.kcal} kcal)`);
  return answer([say(lang, `A day from your recipes for ${dayIn('en', day, a.today)}, ${plan.kcal} kcal against your ${num(targets.kcal)}:`, `Een dag uit je recepten voor ${dayIn('nl', day, a.today)}, ${plan.kcal} kcal tegenover je ${num(targets.kcal)}:`), ...rows.map(r => `• ${r}`), where].join('\n'), calls);
}

// ── Eating style marks (LEDGER #198) ───────────────────────────────────────────────────────────────────────────────

const STYLE_ASKED: [RegExp, EatingStyle][] = [[/\blow ?carb\b|\bkoolhydraatarm\w*\b/, 'low-carb'], [/\bhigh ?protein\b|\beiwitrijk\w*\b/, 'high-protein'], [/\bhigh ?fib(?:re|er)\b|\bvezelrijk\w*\b/, 'high-fibre']];
/** "which of my foods are low carb", "welke van mijn voedingsmiddelen zijn eiwitrijk": the foods that fit, by their own nutrients. */
function styleFoods(a: Ask): LocalReply | null {
  const style = STYLE_ASKED.find(([re]) => re.test(a.f))?.[1];
  if (!style || !/\b(?:my foods?|of my|mijn (?:eten|voedingsmiddelen)|van mijn|which foods|welke voedingsmiddelen|welk eten)\b/.test(a.f) || /\brecipes?\b|\brecept/.test(a.f)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, foods = a.env.health!.foods, fit = foods.filter(f => fitsStyle(f, style) === true), words = EATING_WORDS[style][lang];
  const rule = say(lang, {'low-carb': 'carbs give 10 % of the calories or less', 'high-protein': 'protein gives 25 % of the calories or more', 'high-fibre': '3 g of fibre or more per 100 kcal'}[style], {'low-carb': 'koolhydraten leveren 10 % van de calorieën of minder', 'high-protein': 'eiwit levert 25 % van de calorieën of meer', 'high-fibre': '3 g vezels of meer per 100 kcal'}[style]);
  const where = say(lang, 'Health → Foods & recipes → “Eating style and food marks” marks them in your list. From each food’s own nutrients; not advice.', 'Health → Foods & recipes → “Eating style and food marks” markeert ze in je lijst. Uit de eigen voedingswaarden van elk; geen advies.');
  const names = list(fit.slice(0, 8).map(f => clean(f.name, 50)), lang);
  return answer(say(lang, `Of your ${foods.length} foods, ${fit.length} fit ${words} (${rule})${fit.length ? `: ${names}` : ''}. ${where}`, `Van je ${foods.length} voedingsmiddelen passen er ${fit.length} bij ${words} (${rule})${fit.length ? `: ${names}` : ''}. ${where}`), [{tool: 'search_foods', args: {}, label: 'Your foods'}]);
}

const HANDLERS: readonly ((a: Ask) => LocalReply | null)[] = [styleFoods, fitPlanAnswer, recipeIdeas, recipeMethod, packPhotosAnswer, eatingWindowAnswer, timingAnswer, whenEaten, netCarbsAnswer, weekdayTargets, oracleAnswer, mealRemindersAnswer, challengeAnswer, goalDateAnswer, checkInAnswer];
export const AV2_FOOD_HANDLER_COUNT = HANDLERS.length;
