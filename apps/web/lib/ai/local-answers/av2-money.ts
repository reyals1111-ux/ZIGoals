import {transferPairs} from '../../bankfiles/reimport';
import {isCounted} from '../../money-log/counted';
import type {MoneyEntry} from '../../money-log/schema';
import {summarizeSelection} from '../../money-log/selection';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, count, isQuestion, list, MIXED, money, say, type Asked} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (money): the on-device answers to the money pillar's lane 2 features, in English and Dutch, each
 * read from the feature's own pure function (the figures its page shows) and only while Wealth is shared. The lead wires
 * `av2MoneyAnswer` into lib/ai/local-answers/engine.ts beside `avAnswer` (asked before the exact layer); every pattern
 * reads the whole question, so nothing else is claimed. Null when the question is not one of these.
 */
export function av2MoneyAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    for (const one of ANSWERS) { const r = one(a); if (r) return r; }
    return null;
  } catch { return null; }
}
type Answer = (a: Asked) => LocalReply | null;
const ANSWERS: Answer[] = [];
/** Each feature adds its answers here, in the order they are asked. */
export const addAnswers = (...more: Answer[]) => { ANSWERS.push(...more); };
export const entriesOf = (env: ToolEnv): readonly MoneyEntry[] => env.moneyLog?.entries ?? [];
const totalsOf = (entries: readonly MoneyEntry[]) => summarizeSelection(entries, entries.map(e => e.id)).totals.map(t => money(Math.abs(t.cents), t.currency));
const yearOf = (a: Asked) => a.today.slice(0, 4);
export const SPENDING_PLACE = {en: 'Wealth → Spending', nl: 'Vermogen → Uitgaven'} as const;

// ── Group 5: the money log's tools ────────────────────────────────────────────────────────────────────────────────

/** "What did I leave out of my spending", "wat telt niet mee in mijn uitgaven": the entries marked not part of spending, and transfers. */
function leftOut(a: Asked): LocalReply | null {
  const en = /\b(?:left out|leave out|excluded?|ignored?|not (?:part of|counted in) my spending|not counted)\b/.test(a.f) && /\b(?:spending|entries|money|transactions?|figures|totals?)\b/.test(a.f);
  const nl = /\b(?:telt|tellen) niet mee\b|\b(?:weggelaten|uitgesloten|genegeerd)\b/.test(a.f) && /\b(?:uitgaven|geld|posten|boekingen|transacties|totalen?)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const out = entriesOf(a.env).filter(e => !isCounted(e)), lang = a.lang, calls = [{tool: 'money_log', args: {counted: 'left-out'}, label: 'Money log · left out'}];
  if (!out.length) return answer(say(lang, `Nothing is left out: every entry counts in your totals and budgets. To leave one out (card interest, a refund you passed on), edit it in ${SPENDING_PLACE.en} and tick “Not part of my spending”.`, `Er is niets weggelaten: elke post telt mee in je totalen en budgetten. Wil je er een weglaten (rente op je creditcard, een terugbetaling die je doorgaf), bewerk hem dan in ${SPENDING_PLACE.nl} en vink “Not part of my spending” aan.`), calls);
  const transfers = out.filter(e => e.transfer).length, marked = out.length - transfers;
  const parts = [marked ? count(marked, lang, ['entry left out', 'entries left out'], ['post weggelaten', 'posten weggelaten']) : '', transfers ? count(transfers, lang, ['side of a transfer', 'sides of transfers'], ['kant van een overboeking', 'kanten van overboekingen']) : ''].filter(Boolean);
  const latest = [...out].sort((x, y) => y.date.localeCompare(x.date)).slice(0, 3).map(e => `${(e.note ?? e.category).split(' · ')[0]} ${money(Math.round(Number(e.amount) * 100), e.currency)}`);
  return answer(say(lang, `${list(parts, 'en')}, together ${list(totalsOf(out), 'en')}. They stay in your log and in search but count in no total or budget. The latest: ${list(latest, 'en')}.`,
    `${list(parts, 'nl')}, samen ${list(totalsOf(out), 'nl')}. Ze blijven in je log en in zoeken, maar tellen in geen totaal of budget mee. De laatste: ${list(latest, 'nl')}.`), calls);
}
/** "What is tax-deductible this year", "wat is aftrekbaar dit jaar": the entries the person marked, this year (or all). */
function taxMarked(a: Asked): LocalReply | null {
  if (!/\btax(?:[ -]?deductible| deduct\w*)\b|\b(?:aftrekbaar|aftrekbare|aftrekpost(?:en)?)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const lang = a.lang, year = /\b(?:this year|dit jaar)\b/.test(a.f) ? yearOf(a) : null, all = entriesOf(a.env).filter(e => e.taxDeductible && (!year || e.date.startsWith(year)));
  const calls = [{tool: 'money_log', args: {tax: true, ...(year ? {year} : {})}, label: 'Money log · tax-deductible'}];
  const when = year ? say(lang, `in ${year}`, `in ${year}`) : say(lang, 'in your log', 'in je log');
  if (!all.length) return answer(say(lang, `Nothing is marked tax-deductible ${when}. Mark an entry when you edit it in ${SPENDING_PLACE.en}; the search there finds them all (More filters → Only marked tax-deductible). This is your own mark, not tax advice.`,
    `Niets is als aftrekbaar gemarkeerd ${when}. Markeer een post als je hem bewerkt in ${SPENDING_PLACE.nl}; het zoeken daar vindt ze allemaal (More filters → Only marked tax-deductible). Dit is je eigen markering, geen belastingadvies.`), calls);
  return answer(say(lang, `${count(all.length, 'en', ['entry', 'entries'], ['', ''])} marked tax-deductible ${when}, together ${list(totalsOf(all), 'en')}. That is your own mark, not tax advice.`,
    `${count(all.length, 'nl', ['', ''], ['post', 'posten'])} als aftrekbaar gemarkeerd ${when}, samen ${list(totalsOf(all), 'nl')}. Dat is je eigen markering, geen belastingadvies.`), calls);
}
/** "What are my own categories", "welke eigen categorieën heb ik". */
function ownCategories(a: Asked): LocalReply | null {
  if (!/\b(?:my own|custom) (?:money |spending )?categor(?:y|ies)\b|\beigen (?:geld|uitgaven)?\s?categorie(?:en|n)?\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const own = a.env.moneyLog?.own, lang = a.lang, spent = own?.expense ?? [], got = own?.income ?? [], calls = [{tool: 'money_log', args: {own: true}, label: 'Money log · your categories'}];
  if (!spent.length && !got.length) return answer(say(lang, `You have no categories of your own yet. In ${SPENDING_PLACE.en} → Log spending → “Your own categories” you can add one; it is then offered in the forms, budgets and To review.`,
    `Je hebt nog geen eigen categorieën. In ${SPENDING_PLACE.nl} → Log spending → “Your own categories” voeg je er een toe; die wordt dan aangeboden in de formulieren, budgetten en To review.`), calls);
  return answer(say(lang, [spent.length ? `For spending: ${list(spent, 'en')}.` : '', got.length ? `For money received: ${list(got, 'en')}.` : ''].filter(Boolean).join(' '),
    [spent.length ? `Voor uitgaven: ${list(spent, 'nl')}.` : '', got.length ? `Voor inkomsten: ${list(got, 'nl')}.` : ''].filter(Boolean).join(' ')), calls);
}
/** "Which card payments are marked as transfers", "welke overboekingen tussen mijn rekeningen": pairs marked a transfer, and ones that look like one. */
function transfers(a: Asked): LocalReply | null {
  const en = /\b(?:card payments?|transfers? between (?:my )?accounts|moves? between (?:my )?accounts|marked (?:as )?(?:a )?transfers?)\b/.test(a.f);
  const nl = /\b(?:overboekingen?|overschrijvingen?) (?:tussen|van) (?:mijn )?rekeningen\b|\bcreditcardbetaling(?:en)?\b|\bals overboeking\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const all = entriesOf(a.env), lang = a.lang, marked = all.filter(e => e.transfer && e.kind === 'expense'), open = transferPairs(all), calls = [{tool: 'money_log', args: {transfers: true}, label: 'Money log · transfers'}];
  const line = (e: MoneyEntry) => `${money(Math.round(Number(e.amount) * 100), e.currency)} (${e.date})`;
  const head = marked.length ? say(lang, `${count(marked.length, 'en', ['transfer', 'transfers'], ['', ''])} marked, left out of spending and income: ${list(marked.slice(0, 4).map(line), 'en')}.`, `${count(marked.length, 'nl', ['', ''], ['overboeking', 'overboekingen'])} gemarkeerd, buiten uitgaven en inkomsten gelaten: ${list(marked.slice(0, 4).map(line), 'nl')}.`)
    : say(lang, 'No entry is marked as a transfer yet.', 'Nog geen post is als overboeking gemarkeerd.');
  const more = open.length ? say(lang, ` ${count(open.length, 'en', ['pair looks', 'pairs look'], ['', ''])} like one (the same amount out of one imported account and into another): ${SPENDING_PLACE.en} → Money tools → To review.`, ` ${count(open.length, 'nl', ['', ''], ['paar lijkt', 'paren lijken'])} er een (hetzelfde bedrag uit de ene geïmporteerde rekening en in de andere): ${SPENDING_PLACE.nl} → Money tools → To review.`)
    : say(lang, ' Card payments are matched when you import the files of both accounts.', ' Creditcardbetalingen worden gekoppeld als je de bestanden van beide rekeningen importeert.');
  return answer(head + more, calls);
}
addAnswers(leftOut, taxMarked, ownCategories, transfers);
