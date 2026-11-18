import {formatClock} from '../../../visual-format';
import type {ClockInput} from '../../holo/agenda';

/**
 * Session AS (ADR-042 Part 2, family: timelines): today's agenda on a 24-hour line. The items are the Agenda page's own
 * day (components/nova/holo/use-agenda-today.ts); an item with a time is a mark at its time, one without a time is
 * counted in words ("3 any time"), never placed. `now` is the wall clock ("HH:MM"). Marks that would sit on top of each
 * other are stacked in lanes.
 */
export type DayMark = {key: string; /** 0–1 along the day. */ at: number; lane: number; kind: 'done' | 'skipped' | 'open' | 'earlier'; pillar: string; title: string; time: string; words: string};
export type DayTimeline = {
  marks: DayMark[];
  /** Where now stands (0–1); null when the clock could not be read. */
  nowAt: number | null; now: string;
  total: number; done: number; skipped: number; left: number; timed: number; anytime: number;
  /** The next open item at or after now. */
  next: {title: string; time: string} | null;
  ticks: {at: number; label: string}[];
};
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/, LANES = 4;
const share = (clock: string): number | null => { const m = TIME.exec(clock); return m ? (Number(m[1]) * 60 + Number(m[2])) / 1440 : null; };
export function dayTimeline(items: readonly ClockInput[], now: string): DayTimeline {
  const nowAt = share(now), clock = nowAt === null ? '00:00' : now;
  const timed = items.filter(i => i.time && TIME.test(i.time)).sort((a, b) => a.time!.localeCompare(b.time!));
  // An item within 2 % of the line (about half an hour) of the one before it in a lane moves up a lane.
  const last: number[] = [];
  const marks = timed.map((i): DayMark => {
    const at = share(i.time!)!;
    let lane = 0;
    while (lane < LANES - 1 && last[lane] !== undefined && at - last[lane]! < 0.02) lane++;
    last[lane] = at;
    const kind = i.state === 'open' ? (i.time! < clock ? 'earlier' : 'open') : i.state;
    return {key: i.id, at, lane, kind, pillar: i.pillar, title: i.title, time: i.time!, words: `${formatClock(i.time!)} · ${kind === 'done' ? 'done' : kind === 'skipped' ? 'skipped' : kind === 'earlier' ? 'open, its time has passed' : 'open'}`};
  });
  const next = timed.find(i => i.state === 'open' && i.time! >= clock);
  return {
    marks, nowAt, now: clock, total: items.length, done: items.filter(i => i.state === 'done').length, skipped: items.filter(i => i.state === 'skipped').length, left: items.filter(i => i.state === 'open').length,
    timed: timed.length, anytime: items.length - timed.length, next: next ? {title: next.title, time: next.time!} : null,
    ticks: [0, 6, 12, 18, 24].map(h => ({at: h / 24, label: String(h).padStart(2, '0')})),
  };
}
