import type {HabitRule} from '../habits';
import {addLocalDays, localWeekday} from '../local-date';

/**
 * Session AK (COMPETITORS.md G3, item 21): "every other tue 7am", "3x a week", "weekdays", "mon wed fri", "daily at 7"
 * typed in the habit form, mapped to the schedule kinds that already exist (daily, weekdays, interval, frequency,
 * month-dates) and an optional reminder time. A small deterministic English grammar, nothing learned and nothing sent:
 * every word is either part of a phrase it knows, a filler ("on", "the", "at"…), or unknown. Unknown words are returned
 * so the form can highlight them; they are never guessed at, and two schedules in one phrase are refused rather than
 * one picked. Pure: `today` decides the start of "every other Tuesday" (the next Tuesday, today included).
 */
export type HabitSchedule = HabitRule['schedule'];
export type PartOfDay = 'morning' | 'afternoon' | 'evening';
export type PhraseRole = 'schedule' | 'time' | 'filler' | 'unknown';
export type PhraseToken = {text: string; start: number; end: number; role: PhraseRole};
export type PhraseResult = {
  /** The schedule the phrase names, or null (none named, a problem, or only unknown words). */
  schedule: HabitSchedule | null;
  /** A reminder time as "HH:MM" (24 h), or null. */
  time: string | null;
  /** The part of the day, from the time or from "in the morning"; null when neither was said. */
  partOfDay: PartOfDay | null;
  tokens: PhraseToken[];
  /** The words the grammar does not know, in order, as typed. */
  unknown: string[];
  /** One plain sentence when the phrase cannot be used as it is (two schedules, an impossible number). */
  problem: string | null;
};
export const MAX_PHRASE = 120;

const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0, sundays: 0, mon: 1, monday: 1, mondays: 1, tue: 2, tues: 2, tuesday: 2, tuesdays: 2,
  wed: 3, weds: 3, wednesday: 3, wednesdays: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, thursdays: 4,
  fri: 5, friday: 5, fridays: 5, sat: 6, saturday: 6, saturdays: 6,
};
const COUNT_WORDS: Record<string, number> = {one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12};
const ORDINAL_WORDS: Record<string, number> = {first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10};
const FILLERS = new Set(['on', 'the', 'at', 'a', 'an', 'and', 'every', 'each', 'per', 'of', 'in', 'to', 'by', 'around', 'about', 'please', 'just', ',', '&', '+', '/', '-', '.', 'i', 'want', 'do', 'it', 'this', 'starting', 'from', 'today']);
const PERIODS: Record<string, 'day' | 'week' | 'month' | 'year'> = {day: 'day', days: 'day', week: 'week', weeks: 'week', month: 'month', months: 'month', year: 'year', years: 'year'};
const ADVERBS: Record<string, 'day' | 'week' | 'month' | 'year'> = {daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year', annually: 'year'};
const FREQUENCY_MAX = {week: 7, month: 28, year: 365} as const;

type Tok = {text: string; low: string; start: number; end: number; role: PhraseRole};
const TOKEN = /\d{1,2}[:.]\d{2}\s?(?:am|pm|a\.m\.|p\.m\.)?|\d+(?:st|nd|rd|th)\b|\d+(?:x|×)(?![a-z])|\d+\s?(?:am|pm|a\.m\.|p\.m\.)|\d+|[a-z]+(?:'s)?|[×,&+/.-]|\S/g;
function tokenize(text: string): Tok[] {
  const lower = text.toLowerCase(), out: Tok[] = [];
  for (const m of lower.matchAll(TOKEN)) out.push({text: text.slice(m.index, m.index + m[0].length), low: m[0], start: m.index, end: m.index + m[0].length, role: 'unknown'});
  return out;
}
const clock = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
/** "7am", "7:30 pm", "19:00", "7.30" (24 h when no am/pm), as minutes, or null. `needsMarker`: a bare "7" is no time. */
function readTime(low: string, needsMarker: boolean): string | null {
  const m = /^(\d{1,2})(?:[:.](\d{2}))?\s?(am|pm|a\.m\.|p\.m\.)?$/.exec(low);
  if (!m) return null;
  const marker = m[3]?.replace(/\./g, '') ?? null, minutes = m[2] === undefined ? 0 : Number(m[2]);
  let hour = Number(m[1]);
  if (needsMarker && !marker && m[2] === undefined) return null;
  if (minutes > 59) return null;
  if (marker) { if (hour < 1 || hour > 12) return null; hour = hour % 12 + (marker === 'pm' ? 12 : 0); }
  else if (hour > 23) return null;
  return clock(hour, minutes);
}
export function partOfDayFor(time: string): PartOfDay {
  const hour = Number(time.slice(0, 2));
  return hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : 'evening';
}
const countOf = (low: string): number | null => /^\d{1,3}$/.test(low) ? Number(low) : COUNT_WORDS[low] ?? null;
const ordinalOf = (low: string): number | null => { const m = /^(\d{1,2})(?:st|nd|rd|th)$/.exec(low); return m ? Number(m[1]) : null; };
/** The next date with this weekday, `today` included. */
export const nextWeekday = (today: string, day: number) => addLocalDays(today, (day - localWeekday(today) + 7) % 7);

type Found = {schedule: HabitSchedule; label: string};
export function parseRecurrence(input: string, today: string): PhraseResult {
  const text = input.slice(0, MAX_PHRASE), toks = tokenize(text);
  const free = (i: number) => i >= 0 && i < toks.length && toks[i]!.role === 'unknown';
  const low = (i: number) => (free(i) ? toks[i]!.low : '');
  const take = (from: number, to: number, role: PhraseRole) => { for (let i = from; i < to; i++) toks[i]!.role = role; };
  const schedules: Found[] = [];
  let time: string | null = null, part: PartOfDay | null = null, problem: string | null = null;
  const fail = (sentence: string) => { problem ??= sentence; };

  // ── Times: "7am", "at 7", "at 19:30", "noon", "in the morning" ───────────────────────────────────────────────────
  for (let i = 0; i < toks.length; i++) {
    if (!free(i)) continue;
    const word = low(i);
    if (word === 'noon' || word === 'midday' || word === 'midnight') { const at = free(i - 1) && low(i - 1) === 'at' ? i - 1 : i; time ??= word === 'midnight' ? '00:00' : '12:00'; take(at, i + 1, 'time'); continue; }
    if (word === 'at' && free(i + 1)) {
      // "at 7" (a 24-hour clock without am/pm), "at 7 am" (two tokens), "at 7:30".
      const joined = free(i + 2) && /^(am|pm)$/.test(low(i + 2)) ? `${low(i + 1)}${low(i + 2)}` : null;
      const t = joined ? readTime(joined, false) : readTime(low(i + 1), false);
      if (t) { if (time && time !== t) fail('Two times in one phrase: keep one.'); time = t; take(i, i + (joined ? 3 : 2), 'time'); continue; }
      if (low(i + 1) === 'night') { part ??= 'evening'; take(i, i + 2, 'time'); continue; }
    }
    if (/^\d/.test(word)) {
      const joined = free(i + 1) && /^(am|pm)$/.test(low(i + 1)) ? `${word}${low(i + 1)}` : null;
      const t = readTime(joined ?? word, true);
      if (t) { if (time && time !== t) fail('Two times in one phrase: keep one.'); time = t; take(i, i + (joined ? 2 : 1), 'time'); continue; }
    }
    const parts: Record<string, PartOfDay> = {morning: 'morning', mornings: 'morning', afternoon: 'afternoon', afternoons: 'afternoon', evening: 'evening', evenings: 'evening', night: 'evening', nights: 'evening', tonight: 'evening'};
    if (parts[word]) { part ??= parts[word]!; const from = free(i - 1) && low(i - 1) === 'the' ? free(i - 2) && ['in', 'every', 'each'].includes(low(i - 2)) ? i - 2 : i - 1 : free(i - 1) && ['in', 'every', 'each', 'at'].includes(low(i - 1)) ? i - 1 : i; take(from, i + 1, 'time'); }
  }

  // ── Frequency: "3x a week", "3 times per month", "twice weekly", "once a year" ─────────────────────────────────
  for (let i = 0; i < toks.length; i++) {
    if (!free(i)) continue;
    let times: number | null = null, j = i;
    const word = low(i), x = /^(\d{1,3})(?:x|×)$/.exec(word);
    if (x) { times = Number(x[1]); j = i + 1; }
    else if (word === 'once' || word === 'twice' || word === 'thrice') { times = {once: 1, twice: 2, thrice: 3}[word]; j = i + 1; }
    else if (countOf(word) !== null && free(i + 1) && ['x', '×', 'times', 'time'].includes(low(i + 1))) { times = countOf(word); j = i + 2; }
    else if (/^\d{1,3}$/.test(word) && free(i + 1) && ['/', 'per'].includes(low(i + 1))) { times = Number(word); j = i + 1; }
    if (times === null) continue;
    let k = j; while (free(k) && ['a', 'an', 'per', 'each', 'every', '/', 'in'].includes(low(k))) k++;
    const period = PERIODS[low(k)] ?? ADVERBS[low(k)];
    if (!period) continue;
    take(i, k + 1, 'schedule');
    if (period === 'day') { fail('Times a day is a target, not a schedule: set the target instead, and the schedule to every day.'); continue; }
    if (times < 1 || times > FREQUENCY_MAX[period]) { fail(`At most ${FREQUENCY_MAX[period]} times a ${period}.`); continue; }
    schedules.push({schedule: {kind: 'frequency', times, period}, label: 'frequency'});
  }

  // ── Intervals: "every other day", "every 3 days", "every other tue", "every 2 weeks on mon", "alternate days" ──
  for (let i = 0; i < toks.length; i++) {
    if (!free(i)) continue;
    const word = low(i);
    if (word === 'alternate' && ['day', 'days'].includes(low(i + 1))) { take(i, i + 2, 'schedule'); schedules.push({schedule: {kind: 'interval', every: 2, anchor: today}, label: 'interval'}); continue; }
    if (word !== 'every' && word !== 'each') continue;
    let step: number | null = null, j = i + 1;
    if (['other', 'alternate', 'second'].includes(low(j))) { step = 2; j++; }
    else if (countOf(low(j)) !== null) { step = countOf(low(j)); j++; }
    else if (ordinalOf(low(j)) !== null || ORDINAL_WORDS[low(j)] !== undefined) { step = ordinalOf(low(j)) ?? ORDINAL_WORDS[low(j)]!; j++; }
    if (step === null) continue;
    const unit = PERIODS[low(j)];
    const dayAfter = (k: number) => { let n = k; while (free(n) && ['on', 'a', 'the'].includes(low(n))) n++; return WEEKDAYS[low(n)] !== undefined ? n : -1; };
    if (unit === 'day') {
      take(i, j + 1, 'schedule');
      if (step < 2 || step > 365) { fail(step < 2 ? 'Every day is the daily schedule.' : 'Repeat every 2 to 365 days.'); continue; }
      schedules.push({schedule: {kind: 'interval', every: step, anchor: today}, label: 'interval'});
      continue;
    }
    if (unit === 'week') {
      const d = dayAfter(j + 1), end = d >= 0 ? d + 1 : j + 1, day = d >= 0 ? WEEKDAYS[toks[d]!.low]! : null;
      take(i, end, 'schedule');
      if (step * 7 > 365) { fail('Repeat every 2 to 52 weeks.'); continue; }
      if (step === 1) { schedules.push(day === null ? {schedule: {kind: 'frequency', times: 1, period: 'week'}, label: 'frequency'} : {schedule: {kind: 'weekdays', days: [day]}, label: 'weekdays'}); continue; }
      schedules.push({schedule: {kind: 'interval', every: step * 7, anchor: day === null ? today : nextWeekday(today, day)}, label: 'interval'});
      continue;
    }
    const d = WEEKDAYS[low(j)];
    if (d !== undefined) {
      take(i, j + 1, 'schedule');
      if (step * 7 > 365) { fail('Repeat every 2 to 52 weeks.'); continue; }
      schedules.push({schedule: {kind: 'interval', every: step * 7, anchor: nextWeekday(today, d)}, label: 'interval'});
    }
  }

  // ── Month dates: "the 1st and 15th", "on the 1st of each month", "monthly on the 1st" ──────────────────────────
  {
    const dates: number[] = [];
    for (let i = 0; i < toks.length; i++) {
      if (!free(i)) continue;
      const n = ordinalOf(low(i));
      if (n === null) continue;
      take(i, i + 1, 'schedule');
      if (n < 1 || n > 31) { fail('Dates in a month go from the 1st to the 31st.'); continue; }
      if (!dates.includes(n)) dates.push(n);
    }
    if (dates.length) {
      // "of the month", "of every month", "each month", "monthly", "every month" belong to the dates.
      for (let i = 0; i < toks.length; i++) {
        if (!free(i)) continue;
        if (low(i) === 'monthly') take(i, i + 1, 'schedule');
        else if (['month', 'months'].includes(low(i))) { let from = i; while (free(from - 1) && ['of', 'the', 'each', 'every', 'a'].includes(low(from - 1))) from--; take(from, i + 1, 'schedule'); }
      }
      schedules.push({schedule: {kind: 'month-dates', days: [...dates].sort((a, b) => a - b)}, label: 'month-dates'});
    }
  }

  // ── Weekdays: "weekdays", "weekends", "mon wed fri", "mon-fri", "tuesdays and thursdays" ───────────────────────
  {
    const days = new Set<number>();
    for (let i = 0; i < toks.length; i++) {
      if (!free(i)) continue;
      const word = low(i);
      if (['weekdays', 'weekday', 'workdays', 'workday'].includes(word)) { [1, 2, 3, 4, 5].forEach(d => days.add(d)); take(i, i + 1, 'schedule'); continue; }
      if (['weekends', 'weekend'].includes(word)) { days.add(0); days.add(6); take(i, i + 1, 'schedule'); continue; }
      const d = WEEKDAYS[word];
      if (d === undefined) continue;
      // A range: "mon-fri", "mon to fri", "monday through friday".
      if (free(i + 1) && ['-', 'to', 'through', 'thru', 'till', 'until'].includes(low(i + 1)) && WEEKDAYS[low(i + 2)] !== undefined) {
        const last = WEEKDAYS[low(i + 2)]!;
        for (let k = d; ; k = (k + 1) % 7) { days.add(k); if (k === last) break; }
        take(i, i + 3, 'schedule'); i += 2; continue;
      }
      days.add(d); take(i, i + 1, 'schedule');
    }
    if (days.size) {
      for (let i = 0; i < toks.length; i++) {
        if (!free(i)) continue;
        // "weekly on mon", "every week on tue": the week belongs to the days.
        if (low(i) === 'weekly') take(i, i + 1, 'schedule');
        else if (low(i) === 'week' && free(i - 1) && ['every', 'each', 'a', 'per'].includes(low(i - 1))) take(i - 1, i + 1, 'schedule');
      }
      schedules.push({schedule: {kind: 'weekdays', days: [...days].sort((a, b) => a - b)}, label: 'weekdays'});
    }
  }

  // ── Daily: "daily", "every day", "everyday", "each day" ──────────────────────────────────────────────────────────
  for (let i = 0; i < toks.length; i++) {
    if (!free(i)) continue;
    const word = low(i);
    if (word === 'daily' || word === 'everyday') { take(i, i + 1, 'schedule'); schedules.push({schedule: {kind: 'daily'}, label: 'daily'}); continue; }
    if ((word === 'every' || word === 'each') && ['day', 'single'].includes(low(i + 1))) { const end = low(i + 1) === 'single' && low(i + 2) === 'day' ? i + 3 : low(i + 1) === 'day' ? i + 2 : -1; if (end < 0) continue; take(i, end, 'schedule'); schedules.push({schedule: {kind: 'daily'}, label: 'daily'}); }
  }

  // ── Weekly, monthly, yearly alone: once in that period ─────────────────────────────────────────────────────────
  for (let i = 0; i < toks.length; i++) {
    if (!free(i)) continue;
    const word = low(i), adverb = ADVERBS[word];
    if (adverb && adverb !== 'day') { take(i, i + 1, 'schedule'); schedules.push({schedule: {kind: 'frequency', times: 1, period: adverb}, label: 'frequency'}); continue; }
    if ((word === 'every' || word === 'each' || word === 'once') && ['week', 'month', 'year'].includes(low(i + 1))) { const period = PERIODS[low(i + 1)] as 'week' | 'month' | 'year'; take(i, i + 2, 'schedule'); schedules.push({schedule: {kind: 'frequency', times: 1, period}, label: 'frequency'}); }
  }

  for (const t of toks) if (t.role === 'unknown' && FILLERS.has(t.low)) t.role = 'filler';
  const unknown = toks.filter(t => t.role === 'unknown').map(t => t.text);
  const distinct = new Set(schedules.map(s => JSON.stringify(s.schedule)));
  if (distinct.size > 1) fail('Two schedules in one phrase: keep one.');
  const schedule = !problem && distinct.size === 1 ? schedules[0]!.schedule : null;
  const partOfDay = time ? partOfDayFor(time) : part;
  return {schedule, time: problem ? null : time, partOfDay: problem ? null : partOfDay, tokens: toks.map(({text: t, start, end, role}) => ({text: t, start, end, role})), unknown, problem};
}
