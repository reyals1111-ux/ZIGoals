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
export type SpanKind = 'date' | 'time' | 'recur' | 'priority' | 'project' | 'label' | 'deadline' | 'minutes' | 'reminder';
export type ParseSpan = {start: number; end: number; kind: SpanKind; text: string};
export type ParsedTask = {
  title: string; due?: string; time?: string; level?: TaskLevel; project?: string; labels: string[]; recur?: Recur;
  /** Session AV (F-DEADLINES): "deadline Friday" — the day it must be done by, apart from the planned day. */
  deadline?: string;
  /** Session AV (F-TASK-MINUTES): "for 30 min", "45 minuten", "for 1h30" — how long it takes. */
  minutes?: number;
  /**
   * Session AV lane 2 (tasks, LEDGER #3; Todoist's "!" reminders): "!2h", "!30m", "!1d" remind that long before the task's
   * time (its day at 09:00 when it has no time); "!18:30" reminds at that clock time on its day (today when none). Up to three.
   */
  reminders?: {before: number; at?: string}[];
  spans: ParseSpan[];
};
export const PARSE_MAX = 500;

type Tok = {text: string; low: string; start: number; end: number};
const TOKEN = /![0-9]{1,4}\s?(?:m|min|mins|h|hr|hrs|u|d|w)(?![\p{L}\p{N}])|!(?:[01]?\d|2[0-3])[:.][0-5]\d(?![\p{N}])|[#@][\p{L}\p{N}_\-/]+|[pP][1-4](?![\p{L}\p{N}])|!{1,3}[1-4]?(?![\p{L}\p{N}])|\d{4}-\d{2}-\d{2}|\d{1,2}[:.]\d{2}\s?(?:am|pm|a\.m\.|p\.m\.)?|\d+(?:st|nd|rd|th|e)\b|\d+\s?(?:am|pm|a\.m\.|p\.m\.)|\d+|[\p{L}]+(?:['’][\p{L}]+)?!?|\S/gu;
function tokenize(text: string): Tok[] {
  const out: Tok[] = [];
  for (const m of text.matchAll(TOKEN)) {
    const low = m[0].toLowerCase(), prev = out.at(-1);
    // Session AV (1c, q1 #2): Dutch short weekdays. di, wo, vr and za are not English words; ma, do and zo are ("ma",
    // "do", "zo snel"), so they are a weekday only after a word that asks for one ("op do", "elke ma en do", "volgende zo").
    const short = NL_SHORT_DAYS[low], asks = !!prev && (NL_DAY_LEADS.has(prev.text.toLowerCase()) || ((prev.low === 'and' || prev.low === ',') && WEEKDAYS[out.at(-2)?.low ?? ''] !== undefined));
    out.push({text: m[0], low: short && (!NL_SHORT_NEEDS_LEAD.has(low) || asks) ? short : DUTCH[low] ?? low, start: m.index!, end: m.index! + m[0].length});
  }
  return out;
}
/** Session AV (1c, q1 #2): "elke ochtend", "every evening": the time a part of the day stands for. */
const DAY_PART_TIMES: Record<string, string> = {ochtend: '09:00', morgen: '09:00', middag: '14:00', avond: '20:00', morning: '09:00', afternoon: '14:00', evening: '20:00'};
const NL_SHORT_DAYS: Record<string, string> = {ma: 'mon', di: 'tue', wo: 'wed', do: 'thu', vr: 'fri', za: 'sat', zo: 'sun'};
const NL_SHORT_NEEDS_LEAD = new Set(['ma', 'do', 'zo']);
const NL_DAY_LEADS = new Set(['op', 'elke', 'iedere', 'ieder', 'volgende', 'vanaf', 'tot', 'deadline']);
/**
 * Session AV (owner follow-up 1, F-NL-TASKS; Todoist's quick add): Dutch words read as the English ones the rules below
 * know, so "morgen 18:00", "overmorgen", "elke maandag", "elke! 3 dagen", "om 9 uur", "tot 1 dec", "over 2 weken",
 * "volgende vrijdag", "elke maand op de 1e" and "10 keer" read as their English twins. Only the word used for matching
 * changes; the title keeps the person's own words. Words that are also common in English ("do", "ma", "van") are left
 * out or only ever matter inside a phrase (an "over" is a day only before a number and a unit).
 */
const DUTCH: Record<string, string> = {
  vandaag: 'today', vanavond: 'tonight', morgen: 'tomorrow', gisteren: 'yesterday', overmorgen: 'overmorgen', eergisteren: 'eergisteren',
  volgende: 'next', volgend: 'next', deze: 'this', dit: 'this', vorige: 'last', afgelopen: 'last',
  dag: 'day', dagen: 'days', weken: 'weeks', maand: 'month', maanden: 'months', jaar: 'year', jaren: 'years',
  over: 'in', elke: 'every', iedere: 'every', ieder: 'every', 'elke!': 'every!', 'iedere!': 'every!',
  dagelijks: 'daily', wekelijks: 'weekly', maandelijks: 'monthly', jaarlijks: 'yearly',
  werkdag: 'weekday', werkdagen: 'weekdays', doordeweeks: 'weekdays', weekenden: 'weekends',
  tot: 'until', keer: 'times', en: 'and', op: 'on', om: 'at', de: 'the', het: 'the', voor: 'by', vanaf: 'from',
  eerste: 'first', tweede: 'second', derde: 'third', vierde: 'fourth', vijfde: 'fifth', laatste: 'last', voorlaatste: 'penultimate',
  een: 'a', twee: 'two', drie: 'three', vier: 'four', vijf: 'five', zes: 'six', zeven: 'seven', acht: 'eight', negen: 'nine', tien: 'ten', elf: 'eleven', twaalf: 'twelve',
  middag: 'noon', middernacht: 'midnight', uur: "o'clock",
  zondag: 'sunday', maandag: 'monday', dinsdag: 'tuesday', woensdag: 'wednesday', donderdag: 'thursday', vrijdag: 'friday', zaterdag: 'saturday',
  zondagen: 'sundays', maandagen: 'mondays', dinsdagen: 'tuesdays', woensdagen: 'wednesdays', donderdagen: 'thursdays', vrijdagen: 'fridays', zaterdagen: 'saturdays',
  januari: 'january', februari: 'february', maart: 'march', mrt: 'march', mei: 'may', juni: 'june', juli: 'july', augustus: 'august', oktober: 'october', okt: 'oct',
};
const WEEKDAYS: Record<string, number> = {sun: 0, sunday: 0, sundays: 0, mon: 1, monday: 1, mondays: 1, tue: 2, tues: 2, tuesday: 2, tuesdays: 2, wed: 3, weds: 3, wednesday: 3, wednesdays: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, thursdays: 4, fri: 5, friday: 5, fridays: 5, sat: 6, saturday: 6, saturdays: 6};
const MONTHS: Record<string, number> = {jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12};
const NUMBER_WORDS: Record<string, number> = {one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, a: 1, an: 1, other: 2};
const ORDINALS: Record<string, number> = {first: 1, '1st': 1, '1e': 1, second: 2, '2nd': 2, '2e': 2, third: 3, '3rd': 3, '3e': 3, fourth: 4, '4th': 4, '4e': 4, fifth: 5, '5th': 5, '5e': 5, last: -1};
const UNITS: Record<string, Recur['every']> = {day: 'day', days: 'day', week: 'week', weeks: 'week', month: 'month', months: 'month', year: 'year', years: 'year'};
/** Small words that belong to a phrase taken next to them ("on Friday", "at 5pm", "by tomorrow", "due Monday"). */
const LEADS = new Set(['on', 'at', 'by', 'due', 'in', 'from', 'starting', 'this', 'the', '@']);

/** Session AV (1c, q1 #2): "vanochtend", "morgenavond": [days from today, time]. */
const NL_DAY_PARTS: Record<string, [number, string]> = {vanochtend: [0, '09:00'], vanmorgen: [0, '09:00'], vanmiddag: [0, '14:00'], morgenochtend: [1, '09:00'], morgenvroeg: [1, '09:00'], morgenmiddag: [1, '14:00'], morgenavond: [1, '20:00']};
/** Session AV (1c, q1 #2): "'s ochtends", "'s middags", "'s avonds". */
const NL_PARTS_OF_DAY: Record<string, string> = {ochtends: '09:00', morgens: '09:00', middags: '14:00', avonds: '20:00', namiddags: '16:00'};
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
const dayNum = (low: string) => { const m = /^(\d{1,2})(?:st|nd|rd|th|e)?$/.exec(low); return m ? Number(m[1]) : null; };

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
  const tight = (k: number) => !!toks[k] && !!toks[k + 1] && toks[k + 1]!.start === toks[k]!.end;

  /** A day phrase starting at token i (no lead words), or null. */
  function dayAt(i: number): {len: number; due: string; time?: string} | null {
    const w = at(i), w1 = at(i + 1), w2 = at(i + 2);
    if (w === undefined) return null;
    if (w === 'today' || w === 'tod') return {len: 1, due: today};
    if (w === 'tonight') return {len: 1, due: today, time: '20:00'};
    if (w === 'tomorrow' || w === 'tmr' || w === 'tmrw' || w === 'tomorow') return {len: 1, due: addLocalDays(today, 1)};
    if (w === 'yesterday') return {len: 1, due: addLocalDays(today, -1)};
    if (w === 'overmorgen') return {len: 1, due: addLocalDays(today, 2)};
    if (w === 'eergisteren') return {len: 1, due: addLocalDays(today, -2)};
    // Session AV (1c, q1 #2): Dutch parts of the day, with the time a person usually means (Todoist NL reads these too).
    const part = NL_DAY_PARTS[w];
    if (part) return {len: 1, due: addLocalDays(today, part[0]), time: part[1]};
    // Dutch "eind/einde van de maand".
    if ((w === 'eind' || w === 'einde') && w1 === 'van' && w2 === 'the' && at(i + 3) === 'month') { const y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7)); return {len: 4, due: `${today.slice(0, 8)}${pad(daysInMonth(y, m))}`}; }
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
    if (w === 'the' && w1 && /^\d{1,2}(st|nd|rd|th|e)$/.test(w1) && !(w2 && MONTHS[w2])) {
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
    const raw = (k: number) => toks[k]?.text.toLowerCase();
    // Session AV (1c, q1 #2): Dutch "half 10" (09:30), "kwart over 3" (15:15), "kwart voor 3" (14:45), "'s avonds",
    // and the Belgian "9u" and "18u30".
    if (w === 'half' && /^\d{1,2}$/.test(at(i + 1) ?? '') && raw(i + 2) !== 'uur') { const n = Number(at(i + 1)); if (n >= 1 && n <= 12) return {len: 2, time: dutchHour(n - 1, 30)}; }
    if (w === 'kwart' && (raw(i + 1) === 'over' || raw(i + 1) === 'voor') && /^\d{1,2}$/.test(at(i + 2) ?? '')) { const n = Number(at(i + 2)); if (n >= 1 && n <= 12) return {len: 3, time: raw(i + 1) === 'over' ? dutchHour(n, 15) : dutchHour(n - 1, 45)}; }
    if ((w === "'" || w === '’') && at(i + 1) === 's' && NL_PARTS_OF_DAY[at(i + 2) ?? '']) return {len: 3, time: NL_PARTS_OF_DAY[at(i + 2)!]!};
    if (/^\d{1,2}$/.test(w) && raw(i + 1) === 'u' && tight(i)) {
      const mm = tight(i + 1) && /^\d{2}$/.test(at(i + 2) ?? '') ? at(i + 2)! : null, c = readClock(mm ? `${w}:${mm}` : w, true);
      if (c) return {len: mm ? 3 : 2, time: mm ? c : afternoon(w, c)};
    }
    // Session AV (F-NL-TASKS): Dutch "(om) 9 uur", read as "9 o'clock", before the bare hour alone. A bare "2 uur" is a
    // length (minutesAt, read first); this is the clock after "om", next to a day, or past 12.
    if (/^\d{1,2}$/.test(w) && toks[i + 1]?.text.toLowerCase() === 'uur') { const c = readClock(w, true); return c ? {len: 2, time: afternoon(w, c)} : null; }
    const clock = readClock(w, prev === 'at' || prev === '@');
    if (clock) return {len: 1, time: afternoon(w, clock)};
    // "5 pm" written as two tokens is one token already (TOKEN); "at 5 o'clock".
    if (prev === 'at' && /^\d{1,2}$/.test(w) && /^o['’]clock$/.test(at(i + 1) ?? '')) { const c = readClock(w, true); return c ? {len: 2, time: afternoon(w, c)} : null; }
    return null;
  }
  /** A Dutch hour with minutes ("half 3" is 2:30): 1–6 reads as the afternoon, as "at 3" does; 0 is 12. */
  function dutchHour(hour: number, minutes: number): string { const h = hour === 0 ? 12 : hour; return `${pad(h >= 1 && h <= 6 ? h + 12 : h)}:${pad(minutes)}`; }
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
    // Session AV (1c, q1 #2): Dutch "om de week" (every other week), "om de dag", "om de 3 weken".
    if (w === 'at' && toks[i]!.text.toLowerCase() === 'om' && at(i + 1) === 'the') {
      const u1 = at(i + 2), u2 = at(i + 3);
      if (u1 && (u1 === 'day' || u1 === 'week' || u1 === 'month' || u1 === 'year')) return finish({len: 3, recur: {every: UNITS[u1]!, interval: 2}});
      if (u1 && /^\d+$/.test(u1) && u2 && UNITS[u2] && Number(u1) >= 1 && Number(u1) <= 365) return finish({len: 4, recur: {every: UNITS[u2]!, interval: Number(u1)}});
      return null;
    }
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
    // Session AV (1c, q1 #2): "elke ochtend", "every evening": every day at that part of the day.
    const partTime = DAY_PART_TIMES[toks[j]!.text.toLowerCase()];
    if (partTime && interval === 1) return finish({len: j + 1 - i, recur: {every: 'day', interval: 1}, time: partTime});
    if (UNITS[u]) { recur = {every: UNITS[u]!, interval}; j++; }
    // Session AV lane 2 (r6-plan, LEDGER #398; OmniFocus): "every last workday", "every second-to-last Friday" (a month's).
    else if (workdayAt(j)) { const w = workdayAt(j)!; recur = {every: 'month', interval, workday: w.which}; j += w.len; j += ofTheMonth(j); }
    else if (fromEndAt(j) && WEEKDAYS[at(j + fromEndAt(j)!.len) ?? ''] !== undefined) { const f = fromEndAt(j)!; recur = {every: 'month', interval, fromEnd: {n: f.n, weekday: WEEKDAYS[at(j + f.len)!]!}}; j += f.len + 1; j += ofTheMonth(j); }
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
      j += ofTheMonth(j);
    } else if (/^\d{1,2}(st|nd|rd|th|e)$/.test(u)) {
      const d = dayNum(u)!; if (d < 1 || d > 31) return null;
      recur = {every: 'month', interval, monthDay: d}; j++;
      j += ofTheMonth(j);
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
      if (recur.every === 'month' && v && /^\d{1,2}(st|nd|rd|th|e)?$/.test(v) && dayNum(v)! >= 1 && dayNum(v)! <= 31) { recur.monthDay = dayNum(v)!; j = k + 1; j += ofTheMonth(j); }
      else if (recur.every === 'month' && v && ORDINALS[v] !== undefined && WEEKDAYS[at(k + 1) ?? ''] !== undefined) { recur.nth = {n: ORDINALS[v]!, weekday: WEEKDAYS[at(k + 1)!]!}; j = k + 2; j += ofTheMonth(j); }
      else if (recur.every === 'month' && v === 'last' && at(k + 1) === 'day') { recur.monthDay = -1; j = k + 2; }
      else if (recur.every === 'month' && workdayAt(k)) { const w = workdayAt(k)!; recur.workday = w.which; j = k + w.len; j += ofTheMonth(j); }
      else if (recur.every === 'month' && fromEndAt(k) && WEEKDAYS[at(k + fromEndAt(k)!.len) ?? ''] !== undefined) { const f = fromEndAt(k)!; recur.fromEnd = {n: f.n, weekday: WEEKDAYS[at(k + f.len)!]!}; j = k + f.len + 1; j += ofTheMonth(j); }
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
    /** "second-to-last", "second last", "next-to-last", "penultimate" (Dutch "voorlaatste") at k: its length and n (2–5). */
    function fromEndAt(k: number): {len: number; n: number} | null {
      const w = at(k);
      if (w === 'penultimate') return {len: 1, n: 2};
      const n = w === 'next' ? 2 : w && ORDINALS[w] !== undefined && ORDINALS[w]! >= 2 ? ORDINALS[w]! : 0;
      if (!n) return null;
      let m = k + 1; if (at(m) === '-') m++;
      if (at(m) === 'to') { m++; if (at(m) === '-') m++; }
      return at(m) === 'last' ? {len: m + 1 - k, n} : null;
    }
    /** "last workday", "last weekday", "last working day", "first business day" (Dutch "laatste werkdag") at k. */
    function workdayAt(k: number): {len: number; which: 'first' | 'last'} | null {
      const w = at(k), which = w === 'last' ? 'last' : w === 'first' || w === '1st' ? 'first' : null;
      if (!which) return null;
      const u = at(k + 1);
      if (u === 'weekday' || u === 'workday') return {len: 2, which};
      if ((u === 'working' || u === 'business') && at(k + 2) === 'day') return {len: 3, which};
      return null;
    }
    /** "of the month", "of each month", the Dutch "van de maand" / "van elke maand": how many tokens it takes at k. */
    function ofTheMonth(k: number) { return (at(k) === 'of' || toks[k]?.text.toLowerCase() === 'van') && (at(k + 1) === 'the' || at(k + 1) === 'each' || at(k + 1) === 'every') && at(k + 2) === 'month' ? 3 : 0; }
    function yearStart(m: number, d: number) { const y = Number(today.slice(0, 4)), here = `${y}-${pad(m)}-${pad(d <= daysInMonth(y, m) ? d : daysInMonth(y, m))}`; return here >= today ? here : `${y + 1}-${pad(m)}-${pad(Math.min(d, daysInMonth(y + 1, m)))}`; }
    function finish(found: {len: number; recur: Recur; start?: string; time?: string}): {len: number; recur: Recur; time?: string; start?: string} {
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

  // Session AV (F-TASK-MINUTES): "for 30 min", "30 minutes", "45m", "45 minuten", "for 2 hours", "1h30", "for 1h 15m".
  // Hours need "for" or the compact form ("1h"), so "at 1 h" is never read as a length. Session AV (1c, q1 #2): a Dutch
  // "2 uur", "1 uur 30", "1,5 uur", "een half uur", "anderhalf uur", "een kwartier" and "voor 15 minuten" are lengths; "uur"
  // is a clock only after "om", next to a day ("morgen 9 uur") or past 12 ("20 uur").
  const minutesAt = (i: number): {len: number; minutes: number} | null => {
    const raw = (k: number) => toks[k]?.text.toLowerCase();
    const lead = at(i) === 'for' || raw(i) === 'voor' ? 1 : 0, k = i + lead, n = at(k);
    if (!n) return null;
    const MIN = ['min', 'mins', 'minute', 'minutes', 'minuten', 'minuut'], H = ['h', 'hr', 'hrs', 'hour', 'hours'];
    const ok = (len: number, minutes: number) => minutes >= 1 && minutes <= 1440 ? {len, minutes} : null;
    // "een kwartier", "een half uur", "anderhalf uur", "half uur", "half an hour".
    const a = n === 'a' ? 1 : 0;
    if (raw(k + a) === 'kwartier') return ok(lead + a + 1, 15);
    if (raw(k + a) === 'half' && raw(k + a + 1) === 'uur') return ok(lead + a + 2, 30);
    if (n === 'half' && at(k + 1) === 'a' && (at(k + 2) === 'hour')) return ok(lead + 3, 30);
    if (raw(k) === 'anderhalf' && raw(k + 1) === 'uur') return ok(lead + 2, 90);
    if (!/^\d{1,4}$/.test(n)) return null;
    // A decimal hour: "1,5 uur", "1.5 hours".
    const whole = Number(n);
    let j = k + 1, part = 0;
    if ((raw(j) === ',' || raw(j) === '.') && tight(k) && tight(j) && /^\d$/.test(at(j + 1) ?? '')) { part = Number(at(j + 1)) / 10; j += 2; }
    const u = at(j), uRaw = raw(j);
    if (!u) return null;
    const uur = uRaw === 'uur', prevDay = (() => { const last = out.spans.at(-1); return !!last && last.kind === 'date' && i > 0 && last.end === toks[i - 1]!.end; })();
    if (!part && (MIN.includes(u) || (u === 'm' && tight(k)))) return ok(lead + 2, whole);
    if (uur) {
      // The clock readings of "uur": after "om" ("at"), next to a day, or an hour past 12 with no lead.
      if (!lead && !part && (at(i - 1) === 'at' || prevDay || dayAt(j + 1) !== null || whole > 12)) return null;
    } else if (!(H.includes(u) && (lead || (u === 'h' && tight(j - 1)) || part))) return null;
    let minutes = Math.round((whole + part) * 60), len = j - i + 1;
    const m = at(j + 1), mu = at(j + 2);
    if (!part && m && /^\d{1,2}$/.test(m) && Number(m) < 60 && (tight(j) || mu === 'm' || mu === 'min' || uur)) { minutes += Number(m); len += 1; if (mu && (mu === 'min' || mu === 'mins' || raw(j + 2) === 'minuten' || (mu === 'm' && tight(j + 1)))) len += 1; }
    return ok(len, minutes);
  };
  const tryAt = (i: number): Match | null => {
    const w = toks[i]!;
    if (kept.has(w.start)) return null;
    if (w.low.startsWith('#') && w.low.length > 1) { const name = w.text.slice(1).replace(/[_/]+/g, ' ').trim(); return name ? {len: 1, kind: 'project', apply: o => { o.project = name.slice(0, 60); }} : null; }
    if (w.low.startsWith('@') && w.low.length > 1 && (i === 0 || toks[i - 1]!.end < w.start)) { const name = w.text.slice(1).replace(/\//g, ''); return LABEL_PATTERN.test(name) ? {len: 1, kind: 'label', apply: o => { if (!o.labels.some(l => l.toLowerCase() === name.toLowerCase())) o.labels.push(name); }} : null; }
    // Session AV lane 2 (LEDGER #3): "!2h" (before the task's time) and "!18:30" (at a clock time on its day).
    const rel = /^!(\d{1,4})\s?(m|min|mins|h|hr|hrs|u|d|w)$/.exec(w.low);
    if (rel) { const n = Number(rel[1]), unit = rel[2]!, before = n * (unit.startsWith('m') ? 1 : unit === 'd' ? 1440 : unit === 'w' ? 10_080 : 60); if (before <= 40_320) return {len: 1, kind: 'reminder', apply: o => { (o.reminders ??= []).push({before}); }}; }
    const abs = /^!(\d{1,2})[:.](\d{2})$/.exec(w.low);
    if (abs) return {len: 1, kind: 'reminder', apply: o => { (o.reminders ??= []).push({before: 0, at: `${pad(Number(abs[1]))}:${abs[2]}`}); }};
    const p = /^p([1-4])$/.exec(w.low) ?? /^!([1-4])$/.exec(w.low);
    if (p) return {len: 1, kind: 'priority', apply: o => { o.level = Number(p[1]) as TaskLevel; }};
    if (/^!{1,3}$/.test(w.low) && (i === toks.length - 1 || toks[i + 1]!.start > w.end) && (i === 0 || toks[i - 1]!.end < w.start)) return {len: 1, kind: 'priority', apply: o => { o.level = w.low.length >= 2 ? 1 : 2; }};
    // Session AV (F-DEADLINES): "deadline" (the same word in Dutch) and a day after it.
    if (w.low === 'deadline') { const d = dayAt(i + 1); if (d) return {len: 1 + d.len, kind: 'deadline', apply: o => { o.deadline = d.due; }}; }
    const mins = minutesAt(i);
    if (mins) return {len: mins.len, kind: 'minutes', apply: o => { o.minutes = mins.minutes; }};
    const r = recurAt(i);
    if (r) return {len: r.len, kind: 'recur', apply: o => { o.recur = {...r.recur}; if ((r as {start?: string}).start) o.due = (r as {start?: string}).start; if (r.time && !o.time) o.time = r.time; }};
    const d = dayAt(i);
    if (d) return {len: d.len, kind: 'date', apply: o => { o.due = d.due; if (d.time && !o.time) o.time = d.time; }};
    const t = timeAt(i);
    if (t) return {len: t.len, kind: 'time', apply: o => { o.time = t.time; }};
    return null;
  };
  const seen = new Set<SpanKind>();
  // Friend-readiness (FR-MAX-13, known M-11): a day right after "about" or "regarding" (Dutch "over het/de") is what the task
  // is about, not when it is due: "Email Sam about the weekend" keeps its words and gets no day.
  const topic = (i: number) => {
    const raw = (k: number) => toks[k]?.text.toLowerCase();
    let from = i;
    while (from > 0 && !used[from - 1] && LEADS.has(toks[from - 1]!.low)) { if (raw(from - 1) === 'over' && (raw(from) === 'het' || raw(from) === 'de')) return true; from--; }
    return from > 0 && (raw(from - 1) === 'about' || raw(from - 1) === 'regarding');
  };
  for (let i = 0; i < toks.length; i++) {
    if (used[i]) continue;
    const found = tryAt(i);
    if (found?.kind === 'date' && topic(i)) { i += found.len - 1; continue; }
    // One of each: a second day or a second repeat stays text (the first one wins).
    if (!found || (seen.has(found.kind) && (found.kind === 'date' || found.kind === 'time' || found.kind === 'recur' || found.kind === 'priority' || found.kind === 'project' || found.kind === 'deadline' || found.kind === 'minutes'))) continue;
    // A date token that a span starting with it would only half cover ("the" alone) is not taken.
    if (found.kind === 'reminder' && (out.reminders?.length ?? 0) >= 3) continue;
    found.apply(out); take(i, found.len, found.kind); seen.add(found.kind);
    i += found.len - 1;
  }
  // A repeat with no day starts on its first matching day; a day given beside it ("every Monday from next week") wins.
  if (out.recur && !out.due) out.due = firstDue(out.recur, today);
  else if (out.recur && out.due) out.due = firstDue(out.recur, out.due);
  // A time without a day is today's (or tomorrow's when that time has passed is not known here: today, shown as such).
  if (out.time && !out.due) out.due = today;
  // Session AV lane 2 (LEDGER #3): a "!18:30" reminder is on the task's day (today when it has none); "!2h" needs a day,
  // so a line with only that is planned for today, as a time alone is.
  if (out.reminders) {
    if (!out.due && out.reminders.some(r => !r.at)) out.due = today;
    out.reminders = out.reminders.map(r => r.at ? {before: 0, at: `${out.due ?? today}T${r.at}`} : r);
  }
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
