import type {BillsRecord} from '../../bills/schema';
import type {BudgetsRecord} from '../../budgets/schema';
import type {DayGoal} from '../../checklist/day-goal-core';
import type {Countdowns} from '../../countdowns/schema';
import type {DayEnds} from '../../day-boundary';
import type {Habit} from '../../habits';
import type {HealthData} from '../../health';
import {PACE_MIN_MONTHS} from '../../money-insights/spending-pace';
import type {MoneyLog} from '../../money-log/schema';
import type {MoneyTags} from '../../money-tags/schema';
import type {MoodTags} from '../../mood-tags/schema';
import {TAG_MIN_DAYS} from '../../mood-tags/tags';
import type {NetworthHistory} from '../../networth-history';
import type {Symptoms} from '../../symptoms/schema';
import type {Tasks} from '../../tasks/schema';
import type {TaskWhen} from '../../tasks/when';
import {formatDate, formatNumber} from '../../visual-format';
import type {Workouts} from '../../workouts/schema';
import type {SplitsRecord} from '../../workouts/splits-schema';
import {moodTagsCard, runSplitsCard, symptomsCard} from '../cards/health-insights';
import {countdownsCard, dayRulesCard, journalNumbersCard, perfectDaysCard, tasksLaterCard} from '../cards/life-insights';
import {ageCard, billChangesCard, moneyTagsCard, paceCard, readyCard} from '../cards/money-insights';
import {NET_WORTH_HISTORY_RANGE, historyMoney, netWorthHistoryCard} from '../cards/net-worth-history';
import type {WidgetParams, WidgetRange} from '../stage/record';

/**
 * Session AM-2 (step 3, "NOVA connected"; design review AM-D2): the one-line figure summaries of the widgets that show
 * what Sessions AO and AP added to the pages. The rules are lib/nova/summon/lines.ts's own: each line is written from
 * the widget's own selector (lib/nova/cards/*-insights.ts, net-worth-history.ts), so the words and the widget cannot
 * disagree; one calm sentence (two at most), the app's own formats, in English or Dutch; unknown is not zero (an empty
 * record teaches; a record that was not read gives no line, `null`); nothing is promised. The widget's switch is read by
 * `stageLine` before this is called: a closed switch never reaches a selector here.
 *
 * `undefined`: not one of these widgets.
 */
export type ConnectData = {
  /** Wealth's net-worth history (lib/networth-history.ts). */
  networthHistory?: NetworthHistory | null;
  moneyTags?: MoneyTags | null;
  /** Which open tasks are on "This evening" or in "Someday" (lib/tasks/when.ts). */
  taskWhen?: TaskWhen | null;
  countdowns?: Countdowns | null;
  /** The two settings of the day's rules; each on its own (one may be read and the other not). */
  dayGoal?: DayGoal | null; dayEnds?: DayEnds | null;
  /** Health-type records: read only once the Health gate is open (lib/nova/stage/connect-extras.ts). */
  splits?: SplitsRecord | null; moodTags?: MoodTags | null; symptoms?: Symptoms | null;
  /** The template library's size (lib/nova/cards/life-insights.ts TEMPLATE_COUNTS): the library itself is not loaded for a line. */
  templates?: {goals: number; habits: number; areas: number} | null;
};
/** What these lines read of the line data the earlier widgets already use. */
type Base = {day: string; healthDay: string; habits?: readonly Habit[] | null; health?: HealthData | null; workouts?: Workouts | null; journal?: readonly {date: string; text?: string}[] | null;
  moneyLog?: (Pick<MoneyLog, 'entries'> & {currency?: string}) | null; bills?: BillsRecord | null; budgets?: BudgetsRecord | null; tasks?: Tasks | null};
type Lang = 'en' | 'nl';
const say = (lang: Lang, en: string, nl: string) => lang === 'nl' ? nl : en;
const NL_RANGE: Readonly<Record<WidgetRange, string>> = {week: 'de afgelopen 7 dagen', month: 'de afgelopen 30 dagen', quarter: 'de afgelopen 90 dagen', year: 'de afgelopen 12 maanden'};
/** The Showcase's label is on the stage once; a name in a line does not repeat it (lib/nova/summon/lines.ts plainName, AM-D32). */
const plain = (name: string): string => name.replace(/\s*[·:•|–-]?\s*\(?SHOWCASE DATA\)?(?:\s*[·:•|–-]\s*[^·]*)?$/i, '').trim() || name.trim();
const days = (n: number, lang: Lang) => `${formatNumber(n, {maximumFractionDigits: 1})} ${lang === 'nl' ? (n === 1 ? 'dag' : 'dagen') : (n === 1 ? 'day' : 'days')}`;
const NO_LOG = (lang: Lang) => say(lang, 'Nothing is in your money log yet.', 'Er staat nog niets in je geldlogboek.');

function wealthLine(id: string, params: WidgetParams | undefined, d: Base & ConnectData, lang: Lang): string | null | undefined {
  if (id === 'net-worth-history') {
    if (!d.networthHistory) return null;
    const c = netWorthHistoryCard(d.networthHistory, d.day, params?.range ?? NET_WORTH_HISTORY_RANGE), on = (day: string) => formatDate(day, {year: !day.startsWith(d.day.slice(0, 4))});
    if (c.state === 'empty') return say(lang, 'No day of net worth is recorded yet; Wealth records one each day you open it.', 'Er is nog geen dag vastgelegd; Vermogen legt er één vast op elke dag dat je het opent.');
    if (c.state === 'quiet' || !c.latest || !c.currency) return say(lang, `No day was recorded in ${c.rangeWords}.`, `Er is geen dag vastgelegd in ${NL_RANGE[c.range]}.`);
    const money = (cents: bigint) => historyMoney(cents, c.currency!), example = c.example ? say(lang, ' (example history)', ' (voorbeeldgeschiedenis)') : '';
    if (c.latest.cents === null) return say(lang, `Net worth was not known on ${on(c.latest.day)}: something had no value that day${c.latestKnown ? `; last known ${money(c.latestKnown.cents)} on ${on(c.latestKnown.day)}` : ''}${example}.`,
      `Je vermogen was op ${on(c.latest.day)} niet bekend: iets had die dag geen waarde${c.latestKnown ? `; laatst bekend ${money(c.latestKnown.cents)} op ${on(c.latestKnown.day)}` : ''}${example}.`);
    const size = c.change ? money(c.change.cents < 0n ? -c.change.cents : c.change.cents) : '';
    const change = !c.change ? '' : c.change.direction === 'flat' ? say(lang, `, no change since ${on(c.change.since)}`, `, geen verandering sinds ${on(c.change.since)}`)
      : say(lang, `, ${c.change.direction} ${size} since ${on(c.change.since)}`, `, ${size} ${c.change.direction === 'up' ? 'hoger' : 'lager'} dan op ${on(c.change.since)}`);
    return say(lang, `Net worth ${money(c.latest.cents)} on ${on(c.latest.day)}${change}${example}.`, `Vermogen ${money(c.latest.cents)} op ${on(c.latest.day)}${change}${example}.`);
  }
  if (!d.moneyLog) return null;
  if (id === 'ready-to-assign') {
    if (!d.budgets) return null;
    const c = readyCard(d.moneyLog, d.budgets, d.day), r = c.lead;
    if (!r) return say(lang, 'Nothing is logged as income this month, and there are no budgets yet.', 'Er is deze maand geen inkomen gelogd, en er zijn nog geen budgetten.');
    if (r.status === 'no-income') return say(lang, `No income is logged this month yet; your budgets hold ${r.held}.`, `Er is deze maand nog geen inkomen gelogd; je budgetten houden ${r.held} vast.`);
    if (r.over) return say(lang, `Your budgets hold ${r.ready} more than you logged as income this month.`, `Je budgetten houden ${r.ready} meer vast dan je deze maand als inkomen logde.`);
    return say(lang, `Ready to assign this month: ${r.ready} (${r.income} logged as income, minus ${r.held} in budgets).`, `Klaar om toe te wijzen deze maand: ${r.ready} (${r.income} als inkomen gelogd, min ${r.held} in budgetten).`);
  }
  if (id === 'age-of-money') {
    const c = ageCard(d.moneyLog, d.day), r = c.lead;
    if (!r) return NO_LOG(lang);
    if (r.status === 'ok' && r.days !== null) return say(lang, `Age of money: ${days(r.days, 'en')} on average, over what you spent in the last 90 days.`, `Leeftijd van je geld: gemiddeld ${days(r.days, 'nl')}, over wat je de afgelopen 90 dagen uitgaf.`);
    return say(lang, `${r.words}.`, 'Nog niet genoeg gegevens om de leeftijd van je geld te bepalen.');
  }
  if (id === 'spending-pace') {
    const c = paceCard(d.moneyLog, d.day), r = c.lead;
    if (!r) return NO_LOG(lang);
    if (r.status !== 'ok') return say(lang, `${r.words}.`, `Nog niet genoeg maanden: hiervoor zijn ${PACE_MIN_MONTHS} eerdere maanden met uitgaven nodig, en ${r.months === 1 ? 'er is er 1' : `er zijn er ${r.months}`}.`);
    const diff = r.direction === 'flat' ? ', evenveel' : `, ${r.difference} ${r.direction === 'up' ? 'meer' : 'minder'}`;
    return say(lang, `${r.words}.`, `Rond de ${r.day}e heb je meestal ${r.usual} uitgegeven; deze maand ${r.thisMonth}${diff}.`);
  }
  if (id === 'bill-changes') {
    if (!d.bills) return null;
    const c = billChangesCard(d.bills, d.moneyLog, d.day), l = c.lines[0];
    if (c.state === 'empty') return say(lang, 'No bill reminders yet.', 'Nog geen rekeningen als herinnering.');
    if (!l) return say(lang, 'No bill’s latest payment differs from the one before it.', 'Bij geen rekening wijkt de laatste betaling af van de vorige.');
    const more = c.lines.length - 1;
    return say(lang, `${plain(l.title)} ${l.words}${more > 0 ? `; ${more} more changed` : ''}.`,
      `${plain(l.title)} is ${l.by} ${l.direction === 'up' ? 'duurder' : 'goedkoper'} sinds ${l.since} (toen ${l.then}, nu ${l.now})${more > 0 ? `; nog ${more} veranderd` : ''}.`);
  }
  if (id === 'money-tags') {
    if (!d.moneyTags) return null;
    const c = moneyTagsCard(d.moneyTags, d.moneyLog, d.day, params?.range), words = c.window.words, wordsNl = c.window.range ? `in ${NL_RANGE[c.window.range]}` : 'deze maand', top = c.rows[0];
    if (c.state === 'empty') return say(lang, 'No tags on your money entries yet.', 'Nog geen tags op je geldposten.');
    if (!top) return say(lang, `No tagged entry ${words}.`, `Geen getagde post ${wordsNl}.`);
    return say(lang, `Most under “${top.tag}”: ${top.text} ${words}; ${c.tags} ${c.tags === 1 ? 'tag' : 'tags'} in use.`, `Het meest onder “${top.tag}”: ${top.text} ${wordsNl}; ${c.tags} ${c.tags === 1 ? 'tag' : 'tags'} in gebruik.`);
  }
  return undefined;
}

function healthLine(id: string, d: Base & ConnectData, lang: Lang): string | null {
  if (id === 'run-splits') {
    if (!d.workouts || !d.splits) return null;
    const run = runSplitsCard(d.workouts, d.splits, d.healthDay).run;
    if (!run) return say(lang, 'No run with a pace yet; a GPX or TCX file you import brings one.', 'Nog geen run met een tempo; een GPX- of TCX-bestand dat je importeert brengt er een.');
    return say(lang, `${plain(run.name)}, ${run.dateText}: average pace ${run.paceText}${run.distanceText ? ` over ${run.distanceText}` : ''}${run.fastest ? `; fastest kilometre ${run.fastest.paceText}` : ''}.`,
      `${plain(run.name)}, ${run.dateText}: gemiddeld tempo ${run.paceText}${run.distanceText ? ` over ${run.distanceText}` : ''}${run.fastest ? `; snelste kilometer ${run.fastest.paceText}` : ''}.`);
  }
  if (id === 'mood-tags') {
    if (!d.health || !d.moodTags) return null;
    const c = moodTagsCard(d.health.moods?.days ?? {}, d.moodTags, d.healthDay), top = c.rows[0];
    if (c.state === 'empty') return say(lang, 'No mood tags yet.', 'Nog geen stemmingstags.');
    if (!top) return say(lang, `${c.tags} ${c.tags === 1 ? 'tag' : 'tags'} so far; a comparison needs ${TAG_MIN_DAYS} tagged days and ${TAG_MIN_DAYS} other days with a mood.`, `${c.tags} ${c.tags === 1 ? 'tag' : 'tags'} tot nu toe; een vergelijking heeft ${TAG_MIN_DAYS} getagde dagen en ${TAG_MIN_DAYS} andere dagen met een stemming nodig.`);
    return say(lang, `On ${top.good} of the ${top.days} days tagged “${top.tag}” your mood was Good or Great. Goes with, not a cause.`, `Op ${top.good} van de ${top.days} dagen met de tag “${top.tag}” was je stemming Goed of Geweldig. Gaat samen, geen oorzaak.`);
  }
  if (!d.symptoms) return null;
  const c = symptomsCard(d.symptoms, d.healthDay), top = c.mostNoted;
  if (c.state === 'empty') return say(lang, 'You follow no symptom or factor yet.', 'Je volgt nog geen symptoom of factor.');
  if (!c.answeredDays) return say(lang, `No answer in the last ${c.days} days yet.`, `Nog geen antwoord in de afgelopen ${c.days} dagen.`);
  if (!top) return say(lang, `Nothing noted on the ${c.answeredDays} ${c.answeredDays === 1 ? 'day' : 'days'} answered in the last ${c.days} days.`, `Niets genoteerd op de ${c.answeredDays} beantwoorde ${c.answeredDays === 1 ? 'dag' : 'dagen'} van de afgelopen ${c.days} dagen.`);
  return say(lang, `${top.name}: there on ${top.noted} of ${top.answered} ${top.answered === 1 ? 'day' : 'days'} answered in the last ${c.days} days${top.strong ? `, strong on ${top.strong}` : ''}.`,
    `${top.name}: aanwezig op ${top.noted} van de ${top.answered} beantwoorde ${top.answered === 1 ? 'dag' : 'dagen'} in de afgelopen ${c.days} dagen${top.strong ? `, sterk op ${top.strong}` : ''}.`);
}

export function connectLine(id: string, params: WidgetParams | undefined, d: Base & ConnectData, lang: Lang): string | null | undefined {
  switch (id) {
    case 'net-worth-history': case 'ready-to-assign': case 'age-of-money': case 'spending-pace': case 'bill-changes': case 'money-tags': return wealthLine(id, params, d, lang);
    case 'run-splits': case 'mood-tags': case 'symptoms': return healthLine(id, d, lang);
    case 'perfect-days': {
      if (!d.habits) return null;
      const c = perfectDaysCard(d.habits, d.day), t = c.today;
      if (!c.count) return say(lang, 'You have no habits yet.', 'Je hebt nog geen gewoontes.');
      const run = c.run > 1 ? say(lang, `, ${c.run} in a row`, `, waarvan ${c.run} op rij`) : '';
      const today = t.kind === 'perfect' ? say(lang, 'today included', 'vandaag telt mee') : t.kind === 'partly' ? say(lang, `today ${t.done} of ${t.due} so far`, `vandaag ${t.done} van ${t.due} tot nu toe`)
        : t.kind === 'no-record' ? say(lang, `today ${t.due} still to do`, `vandaag nog ${t.due} te doen`) : say(lang, 'nothing due today', 'vandaag staat er niets gepland');
      return say(lang, `Perfect days this month: ${c.perfect}${run}; ${today}.`, `Perfecte dagen deze maand: ${c.perfect}${run}; ${today}.`);
    }
    case 'day-rules': {
      const c = dayRulesCard(d.dayGoal, d.dayEnds, d.day);
      if (!c.goal && !c.ends) return null;
      const goal = c.goal ? say(lang, `A day counts as done at ${c.goal.need === null ? 'every dot' : c.goal.words}`, `Een dag telt als gedaan bij ${c.goal.need === null ? 'elke stip' : `${c.goal.need} ${c.goal.need === 1 ? 'stip' : 'stippen'}`}`) : '';
      const ends = c.ends ? say(lang, `${goal ? 'your' : 'Your'} day ends at ${c.ends.minutes === 0 ? 'midnight' : c.ends.words}`, `${goal ? 'je' : 'Je'} dag eindigt om ${c.ends.minutes === 0 ? 'middernacht' : c.ends.words}`) : '';
      return `${[goal, ends].filter(Boolean).join('; ')}.`;
    }
    case 'tasks-later': {
      if (!d.tasks || !d.taskWhen) return null;
      const c = tasksLaterCard(d.taskWhen, d.tasks, d.day), e = c.evening.length, s = c.someday.length;
      if (c.state === 'empty') return say(lang, 'No open tasks.', 'Geen open taken.');
      if (c.state === 'quiet') return say(lang, 'Nothing is on this evening’s list and nothing is in Someday.', 'Er staat niets op de lijst van vanavond en niets bij ooit.');
      return say(lang, `This evening: ${e} ${e === 1 ? 'task' : 'tasks'}; Someday: ${s}.`, `Vanavond: ${e} ${e === 1 ? 'taak' : 'taken'}; ooit: ${s}.`);
    }
    case 'countdowns': {
      if (!d.countdowns) return null;
      const c = countdownsCard(d.countdowns, d.day), next = c.next, more = c.upcoming.length - 1;
      if (c.state === 'empty') return say(lang, 'No countdowns yet.', 'Nog geen aftellingen.');
      if (!next) return say(lang, `Nothing is ahead; ${c.passed} ${c.passed === 1 ? 'day has' : 'days have'} passed.`, `Er komt niets aan; ${c.passed} ${c.passed === 1 ? 'dag is' : 'dagen zijn'} voorbij.`);
      const rest = more > 0 ? say(lang, `; ${more} more coming up`, `; daarna nog ${more}`) : '';
      if (next.days === 0) return say(lang, `${plain(next.title)} is today (${next.dateText})${rest}.`, `${plain(next.title)} is vandaag (${next.dateText})${rest}.`);
      return say(lang, `Days until ${plain(next.title)}: ${formatNumber(next.days)} (${next.dateText})${rest}.`, `Dagen tot ${plain(next.title)}: ${formatNumber(next.days)} (${next.dateText})${rest}.`);
    }
    case 'journal-numbers': {
      if (!d.journal) return null;
      const c = journalNumbersCard(d.journal, d.day), n = c.streak.current;
      if (!c.total) return say(lang, 'No journal entries yet.', 'Nog niets in je dagboek.');
      const streak = n > 0 ? say(lang, `; writing streak ${days(n, 'en')}`, `; schrijfreeks ${days(n, 'nl')}`) : '';
      return say(lang, `${formatNumber(c.words)} ${c.words === 1 ? 'word' : 'words'} in ${formatNumber(c.entries)} ${c.entries === 1 ? 'entry' : 'entries'} this year${streak}.`,
        `${formatNumber(c.words)} ${c.words === 1 ? 'woord' : 'woorden'} dit jaar, in ${formatNumber(c.entries)} ${c.entries === 1 ? 'tekst' : 'teksten'}${streak}.`);
    }
    case 'templates': {
      const t = d.templates;
      if (!t) return null;
      return say(lang, `${formatNumber(t.goals)} goal templates and ${formatNumber(t.habits)} habit ideas, in ${t.areas} areas.`, `${formatNumber(t.goals)} doelsjablonen en ${formatNumber(t.habits)} gewoonte-ideeën, in ${t.areas} gebieden.`);
    }
    default: return undefined;
  }
}
