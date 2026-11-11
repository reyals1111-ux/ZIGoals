import {formatUnits} from '@zigoals/chain-config';
import type {AverageGoal} from '../../average-goals/store';
import {averageProgress} from '../../average-goals/progress';
import type {BillsRecord} from '../../bills/schema';
import type {BudgetsRecord} from '../../budgets/schema';
import type {ToolSources} from '../../ai/tools/env';
import {paceForecast, privateGoalPoints} from '../../goal-forecast';
import {formatSignedGoalAmount, privateGoalSummary, unifiedGoalSummaries, type GoalSummary} from '../../goal-summary';
import {localDate} from '../../local-date';
import type {Habit} from '../../habits';
import type {HealthData} from '../../health';
import {waterOn} from '../../health-daily';
import {weightText} from '../../health-units';
import type {MoneyLog} from '../../money-log/schema';
import type {Notes} from '../../notes/schema';
import {balanceWords, dailySeries, sleepBalance} from '../../sleep/engine';
import {deviceDay} from '../../tasks/device';
import type {Tasks} from '../../tasks/schema';
import {formatDate, formatNumber, formatPercent, formatTime} from '../../visual-format';
import {wealthOverview} from '../../wealth';
import type {Workouts} from '../../workouts/schema';
import {billsCard} from '../cards/bills';
import {budgetsCard} from '../cards/budgets';
import {focusGoal} from '../cards/goal-focus';
import {habitWeek} from '../cards/habit-week';
import {journalMonth} from '../cards/journal';
import {netWorthCard, NET_WORTH_RANGE} from '../cards/net-worth';
import {spendingCard} from '../cards/spending';
import {stepsCard} from '../cards/steps';
import {dayLeftWords, timeRings} from '../cards/time';
import {logDayWords, shortDate, weightCard} from '../cards/weight';
import {workoutsCard} from '../cards/workouts';
import {goalArcs, paceChart, type GoalArc} from '../holo/goals';
import {habitsHud, streakWords} from '../holo/habits';
import {healthHud} from '../holo/health';
import {recentNotes} from '../holo/lists';
import {wealthHud, type WealthHud} from '../holo/wealth';
import type {WidgetParams} from '../stage/record';
import {RANGE_WORDS, type MakeRequest, type WidgetRange} from '../stage/record';
import {widgetSpec, type WidgetGate} from '../widgets/catalog';
import {tasksHeadline, tasksWidgetView} from '../widgets/tasks';
import {durationWords, waterAmount} from '../widgets/words';
import {WEATHER_OFF_WORDS, WEATHER_PLACE_WORDS} from '../world/ask';
import {condition} from '../world/met';
import type {WorldReading} from '../world/record';
import {clockTime, degrees, umbrella} from '../world/words';

/**
 * Session AM (design review AM-D2, AM-D3, AM-D12): the one-line figure summary of a widget ("stage line") — what NOVA says
 * under the star, in the conversation and in the polite announcement when a request makes a widget. Pure.
 *
 * - The same figures as the widget: each line is written from the widget's own selector (lib/nova/cards/<id>.ts, or the
 *   HUD's lib/nova/holo/<area>.ts), so the words and the widget cannot disagree. Dates, money and numbers are the app's own
 *   formats; a percent is whole; a line is one sentence (two short ones at most), no list and no record text.
 * - Under the same switches: a widget whose switch is closed (`gateOpen(id)` false) gets the locked sentence, never a
 *   figure. Weather that is off says so in its own words; the Showcase's weather says it is an example.
 * - Unknown is not zero: an empty record teaches ("You have no goals yet."). A record that was not read gives no line at
 *   all (null): the caller then names the widget instead.
 * - Nothing is promised: no forecast is said here. The Showcase's own label stays on the stage; the "SHOWCASE DATA"
 *   suffix inside a name is left out of a line (AM-D32).
 */
export type LineLang = 'en' | 'nl';
export type LineWeather = {kind: 'off'} | {kind: 'no-place'} | {kind: 'asking'; place: string} | {kind: 'live'; place: string; reading: WorldReading; example: boolean};
export type LineData = {
  /** The widget's own switch right now (the stage's `gateOpen`): closed gives the locked sentence. */
  gateOpen: (id: string) => boolean;
  /** The Habits day and the Health journal's day ("YYYY-MM-DD"). */
  day: string; healthDay: string;
  health?: HealthData | null;
  habits?: readonly Habit[] | null;
  workouts?: Workouts | null;
  journal?: readonly {date: string}[] | null;
  moneyLog?: Pick<MoneyLog, 'entries'> | null;
  bills?: BillsRecord | null;
  budgets?: BudgetsRecord | null;
  tasks?: Tasks | null;
  notes?: Notes | null;
  /** The wealth HUD's figures (lib/nova/holo/wealth.ts) and how many accounts and debts are kept beside the holdings. */
  wealth?: {hud: WealthHud; accounts: number} | null;
  goals?: {summaries: readonly GoalSummary[]; arcs: readonly GoalArc[]; active: number; leadHref: string | null} | null;
  weather?: LineWeather | null;
  brain?: {kind: string; words: string} | null;
  sees?: {open: number; of: number; weather: boolean} | null;
  /** The requests kept so far, newest first (the person's own words, as kept). */
  asks?: readonly {text: string}[] | null;
};

const say = (lang: LineLang, en: string, nl: string) => lang === 'nl' ? nl : en;
/** AM-D32: the Showcase's label is on the stage once; a name in a line does not repeat it ("Rent · SHOWCASE DATA" → "Rent"). */
export const plainName = (name: string): string => name.replace(/\s*[·:•|–-]?\s*\(?SHOWCASE DATA\)?(?:\s*[·:•|–-]\s*[^·]*)?$/i, '').trim() || name.trim();
const NL_RANGE: Readonly<Record<WidgetRange, string>> = {week: 'de afgelopen 7 dagen', month: 'de afgelopen 30 dagen', quarter: 'de afgelopen 90 dagen', year: 'de afgelopen 12 maanden'};
const rangeWords = (range: WidgetRange, lang: LineLang) => lang === 'nl' ? NL_RANGE[range] : RANGE_WORDS[range];
const GATE_NAME: Readonly<Record<WidgetGate, [string, string]>> = {today: ['Today', 'Vandaag'], goals: ['Goals', 'Doelen'], habits: ['Habits', 'Gewoontes'], health: ['Health', 'Gezondheid'], wealth: ['Wealth', 'Vermogen'], notes: ['Notes', 'Notities'], journal: ['The Journal', 'Het dagboek']};
/** What a widget says while its switch is off: where to turn it on, never a figure. */
export function lockedLine(gate: WidgetGate, lang: LineLang): string {
  const [en, nl] = GATE_NAME[gate];
  return say(lang, `${en} is off for NOVA. Turn it on in Permissions to see this.`, `${nl} staat uit voor NOVA. Zet het aan bij Permissions om dit te zien.`);
}
const PACE_NL: Readonly<Record<string, string>> = {'ahead of plan': 'voor op schema', 'on track': 'op schema', 'behind plan': 'achter op schema', reached: 'gehaald', 'needs a look': 'vraagt aandacht', 'no plan yet': 'nog geen plan', 'value unknown': 'waarde onbekend', closed: 'gesloten'};
const paceLine = (words: string, lang: LineLang) => { const w = words.toLowerCase(); return lang === 'nl' ? PACE_NL[w] ?? w : w; };
const UNIT_NL: Readonly<Record<string, [string, string]>> = {days: ['dag', 'dagen'], weeks: ['week', 'weken'], months: ['maand', 'maanden'], years: ['jaar', 'jaar']};
const streakLine = (n: number, unit: string, lang: LineLang) => lang === 'nl' ? `${formatNumber(n)} ${UNIT_NL[unit]?.[n === 1 ? 0 : 1] ?? unit}` : streakWords(n, unit);
const wealthMoney = (cents: bigint, currency: string) => formatSignedGoalAmount(cents < 0n, formatUnits((cents < 0n ? -cents : cents).toString(), 2), currency);
const dueLine = (days: number, lang: LineLang) => lang === 'nl'
  ? (days === 0 ? 'vandaag' : days === 1 ? 'morgen' : days > 1 ? `over ${days} dagen` : `${-days} ${days === -1 ? 'dag' : 'dagen'} te laat`)
  : (days === 0 ? 'today' : days === 1 ? 'tomorrow' : days > 1 ? `in ${days} days` : `overdue by ${-days} ${days === -1 ? 'day' : 'days'}`);
const NO_GOALS = (lang: LineLang) => say(lang, 'You have no goals yet.', 'Je hebt nog geen doelen.');

function healthLine(id: string, params: WidgetParams | undefined, d: LineData, lang: LineLang): string | null {
  const data = d.health, day = d.healthDay;
  if (!data) return null;
  if (id === 'weight') {
    const c = weightCard(data, day, params?.range);
    if (!c.latest) return say(lang, 'No weight logged yet.', 'Nog geen gewicht gelogd.');
    if (c.change) {
      const size = weightText(Math.abs(c.change.grams), c.unit);
      const nl = c.change.direction === 'flat' ? `geen verandering sinds ${c.change.since}` : `${size} ${c.change.direction === 'down' ? 'lager' : 'hoger'} dan op ${c.change.since}`;
      return say(lang, `${c.latest.text}, ${c.change.text}.`, `${c.latest.text}, ${nl}.`);
    }
    const when = logDayWords(c.latest.date, day);
    return c.readings.length
      ? say(lang, `${c.latest.text}, logged ${when}; one weigh-in in ${c.window.words}, so no change to state yet.`, `${c.latest.text}, gelogd ${when}; één weging in ${rangeWords(c.window.range, 'nl')}, dus nog geen verandering.`)
      : say(lang, `No weight logged in ${c.window.words}; the latest is ${c.latest.text} (${when}).`, `Geen gewicht gelogd in ${rangeWords(c.window.range, 'nl')}; het laatste is ${c.latest.text} (${when}).`);
  }
  if (id === 'steps') {
    const c = stepsCard(data, day, params?.range);
    if (!c.latest) return say(lang, 'No steps logged yet.', 'Nog geen stappen gelogd.');
    const average = c.average ? say(lang, `average ${c.average.text} a day in ${c.window.words}`, `gemiddeld ${c.average.text} per dag in ${rangeWords(c.window.range, 'nl')}`) : say(lang, `none logged in ${c.window.words}`, `niets gelogd in ${rangeWords(c.window.range, 'nl')}`);
    return c.today.steps === null ? say(lang, `No steps logged today; ${average}.`, `Vandaag geen stappen gelogd; ${average}.`)
      : say(lang, `${c.today.text} steps today${c.target ? ` of ${c.target.text}` : ''}; ${average}.`, `${c.today.text} stappen vandaag${c.target ? ` van ${c.target.text}` : ''}; ${average}.`);
  }
  if (id === 'water') {
    const w = waterOn(data, day), amount = waterAmount(w.millilitres, w.unit);
    if (!w.entries) return say(lang, 'No water logged today yet.', 'Vandaag nog geen water gelogd.');
    return w.targetMl ? say(lang, `${amount} of ${waterAmount(w.targetMl, w.unit)} water today.`, `${amount} van ${waterAmount(w.targetMl, w.unit)} water vandaag.`) : say(lang, `${amount} of water today; no target set.`, `${amount} water vandaag; geen doel ingesteld.`);
  }
  if (id === 'sleep') {
    const sleep = data.sleep;
    if (!sleep || !sleep.nights.length) return say(lang, 'No nights logged yet.', 'Nog geen nachten gelogd.');
    const balance = sleepBalance(sleep, d.day), last = dailySeries(sleep, d.day, 1)[0]?.asleep ?? null;
    const night = last === null ? say(lang, 'No night logged for last night', 'Geen nacht gelogd voor afgelopen nacht') : say(lang, `Last night: ${durationWords(last)} asleep`, `Afgelopen nacht: ${durationWords(last)} geslapen`);
    // The balance is in the Sleep page's own words (lib/sleep/engine.ts balanceWords), as the widget shows it.
    return balance ? `${night}. ${balanceWords(balance, durationWords)}.` : `${night}.`;
  }
  if (id === 'health-hud') {
    const h = healthHud(data, day), parts: string[] = [];
    if (h.kcal.value !== null) parts.push(h.kcal.targetText ? say(lang, `${h.kcal.text} of ${h.kcal.targetText}`, `${h.kcal.text} van ${h.kcal.targetText}`) : h.kcal.text);
    if (h.water.value !== null) parts.push(say(lang, `${h.water.text} of water`, `${h.water.text} water`));
    if (h.steps.value !== null) parts.push(say(lang, `${h.steps.text} steps`, `${h.steps.text} stappen`));
    return parts.length ? say(lang, `Today so far: ${parts.join('; ')}.`, `Vandaag tot nu toe: ${parts.join('; ')}.`) : say(lang, 'Nothing logged on Health today yet.', 'Vandaag nog niets gelogd bij Gezondheid.');
  }
  return null;
}

function wealthLine(id: string, params: WidgetParams | undefined, d: LineData, lang: LineLang): string | null {
  if (id === 'net-worth' || id === 'wealth-hud') {
    if (!d.wealth) return null;
    const card = netWorthCard(d.wealth.hud, d.day, id === 'net-worth' ? params?.range ?? NET_WORTH_RANGE : NET_WORTH_RANGE);
    if (card.state === 'empty') return say(lang, 'Nothing is tracked on Wealth yet.', 'Er wordt nog niets gevolgd bij Vermogen.');
    if (card.total === null || !card.currency) return say(lang, 'Your holdings have no known value yet.', 'Je bezittingen hebben nog geen bekende waarde.');
    const cur = card.currency, total = wealthMoney(card.total, cur), since = card.change ? formatDate(card.change.since, {year: !card.change.since.startsWith(d.day.slice(0, 4))}) : '';
    const size = card.change ? wealthMoney(card.change.cents < 0n ? -card.change.cents : card.change.cents, cur) : '';
    const change = !card.change || id !== 'net-worth' ? '' : card.change.direction === 'flat' ? say(lang, `, no change since ${since}`, `, geen verandering sinds ${since}`)
      : say(lang, `, ${card.change.direction} ${size} since ${since}`, `, ${size} ${card.change.direction === 'up' ? 'hoger' : 'lager'} dan op ${since}`);
    const apart = d.wealth.accounts > 0 ? say(lang, ' Accounts and debts are not in this figure.', ' Rekeningen en schulden zitten niet in dit bedrag.') : '';
    return `${say(lang, 'Tracked wealth', 'Gevolgd vermogen')} ${total}${card.knownSoFar ? say(lang, ' known so far', ' tot nu toe bekend') : ''}${change}.${apart}`;
  }
  if (id === 'spending') {
    if (!d.moneyLog) return null;
    const c = spendingCard(d.moneyLog, d.day, params?.range), words = c.window.words, wordsNl = c.window.range ? `in ${NL_RANGE[c.window.range]}` : 'deze maand';
    if (c.state === 'empty') return say(lang, 'No spending logged yet.', 'Nog geen uitgaven gelogd.');
    if (c.state === 'quiet') return say(lang, `Nothing logged as spent ${words}.`, `Niets als uitgegeven gelogd ${wordsNl}.`);
    const top = c.categories[0];
    return say(lang, `${c.total} spent ${words}${top ? `; most on ${plainName(top.category)} (${formatPercent(top.share * 100)})` : ''}.`, `${c.total} uitgegeven ${wordsNl}${top ? `; het meest aan ${plainName(top.category)} (${formatPercent(top.share * 100)})` : ''}.`);
  }
  if (id === 'budgets') {
    if (!d.budgets || !d.moneyLog) return null;
    const c = budgetsCard(d.budgets, d.moneyLog.entries, d.day);
    if (c.state === 'empty') return say(lang, 'You have no budgets yet.', 'Je hebt nog geen budgetten.');
    const over = c.lines.find(l => l.over);
    return say(lang, `${c.within} of ${c.count} budgets within plan this month${over ? `; ${plainName(over.category)} is ${over.words}` : ''}.`, `${c.within} van ${c.count} budgetten binnen plan deze maand${over ? `; ${plainName(over.category)} is over het budget` : ''}.`);
  }
  if (id === 'bills' || id === 'money') {
    if (!d.bills) return null;
    const c = billsCard(d.bills, d.day), next = c.next;
    // "Next bill and contribution" also shows a planned contribution, which is not read here: without a bill it has no line.
    if (!next) return id === 'money' ? null : say(lang, 'No bill reminders yet.', 'Nog geen rekeningen als herinnering.');
    const more = c.lines.length - 1;
    return say(lang, `Next bill: ${plainName(next.title)}, ${next.amount}, due ${dueLine(next.days, 'en')} (${next.date})${more > 0 && id === 'bills' ? `; ${more} more after it` : ''}.`,
      `Volgende rekening: ${plainName(next.title)}, ${next.amount}, ${dueLine(next.days, 'nl')} (${next.date})${more > 0 && id === 'bills' ? `; daarna nog ${more}` : ''}.`);
  }
  return null;
}

function goalsLine(id: string, params: WidgetParams | undefined, d: LineData, lang: LineLang): string | null {
  const g = d.goals;
  if (!g) return null;
  if (id === 'goal-focus') {
    const goal = focusGoal(g.summaries, g.arcs, params?.ref, g.leadHref);
    if (!goal) return NO_GOALS(lang);
    // The same whole percent as the ring (lib/nova/widgets/words.ts wholePercent); the saved amount as the widget writes it.
    return `${plainName(goal.name)}: ${goal.text}${goal.saved && goal.status === 'active' && !/no target saved/.test(goal.saved) ? ` (${goal.saved})` : ''}, ${paceLine(goal.pace.words, lang)}.`;
  }
  if (!g.active || !g.arcs.length) return NO_GOALS(lang);
  const lead = g.arcs[0]!;
  return say(lang, `${g.active} active ${g.active === 1 ? 'goal' : 'goals'}; ${plainName(lead.name)} is at ${lead.text}, ${paceLine(lead.pace.words, 'en')}.`,
    `${g.active} ${g.active === 1 ? 'actief doel' : 'actieve doelen'}; ${plainName(lead.name)} staat op ${lead.text}, ${paceLine(lead.pace.words, 'nl')}.`);
}

function worldLine(id: string, w: LineWeather | null | undefined, lang: LineLang): string | null {
  if (!w) return null;
  if (w.kind === 'off') return WEATHER_OFF_WORDS[lang];
  if (w.kind === 'no-place') return WEATHER_PLACE_WORDS[lang];
  if (w.kind === 'asking') return say(lang, `I am asking MET Norway for ${w.place}; the reading shows in the widget.`, `Ik vraag het aan MET Norway voor ${w.place}; de meting verschijnt in de widget.`);
  const example = w.example ? say(lang, 'Showcase example, not a real reading: ', 'Showcase-voorbeeld, geen echte meting: ') : '';
  if (id === 'sun') {
    const {rise, set} = w.reading.sun ?? {};
    if (!rise || !set) return say(lang, 'Where you are the sun does not rise or does not set today.', 'Waar je bent komt de zon vandaag niet op of gaat ze niet onder.');
    const minutes = Math.round((Date.parse(set) - Date.parse(rise)) / 60_000), length = `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
    return say(lang, `${example}Sunrise ${clockTime(rise)}, sunset ${clockTime(set)}; ${length} of daylight.`, `${example}Zonsopkomst ${clockTime(rise)}, zonsondergang ${clockTime(set)}; ${length} daglicht.`);
  }
  const c = condition(w.reading.now.symbol), sky = c.words === 'Weather' ? '' : `, ${(lang === 'nl' ? c.wordsNl : c.words).toLowerCase()}`;
  return `${example}${degrees(w.reading.now.t)}${sky}${w.example ? '' : ` ${say(lang, 'in', 'in')} ${w.place}`}. ${umbrella(w.reading, lang).words}`;
}

/**
 * The line for one widget, or null when there is nothing honest to say in a line (the record was not read, or the widget
 * shows something a sentence does not hold): the caller then names the widget, as before.
 */
export function stageLine(id: string, params: WidgetParams | undefined, data: LineData, lang: LineLang, now: Date): string | null {
  const spec = widgetSpec(id);
  if (!spec) return null;
  if (spec.gate && !data.gateOpen(id)) return lockedLine(spec.gate, lang);
  try {
    switch (id) {
      case 'weight': case 'steps': case 'water': case 'sleep': case 'health-hud': return healthLine(id, params, data, lang);
      case 'workouts': {
        if (!data.workouts) return null;
        const c = workoutsCard(data.workouts, data.healthDay, params?.range), words = rangeWords(c.window.range, lang);
        if (!c.all) return say(lang, 'No workouts logged yet.', 'Nog geen workouts gelogd.');
        if (!c.count) return say(lang, `No workouts logged in ${words}; the latest was ${plainName(c.recent[0]!.name)}, ${c.recent[0]!.dateText}.`, `Geen workouts gelogd in ${words}; de laatste was ${plainName(c.recent[0]!.name)}, ${c.recent[0]!.dateText}.`);
        return say(lang, `${formatNumber(c.count)} ${c.countWord} in ${words}, ${c.minutesText} in total.`, `${formatNumber(c.count)} ${c.count === 1 ? 'workout' : 'workouts'} in ${words}, samen ${c.minutesText}.`);
      }
      case 'habit-week': {
        if (!data.habits) return null;
        const w = habitWeek(data.habits, data.day);
        if (!w.count) return say(lang, 'You have no habits yet.', 'Je hebt nog geen gewoontes.');
        const streak = w.longest ? say(lang, `; longest streak ${streakLine(w.longest.streak, w.longest.unit, 'en')}`, `; langste reeks ${streakLine(w.longest.streak, w.longest.unit, 'nl')}`) : '';
        return w.due ? say(lang, `${w.done} of ${w.due} habits done today${streak}.`, `${w.done} van ${w.due} gewoontes vandaag gedaan${streak}.`) : say(lang, `No habits are due today${streak}.`, `Vandaag staan er geen gewoontes gepland${streak}.`);
      }
      case 'habits-hud': {
        if (!data.habits) return null;
        const h = habitsHud(data.habits, data.day), top = h.rings.find(r => r.streak > 0);
        if (!h.count) return say(lang, 'You have no habits yet.', 'Je hebt nog geen gewoontes.');
        const streak = top ? say(lang, `; longest streak ${streakLine(top.streak, top.unit, 'en')} (${plainName(top.title)})`, `; langste reeks ${streakLine(top.streak, top.unit, 'nl')} (${plainName(top.title)})`) : '';
        return say(lang, `${h.done} of ${h.due} habits done today${streak}.`, `${h.done} van ${h.due} gewoontes vandaag gedaan${streak}.`);
      }
      case 'journal': {
        if (!data.journal) return null;
        const m = journalMonth(data.journal, data.day);
        if (!m.total) return say(lang, 'No journal entries yet.', 'Nog niets in je dagboek.');
        const last = m.lastDate ? shortDate(m.lastDate, data.day) : '';
        if (!m.entries) return say(lang, `No journal entry this month yet${last ? `; the last one is from ${last}` : ''}.`, `Deze maand nog niets in je dagboek${last ? `; het laatste is van ${last}` : ''}.`);
        return say(lang, `${m.daysWritten} ${m.daysWritten === 1 ? 'day' : 'days'} written this month${m.streak > 1 ? `; ${m.streak} days in a row` : last ? `; last entry ${logDayWords(m.lastDate!, data.day)}` : ''}.`,
          `${m.daysWritten} ${m.daysWritten === 1 ? 'dag' : 'dagen'} geschreven deze maand${m.streak > 1 ? `; ${m.streak} dagen op rij` : last ? `; laatste keer ${logDayWords(m.lastDate!, data.day)}` : ''}.`);
      }
      case 'net-worth': case 'wealth-hud': case 'spending': case 'budgets': case 'bills': case 'money': return wealthLine(id, params, data, lang);
      case 'goal-focus': case 'goals-hud': case 'goal-pace': return goalsLine(id, params, data, lang);
      case 'tasks': {
        if (!data.tasks) return null;
        const view = tasksWidgetView(data.tasks, data.day, deviceDay, 'M');
        if (lang === 'en') return tasksHeadline(view);
        return view.state === 'empty' ? 'Nog geen taken.' : !view.todo ? 'Vandaag is er niets meer te doen.' : `${view.todo} te doen vandaag${view.carried ? `, ${view.carried} meegenomen` : ''}.`;
      }
      case 'notes': {
        if (!data.notes) return null;
        const n = recentNotes(data.notes);
        if (!n.total) return say(lang, 'No notes yet.', 'Nog geen notities.');
        return say(lang, `${n.inbox} ${n.inbox === 1 ? 'note waits' : 'notes wait'} in your inbox; ${n.total} in all.`, `${n.inbox} ${n.inbox === 1 ? 'notitie wacht' : 'notities wachten'} in je inbox; ${n.total} in totaal.`);
      }
      case 'time': {
        const r = timeRings(now), left = dayLeftWords(r.day.minutesLeft).replace(/ left$/, '');
        return say(lang, `It is ${formatTime(now)}, ${formatDate(now, {weekday: true})}; ${left === 'Under a minute' ? 'under a minute' : left} left today, ${r.year.daysLeft} ${r.year.daysLeft === 1 ? 'day' : 'days'} left this year.`,
          `Het is ${formatTime(now)}, ${formatDate(now, {weekday: true})}; nog ${left === 'Under a minute' ? 'minder dan een minuut' : left} vandaag, nog ${r.year.daysLeft} ${r.year.daysLeft === 1 ? 'dag' : 'dagen'} dit jaar.`);
      }
      case 'weather': case 'sun': return worldLine(id, data.weather, lang);
      case 'nova-brain': {
        if (!data.brain) return null;
        return data.brain.kind === 'none' ? say(lang, 'On-device answers; no AI connected.', 'Antwoorden op dit apparaat; geen AI verbonden.') : say(lang, `Answering now: ${data.brain.words}.`, `Nu antwoordt: ${data.brain.words}.`);
      }
      case 'nova-sees': {
        if (!data.sees) return null;
        return say(lang, `${data.sees.open} of ${data.sees.of} parts of your life are open to NOVA; weather (outside data) is ${data.sees.weather ? 'on' : 'off'}.`,
          `${data.sees.open} van de ${data.sees.of} delen van je leven staan open voor NOVA; het weer (gegevens van buiten) staat ${data.sees.weather ? 'aan' : 'uit'}.`);
      }
      case 'requests': {
        if (!data.asks) return null;
        const last = data.asks[0];
        if (!last) return say(lang, 'Nothing asked yet.', 'Nog niets gevraagd.');
        const text = last.text.length > 60 ? `${last.text.slice(0, 59)}…` : last.text;
        return say(lang, `${data.asks.length} ${data.asks.length === 1 ? 'request' : 'requests'} kept; the last was “${text}”.`, `${data.asks.length} ${data.asks.length === 1 ? 'vraag' : 'vragen'} bewaard; de laatste was “${text}”.`);
      }
      default: return null;
    }
  } catch { return null; } // a record this selector cannot read gives no line; the widget says what is wrong
}

/** The lines of the widgets a request makes, by widget id; a widget without a line is left out. */
export function stageLines(widgets: readonly MakeRequest[], data: LineData | null, lang: LineLang, now: Date): Record<string, string> {
  const out: Record<string, string> = {};
  if (!data) return out;
  for (const w of widgets) { const line = stageLine(w.id, w.params, data, lang, now); if (line) out[w.id] = line; }
  return out;
}

/** What NOVA can see, counted as its widget counts it: a part is open when NOVA's permission and the device's page-data switch are both on. */
export function seesCount(scopes: Readonly<Record<string, boolean>>, share: Readonly<Record<'today' | 'goals' | 'habits' | 'health' | 'wealth', boolean>>, includeHealth: boolean, weather: boolean): NonNullable<LineData['sees']> {
  const device: Readonly<Record<string, boolean>> = {today: share.today, goals: share.goals, habits: share.habits, health: share.health && includeHealth, wealth: share.wealth, notes: share.today, journal: share.today, earn: share.wealth};
  const keys = Object.keys(device);
  return {open: keys.filter(k => scopes[k] && device[k]).length, of: keys.length, weather};
}

/**
 * The records a line is written from, taken from what NOVA's chat engine already read for this moment (`ToolSources`, the
 * raw records: each line is still held back by its widget's own switch) with the same functions the widgets' hooks use.
 * `extras` are the few records that are not in the sources (read by the caller with the widgets' own reader).
 */
export function lineData(sources: ToolSources | null, gateOpen: (id: string) => boolean, extras: Pick<LineData, 'workouts' | 'weather' | 'brain' | 'sees' | 'asks'> = {}): LineData | null {
  if (!sources) return null;
  const now = sources.now.getTime();
  const tryOr = <T,>(read: () => T): T | null => { try { return read(); } catch { return null; } };
  const wealth = tryOr(() => ({hud: wealthHud(wealthOverview(sources.platform, now, [...sources.quotes])), accounts: (sources.accounts?.items ?? []).filter(a => !a.archivedAt).length}));
  const goals = tryOr(() => {
    const archived = (id: string) => Object.entries(sources.platform.legacyGoalUi ?? {}).some(([key, ui]) => (key === id || key.endsWith(`:${id}`)) && ui.archived);
    const summaries = unifiedGoalSummaries(sources.localGoals, sources.metadata, sources.platform, sources.quotes, now, sources.localActivity ? 'Local simulation' : 'Future Goal Manager').filter(g => !g.key.startsWith('legacy:') || !archived(g.id));
    const today = sources.habitDay, averages = (sources.averageGoals ?? []).map((a: AverageGoal) => { const p = averageProgress(a, sources.health, today); return {id: a.id, name: a.name, status: a.status, share: p.share, met: p.met}; });
    const arcs = goalArcs(summaries, 7, averages);
    // The lead goal exactly as the Goals HUD picks it (components/nova/holo/use-hud-data.ts): the first active goal with a
    // counted target whose pace line can be drawn.
    let leadHref: string | null = null;
    const paceDay = localDate(new Date(now));
    for (const goal of sources.platform.goals.filter(g => g.status === 'active' && g.type !== 'PROJECT')) {
      const summary = privateGoalSummary(sources.platform, goal, [...sources.quotes], now), current = Number(summary.current), target = Number(summary.target);
      if (summary.progressBound === 'unavailable' || !Number.isFinite(current) || !Number.isFinite(target) || target <= 0) continue;
      const points = privateGoalPoints(goal, sources.platform.contributions ?? [], current, paceDay);
      if (paceChart(points, current, target, paceDay, paceForecast(points, current, target, paceDay))) { leadHref = summary.href; break; }
    }
    return {summaries, arcs: arcs.arcs, active: arcs.active, leadHref};
  });
  return {
    gateOpen, day: sources.habitDay, healthDay: sources.healthDay,
    health: sources.health, habits: sources.habits.habits, journal: sources.journal?.entries ?? null, moneyLog: sources.moneyLog ?? null,
    bills: sources.ak?.bills ?? null, budgets: sources.nova?.budgets ?? null, tasks: sources.nova?.tasks ?? null, notes: sources.nova?.notes ?? null,
    wealth, goals, ...extras,
  };
}
