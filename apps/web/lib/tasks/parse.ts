import {addLocalDays, localWeekday} from '../local-date';
import {addMonths, daysInMonth, firstDue} from './recurrence';
import {LABEL_PATTERN, type Recur, type TaskLevel} from './schema';

/**
 * Session AL (Part 8, P-LS-03, LS-001): the natural-language line of Tasks and the global Quick add, hand-written and
 * deterministic (no dependency, nothing learned, nothing sent). "Pay rent every month on the 1st p1 #Home @bills" →
 * title "Pay rent", repeats monthly on the 1st, p1, project Home, label bills; "call mum tomorrow 6pm" → tomorrow 18:00.
 *
 * What it reads (English): days (today, tonight, tomorrow, the day after tomorrow, yesterday and past dates — a past day
 * is kept and shows as overdue, never refused; weekdays, "next Friday", next week / month, this weekend, in N days /
 * weeks / months, "Dec 5", "5 December", "the 1st", ISO 2026-12-05), times (5pm, 5:30 pm, 17:00, at 9, noon, midnight),
 * repeats (every day / weekday / weekend / Monday and Thursday / other week / N weeks / month on the 1st / first Monday
 * / last Friday / year; daily, weekly, monthly, yearly; "every!" = from the day it's done; "until <day>", "N times"),
 * priorities (p1–p4, !1–!4, !!!, !!, !), #project and @label.
 *
 * Every piece it took is returned as a span (start, end, kind) so the add field can highlight it, and any span can be
 * kept as plain text (`keep`), as Todoist offers. Pure: `today` is passed in.
 */
export type SpanKind = 'date' | 'time' | 'recur' | 'priority' | 'project' | 'label';
export type ParseSpan = {start: number; end: number; kind: SpanKind; text: string};
export type ParsedTask = {
  title: string; due?: string; time?: string; level?: TaskLevel; project?: string; labels: string[]; recur?: Recur;
  spans: ParseSpan[];
};
export const PARSE_MAX = 500;

type Tok = {text: string; low: string; start: number; end: number};
const TOKEN = /[#@][\p{L}\p{N}_\-/]+|[pP][1-4](?![\p{L}\p{N}])|!{1,3}[1-4]?(?![\p{L}\p{N}])|\d{4}-\d{2}-\d{2}|\d{1,2}[:.]\d{2}\s?(?:am|pm|a\.m\.|p\.m\.)?|\d+(?:st|nd|rd|th)\b|\d+\s?(?:am|pm|a\.m\.|p\.m\.)|\d+|[\p{L}]+(?:['’][\p{L}]+)?!?|\S/gu;
function tokenize(text: string): Tok[] {
  const out: Tok[] = [];
  for (const m of text.matchAll(TOKEN)) out.push({text: m[0], low: m[0].toLowerCase(), start: m.index!, end: m.index! + m[0].length});
  return out;
}
const WEEKDAYS: Record<string, number> = {sun: 0, sunday: 0, sundays: 0, mon: 1, monday: 1, mondays: 1, tue: 2, tues: 2, tuesday: 2, tuesdays: 2, wed: 3, weds: 3, wednesday: 3, wednesdays: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, thursdays: 4, fri: 5, friday: 5, fridays: 5, sat: 6, saturday: 6, saturdays: 6};
const MONTHS: Record<string, number> = {jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12};
const NUMBER_WORDS: Record<string, number> = {one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, a: 1, an: 1, other: 2};
const ORDINALS: Record<string, number> = {first: 1, '1st': 1, second: 2, '2nd': 2, third: 3, '3rd': 3, fourth: 4, '4th': 4, fifth: 5, '5th': 5, last: -1};
const UNITS: Record<string, Recur['every']> = {day: 'day', days: 'day', week: 'week', weeks: 'week', month: 'month', months: 'month', year: 'year', years: 'year'};
/** Small words that belong to a phrase taken next to them ("on Friday", "at 5pm", "by tomorrow", "due Monday"). */
const LEADS = new Set(['on', 'at', 'by', 'due', 'in', 'from', 'starting', 'this', 'the', '@']);

const pad = (n: number) => String(n).padStart(2, '0');
const isoOk = (y: number, m: number, d: number) => m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
/** "5pm", "5:30 pm", "17:00", "17.30"; a bare number only after "at". */
export function readClock(low: string, bare: boolean): string | null {
  const m = /^(\d{1,2})(?:[:.](\d{2}))?\s?(am|pm|a\.m\.|p\.m\.)?$/.exec(low);
  if (!m) return null;
  const marker = m[3]?.replace(/\./g, ''), minutes = m[2] === undefined ? 0 : Number(m[2]);
  let hour = Number(m[1]);
  if (!marker && m[2] === undefined && !bare) return null;
  if (minutes > 59) return null;
  if (marker) { if (hour < 1 || hour > 12) return null; hour = hour % 12 + (marker === 'pm' ? 12 : 0); } else if (hour > 23) return null;
  return `${pad(hour)}:${pad(minutes)}`;
}
const nextWeekday = (today: string, weekday: number, strictlyAfter = false) => { const gap = (weekday - localWeekday(today) + 7) % 7; return addLocalDays(today, gap === 0 && strictlyAfter ? 7 : gap); };
const dayNum = (low: string) => { const m = /^(\d{1,2})(?:st|nd|rd|th)?$/.exec(low); return m ? Number(m[1]) : null; };

type Match = {len: number; kind: SpanKind; apply: (out: ParsedTask) => void};

export function parseTaskLine(input: string, today: string, {keep = []}: {keep?: readonly number[]} = {}): ParsedTask {
  const text = input.slice(0, PARSE_MAX);
  const toks = tokenize(text), kept = new Set(keep);
  const out: ParsedTask = {title: '', labels: [], spans: []};
  const used = new Array<boolean>(toks.length).fill(false);
  const take = (i: number, len: number, kind: SpanKind) => {
    // A lead word right before ("on", "at", "by", "due") goes with the phrase.
    let from = i;
    while (from > 0 && !used[from - 1] && LEADS.has(toks[from - 1]!.low) && (kind === 'date' || kind === 'time' || kind === 'recur') && !(toks[from - 1]!.low === 'the' && kind === 'time')) from--;
    for (let k = from; k < i + len; k++) used[k] = true;
    out.spans.push({start: toks[from]!.start, end: toks[i + len - 1]!.end, kind, text: text.slice(toks[from]!.start, toks[i + len - 1]!.end)});
  };
  const at = (i: number) => toks[i]?.low;

  /** A day phrase starting at token i (no lead words), or null. */
  function dayAt(i: number): {len: number; due: string; time?: string} | null {
    const w = at(i), w1 = at(i + 1), w2 = at(i + 2);
    if (w === undefined) return null;
    if (w === 'today' || w === 'tod') return {len: 1, due: today};
    if (w === 'tonight') return {len: 1, due: today, time: '20:00'};
    if (w === 'tomorrow' || w === 'tmr' || w === 'tmrw' || w === 'tomorow') return {len: 1, due: addLocalDays(today, 1)};
    if (w === 'yesterday') return {len: 1, due: addLocalDays(today, -1)};
    if (w === 'day' && w1 === 'after' && w2 === 'tomorrow') return {len: 3, due: addLocalDays(today, 2)};
    if (w === 'day' && w1 === 'before' && w2 === 'yesterday') return {len: 3, due: addLocalDays(today, -2)};
    if ((w === 'next' || w === 'this') && w1 === 'week') return w === 'next' ? {len: 2, due: nextWeekday(today, 1, true)} : null;
    if (w === 'next' && w1 === 'month') return {len: 2, due: addMonths(today.slice(0, 8) + '01', 1)};
    if (w === 'next' && w1 === 'year') return {len: 2, due: `${Number(today.slice(0, 4)) + 1}-01-01`};
    if ((w === 'this' || w === 'next') && (w1 === 'weekend')) return {len: 2, due: w === 'this' ? nextWeekday(today, 6) : addLocalDays(nextWeekday(today, 6, true), localWeekday(today) === 6 || localWeekday(today) === 0 ? 0 : 7)};
    if (w === 'weekend') return {len: 1, due: nextWeekday(today, 6)};
    if (w === 'end' && w1 === 'of' && w2 === 'month') { const y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7)); return {len: 3, due: `${today.slice(0, 8)}${pad(daysInMonth(y, m))}`}; }
    if (w === 'next' && w1 !== undefined && WEEKDAYS[w1] !== undefined) return {len: 2, due: nextWeekday(today, WEEKDAYS[w1]!, true)};
    if (w === 'last' && w1 !== undefined && WEEKDAYS[w1] !== undefined) { const gap = (localWeekday(today) - WEEKDAYS[w1]! + 7) % 7 || 7; return {len: 2, due: addLocalDays(today, -gap)}; }
    if (WEEKDAYS[w] !== undefined && !w.endsWith('s')) return {len: 1, due: nextWeekday(today, WEEKDAYS[w]!)};
    if (w === 'in' && w1 !== undefined && w2 !== undefined && (dayNum(w1) !== null && /^\d+$/.test(w1) || NUMBER_WORDS[w1] !== undefined) && UNITS[w2]) {
      const n = /^\d+$/.test(w1) ? Number(w1) : NUMBER_WORDS[w1]!, unit = UNITS[w2]!;
      if (n < 1 || n > 1000) return null;
      return {len: 3, due: unit === 'day' ? addLocalDays(today, n) : unit === 'week' ? addLocalDays(today, 7 * n) : unit === 'month' ? addMonths(today, n) : addMonths(today, 12 * n)};
    }
    // ISO day.
    if (/^\d{4}-\d{2}-\d{2}$/.test(w)) { const y = Number(w.slice(0, 4)), m = Number(w.slice(5, 7)), d = Number(w.slice(8, 10)); return isoOk(y, m, d) ? {len: 1, due: w} : null; }
    // "Dec 5", "December 5th", "Dec 5 2027"; "5 Dec", "5th of December".
    const month = MONTHS[w] ?? null;
    if (month !== null && w1 !== undefined && dayNum(w1) !== null) {
      const d = dayNum(w1)!, year = w2 && /^\d{4}$/.test(w2) ? Number(w2) : null;
      return withYear(month, d, year, year ? 3 : 2);
    }
    if (dayNum(w) !== null && w1 !== undefined) {
      const ofShift = w1 === 'of' ? 1 : 0, mw = toks[i + 1 + ofShift]?.low, mm = mw ? MONTHS[mw] : undefined;
      if (mm !== undefined) { const yw = toks[i + 2 + ofShift]?.low, year = yw && /^\d{4}$/.test(yw) ? Number(yw) : null; return withYear(mm, dayNum(w)!, year, 2 + ofShift + (year ? 1 : 0)); }
    }
    // "the 1st" (the next 1st of a month, this month when still ahead).
    if (w === 'the' && w1 && /^\d{1,2}(st|nd|rd|th)$/.test(w1) && !(w2 && MONTHS[w2])) {
      const d = dayNum(w1)!; if (d < 1 || d > 31) return null;
      const here = `${today.slice(0, 8)}${pad(Math.min(d, daysInMonth(Number(today.slice(0, 4)), Number(today.slice(5, 7)))))}`;
      return {len: 2, due: here >= today ? here : addMonths(today.slice(0, 8) + '01', 1, d)};
    }
    return null;
    function withYear(m: number, d: number, year: number | null, len: number) {
      const y0 = Number(today.slice(0, 4));
      if (year !== null) return isoOk(year, m, d) ? {len, due: `${year}-${pad(m)}-${pad(d)}`} : null;
      if (!isoOk(y0 + 1, m, d) && !isoOk(y0, m, d)) return null;
      // Without a year: this year's when it is today or later, or within the last 14 days (a late entry, overdue);
      // otherwise next year's.
      const here = isoOk(y0, m, d) ? `${y0}-${pad(m)}-${pad(d)}` : null;
      if (here && here >= addLocalDays(today, -14)) return {len, due: here};
      return isoOk(y0 + 1, m, d) ? {len, due: `${y0 + 1}-${pad(m)}-${pad(d)}`} : null;
    }
  }
  /** A time at token i: "5pm", "at 9" (bare hour after "at"), noon, midnight, "in the morning". */
  function timeAt(i: number): {len: number; time: string} | null {
    const w = at(i), prev = at(i - 1);
    if (w === undefined) return null;
    if (w === 'noon' || w === 'midday') return {len: 1, time: '12:00'};
    if (w === 'midnight') return {len: 1, time: '00:00'};
    const clock = readClock(w, prev === 'at' || prev === '@');
    if (clock) return {len: 1, time: afternoon(w, clock)};
    // "5 pm" written as two tokens is one token already (TOKEN); "at 5 o'clock".
    if (prev === 'at' && /^\d{1,2}$/.test(w) && /^o['’]clock$/.test(at(i + 1) ?? '')) { const c = readClock(w, true); return c ? {len: 2, time: afternoon(w, c)} : null; }
    return null;
  }
  /** "at 3" with no am/pm: 1–6 o'clock reads as the afternoon (people rarely plan a task at 3 at night). */
  function afternoon(word: string, clock: string): string {
    return /^[1-6]$/.test(word) ? `${pad(Number(word) + 12)}:00` : clock;
  }
  /** A repeat phrase at token i. */
  function recurAt(i: number): {len: number; recur: Recur; time?: string} | null {
    const w = at(i);
    if (w === undefined) return null;
    const simple: Record<string, Recur['every']> = {daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year', annually: 'year'};
    const afterDone = w === 'every!' || ((w === 'every' || w === 'each') && at(i + 1) === '!');
    if (simple[w]) return finish({len: 1, recur: {every: simple[w]!, interval: 1}});
    if (w !== 'every' && w !== 'every!' && w !== 'each') return null;
    let j = i + 1 + (w !== 'every!' && at(i + 1) === '!' ? 1 : 0), interval = 1;
    const n = at(j);
    if (n && (/^\d+$/.test(n) || NUMBER_WORDS[n] !== undefined) && n !== 'a' && n !== 'an') {
      interval = /^\d+$/.test(n) ? Number(n) : NUMBER_WORDS[n]!; j++;
      if (interval < 1 || interval > 365) return null;
    }
    const u = at(j);
    if (u === undefined) return null;
    let recur: Recur | null = null;
    if (UNITS[u]) { recur = {every: UNITS[u]!, interval}; j++; }
    else if (u === 'weekday' || u === 'weekdays' || u === 'workday' || u === 'workdays') { recur = {every: 'week', interval: 1, weekdays: [1, 2, 3, 4, 5]}; j++; }
    else if (u === 'weekend' || u === 'weekends') { recur = {every: 'week', interval: 1, weekdays: [6, 0]}; j++; }
    else if (WEEKDAYS[u] !== undefined) {
      const days: number[] = [];
      while (at(j) !== undefined) {
        const word = at(j)!;
        if (WEEKDAYS[word] !== undefined) { if (!days.includes(WEEKDAYS[word]!)) days.push(WEEKDAYS[word]!); j++; continue; }
        if ((word === 'and' || word === ',' || word === '&') && WEEKDAYS[at(j + 1) ?? ''] !== undefined) { j++; continue; }
        break;
      }
      recur = {every: 'week', interval, weekdays: days};
    } else if (ORDINALS[u] !== undefined && WEEKDAYS[at(j + 1) ?? ''] !== undefined) {
      recur = {every: 'month', interval, nth: {n: ORDINALS[u]!, weekday: WEEKDAYS[at(j + 1)!]!}}; j += 2;
      if (at(j) === 'of' && (at(j + 1) === 'the' || at(j + 1) === 'each') && at(j + 2) === 'month') j += 3;
    } else if (/^\d{1,2}(st|nd|rd|th)$/.test(u)) {
      const d = dayNum(u)!; if (d < 1 || d > 31) return null;
      recur = {every: 'month', interval, monthDay: d}; j++;
    } else if (u === 'last' && at(j + 1) === 'day') { recur = {every: 'month', interval, monthDay: -1}; j += 2; }
    else if (MONTHS[u] !== undefined && at(j + 1) && dayNum(at(j + 1)!) !== null) {
      const m = MONTHS[u]!, d = dayNum(at(j + 1)!)!; if (!isoOk(2028, m, d)) return null;
      recur = {every: 'year', interval}; j += 2;
      return finish({len: j - i, recur, start: yearStart(m, d)});
    }
    if (!recur) return null;
    // "every month on the 1st", "every month on the first Monday", "every week on Monday", "every year on Dec 5".
    if (at(j) === 'on' || at(j) === 'the') {
      let k = j + (at(j) === 'on' ? 1 : 0); if (at(k) === 'the') k++;
      const v = at(k);
      if (recur.every === 'month' && v && /^\d{1,2}(st|nd|rd|th)?$/.test(v) && dayNum(v)! >= 1 && dayNum(v)! <= 31) { recur.monthDay = dayNum(v)!; j = k + 1; }
      else if (recur.every === 'month' && v && ORDINALS[v] !== undefined && WEEKDAYS[at(k + 1) ?? ''] !== undefined) { recur.nth = {n: ORDINALS[v]!, weekday: WEEKDAYS[at(k + 1)!]!}; j = k + 2; }
      else if (recur.every === 'month' && v === 'last' && at(k + 1) === 'day') { recur.monthDay = -1; j = k + 2; }
      else if (recur.every === 'week' && v && WEEKDAYS[v] !== undefined) {
        const days: number[] = []; let m = k;
        while (at(m) !== undefined && (WEEKDAYS[at(m)!] !== undefined || ((at(m) === 'and' || at(m) === ',') && WEEKDAYS[at(m + 1) ?? ''] !== undefined))) { if (WEEKDAYS[at(m)!] !== undefined && !days.includes(WEEKDAYS[at(m)!]!)) days.push(WEEKDAYS[at(m)!]!); m++; }
        recur.weekdays = days; j = m;
      } else if (recur.every === 'year' && v && MONTHS[v] !== undefined && at(k + 1) && dayNum(at(k + 1)!) !== null && isoOk(2028, MONTHS[v]!, dayNum(at(k + 1)!)!)) {
        const start = yearStart(MONTHS[v]!, dayNum(at(k + 1)!)!); j = k + 2;
        return finish({len: j - i, recur, start});
      }
    }
    return finish({len: j - i, recur});
    function yearStart(m: number, d: number) { const y = Number(today.slice(0, 4)), here = `${y}-${pad(m)}-${pad(d <= daysInMonth(y, m) ? d : daysInMonth(y, m))}`; return here >= today ? here : `${y + 1}-${pad(m)}-${pad(Math.min(d, daysInMonth(y + 1, m)))}`; }
    function finish(found: {len: number; recur: Recur; start?: string}): {len: number; recur: Recur; time?: string; start?: string} {
      let len = found.len;
      if (afterDone) found.recur.afterDone = true;
      // "until Dec 31", "for 10 times", "10 times".
      const k = i + len;
      if (at(k) === 'until' || at(k) === 'till') { const d = dayAt(k + 1); if (d) { found.recur.until = d.due; len += 1 + d.len; } }
      const c = i + len, cn = at(c) === 'for' ? at(c + 1) : at(c), ct = at(c) === 'for' ? at(c + 2) : at(c + 1);
      if (cn && /^\d+$/.test(cn) && (ct === 'times' || ct === 'time') && Number(cn) >= 1 && Number(cn) <= 999) { found.recur.left = Number(cn); len += at(c) === 'for' ? 3 : 2; }
      return {...found, len};
    }
  }

  const tryAt = (i: number): Match | null => {
    const w = toks[i]!;
    if (kept.has(w.start)) return null;
    if (w.low.startsWith('#') && w.low.length > 1) { const name = w.text.slice(1).replace(/[_/]+/g, ' ').trim(); return name ? {len: 1, kind: 'project', apply: o => { o.project = name.slice(0, 60); }} : null; }
    if (w.low.startsWith('@') && w.low.length > 1 && (i === 0 || toks[i - 1]!.end < w.start)) { const name = w.text.slice(1).replace(/\//g, ''); return LABEL_PATTERN.test(name) ? {len: 1, kind: 'label', apply: o => { if (!o.labels.some(l => l.toLowerCase() === name.toLowerCase())) o.labels.push(name); }} : null; }
    const p = /^p([1-4])$/.exec(w.low) ?? /^!([1-4])$/.exec(w.low);
    if (p) return {len: 1, kind: 'priority', apply: o => { o.level = Number(p[1]) as TaskLevel; }};
    if (/^!{1,3}$/.test(w.low) && (i === toks.length - 1 || toks[i + 1]!.start > w.end) && (i === 0 || toks[i - 1]!.end < w.start)) return {len: 1, kind: 'priority', apply: o => { o.level = w.low.length >= 2 ? 1 : 2; }};
    const r = recurAt(i);
    if (r) return {len: r.len, kind: 'recur', apply: o => { o.recur = {...r.recur}; if ((r as {start?: string}).start) o.due = (r as {start?: string}).start; }};
    const d = dayAt(i);
    if (d) return {len: d.len, kind: 'date', apply: o => { o.due = d.due; if (d.time && !o.time) o.time = d.time; }};
    const t = timeAt(i);
    if (t) return {len: t.len, kind: 'time', apply: o => { o.time = t.time; }};
    return null;
  };
  const seen = new Set<SpanKind>();
  for (let i = 0; i < toks.length; i++) {
    if (used[i]) continue;
    const found = tryAt(i);
    // One of each: a second day or a second repeat stays text (the first one wins).
    if (!found || (seen.has(found.kind) && (found.kind === 'date' || found.kind === 'time' || found.kind === 'recur' || found.kind === 'priority' || found.kind === 'project'))) continue;
    // A date token that a span starting with it would only half cover ("the" alone) is not taken.
    found.apply(out); take(i, found.len, found.kind); seen.add(found.kind);
    i += found.len - 1;
  }
  // A repeat with no day starts on its first matching day; a day given beside it ("every Monday from next week") wins.
  if (out.recur && !out.due) out.due = firstDue(out.recur, today);
  else if (out.recur && out.due) out.due = firstDue(out.recur, out.due);
  // A time without a day is today's (or tomorrow's when that time has passed is not known here: today, shown as such).
  if (out.time && !out.due) out.due = today;
  // The title: the text with every taken span cut out, spaces tidied.
  let title = '', last = 0;
  for (const s of [...out.spans].sort((a, b) => a.start - b.start)) { title += text.slice(last, s.start) + ' '; last = s.end; }
  title += text.slice(last);
  out.title = title.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/g, '').trim();
  out.spans.sort((a, b) => a.start - b.start);
  return out;
}

/** The parsed pieces in plain words for the preview ("Tomorrow · 6:00 PM · Every week · P1 · #Home · @bills"). */
export function spanSummary(parsed: ParsedTask): string[] {
  const out: string[] = [];
  if (parsed.project) out.push(`#${parsed.project}`);
  for (const l of parsed.labels) out.push(`@${l}`);
  if (parsed.level) out.push(`P${parsed.level}`);
  return out;
}
