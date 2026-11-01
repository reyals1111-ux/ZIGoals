import {addLocalDays, localWeekday} from '../local-date';
import {instantAt, wallClock} from '../zone-time';
import type {ImportedEvent} from './calendar';

/**
 * Session AK (T2): an imported event's starts between two days, on this device's calendar. Pure and bounded: a rule
 * walks at most 3,000 candidate starts per call (a rule with no COUNT jumps straight to the range, so an old daily
 * event costs the same as a new one) and gives at most 400 starts; a range is at most 62 days (the Agenda's).
 *
 * A start with a zone (UTC or a named zone) is moved to the device's zone, so a call at 09:00 New York shows at 15:00
 * in Brussels, on the right day; a floating time and an all-day event keep their wall time and day wherever the person
 * is. An all-day event of several days shows on each of its days (at most 14).
 */
export const MAX_STEPS = 3000, MAX_STARTS = 400;
export type Occurrence = {date: string; time: string | null; minutes: number; /** Which day of a multi-day all-day event (1-based). */ part?: number; parts?: number};

const pad = (n: number) => String(n).padStart(2, '0');
const dayNum = (d: string) => Math.floor(Date.parse(`${d}T12:00:00Z`) / 86_400_000);
const fromNum = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);
const monthIndex = (d: string) => Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7)) - 1;
const monthDays = (y: number, m0: number) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();

/** The rule's wall-time start days (in the event's own terms) that could fall in [from, to], in order, bounded. */
export function ruleStarts(event: ImportedEvent, from: string, to: string): string[] {
  const first = event.start.slice(0, 10), rule = event.rule;
  if (!rule || event.firstOnly) return first >= from && first <= to ? [first] : [];
  const out: string[] = [], interval = rule.interval ?? 1, untilDay = rule.until?.slice(0, 10), untilWall = rule.until;
  const clock = event.start.length > 10 ? event.start.slice(11) : null;
  const pastUntil = (d: string) => untilDay !== undefined && (d > untilDay || (d === untilDay && !!clock && untilWall!.length > 10 && clock > untilWall!.slice(11)));
  let counted = 0, steps = 0;
  // Each candidate in order: false stops the walk.
  const take = (d: string): boolean => {
    if (d < first) return true;
    if (pastUntil(d)) return false;
    counted++;
    if (rule.count !== undefined && counted > rule.count) return false;
    if (d > to) return false;
    if (d >= from) out.push(d);
    return out.length < MAX_STARTS;
  };
  // Without COUNT, nothing before the range matters, so the walk starts near it.
  const jump = rule.count === undefined;
  if (rule.freq === 'DAILY') {
    const filter = rule.byDay?.length ? new Set(rule.byDay) : null, start = dayNum(first);
    let k = jump ? Math.max(0, Math.floor((dayNum(from) - start) / interval)) : 0;
    for (; steps < MAX_STEPS; steps++, k++) {
      const d = fromNum(start + k * interval);
      if (filter && !filter.has(localWeekday(d))) { if (d > to || pastUntil(d)) break; continue; }
      if (!take(d)) break;
    }
  } else if (rule.freq === 'WEEKLY') {
    const days = rule.byDay?.length ? [...rule.byDay].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)) : [localWeekday(first)];
    const monday = dayNum(first) - ((localWeekday(first) + 6) % 7);
    let k = jump ? Math.max(0, Math.floor((dayNum(from) - monday) / (7 * interval)) - 1) : 0;
    outer: for (; steps < MAX_STEPS; k++) for (const wd of days) {
      steps++;
      if (!take(fromNum(monday + k * 7 * interval + ((wd + 6) % 7)))) break outer;
      if (steps >= MAX_STEPS) break outer;
    }
  } else if (rule.freq === 'MONTHLY') {
    const startMonth = monthIndex(first), startDay = Number(first.slice(8));
    let k = jump ? Math.max(0, Math.floor((monthIndex(from) - startMonth) / interval) - 1) : 0;
    outer: for (; steps < MAX_STEPS; k++) {
      const m = startMonth + k * interval, y = Math.floor(m / 12), m0 = m % 12, len = monthDays(y, m0);
      const prefix = `${y}-${pad(m0 + 1)}-`;
      let days: number[];
      if (rule.byDay?.length && rule.nth !== undefined) {
        // The nth (or nth-from-last) of the given weekdays in the month.
        const all: number[] = [];
        for (let d = 1; d <= len; d++) if (rule.byDay.includes(new Date(Date.UTC(y, m0, d)).getUTCDay())) all.push(d);
        const pick = rule.nth > 0 ? all[rule.nth - 1] : all[all.length + rule.nth];
        days = pick === undefined ? [] : [pick];
      } else days = (rule.byMonthDay?.length ? rule.byMonthDay : [startDay]).map(d => d < 0 ? len + 1 + d : d).filter(d => d >= 1 && d <= len).sort((a, b) => a - b);
      steps++;
      if (`${prefix}01` > to && !(rule.count !== undefined)) break;
      for (const d of [...new Set(days)]) if (!take(`${prefix}${pad(d)}`)) break outer;
      if (`${prefix}01` > to || (untilDay && `${prefix}01` > untilDay)) break;
    }
  } else {
    const [y0, md] = [Number(first.slice(0, 4)), first.slice(4)];
    let k = jump ? Math.max(0, Math.floor((Number(from.slice(0, 4)) - y0) / interval) - 1) : 0;
    for (; steps < MAX_STEPS; steps++, k++) {
      const y = y0 + k * interval, d = `${y}${md}`;
      if (`${y}-01-01` > to) break;
      if (md === '-02-29' && monthDays(y, 1) < 29) continue; // no 29 February that year: skipped, as RFC 5545 says
      if (!take(d)) break;
    }
  }
  return out;
}

/**
 * The event's occurrences between `from` and `to` (days on this device), each with its local day and time. `zone` is
 * the device's zone (a zoned start is shown in it).
 */
export function occurrences(event: ImportedEvent, from: string, to: string, zone: string): Occurrence[] {
  const timed = !event.allDay && event.start.length > 10, clock = timed ? event.start.slice(11) : null;
  const span = event.allDay ? Math.max(1, Math.min(14, event.days ?? 1)) : 1;
  // A zone can move a start a day either way; a long all-day event starts before the range.
  const wallFrom = addLocalDays(from, -(span - 1) - (timed ? 1 : 0)), wallTo = addLocalDays(to, timed ? 1 : 0);
  const skip = new Set(event.exdates ?? []);
  const out: Occurrence[] = [];
  for (const day of ruleStarts(event, wallFrom, wallTo)) {
    if (skip.has(day) || (clock && skip.has(`${day}T${clock}`))) continue;
    if (!timed) {
      for (let i = 0; i < span; i++) {
        const d = addLocalDays(day, i);
        if (d >= from && d <= to) out.push({date: d, time: null, minutes: 0, ...(span > 1 ? {part: i + 1, parts: span} : {})});
      }
      continue;
    }
    let date = day, time = clock!;
    if (event.tz) {
      try {
        const ms = event.tz === 'UTC' ? Date.parse(`${day}T${clock}:00Z`) : instantAt(day, clock!, event.tz), w = wallClock(ms, zone);
        date = w.date; time = w.clock;
      } catch { /* a zone this device cannot read: the wall time as written */ }
    }
    if (date >= from && date <= to) out.push({date, time, minutes: event.minutes ?? 0});
  }
  return out;
}
