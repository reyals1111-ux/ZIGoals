import {addLocalDays, localWeekday} from '../../local-date';

/**
 * Date ranges as people say them (Session V Part 2): "today", "yesterday", "this week", "last month", "last 14 days",
 * "since 2026-09-01", "between 2026-09-01 and 2026-09-15", "2026-09-01..2026-09-15", "September", "September 2025",
 * "on Monday". Every range is a pair of calendar days resolved against the journal's own "today" (the caller passes the
 * habit or Health day, already in the person's zone through the existing helpers), so a range never depends on the
 * device clock's zone. Weeks run Monday to Sunday, like the habit engine's weekly consistency. English is complete;
 * Dutch, French and German range words are recognised too; the tables below are where another language goes.
 */
export type DayRange = {from: string; to: string; label: string};
export type RangeResult = ({ok: true} & DayRange) | {ok: false; message: string};
export const MAX_RANGE_DAYS = 366;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
type Phrase = 'today' | 'yesterday' | 'tomorrow' | 'this-week' | 'last-week' | 'next-week' | 'this-month' | 'last-month' | 'next-month' | 'this-year' | 'last-year';
/** Fixed phrases in four languages (lower case, accents kept). */
const PHRASES: Record<Phrase, readonly string[]> = {
  today: ['today', 'vandaag', "aujourd'hui", 'aujourd’hui', 'heute'],
  yesterday: ['yesterday', 'gisteren', 'hier', 'gestern'],
  tomorrow: ['tomorrow', 'morgen', 'demain'],
  'this-week': ['this week', 'deze week', 'cette semaine', 'diese woche', 'in dieser woche'],
  'last-week': ['last week', 'previous week', 'vorige week', 'afgelopen week', 'la semaine dernière', 'la semaine derniere', 'letzte woche', 'vergangene woche', 'in der letzten woche'],
  'next-week': ['next week', 'coming week', 'volgende week', 'komende week', 'la semaine prochaine', 'nächste woche', 'naechste woche', 'kommende woche'],
  'this-month': ['this month', 'deze maand', 'ce mois-ci', 'ce mois', 'diesen monat', 'dieser monat', 'in diesem monat'],
  'last-month': ['last month', 'previous month', 'vorige maand', 'afgelopen maand', 'le mois dernier', 'letzten monat', 'letzter monat', 'im letzten monat', 'vergangenen monat'],
  'next-month': ['next month', 'coming month', 'volgende maand', 'komende maand', 'le mois prochain', 'nächsten monat', 'naechsten monat', 'kommenden monat'],
  'this-year': ['this year', 'dit jaar', 'cette année', 'cette annee', 'dieses jahr', 'in diesem jahr'],
  'last-year': ['last year', 'vorig jaar', "l'année dernière", 'l’année dernière', 'letztes jahr', 'im letzten jahr'],
};
/** Month names (index 0 = January) in four languages, full and short. */
export const MONTHS: readonly (readonly string[])[] = [
  ['january', 'jan', 'januari', 'janvier', 'janv', 'januar'], ['february', 'feb', 'februari', 'février', 'fevrier', 'févr', 'februar'],
  ['march', 'mar', 'maart', 'mars', 'märz', 'maerz'], ['april', 'apr', 'avril', 'avr'], ['may', 'mei', 'mai'],
  ['june', 'jun', 'juni', 'juin'], ['july', 'jul', 'juli', 'juillet', 'juil'], ['august', 'aug', 'augustus', 'août', 'aout'],
  ['september', 'sep', 'sept', 'septembre'], ['october', 'oct', 'oktober', 'octobre', 'okt'], ['november', 'nov', 'novembre'],
  ['december', 'dec', 'decembre', 'décembre', 'dezember', 'dez'],
];
/** Weekday names, index = JavaScript weekday (0 = Sunday). */
export const WEEKDAYS: readonly (readonly string[])[] = [
  ['sunday', 'sun', 'zondag', 'dimanche', 'sonntag'], ['monday', 'mon', 'maandag', 'lundi', 'montag'], ['tuesday', 'tue', 'tues', 'dinsdag', 'mardi', 'dienstag'],
  ['wednesday', 'wed', 'woensdag', 'mercredi', 'mittwoch'], ['thursday', 'thu', 'thurs', 'donderdag', 'jeudi', 'donnerstag'],
  ['friday', 'fri', 'vrijdag', 'vendredi', 'freitag'], ['saturday', 'sat', 'zaterdag', 'samedi', 'samstag'],
];
const LAST = '(?:last|past|previous|the last|the past|laatste|afgelopen|les|derniers|dernières|die letzten|letzten)';
const NEXT = '(?:next|coming|the next|the coming|volgende|komende|prochains|prochaines|les prochains|die nächsten|nächsten|die naechsten)';
const UNIT_DAYS = '(?:days?|dagen|dag|jours?|tage?n?)', UNIT_WEEKS = '(?:weeks?|weken|week|semaines?|wochen?)', UNIT_MONTHS = '(?:months?|maanden|maand|mois|monate?n?)';
const pad = (n: number) => String(n).padStart(2, '0');
const monthStart = (day: string) => `${day.slice(0, 8)}01`;
function monthEnd(year: number, month: number): string { const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate(); return `${year}-${pad(month + 1)}-${pad(last)}`; }
function shiftMonths(day: string, months: number): string {
  const year = Number(day.slice(0, 4)), month = Number(day.slice(5, 7)) - 1, date = Number(day.slice(8, 10));
  const target = new Date(Date.UTC(year, month + months, 1)), lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(Math.min(date, lastDay))}`;
}
/** Monday of the week that holds `day`. */
export function weekStart(day: string): string { return addLocalDays(day, -((localWeekday(day) + 6) % 7)); }
const valid = (day: string) => ISO.test(day) && !Number.isNaN(Date.parse(`${day}T00:00:00Z`)) && new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day;
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
/** Every calendar day from `from` to `to`, both included. */
export function eachDay(from: string, to: string): string[] { const days: string[] = []; for (let d = from; d <= to; d = addLocalDays(d, 1)) days.push(d); return days; }
function monthIndex(word: string): number { const w = word.toLowerCase().replace(/\.$/, ''); return MONTHS.findIndex(names => names.includes(w)); }
function weekdayIndex(word: string): number { const w = word.toLowerCase().replace(/\.$/, ''); return WEEKDAYS.findIndex(names => names.includes(w)); }
/** "2026-09-01", "1 September", "September 1", "Sept 1 2026", "1/9" is not guessed (ambiguous). */
function parseDay(text: string, today: string, future = false): string | null {
  const t = text.trim().toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ');
  if (ISO.test(t)) return valid(t) ? t : null;
  let m = /^(\d{1,2})(?:st|nd|rd|th|e|er)?\.? ([a-zà-ÿ.]+)(?: (\d{4}))?$/.exec(t) ?? null;
  let day: number | null = null, month = -1, year: number | null = null;
  if (m) { day = Number(m[1]); month = monthIndex(m[2]!); year = m[3] ? Number(m[3]) : null; }
  else if ((m = /^([a-zà-ÿ.]+) (\d{1,2})(?:st|nd|rd|th)?(?: (\d{4}))?$/.exec(t))) { month = monthIndex(m[1]!); day = Number(m[2]); year = m[3] ? Number(m[3]) : null; }
  if (day === null || month < 0) return null;
  const thisYear = Number(today.slice(0, 4));
  let candidate = `${year ?? thisYear}-${pad(month + 1)}-${pad(day)}`;
  if (!valid(candidate)) return null;
  // Without a year, a date means the most recent one (or, for plans, the next one).
  if (year === null && !future && candidate > today) candidate = `${thisYear - 1}-${pad(month + 1)}-${pad(day)}`;
  if (year === null && future && candidate < today) candidate = `${thisYear + 1}-${pad(month + 1)}-${pad(day)}`;
  return valid(candidate) ? candidate : null;
}
/**
 * The range as asked, ending today at the latest: ZIGi reads what is recorded. Only a tool about plans (the meal plan,
 * groceries) passes `future`, and then a range may run past today ("this week" is Monday to Sunday, "next week" works).
 */
function resultOf(from: string, to: string, label: string, today: string, future = false): RangeResult {
  const end = future || to <= today ? to : today;
  if (from > end) return {ok: false, message: `That range (${label}) has not started yet; ZIGi reads only what is recorded up to today.`};
  if (daysBetween(from, end) + 1 > MAX_RANGE_DAYS) return {ok: false, message: `That range is longer than ${MAX_RANGE_DAYS} days; ask about a year or less at a time.`};
  return {ok: true, from, to: end, label};
}
/** Resolves a spoken or written range against `today` (the journal's own day). Unknown phrases say so; nothing is guessed. */
export function parseRange(input: string | null | undefined, today: string, options: {future?: boolean} = {}): RangeResult {
  const future = options.future === true;
  const result = (from: string, to: string, label: string, day: string) => resultOf(from, to, label, day, future);
  const raw = (input ?? '').trim().toLowerCase().replace(/[?!.]+$/, '').replace(/\s+/g, ' ');
  const text = raw.replace(/^(?:in|during|over|for|on|op|au|le|am|im|en|in de|in het|over de)\s+/, '').replace(/^the /, '');
  if (!text) return result(today, today, 'today', today);
  for (const [phrase, words] of Object.entries(PHRASES) as [Phrase, readonly string[]][]) {
    if (!words.includes(text) && !words.includes(raw)) continue;
    switch (phrase) {
      case 'today': return result(today, today, 'today', today);
      case 'yesterday': { const d = addLocalDays(today, -1); return result(d, d, 'yesterday', today); }
      case 'tomorrow': { const d = addLocalDays(today, 1); return result(d, d, 'tomorrow', today); }
      case 'this-week': return result(weekStart(today), addLocalDays(weekStart(today), 6), 'this week', today);
      case 'last-week': { const start = addLocalDays(weekStart(today), -7); return result(start, addLocalDays(start, 6), 'last week', today); }
      case 'next-week': { const start = addLocalDays(weekStart(today), 7); return result(start, addLocalDays(start, 6), 'next week', today); }
      case 'this-month': return result(monthStart(today), monthEnd(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1), 'this month', today);
      case 'last-month': { const start = monthStart(shiftMonths(monthStart(today), -1)); return result(start, monthEnd(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1), 'last month', today); }
      case 'next-month': { const start = monthStart(shiftMonths(monthStart(today), 1)); return result(start, monthEnd(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1), 'next month', today); }
      case 'this-year': return result(`${today.slice(0, 4)}-01-01`, `${today.slice(0, 4)}-12-31`, 'this year', today);
      case 'last-year': { const y = Number(today.slice(0, 4)) - 1; return result(`${y}-01-01`, `${y}-12-31`, 'last year', today); }
    }
  }
  let m: RegExpExecArray | null;
  if ((m = new RegExp(`^${LAST} (\\d{1,3}) ${UNIT_DAYS}$`).exec(text))) { const n = Number(m[1]); if (n < 1) return {ok: false, message: 'Ask about at least one day.'}; return result(addLocalDays(today, -(n - 1)), today, `the last ${n} day${n === 1 ? '' : 's'}`, today); }
  if ((m = new RegExp(`^${LAST} (\\d{1,2}) ${UNIT_WEEKS}$`).exec(text))) { const n = Number(m[1]); if (n < 1) return {ok: false, message: 'Ask about at least one week.'}; return result(addLocalDays(today, -(n * 7 - 1)), today, `the last ${n} week${n === 1 ? '' : 's'}`, today); }
  if ((m = new RegExp(`^${LAST} (\\d{1,2}) ${UNIT_MONTHS}$`).exec(text))) { const n = Number(m[1]); if (n < 1) return {ok: false, message: 'Ask about at least one month.'}; return result(addLocalDays(shiftMonths(today, -n), 1), today, `the last ${n} month${n === 1 ? '' : 's'}`, today); }
  if ((m = new RegExp(`^${NEXT} (\\d{1,3}) ${UNIT_DAYS}$`).exec(text))) { const n = Number(m[1]); if (n < 1) return {ok: false, message: 'Ask about at least one day.'}; if (!future) return {ok: false, message: 'That range is in the future; ZIGi reads only what is recorded up to today.'}; return result(today, addLocalDays(today, n - 1), `the next ${n} day${n === 1 ? '' : 's'}`, today); }
  if ((m = /^(?:since|sinds|depuis|depuis le|seit|seit dem) (.+)$/.exec(text))) { const day = parseDay(m[1]!, today, future); if (!day) return {ok: false, message: `ZIGi could not read the date "${m[1]}". Use a form like 2026-09-01 or 1 September.`}; return result(day, today, `since ${day}`, today); }
  if ((m = /^(?:between|from|tussen|van|entre|du|zwischen|vom|von) (.+?) (?:and|to|until|till|en|tot|et|au|und|bis|-) (.+)$/.exec(text)) || (m = /^(\d{4}-\d{2}-\d{2}) ?(?:\.\.|–|—|-|to) ?(\d{4}-\d{2}-\d{2})$/.exec(text))) {
    const a = parseDay(m[1]!, today, future), b = parseDay(m[2]!, today, future);
    if (!a || !b) return {ok: false, message: 'ZIGi could not read one of those dates. Use a form like 2026-09-01.'};
    const [from, to] = a <= b ? [a, b] : [b, a];
    return result(from, to, `${from} to ${to}`, today);
  }
  const single = parseDay(text, today, future);
  if (single) return result(single, single, single, today);
  if ((m = /^(?:last |previous |vorige |dernier |letzten )?([a-zà-ÿ.]+)(?: (\d{4}))?$/.exec(text))) {
    const month = monthIndex(m[1]!), weekday = weekdayIndex(m[1]!);
    if (month >= 0) {
      const thisYear = Number(today.slice(0, 4)), thisMonth = Number(today.slice(5, 7)) - 1;
      const year = m[2] ? Number(m[2]) : !future && month > thisMonth ? thisYear - 1 : future && month < thisMonth ? thisYear + 1 : thisYear;
      const name = MONTHS[month]![0]!;
      return result(`${year}-${pad(month + 1)}-01`, monthEnd(year, month), `${name[0]!.toUpperCase()}${name.slice(1)} ${year}`, today);
    }
    if (weekday >= 0 && !m[2]) {
      const back = (localWeekday(today) - weekday + 7) % 7, ahead = (weekday - localWeekday(today) + 7) % 7, last = /^(?:last|previous|vorige|dernier|letzten) /.test(raw);
      // "On Monday" is the most recent Monday; for plans it is the coming one (today included). "Last Monday" is always past.
      const day = future && !last ? addLocalDays(today, ahead) : addLocalDays(today, -(last && back === 0 ? 7 : back));
      const name = WEEKDAYS[weekday]![0]!;
      return result(day, day, `${name[0]!.toUpperCase()}${name.slice(1)} ${day}`, today);
    }
  }
  return {ok: false, message: `ZIGi could not read "${input}" as a period. Try "today", "this week", "last month", "the last 14 days" or "since 2026-09-01".`};
}
/** A range phrase inside a longer question ("How many minutes did I meditate this month?"), or null. */
export function findRange(question: string, today: string): ({ok: true} & DayRange & {phrase: string}) | null {
  const text = question.toLowerCase().replace(/[?!]+/g, ' ').replace(/\s+/g, ' ').trim();
  const candidates: string[] = [];
  for (const words of Object.values(PHRASES)) for (const w of words) if (new RegExp(`(?:^|\\W)${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\W)`).test(text)) candidates.push(w);
  const patterns = [
    new RegExp(`${LAST} \\d{1,3} (?:${UNIT_DAYS}|${UNIT_WEEKS}|${UNIT_MONTHS})`),
    /(?:since|sinds|depuis|seit) (?:\d{4}-\d{2}-\d{2}|\d{1,2}(?:st|nd|rd|th)? [a-zà-ÿ.]+(?: \d{4})?|[a-zà-ÿ.]+ \d{1,2}(?:st|nd|rd|th)?(?: \d{4})?)/,
    /(?:between|from) (?:\d{4}-\d{2}-\d{2}|\d{1,2} [a-zà-ÿ.]+|[a-zà-ÿ.]+ \d{1,2}) (?:and|to|until) (?:\d{4}-\d{2}-\d{2}|\d{1,2} [a-zà-ÿ.]+|[a-zà-ÿ.]+ \d{1,2})/,
    /\d{4}-\d{2}-\d{2}(?: ?(?:\.\.|to) ?\d{4}-\d{2}-\d{2})?/,
    /(?:on |last )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/,
    // "May" and "march" are also everyday words: they count as months only after "in"/"of" or before a year.
    /(?:in )?(?:january|february|april|june|july|august|september|october|november|december)(?: \d{4})?/,
    /(?:(?:in|of) (?:may|march)(?: \d{4})?|(?:may|march) \d{4})/,
  ];
  for (const pattern of patterns) { const m = pattern.exec(text); if (m) candidates.push(m[0]); }
  for (const phrase of candidates.sort((a, b) => b.length - a.length)) {
    const parsed = parseRange(phrase, today);
    if (parsed.ok) return {...parsed, phrase};
  }
  return null;
}
