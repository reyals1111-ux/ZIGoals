import {transferPairs} from '../../bankfiles/reimport';
import {isCounted} from '../../money-log/counted';
import {nextPayday} from '../../bills/month';
import {cashForecast} from '../../cash-forecast/model';
import {challengeStates, lowBalanceCross, paydayCash, payeeRows, yearRecap} from '../../money-notices';
import {signedMoney} from '../../money-log/selection';
import {dayIn, monthIn} from './av-words';
import {assignView, averageSpent} from '../../budgets/assign';
import {debtSummary, paidOffDebts, trackedProgress} from '../../debt-planner/wealth';
import {extraFor} from '../../debt-planner/more';
import {debtView} from '../tools/f9-debt';
import type {WealthSheet} from '../../wealth-sheet/schema';
import {accountValueNow, equityOf, irr, oneTotal, shareTotals, staleAccounts} from '../../wealth-sheet/sheet';
import type {MoneyEntry} from '../../money-log/schema';
import {summarizeSelection} from '../../money-log/selection';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, count, isQuestion, list, MIXED, money, say, type Asked} from './av-words';
import type {LocalReply} from './engine';
import {challengeOf} from '../../habits-v2/challenge';

/**
 * Session AV lane 2 (money): the on-device answers to the money pillar's lane 2 features, in English and Dutch, each
 * read from the feature's own pure function (the figures its page shows) and only while Wealth is shared. The lead wires
 * `av2MoneyAnswer` into lib/ai/local-answers/engine.ts beside `avAnswer` (asked before the exact layer); every pattern
 * reads the whole question, so nothing else is claimed. Null when the question is not one of these.
 */
export function av2MoneyAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !(isQuestion(a) || /^(?:will|would|zakt|komt|gaat|zal|lig|loop)\b/.test(a.f))) return null;
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

// ── Group 5: notices ─────────────────────────────────────────────────────────────────────────────────────────────

const BUDGETS_PLACE = {en: 'Wealth → Budgets by category', nl: 'Vermogen → Budgets by category'} as const;
const forecastOf = (a: Asked) => a.env.accounts && a.env.ak?.bills ? cashForecast({accounts: a.env.accounts, bills: a.env.ak.bills, entries: entriesOf(a.env), ...(a.env.nova?.budgets ? {budgets: a.env.nova.budgets} : {}), today: a.today}).rows : [];
const about = (c: bigint, currency: string) => money(Number(c), currency);
/** "Which payees am I watching", "welke winkels volg ik": each watched payee this month against last. */
function payeesWatched(a: Asked): LocalReply | null {
  if (!/\b(?:payees?|shops?|stores?) (?:am i|do i|i am|im) (?:watching|following|tracking)\b|\bwatched payees?\b|\bwelke (?:winkels|ontvangers) (?:volg ik|houd ik in de gaten)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const record = a.env.nova?.budgets, lang = a.lang, rows = record ? payeeRows(record, entriesOf(a.env), a.today) : [], calls = [{tool: 'budgets', args: {payees: true}, label: 'Budgets · watched payees'}];
  if (!rows.length) return answer(say(lang, `You are not watching a payee yet. ${BUDGETS_PLACE.en} → “Watching payees” follows one shop or service this month against last.`, `Je volgt nog geen winkel of dienst. ${BUDGETS_PLACE.nl} → “Watching payees” volgt er een deze maand tegen vorige maand.`), calls);
  const line = (r: (typeof rows)[number]) => r.lastBySameDay === null ? say(lang, `${r.payee}: ${money(r.thisMonth, r.currency)} so far`, `${r.payee}: ${money(r.thisMonth, r.currency)} tot nu toe`)
    : say(lang, `${r.payee}: ${money(r.thisMonth, r.currency)} so far, ${money(r.lastBySameDay, r.currency)} by this day last month (${signedMoney(r.difference!, r.currency, money)})`, `${r.payee}: ${money(r.thisMonth, r.currency)} tot nu toe, ${money(r.lastBySameDay, r.currency)} op deze dag vorige maand (${signedMoney(r.difference!, r.currency, money)})`);
  return answer(rows.map(line).join('. ') + '.', calls);
}
/** "How is my challenge going", "hoe gaat mijn uitdaging". */
function challenges(a: Asked): LocalReply | null {
  if (!/\bchallenges?\b|\buitdaging(?:en)?\b/.test(a.f) || /\b52\b|\bweek savings\b|\bsavings? challenge\b|\bspaaruitdaging\b/.test(a.f)) return null;
  // Batch 2 unit check (golden set w-challenges, x-challenges-2): without a spending word, a person running a habit challenge
  // means that one (the habits' challenges tool answers); the spending challenges answer only for money words or when no habit challenge runs.
  if (!/\b(?:spend|spending|money|budgets?|categor(?:y|ies)|uitgaven|uitgeven|geld|budget|categorie(?:ën)?)\b/.test(a.f) && a.env.habits.habits.some(h => { const c = challengeOf(h, a.env.habitDay ?? a.today); return !!c && !c.finished; })) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const record = a.env.nova?.budgets, lang = a.lang, rows = record ? challengeStates(record, entriesOf(a.env), a.today) : [], calls = [{tool: 'budgets', args: {challenges: true}, label: 'Budgets · challenges'}];
  if (!rows.length) return answer(say(lang, `No spending challenge is running. ${BUDGETS_PLACE.en} → Challenges starts one: spend less on a category than last month.`, `Er loopt geen uitgavenuitdaging. ${BUDGETS_PLACE.nl} → Challenges start er een: geef minder uit aan een categorie dan vorige maand.`), calls);
  const words = (c: (typeof rows)[number]) => {
    const head = say(lang, `${c.category} (${monthIn('en', c.month)}): ${money(c.spent, c.currency)} against ${money(c.lastMonth, c.currency)} last month`, `${c.category} (${monthIn('nl', c.month)}): ${money(c.spent, c.currency)} tegen ${money(c.lastMonth, c.currency)} vorige maand`);
    const state = {'on-track': say(lang, `on track, ${money(c.left, c.currency)} to spare`, `op schema, ${money(c.left, c.currency)} over`), close: say(lang, `close: ${money(c.left, c.currency)} to spare`, `spannend: nog ${money(c.left, c.currency)} over`), over: say(lang, 'already past last month', 'al boven vorige maand'), won: say(lang, 'done, less than last month', 'gehaald, minder dan vorige maand'), lost: say(lang, 'ended above last month', 'geëindigd boven vorige maand'), 'no-last': say(lang, 'nothing spent last month to beat', 'vorige maand niets uitgegeven om te verslaan')}[c.state];
    return `${head}: ${state}`;
  };
  return answer(rows.slice(0, 4).map(words).join('. ') + '.', calls);
}
/** "How much will I have left until payday", "hoeveel houd ik over tot mijn salaris". */
function untilPayday(a: Asked): LocalReply | null {
  const en = /\b(?:left|leftover)\b.*\b(?:until|till|before|by) (?:my )?(?:next )?(?:payday|pay day|salary|paycheck)\b/.test(a.f), nl = /\b(?:over|overhouden)\b.*\b(?:tot|voor) (?:mijn |de )?(?:volgende )?(?:salaris|salarisdag|loon)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const lang = a.lang, pay = nextPayday(entriesOf(a.env), a.today), calls = [{tool: 'cash_forecast', args: {payday: true}, label: 'Next 60 days · until payday'}];
  if (!pay) return answer(say(lang, 'Your money log shows no regular monthly income yet, so there is no payday to count to.', 'Je geldlog toont nog geen vast maandinkomen, dus er is geen salarisdag om naartoe te tellen.'), calls);
  const left = paydayCash(forecastOf(a), pay);
  if (!left) return answer(say(lang, `Your next payday is ${dayIn('en', pay.date, a.today)}. What is left before it needs a ${pay.currency} cash or savings balance (What you have → Accounts).`, `Je volgende salarisdag is ${dayIn('nl', pay.date, a.today)}. Wat er dan over is vraagt om een ${pay.currency}-saldo van een betaal- of spaarrekening (What you have → Accounts).`), calls);
  return answer(say(lang, `Your next payday is ${dayIn('en', pay.date, a.today)}. The 60-day forecast leaves about ${about(left.cents, left.currency)} the day before, after your bills and everyday spending until then. A model from your own records, not a promise.`,
    `Je volgende salarisdag is ${dayIn('nl', pay.date, a.today)}. De prognose voor 60 dagen laat de dag ervoor ongeveer ${about(left.cents, left.currency)} over, na je rekeningen en dagelijkse uitgaven tot dan. Een model uit je eigen gegevens, geen belofte.`), calls);
}
/** "Will my cash go below my line", "zakt mijn geld onder mijn grens". */
function lowLine(a: Asked): LocalReply | null {
  const en = /\b(?:cash|balance|money)\b.*\b(?:go|drop|fall|get) (?:below|under)\b|\blow balance\b/.test(a.f), nl = /\b(?:geld|saldo)\b.*\b(?:onder|beneden)\b.*\bgrens\b|\bonder (?:mijn |de )?grens\b|\blaag saldo\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const lang = a.lang, line = a.env.moneyLog?.lowBalance, calls = [{tool: 'cash_forecast', args: {low: true}, label: 'Next 60 days · low-balance line'}];
  if (!line) return answer(say(lang, `You have not set a low-balance line. ${SPENDING_PLACE.en} → Money tools → Next 60 days → “Low-balance line” sets one; Today then names the day the forecast crosses it.`, `Je hebt nog geen ondergrens ingesteld. ${SPENDING_PLACE.nl} → Money tools → Next 60 days → “Low-balance line” stelt er een in; Vandaag noemt dan de dag dat de prognose eronder komt.`), calls);
  const cross = lowBalanceCross(forecastOf(a), line), shown = money(Math.round(Number(line.amount) * 100), line.currency);
  return answer(cross ? say(lang, `Yes: the 60-day forecast goes below your line of ${shown} around ${dayIn('en', cross.date, a.today)} (about ${about(cross.cents, cross.currency)}). A model, not a promise.`, `Ja: de prognose voor 60 dagen komt rond ${dayIn('nl', cross.date, a.today)} onder je grens van ${shown} (ongeveer ${about(cross.cents, cross.currency)}). Een model, geen belofte.`)
    : say(lang, `No: the 60-day forecast stays above your line of ${shown}.`, `Nee: de prognose voor 60 dagen blijft boven je grens van ${shown}.`), calls);
}
/** "How was my year for money", "hoe was mijn jaar voor mijn geld". */
function yearInReview(a: Asked): LocalReply | null {
  const en = /\byear in review\b|\bhow (?:was|did|has) (?:my |this )?year\b.*\b(?:money|spending|go)\b/.test(a.f), nl = /\bhoe (?:was|ging) (?:mijn |dit )?jaar\b.*\b(?:geld|uitgaven)\b|\bmijn jaar in (?:cijfers|het kort)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const lang = a.lang, year = a.today.slice(0, 4), rows = yearRecap(entriesOf(a.env), a.env.ak?.bills, year, a.today), calls = [{tool: 'money_log', args: {year}, label: `Money log · ${year}`}];
  if (!rows.length) return answer(say(lang, `Nothing is logged in ${year} yet.`, `Er is nog niets gelogd in ${year}.`), calls);
  return answer(rows.map(r => say(lang, `${year} so far in ${r.currency}: ${money(r.spent, r.currency)} spent, ${money(r.income, r.currency)} came in${r.top.length ? `; most on ${list(r.top.slice(0, 3).map(t => `${t.category} ${money(t.cents, r.currency)}`), 'en')}` : ''}${r.largest ? `; the largest expense ${r.largest.note} ${money(r.largest.cents, r.currency)}` : ''}${r.bills.count ? `; tracked bills ${money(r.bills.cents, r.currency)}` : ''}.`,
    `${year} tot nu toe in ${r.currency}: ${money(r.spent, r.currency)} uitgegeven, ${money(r.income, r.currency)} binnengekomen${r.top.length ? `; het meest aan ${list(r.top.slice(0, 3).map(t => `${t.category} ${money(t.cents, r.currency)}`), 'nl')}` : ''}${r.largest ? `; de grootste uitgave ${r.largest.note} ${money(r.largest.cents, r.currency)}` : ''}${r.bills.count ? `; gevolgde rekeningen ${money(r.bills.cents, r.currency)}` : ''}.`)).join('\n'), calls);
}
/** "What notes do I have on my accounts", "welke notities heb ik bij mijn rekeningen". */
function accountNotes(a: Asked): LocalReply | null {
  if (!/\bnotes?\b.*\baccounts?\b|\baccount notes?\b|\bnotities?\b.*\brekening(?:en)?\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const lang = a.lang, notes = a.env.moneyLog?.accounts?.notes ?? {}, items = a.env.accounts?.items ?? [], calls = [{tool: 'accounts', args: {notes: true}, label: 'Accounts · notes'}];
  const lines = items.flatMap(x => notes[x.id] ? [`${x.name}: ${notes[x.id]}`] : []);
  return answer(lines.length ? lines.join('\n') : say(lang, 'None of your accounts has a note. Edit an account in What you have → Accounts to add one.', 'Geen van je rekeningen heeft een notitie. Bewerk een rekening in What you have → Accounts om er een toe te voegen.'), calls);
}
addAnswers(payeesWatched, challenges, untilPayday, lowLine, yearInReview, accountNotes);

// ── Group 8: CoinStats ─────────────────────────────────────────────────────────────────────────────────────────────

/** "Which move alerts do I have", "welke bewegingsalarmen heb ik": the 24 h move alerts and the portfolio percent alerts. */
function moveAlerts(a: Asked): LocalReply | null {
  const en = /\b(?:move|moves|movement|24 ?h(?:our)?|percent|%) alerts?\b|\balerts? (?:on|for) (?:a )?(?:24 ?h(?:our)?|daily) moves?\b/.test(a.f), nl = /\bbewegingsalarm(?:en)?\b|\b24[- ]?uurs?alarm(?:en)?\b|\bprocentalarm(?:en)?\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const record = a.env.ak?.priceAlerts, lang = a.lang, calls = [{tool: 'price_alerts', args: {moves: true}, label: 'Price alerts · moves'}];
  const moves = (record?.moves ?? []).filter(x => x.active), pm = (record?.portfolioMoves ?? []).filter(x => x.active);
  if (!moves.length && !pm.length) return answer(say(lang, 'No move alert is set. On a coin’s page, Price alert → “moves a percent within 24 hours”; on a portfolio, Value alert → “a percent more or less than now”.', 'Er staat geen bewegingsalarm. Op de pagina van een munt: Price alert → “moves a percent within 24 hours”; bij een portefeuille: Value alert → “a percent more or less than now”.'), calls);
  const dir = (d: 'up' | 'down' | 'either') => d === 'up' ? say(lang, 'up', 'omhoog') : d === 'down' ? say(lang, 'down', 'omlaag') : say(lang, 'up or down', 'omhoog of omlaag');
  const lines = [...moves.map(m => say(lang, `${m.coinName}: ${m.percent}% ${dir(m.direction)} within 24 h in ${m.currency}${m.firedAt ? `, last told ${dayIn('en', m.firedAt.slice(0, 10), a.today)}` : ''}`, `${m.coinName}: ${m.percent}% ${dir(m.direction)} binnen 24 uur in ${m.currency}${m.firedAt ? `, laatst gemeld ${dayIn('nl', m.firedAt.slice(0, 10), a.today)}` : ''}`)),
    ...pm.map(m => say(lang, `${m.portfolioName}: worth ${m.percent}% ${dir(m.direction)} from ${m.base} ${m.currency}`, `${m.portfolioName}: ${m.percent}% ${dir(m.direction)} vanaf ${m.base} ${m.currency}`))];
  return answer(`${lines.join('. ')}. ${say(lang, 'Checked with the market figures this app already reads; information, not advice.', 'Gecontroleerd met de marktcijfers die deze app al leest; informatie, geen advies.')}`, calls);
}
/** "What was my portfolio worth a month ago", "wat was mijn portefeuille vorige maand waard": where the Time Machine is. */
function timeMachine(a: Asked): LocalReply | null {
  const en = /\bwhat (?:was|were) my (?:portfolio|coins|crypto)\b.*\bworth\b|\btime machine\b/.test(a.f), nl = /\bwat was mijn (?:portefeuille|crypto)\b.*\bwaard\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  return answer(say(a.lang, 'Portfolio → your portfolio → Analysis → “On a past day” shows what it held at the end of any day in the last year and what that was worth then, from your transactions and the market history the value chart reads. Past prices are not on this device for me to read, so I cannot say the figure here.',
    'Portfolio → je portefeuille → Analysis → “On a past day” toont wat je op elke dag van het afgelopen jaar bezat en wat dat toen waard was, uit je transacties en de koersgeschiedenis die de waardegrafiek leest. Oude koersen staan niet op dit apparaat voor mij, dus het bedrag kan ik hier niet noemen.'), [{tool: 'portfolio', args: {timeMachine: true}, label: 'Portfolio · on a past day'}]);
}
addAnswers(moveAlerts, timeMachine);

// ── Group 10: budgets ──────────────────────────────────────────────────────────────────────────────────────────────

/** "What is underfunded", "welke budgetten komen tekort": what this month's amounts fall short of the targets. */
function underfunded(a: Asked): LocalReply | null {
  if (!/\bunderfunded\b|\b(?:budgets?|targets?)\b.*\b(?:short|need more|needs more)\b|\bwhat do my budgets need\b|\b(?:onvoldoende gevuld|tekort komen|komen tekort|komt tekort)\b|\btekort\b.*\bbudget\w*\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const record = a.env.nova?.budgets, lang = a.lang, month = a.today.slice(0, 7), calls = [{tool: 'budgets', args: {month}, label: 'Budgets · plan this month'}];
  if (!record?.budgets.length) return answer(say(lang, 'No budget is set yet. Wealth → Budgets sets them.', 'Je hebt nog geen budgetten. Wealth → Budgets stelt ze in.'), calls);
  const view = assignView(entriesOf(a.env), record, month, a.today), short = view.rows.filter(r => r.underfunded > 0);
  if (!short.length) return answer(say(lang, `Nothing is underfunded in ${monthIn('en', month)}: every budget with a target has at least what it needs.${view.rows.some(r => r.need) ? '' : ' None of your budgets has a weekly, monthly or yearly target yet (Budgets → Plan → Target).'}`, `Niets komt tekort in ${monthIn('nl', month)}: elk budget met een doel heeft minstens wat het nodig heeft.${view.rows.some(r => r.need) ? '' : ' Geen van je budgetten heeft al een week-, maand- of jaardoel (Budgets → Plan → Target).'}`), calls);
  const items = short.map(r => `${r.category} ${money(r.underfunded, r.currency)}`);
  return answer(say(lang, `Underfunded in ${monthIn('en', month)}: ${list(view.underfunded.map(u => money(u.cents, u.currency)), 'en')} — ${list(items, 'en')}. Budgets → Plan → “Fund what is underfunded” fills them.`, `Tekort in ${monthIn('nl', month)}: ${list(view.underfunded.map(u => money(u.cents, u.currency)), 'nl')} — ${list(items, 'nl')}. Budgets → Plan → “Fund what is underfunded” vult ze aan.`), calls);
}
/** "How much flexible spending is left", "hoeveel flexibel budget heb ik nog". */
function flexibleLeft(a: Asked): LocalReply | null {
  if (!/\bflex(?:ible)?\b.*\b(?:left|remaining|budgets?)\b|\bflexibel\w*\b.*\b(?:over|nog|budget\w*)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const record = a.env.nova?.budgets, lang = a.lang, month = a.today.slice(0, 7), calls = [{tool: 'budgets', args: {flexible: true}, label: 'Budgets · flexible'}];
  const view = record?.budgets.length ? assignView(entriesOf(a.env), record, month, a.today) : null;
  if (!view?.flexibleLeft.length) return answer(say(lang, 'None of your budgets is marked flexible. Budgets → Plan → Bucket: Flexible puts it in the one “flexible left” figure.', 'Geen van je budgetten staat op flexibel. Budgets → Plan → Bucket: Flexible zet het in het ene bedrag “flexible left”.'), calls);
  return answer(say(lang, `Flexible left in ${monthIn('en', month)}: ${list(view.flexibleLeft.map(f => `${money(f.cents, f.currency)} across ${count(f.count, 'en', ['budget', 'budgets'], ['', ''])}`), 'en')}.`, `Flexibel over in ${monthIn('nl', month)}: ${list(view.flexibleLeft.map(f => `${money(f.cents, f.currency)} over ${count(f.count, 'nl', ['', ''], ['budget', 'budgetten'])}`), 'nl')}.`), calls);
}
/** "What should my groceries budget be", "wat is een goed budget voor boodschappen": the average of the last three months. */
function suggestedBudget(a: Asked): LocalReply | null {
  const en = /\b(?:suggest(?:ed)?|what should|average)\b.*\bbudgets?\b|\bbudgets?\b.*\b(?:suggest(?:ion|ed)?|be)\b/.test(a.f) && /\b(?:budget)\b/.test(a.f), nl = /\b(?:voorstel|gemiddeld\w*|wat moet)\b.*\bbudget\w*\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const record = a.env.nova?.budgets, lang = a.lang, month = a.today.slice(0, 7), calls = [{tool: 'budgets', args: {suggest: true}, label: 'Budgets · suggested'}];
  const named = (record?.budgets ?? []).filter(b => new RegExp(`\\b${b.category.toLowerCase().replace(/[^a-z0-9 ]/g, '.')}\\b`).test(a.f)), pick = named.length ? named : record?.budgets ?? [];
  const lines = pick.flatMap(b => { const avg = averageSpent(entriesOf(a.env), b.category, b.currency, month); return avg ? [say(lang, `${b.category}: ${money(avg.cents, b.currency)} (your average over ${count(avg.months, 'en', ['month', 'months'], ['', ''])}; set now: ${money(Math.round(Number(b.monthly) * 100), b.currency)})`, `${b.category}: ${money(avg.cents, b.currency)} (je gemiddelde over ${count(avg.months, 'nl', ['', ''], ['maand', 'maanden'])}; nu: ${money(Math.round(Number(b.monthly) * 100), b.currency)})`)] : []; });
  if (!lines.length) return answer(say(lang, 'There is not enough spending in the last three months to suggest an amount yet.', 'Er zijn nog te weinig uitgaven in de afgelopen drie maanden om een bedrag voor te stellen.'), calls);
  return answer(`${say(lang, 'Suggested from your own spending', 'Voorgesteld uit je eigen uitgaven')}: ${lines.join('; ')}. ${say(lang, 'Budgets → Plan → “Use it” sets it for this month.', 'Budgets → Plan → “Use it” zet het voor deze maand.')}`, calls);
}
addAnswers(underfunded, flexibleLeft, suggestedBudget);

// ── Group 15: the debt planner ───────────────────────────────────────────────────────────────────────────────────

const debtMoney = (c: bigint, currency: string) => money(Number(c < 0n ? -c : c), currency);
/** "Which debts have I paid off", "welke schulden heb ik afbetaald". */
function paidOff(a: Asked): LocalReply | null {
  if (!/\bdebts?\b.*\bpaid off\b|\bpaid off\b.*\bdebts?\b|\b(?:schulden|lening(?:en)?)\b.*\b(?:afbetaald|afgelost)\b/.test(a.f) || /\bwhen\b|\bwanneer\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const lang = a.lang, list = paidOffDebts(a.env.accounts, a.today), calls = [{tool: 'accounts', args: {paidOff: true}, label: 'What you owe · paid off'}];
  if (!list.length) return answer(say(lang, 'No debt is paid off yet: a debt counts as paid off once its balance (or its balance less your payments) reaches zero.', 'Nog geen schuld is afgelost: een schuld telt als afgelost zodra het saldo (of het saldo min je betalingen) op nul staat.'), calls);
  return answer(list.map(p => say(lang, `${p.name}: paid off on ${dayIn('en', p.on, a.today)}${p.from ? `, from ${debtMoney(p.from, p.currency)}` : ''}`, `${p.name}: afgelost op ${dayIn('nl', p.on, a.today)}${p.from ? `, van ${debtMoney(p.from, p.currency)}` : ''}`)).join('. ') + '.', calls);
}
/** "How much debt did I pay down this year", "hoeveel schuld heb ik dit jaar afgelost". */
function paidDown(a: Asked): LocalReply | null {
  if (!/\bpaid? down\b|\bpay down\b|\bhoeveel\b.*\b(?:afgelost|afbetaald)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const lang = a.lang, rows = debtSummary(a.env.accounts, a.env.ak?.debtPlanner, a.today), calls = [{tool: 'accounts', args: {paidDown: true}, label: 'What you owe · paid down'}];
  if (!rows.length) return answer(say(lang, 'You have no debts with a balance in Wealth → What you owe.', 'Je hebt geen schulden met een saldo in Vermogen → Wat je schuldig bent.'), calls);
  return answer(rows.map(r => say(lang, `${r.currency}: ${debtMoney(r.owed, r.currency)} owed now${r.thisYear !== null ? `; ${r.thisYear >= 0n ? 'paid down' : 'up'} ${debtMoney(r.thisYear, r.currency)} this year` : ''}${r.last12 !== null ? `; ${r.last12 >= 0n ? 'paid down' : 'up'} ${debtMoney(r.last12, r.currency)} over 12 months` : ''}.`, `${r.currency}: nu ${debtMoney(r.owed, r.currency)} schuld${r.thisYear !== null ? `; dit jaar ${r.thisYear >= 0n ? 'afgelost' : 'erbij'} ${debtMoney(r.thisYear, r.currency)}` : ''}${r.last12 !== null ? `; over 12 maanden ${r.last12 >= 0n ? 'afgelost' : 'erbij'} ${debtMoney(r.last12, r.currency)}` : ''}.`)).join('\n'), calls);
}
/** "Am I on track with my debt plan", "lig ik op schema met mijn aflosplan". */
function keptPlan(a: Asked): LocalReply | null {
  if (!/\b(?:on track|ahead|behind)\b.*\bdebt plan\b|\bdebt plan\b.*\b(?:on track|ahead|behind)\b|\b(?:op schema|voor|achter)\b.*\baflos\w*plan\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const lang = a.lang, p = trackedProgress(a.env.accounts, a.env.ak?.debtPlanner, a.today), calls = [{tool: 'debt_plan', args: {tracked: true}, label: 'Debt planner · kept plan'}];
  if (!p) return answer(say(lang, 'No plan is kept yet. In the debt planner, “Track this plan” keeps one to compare with what you record.', 'Er is nog geen plan bewaard. In de aflosplanner bewaart “Track this plan” er een om te vergelijken met wat je vastlegt.'), calls);
  if (!p.months) return answer(say(lang, 'Your kept plan has its first payment month still ahead, so there is nothing to compare yet.', 'De eerste betaalmaand van je plan moet nog komen, dus er valt nog niets te vergelijken.'), calls);
  return answer(p.ahead >= 0n ? say(lang, `Ahead: you owe ${debtMoney(p.actual, p.currency)}, ${debtMoney(p.ahead, p.currency)} less than the kept plan expected after ${count(p.months, 'en', ['month', 'months'], ['', ''])}.`, `Voor: je bent ${debtMoney(p.actual, p.currency)} schuldig, ${debtMoney(p.ahead, p.currency)} minder dan het plan na ${count(p.months, 'nl', ['', ''], ['maand', 'maanden'])} verwachtte.`)
    : say(lang, `Behind: you owe ${debtMoney(p.actual, p.currency)}, ${debtMoney(p.ahead, p.currency)} more than the kept plan expected after ${count(p.months, 'en', ['month', 'months'], ['', ''])}.`, `Achter: je bent ${debtMoney(p.actual, p.currency)} schuldig, ${debtMoney(p.ahead, p.currency)} meer dan het plan na ${count(p.months, 'nl', ['', ''], ['maand', 'maanden'])} verwachtte.`), calls);
}
/** "How much extra to be debt-free by 2028", "hoeveel extra om in 2028 schuldenvrij te zijn": the reverse what-if, by a year's end. */
function debtFreeBy(a: Asked): LocalReply | null {
  const y = /\b(20\d\d)\b/.exec(a.f)?.[1];
  if (!y || !/\bdebt free\b|\bschuldenvrij\b/.test(a.f) || !/\b(?:how much|extra|hoeveel)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const lang = a.lang, by = `${y}-12`, calls = [{tool: 'debt_plan', args: {by}, label: `Debt planner · debt-free by ${y}`}];
  const v = debtView(a.env.accounts, a.env.ak?.debtPlanner, a.today).find(x => x.comparison);
  if (!v?.comparison) return answer(say(lang, 'The debt planner needs each debt’s rate and minimum first (Wealth → What you owe → Plan paying off your debts).', 'De aflosplanner heeft eerst per schuld de rente en het minimum nodig (Vermogen → Wat je schuldig bent → Plan je aflossing).'), calls);
  const debts = v.debts.filter(d => d.ratePercent && d.minimum).map(d => ({id: d.id, name: d.name, balance: d.owed, ratePercent: d.ratePercent!, minimum: d.minimum!}));
  const need = extraFor(debts, 'avalanche', by, a.today);
  if (need === null) return answer(say(lang, `December ${y} is too close for these debts with any extra I can work out.`, `December ${y} is te dichtbij voor deze schulden met elk extra bedrag dat ik kan uitrekenen.`), calls);
  return answer(need === 0n ? say(lang, `Your payments as they are already make you debt-free by December ${y} (avalanche order). A model, not advice.`, `Met je huidige betalingen ben je al schuldenvrij in december ${y} (lawinevolgorde). Een model, geen advies.`)
    : say(lang, `About ${debtMoney(need, v.currency)} extra a month on top of the minimums makes you debt-free by December ${y} (avalanche order; now ${debtMoney(v.extra, v.currency)}). A model, not advice.`, `Ongeveer ${debtMoney(need, v.currency)} extra per maand bovenop de minimums maakt je schuldenvrij in december ${y} (lawinevolgorde; nu ${debtMoney(v.extra, v.currency)}). Een model, geen advies.`), calls);
}
addAnswers(paidOff, paidDown, keptPlan, debtFreeBy);

// ── N12: Kubera's net-worth sheet ────────────────────────────────────────────────────────────────────────────────
// The sheet is read from `env.wealthSheet` (the lead adds it to the tool sources beside `accounts`); without it, these
// answers say where the figures live.

const sheetOf = (a: Asked): WealthSheet | null => (a.env as ToolEnv & {wealthSheet?: WealthSheet | null}).wealthSheet ?? ((a.env.ak as {wealthSheet?: WealthSheet | null} | null | undefined)?.wealthSheet ?? null);
const SHEET_WHERE = {en: 'Wealth → Accounts, debts & net worth → each account’s “Sheet”', nl: 'Vermogen → Accounts, debts & net worth → bij elke rekening “Sheet”'} as const;
/** "What is my home equity", "hoeveel overwaarde heb ik". */
function equity(a: Asked): LocalReply | null {
  if (!/\bequity\b|\bovenwaarde\b|\boverwaarde\b|\beigen vermogen in (?:mijn )?huis\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const lang = a.lang, accounts = a.env.accounts, sheet = sheetOf(a), calls = [{tool: 'accounts', args: {equity: true}, label: 'Accounts · equity'}];
  const rows = accounts && sheet ? accounts.items.filter(x => x.kind === 'property' && !x.archivedAt).flatMap(p => { const e = equityOf(accounts, sheet, p.id, a.today); return e ? [{p, e}] : []; }) : [];
  if (!rows.length) return answer(say(lang, `No mortgage is linked to a property yet. In ${SHEET_WHERE.en} of the mortgage, “Secured on” links it; the property then shows its equity.`, `Er is nog geen hypotheek aan een woning gekoppeld. In ${SHEET_WHERE.nl} van de hypotheek koppelt “Secured on” hem; de woning toont dan de overwaarde.`), calls);
  return answer(rows.map(({p, e}) => say(lang, `${p.name}: equity ${e.equity < 0n ? '−' : ''}${money(Math.abs(Number(e.equity)), e.currency)} (worth ${money(Number(e.value), e.currency)}, less ${money(Number(e.owed), e.currency)} owed on ${list(e.mortgages.map(x => x.name), 'en')}).`, `${p.name}: overwaarde ${e.equity < 0n ? '−' : ''}${money(Math.abs(Number(e.equity)), e.currency)} (waard ${money(Number(e.value), e.currency)}, min ${money(Number(e.owed), e.currency)} schuld op ${list(e.mortgages.map(x => x.name), 'nl')}).`)).join('\n'), calls);
}
/** "Which accounts need an update", "welke rekeningen moet ik bijwerken". */
function staleOnes(a: Asked): LocalReply | null {
  if (!/\b(?:accounts?|balances?|values?)\b.*\b(?:need|due for) (?:an )?update\b|\bout of date\b.*\baccounts?\b|\b(?:rekeningen|saldo\w*|saldi)\b.*\bbijwerken\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const lang = a.lang, list2 = staleAccounts(a.env.accounts, sheetOf(a), a.today), calls = [{tool: 'accounts', args: {stale: true}, label: 'Accounts · due for an update'}];
  if (!list2.length) return answer(say(lang, `Nothing is due for an update by your own reminders. Set “Remind me to update it” in ${SHEET_WHERE.en}.`, `Niets hoeft bijgewerkt te worden volgens je eigen herinneringen. Zet “Remind me to update it” in ${SHEET_WHERE.nl}.`), calls);
  return answer(say(lang, `Due for an update: ${list(list2.map(x => `${x.name} (${x.last ? `last ${dayIn('en', x.last, a.today)}` : 'no balance yet'})`), 'en')}.`, `Bijwerken: ${list(list2.map(x => `${x.name} (${x.last ? `laatst ${dayIn('nl', x.last, a.today)}` : 'nog geen saldo'})`), 'nl')}.`), calls);
}
/** "What is my net worth in one total", "mijn vermogen in één totaal": from the rates the person typed. */
function oneTotalAnswer(a: Asked): LocalReply | null {
  if (!/\bone total\b|\bnet worth in (?:one|a single) currency\b|\b(?:in )?(?:een|één) totaal\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const lang = a.lang, accounts = a.env.accounts, sheet = sheetOf(a), calls = [{tool: 'accounts', args: {oneTotal: true}, label: 'Your sheet · one total'}];
  if (!accounts?.items.length) return answer(say(lang, 'You have no accounts yet (Wealth → Accounts, debts & net worth).', 'Je hebt nog geen rekeningen (Vermogen → Accounts, debts & net worth).'), calls);
  const s = sheet ?? {version: 1 as const}, rows = shareTotals(accounts, s, a.today), cur = s.total ?? rows[0]?.currency ?? 'EUR', t = oneTotal(rows.map(r => ({currency: r.currency, cents: r.net})), s.rates, cur);
  const head = say(lang, `One total in ${cur}: ${t.cents < 0n ? '−' : ''}${money(Math.abs(Number(t.cents)), cur)}`, `Eén totaal in ${cur}: ${t.cents < 0n ? '−' : ''}${money(Math.abs(Number(t.cents)), cur)}`);
  const used = t.used.length ? say(lang, `, with your own rates (${t.used.map(u => u.inverse ? `1 ${cur} = ${u.rate} ${u.from}` : `1 ${u.from} = ${u.rate} ${cur}`).join(', ')}), not live ones`, `, met je eigen koersen (${t.used.map(u => u.inverse ? `1 ${cur} = ${u.rate} ${u.from}` : `1 ${u.from} = ${u.rate} ${cur}`).join(', ')}), geen actuele`) : '';
  const missing = t.missing.length ? say(lang, `. Without ${list(t.missing, 'en')}: type a rate in Your sheet.`, `. Zonder ${list(t.missing, 'nl')}: typ een koers in Your sheet.`) : '';
  return answer(`${head}${used}${missing}.`.replace('..', '.'), calls);
}
/** "What is the return on my investments", "wat is het rendement van mijn beleggingen": the IRR of accounts with money in and out. */
function returnIrr(a: Asked): LocalReply | null {
  if (!/\b(?:irr|annual return|rate of return|return on my)\b|\brendement\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const lang = a.lang, sheet = sheetOf(a), calls = [{tool: 'accounts', args: {irr: true}, label: 'Your sheet · annual return'}];
  const rows = (a.env.accounts?.items ?? []).flatMap(x => { const f = sheet?.flows?.[x.id]; const r = f ? irr(f, accountValueNow(x, a.today), a.today) : null; return r === null ? [] : [`${x.name} ${(r * 100).toFixed(1)} %`]; });
  if (!rows.length) return answer(say(lang, `No account has money in and out recorded yet. In ${SHEET_WHERE.en} → “Money in and out”, add what you put in with the days; with today’s balance it gives the annual return.`, `Nog geen rekening heeft geld erin en eruit vastgelegd. In ${SHEET_WHERE.nl} → “Money in and out” voeg je toe wat je erin stopte, met de dagen; met het saldo van vandaag geeft dat het jaarrendement.`), calls);
  return answer(say(lang, `Annual return (IRR) from your money in and out and today’s balance: ${list(rows, 'en')} a year. A result, not advice.`, `Jaarrendement (IRR) uit je geld erin en eruit en het saldo van vandaag: ${list(rows, 'nl')} per jaar. Een uitkomst, geen advies.`), calls);
}
addAnswers(equity, staleOnes, oneTotalAnswer, returnIrr);
