import {CYCLE_LINE, cycleDay, nextPeriodEstimate, periodStarts} from '../../cycle/engine';
import {cycleOn, type Cycle} from '../../cycle/store';
import {elapsedMs, fastingHistory, formatFast, runningSession} from '../../fasting/engine';
import type {Fasting} from '../../fasting/schema';
import {foodLoggingMonth, foodMonthWords} from '../../food-log/consistency';
import type {HealthData} from '../../health';
import {dailyData} from '../../health-daily';
import {DIRECTION_WORDS, RECENT_DAYS, YEAR_DAYS, healthTrends, type TrendDirection, type TrendId} from '../../health-trends/trends';
import {weightText} from '../../health-units';
import type {Meditation} from '../../meditation/schema';
import {meditationSummary, minutesText, weeklyBars} from '../../meditation/stats';
import {dayDoses, supplementSummary} from '../../supplements/log';
import type {Supplements} from '../../supplements/schema';
import {formatNumber} from '../../visual-format';
import {durationWords} from '../widgets/words';
import {journalMonth, type JournalWeek} from './journal';
import {shortDate} from './weight';

/**
 * Session AM-2 (step 3, round 2, "NOVA connected"): the figures of six more Health widgets NOVA makes on request, pure
 * and read only, each from the Health page's own engine: "Health trends" (lib/health-trends/trends.ts), "Food-logging
 * days" (lib/food-log/consistency.ts), "Fasting" (lib/fasting/engine.ts), "Meditation" (lib/meditation/stats.ts),
 * "Supplements" (lib/supplements/log.ts) and "Cycle" (lib/cycle/engine.ts).
 *
 * Health rule (ADR-037 Q14, Q16; AM-S5): every one of these exists only under the Health gate — NOVA's Health
 * permission and the device's Health switch — and a request for one is kept by the widget's name, never the person's
 * words. The cycle log is the most sensitive: it also needs its own switch on Health, its figures show on the screen
 * only, and NOVA's answer line never carries one (lib/nova/summon/more-lines.ts). These functions hold no gate of their
 * own: the caller reads the records only once the gate is open.
 *
 * Unknown is not zero: a day without a record is not counted, a dose that was not marked is "not logged", a trend with
 * too few days waits and says how many it has. Directions are words ("up", "down"), never a judgement. A cycle estimate
 * is a range from past cycles, information and not a diagnosis. Nothing is written.
 */

/* ---- Health trends: the last 90 days against the last 365 ---- */
export type TrendRow = {id: TrendId; label: string; recent: string; year: string; recentDays: number; yearDays: number; direction: TrendDirection; words: string; arrow: string; /** The recent value against the larger of the two (for the meters). */ share: number; yearShare: number};
export type TrendWait = {id: TrendId; label: string; words: string};
export type HealthTrendsCard = {/** 'empty': none of the four is recorded; 'waiting': recorded, not enough days yet. */ state: 'empty' | 'waiting' | 'live'; rows: TrendRow[]; waiting: TrendWait[]; recentDays: number; yearDays: number};
export function healthTrendsCard(health: HealthData, today: string): HealthTrendsCard {
  const t = healthTrends(health, today), unit = dailyData(health).preferences.weightUnit;
  const value = (id: TrendId, v: number) => id === 'steps' ? `${formatNumber(Math.round(v))} steps` : id === 'sleep' ? durationWords(Math.round(v)) : id === 'weight' ? weightText(Math.round(v), unit) : `${formatNumber(Math.round(v))} bpm`;
  const rows = t.ready.map((r): TrendRow => { const top = Math.max(r.recent.value, r.year.value) || 1; return {id: r.id, label: r.label, recent: value(r.id, r.recent.value), year: value(r.id, r.year.value), recentDays: r.recent.days, yearDays: r.year.days, direction: r.direction, words: DIRECTION_WORDS[r.direction].words, arrow: DIRECTION_WORDS[r.direction].arrow, share: r.recent.value / top, yearShare: r.year.value / top}; });
  const waiting = t.pending.map((p): TrendWait => ({id: p.id, label: p.label, words: `${p.recentDays} of ${p.needRecent} recent days, ${p.yearDays} of ${p.needYear} this year`}));
  return {state: rows.length ? 'live' : waiting.length ? 'waiting' : 'empty', rows, waiting, recentDays: RECENT_DAYS, yearDays: YEAR_DAYS};
}
export const healthTrendsRows = (card: HealthTrendsCard): [string, string][] => card.state === 'empty' ? [['Health trends', 'Nothing recorded yet']] : [
  ...card.rows.map(r => [r.label, `${r.words}: ${r.recent} over the last ${card.recentDays} days (${r.recentDays} days recorded), ${r.year} over the last ${card.yearDays} (${r.yearDays} days recorded)`] as [string, string]),
  ...card.waiting.map(w => [w.label, `Not enough days yet: ${w.words}`] as [string, string]),
];

/* ---- Food-logging days ---- */
export type FoodDaysCard = {/** 'empty': nothing was ever logged in the diary. */ state: 'empty' | 'live'; month: string; logged: number; daysSoFar: number; daysInMonth: number; words: string; /** The month as weeks from Monday: a day with a log is lit. */ weeks: JournalWeek[]; firstMonday: string; /** Days in a row with a log, ending today (or yesterday while today is open). */ run: number; lastDay: string | null};
export function foodDaysCard(health: Pick<HealthData, 'diary'>, today: string): FoodDaysCard {
  const f = foodLoggingMonth(health, today), days = [...new Set(health.diary.filter(e => e.date <= today).map(e => e.date))].sort(), m = journalMonth(days.map(date => ({date})), today);
  return {state: days.length ? 'live' : 'empty', month: f.month, logged: f.logged, daysSoFar: f.daysSoFar, daysInMonth: f.daysInMonth, words: foodMonthWords(f), weeks: m.weeks, firstMonday: m.firstMonday, run: m.streak, lastDay: days.at(-1) ?? null};
}
export const foodDaysRows = (card: FoodDaysCard): [string, string][] => [
  ['Days with food logged', card.state === 'empty' ? 'Nothing logged yet' : card.words],
  ['Days in a row', card.run > 0 ? `${card.run}` : 'No run going'],
];

/* ---- Fasting ---- */
export type FastLine = {id: string; hours: number; hoursText: string; day: string; dayText: string; targetHours: number; reached: boolean};
export type FastingCard = {
  /** 'empty': no fast was ever logged. */
  state: 'empty' | 'live';
  /** The fast that is running now, if one is. */
  running: {elapsed: string; elapsedMs: number; targetHours: number; share: number; reached: boolean; startedAt: string} | null;
  /** Ended fasts, newest first. No totals, no "longest": hours and a target only (the timer's own rule). */
  history: FastLine[];
  count: number;
};
const HOUR_MS = 3_600_000;
export function fastingCard(fasting: Fasting, now: Date, today: string, shown = 5): FastingCard {
  const run = runningSession(fasting), history = fastingHistory(fasting, shown);
  const running = run ? (() => { const ms = elapsedMs(run, now).ms, target = run.targetHours * HOUR_MS; return {elapsed: formatFast(ms), elapsedMs: ms, targetHours: run.targetHours, share: Math.min(1, ms / target), reached: ms >= target, startedAt: run.startedAt}; })() : null;
  return {state: fasting.sessions.length ? 'live' : 'empty', running, count: fasting.sessions.filter(s => s.endedAt !== null).length,
    history: history.map(h => ({id: h.session.id, hours: h.hours, hoursText: `${formatNumber(h.hours, {maximumFractionDigits: 1})} h`, day: h.day, dayText: shortDate(h.day, today), targetHours: h.session.targetHours, reached: h.hours >= h.session.targetHours}))};
}
export const fastingRows = (card: FastingCard): [string, string][] => card.state === 'empty' ? [['Fasting', 'No fast logged yet']] : [
  ['Now', card.running ? `A fast is running: ${card.running.elapsed} of ${card.running.targetHours} h` : 'No fast is running'],
  ...card.history.map(h => [`Fast of ${h.dayText}`, `${h.hoursText}, target ${h.targetHours} h`] as [string, string]),
];

/* ---- Meditation ---- */
export type MeditationCard = {/** 'empty': no session was ever logged. */ state: 'empty' | 'live'; thisWeek: number; thisWeekText: string; goal: number | null; share: number | null; daysInARow: number; sessions: number; totalText: string; longestText: string; last: string | null;
  /** The last eight weeks, this one last; a week without a session is an empty slot. */ weeks: {key: string; label: string; minutes: number | null; sessions: number}[]};
export function meditationCard(meditation: Meditation | null | undefined, today: string): MeditationCard {
  const m = meditation ?? {version: 1 as const, sessions: []}, s = meditationSummary(m, today);
  return {state: s.sessions ? 'live' : 'empty', thisWeek: s.thisWeek, thisWeekText: minutesText(s.thisWeek), goal: s.goal, share: s.goal ? Math.min(1, s.thisWeek / s.goal) : null, daysInARow: s.daysInARow, sessions: s.sessions, totalText: minutesText(s.totalMinutes), longestText: minutesText(s.longestMinutes), last: s.last,
    weeks: weeklyBars(m, today, 8).map((w, i, all) => ({key: w.weekStart, label: i === 0 || i === all.length - 1 ? shortDate(w.weekStart, today) : '', minutes: w.sessions ? w.minutes : null, sessions: w.sessions}))};
}
export const meditationRows = (card: MeditationCard, today: string): [string, string][] => card.state === 'empty' ? [['Meditation', 'No session logged yet']] : [
  ['This week', `${card.thisWeekText}${card.goal ? ` of your ${card.goal} min a week` : ''}`],
  ['Days in a row', card.daysInARow > 0 ? `${card.daysInARow}` : 'No run going'],
  ['All sessions', `${card.sessions}, ${card.totalText} in total; the longest ${card.longestText}`],
  ...card.weeks.map(w => [`Week of ${shortDate(w.key, today)}`, w.minutes === null ? 'No session' : `${minutesText(w.minutes)} in ${w.sessions} ${w.sessions === 1 ? 'session' : 'sessions'}`] as [string, string]),
];

/* ---- Supplements and medication ---- */
export type DoseLine = {key: string; name: string; dose: string | null; slot: string; status: 'taken' | 'skipped' | null; statusWords: string};
export type SupplementsCard = {/** 'empty': nothing is kept track of. */ state: 'empty' | 'live'; items: number; today: DoseLine[]; planned: number; taken: number; skipped: number; notLogged: number;
  /** The last 14 days per item: planned doses, taken, skipped, and not logged (unknown, said as such). */ summary: {id: string; name: string; planned: number; taken: number; share: number | null; words: string}[]};
export function supplementsCard(record: Supplements, today: string): SupplementsCard {
  const names = new Map((record.items ?? []).map(i => [i.id, i.name])), doses = dayDoses(record, today), timed = doses.filter(d => d.slot !== 'any');
  const taken = timed.filter(d => d.status === 'taken').length, skipped = timed.filter(d => d.status === 'skipped').length;
  return {state: record.items?.length ? 'live' : 'empty', items: record.items?.length ?? 0, planned: timed.length, taken, skipped, notLogged: timed.length - taken - skipped,
    today: doses.map(d => ({key: `${d.itemId}|${d.slot}`, name: d.name, dose: d.dose ?? null, slot: d.slot === 'any' ? 'as needed' : d.slot, status: d.status, statusWords: d.status === 'taken' ? 'Taken' : d.status === 'skipped' ? 'Skipped' : d.slot === 'any' ? 'Not logged today' : 'Not logged yet'})),
    summary: supplementSummary(record, today, 14).map(s => ({id: s.itemId, name: names.get(s.itemId) ?? '', planned: s.planned, taken: s.taken, share: s.planned ? Math.min(1, s.taken / s.planned) : null,
      words: s.planned ? `${s.taken} of ${s.planned} taken${s.skipped ? `, ${s.skipped} skipped` : ''}${s.notLogged ? `, ${s.notLogged} not logged` : ''}` : `${s.taken} taken, as needed`}))};
}
export const supplementsRows = (card: SupplementsCard): [string, string][] => card.state === 'empty' ? [['Supplements and medication', 'Nothing kept track of yet']] : [
  ['Today', card.planned ? `${card.taken} of ${card.planned} doses taken${card.skipped ? `, ${card.skipped} skipped` : ''}${card.notLogged ? `, ${card.notLogged} not logged yet` : ''}` : 'Nothing planned for today'],
  ...card.today.map(d => [`${d.name}${d.dose ? `, ${d.dose}` : ''} (${d.slot})`, d.statusWords] as [string, string]),
  ...card.summary.map(s => [`${s.name}, the last 14 days`, s.words] as [string, string]),
  ['How to read this', 'Not logged is unknown, never missed. Your own log, not medical advice.'],
];

/* ---- Cycle (the most sensitive: on the screen only) ---- */
export type CycleCard = {
  /** 'off': the cycle log's own switch on Health is off (nothing is read out); 'empty': on, nothing logged. */
  state: 'off' | 'empty' | 'live';
  /** Which day of the current cycle today is; null: none logged, or a long pause in logging. */
  day: number | null;
  lastStart: string | null; cycles: number;
  /** The next period as a range from past cycles, only after three complete ones. */
  estimate: {from: string; to: string; shortest: number; longest: number; passed: boolean} | null;
  /** How many complete cycles an estimate still needs. */
  need: number | null;
  rule: string;
};
export function cycleCard(record: Cycle, today: string): CycleCard {
  if (!cycleOn(record)) return {state: 'off', day: null, lastStart: null, cycles: 0, estimate: null, need: null, rule: CYCLE_LINE};
  const starts = periodStarts(record).filter(s => s <= today), e = nextPeriodEstimate(record, today);
  return {state: starts.length ? 'live' : 'empty', day: cycleDay(record, today), lastStart: starts.at(-1) ?? null, cycles: e.cycles,
    estimate: e.kind === 'range' ? {from: e.from, to: e.to, shortest: e.shortest, longest: e.longest, passed: e.passed} : null, need: e.kind === 'not-yet' ? e.need - e.cycles : null, rule: CYCLE_LINE};
}
export function cycleRows(card: CycleCard, day: (date: string) => string): [string, string][] {
  if (card.state === 'off') return [['Cycle', 'The cycle log is off on Health']];
  if (card.state === 'empty') return [['Cycle', 'Nothing logged yet']];
  return [
    ['Day of this cycle', card.day === null ? 'Not known: no recent period logged' : `Day ${card.day}`],
    ['Last period started', card.lastStart ? day(card.lastStart) : 'Not logged'],
    ['Next period, an estimate', card.estimate ? `${card.estimate.passed ? 'The estimated days have passed: ' : ''}between ${day(card.estimate.from)} and ${day(card.estimate.to)}, from cycles of ${card.estimate.shortest} to ${card.estimate.longest} days` : `Not yet: ${card.need} more complete ${card.need === 1 ? 'cycle' : 'cycles'} needed`],
    ['How to read this', card.rule],
  ];
}
