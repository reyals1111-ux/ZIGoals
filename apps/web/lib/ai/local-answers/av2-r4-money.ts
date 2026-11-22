import type {MoneyEntry, MoneyLog} from '../../money-log/schema';
import {fromCents} from '../../money-log/engine';
import type {MoneyMore} from '../../money-more/schema';
import {formatCurrencyAmount} from '../../visual-format';
import {busiestDays, calendarCurrencies, monthCalendar} from '../../money-insights/month-days';
import {archivedOf, entriesIn} from '../../money-log/category';
import {STARTER_SETS} from '../../money-log/starter-sets';
import {groupsOf} from '../../money-log/groups';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, dayIn, isQuestion, list, MIXED, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2, round 4 (money; Actual Budget, Lunch Money): the on-device answers to round 4's money features, in
 * English and Dutch, each read from the feature's own pure function (the figures its page shows) and only while Wealth is
 * shared. Every spending and income figure comes from Wealth → Spending's own `totals` / `byCategory` and the shared rule
 * in lib/money-log/counted.ts (through each feature's function), so NOVA, ZIGi and the pages say the same amounts. A
 * Dutch answer writes money the Dutch way ("€ 12,50") and its days and months as Dutch words. No money advice: figures
 * and plain words only. The lead wires `av2R4MoneyAnswer` into lib/ai/local-answers/engine.ts before `av2R3MoneyAnswer`;
 * lib/ai/local-answers/av2-r4-money.test.ts proves it claims none of the earlier corpus questions. Null when the question
 * is not one of these.
 */
export function av2R4MoneyAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    for (const one of ANSWERS) { const r = one(a); if (r) return r; }
    return null;
  } catch { return null; }
}
type Answer = (a: Asked) => LocalReply | null;
const ANSWERS: Answer[] = [];
const add = (...more: Answer[]) => { ANSWERS.push(...more); };
/** Money in the answer's language: "€12.50" in English (the display locale), "€ 12,50" in Dutch. */
export const moneyIn = (lang: Lang, cents: number, currency: string) => formatCurrencyAmount(fromCents(cents), currency, lang === 'nl' ? 'nl-NL' : undefined);
const logOf = (env: ToolEnv): MoneyLog | null => env.moneyLog ?? null;
const entriesOf = (env: ToolEnv): readonly MoneyEntry[] => env.moneyLog?.entries ?? [];
export const moreOf = (env: ToolEnv): MoneyMore | null => (env as ToolEnv & {moneyMore?: MoneyMore | null}).moneyMore ?? ((env.ak as {moneyMore?: MoneyMore | null} | null | undefined)?.moneyMore ?? null);
const call = (tool: string, args: Record<string, unknown>, label: string) => [{tool, args, label}];
export const PLACES = {
  spending: {en: 'Wealth → Spending', nl: 'Vermogen → Uitgaven'},
  insights: {en: 'Wealth → Spending → Your money over time', nl: 'Vermogen → Uitgaven → Your money over time'},
  accounts: {en: 'Wealth → Accounts', nl: 'Vermogen → Rekeningen'},
} as const;

// ── A calendar of the month (#338) ─────────────────────────────────────────────────────────────────────────────────
/** "Which day did I spend the most this month", "op welke dag gaf ik deze maand het meest uit". */
function monthDays(a: Asked): LocalReply | null {
  const en = (/\b(?:which|what) days?\b.*\bspen[dt]\b.*\bmost\b|\bspen[dt]\b.*\b(?:each|every|per) day\b|\bspending\b.*\b(?:each|every|per) day\b/.test(a.f) && /\bthis month\b/.test(a.f)) || /\bspending calendar\b|\bcalendar of (?:my|the) (?:month|spending|money)\b/.test(a.f);
  const nl = (/\b(?:welke|op welke) dag(?:en)?\b.*\b(?:meest|meeste)\b|\bper dag\b.*\buit(?:gegeven|gaf|geven)\b|\buit(?:gegeven|gaf)\b.*\bper dag\b/.test(a.f) && /\bdeze maand\b/.test(a.f)) || /\buitgavenkalender\b|\bkalender van (?:mijn|de) (?:maand|uitgaven)\b/.test(a.f);
  if (!(en || nl) || /\b(?:average|on average|gemiddeld|usually|meestal)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const month = a.today.slice(0, 7), entries = entriesOf(a.env), calls = call('money_log', {calendar: month}, 'Spending · a calendar of the month');
  const cals = calendarCurrencies(entries, month).map(c => monthCalendar(entries, month, c, a.today, a.env.moneyLog?.weekStartsOn ?? 'monday')).filter(c => c.days > 0);
  if (!cals.length) return answer(say(a.lang, `Nothing logged this month yet. Each day you log spending or income shows on ${PLACES.insights.en} → A calendar of the month.`,
    `Deze maand is nog niets gelogd. Elke dag dat je uitgaven of inkomsten logt, staat op ${PLACES.insights.nl} → A calendar of the month.`), calls);
  const text = cals.map(cal => {
    const top = (lang: Lang) => busiestDays(cal).map(d => `${dayIn(lang, d.date, a.today)} ${moneyIn(lang, d.spent, cal.currency)}`), spentDays = cal.weeks.flat().filter(d => d.inMonth && d.spent > 0).length;
    return say(a.lang, `This month in ${cal.currency}: ${moneyIn('en', cal.spent, cal.currency)} spent on ${spentDays} ${spentDays === 1 ? 'day' : 'days'}, ${moneyIn('en', cal.received, cal.currency)} received${spentDays ? `; the largest ${spentDays === 1 ? 'day' : 'days'}: ${list(top('en'), 'en')}` : ''}.`,
      `Deze maand in ${cal.currency}: ${moneyIn('nl', cal.spent, cal.currency)} uitgegeven op ${spentDays} ${spentDays === 1 ? 'dag' : 'dagen'}, ${moneyIn('nl', cal.received, cal.currency)} ontvangen${spentDays ? `; de grootste ${spentDays === 1 ? 'dag' : 'dagen'}: ${list(top('nl'), 'nl')}` : ''}.`);
  }).join(' ');
  return answer(`${text} ${say(a.lang, `Each day is on ${PLACES.insights.en} → A calendar of the month; a cost spread over months counts its share each month, as your budgets do.`,
    `Elke dag staat op ${PLACES.insights.nl} → A calendar of the month; een kost verspreid over maanden telt elke maand zijn deel, zoals je budgetten.`)}`, calls);
}
add(monthDays);

// ── Archived categories and starter sets (#342, #347) ──────────────────────────────────────────────────────────────
/** "Which categories have I archived", "welke categorieën heb ik gearchiveerd". */
function archivedCategories(a: Asked): LocalReply | null {
  const en = /\barchived (?:categor(?:y|ies))\b|\bcategor(?:y|ies)\b.*\barchived\b/.test(a.f);
  const nl = /\bgearchiveerde categorie(?:en|n)?\b|\bcategorie(?:en|n)?\b.*\bgearchiveerd\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const log = logOf(a.env), calls = call('money_log', {archived: true}, 'Money log · archived categories');
  const rows = (['expense', 'income'] as const).flatMap(kind => (log ? archivedOf(log, kind) : []).map(name => ({kind, name, n: entriesIn(log?.entries ?? [], kind, name)})));
  if (!rows.length) return answer(say(a.lang, `No category is archived. In ${PLACES.spending.en} → Log spending → Your own categories, "Archive a category" takes one out of the pickers; its entries keep it.`,
    `Er is geen categorie gearchiveerd. In ${PLACES.spending.nl} → Log spending → Your own categories haalt "Archive a category" er een uit de keuzelijsten; je invoer houdt hem.`), calls);
  const item = (lang: Lang, r: typeof rows[number]) => `${r.name}${r.kind === 'income' ? say(lang, ' (money received)', ' (inkomsten)') : ''}${r.n ? say(lang, `, ${r.n} ${r.n === 1 ? 'entry' : 'entries'}`, `, ${r.n} ${r.n === 1 ? 'invoer' : 'invoeren'}`) : ''}`;
  return answer(say(a.lang, `Archived: ${list(rows.map(r => item('en', r)), 'en')}. They are no longer offered in the pickers; their entries keep them, and reports and search still show them. "Bring back" offers one again.`,
    `Gearchiveerd: ${list(rows.map(r => item('nl', r)), 'nl')}. Ze staan niet meer in de keuzelijsten; je invoer houdt ze, en overzichten en zoeken tonen ze nog. "Bring back" maakt er weer een kiesbaar.`), calls);
}
/** "What starter category sets are there", "welke startsets met categorieën zijn er". */
function starterSets(a: Asked): LocalReply | null {
  const en = /\bstarter (?:category )?sets?\b|\bcategory (?:sets?|templates?)\b/.test(a.f);
  const nl = /\bstartsets?\b|\bcategorieset\b|\bcategoriesets\b|\bset (?:met|van) categorie(?:en|n)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const calls = call('money_log', {starterSets: true}, 'Money log · starter sets');
  const sets = (lang: Lang) => STARTER_SETS.map(s => `${s.title[lang].toLowerCase()} (${s.about[lang].replace(/\.$/, '').toLowerCase()})`);
  return answer(say(a.lang, `Four written starter sets: ${list(sets('en'), 'en')}. In ${PLACES.spending.en} → Log spending → Your own categories → Start from a set, see what each adds (in English or Dutch), then add it in one tap; nothing already there is changed.`,
    `Vier geschreven startsets: ${list(sets('nl'), 'nl')}. In ${PLACES.spending.nl} → Log spending → Your own categories → Start from a set zie je wat elke set toevoegt (in het Engels of Nederlands) en voeg je hem in één tik toe; wat er al is, blijft zoals het is.`), calls);
}
add(archivedCategories, starterSets);

// ── Groups of entries (#341) ───────────────────────────────────────────────────────────────────────────────────────
/** "Which groups of entries do I have", "welke groepen heb ik in mijn uitgaven". Totals by Wealth → Spending's `totals`. */
function entryGroups(a: Asked): LocalReply | null {
  const en = /\bgroups? of (?:my )?(?:entries|transactions|spending)\b|\b(?:entry|transaction|spending) groups?\b|\bgrouped (?:entries|transactions)\b/.test(a.f);
  const nl = /\bgroepen? (?:van |in )?(?:mijn )?(?:invoer|uitgaven|transacties|boekingen)\b|\bgegroepeerde (?:invoer|uitgaven|transacties)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const groups = groupsOf(entriesOf(a.env)), calls = call('money_log', {groups: true}, 'Money log · groups');
  if (!groups.length) return answer(say(a.lang, `You have no groups yet. In ${PLACES.spending.en} → Search all your entries, Select two or more entries and "Group" them under a name; they show as one line, and each still counts on its own.`,
    `Je hebt nog geen groepen. In ${PLACES.spending.nl} → Search all your entries kies je met Select twee of meer invoeren en zet je ze met "Group" onder een naam; ze staan dan als één regel, en elke telt nog apart mee.`), calls);
  const one = (lang: Lang, g: typeof groups[number]) => {
    const sums = g.totals.map(t => [t.expenses ? say(lang, `${moneyIn(lang, t.expenses, t.currency)} spent`, `${moneyIn(lang, t.expenses, t.currency)} uitgegeven`) : '', t.income ? say(lang, `${moneyIn(lang, t.income, t.currency)} received`, `${moneyIn(lang, t.income, t.currency)} ontvangen`) : ''].filter(Boolean).join(', ')).filter(Boolean);
    return `${g.name}: ${g.entries.length} ${say(lang, g.entries.length === 1 ? 'entry' : 'entries', g.entries.length === 1 ? 'invoer' : 'invoeren')}${sums.length ? `, ${sums.join('; ')}` : ''} (${dayIn(lang, g.from, a.today)}${g.to !== g.from ? ` – ${dayIn(lang, g.to, a.today)}` : ''})`;
  };
  return answer(say(a.lang, `${groups.slice(0, 5).map(g => one('en', g)).join('. ')}.${groups.length > 5 ? ` And ${groups.length - 5} more.` : ''} Each entry still counts on its own in your totals and budgets.`,
    `${groups.slice(0, 5).map(g => one('nl', g)).join('. ')}.${groups.length > 5 ? ` En nog ${groups.length - 5}.` : ''} Elke invoer telt nog apart mee in je totalen en budgetten.`), calls);
}
add(entryGroups);
