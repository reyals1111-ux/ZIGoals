import {HEALTH_MEALS} from '../../health';
import {dailyData} from '../../health-daily';
import {addLocalDays, localWeekday} from '../../local-date';
import {readDeviceRecord} from '../../device-record';
import {getAppStorage} from '../../showcase-storage';
import {FOOD_PLUS, type FoodPlus} from '../../food-plus/schema';
import {madeOf, starsOf} from '../../food-plus/made';
import {menusOf, menuSize} from '../../food-plus/menus';
import {GROCERY_RECORD, type GroceryRecord} from '../../grocery/schema';
import {pantrySoon, type UseSoonItem} from '../../grocery/use-soon';
import {fold} from './exact/text';
import {text as clean} from '../tools/format';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, count, dayIn, isQuestion, MIXED, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AW (X5, LEDGER #452, #454, #455; Paprika): NOVA's and ZIGi's on-device answers, in English and Dutch, to what
 * round 7's kitchen rows hold — what at home should be used soon (the pantry's use-by days, `zigoals:grocery:v1`
 * `useBy`), when a recipe was last made and how often (its diary entries and the "Made it" days, `zigoals:food-plus:v1`
 * `made`, with the person's stars), and the menu for next week (the meal plans of that week, and the menus kept by
 * name). They read this device's records (`extra`, which the engine reads from the app storage) and the Health journal,
 * only while Health is shared (its three-part gate); an answer never changes anything, and an unknown is never a 0.
 */
export type AwX5Extra = {food?: FoodPlus | null; grocery?: GroceryRecord | null};
type Ask = Asked & {food: FoodPlus | null; grocery: GroceryRecord | null | undefined};
const PLANNER = [{tool: 'meal_plans', args: {}, label: 'Meal planner'}], DIARY = [{tool: 'diary_entries', args: {}, label: 'Food diary'}];
export function readAwX5Extra(): AwX5Extra {
  if (typeof window === 'undefined') return {};
  const one = <T,>(read: () => T): T | null => { try { return read(); } catch { return null; } };
  const storage = (() => { try { return getAppStorage(); } catch { return null; } })();
  if (!storage) return {};
  return {food: one(() => readDeviceRecord(storage, FOOD_PLUS).data), grocery: one(() => { const r = readDeviceRecord(storage, GROCERY_RECORD); return r.unreadable ? null : r.data; })};
}
export function awX5Answer(question: string, env: ToolEnv, extra: AwX5Extra = {}): LocalReply | null {
  try {
    const base = asked(question, env);
    if (!base || MIXED.test(base.f) || !isQuestion(base)) return null;
    // The food record from this device (the engine reads it) or, where a caller carries it, the tools' own source.
    // Session AW (integration): or the assistant's own sources (env.ak), as the other answers read the person's records.
    const ak = env.ak as {foodPlus?: unknown; grocery?: unknown} | null | undefined;
    const a: Ask = {...base, food: extra.food ?? env.foodPlus ?? (ak?.foodPlus as AwX5Extra['food']) ?? null, grocery: extra.grocery !== undefined ? extra.grocery : (ak?.grocery as AwX5Extra['grocery'])};
    for (const one of [useSoonAnswer, lastMadeAnswer, menuAnswer]) { const r = one(a); if (r) return r; }
    return null;
  } catch { return null; }
}
const healthDay = (a: Asked) => a.env.healthDay;
const nameOf = (name: string) => name ? name[0]!.toLocaleUpperCase() + name.slice(1) : name;
const soonLine = (a: Ask, i: UseSoonItem) => {
  const day = healthDay(a), when = dayIn(a.lang, i.day, day), n = clean(nameOf(i.name), 60);
  if (i.days < 0) return `• ${n}: ${say(a.lang, `past its use-by day, ${i.days === -1 ? 'yesterday' : `${-i.days} days ago`}`, `over de datum, ${i.days === -1 ? 'sinds gisteren' : `${-i.days} dagen geleden`}`)}`;
  if (i.days === 0) return `• ${n}: ${say(a.lang, 'use today', 'vandaag opmaken')}`;
  if (i.days === 1) return `• ${n}: ${say(a.lang, 'use by tomorrow', 'uiterlijk morgen')}`;
  return `• ${n}: ${say(a.lang, `use by ${when} (in ${i.days} days)`, `uiterlijk ${when} (over ${i.days} dagen)`)}`;
};
const WHERE_PANTRY = (lang: Lang) => say(lang, 'Set a use-by day in Health → Planner → Grocery list → Already at home.', 'Zet een uiterste datum in Health → Planner → Grocery list → Already at home.');

/** "what's in my pantry that I should use soon", "what should I use up", "wat in mijn voorraad moet ik snel opmaken" (#452). */
function useSoonAnswer(a: Ask): LocalReply | null {
  const en = /\b(?:pantry|at home|in the (?:fridge|cupboard|kitchen))\b.*\b(?:use (?:soon|up|first)|go(?:es|ing)? off|expir\w*|use[ -]?by)\b|\b(?:should|must|need to) i use (?:soon|up|first)\b|\bwhat\b.*\b(?:expir\w*|going off|goes off)\b|\buse soon\b/.test(a.f);
  const nl = /\b(?:voorraad|in huis|thuis|in de (?:koelkast|kast|keuken))\b.*\b(?:snel|binnenkort|eerst)\b.*\bop(?:maken|eten)?\b|\b(?:moet|kan) ik\b.*\b(?:snel|binnenkort|eerst)\b.*\bop(?:maken|eten)\b|\b(?:over de datum|houdbaarheid|tht|uiterste datum)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  if (a.grocery === null) return answer(say(a.lang, 'What is at home can’t be read on this device right now, so I can’t say.', 'Wat je in huis hebt kan nu niet gelezen worden op dit apparaat, dus dat kan ik niet zeggen.'), PLANNER);
  const record = a.grocery ?? {version: 1 as const}, {soon, past, later} = pantrySoon(record, healthDay(a));
  const atHome = Object.keys(record.pantry ?? {}).length;
  if (!soon.length && !past.length) {
    const why = !atHome ? say(a.lang, 'Nothing is marked as at home yet (“I have this” on the grocery list).', 'Er staat nog niets als “in huis” (“I have this” op de boodschappenlijst).')
      : !later.length ? say(a.lang, `${count(atHome, a.lang, ['item is', 'items are'], ['ding staat', 'dingen staan'])} at home, none with a use-by day.`, `${count(atHome, a.lang, ['item is', 'items are'], ['ding staat', 'dingen staan'])} als in huis, geen met een uiterste datum.`)
      : say(a.lang, `Nothing at home reaches its use-by day in the next three days; the next is ${clean(nameOf(later[0]!.name), 60)} on ${dayIn('en', later[0]!.day, healthDay(a))}.`, `Niets in huis bereikt de komende drie dagen zijn uiterste datum; het eerste is ${clean(nameOf(later[0]!.name), 60)} op ${dayIn('nl', later[0]!.day, healthDay(a))}.`);
    return answer([why, later.length ? '' : WHERE_PANTRY(a.lang)].filter(Boolean).join(' '), PLANNER);
  }
  const lines = [...soon, ...past].slice(0, 20).map(i => soonLine(a, i));
  const head = say(a.lang, `From what is at home, use these first (within three days, then past their day):`, `Van wat je in huis hebt, maak deze eerst op (binnen drie dagen, dan over de datum):`);
  const note = say(a.lang, 'From the use-by days you set in Health → Planner → Grocery list; the food itself is yours to check too.', 'Uit de uiterste datums die je zette in Health → Planner → Grocery list; kijk zelf ook naar het eten.');
  return answer([head, ...lines, note].join('\n'), PLANNER);
}

const STOP = new Set('the my a an i last time de het een mijn ik voor laatst keer when did wanneer heb have made make cooked cook gemaakt gekookt showcase example how often many times hoe vaak'.split(' '));
const wordsOf = (s: string) => fold(s).split(' ').filter(w => w.length >= 2 && !STOP.has(w)).map(w => w.replace(/(?<=\w{3})(?:s|es|en)$/, ''));
/** "when did I last make lasagne", "how often have I made the soup", "wanneer heb ik voor het laatst lasagne gemaakt" (#455). */
function lastMadeAnswer(a: Ask): LocalReply | null {
  const en = /\bwhen did i (?:last )?(?:make|cook|bake)\b|\b(?:last time|when) i (?:made|cooked|baked)\b|\bhow (?:often|many times) (?:have|did) i (?:made|make|cooked|cook|baked|bake)\b/.exec(a.f);
  const nl = /\bwanneer (?:heb ik|maakte ik|kookte ik)\b.*\b(?:gemaakt|gekookt|gebakken|maakte|kookte)\b|\bhoe vaak heb ik\b.*\b(?:gemaakt|gekookt|gebakken)\b/.exec(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const health = a.env.health!, asked_ = a.f.replace(/^.*?\b(?:make|made|cook|cooked|bake|baked|heb ik|maakte ik|kookte ik)\b/, '').replace(/\b(?:gemaakt|gekookt|gebakken)\b.*$/, '');
  const want = wordsOf(asked_);
  if (!want.length) return null;
  const scored = health.recipes.map(r => { const have = new Set(wordsOf(r.name)); return {r, hit: want.filter(w => have.has(w) || [...have].some(h => h.startsWith(w) || w.startsWith(h))).length}; }).filter(x => x.hit > 0).sort((x, y) => y.hit - x.hit);
  const typed = clean(asked_.trim(), 60);
  if (!scored.length) return answer(say(a.lang, `No recipe called “${typed}” is in your recipes, so I can’t say when you made it. Save it in Health → Foods & recipes; then the days you log it or tap “Made it” while cooking are counted.`, `Er staat geen recept “${typed}” in je recepten, dus ik weet niet wanneer je het maakte. Bewaar het in Health → Foods & recipes; dan tellen de dagen dat je het logt of tijdens het koken op “Made it” tikt.`), DIARY);
  const r = scored[0]!.r, info = madeOf(health, a.food, r.id, healthDay(a)), stars = starsOf(a.food, r.id), name = clean(r.name, 80);
  const starLine = stars ? say(a.lang, ` Your stars: ${stars} of 5.`, ` Jouw sterren: ${stars} van de 5.`) : '';
  if (!info.last) return answer(say(a.lang, `${name} is not in your food diary yet and was never marked “Made it”.${starLine}`, `${name} staat nog niet in je eetdagboek en is nooit als “Made it” gemarkeerd.${starLine}`), DIARY);
  const when = info.last === healthDay(a) ? say(a.lang, 'today', 'vandaag') : `${say(a.lang, 'on', 'op')} ${dayIn(a.lang, info.last, healthDay(a))}`;
  const times = say(a.lang, info.times === 1 ? 'once' : `${info.times} times`, info.times === 1 ? 'één keer' : `${info.times} keer`);
  return answer(say(a.lang, `You last made ${name} ${when}: ${times} in all, from your food diary and “Made it” in the cooking view.${starLine}`, `Je maakte ${name} voor het laatst ${when}: ${times} in totaal, uit je eetdagboek en “Made it” in de kookweergave.${starLine}`), DIARY);
}

const MEAL_NL: Record<string, string> = {Breakfast: 'ontbijt', Lunch: 'lunch', Dinner: 'avondeten', Snacks: 'tussendoor'};
/** "what's my menu for next week", "what is on the menu this week", "wat is mijn menu voor volgende week" (#454). */
function menuAnswer(a: Ask): LocalReply | null {
  const en = /\bmenus?\b.*\b(?:next|this|coming) week\b|\b(?:next|this|coming) week'?s? menu\b|\bwhat(?:s| is| are)? (?:my )?menus\b|\bwhich menus\b/.test(a.f);
  const nl = /\bmenus?\b.*\b(?:volgende|deze|komende) week\b|\b(?:volgende|deze|komende) week\b.*\bop het menu\b|\bwelke menus?\b|\bmijn menus\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const day = healthDay(a), monday = addLocalDays(day, -((localWeekday(day) + 6) % 7)), thisWeek = /\b(?:this|deze) week\b/.test(a.f), start = thisWeek ? monday : addLocalDays(monday, 7), end = addLocalDays(start, 6);
  const plans = dailyData(a.env.health!).plans.filter(p => p.date >= start && p.date <= end).sort((x, y) => x.date.localeCompare(y.date) || HEALTH_MEALS.indexOf(x.meal) - HEALTH_MEALS.indexOf(y.meal));
  const menus = menusOf(a.food), period = say(a.lang, thisWeek ? 'this week' : 'next week', thisWeek ? 'deze week' : 'volgende week'), span = `${dayIn(a.lang, start, day)} – ${dayIn(a.lang, end, day)}`;
  const kept = menus.length ? say(a.lang, `Menus you kept: ${menus.slice(0, 6).map(m => `${clean(m.name, 40)} (${menuSize(m)})`).join(', ')}. Place one on a week in Health → Planner → Menus.`, `Menu’s die je bewaarde: ${menus.slice(0, 6).map(m => `${clean(m.name, 40)} (${menuSize(m).replace(/meals?/, x => x === 'meal' ? 'maaltijd' : 'maaltijden').replace(/days?/, x => x === 'day' ? 'dag' : 'dagen').replace(' on ', ' op ')})`).join(', ')}. Zet er een op een week in Health → Planner → Menus.`)
    : say(a.lang, 'No menu is kept yet: plan a week you like, then keep it by name in Health → Planner → Menus.', 'Er is nog geen menu bewaard: plan een week die je bevalt en bewaar die met een naam in Health → Planner → Menus.');
  if (!plans.length) return answer([say(a.lang, `Nothing is planned for ${period} yet (${span}).`, `Er is nog niets gepland voor ${period} (${span}).`), kept].join(' '), PLANNER);
  const lines = plans.slice(0, 28).map(p => `• ${dayIn(a.lang, p.date, day)}, ${a.lang === 'nl' ? MEAL_NL[p.meal] ?? p.meal : p.meal.toLowerCase()}: ${clean(p.name, 60)}${p.loggedAt ? say(a.lang, ' (logged)', ' (gelogd)') : ''}`);
  return answer([say(a.lang, `Your menu for ${period} (${span}), from your meal plans:`, `Je menu voor ${period} (${span}), uit je maaltijdplanning:`), ...lines, kept].join('\n'), PLANNER);
}
