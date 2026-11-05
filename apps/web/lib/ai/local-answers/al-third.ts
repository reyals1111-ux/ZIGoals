import {latestHabitRule} from '../../habits';
import {commandText} from '../quick-commands/commands';
import {reviewWindow} from '../../weekly-review/engine';
import type {ToolEnv} from '../tools/env';
import {text as clean} from '../tools/format';
import {runTool} from '../tools/registry';
import type {ToolOk} from '../tools/types';
import type {LocalReply, ToolCallRecord} from './engine';
import {dayText, n, plural} from './words';

/**
 * Session AL third pass (lane L7; P14-B's open findings, Lisbon LA-008/LA-047, P-LA-10/11): three asks the device got
 * wrong with no model.
 * - "How was my week?", "Weekly recap" got the examples list. Now the weekly review's own figures (the `weekly_review`
 *   tool: the same week, stores and switches as Today's weekly review), with the Life review's card for the comparison.
 * - "How many calories in my plate of pasta?" was answered with today's energy total: a question about a food is not a
 *   question about the diary. ZIGi says what the food library holds for it (values per serving, never a guessed plate) and
 *   offers search with the food's name filled in. `isFoodEstimateAsk` keeps the device's lookups out of it, so with a
 *   model connected the person's own AI answers it.
 * - Renaming, moving or taking a planet off the Checklist: the steps on the Checklist's own controls (a card adds one),
 *   instead of a task called "Move Stretch to the morning" or the examples list.
 */
type Lang = 'en' | 'nl';
type Data = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const say = (lang: Lang, en: string, nl: string) => lang === 'nl' ? nl : en;
const block = (action: Record<string, unknown>) => `\n\n\`\`\`zigoals-action\n${JSON.stringify(action)}\n\`\`\``;
const run = (tool: string, args: Record<string, unknown>, env: ToolEnv) => { const result = runTool(tool, args, env); return {result, record: {tool, args, label: result.label} as ToolCallRecord}; };
const norm = (raw: string) => raw.trim().replace(/[’`]/g, '\'').replace(/\s+/g, ' ');
const LEAD = /^(?:(?:hey|hi|hello|ok(?:ay)?|so|zigi|nova|hoi|hallo|please)[,\s]+)*/i;

// ---- food estimates ----
const NUTRIENT = '(calories|calorie|kilocalories|kcal|cals?|energy|protein|carbs?|carbohydrates?|fat|sugars?|fib(?:er|re)|calorie[eë]n|eiwit(?:ten)?|koolhydraten|vet|suikers?|vezels)';
const FOOD_EN = new RegExp(`^(?:roughly |about |approximately )?(?:how (?:many|much) ${NUTRIENT}(?: roughly| approximately| about)? (?:are |is |would be |do |does )?(?:there )?(?:roughly |approximately |about )?(?:in|on) (.+?)|${NUTRIENT} (?:in|of|for) (.+?))(?: (?:have|contain|has|got))?$`, 'i');
const FOOD_NL = new RegExp(`^(?:hoeveel ${NUTRIENT} (?:zitten|zit|zijn|is) (?:er )?(?:ongeveer |zo'?n )?(?:in|op) (.+?)|hoeveel ${NUTRIENT} (?:heeft|bevat) (.+?)|${NUTRIENT} (?:in|van) (.+?))(?: (?:ongeveer|zo ongeveer))?$`, 'i');
/** Words that make it a question about the person's own diary (a meal, a day), which the lookups answer. */
const DIARY = /\b(?:today|tonight|yesterday|this (?:week|month|morning)|last (?:week|night|month)|so far|my (?:breakfast|lunch|dinner|supper|meals?|snacks?|diary|day|food log)|(?:breakfast|lunch|dinner|supper|meals?|snacks?)(?! of)\b|what i (?:ate|had|eat|logged)|i (?:ate|had|eaten|logged)|logged|vandaag|gisteren|deze week|vorige week|mijn (?:ontbijt|lunch|avondeten|maaltijden?|dagboek)|(?:ontbijt|lunch|avondeten|diner)(?! van)\b|wat ik (?:at|gegeten|had))\b/i;
const CONTAINER = /^(?:(?:a|an|one|my|the|this|that|some|een|mijn|de|het|dit|dat|wat)\s+)?(?:(?:big|small|large|typical|normal|average|grote?|kleine?|gewone?)\s+)?(?:(?:plate|bowl|serving|portion|cup|slice|piece|glass|handful|can|bottle|bar|spoon(?:ful)?|tablespoon|teaspoon|scoop|bord|kom|portie|kopje|plak|stuk|glas|handje|blikje|fles|reep|lepel)s?\s+(?:of\s+|met\s+|van\s+)?)?/i;
// A count or a weight before the food ("200g rice"; the spoken form turns "a banana" into "1 banana").
const AMOUNT = /^(?:\d+(?:[.,]\d+)?\s*(?:(?:g|gr|grams?|gram|kg|ml|l|oz|ounces?|lb)\b)?\s*(?:of\s+|van\s+)?)/i;
/** The food a nutrient question names ("how many calories in my plate of pasta" → "pasta"), or null. */
export function foodEstimateFood(raw: string): string | null {
  const q = norm(raw).replace(LEAD, '').replace(/[?.!]+$/, '').trim();
  if (!q || q.length > 140 || DIARY.test(q)) return null;
  const m = FOOD_EN.exec(q) ?? FOOD_NL.exec(q);
  if (!m) return null;
  const said = (m.slice(1).filter((v, i) => i % 2 === 1 && v !== undefined)[0] ?? '').trim();
  let food = said;
  for (let i = 0; i < 2; i++) food = food.replace(AMOUNT, '').replace(CONTAINER, '').trim();
  food = food.replace(/\s+(?:roughly|approximately|about|ongeveer)$/i, '').trim();
  // A food is a few words of letters; a photo, a label or a barcode has its own card (p14b.ts, scan-food).
  if (!food || food.length > 50 || food.split(' ').length > 5 || !/^[\p{L}][\p{L}'’ -]*$/u.test(food)) return null;
  if (/\b(?:photo|picture|image|label|barcode|foto|etiket|streepjescode|it|that|this|dat|dit)\b/i.test(food)) return null;
  return food;
}
/** A question about how much a food holds: the device's diary lookups stay out of it. */
export const isFoodEstimateAsk = (raw: string): boolean => foodEstimateFood(raw) !== null;
const known = (v: unknown) => (typeof v === 'number' || typeof v === 'string') && !/unknown/.test(String(v)) ? String(v) : null;
const perServing = (f: Data, lang: Lang) => {
  const kcal = known(f.kcal), protein = known(f.protein_g), carbs = known(f.carbs_g), fat = known(f.fat_g);
  const g = (v: string) => /\bg$/.test(v) ? v : `${v} g`;
  const parts = [kcal && `${kcal} kcal`, protein && `${g(protein)} ${say(lang, 'protein', 'eiwit')}`, carbs && `${g(carbs)} ${say(lang, 'carbohydrates', 'koolhydraten')}`, fat && `${g(fat)} ${say(lang, 'fat', 'vet')}`].filter(Boolean);
  return parts.length ? parts.join(', ') : say(lang, 'values unknown', 'waarden onbekend');
};
/** P14-B: "How many calories in my plate of pasta?" with no model: the food library's values, and search filled in. */
export function foodEstimateReply(text: string, env: ToolEnv | null, lang: Lang): LocalReply | null {
  const food = foodEstimateFood(text);
  if (!food) return null;
  const calls: ToolCallRecord[] = [];
  let hits: Data[] = [];
  if (env?.health) {
    const r = run('search_foods', {query: food}, env); calls.push(r.record);
    if (r.result.ok) hits = (((r.result as ToolOk).data as Data).foods ?? []) as Data[];
  }
  const shown = hits.slice(0, 3).map(f => `• ${clean(String(f.name), 60)}${f.brand ? ` (${clean(String(f.brand), 40)})` : ''}: ${perServing(f, lang)} ${say(lang, 'per serving', 'per portie')}${f.serving ? ` (${f.serving})` : ''}`);
  const card = block({kind: 'open-search', query: food});
  if (shown.length) return {kind: 'answer', calls, text: [
    say(lang, `Foods in your library that match “${food}”, per serving (not today's total):`, `Voedingsmiddelen in je bibliotheek bij “${food}”, per portie (niet je totaal van vandaag):`), ...shown,
    say(lang, `How much is on your plate decides the total: pick the amount when you log it. Search below has “${food}” filled in; nothing is logged until you add it.`,
      `Hoeveel er op je bord ligt bepaalt het totaal: kies de hoeveelheid als je het logt. Zoeken hieronder heeft “${food}” al ingevuld; er wordt niets gelogd tot je het toevoegt.`),
  ].join('\n') + card};
  const why = env && !env.health ? say(lang, ' Health isn’t shared with ZIGi here, so your food library was not read.', ' Health wordt hier niet met ZIGi gedeeld, dus je voedingsbibliotheek is niet gelezen.') : '';
  return {kind: 'answer', calls, text: say(lang,
    `That is a question about a food, not about today's total. ZIGoals estimates it from the food library: search “${food}” below (it is filled in), or look it up by name in Health → Diary → Scan or look up a food barcode; pick the amount and the entry shows its calories before you log it. Nothing is logged until you add it.${why}`,
    `Dat is een vraag over een voedingsmiddel, niet over je totaal van vandaag. ZIGoals schat het uit de voedingsbibliotheek: zoek hieronder op “${food}” (het staat er al), of zoek het op naam op in Health → Diary → Scan or look up a food barcode; kies de hoeveelheid en het item toont de calorieën voordat je het logt. Er wordt niets gelogd tot je het toevoegt.${why}`) + card};
}

// ---- the week ----
const WEEK_EN = /^(?:how (?:was|is|did|has|went) (?:my|the|this) week(?: been| go| going| gone)?|how(?:'s| has) my week (?:been|going|gone)|(?:give me |show me |tell me |what(?:'s| is) )?(?:my |a |the |this )?(?:weekly|week'?s?|week) (?:recap|summary|roundup|round-up|wrap-?up|in review)|(?:recap|summari[sz]e|sum up|wrap up|review) (?:my|the|this|last) week|my week in review|what did i (?:do|get done) this week)(?: so far)?(?: for me)?$/i;
const WEEK_NL = /^(?:hoe (?:was|is|ging|gaat|verliep) (?:mijn|m'n|deze|de) week(?: tot nu toe)?|(?:geef me |toon )?(?:mijn |een |de )?week ?(?:samenvatting|recap)|vat (?:mijn|deze|de) week samen|wat heb ik deze week gedaan)$/i;
const isWeekAsk = (raw: string) => { const q = norm(raw).replace(LEAD, '').replace(/[?.!]+$/, '').replace(/\s+please$/i, '').trim(); return WEEK_EN.test(q) || WEEK_NL.test(q); };
/** The weekly review's health lines in Dutch (the engine words them in English). */
const nlHealth = (line: string) => line.replace(/^(\d+) days? with meals logged$/, (_, d: string) => `${d} ${d === '1' ? 'dag' : 'dagen'} met maaltijden gelogd`).replace(/ steps · /, ' stappen · ').replace(/ min movement$/, ' min beweging').replace(/^(\d+) days? with water$/, (_, d: string) => `${d} ${d === '1' ? 'dag' : 'dagen'} met water`).replace(/^latest weight (.+) on (.+)$/, 'laatste gewicht $1 op $2');
/** P14-B: "How was my week?", "Weekly recap" with no model: the weekly review's figures, then the Life review to compare. */
export function weeklyRecapReply(text: string, env: ToolEnv | null, lang: Lang): LocalReply | null {
  if (!isWeekAsk(text)) return null;
  const card = block({kind: 'open-review', period: 'week'});
  if (!env) return null;
  const r = run('weekly_review', {}, env);
  if (!r.result.ok) return {kind: 'answer', calls: [r.record], text: `${r.result.refusal} ${say(lang, 'The Life review shows the week from your records too.', 'Het Life review toont de week ook uit je gegevens.')}` + card};
  const d = (r.result as ToolOk).data as Data, year = env.habitDay.slice(0, 4);
  const w = env.weekly ? reviewWindow(env.weekly.weekday, env.habitDay) : null;
  const head = w ? say(lang, `Your week, ${dayText(w.weekStart, year)} to ${dayText(w.weekEnd, year)} (your weekly review's week), from your records on this device:`, `Je week, ${dayText(w.weekStart, year)} tot ${dayText(w.weekEnd, year)} (de week van je weekoverzicht), uit je gegevens op dit apparaat:`)
    : say(lang, 'Your week, from your records on this device:', 'Je week, uit je gegevens op dit apparaat:');
  const lines: string[] = [];
  if (env.areas.habits) {
    const habits = ((d.habits ?? []) as Data[]).filter(h => typeof h.scheduled === 'number' && h.scheduled > 0);
    const each = habits.slice(0, 4).map(h => `${clean(String(h.habit), 40)} ${h.done} ${say(lang, 'of', 'van')} ${h.scheduled}`);
    const more = habits.length > 4 ? say(lang, ` (and ${plural(habits.length - 4, 'more habit')})`, ` (en nog ${habits.length - 4})`) : '';
    lines.push(say(lang, `Habits: ${plural(Number(d.habitCheckIns ?? 0), 'check-in')}`, `Gewoontes: ${n(Number(d.habitCheckIns ?? 0), 0)} check-ins`) + (each.length ? `. ${each.join(', ')}${more}` : ''));
  } else lines.push(say(lang, 'Habits: not shared with ZIGi here (Settings → ZIGi)', 'Gewoontes: hier niet gedeeld met ZIGi (Settings → ZIGi)'));
  // The weekly review words the weight in the person's chosen unit (lib/weekly-review/engine.ts), so it is kept.
  const health = env.health ? (d.health ?? []) as string[] : null;
  if (health === null) lines.push(say(lang, 'Health: not shared with ZIGi here', 'Health: hier niet gedeeld met ZIGi'));
  else if (health.length) lines.push(`Health: ${health.map(l => clean(lang === 'nl' ? nlHealth(l) : l, 80)).join(' · ')}`);
  else lines.push(say(lang, 'Health: nothing recorded', 'Health: niets vastgelegd'));
  if (env.areas.goals) lines.push(say(lang, `Goals: ${plural(Number(d.goalContributions ?? 0), 'contribution')}`, `Doelen: ${n(Number(d.goalContributions ?? 0), 0)} ${Number(d.goalContributions) === 1 ? 'bijdrage' : 'bijdragen'}`));
  if (typeof d.busiestDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.busiestDay)) lines.push(say(lang, `Busiest day: ${dayText(d.busiestDay, year)}`, `Drukste dag: ${dayText(d.busiestDay, year)}`));
  const intention = typeof d.lastIntention === 'string' && d.lastIntention !== 'none written' ? clean(d.lastIntention, 200) : null;
  return {kind: 'answer', calls: [r.record], text: [head, ...lines.map(l => `• ${l}`),
    ...(intention ? [say(lang, `Your intention from last week: “${intention}”`, `Je voornemen van vorige week: “${intention}”`)] : []),
    say(lang, 'Counts from your records, not a judgement. The Life review sets this week beside the one before.', 'Tellingen uit je gegevens, geen oordeel. Het Life review zet deze week naast de vorige.')].join('\n') + card};
}

// ---- the Checklist's own edits ----
const EDIT_EN = /^(?:rename|move|remove|delete|take) (?:the planet (?:that says |called |named )?)?(.{2,60}?)(?: (?:to|into|from|off|out of|on) (?:my |the )?(?:(morning|afternoon|evening|night|anytime)(?: orbit)?|checklist|check list|orbit|path|planets?)(?: orbit)?)?$/i;
const EDIT_NL = /^(?:hernoem|verplaats|verwijder|haal) (.{2,60}?)(?: (?:naar|van|uit|op) (?:mijn |de |m'n )?(?:(ochtend|middag|avond|nacht)(?:baan)?|checklist|lijst|pad|baan))?(?: weg| af)?$/i;
/** "Rename/move/remove <item> …" when it names a Checklist item, or a planet, orbit or the Checklist itself. */
function checklistEdit(raw: string, env: ToolEnv | null): {lang: Lang; verb: string} | null {
  const q = norm(raw).replace(LEAD, '').replace(/[.!]+$/, '').trim();
  if (!q || /\?/.test(q) || q.length > 100) return null;
  const said = /\b(?:planets?|orbits?|checklist|check list|my path|on the path)\b|\b(?:to|into) (?:the |my )?(?:morning|afternoon|evening|night)(?: orbit)?$|\b(?:baan|ochtendbaan|avondbaan|lijstje)\b/i.test(q);
  const en = EDIT_EN.exec(q), nl = en ? null : EDIT_NL.exec(q);
  const m = en ?? nl; if (!m) return null;
  // A task, a goal or a habit edit is someone else's ("move the dentist to tomorrow" is the task card's).
  if (/\b(?:tasks?|goals?|habits?|taak|doel|gewoonte|tomorrow|today|morgen|vandaag|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(q)) return null;
  const item = m[1]!.toLowerCase().replace(/^(?:my|the|mijn|de|het)\s+/, '');
  const onPath = env?.checklist && !env.checklist.unreadable ? env.checklist.record.items.some(i => (i.label ?? '').trim().toLowerCase() === item) : false;
  if (!said && !onPath) return null;
  return {lang: en ? 'en' : 'nl', verb: q.split(' ')[0]!.toLowerCase()};
}
const RENAME_EN = /^rename (?:the |my )?(?:habit |planet |item )?(.{2,60}?) (?:to|as|into) (.{1,60})$/i, RENAME_NL = /^hernoem (?:de |mijn )?(?:gewoonte |planeet |item )?(.{2,60}?) (?:naar|tot|in) (.{1,60})$/i;
const STEPS = {
  en: 'ZIGi adds to your Checklist (“Add Water plants to my checklist”) and ticks items off. Renaming an item, moving it to another orbit or taking it off the path is done on the Checklist itself, so the path stays yours: List view → the item’s More → Rename, Move to another orbit or Take off the path (with Undo); or Edit the path.',
  nl: 'ZIGi zet dingen op je Checklist (“zet planten water geven op mijn lijst”) en vinkt ze af. Een item hernoemen, naar een andere baan verplaatsen of van het pad halen doe je op de Checklist zelf, zodat het pad van jou blijft: List view → More bij het item → Rename, Move to another orbit of Take off the path (met Undo); of Edit the path.',
} as const;
/** "Rename Drink water to Hydrate": a habit of that name gets the edit card; a Checklist item, the Checklist's steps. */
function renameReply(raw: string, env: ToolEnv | null): LocalReply | null {
  const q = norm(raw).replace(LEAD, '').replace(/[.!]+$/, '').trim();
  const en = RENAME_EN.exec(q), m = en ?? RENAME_NL.exec(q);
  if (!m || /\?/.test(q)) return null;
  const lang: Lang = en ? 'en' : 'nl', from = m[1]!.trim(), to = m[2]!.trim().replace(/^["“'‘]|["”'’]$/g, '');
  if (!to || to.length > 60) return null;
  const habit = env?.areas.habits ? env.habits.habits.find(h => h.title.trim().toLowerCase() === from.toLowerCase()) : undefined;
  if (habit) return {kind: 'answer', calls: [], text: say(lang, `Rename the habit ${clean(habit.title, 60)} to ${clean(to, 60)}: its check-ins and streak stay. Add it below when it looks right; nothing is written before.`,
    `De gewoonte ${clean(habit.title, 60)} hernoemen naar ${clean(to, 60)}: de check-ins en de reeks blijven. Voeg het hieronder toe als het klopt; er wordt niets opgeslagen voordat je dat doet.`) + block({kind: 'edit-habit', habit: habit.title, title: to})};
  const onPath = env?.checklist && !env.checklist.unreadable ? env.checklist.record.items.some(i => (i.label ?? '').trim().toLowerCase() === from.toLowerCase()) : false;
  if (onPath || /\b(?:planet|item|planeet)\b/i.test(q)) return {kind: 'answer', calls: [], text: STEPS[lang] + block({kind: 'open-page', page: 'checklist'})};
  return {kind: 'answer', calls: [], text: say(lang, `Nothing called “${clean(from, 60)}” is among your habits or on your Checklist here. A habit is renamed on Habits (the habit → Edit); a Checklist item on the Checklist (List view → More → Rename).`,
    `Niets met de naam “${clean(from, 60)}” staat hier bij je gewoontes of op je Checklist. Een gewoonte hernoem je op Habits (de gewoonte → Edit); een Checklist-item op de Checklist (List view → More → Rename).`)};
}
/** P-LA-11 (LA-008): the Checklist's own controls for a rename, a move or taking an item off; a card adds one. */
export function checklistEditReply(text: string, env: ToolEnv | null): LocalReply | null {
  const renamed = renameReply(text, env); if (renamed) return renamed;
  const hit = checklistEdit(text, env);
  if (!hit) return null;
  return {kind: 'answer', calls: [], text: STEPS[hit.lang] + block({kind: 'open-page', page: 'checklist'})};
}

// ---- "Add it?" for a check-off of something that is not there (P-LA-10, LA-039: "mark push-ups done" on a fresh path) ----
const TICK = /^(?:mark (.{2,60}?) (?:as )?(?:done|complete|completed|finished)|(?:tick|check|cross) off (.{2,60})|(?:tick) (.{2,60}?)(?: (?:as )?done)?|vink (.{2,60}?) af|markeer (.{2,60}?) als (?:gedaan|klaar|af))(?: for today| today| voor vandaag| vandaag)?$/;
/**
 * With no model, a check-off that names nothing on today's path or among the habits offers to add it to the Checklist
 * (one card, nothing written before Add). The quick commands themselves stay as pinned (an unknown name is null there, so
 * a connected model decides); this runs only on the no-model path, after the task and log readings had nothing.
 */
export function unknownTickReply(text: string, env: ToolEnv | null): LocalReply | null {
  if (!env || /\?/.test(text)) return null;
  const t = commandText(text), m = TICK.exec(t);
  if (!m) return null;
  const lang: Lang = /^(?:vink|markeer)\b/.test(t) ? 'nl' : 'en';
  const item = (m.slice(1).find(v => v !== undefined) ?? '').replace(/^(?:my|the|mijn|de|het|m'n)\s+/, '').trim();
  if (!item || item.length > 60 || /\d/.test(item) || /^(?:it|that|this|all|everything|every ?thing|alles|allemaal)$/.test(item) || /\b(?:goals?|tasks?|habits?|doel|taak|gewoonte|and|en)\b/.test(item)) return null;
  const key = item.toLowerCase(), named = (label: string | undefined) => (label ?? '').trim().toLowerCase() === key;
  const onPath = env.checklist && !env.checklist.unreadable ? env.checklist.record.items.some(i => named(i.label)) : false;
  const habit = env.areas.habits && env.habits.habits.some(h => latestHabitRule(h).state === 'active' && h.title.toLowerCase().includes(key));
  const task = (env.nova?.tasks?.tasks ?? []).some(x => String(x.title ?? '').toLowerCase().includes(key));
  if (onPath || habit || task) return null;
  const words = item.charAt(0).toUpperCase() + item.slice(1);
  return {kind: 'answer', calls: [], text: say(lang, `Nothing called “${clean(words, 60)}” is on today’s path or among your habits, so there is nothing to tick yet. Add it to your Checklist? Add it below when it looks right; nothing is written before.`,
    `Niets met de naam “${clean(words, 60)}” staat op het pad van vandaag of bij je gewoontes, dus er is nog niets af te vinken. Op je Checklist zetten? Voeg het hieronder toe als het klopt; er wordt niets opgeslagen voordat je dat doet.`) + block({kind: 'checklist-add-custom', text: clean(words, 60)})};
}
