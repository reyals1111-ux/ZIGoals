import {addLocalDays, localWeekday} from '../local-date';
import {instantAt, wallClock} from '../zone-time';
import type {IcsRule, ImportedEvent} from './calendar';
import {moveWall} from './zone-move';

/**
 * Session AK (T2): an imported event's starts between two days, on this device's calendar. Pure and bounded: a rule
 * walks at most 3,000 candidate starts per call (a rule with no COUNT jumps straight to the range, so an old daily
 * event costs the same as a new one) and gives at most 400 starts; a range is at most 62 days (the Agenda's).
 *
 * A start with a zone (UTC or a named zone) is moved to the device's zone, so a call at 09:00 New York shows at 15:00
 * in Brussels, on the right day; a floating time and an all-day event keep their wall time and day wherever the person
 * is. An all-day event of several days shows on each of its days (at most 14).
 *
 * A rule with a COUNT (Z1B-4) is settled into the UNTIL of its last start (`settleCount`, arithmetic for DAILY and
 * WEEKLY, a numeric month or year walk otherwise), at import and, for a rule stored before that, once per rule in
 * memory; so a view change never walks a COUNT series from an old start.
 */
export const MAX_STEPS = 3000, MAX_STARTS = 400;
export type Occurrence = {date: string; time: string | null; minutes: number; /** Which day of a multi-day all-day event (1-based). */ part?: number; parts?: number};

const pad = (n: number) => String(n).padStart(2, '0');
const dayNum = (d: string) => Math.floor(Date.parse(`${d}T12:00:00Z`) / 86_400_000);
const fromNum = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);
const monthIndex = (d: string) => Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7)) - 1;
const monthDays = (y: number, m0: number) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();

const leap = (y: number) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
const lengthOf = (y: number, m0: number) => m0 === 1 ? (leap(y) ? 29 : 28) : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m0]!;
/** 0 = Sunday for a day number (1970-01-01, day 0, was a Thursday). */
const weekdayOf = (n: number) => (((n + 4) % 7) + 7) % 7;
const LAST_DAY = dayNum('9999-12-31');

/** The month's days a MONTHLY rule names, in order, once each (`startDay` when it names none). */
function monthDaysOf(rule: IcsRule, y: number, m0: number, startDay: number): number[] {
  const len = lengthOf(y, m0);
  if (rule.byDay?.length && rule.nth !== undefined) {
    const wd1 = weekdayOf(dayNum(`${y}-${pad(m0 + 1)}-01`)), all: number[] = [];
    for (let d = 1; d <= len; d++) if (rule.byDay.includes((wd1 + d - 1) % 7)) all.push(d);
    const pick = rule.nth > 0 ? all[rule.nth - 1] : all[all.length + rule.nth];
    return pick === undefined ? [] : [pick];
  }
  return [...new Set((rule.byMonthDay?.length ? rule.byMonthDay : [startDay]).map(d => d < 0 ? len + 1 + d : d).filter(d => d >= 1 && d <= len))].sort((a, b) => a - b);
}

/**
 * The day of a COUNT rule's last start (UNTIL not applied), or null when the rule gives no start within the walk's
 * reach. DAILY and WEEKLY are arithmetic (constant work, and exact however far the series goes); MONTHLY and YEARLY walk
 * numbers, at most MAX_STEPS months or years, as a view's walk did, so nothing a view used to show is lost.
 */
export function countEnd(event: ImportedEvent): string | null {
  const rule = event.rule;
  if (!rule || rule.count === undefined) return null;
  const first = event.start.slice(0, 10), n = rule.count, interval = rule.interval ?? 1, start = dayNum(first);
  const at = (num: number) => fromNum(Math.min(num, LAST_DAY));
  if (rule.freq === 'DAILY') {
    if (!rule.byDay?.length) return at(start + (n - 1) * interval);
    // The weekdays of start + k × interval repeat every 7 steps: the steps of one round that pass the filter.
    const filter = new Set(rule.byDay), hits: number[] = [];
    for (let k = 0; k < 7; k++) if (filter.has(weekdayOf(start + k * interval))) hits.push(k);
    if (!hits.length) return null;
    return at(start + (Math.floor((n - 1) / hits.length) * 7 + hits[(n - 1) % hits.length]!) * interval);
  }
  if (rule.freq === 'WEEKLY') {
    const offsets = (rule.byDay?.length ? [...new Set(rule.byDay)] : [weekdayOf(start)]).map(wd => (wd + 6) % 7).sort((a, b) => a - b);
    const monday = start - (weekdayOf(start) + 6) % 7, firstWeek = offsets.filter(o => monday + o >= start);
    if (n <= firstWeek.length) return at(monday + firstWeek[n - 1]!);
    const rest = n - firstWeek.length - 1;
    return at(monday + (1 + Math.floor(rest / offsets.length)) * 7 * interval + offsets[rest % offsets.length]!);
  }
  let counted = 0, last: string | null = null;
  if (rule.freq === 'MONTHLY') {
    const startMonth = monthIndex(first), startDay = Number(first.slice(8));
    for (let k = 0; k < MAX_STEPS; k++) {
      const m = startMonth + k * interval, y = Math.floor(m / 12), m0 = m % 12;
      if (y > 9999) break;
      for (const d of monthDaysOf(rule, y, m0, startDay)) {
        if (k === 0 && d < startDay) continue;
        last = `${y}-${pad(m0 + 1)}-${pad(d)}`;
        if (++counted >= n) return last;
      }
    }
    return last;
  }
  const y0 = Number(first.slice(0, 4)), md = first.slice(4);
  for (let k = 0; k < MAX_STEPS; k++) {
    const y = y0 + k * interval;
    if (y > 9999) break;
    if (md === '-02-29' && !leap(y)) continue;
    last = `${y}${md}`;
    if (++counted >= n) return last;
  }
  return last;
}

/**
 * The same rule with its COUNT replaced by the UNTIL of its last start (the earlier of that and the rule's own UNTIL),
 * or null when it gives no start. Shows the same starts as the COUNT, but a view of any range jumps straight to it.
 */
export function settleCount(event: ImportedEvent): IcsRule | null {
  const rule = event.rule;
  if (!rule || rule.count === undefined) return rule ?? null;
  const end = countEnd(event);
  if (end === null) return null;
  const clock = event.start.length > 10 ? event.start.slice(11) : null, ownEnd = clock ? `${end}T${clock}` : end;
  const out: IcsRule = {...rule, until: rule.until !== undefined && pastUntil(end, clock, rule.until) ? rule.until : ownEnd};
  delete out.count;
  return out;
}
/** A start day (with the event's clock) after the rule's UNTIL (a day, or a day and a time). */
const pastUntil = (d: string, clock: string | null, until: string) => d > until.slice(0, 10) || (d === until.slice(0, 10) && !!clock && until.length > 10 && clock > until.slice(11));

/** Rules stored with a COUNT (before import settled them), settled once each; bounded. */
const settled = new Map<string, IcsRule | null>();
function settledRule(event: ImportedEvent): IcsRule | null {
  const key = `${event.start}|${JSON.stringify(event.rule)}`;
  if (!settled.has(key)) { if (settled.size >= 5000) settled.clear(); settled.set(key, settleCount(event)); }
  return settled.get(key)!;
}

/** The rule's wall-time start days (in the event's own terms) that could fall in [from, to], in order, bounded. */
export function ruleStarts(event: ImportedEvent, from: string, to: string): string[] {
  const first = event.start.slice(0, 10), rule = event.rule;
  if (!rule || event.firstOnly) return first >= from && first <= to ? [first] : [];
  if (rule.count !== undefined) {
    const until = settledRule(event);
    return until ? ruleStarts({...event, rule: until}, from, to) : [];
  }
  const out: string[] = [], interval = rule.interval ?? 1, untilDay = rule.until?.slice(0, 10), untilWall = rule.until;
  const clock = event.start.length > 10 ? event.start.slice(11) : null;
  const isPast = (d: string) => untilWall !== undefined && pastUntil(d, clock, untilWall);
  let counted = 0, steps = 0;
  // Each candidate in order: false stops the walk.
  const take = (d: string): boolean => {
    if (d < first) return true;
    if (isPast(d)) return false;
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
      if (filter && !filter.has(localWeekday(d))) { if (d > to || isPast(d)) break; continue; }
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
        if (event.tz === zone) {
          const ms = event.tz === 'UTC' ? Date.parse(`${day}T${clock}:00Z`) : instantAt(day, clock!, event.tz), w = wallClock(ms, zone);
          date = w.date; time = w.clock;
        } else {
          // Another zone: the same answer, about four times faster (lib/ics/zone-move.ts), for views of many events.
          const w = moveWall({t: {day, clock, utc: false}, tz: event.tz}, zone);
          date = w.slice(0, 10); time = w.slice(11);
        }
      } catch { /* a zone this device cannot read: the wall time as written */ }
    }
    if (date >= from && date <= to) out.push({date, time, minutes: event.minutes ?? 0});
  }
  return out;
}
