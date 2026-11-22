import type {MoneyEntry} from '../../money-log/schema';
import type {Accounts} from '../../accounts/schema';
import {yesterdayMoney} from '../../money-log/yesterday';
import {yearSoFar} from '../../budgets/year-so-far';
import type {BudgetsRecord} from '../../budgets/schema';
import {MATCH_DAYS, monthMatches} from '../../bills/month';
import {mergeTargets} from '../../money-log/merge-accounts';
import {cashForecast, forecastDays, plannedContributions, type KnownForecast} from '../../cash-forecast/model';
import {plannedForForecast} from '../../cash-forecast/planned';
import {withChanges} from '../../cash-forecast/what-if';
import type {MoneyMore} from '../../money-more/schema';
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

// ── Merge two accounts (#387) ──────────────────────────────────────────────────────────────────────────────────────
/** "How do I merge two accounts", "hoe voeg ik twee rekeningen samen". */
function mergeAccounts(a: Asked): LocalReply | null {
  const en = /\bmerge\b.*\baccounts?\b|\baccounts?\b.*\bmerge\b|\bcombine (?:two |my )?accounts\b/.test(a.f);
  const nl = /\b(?:samenvoegen|voeg(?:en)?\b.*\bsamen)\b/.test(a.f) && /\brekening(?:en)?\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const accounts = accountsOf(a.env), calls = call('accounts', {merge: true}, 'Accounts · merge two');
  const seen = new Set<string>(), pairs: string[] = [];
  for (const x of accounts?.items ?? []) { if (x.archivedAt) continue; for (const y of mergeTargets(accounts!, x.id)) { const k = [x.id, y.id].sort().join('|'); if (!seen.has(k)) { seen.add(k); pairs.push(`${x.name} ${say(a.lang, 'and', 'en')} ${y.name} (${x.currency})`); } } }
  const how = say(a.lang, `In ${PLACES.accounts.en}, tap "Merge two" beside What you own or What you owe, choose the account to merge and the one it goes into, see what moves, then merge: its balances, a debt's payments, its note and its money-log entries go to the other, exact doubles are offered for removal, and the one merged is archived with its own history. Undo puts it all back.`,
    `In ${PLACES.accounts.nl} tik je op "Merge two" bij What you own of What you owe, kies je de rekening om samen te voegen en die waar hij in gaat, zie je wat er verhuist en voeg je samen: saldi, betalingen op een schuld, de notitie en de invoer in je uitgavenlog gaan naar de andere, exacte dubbelen kun je weghalen, en de samengevoegde wordt gearchiveerd met zijn eigen geschiedenis. Ongedaan maken zet alles terug.`);
  if (!pairs.length) return answer(say(a.lang, `No two of your accounts can be merged now: they need the same currency and both be owned or both owed. ${how}`, `Er zijn nu geen twee rekeningen die je kunt samenvoegen: ze moeten dezelfde munt hebben en allebei bezit of allebei schuld zijn. ${how}`), calls);
  return answer(say(a.lang, `These could be merged: ${list(pairs.slice(0, 5), 'en')}${pairs.length > 5 ? ` and ${pairs.length - 5} more` : ''}. ${how}`, `Deze kun je samenvoegen: ${list(pairs.slice(0, 5), 'nl')}${pairs.length > 5 ? ` en nog ${pairs.length - 5}` : ''}. ${how}`), calls);
}
add(mergeAccounts);

// ── Try a change on the forecast (#388) ────────────────────────────────────────────────────────────────────────────
const moreOf = (env: ToolEnv): MoneyMore | null => (env as ToolEnv & {moneyMore?: MoneyMore | null}).moneyMore ?? akOf(env).moneyMore ?? null;
/** "What changes have I tried on my forecast", "welke wijzigingen heb ik op mijn prognose geprobeerd". */
function whatIfs(a: Asked): LocalReply | null {
  const en = /\bwhat ifs?\b|\bscenarios?\b|\bchanges?\b.*\btried\b|\btried\b.*\bchanges?\b|\btry a change\b/.test(a.f) && /\bforecast\b|\bwhat ifs?\b|\bscenarios?\b|\btry a change\b/.test(a.f);
  const nl = /\bwat als\b|\bscenarios?\b|\bwijziging(?:en)?\b.*\bgeprobeerd\b/.test(a.f) && /\bprognose\b|\bwat als\b|\bscenarios?\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const kept = moreOf(a.env)?.whatIfs ?? [], calls = call('cash_forecast', {whatIfs: kept.length}, 'Cash forecast · try a change');
  if (!kept.length) return answer(say(a.lang, `No changes are kept. Under ${PLACES.forecast.en} → "Try a change — a model", try up to three made-up changes (a higher rent, a trip, more pay each month) beside your forecast; they are never written as entries or bills, and you can keep them by name.`,
    `Er zijn geen wijzigingen bewaard. Onder ${PLACES.forecast.nl} → "Try a change — a model" probeer je tot drie verzonnen wijzigingen (een hogere huur, een reis, meer loon per maand) naast je prognose; ze worden nooit als invoer of rekening opgeslagen, en je kunt ze bewaren onder een naam.`), calls);
  const days = forecastDays('12m', a.today), goals = a.env.areas.goals ? plannedContributions(a.env.platform.goals) : [];
  const rows = a.env.accounts && akOf(a.env).bills ? cashForecast({accounts: a.env.accounts, bills: akOf(a.env).bills!, entries: entriesOf(a.env), ...(a.env.nova?.budgets ? {budgets: a.env.nova.budgets} : {}), contributions: goals, planned: plannedForForecast(moreOf(a.env), entriesOf(a.env), a.today), today: a.today, days}).rows.filter((r): r is KnownForecast => r.known) : [];
  const one = (lang: Lang, w: typeof kept[number]) => {
    const row = rows.find(r => r.currency === w.currency), count = say(lang, `${w.changes.length} ${w.changes.length === 1 ? 'change' : 'changes'}`, `${w.changes.length} ${w.changes.length === 1 ? 'wijziging' : 'wijzigingen'}`);
    if (!row) return say(lang, `"${w.name}" (${count}, ${w.currency}: no forecast line in ${w.currency})`, `"${w.name}" (${count}, ${w.currency}: geen prognose in ${w.currency})`);
    const t = withChanges(row, w.changes);
    return say(lang, `"${w.name}" (${count}): lowest about ${moneyIn('en', Number(t.lowest.cents), w.currency)} around ${dayIn('en', t.lowest.date, a.today)}, against ${moneyIn('en', Number(row.lowest.cents), w.currency)} without`,
      `"${w.name}" (${count}): het laagst ongeveer ${moneyIn('nl', Number(t.lowest.cents), w.currency)} rond ${dayIn('nl', t.lowest.date, a.today)}, tegenover ${moneyIn('nl', Number(row.lowest.cents), w.currency)} zonder`);
  };
  return answer(say(a.lang, `Kept changes, over the next 12 months: ${list(kept.map(w => one('en', w)), 'en')}. A model from your own records, not a plan; nothing is written to your records.`,
    `Bewaarde wijzigingen, de komende 12 maanden: ${list(kept.map(w => one('nl', w)), 'nl')}. Een model uit je eigen gegevens, geen plan; er wordt niets in je gegevens gezet.`), calls);
}
add(whatIfs);
