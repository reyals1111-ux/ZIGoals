import {addLocalDays, localWeekday} from '../../../local-date';
import {formatDate, formatMonth} from '../../../visual-format';
import {MONTHS, WEEKDAYS, daysBetween, parseRange, weekStart} from '../../tools/range';
import {isPeriodToken} from '../../../nova/stage/period-token';
import type {Lang} from './types';

/**
 * Session AS (ADR-042, approval item 3): a period as a short token — what a question names ("this month", "since 1
 * November", "last Friday") and what a widget made for that answer keeps (`zigoals:nova-stage:v1` `params.period`). A
 * token is relative where the words were ("this-week" stays this week tomorrow) and resolves against the person's own day.
 * A period never runs past today: only what is recorded is read.
 */
export {PERIOD_TOKEN, isPeriodToken} from '../../../nova/stage/period-token';
export type Period = {
  token: string; from: string; to: string;
  /** Every day of the period up to today, oldest first (only the token's weekday, when it names one). */
  days: string[];
  /** Whether today is one of its days (today is "still open", never missed). */
  today: boolean;
  weekday: number | null;
};
const pad = (n: number) => String(n).padStart(2, '0');
const monthEnd = (year: number, month: number) => `${year}-${pad(month + 1)}-${pad(new Date(Date.UTC(year, month + 1, 0)).getUTCDate())}`;
const validDay = (day: string) => !Number.isNaN(Date.parse(`${day}T00:00:00Z`)) && new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day;
/** The days a token stands for on `today`, or null for a token that is not one or lies wholly ahead. */
export function resolvePeriod(token: string, today: string): Period | null {
  if (!isPeriodToken(token)) return null;
  const [base, wd] = token.split('@') as [string, string | undefined], weekday = wd === undefined ? null : Number(wd);
  let from = today, to = today;
  const year = Number(today.slice(0, 4)), month = Number(today.slice(5, 7)) - 1;
  if (base === 'yesterday') from = to = addLocalDays(today, -1);
  else if (base === 'this-week') { from = weekStart(today); to = addLocalDays(from, 6); }
  else if (base === 'last-week') { from = addLocalDays(weekStart(today), -7); to = addLocalDays(from, 6); }
  else if (base === 'this-month') { from = `${today.slice(0, 8)}01`; to = monthEnd(year, month); }
  else if (base === 'last-month') { const d = new Date(Date.UTC(year, month - 1, 1)); from = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01`; to = monthEnd(d.getUTCFullYear(), d.getUTCMonth()); }
  else if (base === 'this-year') { from = `${year}-01-01`; to = `${year}-12-31`; }
  else if (base === 'last-year') { from = `${year - 1}-01-01`; to = `${year - 1}-12-31`; }
  else if (base.startsWith('last-')) { const n = Math.min(366, Number(base.split('-')[1])); from = addLocalDays(today, -(n - 1)); }
  else if (base.startsWith('since:')) from = base.slice(6);
  else if (base.startsWith('on:')) from = to = base.slice(3);
  else if (base.startsWith('month:')) { const y = Number(base.slice(6, 10)), m = Number(base.slice(11, 13)) - 1; if (m < 0 || m > 11) return null; from = `${y}-${pad(m + 1)}-01`; to = monthEnd(y, m); }
  if (!validDay(from) || !validDay(to)) return null;
  if (to > today) to = today;
  if (from > to) return null;
  if (daysBetween(from, to) > 366) from = addLocalDays(to, -366);
  const days: string[] = [];
  for (let d = from; d <= to; d = addLocalDays(d, 1)) if (weekday === null || localWeekday(d) === weekday) days.push(d);
  return {token, from, to, days, today: days.includes(today), weekday};
}
/** The period just before, of the same length (a period-to-date compares with the same days of the one before). */
export function previousPeriod(p: Period, today: string): Period | null {
  const base = p.token.split('@')[0]!, length = daysBetween(p.from, p.to) + 1;
  let from: string;
  if (base === 'this-month' || base === 'last-month' || base.startsWith('month:')) { const d = new Date(Date.UTC(Number(p.from.slice(0, 4)), Number(p.from.slice(5, 7)) - 2, 1)); from = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01`; }
  else if (base === 'this-week' || base === 'last-week') from = addLocalDays(p.from, -7);
  else if (base === 'this-year' || base === 'last-year') from = `${Number(p.from.slice(0, 4)) - 1}${p.from.slice(4)}`;
  else from = addLocalDays(p.from, -length);
  const whole = base === 'last-week' ? 7 : base === 'last-month' || base.startsWith('month:') ? daysBetween(from, monthEnd(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1)) + 1 : base === 'last-year' ? 366 : length;
  let to = addLocalDays(from, whole - 1);
  if (base === 'last-month' || base.startsWith('month:')) to = monthEnd(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1);
  if (base === 'last-year') to = `${from.slice(0, 4)}-12-31`;
  if (to >= p.from) to = addLocalDays(p.from, -1);
  if (to > today || from > to) return null;
  const days: string[] = [];
  for (let d = from; d <= to; d = addLocalDays(d, 1)) if (p.weekday === null || localWeekday(d) === p.weekday) days.push(d);
  return {token: `on:${from}`, from, to, days, today: false, weekday: p.weekday};
}

const WEEKDAY_NL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'], WEEKDAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const weekdayName = (weekday: number, lang: Lang, pluralForm = false): string => lang === 'nl' ? `${WEEKDAY_NL[weekday]}${pluralForm ? 'en' : ''}` : `${WEEKDAY_EN[weekday]}${pluralForm ? 's' : ''}`;
/** A day as the app writes it ("Tue, Nov 3"; with the year when it is not this year). */
export const dayWords = (day: string, today: string): string => formatDate(day, {weekday: true, year: day.slice(0, 4) !== today.slice(0, 4)});
/** The period in words: "this month", "last week", "the last 14 days", "since Sun, Nov 1", "on Mondays this month". */
export function periodWords(p: Period, lang: Lang, today: string): string {
  const base = p.token.split('@')[0]!, nl = lang === 'nl';
  const fixed: Record<string, [string, string]> = {today: ['today', 'vandaag'], yesterday: ['yesterday', 'gisteren'], 'this-week': ['this week', 'deze week'], 'last-week': ['last week', 'vorige week'], 'this-month': ['this month', 'deze maand'], 'last-month': ['last month', 'vorige maand'], 'this-year': ['this year', 'dit jaar'], 'last-year': ['last year', 'vorig jaar']};
  let words: string;
  if (fixed[base]) words = fixed[base]![nl ? 1 : 0];
  else if (base.startsWith('last-')) { const n = Number(base.split('-')[1]); words = nl ? `in de afgelopen ${n} dagen` : `in the last ${n} days`; }
  else if (base.startsWith('since:')) words = `${nl ? 'sinds' : 'since'} ${dayWords(p.from, today)}`;
  else if (base.startsWith('on:')) words = `${nl ? 'op' : 'on'} ${dayWords(p.from, today)}`;
  else words = `in ${formatMonth(`${p.from}T12:00:00Z`, {year: p.from.slice(0, 4) !== today.slice(0, 4), timeZone: 'UTC'})}`;
  return p.weekday === null ? words : nl ? `op ${weekdayName(p.weekday, 'nl')} ${words}` : `on ${weekdayName(p.weekday, 'en', true)} ${words}`;
}
/** The period with its dates, as a sentence opens with it: "this month (Sun, Nov 1 to Tue, Nov 17)"; one day: "yesterday (Mon, Nov 16)". */
export function periodSpan(p: Period, lang: Lang, today: string): string {
  const words = periodWords(p, lang, today), base = p.token.split('@')[0]!;
  if (base.startsWith('on:') || base.startsWith('since:')) return words;
  return p.from === p.to ? `${words} (${dayWords(p.from, today)})` : `${words} (${dayWords(p.from, today)} ${lang === 'nl' ? 't/m' : 'to'} ${dayWords(p.to, today)})`;
}

const NUM: Record<string, number> = {one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10, een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, tien: 10, a: 1, couple: 2};
const FIXED: readonly [RegExp, string][] = [
  [/\b(?:day before yesterday|eergisteren)\b/, 'ereyesterday'],
  [/\b(?:last night|vannacht|afgelopen nacht)\b/, 'today'],
  [/\b(?:yesterday|gisteren|gister)\b/, 'yesterday'],
  [/\b(?:this|deze|current|huidige) week\b|\bweek so far\b|\bso far this week\b/, 'this-week'],
  [/\b(?:last|previous|vorige|afgelopen) week\b|\bthe week before\b/, 'last-week'],
  [/\b(?:this|deze|current|huidige) (?:month|maand)\b|\bmonth so far\b/, 'this-month'],
  [/\b(?:last|previous|vorige|afgelopen) (?:month|maand)\b/, 'last-month'],
  [/\b(?:this year|dit jaar|year so far|so far this year)\b/, 'this-year'],
  [/\b(?:last year|vorig jaar|afgelopen jaar)\b/, 'last-year'],
  [/\b(?:past|last|afgelopen|laatste) (?:few|couple of|paar) (?:days|dagen)\b/, 'last-7-days'],
  [/\b(?:lately|recently|de laatste tijd|recent|onlangs|laatst)\b/, 'last-30-days'],
  [/\b(?:today|tonight|vandaag|vanavond|vanochtend|this morning|this evening|so far today|right now)\b/, 'today'],
];
/**
 * The period a (folded) question names, and "on Mondays" as a weekday. `rest` is the question without those words (so a
 * month's name is not read as a habit's). Null when it names none.
 */
export function periodIn(folded: string, today: string): {token: string | null; versus: string | null; weekday: number | null; rest: string} {
  let rest = folded, token: string | null = null, versus: string | null = null, weekday: number | null = null;
  const take = (m: RegExpExecArray | RegExpMatchArray) => { rest = `${rest.slice(0, m.index!)} ${rest.slice(m.index! + m[0].length)}`.replace(/\s+/g, ' ').trim(); };
  const set = (value: string) => { if (!token) token = value; else if (!versus && value !== token) versus = value; };
  // Every Monday, on Mondays, op maandag(en), elke vrijdag: a weekday across the period, not one day.
  for (let i = 0; i < 7 && weekday === null; i++) {
    const names = WEEKDAYS[i]!.filter(n => n.length > 3 && /^[a-z]+$/.test(n)).join('|');
    const m = new RegExp(`\\b(?:(?:every|each|elke|iedere|on|op) )?(?:${names})(?:s|en)\\b|\\b(?:every|each|elke|iedere) (?:${names})\\b|\\bop (?:${names}) (?=.*\\b(?:maand|week|jaar|dagen)\\b)`).exec(rest);
    if (m) { weekday = i; take(m); }
  }
  let m: RegExpExecArray | null;
  if ((m = /\b(?:last|past|previous|the last|the past|afgelopen|laatste|de afgelopen|de laatste) (\d{1,3}|one|two|three|four|five|six|seven|ten|een|twee|drie|vier|vijf|zes|zeven|tien) (days?|dagen|dag|weeks?|weken|months?|maanden|maand)\b/.exec(rest))) {
    const n = NUM[m[1]!] ?? Number(m[1]), unit = m[2]!, days = /^w/.test(unit) ? n * 7 : /^m/.test(unit) ? n * 30 : n;
    if (days >= 1 && days <= 366) { set(`last-${days}-days`); take(m); }
  }
  if ((m = /\b(?:in |over |during )?(?:the )?(?:past|last) (week|month|year)\b(?! ?(?:s|en))/.exec(rest)) && /\bpast\b/.test(m[0])) { set(m[1] === 'week' ? 'last-7-days' : m[1] === 'month' ? 'last-30-days' : 'last-365-days'); take(m); }
  if ((m = /\b(?:since|sinds|vanaf) ((?:\d{4}-\d{2}-\d{2})|(?:\d{1,2}(?:st|nd|rd|th|e)? [a-z]+(?: \d{4})?)|(?:[a-z]+ \d{1,2}(?:st|nd|rd|th)?(?: \d{4})?)|(?:[a-z]+))\b/.exec(rest))) {
    const parsed = parseRange(`since ${m[1]}`, today), month = !parsed.ok ? parseRange(m[1]!, today) : null;
    if (parsed.ok) { set(`since:${parsed.from}`); take(m); } else if (month?.ok) { set(`since:${month.from}`); take(m); }
  }
  for (const [re, value] of FIXED) {
    const hit = re.exec(rest);
    if (!hit) continue;
    if (value === 'ereyesterday') set(`on:${addLocalDays(today, -2)}`); else set(value);
    take(hit);
  }
  if ((m = /\b(\d{4}-\d{2}-\d{2})\b/.exec(rest)) && validDay(m[1]!) && m[1]! <= today) { set(`on:${m[1]}`); take(m); }
  // A month by name ("in October", "in oktober 2025"); "may" and "march"/"maart" only after "in" or before a year.
  for (let i = 0; i < 12; i++) {
    const names = MONTHS[i]!.filter(n => /^[a-z]{4,}$/.test(n) || n === 'mei').join('|');
    const hit = new RegExp(`\\b(in |of |van |during )?(${names})( \\d{4})?\\b`).exec(rest);
    if (!hit || ((hit[2] === 'may' || hit[2] === 'march' || hit[2] === 'mars') && !hit[1] && !hit[3])) continue;
    const thisYear = Number(today.slice(0, 4)), thisMonth = Number(today.slice(5, 7)) - 1, year = hit[3] ? Number(hit[3]) : i > thisMonth ? thisYear - 1 : thisYear;
    set(`month:${year}-${pad(i + 1)}`); take(hit); break;
  }
  // One weekday by name: "on Friday", "last Friday", "afgelopen vrijdag", "vrijdag" — the most recent one.
  if (!token && weekday === null) for (let i = 0; i < 7; i++) {
    const names = WEEKDAYS[i]!.filter(n => n.length > 3 && /^[a-z]+$/.test(n)).join('|');
    const hit = new RegExp(`\\b(?:(on|op|last|afgelopen|vorige) )?(?:${names})\\b`).exec(rest);
    if (!hit) continue;
    const back = (localWeekday(today) - i + 7) % 7, last = /^(?:last|afgelopen|vorige) /.test(hit[0]);
    set(`on:${addLocalDays(today, -(last && back === 0 ? 7 : back))}`); take(hit); break;
  }
  const final: string | null = token;
  return {token: final && weekday !== null ? `${final}@${weekday}` : final, versus, weekday, rest};
}
