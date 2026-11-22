import type {MoneyEntry, MoneyLog} from '../../money-log/schema';
import {fromCents} from '../../money-log/engine';
import type {MoneyMore} from '../../money-more/schema';
import {formatCurrencyAmount} from '../../visual-format';
import {busiestDays, calendarCurrencies, monthCalendar} from '../../money-insights/month-days';
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
void logOf;

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
