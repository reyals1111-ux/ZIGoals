import {addLocalDays} from '../../../local-date';
import {formatNumber} from '../../../visual-format';
import {dayWords, periodSpan, periodWords, previousPeriod, resolvePeriod, type Period} from './period';
import {dayList, rate, runBest, runNow, tally, type DayPoint, type Tally} from './series';
import {t} from './text';
import type {Ask, Domain, Exact, ExactWidget, Lang, Query, QuerySubject} from './types';

/**
 * Session AS (ADR-042, Part 1): a *track* is one thing the person keeps day by day — a habit, the water target, the
 * journal — and `trackAnswer` answers every question about one: which days it was not done (missed and skipped said
 * apart), how often it was done, a day's own state, totals, averages, the best and lowest day, the run of days, this
 * period beside the one before, and the last time. One function, so every track answers the same questions the same way.
 */
export type Track = {
  key: string; domain: Domain; name: string; subject?: QuerySubject;
  /** Session AS (carried 8): a habit the person is quitting: its failed day is a slip, said "slipped", never "missed". */
  quit?: boolean;
  /** One point for each given day (a day after today is never asked). */
  points: (days: readonly string[]) => DayPoint[];
  /** A measured track ("minutes", "L", "steps"); null for one that is only done or not. `sum`: totals make sense; `level`: only an average does (weight, sleep). */
  measure: {text: (value: number, lang: Lang) => string; kind: 'sum' | 'level'; target: number | null} | null;
  /** How the track says a day that counts and one that does not: ["done", "gedaan"], ["not done", "niet gedaan"]. */
  did: readonly [string, string]; not: readonly [string, string];
  /** `habit`: a past due day without it is missed. `log`: a past day with nothing logged is unknown ("nothing logged"). */
  kind: 'habit' | 'log' | 'event';
  /** The Habits page's own streak, where the track is a habit (else the run is counted from the days). */
  streak?: {current: number; best: number; unit: string};
  source: readonly [string, string];
  widgets: (ask: Ask, period: Period, q: Query) => ExactWidget[];
  /** Where one day can hold several of the thing (workouts, sessions): how many there were on the given days, and the word for them. */
  events?: {count: (days: readonly string[]) => number; word: (n: number, lang: Lang) => string};
  /** What today is called for this track, where "today" reads wrong ("last night" for a night's sleep). */
  todayWords?: readonly [string, string];
};
const DEFAULT: Partial<Record<Ask, string>> = {total: 'today', open: 'today', average: 'last-30-days', best: 'last-30-days', worst: 'last-30-days', trend: 'last-30-days', compare: 'this-week', status: 'this-week'};
export function periodFor(q: Query, today: string, fallback = 'this-month'): Period {
  const base = q.period ?? (q.weekday !== null ? `last-90-days@${q.weekday}` : q.shape === 'yes-no' && q.ask !== 'streak' ? 'today' : DEFAULT[q.ask] ?? fallback);
  return resolvePeriod(base, today) ?? resolvePeriod('today', today)!;
}
const days = (n: number, lang: Lang) => `${formatNumber(n)} ${lang === 'nl' ? (n === 1 ? 'dag' : 'dagen') : (n === 1 ? 'day' : 'days')}`;
const UNIT_NL: Record<string, [string, string]> = {days: ['dag', 'dagen'], weeks: ['week', 'weken'], months: ['maand', 'maanden'], years: ['jaar', 'jaar']};
export const streakText = (n: number, unit: string, lang: Lang) => lang === 'nl' ? `${formatNumber(n)} ${UNIT_NL[unit]?.[n === 1 ? 0 : 1] ?? unit}` : `${formatNumber(n)} ${n === 1 ? unit.replace(/s$/, '') : unit}`;
const base = (track: Track, q: Query, p: Period, T: Tally | null): Record<string, unknown> => ({
  about: track.name, ...(track.subject ? {subject: track.subject.id} : {}), ask: q.ask, period: {token: p.token, from: p.from, to: p.to},
  ...(T ? {due: T.due, done: T.done, missed: T.missed, skipped: T.skipped, part: T.part, open: T.open, notLogged: T.none, dates: {missed: T.dates.missed, skipped: T.dates.skipped, part: T.dates.part, notLogged: T.dates.none, done: T.dates.done}} : {}),
});
/** One day in words: "Meditate: done yesterday (10 minutes)", "Meditate: still open today", "Water: 1.2 L today, of your 2 L target". */
function daySentence(track: Track, point: DayPoint, label: string, lang: Lang): string {
  const m = track.measure, value = point.value !== null && m ? m.text(point.value, lang) : null, of = m?.target != null && value ? t(lang, ` of your ${m.text(m.target, lang)} target`, ` van je doel van ${m.text(m.target, lang)}`) : '';
  const n = track.name;
  // A log's day leads with its figure: "Water: 1,000 mL today, of your 2,000 mL target."
  if (track.kind !== 'habit' && value) return `${n}: ${value} ${label}${of ? `,${of}` : ''}.${point.state === 'done' && m?.target != null ? t(lang, ' Target reached.', ' Doel gehaald.') : ''}`;
  switch (point.state) {
    case 'done': return `${n}: ${track.did[lang === 'nl' ? 1 : 0]} ${label}${value ? ` (${value})` : ''}.`;
    case 'part': return `${n}: ${t(lang, 'partly done', 'deels gedaan')} ${label}${value ? ` (${value}${of})` : ''}.`;
    case 'missed': return `${n}: ${track.not[lang === 'nl' ? 1 : 0]} ${label}${t(lang, ' (missed)', ' (gemist)')}.`;
    case 'skipped': return `${n}: ${t(lang, 'skipped', 'overgeslagen')} ${label}.`;
    case 'open': return track.kind === 'habit' ? `${n}: ${t(lang, 'still open', 'nog open')} ${label}${value && point.value ? ` (${value}${of} ${t(lang, 'so far', 'tot nu toe')})` : ''}.` : `${n}: ${t(lang, 'nothing logged yet', 'nog niets gelogd')} ${label}.`;
    case 'none': return track.kind === 'event' ? `${n}: ${track.not[lang === 'nl' ? 1 : 0]} ${label}.` : `${n}: ${t(lang, 'nothing logged', 'niets gelogd')} ${label}.`;
    default: return `${n}: ${t(lang, 'not due', 'niet gepland')} ${label}.`;
  }
}
export function trackAnswer(q: Query, track: Track, today: string): Exact | null {
  // Only a habit's day can be marked as skipped: for a log, "which days did I skip" asks which days are without it.
  if (q.ask === 'skipped' && track.kind !== 'habit') q = {...q, ask: 'not-done'};
  const lang = q.lang, nl = lang === 'nl', p = periodFor(q, today), points = track.points(p.days), T = tally(points);
  const span = periodSpan(p, lang, today), words = periodWords(p, lang, today), day = (d: string) => dayWords(d, today), m = track.measure;
  const did = track.did[nl ? 1 : 0], not = track.not[nl ? 1 : 0], n = track.name;
  const done = (text: string, extra: Record<string, unknown> = {}, ask: Ask = q.ask): Exact => ({kind: 'answer', text, facts: {...base(track, q, p, T), ...extra}, widgets: track.widgets(ask, p, q), query: q, source: track.source[nl ? 1 : 0]});
  // "Today is still open" is said for a habit and for a target of the day; a plain log has nothing to keep open.
  const openNote = T.open && (track.kind === 'habit' || m?.target != null) ? t(lang, ' Today is still open.', ' Vandaag staat nog open.') : '';
  const single = p.days.length === 1 && p.weekday === null;
  if (!p.days.length) return done(t(lang, `${n}: no such day ${words}.`, `${n}: geen zulke dag ${words}.`));

  if (q.ask === 'streak') {
    const year = track.points(resolvePeriod('last-366-days', today)!.days), current = track.streak?.current ?? runNow(year), best = track.streak?.best ?? runBest(year).days, unit = track.streak?.unit ?? 'days';
    return done(current > 0
      ? t(lang, `${n}: ${streakText(current, unit, 'en')} in a row now; your longest run is ${streakText(Math.max(best, current), unit, 'en')}.`, `${n}: nu ${streakText(current, unit, 'nl')} op rij; je langste reeks is ${streakText(Math.max(best, current), unit, 'nl')}.`)
      : t(lang, `${n}: no run going right now${best ? `; your longest was ${streakText(best, unit, 'en')}` : ''}.`, `${n}: er loopt nu geen reeks${best ? `; je langste was ${streakText(best, unit, 'nl')}` : ''}.`), {streak: {current, best: Math.max(best, current), unit}});
  }
  if (q.ask === 'last') {
    const back = track.points(resolvePeriod('last-366-days', today)!.days), hit = [...back].reverse().find(x => x.state === 'done' || (x.state !== 'rest' && x.state !== 'skipped' && x.value !== null && x.value > 0)); // the last time at all: a day partly done counts
    if (!hit) return done(t(lang, `${n}: not ${did} in the last year.`, `${n}: het afgelopen jaar niet ${did}.`), {last: null});
    const ago = Math.round((Date.parse(today) - Date.parse(hit.date)) / 86_400_000), when = ago === 0 ? t(lang, 'today', 'vandaag') : ago === 1 ? t(lang, 'yesterday', 'gisteren') : t(lang, `${ago} days ago`, `${ago} dagen geleden`);
    return done(`${n}: ${t(lang, 'last', 'voor het laatst')} ${hit.state === 'done' ? did : t(lang, 'logged', 'gelogd')} ${t(lang, 'on', 'op')} ${day(hit.date)} (${when})${hit.value !== null && m ? `, ${m.text(hit.value, lang)}` : ''}.`, {last: hit.date, value: hit.value});
  }
  // One day asked ("did I meditate yesterday", "how much water today"): that day's own state.
  if (single && q.ask !== 'compare' && q.ask !== 'trend') {
    const point = points[0]!;
    let text = daySentence(track, point, point.date === today && track.todayWords ? track.todayWords[nl ? 1 : 0] : words, lang);
    if (m?.target != null && point.value !== null && point.state === 'open' && m.kind === 'sum' && point.value < m.target) text += ` ${t(lang, `${m.text(m.target - point.value, 'en')} to go.`, `Nog ${m.text(m.target - point.value, 'nl')} te gaan.`)}`;
    return done(text, {day: point.date, state: point.state, value: point.value, target: m?.target ?? null});
  }
  if (q.ask === 'compare' || q.ask === 'trend') {
    const other = q.versus ? resolvePeriod(q.versus, today) : previousPeriod(p, today);
    if (!other) return null;
    const [a, b] = other.from < p.from ? [p, other] : [other, p], Ta = tally(track.points(a.days)), Tb = tally(track.points(b.days));
    const wa = periodWords(a, lang, today), wb = a === p && !q.versus ? t(lang, 'the period before', 'de periode ervoor') + ` (${day(b.from)}${b.from === b.to ? '' : ` ${t(lang, 'to', 't/m')} ${day(b.to)}`})` : periodWords(b, lang, today);
    if (m && (Ta.valued || Tb.valued)) {
      const va = m.kind === 'sum' ? Ta.total : Ta.valued ? Ta.total / Ta.valued : null, vb = m.kind === 'sum' ? Tb.total : Tb.valued ? Tb.total / Tb.valued : null, per = m.kind === 'sum' ? '' : t(lang, ' a day on average', ' per dag gemiddeld');
      const diff = va !== null && vb !== null ? va - vb : null, change = diff === null ? '' : Math.abs(diff) < 1e-9 ? t(lang, ', the same', ', gelijk') : t(lang, `, ${m.text(Math.abs(diff), 'en')} ${diff > 0 ? 'more' : 'less'}`, `, ${m.text(Math.abs(diff), 'nl')} ${diff > 0 ? 'meer' : 'minder'}`);
      return done(`${n}: ${va === null ? t(lang, 'nothing logged', 'niets gelogd') : m.text(va, lang) + per} ${wa}; ${vb === null ? t(lang, 'nothing logged', 'niets gelogd') : m.text(vb, lang) + per} ${wb}${change}.`, {compare: {now: {from: a.from, to: a.to, value: va, done: Ta.done, due: Ta.decided}, before: {from: b.from, to: b.to, value: vb, done: Tb.done, due: Tb.decided}}});
    }
    return done(t(lang, `${n}: ${did} on ${Ta.done} of ${days(Ta.decided, 'en')} ${wa}; ${Tb.done} of ${Tb.decided} ${wb}.`, `${n}: ${did} op ${Ta.done} van ${days(Ta.decided, 'nl')} ${wa}; ${Tb.done} van ${Tb.decided} ${wb}.`), {compare: {now: {from: a.from, to: a.to, done: Ta.done, due: Ta.decided}, before: {from: b.from, to: b.to, done: Tb.done, due: Tb.decided}}});
  }
  if (!T.due) return done(t(lang, `${n} was not due ${span}.`, `${n} stond niet gepland ${span}.`));

  if (q.ask === 'missed' || q.ask === 'not-done' || q.ask === 'skipped') {
    // Missed: the due days without it. For a target that is logged: the logged days below it; a day with nothing logged is said apart.
    const missed = track.kind === 'habit' ? T.dates.missed : track.kind === 'event' ? T.dates.none : T.dates.part.filter(d => d !== today);
    const partPast = track.kind === 'habit' ? T.dates.part.filter(d => d !== today) : [];
    const main = (q.ask === 'missed' || (q.ask === 'not-done' && track.kind === 'log') ? missed : q.ask === 'skipped' ? T.dates.skipped : [...missed, ...T.dates.skipped, ...partPast]).slice().sort();
    const count = main.length, list = count ? `: ${dayList(main, day, lang)}` : '';
    let text: string;
    if (q.ask === 'skipped') text = count ? t(lang, `${n}: skipped on ${days(count, 'en')} ${span}${list}.`, `${n}: overgeslagen op ${days(count, 'nl')} ${span}${list}.`) : t(lang, `${n}: no skipped day ${span}.`, `${n}: geen overgeslagen dag ${span}.`);
    else if (q.ask === 'missed' || track.kind === 'log') {
      const word = track.kind === 'habit' ? t(lang, 'missed', 'gemist') : not;
      text = count ? `${n}: ${word} ${t(lang, 'on', 'op')} ${days(count, lang)} ${span}${list}.` : track.kind === 'habit' ? t(lang, `${n}: no missed day ${span}.`, `${n}: geen gemiste dag ${span}.`) : t(lang, `${n}: no day ${not} ${span}.`, `${n}: geen dag ${not} ${span}.`);
      if (T.skipped) text += t(lang, ` Skipped (not counted as missed): ${dayList(T.dates.skipped, day, 'en')}.`, ` Overgeslagen (telt niet als gemist): ${dayList(T.dates.skipped, day, 'nl')}.`);
      // A day with nothing logged is unknown, not below the target: said apart, with its days.
      if (track.kind === 'log' && T.none) text += t(lang, ` Nothing logged on ${days(T.none, 'en')}: ${dayList(T.dates.none, day, 'en', 8)}.`, ` Niets gelogd op ${days(T.none, 'nl')}: ${dayList(T.dates.none, day, 'nl', 8)}.`);
    } else {
      text = count ? `${n}: ${not} ${t(lang, 'on', 'op')} ${days(count, lang)} ${span}${list}.` : t(lang, `${n}: ${did} on every due day ${span} (${T.done} of ${T.decided}).`, `${n}: ${did} op elke geplande dag ${span} (${T.done} van ${T.decided}).`);
      if (count && track.kind === 'habit') {
        if (missed.length && T.skipped) text += t(lang, ` ${missed.length} missed, ${T.skipped} skipped.`, ` ${missed.length} gemist, ${T.skipped} overgeslagen.`);
        else if (T.skipped && !partPast.length) text += count === 1 ? t(lang, ' It was marked as skipped.', ' Die was als overgeslagen gemarkeerd.') : count === 2 ? t(lang, ' Both were marked as skipped.', ' Beide waren als overgeslagen gemarkeerd.') : t(lang, ' All were marked as skipped.', ' Allemaal als overgeslagen gemarkeerd.');
      }
    }
    return done(text + openNote, {count, days: main});
  }
  if (q.ask === 'done' || q.ask === 'open' || (q.ask === 'total' && (!m || (!!track.events && q.shape === 'count'))) || (q.ask === 'status' && !m)) {
    const list = q.shape === 'dates' && T.done && T.done <= 16 ? `: ${dayList(T.dates.done, day, lang)}` : '';
    const total = m && m.kind === 'sum' && T.valued ? t(lang, ` ${m.text(T.total, 'en')} in total.`, ` ${m.text(T.total, 'nl')} in totaal.`) : '';
    const extra = q.ask === 'status' && track.kind === 'habit' && (T.missed || T.skipped) ? ` ${t(lang, `${T.missed} missed, ${T.skipped} skipped.`, `${T.missed} gemist, ${T.skipped} overgeslagen.`)}` : '';
    const text = !T.decided ? daySentence(track, points.at(-1)!, t(lang, 'today', 'vandaag'), lang)
      : track.events && q.shape !== 'dates' ? `${n}: ${track.events.word(track.events.count(p.days), lang)} ${t(lang, 'on', 'op')} ${days(T.done, lang)} ${span}.` + total
      : track.kind === 'event' ? t(lang, `${n}: ${did} on ${days(T.done, 'en')} ${span}${list}.`, `${n}: ${did} op ${days(T.done, 'nl')} ${span}${list}.`) + total + openNote
        : t(lang, `${n}: ${did} on ${T.done} of ${T.decided} due ${T.decided === 1 ? 'day' : 'days'} ${span}${list}.`, `${n}: ${did} op ${T.done} van ${T.decided} geplande ${T.decided === 1 ? 'dag' : 'dagen'} ${span}${list}.`) + total + extra + openNote;
    return done(text, {count: T.done, days: T.dates.done, ...(track.events ? {events: track.events.count(p.days)} : {}), ...(m && T.valued ? {total: T.total} : {}), rate: rate(T)});
  }
  if (!m) return null;
  if (!T.valued) return done(t(lang, `${n}: nothing logged ${span}.`, `${n}: niets gelogd ${span}.`), {total: null});
  const mean = T.total / T.valued;
  if (q.ask === 'average' || (q.ask === 'total' && m.kind === 'level') || (q.ask === 'status' && m.kind === 'level')) return done(t(lang, `${n}: ${m.text(mean, 'en')} a day on average ${span} (${days(T.valued, 'en')} logged).`, `${n}: gemiddeld ${m.text(mean, 'nl')} per dag ${span} (${days(T.valued, 'nl')} gelogd).`), {average: mean, logged: T.valued});
  if (q.ask === 'best' || q.ask === 'worst') {
    const hit = q.ask === 'best' ? T.best! : T.lowest!;
    return done(q.ask === 'best' ? t(lang, `${n}: your best day ${span} was ${day(hit.date)} (${m.text(hit.value!, 'en')}).`, `${n}: je beste dag ${span} was ${day(hit.date)} (${m.text(hit.value!, 'nl')}).`)
      : t(lang, `${n}: your lowest day ${span} was ${day(hit.date)} (${m.text(hit.value!, 'en')}), of ${days(T.valued, 'en')} logged.`, `${n}: je laagste dag ${span} was ${day(hit.date)} (${m.text(hit.value!, 'nl')}), van ${days(T.valued, 'nl')} gelogd.`), {day: hit.date, value: hit.value});
  }
  // total, status
  const target = m.target != null ? t(lang, `; target reached on ${T.done} of ${days(T.valued, 'en')} logged`, `; doel gehaald op ${T.done} van ${days(T.valued, 'nl')} gelogd`) : '';
  const perDay = T.valued > 1 ? t(lang, `, ${m.text(mean, 'en')} a day on ${days(T.valued, 'en')}`, `, ${m.text(mean, 'nl')} per dag op ${days(T.valued, 'nl')}`) : T.valued === 1 && p.days.length > 1 ? t(lang, `, all on ${day(T.best!.date)}`, `, alles op ${day(T.best!.date)}`) : '';
  return done(`${n}: ${m.text(T.total, lang)} ${span}${perDay}${target}.` + openNote, {total: T.total, average: mean, logged: T.valued});
}
/** Yesterday's day, for the tracks that need it. */
export const dayBefore = (day: string) => addLocalDays(day, -1);
