import {readableYears, type MoneyEntry, type MoneyLog} from '../../money-log/schema';
import type {BudgetsRecord} from '../../budgets/schema';
import type {BudgetPeriods} from '../../budgets/periods';
import {monthOf} from '../../money-log/engine';
import {countedBetween} from '../../money-log/counted';
import {refundsIn} from '../../money-log/refunds';
import {paycheckMonth} from '../../budgets/paychecks';
import {setAsideFrom, coveredIn} from '../../budgets/set-aside';
import {budgetsInOrder, hasOwnOrder} from '../../budgets/order';
import {shiftMonth} from '../../budgets/engine';
import {lookedDays, moneyStreak} from '../../money-log/money-streak';
import {checkRecords} from '../../money-log/check';
import {pastYears} from '../../money-log/put-away';
import {minorUnits} from '../../money-split/parts';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, isQuestion, list, MIXED, monthIn, moneyIn, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';
import {akOf} from './av2-r5-money';

/**
 * Session AV lane 2, round 6 (money; EveryDollar, Banktivity): the on-device answers to round 6's money features, in English
 * and Dutch, each read from the feature's own pure function (the figures its page shows) and only while Wealth is shared.
 * Refunds are counted by the shared rule (lib/money-log/counted.ts `countedBetween`: a refund is spending below zero in its
 * category, never income), so NOVA, ZIGi and the pages say the same amounts. A Dutch answer writes money the Dutch way
 * ("€ 12,50") and months as Dutch words. No money advice and no suggested amounts: figures and plain words only. The lead
 * wires `av2R6MoneyAnswer` into lib/ai/local-answers/engine.ts before `av2R5MoneyAnswer`;
 * lib/ai/local-answers/av2-r6-money.test.ts proves it claims none of the corpus questions. Null when it is not one of these.
 */
export function av2R6MoneyAnswer(question: string, env: ToolEnv): LocalReply | null {
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
const logOf = (env: ToolEnv): MoneyLog | null => env.moneyLog ?? null;
const entriesOf = (env: ToolEnv): readonly MoneyEntry[] => env.moneyLog?.entries ?? [];
const novaOf = (env: ToolEnv) => (env.nova ?? null) as {budgets?: BudgetsRecord | null; budgetPeriods?: BudgetPeriods | null} | null;
const call = (tool: string, args: Record<string, unknown>, label: string) => [{tool, args, label}];
const SPENDING = {en: 'Wealth → Spending', nl: 'Vermogen → Uitgaven'}, BUDGETS = {en: 'Wealth → Budgets', nl: 'Vermogen → Budgetten'};

// ── A refund that lowers its category (#425) ───────────────────────────────────────────────────────────────────────
/** "How much did I get refunded this month", "do refunds count as income", "hoeveel geld heb ik terug gekregen". */
function refunds(a: Asked): LocalReply | null {
  // Review B6Q-14: a refund of ZIGoals, a subscription or a shop's policy is not one of the person's logged refunds.
  const en = /\brefund(?:s|ed)?\b/.test(a.f) && /\b(?:how much|what|which|did i|do|does|count|show|list)\b/.test(a.f) && !/\b(?:tax|interest|passed on|polic(?:y|ies)|subscriptions?|zigoals|app|store|shop|(?:get|request|ask for|claim) a refund)\b/.test(a.f);
  const nl = /\b(?:terugbetaling(?:en)?|terug gekregen|teruggekregen|terugstorting(?:en)?)\b/.test(a.f) && !/\b(?:beleid|voorwaarden|abonnement\w*|zigoals|app|winkel)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const month = a.today.slice(0, 7), {start} = monthOf(a.today), list_ = refundsIn(entriesOf(a.env), start, a.today), calls = call('money_log', {refunds: true}, 'Spending · refunds');
  const how = (lang: Lang) => say(lang, ` A refund lowers its category’s spending and its budget; it is never counted as money received. Log one in ${SPENDING.en} → Log spending → Refund.`, ` Een terugbetaling verlaagt de uitgaven en het budget van zijn categorie; hij telt nooit als inkomsten. Log er een via ${SPENDING.nl} → Log spending → Refund.`);
  if (!list_.length) return answer(say(a.lang, `No refunds logged in ${monthIn('en', month)}.${how('en')}`, `Geen terugbetalingen gelogd in ${monthIn('nl', month)}.${how('nl')}`), calls);
  const by = new Map<string, number>();
  for (const e of list_) by.set(`${e.currency}|${e.category}`, (by.get(`${e.currency}|${e.category}`) ?? 0) + minorUnits(e.amount));
  const rows = (lang: Lang) => [...by].map(([k, c]) => { const [cur, cat] = k.split('|') as [string, string]; return `${cat} ${moneyIn(lang, c, cur)}`; });
  const spent = countedBetween(entriesOf(a.env), start, a.today), totals = (lang: Lang) => [...spent].map(([cur, c]) => moneyIn(lang, c, cur));
  return answer(say(a.lang, `${list_.length} ${list_.length === 1 ? 'refund' : 'refunds'} in ${monthIn('en', month)}: ${list(rows('en'), 'en')}. Spending this month after them: ${list(totals('en'), 'en')}.${how('en')}`,
    `${list_.length} ${list_.length === 1 ? 'terugbetaling' : 'terugbetalingen'} in ${monthIn('nl', month)}: ${list(rows('nl'), 'nl')}. Uitgaven deze maand na aftrek: ${list(totals('nl'), 'nl')}.${how('nl')}`), calls);
}
add(refunds);

// ── Each paycheck's plan (#426) ────────────────────────────────────────────────────────────────────────────────────
/**
 * "What is left of each paycheck", "hoeveel blijft er over van elk salaris". Review B6Q-2: only the plan itself (each
 * paycheck, the paycheck plan, planning the paychecks); "when is my next paycheck", what is left until it and the bills due
 * before it stay with the payday answers (av-answers.ts `payday`, av2-money.ts), which run after this one in engine.ts.
 */
const PAY = String.raw`(?:pay ?checks?|pay ?cheques?)`;
const PLAN_EN = new RegExp(String.raw`\b(?:each|every|per) (?:${PAY}|pay ?day)\b|\b${PAY} plan\b|\bplan (?:for )?(?:my |each |every |the )?${PAY}\b|\bwhat is left of (?:each|every|my) ${PAY}\b|\b${PAY} (?:pays?|covers?|holds?)\b|\bset against (?:a |each |my |the )?${PAY}\b|\b(?:my|the) pay ?(?:checks|cheques)\b`);
const PLAN_NL = /\b(?:elk|ieder|per) (?:salaris|loonstrook)\b|\bsalarisplan\b|\bplan (?:ik )?(?:voor )?(?:mijn |elk |ieder )?salarissen\b|\b(?:mijn )?salarissen (?:plannen|indelen|verdelen)\b|\bwat (?:blijft er|is er) over van (?:elk|ieder|mijn) salaris\b/;
function paychecks(a: Asked): LocalReply | null {
  const en = PLAN_EN.test(a.f) && !/\b(?:fill|next|until|till|when|due)\b/.test(a.f);
  const nl = PLAN_NL.test(a.f) && !/\b(?:volgende|wanneer|tot)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const nova = novaOf(a.env), budgets = nova?.budgets, plan = nova?.budgetPeriods, calls = call('budgets', {paychecks: true}, 'Budgets · each paycheck’s plan');
  const where = (lang: Lang) => say(lang, `${BUDGETS.en} → Paychecks and next month`, `${BUDGETS.nl} → Paychecks and next month`);
  if (!budgets || !plan?.paychecks?.items.length) return answer(say(a.lang, `No paychecks are set up yet. In ${where('en')}, add each paycheck with what it brings in, then set each budget and bill against the one that pays it.`, `Er zijn nog geen salarissen ingesteld. Voeg in ${where('nl')} elk salaris toe met wat het oplevert en zet elk budget en elke rekening tegenover het salaris dat het betaalt.`), calls);
  const m = paycheckMonth(budgets, akOf(a.env).bills ?? null, plan, a.today.slice(0, 7), a.today);
  const rows = (lang: Lang) => m.plans.map(p => `${p.paycheck.name}: ${say(lang, `holds ${moneyIn('en', p.holds, p.paycheck.currency)}, ${moneyIn('en', p.covered, p.paycheck.currency)} set against it, ${p.left >= 0 ? `${moneyIn('en', p.left, p.paycheck.currency)} left` : `${moneyIn('en', -p.left, p.paycheck.currency)} short`}`, `${moneyIn('nl', p.holds, p.paycheck.currency)} binnen, ${moneyIn('nl', p.covered, p.paycheck.currency)} gepland, ${p.left >= 0 ? `${moneyIn('nl', p.left, p.paycheck.currency)} over` : `${moneyIn('nl', -p.left, p.paycheck.currency)} tekort`}`)}`);
  const unset = m.unset.length ? say(a.lang, ` Not set against a paycheck: ${list(m.unset.map(l => l.name), 'en')}.`, ` Nog niet tegenover een salaris: ${list(m.unset.map(l => l.name), 'nl')}.`) : '';
  return answer(say(a.lang, `Your paychecks in ${monthIn('en', m.month)}: ${list(rows('en'), 'en')}.${unset} From your own amounts.`, `Je salarissen in ${monthIn('nl', m.month)}: ${list(rows('nl'), 'nl')}.${unset} Uit je eigen bedragen.`), calls);
}
add(paychecks);

// ── A money streak (#427) ──────────────────────────────────────────────────────────────────────────────────────────
/** "What is my money streak", "hoeveel dagen op rij heb ik naar mijn geld gekeken". */
function streak(a: Asked): LocalReply | null {
  const en = /\bmoney streak\b|\bdays in a row i (?:looked at|checked) my money\b|\bstreak (?:for|of) (?:looking at |checking )?my money\b/.test(a.f);
  const nl = /\bgeldreeks\b|\bdagen op rij\b.*\b(?:geld|financien)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const more = akOf(a.env).moneyMore, calls = call('money_log', {streak: true}, 'Spending · money streak');
  if (!more?.streak?.on) return answer(say(a.lang, `The money streak is off. Turn it on in ${SPENDING.en} → Yesterday’s money: it counts the days in a row you logged an entry, read a bank file or said you looked at your money; never an amount, and a day off is fine.`, `Je reeks voor je geld staat uit. Zet hem aan in ${SPENDING.nl} → Yesterday’s money: hij telt de dagen op rij dat je iets logde, een bankbestand inlas of zei dat je naar je geld keek; nooit een bedrag, en een dag overslaan mag.`), calls);
  const s = moneyStreak(lookedDays(entriesOf(a.env), more.streak.looked), a.today);
  if (!s.days) return answer(say(a.lang, 'No days in a row yet. Each day you log an entry or look at your money counts.', 'Nog geen dagen op rij. Elke dag dat je iets logt of naar je geld kijkt telt.'), calls);
  return answer(say(a.lang, `${s.days} ${s.days === 1 ? 'day' : 'days'} in a row you looked at your money${s.today ? ', today too' : ''}. A day off is fine.`, `${s.days} ${s.days === 1 ? 'dag' : 'dagen'} op rij naar je geld gekeken${s.today ? ', vandaag ook' : ''}. Een dag overslaan mag.`), calls);
}
add(streak);

// ── Next month set aside (#428) ────────────────────────────────────────────────────────────────────────────────────
/** "What did I set aside for next month", "wat heb ik opzij gezet voor volgende maand". */
function aheadAnswer(a: Asked): LocalReply | null {
  const en = /\bset aside for next month\b|\bnext months? budgets? (?:covered|already)\b|\bfund(?:ed)? next month\b/.test(a.f);
  const nl = /\bopzij (?:gezet|zetten) voor volgende maand\b|\bvolgende maand (?:al )?gedekt\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const budgets = novaOf(a.env)?.budgets, month = a.today.slice(0, 7), next = shiftMonth(month, 1), calls = call('budgets', {setAside: true}, 'Budgets · set aside for next month');
  const out = budgets ? setAsideFrom(budgets, month) : new Map<string, number>(), covered = budgets ? coveredIn(budgets, next) : new Map<string, number>();
  if (!budgets || !out.size) return answer(say(a.lang, `Nothing is set aside for ${monthIn('en', next)} yet. In ${BUDGETS.en} → Paychecks and next month, give part of this month’s ready money to next month’s budgets.`, `Er staat nog niets opzij voor ${monthIn('nl', next)}. Geef in ${BUDGETS.nl} → Paychecks and next month een deel van het geld van deze maand aan de budgetten van volgende maand.`), calls);
  const rows = (lang: Lang) => [...covered].map(([id, c]) => { const b = budgets.budgets.find(x => x.id === id)!; return `${b.category} ${moneyIn(lang, c, b.currency)}`; });
  const totals = (lang: Lang) => [...out].map(([cur, c]) => moneyIn(lang, c, cur));
  return answer(say(a.lang, `Set aside for ${monthIn('en', next)}: ${list(totals('en'), 'en')} (${list(rows('en'), 'en')}). It is held this month and covers those budgets then.`, `Opzij gezet voor ${monthIn('nl', next)}: ${list(totals('nl'), 'nl')} (${list(rows('nl'), 'nl')}). Het is deze maand vastgezet en dekt die budgetten dan.`), calls);
}
add(aheadAnswer);

// ── Budgets in your own order (#429) ───────────────────────────────────────────────────────────────────────────────
/** "How do I reorder my budgets", "hoe zet ik mijn budgetten in een andere volgorde". */
function order(a: Asked): LocalReply | null {
  // Review B6Q-13: a reorder word or "my own order", never a bare "order" ("…budget enough to order pizza", "…in order of spending").
  const en = /\bbudgets?\b/.test(a.f) && /\b(?:reorder\w*|rearrang\w*|re order\w*|sort (?:my |the )?budgets|(?:my|its|their|an?) own order|(?:change|set|choose|move|arrange) (?:the |their |my )?order|(?:in|into) (?:a different|another|a new) order)\b/.test(a.f) && !/\bpay\b/.test(a.f);
  const nl = /\bbudgetten\b/.test(a.f) && /\b(?:herschik\w*|ordenen|sorteren|(?:andere|eigen) volgorde|volgorde (?:\w+ ){0,3}(?:aanpassen|veranderen|wijzigen|kiezen|zetten)|(?:verander\w*|wijzig\w*|kies) (?:ik )?(?:de |hun |mijn )?volgorde)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const budgets = novaOf(a.env)?.budgets, calls = call('budgets', {order: true}, 'Budgets · reorder');
  const how = (lang: Lang) => say(lang, `Open ${BUDGETS.en} → Reorder budgets and move each one up or down (or drag it with a mouse); Undo puts the order back.`, `Open ${BUDGETS.nl} → Reorder budgets en zet elk budget hoger of lager (of sleep het met een muis); Ongedaan maken zet de volgorde terug.`);
  if (!budgets?.budgets.length) return answer(say(a.lang, `You have no budgets yet. Once you have two or more: ${how('en')}`, `Je hebt nog geen budgetten. Vanaf twee: ${how('nl')}`), calls);
  const names = budgetsInOrder(budgets.budgets).slice(0, 8).map(b => b.category), own = hasOwnOrder(budgets.budgets);
  return answer(say(a.lang, `${own ? 'Your own order' : 'Now in the usual order (the most spent first in each month)'}${own ? `: ${list(names, 'en')}` : ''}. ${how('en')}`, `${own ? 'Je eigen volgorde' : 'Nu in de gewone volgorde (per maand het meest uitgegeven eerst)'}${own ? `: ${list(names, 'nl')}` : ''}. ${how('nl')}`), calls);
}
add(order);

// ── A check of the money records (#430) ────────────────────────────────────────────────────────────────────────────
/** "Check my money records", "are there duplicate entries in my money log", "controleer mijn geldgegevens". */
function check(a: Asked): LocalReply | null {
  const en = /\bcheck (?:my )?money records\b|\bduplicate (?:entries|transactions)\b|\bmoney records?\b.*\b(?:wrong|broken|health|check)\b|\b(?:wrong|broken)\b.*\bmoney records?\b/.test(a.f);
  const nl = /\bcontroleer (?:mijn )?geld(?:gegevens|administratie)\b|\bdubbele (?:boekingen|invoeren|posten)\b|\bfouten in (?:mijn )?geld(?:gegevens|administratie)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const log = logOf(a.env), calls = call('money_log', {check: true}, 'Spending · check my money records');
  const where = (lang: Lang) => say(lang, `${SPENDING.en} → Check and tidy your money records`, `${SPENDING.nl} → Check and tidy your money records`);
  if (!log?.entries.length) return answer(say(a.lang, `Your money log is empty, so there is nothing to check yet. ${where('en')} checks it once you log entries.`, `Je geldlog is leeg, dus er is nog niets te controleren. ${where('nl')} controleert hem zodra je iets logt.`), calls);
  const issues = checkRecords(log, {budgets: novaOf(a.env)?.budgets ?? null, accountIds: a.env.accounts ? new Set(a.env.accounts.items.map(x => x.id)) : null});
  if (!issues.length) return answer(say(a.lang, `Nothing looks wrong in your money records (${log.entries.length} entries read). ${where('en')} lists anything that does, with repairs you choose.`, `Er lijkt niets mis in je geldgegevens (${log.entries.length} boekingen gelezen). ${where('nl')} toont wat wel mis is, met reparaties die jij kiest.`), calls);
  const kinds = (lang: Lang) => {
    const n = (k: string) => issues.filter(i => i.kind === k).length;
    const words: [string, string, string][] = [['duplicate', 'entries that look the same twice', 'boekingen die dubbel lijken'], ['category', 'a category no longer yours', 'een categorie die niet meer van jou is'], ['sub', 'a lost subcategory', 'een verdwenen subcategorie'], ['split', 'a split that does not add up', 'een splitsing die niet klopt'], ['transfer', 'a transfer missing its other side', 'een overboeking zonder tegenkant'], ['refund-link', 'a refund naming a purchase that is gone', 'een terugbetaling bij een verdwenen aankoop'], ['account', 'notes kept for an account that is gone', 'notities van een verdwenen rekening'], ['budget', 'a budget of a category no longer offered', 'een budget van een categorie die niet meer wordt aangeboden']];
    return words.filter(([k]) => n(k)).map(([k, e, d]) => `${n(k)} × ${lang === 'nl' ? d : e}`);
  };
  return answer(say(a.lang, `The check finds ${issues.length} ${issues.length === 1 ? 'thing' : 'things'} to look at: ${list(kinds('en'), 'en')}. Nothing changes until you choose a repair in ${where('en')}; each has Undo.`, `De controle vindt ${issues.length} ${issues.length === 1 ? 'punt' : 'punten'}: ${list(kinds('nl'), 'nl')}. Er verandert niets tot je een reparatie kiest in ${where('nl')}; elke reparatie kun je terugdraaien met Ongedaan maken.`), calls);
}
add(check);

// ── Put old entries away (#431) ────────────────────────────────────────────────────────────────────────────────────
/** "How do I put old entries away", "which years did I put away", "hoe berg ik oude boekingen op". */
function putAway(a: Asked): LocalReply | null {
  const en = /\bput (?:old )?(?:entries|years?|transactions) away\b|\bput away (?:old )?(?:entries|years?|transactions)\b|\bwhich years? (?:did i |have i )?put away\b|\barchive (?:old )?(?:money )?(?:entries|transactions)\b/.test(a.f);
  const nl = /\b(?:oude )?(?:boekingen|jaren|invoeren) op ?(?:bergen|geborgen)\b|\bberg (?:ik )?oude (?:boekingen|jaren|invoeren) op\b|\bopgeborgen\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const log = logOf(a.env), away = log ? readableYears(log) : [], years = log ? pastYears(log, a.today) : [], calls = call('money_log', {putAway: true}, 'Spending · put old entries away');
  const where = (lang: Lang) => say(lang, `${SPENDING.en} → Check and tidy your money records → Put old entries away`, `${SPENDING.nl} → Check and tidy your money records → Put old entries away`);
  const awayWords = (lang: Lang) => away.length ? say(lang, ` Put away now: ${list(away.map(y => `${y.year} (${y.entries.length} ${y.entries.length === 1 ? 'entry' : 'entries'})`), 'en')}; Bring back returns them.`, ` Nu opgeborgen: ${list(away.map(y => `${y.year} (${y.entries.length} ${y.entries.length === 1 ? 'boeking' : 'boekingen'})`), 'nl')}; Bring back haalt ze terug.`) : '';
  const can = (lang: Lang) => years.length ? say(lang, ` Years you can put away: ${list(years.map(y => `${y.year} (${y.count})`), 'en')}.`, ` Jaren die je kunt opbergen: ${list(years.map(y => `${y.year} (${y.count})`), 'nl')}.`) : say(lang, ` Only years before ${a.today.slice(0, 4)} can be put away; there are none yet.`, ` Alleen jaren vóór ${a.today.slice(0, 4)} kunnen worden opgeborgen; die zijn er nog niet.`);
  return answer(say(a.lang, `In ${where('en')}, a past year’s entries leave your lists and figures and are kept as they were; nothing is deleted.${awayWords('en')}${can('en')}`, `In ${where('nl')} verdwijnen de boekingen van een voorbij jaar uit je lijsten en cijfers en blijven ze bewaard zoals ze waren; er wordt niets verwijderd.${awayWords('nl')}${can('nl')}`), calls);
}
add(putAway);
