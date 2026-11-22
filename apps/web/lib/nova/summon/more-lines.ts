import type {Accounts} from '../../accounts/schema';
import type {ToolSources} from '../../ai/tools/env';
import type {DebtPlannerRecord} from '../../debt-planner/store';
import type {Fasting} from '../../fasting/schema';
import type {HealthData} from '../../health';
import type {LifeReviewRecord} from '../../life-review/store';
import type {MoneyLog} from '../../money-log/schema';
import type {Platform} from '../../positions';
import type {PriceAlerts} from '../../price-alerts/schema';
import type {SavingsChallenges} from '../../savings-challenges/challenges';
import type {Supplements} from '../../supplements/schema';
import type {Tasks} from '../../tasks/schema';
import {formatDate, formatNumber} from '../../visual-format';
import {nlMonth, nlShortDate, nlWeekDay} from './nl-dates';
import type {WeeklyReview} from '../../weekly-review/schema';
import {fastingCard, foodDaysCard, healthTrendsCard, meditationCard, supplementsCard} from '../cards/health-more';
import {accountsCard, cashFlowCard, debtPlanCard, priceAlertsCard, savingsChallengesCard} from '../cards/money-more';
import {matrixCard, milestonesCard, reviewsCard} from '../cards/plan-insights';

/**
 * Session AM-2 (step 3, round 2, "NOVA connected"; design review AM-D2): the one-line figure summaries of the widgets
 * for the pages that still had none. The rules are lib/nova/summon/lines.ts's own: each line is written from the
 * widget's own selector (lib/nova/cards/plan-insights.ts, money-more.ts, health-more.ts); one calm sentence (two at
 * most), the app's own formats, English or Dutch; unknown is not zero (an empty record teaches; a record that was not
 * read gives no line, `null`). The widget's switch is read by `stageLine` before this is called.
 *
 * Three lines are different on purpose:
 * - Cycle: the most sensitive record. Its line is always "Your cycle widget is on the stage." and nothing else: no
 *   figure of the cycle log is ever put into NOVA's words, the conversation or the announcement (the record is not even
 *   handed to this module).
 * - Today by the hour: a day's agenda is not in the line data (it is built by the Agenda's own hooks), so it has no line
 *   and the widget is named, as the Agenda clock is.
 * - Debt payoff plan: a projection. The line says "would" and "a projection, not a promise", never "will".
 *
 * `undefined`: not one of these widgets.
 */
export type MoreData = {
  /** From the chat engine's own sources (lib/nova/summon/lines.ts lineData → `moreFromSources`). */
  platform?: Pick<Platform, 'goals' | 'contributions'> | null; accounts?: Accounts | null; weekly?: WeeklyReview | null;
  /** Health-type, from the same sources: its line is held back by the Health gate like every Health line. */
  fasting?: Fasting | null;
  /** Read for the request only, behind each widget's switch (lib/nova/stage/more-extras.ts). */
  lifeReview?: LifeReviewRecord | null; debtPlanner?: DebtPlannerRecord | null; savingsChallenges?: SavingsChallenges | null; priceAlerts?: PriceAlerts | null;
  /** Health-type: read only once the Health gate is open. */
  supplements?: Supplements | null;
};
/** What these lines take from the records NOVA's chat engine already read for this moment. */
export const moreFromSources = (sources: ToolSources): MoreData => ({platform: sources.platform, accounts: sources.accounts ?? null, weekly: sources.weekly ?? null, fasting: sources.fasting ?? null});
type Base = {day: string; healthDay: string; health?: HealthData | null; moneyLog?: (Pick<MoneyLog, 'entries'> & {currency?: string; weekStartsOn?: 'monday' | 'sunday'}) | null; tasks?: Tasks | null};
type Lang = 'en' | 'nl';
const say = (lang: Lang, en: string, nl: string) => lang === 'nl' ? nl : en;
/** The Showcase's label is on the stage once; a name in a line does not repeat it (lib/nova/summon/lines.ts plainName, AM-D32). */
const plain = (name: string): string => name.replace(/\s*[·:•|–-]?\s*\(?SHOWCASE DATA\)?(?:\s*[·:•|–-]\s*[^·]*)?$/i, '').trim() || name.trim();
export const CYCLE_LINE_WORDS: Readonly<Record<Lang, string>> = {en: 'Your cycle widget is on the stage.', nl: 'Je cycluswidget staat op het podium.'};

function moneyLine(id: string, d: Base & MoreData, lang: Lang): string | null {
  const on = (day: string) => formatDate(day, {year: !day.startsWith(d.day.slice(0, 4))});
  if (id === 'cash-flow') {
    if (!d.moneyLog) return null;
    const c = cashFlowCard(d.moneyLog, d.day);
    if (c.state === 'empty') return say(lang, 'Nothing is in your money log yet.', 'Er staat nog niets in je geldlogboek.');
    if (c.state === 'quiet' || c.netCents === null) return say(lang, 'Nothing is logged this month yet.', 'Er is deze maand nog niets gelogd.');
    const net = c.netCents === 0 ? say(lang, 'as much in as out', 'evenveel in als uit') : say(lang, `${c.net} more ${c.netCents > 0 ? 'in than out' : 'out than in'}`, `${c.net} meer ${c.netCents > 0 ? 'in dan uit' : 'uit dan in'}`);
    return say(lang, `This month: ${c.income} in, ${c.spending} out; ${net}.`, `Deze maand: ${c.income} in, ${c.spending} uit; ${net}.`);
  }
  if (id === 'accounts') {
    if (!d.accounts) return null;
    const c = accountsCard(d.accounts, d.day);
    if (c.state === 'empty') return say(lang, 'No account or debt is kept yet.', 'Er is nog geen rekening of schuld bijgehouden.');
    const open = c.noBalance ? say(lang, `; ${c.noBalance} without a balance yet`, `; ${c.noBalance} nog zonder saldo`) : '';
    return say(lang, `Accounts ${c.assets}, debts ${c.debts}: ${c.netNegative ? 'minus ' : ''}${c.net} together${open}. Wealth’s holdings are not in this.`,
      `Rekeningen ${c.assets}, schulden ${c.debts}: samen ${c.netNegative ? 'min ' : ''}${c.net}${open}. De bezittingen van Vermogen zitten hier niet in.`);
  }
  if (id === 'debt-plan') {
    if (!d.accounts || !d.debtPlanner) return null;
    const c = debtPlanCard(d.accounts, d.debtPlanner, d.day), p = c.plans[0];
    if (c.state === 'empty') return say(lang, 'No debt with a balance is kept.', 'Er is geen schuld met een saldo bijgehouden.');
    if (c.state === 'unkept') return say(lang, 'No figures are kept for the payoff planner yet.', 'Er zijn nog geen cijfers bewaard voor het aflosplan.');
    if (c.state === 'needs' || !p) return say(lang, 'The payoff plan misses a figure; the widget says which.', 'Het aflosplan mist een cijfer; de widget zegt welk.');
    if (!p.monthName) return say(lang, 'With the figures you kept, the debts would not be cleared within 100 years.', 'Met de cijfers die je bewaarde zouden de schulden niet binnen 100 jaar zijn afgelost.');
    return say(lang, `With the figures you kept, your debts would be cleared by ${p.monthName}, highest rate first: a projection, not a promise.`, `Met de cijfers die je bewaarde zouden je schulden tegen ${p.month ? nlMonth(p.month) : p.monthName} zijn afgelost, hoogste rente eerst: een projectie, geen belofte.`);
  }
  if (id === 'savings-challenges') {
    if (!d.savingsChallenges || !d.platform || !d.moneyLog) return null;
    const c = savingsChallengesCard(d.savingsChallenges, d.platform, d.moneyLog, d.day), first = c.lines[0], more = c.lines.length - 1;
    if (!first) return say(lang, 'No savings challenge is running.', 'Er loopt geen spaaruitdaging.');
    return say(lang, `${plain(first.goal)}: ${first.title.toLowerCase()}, ${first.words.charAt(0).toLowerCase()}${first.words.slice(1)}${more > 0 ? `; ${more} more running` : ''}.`,
      `${plain(first.goal)}: ${first.title.toLowerCase()}, ${first.words.charAt(0).toLowerCase()}${first.words.slice(1)}${more > 0 ? `; er lopen er nog ${more}` : ''}.`);
  }
  if (!d.priceAlerts) return null;
  const c = priceAlertsCard(d.priceAlerts);
  if (c.state === 'empty') return say(lang, 'No price alerts yet.', 'Nog geen prijsalerts.');
  const fired = c.last ? say(lang, `; the last one fired ${on(c.last.at.slice(0, 10))}`, `; de laatste ging af op ${nlShortDate(c.last.at.slice(0, 10), d.day)}`) : '';
  return say(lang, `${c.waiting} price ${c.waiting === 1 ? 'alert is' : 'alerts are'} waiting${fired}.`, `${c.waiting} ${c.waiting === 1 ? 'prijsalert wacht' : 'prijsalerts wachten'}${fired}.`);
}

function healthLine(id: string, d: Base & MoreData, lang: Lang, now: Date): string | null {
  if (id === 'fasting') {
    if (!d.fasting) return null;
    const c = fastingCard(d.fasting, now, d.healthDay), last = c.history[0];
    if (c.state === 'empty') return say(lang, 'No fast logged yet.', 'Nog geen vastenperiode gelogd.');
    if (c.running) return say(lang, `A fast is running: ${c.running.elapsed} of ${c.running.targetHours} h.`, `Er loopt een vastenperiode: ${c.running.elapsed} van ${c.running.targetHours} uur.`);
    return last ? say(lang, `No fast is running; the last one was ${last.hoursText}, ${last.dayText}.`, `Er loopt geen vastenperiode; de laatste was ${last.hoursText}, ${nlShortDate(last.day, d.healthDay)}.`) : say(lang, 'No fast is running.', 'Er loopt geen vastenperiode.');
  }
  if (id === 'supplements') {
    if (!d.supplements) return null;
    const c = supplementsCard(d.supplements, d.healthDay);
    if (c.state === 'empty') return say(lang, 'You keep track of no supplement yet.', 'Je houdt nog geen supplement bij.');
    if (!c.planned) return say(lang, 'Nothing is planned for today.', 'Er staat vandaag niets gepland.');
    return say(lang, `Today: ${c.taken} of ${c.planned} doses taken${c.notLogged ? `, ${c.notLogged} not logged yet` : ''}.`, `Vandaag: ${c.taken} van ${c.planned} doses genomen${c.notLogged ? `, ${c.notLogged} nog niet gelogd` : ''}.`);
  }
  if (!d.health) return null;
  if (id === 'health-trends') {
    const c = healthTrendsCard(d.health, d.healthDay), r = c.rows[0], w = c.waiting[0];
    if (r) return say(lang, `${r.label}: ${r.words.toLowerCase()} over the last 90 days, ${r.recent} against ${r.year} over the year.`, `${r.label}: ${r.direction === 'up' ? 'hoger' : r.direction === 'down' ? 'lager' : 'ongeveer gelijk'} in de afgelopen 90 dagen, ${r.recent} tegenover ${r.year} over het jaar.`);
    return w ? say(lang, `Not enough days yet for a trend: ${w.label.toLowerCase()} has ${w.words}.`, `Nog niet genoeg dagen voor een trend: ${w.label.toLowerCase()} heeft ${w.words}.`) : say(lang, 'Nothing is recorded for a trend yet.', 'Er is nog niets vastgelegd voor een trend.');
  }
  if (id === 'food-days') {
    const c = foodDaysCard(d.health, d.healthDay);
    if (c.state === 'empty') return say(lang, 'No food logged yet.', 'Nog geen eten gelogd.');
    return say(lang, `Food logged on ${c.words}.`, `Eten gelogd op ${c.logged} van de ${c.daysSoFar} ${c.daysSoFar === 1 ? 'dag' : 'dagen'} van deze maand tot nu toe.`);
  }
  const c = meditationCard(d.health.meditation, d.healthDay);
  if (c.state === 'empty') return say(lang, 'No meditation logged yet.', 'Nog geen meditatie gelogd.');
  const run = c.daysInARow > 1 ? say(lang, `; ${c.daysInARow} days in a row`, `; ${c.daysInARow} dagen op rij`) : '';
  return say(lang, `${c.thisWeekText} of meditation this week${c.goal ? ` of your ${formatNumber(c.goal)} min` : ''}${run}.`, `${c.thisWeekText} meditatie deze week${c.goal ? ` van je ${formatNumber(c.goal)} min` : ''}${run}.`);
}

export function moreLine(id: string, d: Base & MoreData, lang: Lang, now: Date): string | null | undefined {
  switch (id) {
    case 'cycle': return CYCLE_LINE_WORDS[lang]; // never a figure of the cycle log (see above)
    case 'hour-grid': return null; // the day's agenda is not in the line data: the widget is named
    case 'cash-flow': case 'accounts': case 'debt-plan': case 'savings-challenges': case 'price-alerts': return moneyLine(id, d, lang);
    case 'health-trends': case 'food-days': case 'fasting': case 'meditation': case 'supplements': return healthLine(id, d, lang, now);
    case 'priority-matrix': {
      if (!d.tasks) return null;
      const c = matrixCard(d.tasks, d.day), n = (q: string) => c.boxes.find(b => b.id === q)?.count ?? 0;
      if (c.state === 'empty') return say(lang, 'No open tasks.', 'Geen open taken.');
      return say(lang, `${n('do')} urgent and important, ${n('plan')} important, ${n('quick')} urgent, ${n('later')} neither; ${c.open} open ${c.open === 1 ? 'task' : 'tasks'}.`,
        `${n('do')} dringend en belangrijk, ${n('plan')} belangrijk, ${n('quick')} dringend, ${n('later')} geen van beide; ${c.open} open ${c.open === 1 ? 'taak' : 'taken'}.`);
    }
    case 'reviews': {
      const w = reviewsCard(d.weekly, null, d.day).weekly;
      if (!w) return null;
      const next = formatDate(w.nextDay, {weekday: true, year: false}), week = formatDate(w.weekStart, {year: false});
      if (w.state === 'due') return say(lang, `Your weekly review is due, for the week of ${week}.`, `Je weekreview staat klaar, voor de week van ${nlShortDate(w.weekStart, w.weekStart)}.`);
      if (w.state === 'draft') return say(lang, `Your weekly review is started, for the week of ${week}.`, `Je weekreview is begonnen, voor de week van ${nlShortDate(w.weekStart, w.weekStart)}.`);
      return say(lang, `This week’s review is ${w.state === 'done' ? 'done' : 'skipped'}; the next review day is ${next}.`, `De review van deze week is ${w.state === 'done' ? 'klaar' : 'overgeslagen'}; de volgende reviewdag is ${nlWeekDay(w.nextDay, w.nextDay)}.`);
    }
    case 'milestones': {
      if (!d.platform) return null;
      const c = milestonesCard(d.platform), lead = c.lead;
      if (c.state === 'empty') return say(lang, 'You have no goals yet.', 'Je hebt nog geen doelen.');
      if (c.state === 'none') return say(lang, 'No open goal has milestones yet.', 'Geen open doel heeft al mijlpalen.');
      const next = lead?.next ? say(lang, `; next on ${plain(lead.name)}: “${lead.next}”`, `; de volgende bij ${plain(lead.name)}: “${lead.next}”`) : '';
      return say(lang, `${c.done} of ${c.total} milestones ticked${next}.`, `${c.done} van de ${c.total} mijlpalen afgevinkt${next}.`);
    }
    default: return undefined;
  }
}
