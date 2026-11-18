import {dayWords, periodWords, type Period} from '../../ai/local-answers/exact/period';
import {listWords} from '../../ai/local-answers/exact/text';
import {trackAnswer} from '../../ai/local-answers/exact/track';
import {ledger} from '../../ai/local-answers/exact/money';
import {formatPercent} from '../../visual-format';
import {widgetPeriod} from '../cards/ax/calendar';
import {goalDates, goalOrbits, savingsJars} from '../cards/ax/goals-views';
import {billDial, billGrid, billTimeline, BILL_DAYS} from '../cards/ax/money-bills';
import {HEAT_WEEKS, axMoney, axPlain, cashRiver, categoryRanks, savingsRate, spendTrack, spendingCompare, spendingHeat, spendingRadar, type FlowKind} from '../cards/ax/money-spend';
import {budgetGauges, debtRanks, netWorthRiver} from '../cards/ax/money-worth';
import {focusGoal} from '../cards/goal-focus';
import {historyMoney} from '../cards/net-worth-history';
import type {WidgetParams} from '../stage/record';
import type {AxLine} from './ax-lines';
import type {LineData, LineLang} from './lines';

/**
 * Session AS (ADR-042 Part 2): the lines of the answer widgets of this group, each from its widget's own selector
 * (lib/nova/cards/ax/money-*.ts, goals-views.ts), so the line under the star and the figure on the widget are one
 * count. A line states what the records hold: an amount in its own currency, a share as a whole percent, a date in
 * words; nothing is projected, and a goal's pace is the goal's own word for it. `null`: the record was not read.
 */
const say = (lang: LineLang, en: string, nl: string) => lang === 'nl' ? nl : en;
const period = (params: WidgetParams | undefined, d: LineData, fallback: string): Period => widgetPeriod(params?.period, d.day, fallback);
const NONE: Record<FlowKind, [string, string]> = {expense: ['No spending logged yet.', 'Nog geen uitgaven gelogd.'], income: ['No income logged yet.', 'Nog geen inkomsten gelogd.']};
const QUIET: Record<FlowKind, [string, string]> = {expense: ['Nothing logged as spent', 'Niets als uitgegeven gelogd'], income: ['No income logged', 'Geen inkomsten gelogd']};
const VERB: Record<FlowKind, [string, string]> = {expense: ['spent', 'uitgegeven'], income: ['came in', 'binnengekomen']};
const pick = (pair: [string, string], lang: LineLang) => pair[lang === 'nl' ? 1 : 0];
const NO_BILLS = (lang: LineLang) => say(lang, 'No bill reminders yet.', 'Nog geen rekeningen als herinnering.');
const NO_GOALS = (lang: LineLang) => say(lang, 'You have no goals yet.', 'Je hebt nog geen doelen.');
const dueNl = (days: number) => days === 0 ? 'vandaag' : days === 1 ? 'morgen' : days > 1 ? `over ${days} dagen` : `${-days} ${days === -1 ? 'dag' : 'dagen'} te laat`;
const PACE_NL: Record<string, string> = {'Ahead of plan': 'voor op schema', 'On track': 'op schema', 'Behind plan': 'achter op schema', 'No plan yet': 'nog geen plan', 'Needs a look': 'vraagt aandacht', Reached: 'gehaald', Closed: 'gesloten'};

const ranks = (kind: FlowKind): AxLine => (params, d, lang) => {
  if (!d.moneyLog) return null;
  const p = period(params, d, 'this-month'), view = categoryRanks(d.moneyLog.entries, kind, p), words = periodWords(p, lang, d.day);
  if (view.state === 'empty') return pick(NONE[kind], lang);
  if (view.state === 'quiet') return `${pick(QUIET[kind], lang)} ${words}.`;
  const top = listWords(view.rows.slice(0, 3).map(r => `${r.label} (${r.percent})`), lang);
  return kind === 'income' ? say(lang, `${view.total} came in ${words}; most from ${top}.`, `${view.total} binnengekomen ${words}; het meest uit ${top}.`) : say(lang, `${view.total} spent ${words}; most on ${top}.`, `${view.total} uitgegeven ${words}; het meest aan ${top}.`);
};
export const AX_MONEY_LINES: Readonly<Record<string, AxLine>> = {
  'spending-ranks': ranks('expense'),
  'income-ranks': ranks('income'),
  'debt-ranks': (_params, d, lang) => {
    if (!d.accounts) return null;
    const view = debtRanks(d.accounts, d.day), lead = view.rows[0];
    if (view.state === 'empty') return say(lang, 'No debt is kept on Wealth.', 'Er staat geen schuld bij Wealth.');
    if (!lead) return say(lang, 'Your debts have no balance entered yet.', 'Je schulden hebben nog geen saldo.');
    return view.rows.length === 1 ? say(lang, `${view.total} owed, on ${lead.label}.`, `${view.total} schuld, op ${lead.label}.`)
      : say(lang, `${view.total} owed across ${view.rows.length} debts; the largest is ${lead.label} (${lead.text}).`, `${view.total} aan schulden, over ${view.rows.length} schulden; de grootste is ${lead.label} (${lead.text}).`);
  },
  'spending-radar': (params, d, lang) => {
    if (!d.moneyLog) return null;
    const p = period(params, d, 'this-month'), view = spendingRadar(d.moneyLog.entries, p, d.day), words = periodWords(p, lang, d.day), lead = view.spokes[0];
    if (view.state === 'empty') return pick(NONE.expense, lang);
    if (view.state === 'quiet' || !lead) return `${pick(QUIET.expense, lang)} ${words}.`;
    const before = view.beforeTotal ? say(lang, `${view.beforeTotal} in the period before`, `${view.beforeTotal} in de periode ervoor`) : say(lang, 'nothing logged in the period before', 'in de periode ervoor is niets gelogd');
    return say(lang, `${view.total} spent ${words}, most on ${lead.label} (${lead.percent}); ${before}.`, `${view.total} uitgegeven ${words}, het meest aan ${lead.label} (${lead.percent}); ${before}.`);
  },
  'spending-days': (params, d, lang) => {
    if (!d.moneyLog) return null;
    const entries = d.moneyLog.entries, p = period(params, d, 'this-month');
    if (!entries.some(e => e.kind === 'expense')) return pick(NONE.expense, lang);
    const track = spendTrack(entries, d.day, ledger(entries, 'expense', p).currency);
    return trackAnswer({domain: 'spending', ask: 'done', shape: 'count', lang, period: p.token, weekday: null, subject: null, read: ''}, lang === 'nl' ? {...track, name: 'Uitgaven'} : track, d.day)?.text ?? null;
  },
  'bill-calendar': (_params, d, lang) => {
    if (!d.bills) return null;
    const view = billGrid(d.bills, d.day), n = view.due.length, next = view.next, sums = listWords(view.totals.map(t => t.text), lang);
    if (view.state === 'empty' || !next) return NO_BILLS(lang);
    const then = say(lang, `the next is ${next.title} on ${next.date}`, `de eerstvolgende is ${next.title} op ${next.date}`);
    return n ? say(lang, `${n} ${n === 1 ? 'bill falls' : 'bills fall'} due in the next ${BILL_DAYS} days (${sums}); ${then}.`, `${n} ${n === 1 ? 'rekening vervalt' : 'rekeningen vervallen'} in de komende ${BILL_DAYS} dagen (${sums}); ${then}.`)
      : say(lang, `No bill falls due in the next ${BILL_DAYS} days; ${then}.`, `Geen rekening vervalt in de komende ${BILL_DAYS} dagen; ${then}.`);
  },
  'spending-heat': (_params, d, lang) => {
    if (!d.moneyLog) return null;
    const view = spendingHeat(d.moneyLog.entries, d.day), peak = view.peak;
    if (view.state === 'empty') return pick(NONE.expense, lang);
    if (view.state === 'quiet' || !peak) return say(lang, `Nothing logged as spent in the last ${HEAT_WEEKS} weeks.`, `Niets als uitgegeven gelogd in de afgelopen ${HEAT_WEEKS} weken.`);
    return say(lang, `${view.total} spent in the last ${HEAT_WEEKS} weeks, on ${view.daysWith} of ${view.days} days; the largest day was ${dayWords(peak.date, d.day)} (${peak.text}).`,
      `${view.total} uitgegeven in de afgelopen ${HEAT_WEEKS} weken, op ${view.daysWith} van ${view.days} dagen; de grootste dag was ${dayWords(peak.date, d.day)} (${peak.text}).`);
  },
  'cash-river': (params, d, lang) => {
    if (!d.moneyLog) return null;
    const p = period(params, d, 'last-90-days'), view = cashRiver(d.moneyLog.entries, p), words = periodWords(p, lang, d.day), net = view.netCents, cur = view.currency;
    if (view.state === 'empty') return say(lang, 'Nothing logged yet.', 'Nog niets gelogd.');
    if (view.state === 'quiet' || !cur) return say(lang, `Nothing logged ${words}.`, `Niets gelogd ${words}.`);
    if (net === null) return view.incomeCents === null ? say(lang, `${view.spending} spent ${words}; no income logged.`, `${view.spending} uitgegeven ${words}; geen inkomsten gelogd.`) : say(lang, `${view.income} came in ${words}; nothing logged as spent.`, `${view.income} binnengekomen ${words}; niets als uitgegeven gelogd.`);
    const gap = net === 0 ? say(lang, 'as much in as out', 'evenveel in als uit') : say(lang, `${axMoney(Math.abs(net), cur)} more ${net > 0 ? 'in than out' : 'out than in'}`, `${axMoney(Math.abs(net), cur)} meer ${net > 0 ? 'in dan uit' : 'uit dan in'}`);
    return say(lang, `${view.income} came in and ${view.spending} went out ${words}: ${gap}.`, `${view.income} binnengekomen en ${view.spending} uitgegeven ${words}: ${gap}.`);
  },
  'net-worth-river': (params, d, lang) => {
    if (!d.networthHistory) return null;
    const p = period(params, d, 'last-90-days'), words = periodWords(p, lang, d.day);
    let view: ReturnType<typeof netWorthRiver>;
    try { view = netWorthRiver(d.networthHistory, p, d.day); } catch { return null; }
    const known = view.latestKnown, cur = view.currency ?? '', change = view.change;
    if (view.state === 'empty') return say(lang, 'No day of net worth is recorded yet.', 'Er is nog geen dag vermogen vastgelegd.');
    if (view.state === 'quiet' || !known) return say(lang, `No net worth was recorded ${words}.`, `Er is geen vermogen vastgelegd ${words}.`);
    const head = say(lang, `Net worth ${historyMoney(known.cents, cur)} on ${dayWords(known.day, d.day)}`, `Nettovermogen ${historyMoney(known.cents, cur)} op ${dayWords(known.day, d.day)}`);
    if (!change) return say(lang, `${head}; one recorded day ${words}, so no change to state.`, `${head}; één vastgelegde dag ${words}, dus nog geen verandering.`);
    if (change.direction === 'flat') return say(lang, `${head}; no change since ${dayWords(change.since, d.day)}.`, `${head}; geen verandering sinds ${dayWords(change.since, d.day)}.`);
    const size = historyMoney(change.cents < 0n ? -change.cents : change.cents, cur), share = change.percent === null ? '' : ` (${formatPercent(Math.abs(change.percent))})`, up = change.direction === 'up';
    return say(lang, `${head}; ${up ? 'up' : 'down'} ${size}${share} since ${dayWords(change.since, d.day)}.`, `${head}; ${size}${share} ${up ? 'hoger' : 'lager'} dan op ${dayWords(change.since, d.day)}.`);
  },
  'budget-gauges': (_params, d, lang) => {
    if (!d.budgets || !d.moneyLog) return null;
    const view = budgetGauges(d.budgets, d.moneyLog.entries, d.day), lead = view.gauges[0];
    if (view.state === 'empty' || !lead) return say(lang, 'You have no budgets yet.', 'Je hebt nog geen budgetten.');
    const head = say(lang, `${view.within} of ${view.count} ${view.count === 1 ? 'budget' : 'budgets'} within plan this month`, `${view.within} van ${view.count} ${view.count === 1 ? 'budget' : 'budgetten'} binnen plan deze maand`);
    return lead.over ? say(lang, `${head}; ${lead.label} is ${lead.words} (${lead.spent} of ${lead.available}).`, `${head}; ${lead.label} is overschreden (${lead.spent} van ${lead.available}).`)
      : say(lang, `${head}; ${lead.label} is the fullest at ${lead.percent} (${lead.spent} of ${lead.available}).`, `${head}; ${lead.label} is het volst, op ${lead.percent} (${lead.spent} van ${lead.available}).`);
  },
  'savings-rate': (params, d, lang) => {
    if (!d.moneyLog) return null;
    const p = period(params, d, 'this-month'), view = savingsRate(d.moneyLog.entries, p), words = periodWords(p, lang, d.day);
    if (view.state === 'empty') return say(lang, 'Nothing logged yet.', 'Nog niets gelogd.');
    if (view.state === 'no-income') return say(lang, `No income is logged ${words}, so there is no share to state.`, `Er zijn geen inkomsten gelogd ${words}, dus er is geen aandeel te noemen.`);
    if (view.state === 'no-spending' || view.rate === null) return say(lang, `${view.income} came in ${words}; nothing is logged as spent, so there is no share to state.`, `${view.income} binnengekomen ${words}; er is niets als uitgegeven gelogd, dus er is geen aandeel te noemen.`);
    return view.keptCents! < 0 ? say(lang, `${view.spending} went out and ${view.income} came in ${words}: ${view.kept} more out than in.`, `${view.spending} uitgegeven en ${view.income} binnengekomen ${words}: ${view.kept} meer uit dan in.`)
      : say(lang, `${view.percent} of the income logged ${words} was not spent: ${view.income} in, ${view.spending} out.`, `${view.percent} van de inkomsten ${words} is niet uitgegeven: ${view.income} in, ${view.spending} uit.`);
  },
  'goal-gauge': (params, d, lang) => {
    if (!d.goals) return null;
    const goal = focusGoal(d.goals.summaries, d.goals.arcs, params?.ref, d.goals.leadHref);
    if (!goal) return NO_GOALS(lang);
    const name = axPlain(goal.name), saved = goal.saved && / of /.test(goal.saved) ? goal.saved : null;
    return say(lang, `${name}: ${goal.text} reached${saved ? ` (${saved})` : ''}; ${goal.pace.words.toLowerCase()}.`, `${name}: ${goal.text} gehaald${saved ? ` (${saved.replace(' of ', ' van ')})` : ''}; ${PACE_NL[goal.pace.words] ?? goal.pace.words.toLowerCase()}.`);
  },
  'goal-orbits': (_params, d, lang) => {
    if (!d.goals) return null;
    const view = goalOrbits(d.goals.arcs, d.goals.active), lead = view.lead;
    if (!view.active) return NO_GOALS(lang);
    const head = say(lang, `${view.active} active ${view.active === 1 ? 'goal' : 'goals'}`, `${view.active} ${view.active === 1 ? 'actief doel' : 'actieve doelen'}`);
    return lead ? say(lang, `${head}; ${lead.name} is furthest along, at ${lead.text}.`, `${head}; ${lead.name} is het verst, op ${lead.text}.`) : say(lang, `${head}; no progress is known yet.`, `${head}; er is nog geen voortgang bekend.`);
  },
  'bill-timeline': (_params, d, lang) => {
    if (!d.bills) return null;
    const view = billTimeline(d.bills, d.day), next = view.next, rest = view.count - 1;
    if (!next) return NO_BILLS(lang);
    return say(lang, `Next bill: ${next.title} ${next.amount}, ${next.when} (${next.date})${rest > 0 ? `; ${rest} more after it` : ''}.`, `Volgende rekening: ${next.title} ${next.amount}, ${dueNl(next.days)} (${next.date})${rest > 0 ? `; daarna nog ${rest}` : ''}.`);
  },
  'goal-dates': (_params, d, lang) => {
    if (!d.goals) return null;
    const view = goalDates(d.goals.summaries, d.day), next = view.next;
    if (!d.goals.active) return NO_GOALS(lang);
    if (!view.dated) return say(lang, 'No active goal has a target date.', 'Geen actief doel heeft een streefdatum.');
    if (!next) return say(lang, 'No active goal has a target date ahead.', 'Geen actief doel heeft een streefdatum in de toekomst.');
    return say(lang, `The next target date is ${next.dateWords}: ${next.name}, ${next.when}.`, `De eerstvolgende streefdatum is ${next.dateWords}: ${next.name}, ${dueNl(next.days)}.`);
  },
  'savings-jars': (_params, d, lang) => {
    if (!d.goals) return null;
    const view = savingsJars(d.goals.summaries), lead = view.lead;
    if (!view.count) return d.goals.active ? say(lang, 'You have no savings goal yet.', 'Je hebt nog geen spaardoel.') : NO_GOALS(lang);
    const head = say(lang, `${view.count} ${view.count === 1 ? 'savings goal' : 'savings goals'}`, `${view.count} ${view.count === 1 ? 'spaardoel' : 'spaardoelen'}`);
    return lead ? say(lang, `${head}; ${lead.name} is the fullest, at ${lead.text} (${lead.saved}).`, `${head}; ${lead.name} is het volst, op ${lead.text} (${lead.saved.replace(' of ', ' van ')}).`) : say(lang, `${head}; no value is known yet.`, `${head}; er is nog geen waarde bekend.`);
  },
  'bill-dial': (_params, d, lang) => {
    if (!d.bills) return null;
    const next = billDial(d.bills, d.day).next;
    if (!next) return NO_BILLS(lang);
    return say(lang, `${next.title}: ${next.amount}, due ${next.when} (${next.date}).`, `${next.title}: ${next.amount}, ${dueNl(next.days)} (${next.date}).`);
  },
  'spending-compare': (params, d, lang) => {
    if (!d.moneyLog) return null;
    const kind: FlowKind = params?.ref === 'income' ? 'income' : 'expense', p = period(params, d, 'this-month'), view = spendingCompare(d.moneyLog.entries, kind, p, d.day), words = periodWords(p, lang, d.day), verb = pick(VERB[kind], lang);
    if (view.state === 'empty') return pick(NONE[kind], lang);
    if (view.state === 'quiet' || !view.currency) return `${pick(QUIET[kind], lang)} ${words}.`;
    const before = say(lang, 'in the period before', 'in de periode ervoor'), diff = view.diffCents;
    if (view.nowCents === null) return `${pick(QUIET[kind], lang)} ${words}; ${view.was} ${before}.`;
    if (diff === null) return say(lang, `${view.now} ${verb} ${words}; nothing logged ${before}.`, `${view.now} ${verb} ${words}; ${before} is niets gelogd.`);
    const delta = diff === 0 ? say(lang, 'the same', 'gelijk') : say(lang, `${axMoney(Math.abs(diff), view.currency)} ${diff > 0 ? 'more' : 'less'}`, `${axMoney(Math.abs(diff), view.currency)} ${diff > 0 ? 'meer' : 'minder'}`);
    return `${view.now} ${verb} ${words}; ${view.was} ${before}, ${delta}.`;
  },
};
