import {parse} from '../quick-add/parse';
import type {QuickAddContext, QuickAddKnown} from '../quick-add/types';

/**
 * Session AI (J10, ZI11, HA5): ONE line for all four modules, several items in it. "30 push-ups, 500 ml water, spent 12
 * euro on lunch" or "2 glazen water en een banaan" is split into items; each becomes one card of a kind ZIGi already
 * knows (water, weight, steps, a night, a habit check-in, an exercise count, a food, a mood, a contribution to a goal,
 * and once the expense log exists, an expense), shown and saved one by one through the same validated path the chat
 * uses (`ProposalList` and the device writes, with the shared plausibility limits). Nothing is written by this module.
 * Works with no AI at all, in English and Dutch. An item it cannot read is named back, never guessed.
 */
export type QuickLogContext = QuickAddContext & {goals: readonly string[]; foods: readonly string[]; expenses?: boolean; now: Date;
  /** Health readable here (false: Health items get no card and say so). */
  health?: boolean};
const HEALTH_KINDS = new Set(['log-water', 'log-weight', 'log-steps', 'log-sleep', 'log-food', 'log-mood', 'counter']);
export type QuickLogItem = {text: string; action: Record<string, unknown> | null; why?: string};
const SPLIT = /\s*(?:[;\n]|,(?!\d)|\s(?:and|en|plus|&|then|dan|also|ook)\s)\s*/i;
const MEAL_WORDS: Record<string, string> = {breakfast: 'Breakfast', ontbijt: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', supper: 'Dinner', diner: 'Dinner', avondeten: 'Dinner', snack: 'Snacks', snacks: 'Snacks', tussendoortje: 'Snacks'};
/** Common foods named in a quick line (the person's own foods are matched too); a name never brings a nutrient value. */
const FOODS = ['banana', 'apple', 'orange', 'pear', 'egg', 'eggs', 'toast', 'bread', 'sandwich', 'salad', 'yoghurt', 'yogurt', 'oatmeal', 'porridge', 'coffee', 'tea', 'pasta', 'rice', 'pizza', 'soup', 'cheese', 'chocolate', 'cookie', 'fries', 'burger', 'muesli', 'cereal', 'smoothie', 'nuts',
  'banaan', 'appel', 'sinaasappel', 'peer', 'ei', 'eieren', 'boterham', 'brood', 'salade', 'yoghurt', 'havermout', 'koffie', 'thee', 'soep', 'kaas', 'chocola', 'koekje', 'friet', 'frietjes', 'patat', 'noten', 'wafel'];
const ATE = /\b(?:ate|eaten|eat|had|having|gegeten|eet|at|gehad)\b/i;
const MOOD = /^(?:mood|stemming|feeling|ik voel me|voel me|felt)\s*(?:is|was|:)?\s*(\d)(?:\s*\/\s*5)?$/i;
const MOOD_WORDS: Record<string, number> = {great: 5, good: 4, okay: 3, ok: 3, meh: 3, bad: 2, awful: 1, geweldig: 5, goed: 4, oké: 3, matig: 3, slecht: 2, rot: 1};
const MONEY = /(?:€\s*|eur(?:o|os)?\s*|\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur(?:o|os)?|euro'?s|dollars?|usd|\$)?/i;
const CONTRIBUTE = /^(?:put|add|saved?|zet|stort|spaar(?:de)?|gespaard)\s+(?:€\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur(?:o|os)?|dollars?|usd)?\s+(?:in|into|to|towards|toward|for|naar|op|in mijn|voor)\s+(?:my\s+|mijn\s+|the\s+|het\s+)?(.+?)$/i;
const SPENT = /\b(?:spent|spend|paid|pay|uitgegeven|betaald|kostte|kocht)\b/i;
const num = (s: string) => Number(s.replace(',', '.'));
const day = (text: string) => /\b(?:yesterday|gisteren)\b/i.test(text) ? 'yesterday' : 'today';
const mealFor = (text: string, now: Date) => { const w = text.toLowerCase().match(/\b(breakfast|ontbijt|lunch|dinner|supper|diner|avondeten|snacks?|tussendoortje)\b/); if (w) return MEAL_WORDS[w[1]!]!; const h = now.getHours(); return h < 11 ? 'Breakfast' : h < 15 ? 'Lunch' : h < 21 ? 'Dinner' : 'Snacks'; };
/** Dutch or English, from a few unmistakable Dutch words (Quick add's own check; no AI module is loaded for it). */
const DUTCH = /\b(?:glazen|glas|gedronken|gegeten|gelezen|gemediteerd|gewandeld|gesport|stappen|minuten|uur|gisteren|vandaag|banaan|appel|eieren|boterham|gewicht|stemming|uitgegeven|en|een|heb|ik)\b/gi;
export const lineLanguage = (line: string): 'en' | 'nl' => (line.match(DUTCH) ?? []).length >= 2 ? 'nl' : 'en';
/** The words of one line, split into items (a decimal comma stays inside its number). */
export function splitItems(line: string): string[] {
  const text = line.trim().replace(/^\/log\s+/i, '');
  return text.split(SPLIT).map(s => s.trim().replace(/^(?:and|en)\s+/i, '').replace(/[.!]+$/, '')).filter(s => s.length > 1);
}
function fromQuickAdd(r: QuickAddKnown): Record<string, unknown> | null {
  switch (r.kind) {
    case 'water': return r.shown.unit === 'glasses' ? {kind: 'log-water', glasses: r.shown.amount, day: r.day} : {kind: 'log-water', millilitres: Math.round(r.millilitres), day: r.day};
    case 'weight': return {kind: 'log-weight', value: r.shown.amount, unit: r.shown.unit, day: r.day};
    case 'steps': return {kind: 'log-steps', steps: r.steps, ...(r.minutes ? {minutes: r.minutes} : {}), day: r.day};
    case 'sleep': return {kind: 'log-sleep', minutes: Math.round(r.minutes), ...(r.wake ? {wake: r.wake} : {}), day: r.day};
    case 'exercise': return {kind: 'counter', counter: r.name, count: Math.round(r.count), day: r.day};
    case 'habit': return {kind: 'check-in', habit: r.title, ...(/^min/.test(r.unit) ? {minutes: r.value} : r.unit === 'done' ? {} : {quantity: r.value, unit: r.unit}), day: r.day};
    case 'activity': return null;
  }
}
function readItem(text: string, ctx: QuickLogContext, lang: 'en' | 'nl'): QuickLogItem {
  const t = text.trim(), lower = t.toLowerCase();
  // A contribution to a goal by its name ("put 50 in Holiday fund", "50 euro naar Holiday fund").
  const c = CONTRIBUTE.exec(t);
  if (c) { const goal = ctx.goals.find(g => g.toLowerCase() === c[2]!.trim().toLowerCase()) ?? ctx.goals.find(g => c[2]!.toLowerCase().includes(g.toLowerCase())); if (goal) return {text: t, action: {kind: 'prefill-contribution', goal, amount: num(c[1]!), day: day(t)}}; }
  // Money spent: an expense card once the expense log exists; until then, said plainly.
  if (SPENT.test(t) || /^(?:€|\$)\s*\d|^\d+(?:[.,]\d{1,2})?\s*(?:€|eur|euro|dollars?)\b/i.test(t)) {
    const m = MONEY.exec(t), amount = m ? num(m[1]!) : NaN;
    if (!ctx.expenses) return {text: t, action: null, why: lang === 'nl' ? 'uitgaven kun je hier nog niet loggen' : 'spending cannot be logged here yet'};
    if (!(amount > 0)) return {text: t, action: null, why: lang === 'nl' ? 'noem het bedrag' : 'say the amount'};
    const what = t.replace(SPENT, ' ').replace(MONEY, ' ').replace(/\b(?:on|for|aan|voor|op|at|bij)\b/gi, ' ').replace(/\s+/g, ' ').trim();
    return {text: t, action: {kind: 'log-expense', amount, currency: /\$|dollar|usd/i.test(t) ? 'USD' : 'EUR', ...(what ? {note: what.slice(0, 80)} : {}), day: day(t)}};
  }
  // A mood ("mood 4", "stemming 3/5", "feeling good").
  const mood = MOOD.exec(lower) ?? (/^(?:feeling|i feel|voel me|ik voel me)\s+(\w+)$/i.exec(lower) && MOOD_WORDS[/(\w+)$/.exec(lower)![1]!] ? [lower, String(MOOD_WORDS[/(\w+)$/.exec(lower)![1]!])] : null);
  if (mood) { const n = Number(mood[1]); if (n >= 1 && n <= 5) return {text: t, action: {kind: 'log-mood', mood: n, day: day(t)}}; }
  // What the Quick-add line already reads (water, weight, steps, a night, a habit, an exercise count).
  for (const locale of lang === 'nl' ? ['nl', 'en'] as const : ['en', 'nl'] as const) {
    const r = parse(t, locale, ctx);
    if (r.kind === 'ambiguous') return {text: t, action: null, why: lang === 'nl' ? `kies: ${r.choices.length} mogelijkheden` : `it could mean ${r.choices.length} things`};
    if (r.kind !== 'unknown' && r.kind !== 'needs-more') { const action = fromQuickAdd(r); if (action) return {text: t, action}; }
    if (r.kind === 'needs-more') return {text: t, action: null, why: r.hint};
  }
  // A food: a meal word, an "ate" verb, one of the person's own foods or a common one. The name only; no nutrients.
  const own = ctx.foods.find(f => lower.includes(f.toLowerCase())), common = FOODS.find(f => new RegExp(`\\b${f}\\b`, 'i').test(lower));
  if (own || common || Object.keys(MEAL_WORDS).some(w => new RegExp(`\\b${w}\\b`).test(lower)) || ATE.test(lower)) {
    const qty = /^(\d+(?:[.,]\d+)?|a|an|one|two|three|een|één|twee|drie)\s+/i.exec(lower), words: Record<string, number> = {a: 1, an: 1, one: 1, two: 2, three: 3, een: 1, één: 1, twee: 2, drie: 3};
    const quantity = qty ? (words[qty[1]!.toLowerCase()] ?? num(qty[1]!)) : 1;
    const name = (own ?? t.replace(/^(?:i\s+)?(?:ate|had|eaten|gegeten|ik heb|at)\s+/i, '').replace(/\b(?:for|as|voor|als)\s+(?:breakfast|lunch|dinner|supper|snack|ontbijt|diner|avondeten|tussendoortje)\b/i, '').replace(/\b(?:breakfast|lunch|dinner|ontbijt|avondeten|gegeten)\b:?/gi, '').replace(/^(\d+(?:[.,]\d+)?|a|an|one|two|three|een|één|twee|drie)\s+/i, '').trim()).slice(0, 100);
    if (name && quantity > 0 && quantity <= 100) return {text: t, action: {kind: 'log-food', name, meal: mealFor(t, ctx.now), quantity, day: day(t)}};
  }
  return {text: t, action: null, why: lang === 'nl' ? 'niet herkend' : 'not understood'};
}
/** The items of one line, each with its card or the reason it has none. */
export function quickLogItems(line: string, ctx: QuickLogContext, lang: 'en' | 'nl' = 'en'): QuickLogItem[] {
  return splitItems(line).slice(0, 10).map(item => readItem(item, ctx, lang)).map(item => ctx.health === false && item.action && HEALTH_KINDS.has(String(item.action.kind)) ? {text: item.text, action: null, why: lang === 'nl' ? 'Gezondheid staat hier uit' : 'Health is off here'} : item);
}
/** A reply with one card per understood item (the chat's own block format) and the items it could not read. */
export function quickLogReply(line: string, ctx: QuickLogContext, lang: 'en' | 'nl' = 'en'): {text: string; cards: number} | null {
  const items = quickLogItems(line, ctx, lang), known = items.filter(i => i.action);
  if (!items.length) return null;
  if (!known.length) return {text: `${lang === 'nl' ? 'Geen kaart' : 'No card'}: ${items.map(m => `“${m.text}” (${m.why})`).join('; ')}.`, cards: 0};
  const missed = items.filter(i => !i.action);
  const head = lang === 'nl' ? `${known.length === 1 ? 'Eén kaart' : `${known.length} kaarten`}: voeg toe wat klopt; er wordt niets opgeslagen voordat je dat doet.` : `${known.length === 1 ? 'One card' : `${known.length} cards`}: add the ones that look right; nothing is written before.`;
  const miss = missed.length ? `\n\n${lang === 'nl' ? 'Niet als kaart' : 'Not a card'}: ${missed.map(m => `“${m.text}” (${m.why})`).join('; ')}.` : '';
  return {text: `${head}${miss}${known.map(k => `\n\n\`\`\`zigoals-action\n${JSON.stringify(k.action)}\n\`\`\``).join('')}`, cards: known.length};
}
