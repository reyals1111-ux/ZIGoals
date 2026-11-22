import type {MoneyEntry} from '../../money-log/schema';
import type {Accounts} from '../../accounts/schema';
import {yesterdayMoney} from '../../money-log/yesterday';
import {yearSoFar} from '../../budgets/year-so-far';
import type {BudgetsRecord} from '../../budgets/schema';
import {MATCH_DAYS, monthMatches} from '../../bills/month';
import type {NotifyPrefs} from '../../notify/prefs';
import {typeOn} from '../../notify/prefs';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, dayIn, isQuestion, list, MIXED, moneyIn, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2, round 5 (money; Tiller, PocketSmith): the on-device answers to round 5's money features, in English
 * and Dutch, each read from the feature's own pure function (the figures its page shows) and only while Wealth is shared.
 * Every spending and income figure comes from the shared rule in lib/money-log/counted.ts (`countedBetween` and its kin)
 * or Wealth → Spending's `totals` / `byCategory`, through each feature's function, so NOVA, ZIGi and the pages say the
 * same amounts. A Dutch answer writes money the Dutch way ("€ 12,50") and its days and months as Dutch words. No money
 * advice: figures and plain words only. The lead wires `av2R5MoneyAnswer` into lib/ai/local-answers/engine.ts before
 * `av2R4MoneyAnswer`; lib/ai/local-answers/av2-r5-money.test.ts proves it claims none of the earlier corpus questions nor
 * round 4's. Null when the question is not one of these.
 */
export function av2R5MoneyAnswer(question: string, env: ToolEnv): LocalReply | null {
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
const entriesOf = (env: ToolEnv): readonly MoneyEntry[] => env.moneyLog?.entries ?? [];
const accountsOf = (env: ToolEnv): Accounts | null => env.accounts ?? null;
type Ak = {notifyPrefs?: NotifyPrefs | null; bills?: import('../../bills/schema').BillsRecord | null; moneyRules?: import('../../money-rules/schema').MoneyRules | null; moneyMore?: import('../../money-more/schema').MoneyMore | null};
export const akOf = (env: ToolEnv): Ak => (env.ak ?? {}) as Ak;
const call = (tool: string, args: Record<string, unknown>, label: string) => [{tool, args, label}];
export const PLACES = {
  spending: {en: 'Wealth → Spending', nl: 'Vermogen → Uitgaven'},
  budgets: {en: 'Wealth → Budgets', nl: 'Vermogen → Budgetten'},
  bills: {en: 'Wealth → Upcoming bills → Bill tracker', nl: 'Vermogen → Komende rekeningen → Bill tracker'},
  accounts: {en: 'Wealth → Accounts', nl: 'Vermogen → Rekeningen'},
  forecast: {en: 'Wealth → Spending → Money tools → Next 60 days', nl: 'Vermogen → Uitgaven → Money tools → Next 60 days'},
} as const;

// ── Yesterday's money (#384) ───────────────────────────────────────────────────────────────────────────────────────
/** "What was yesterday's money", "wat was mijn geld van gisteren". */
function yesterday(a: Asked): LocalReply | null {
  const en = /\byesterdays money\b|\bmoney (?:summary )?(?:for|of|from) yesterday\b|\byesterdays? money summary\b|\bsummary of (?:my )?money (?:for |from )?yesterday\b/.test(a.f);
  const nl = /\bgeld van gisteren\b|\bgeldoverzicht van gisteren\b|\bsamenvatting van (?:mijn )?geld (?:van )?gisteren\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const d = yesterdayMoney(entriesOf(a.env), accountsOf(a.env), a.today), calls = call('money_log', {day: d.day}, 'Spending · yesterday’s money');
  const when = (lang: Lang) => dayIn(lang, d.day, a.today);
  const prefs = akOf(a.env).notifyPrefs, on = prefs ? typeOn(prefs, 'moneyMorning') : false;
  const tail = (lang: Lang) => on ? say(lang, ' Your morning notification says it too.', ' Je ochtendmelding zegt het ook.')
    : say(lang, ` ${PLACES.spending.en} → Yesterday’s money can send it each morning, or show it on Today.`, ` ${PLACES.spending.nl} → Yesterday’s money kan het elke ochtend sturen, of op Vandaag tonen.`);
  const figures = (lang: Lang) => d.byCurrency.map(c => say(lang, `spent ${moneyIn('en', c.spent, c.currency)}${c.received ? `, received ${moneyIn('en', c.received, c.currency)}` : ''}`, `${moneyIn('nl', c.spent, c.currency)} uitgegeven${c.received ? `, ${moneyIn('nl', c.received, c.currency)} ontvangen` : ''}`));
  const balances = (lang: Lang) => d.balances.map(b => `${b.name} ${moneyIn(lang, b.cents, b.currency)}`);
  const count = (lang: Lang) => say(lang, `${d.entries} ${d.entries === 1 ? 'entry' : 'entries'}`, `${d.entries} ${d.entries === 1 ? 'invoer' : 'invoeren'}`);
  if (!d.entries && !d.byCurrency.length) return answer(say(a.lang, `Nothing was logged for ${when('en')}.${balances('en').length ? ` Your cash and savings: ${list(balances('en'), 'en')}.` : ''}${tail('en')}`,
    `Voor ${when('nl')} is niets gelogd.${balances('nl').length ? ` Je contant geld en spaargeld: ${list(balances('nl'), 'nl')}.` : ''}${tail('nl')}`), calls);
  return answer(say(a.lang, `${when('en')}: ${count('en')}${figures('en').length ? `, ${list(figures('en'), 'en')}` : ''}.${balances('en').length ? ` Cash and savings: ${list(balances('en'), 'en')}.` : ''} Counted as Spending counts it.${tail('en')}`,
    `${when('nl')}: ${count('nl')}${figures('nl').length ? `, ${list(figures('nl'), 'nl')}` : ''}.${balances('nl').length ? ` Contant en spaargeld: ${list(balances('nl'), 'nl')}.` : ''} Geteld zoals Uitgaven telt.${tail('nl')}`), calls);
}
add(yesterday);

// ── This year so far against the budgets (#385) ────────────────────────────────────────────────────────────────────
const budgetsOf = (env: ToolEnv): BudgetsRecord | null => (env.nova as {budgets?: BudgetsRecord | null} | null | undefined)?.budgets ?? null;
/** "How are my budgets doing this year so far", "hoe staan mijn budgetten dit jaar tot nu toe". */
function yearBudgets(a: Asked): LocalReply | null {
  const en = /\bbudgets?\b/.test(a.f) && /\b(?:this year so far|so far this year|year to date|ytd)\b/.test(a.f);
  const nl = /\bbudget(?:ten)?\b/.test(a.f) && /\bdit jaar\b/.test(a.f) && /\btot nu toe\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const data = yearSoFar(budgetsOf(a.env), entriesOf(a.env), a.today), calls = call('budgets', {year: data.year}, 'Budgets · this year so far');
  if (!data.rows.length) return answer(say(a.lang, `No budgets yet. Once you set one in ${PLACES.budgets.en}, each month of ${data.year} adds up beside what you spent, under "${data.year} so far against your budgets".`,
    `Nog geen budgetten. Zodra je er een instelt in ${PLACES.budgets.nl}, telt elke maand van ${data.year} op naast wat je uitgaf, onder "${data.year} so far against your budgets".`), calls);
  const diff = (lang: Lang, d: number, currency: string) => d === 0 ? say(lang, 'exactly on budget', 'precies op budget') : say(lang, `${moneyIn('en', Math.abs(d), currency)} ${d > 0 ? 'under' : 'over'}`, `${moneyIn('nl', Math.abs(d), currency)} ${d > 0 ? 'onder' : 'boven'} budget`);
  const totals = (lang: Lang) => data.totals.map(t => say(lang, `${moneyIn('en', t.spent, t.currency)} spent against ${moneyIn('en', t.budgeted, t.currency)} budgeted, ${diff('en', t.difference, t.currency)} so far`,
    `${moneyIn('nl', t.spent, t.currency)} uitgegeven tegenover ${moneyIn('nl', t.budgeted, t.currency)} gebudgetteerd, tot nu toe ${diff('nl', t.difference, t.currency)}`));
  const rows = (lang: Lang) => data.rows.slice(0, 5).map(r => `${r.category} ${diff(lang, r.difference, r.currency)}`);
  return answer(say(a.lang, `${data.year} so far: ${list(totals('en'), 'en')}. By budget: ${list(rows('en'), 'en')}${data.rows.length > 5 ? ` and ${data.rows.length - 5} more` : ''}. Each month's budget beside what was spent, counted as your budgets count it; it is in ${PLACES.budgets.en} → "${data.year} so far against your budgets".`,
    `${data.year} tot nu toe: ${list(totals('nl'), 'nl')}. Per budget: ${list(rows('nl'), 'nl')}${data.rows.length > 5 ? ` en nog ${data.rows.length - 5}` : ''}. Het budget van elke maand naast wat je uitgaf, geteld zoals je budgetten tellen; het staat in ${PLACES.budgets.nl} → "${data.year} so far against your budgets".`), calls);
}
add(yearBudgets);

// ── A bill paid early (#386) ───────────────────────────────────────────────────────────────────────────────────────
/** "Did I pay any bill early", "welke rekeningen zijn te vroeg afgeschreven". */
function paidEarly(a: Asked): LocalReply | null {
  const en = /\bbills?\b/.test(a.f) && /\bpa(?:y|id)\b/.test(a.f) && /\bearly\b|\bahead of (?:its|the|their) (?:date|due date|day)s?\b/.test(a.f);
  const nl = /\brekening(?:en)?\b/.test(a.f) && /\b(?:vroeg|eerder)\b/.test(a.f) && /\bafgeschreven\b|\bging(?:en)?\b.*\baf\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const record = akOf(a.env).bills, calls = call('bills', {month: a.today.slice(0, 7), early: true}, 'Bills · paid early');
  if (!record?.bills.length) return answer(say(a.lang, `No bills are tracked yet. Add one in ${PLACES.bills.en.replace(' → Bill tracker', '')}; a date that passes without its payment then offers "Paid early?".`,
    `Er worden nog geen rekeningen bijgehouden. Voeg er een toe in ${PLACES.bills.nl.replace(' → Bill tracker', '')}; een datum die voorbijgaat zonder betaling biedt dan "Paid early?".`), calls);
  const entries = entriesOf(a.env), byId = new Map(entries.map(e => [e.id, e])), {lines, matched} = monthMatches(record, entries, a.today);
  const early = lines.flatMap(l => { const e = byId.get(matched.get(`${l.billId}|${l.due}`) ?? ''); return e && Math.round((Date.parse(`${l.due}T12:00:00Z`) - Date.parse(`${e.date}T12:00:00Z`)) / 86_400_000) > MATCH_DAYS ? [{l, e}] : []; });
  const passed = lines.filter(l => l.state === 'passed');
  const item = (lang: Lang, x: typeof early[number]) => say(lang, `${x.l.title} (due ${dayIn('en', x.l.due, a.today)}, paid ${dayIn('en', x.e.date, a.today)}, ${moneyIn('en', x.l.cents, x.l.currency)})`, `${x.l.title} (vervaldag ${dayIn('nl', x.l.due, a.today)}, betaald ${dayIn('nl', x.e.date, a.today)}, ${moneyIn('nl', x.l.cents, x.l.currency)})`);
  const rest = (lang: Lang) => passed.length ? say(lang, ` ${passed.length} ${passed.length === 1 ? 'date has' : 'dates have'} passed without a payment in your money log: "Paid early?" beside ${passed.length === 1 ? 'it' : 'each'} in ${PLACES.bills.en} lists the expenses of the days before.`,
    ` ${passed.length} ${passed.length === 1 ? 'datum is' : 'data zijn'} voorbij zonder betaling in je uitgavenlog: "Paid early?" ernaast in ${PLACES.bills.nl} toont de uitgaven van de dagen ervoor.`) : '';
  if (!early.length) return answer(say(a.lang, `No bill this month was paid more than ${MATCH_DAYS} days early, as your money log shows it.${rest('en')}`, `Deze maand is geen rekening meer dan ${MATCH_DAYS} dagen te vroeg betaald, volgens je uitgavenlog.${rest('nl')}`), calls);
  return answer(say(a.lang, `Paid early this month: ${list(early.map(x => item('en', x)), 'en')}.${rest('en')}`, `Deze maand vroeg betaald: ${list(early.map(x => item('nl', x)), 'nl')}.${rest('nl')}`), calls);
}
add(paidEarly);
