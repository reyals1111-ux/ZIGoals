import {previousPeriod, resolvePeriod} from '../../../ai/local-answers/exact/period';
import {weekStart} from '../../../ai/tools/range';
import {addLocalDays} from '../../../local-date';
import {formatDate, formatMonth} from '../../../visual-format';

/**
 * Session AS (ADR-042 Part 2): focus sessions as a heat grid and as a gauge. A day's minutes are its sessions' focused
 * seconds (the same sum as the exact layer's `focusTrack`, lib/ai/local-answers/exact/day.ts). A day without a session
 * is an empty cell: nothing was focused there, and nothing is guessed.
 * - `focusHeat`: the last 13 weeks, a column a week from Monday, each day's intensity by its minutes against the best day;
 * - `focusGauge`: the minutes of this week so far beside the whole of last week.
 */
type Session = {day: string; focusedSeconds: number};
const perDay = (sessions: readonly Session[]) => {
  const minutes = new Map<string, number>(), count = new Map<string, number>();
  for (const s of sessions) { minutes.set(s.day, (minutes.get(s.day) ?? 0) + s.focusedSeconds / 60); count.set(s.day, (count.get(s.day) ?? 0) + 1); }
  return {minutes, count};
};
export type HeatCell = {date: string; minutes: number | null; /** 0: no session; 1–4: the day's minutes against the best day. */ level: 0 | 1 | 2 | 3 | 4; today: boolean; ahead: boolean; words: string};
export type HeatView = {
  from: string; to: string;
  weeks: {key: string; month: string | null; cells: HeatCell[]}[];
  /** Days with a session, the minutes and the sessions of the weeks shown, and the day with the most minutes. */
  days: number; minutes: number; sessions: number; best: {date: string; minutes: number} | null;
};
export const HEAT_WEEKS = 13;
export function focusHeat(sessions: readonly Session[], today: string, weeks = HEAT_WEEKS): HeatView {
  const from = addLocalDays(weekStart(today), -(weeks - 1) * 7), by = perDay(sessions.filter(s => s.day >= from && s.day <= today));
  const top = Math.max(0, ...by.minutes.values());
  let best: {date: string; minutes: number} | null = null;
  for (const [date, m] of by.minutes) if (!best || m > best.minutes || (m === best.minutes && date > best.date)) best = {date, minutes: Math.round(m)};
  const grid = Array.from({length: weeks}, (_, w) => {
    const key = addLocalDays(from, w * 7), cells = Array.from({length: 7}, (_, i): HeatCell => {
      const date = addLocalDays(key, i), m = by.minutes.get(date), ahead = date > today, on = formatDate(date, {weekday: true, year: false});
      const level = m === undefined || top <= 0 ? 0 : Math.max(1, Math.min(4, Math.ceil(m / top * 4))) as 1 | 2 | 3 | 4;
      return {date, minutes: m === undefined ? null : Math.round(m), level, today: date === today, ahead, words: ahead ? `${on}: still to come` : m === undefined ? `${on}: no focus session` : `${on}: ${Math.round(m)} minutes`};
    });
    const first = cells.find(c => c.date.slice(8, 10) === '01');
    return {key, month: first ? formatMonth(`${first.date}T12:00:00Z`, {year: false, timeZone: 'UTC'}) : null, cells};
  });
  return {from, to: today, weeks: grid, days: by.minutes.size, minutes: Math.round([...by.minutes.values()].reduce((a, b) => a + b, 0)), sessions: [...by.count.values()].reduce((a, b) => a + b, 0), best};
}

export type GaugeSide = {from: string; to: string; minutes: number; sessions: number; days: number};
export type GaugeView = {
  now: GaugeSide; before: GaugeSide;
  /** Each side's arc against the larger of the two (0–1); null for a week without a session (drawn unlit, never as zero). */
  nowShare: number | null; beforeShare: number | null;
  /** This week's minutes minus last week's. */
  delta: number;
};
/**
 * The gauge's two sides: the answer's period (`token`; this week by default) and the period before it. This week stands
 * beside the whole of last week (as the Focus page does); any other period beside the one of the same length before it
 * ("did I focus today": today beside yesterday). Session AS: it showed this week whatever the answer was about.
 */
export function focusGauge(sessions: readonly Session[], today: string, token = 'this-week'): GaugeView {
  const sideOf = (p: {from: string; to: string}): GaugeSide => {
    const by = perDay(sessions.filter(s => s.day >= p.from && s.day <= p.to));
    return {from: p.from, to: p.to, minutes: Math.round([...by.minutes.values()].reduce((a, b) => a + b, 0)), sessions: [...by.count.values()].reduce((a, b) => a + b, 0), days: by.minutes.size};
  };
  const period = resolvePeriod(token, today) ?? resolvePeriod('this-week', today)!, earlier = period.token === 'this-week' ? resolvePeriod('last-week', today)! : previousPeriod(period, today) ?? resolvePeriod('last-week', today)!;
  const now = sideOf(period), before = sideOf(earlier), top = Math.max(now.minutes, before.minutes, 1);
  return {now, before, nowShare: now.sessions ? now.minutes / top : null, beforeShare: before.sessions ? before.minutes / top : null, delta: now.minutes - before.minutes};
}
