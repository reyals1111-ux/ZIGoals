import {healthAnswer, healthTrack, heartTrack, sleepTrack, stepsTrack, waterTrack, weightTrack} from '../../ai/local-answers/exact/health';
import {dayWords, periodWords} from '../../ai/local-answers/exact/period';
import {tally} from '../../ai/local-answers/exact/series';
import type {Track} from '../../ai/local-answers/exact/track';
import type {Ask, Domain, Query, Shape} from '../../ai/local-answers/exact/types';
import {addLocalDays} from '../../local-date';
import {formatNumber} from '../../visual-format';
import {widgetPeriod} from '../cards/ax/calendar';
import {compareRef} from '../cards/ax/health-compare';
import {nutritionGauges} from '../cards/ax/health-gauges';
import {moodMap, stepsHeat} from '../cards/ax/health-heat';
import {bodyScan, latestPoint} from '../cards/ax/health-scan';
import {fastingWindows, sleepStages, sleepTimes} from '../cards/ax/health-stages';
import {TREND_DEFAULT, weightRange} from '../cards/ax/health-trend';
import {RANGE_DAYS} from '../stage/record';
import {durationWords} from '../widgets/words';
import type {AxLine} from './ax-lines';
import type {LineData, LineLang} from './lines';

/**
 * Session AS (ADR-042 Part 2): the lines of Health's answer widgets, each from its widget's own selector
 * (lib/nova/cards/ax/health-*.ts) or said by the exact layer itself (lib/ai/local-answers/exact/health.ts), so the words
 * and the widget count one thing. One or two short sentences; a count instead of a list of days; unknown is said as
 * nothing logged, never as zero; no score and no judgement. `null`: the records were not read (the widget says why).
 */
const say = (lang: LineLang, en: string, nl: string) => lang === 'nl' ? nl : en;
const query = (domain: Domain, ask: Ask, shape: Shape, period: string | null, lang: LineLang): Query => ({domain, ask, shape, lang, period, weekday: null, subject: null, read: ''});
/** The exact layer's own sentence for a measure of Health (it also says "nothing logged yet" in its own words). */
const exact = (domain: Domain, ask: Ask, shape: Shape, fallback: string): AxLine => (params, d, lang) => {
  if (!d.health || (domain === 'workouts' && !d.workouts)) return null;
  return healthAnswer(query(domain, ask, shape, params?.period ?? fallback, lang), d.health, d.workouts, d.healthDay)?.text ?? null;
};
const NAME: Partial<Record<Domain, string>> = {water: 'Water', steps: 'Stappen', sleep: 'Slaap', protein: 'Eiwit', workouts: 'Workouts', meditation: 'Meditatie'};
const when = (date: string, day: string, lang: LineLang) => date === day ? say(lang, 'today', 'vandaag') : date === addLocalDays(day, -1) ? say(lang, 'yesterday', 'gisteren') : dayWords(date, day);
/** A calendar of one of Health's logs, as a count: the days that count, the days below a target and the days with nothing logged, said apart. */
const days = (domain: Domain): AxLine => (params, d, lang) => {
  if (!d.health || (domain === 'workouts' && !d.workouts)) return null;
  const day = d.healthDay, track = healthTrack(domain, d.health, d.workouts, day);
  if (!track) return null;
  // Nothing logged at all: the exact layer's own words for it.
  if (!latestPoint(track, day)) return healthAnswer(query(domain, 'status', 'overview', null, lang), d.health, d.workouts, day)?.text ?? null;
  const nl = lang === 'nl', period = widgetPeriod(params?.period, day), T = tally(track.points(period.days)), words = periodWords(period, lang, day), name = nl ? NAME[domain] ?? track.name : track.name;
  const did = track.did[nl ? 1 : 0], not = track.not[nl ? 1 : 0], on = say(lang, 'on', 'op'), of = say(lang, 'of', 'van'), dayWord = (n: number) => nl ? (n === 1 ? 'dag' : 'dagen') : (n === 1 ? 'day' : 'days');
  const open = T.open && track.kind === 'log' ? say(lang, ' Today is still open.', ' Vandaag staat nog open.') : '';
  if (track.kind !== 'log') return `${name}: ${did} ${on} ${T.done} ${of} ${T.decided} ${dayWord(T.decided)} ${words}.`;
  const below = T.dates.part.filter(x => x !== day).length;
  return `${name}: ${did} ${on} ${T.done} ${of} ${T.decided} ${dayWord(T.decided)} ${words}, ${not} ${on} ${below}${T.none ? say(lang, `, nothing logged on ${T.none}`, `, niets gelogd op ${T.none}`) : ''}.${open}`;
};
const sleepOf = (d: LineData) => d.health?.sleep ?? null;
const nights = (n: number, lang: LineLang) => `${formatNumber(n)} ${lang === 'nl' ? (n === 1 ? 'nacht' : 'nachten') : (n === 1 ? 'night' : 'nights')}`;
const MOOD_NL = ['Zwaar', 'Laag', 'Oké', 'Goed', 'Geweldig'] as const, MOOD_EN = ['Hard', 'Low', 'Okay', 'Good', 'Great'] as const;
const PLACE_NL: Readonly<Record<string, string>> = {chest: 'borst', arm: 'arm', waist: 'taille', hips: 'heupen', thigh: 'dij', weight: 'gewicht'};

export const AX_HEALTH_LINES: Readonly<Record<string, AxLine>> = {
  'water-days': days('water'), 'steps-days': days('steps'), 'sleep-nights': days('sleep'), 'workout-days': days('workouts'), 'meditation-days': days('meditation'), 'protein-days': days('protein'),
  // The scan: the same tracks as the widget's cards (and as "how is my health"), each value in a few words.
  'health-scan': (_params, d, lang) => {
    if (!d.health) return null;
    const h = d.health, day = d.healthDay, nl = lang === 'nl', today = say(lang, 'today', 'vandaag'), parts: string[] = [], missing: string[] = [];
    const one = (track: Track, todayOnly: boolean, label: [string, string], text: (value: string) => string, optional = false) => {
      const point = todayOnly ? track.points([day])[0]! : latestPoint(track, day);
      if (!point || point.value === null) { if (!optional) missing.push(label[nl ? 1 : 0]); return; }
      parts.push(text(track.measure!.text(point.value, lang)));
    };
    one(sleepTrack(h, day), false, ['sleep', 'slaap'], v => `${say(lang, 'sleep', 'slaap')} ${v}`);
    one(stepsTrack(h, day), true, ['steps today', 'stappen vandaag'], v => `${v} ${today}`);
    one(waterTrack(h, day), true, ['water today', 'water vandaag'], v => `water ${v} ${today}`);
    one(weightTrack(h, day), false, ['weight', 'gewicht'], v => `${say(lang, 'weight', 'gewicht')} ${v}`);
    one(heartTrack(h, day), false, ['resting heart rate', 'rusthartslag'], v => `${say(lang, 'resting heart rate', 'rusthartslag')} ${v}`, true);
    if (!parts.length) return say(lang, 'Nothing is recorded on Health for today yet.', 'Er is vandaag nog niets vastgelegd bij Health.');
    return say(lang, `On record: ${parts.join(', ')}.`, `Vastgelegd: ${parts.join(', ')}.`) + (missing.length ? say(lang, ` Nothing recorded for: ${missing.join(', ')}.`, ` Niets vastgelegd voor: ${missing.join(', ')}.`) : '');
  },
  'body-scan': (_params, d, lang) => {
    if (!d.health) return null;
    const view = bodyScan(d.health, d.healthDay), known = view.parts.filter(p => p.value !== null && p.date !== null);
    if (!known.length) return say(lang, 'No body measurements yet.', 'Nog geen lichaamsmetingen.');
    const shown = known.slice(0, 4).map(p => `${lang === 'nl' ? PLACE_NL[p.kind] ?? p.label.toLowerCase() : p.label.toLowerCase()} ${p.value} (${when(p.date!, d.healthDay, lang)})`), more = known.length - shown.length;
    return say(lang, `Latest measurements: ${shown.join(', ')}${more > 0 ? ` and ${more} more` : ''}.`, `Laatste metingen: ${shown.join(', ')}${more > 0 ? ` en nog ${more}` : ''}.`);
  },
  // The Weight card's own words, over the range the widget draws.
  'weight-trend': (params, d, lang) => d.health ? healthAnswer(query('weight', 'trend', 'overview', `last-${RANGE_DAYS[weightRange(params, d.healthDay)]}-days`, lang), d.health, d.workouts, d.healthDay)?.text ?? null : null,
  'sleep-trend': exact('sleep', 'average', 'amount', TREND_DEFAULT), 'steps-trend': exact('steps', 'average', 'amount', TREND_DEFAULT), 'heart-trend': exact('vitals', 'average', 'amount', TREND_DEFAULT),
  'calorie-trend': exact('calories', 'average', 'amount', TREND_DEFAULT), 'water-week': exact('water', 'total', 'amount', 'last-7-days'),
  'sleep-stages': (params, d, lang) => {
    if (!d.health) return null;
    const sleep = sleepOf(d);
    if (!sleep?.nights.length) return say(lang, 'No nights logged yet.', 'Nog geen nachten gelogd.');
    const v = sleepStages(sleep, params?.period, d.healthDay), words = periodWords(v.period, lang, d.healthDay), a = v.average;
    if (!v.logged) return say(lang, `No night logged ${words}.`, `Geen nacht gelogd ${words}.`);
    const parts = a ? [a.deep !== null ? `${say(lang, 'deep', 'diep')} ${durationWords(a.deep)}` : '', a.rem !== null ? `REM ${durationWords(a.rem)}` : '', a.core !== null ? `${say(lang, 'core', 'kern')} ${durationWords(a.core)}` : ''].filter(Boolean).join(', ') : '';
    return say(lang, `Sleep stages: recorded for ${v.staged} of ${nights(v.logged, 'en')} ${words}.`, `Slaapfasen: vastgelegd voor ${v.staged} van ${nights(v.logged, 'nl')} ${words}.`) + (parts ? say(lang, ` A night on average: ${parts}.`, ` Gemiddeld per nacht: ${parts}.`) : '');
  },
  'sleep-times': (params, d, lang) => {
    if (!d.health) return null;
    const sleep = sleepOf(d);
    if (!sleep?.nights.length) return say(lang, 'No nights logged yet.', 'Nog geen nachten gelogd.');
    const v = sleepTimes(sleep, params?.period, d.healthDay), words = periodWords(v.period, lang, d.healthDay);
    if (!v.logged || !v.bedText || !v.wakeText) return say(lang, `No night logged ${words}.`, `Geen nacht gelogd ${words}.`);
    return say(lang, `On average to bed at ${v.bedText} and up at ${v.wakeText} ${words}, over ${nights(v.logged, 'en')}.`, `Gemiddeld naar bed om ${v.bedText} en op om ${v.wakeText} ${words}, over ${nights(v.logged, 'nl')}.`);
  },
  'fasting-windows': (_params, d, lang, now) => {
    if (!d.fasting) return null;
    const v = fastingWindows(d.fasting, now, d.healthDay), run = v.card.running, last = v.card.history[0];
    if (v.card.state === 'empty') return say(lang, 'No fast logged yet.', 'Nog geen vastenperiode gelogd.');
    const running = run ? say(lang, `A fast is running: ${run.elapsed} of ${run.targetHours} h.`, `Er loopt een vastenperiode: ${run.elapsed} van ${run.targetHours} h.`) : say(lang, 'No fast is running.', 'Er loopt geen vastenperiode.');
    return last ? `${say(lang, `Last fast: ${last.hoursText} of a ${last.targetHours} h target, started ${last.dayText}.`, `Laatste vastenperiode: ${last.hoursText} van een doel van ${last.targetHours} h, begonnen op ${last.dayText}.`)} ${running}` : running;
  },
  'nutrition-gauges': (_params, d, lang) => {
    if (!d.health) return null;
    const v = nutritionGauges(d.health, d.healthDay), nl = lang === 'nl', label: Readonly<Record<string, string>> = nl ? {kcal: 'calorieën', protein: 'eiwit', carbs: 'koolhydraten', fat: 'vet'} : {kcal: 'calories', protein: 'protein', carbs: 'carbs', fat: 'fat'};
    if (!v.entries) return say(lang, 'No food logged today yet.', 'Vandaag nog geen eten gelogd.');
    const parts = v.gauges.filter(g => g.amount !== null).map((g, i) => `${i === 0 && g.key === 'kcal' ? '' : `${label[g.key]} `}${g.figure} ${g.unit}${g.targetText ? ` ${say(lang, 'of your', 'van je')} ${g.targetText}` : ''}`);
    return parts.length ? say(lang, `Today: ${parts.join(', ')}.`, `Vandaag: ${parts.join(', ')}.`) : say(lang, 'Today’s entries do not state their calories or macros.', 'De invoer van vandaag vermeldt geen calorieën of macro’s.');
  },
  'steps-heat': (_params, d, lang) => {
    if (!d.health) return null;
    const v = stepsHeat(d.health, d.healthDay);
    if (v.average === null) return v.any ? say(lang, 'No steps logged in the last 13 weeks.', 'Geen stappen gelogd in de afgelopen 13 weken.') : say(lang, 'No steps logged yet.', 'Nog geen stappen gelogd.');
    const avg = formatNumber(Math.round(v.average)), reached = v.target === null ? null : v.weeks.flat().filter(c => c.value !== null && c.value >= v.target!).length;
    return say(lang, `Steps: ${avg} a day on average over the last 13 weeks, on ${v.logged} of ${v.days} days logged.`, `Stappen: gemiddeld ${avg} per dag in de afgelopen 13 weken, op ${v.logged} van ${v.days} dagen gelogd.`)
      + (reached === null ? '' : say(lang, ` Your target of ${formatNumber(v.target!)} was reached on ${reached}.`, ` Je doel van ${formatNumber(v.target!)} is op ${reached} gehaald.`));
  },
  // One measure in a period beside the one before: the exact layer's own comparison.
  'health-compare': (params, d, lang) => {
    const ref = compareRef(params?.ref);
    if (!d.health || (ref === 'workouts' && !d.workouts)) return null;
    return healthAnswer(query(ref, 'compare', 'amount', params?.period ?? 'this-week', lang), d.health, d.workouts, d.healthDay)?.text ?? null;
  },
  // Moods are read here only once the Health gate is open (the stage's `gateOpen`, checked before any line is written); a mood's note is never read.
  'mood-map': (params, d, lang) => {
    if (!d.health) return null;
    const v = moodMap(d.health.moods?.days ?? {}, params?.period, d.healthDay), words = periodWords(v.period, lang, d.healthDay), nl = lang === 'nl';
    if (!v.any) return say(lang, 'No mood kept yet.', 'Nog geen stemming bewaard.');
    if (!v.logged) return say(lang, `No mood kept ${words}.`, `Geen stemming bewaard ${words}.`);
    const most = Math.max(...v.counts), top = v.counts.flatMap((n, i) => n === most ? [(nl ? MOOD_NL : MOOD_EN)[i]!] : []).join(say(lang, ' and ', ' en '));
    return say(lang, `A mood kept on ${v.logged} ${v.logged === 1 ? 'day' : 'days'} ${words}; most often ${top} (${most} ${most === 1 ? 'day' : 'days'}).`, `Een stemming bewaard op ${v.logged} ${v.logged === 1 ? 'dag' : 'dagen'} ${words}; meestal ${top} (${most} ${most === 1 ? 'dag' : 'dagen'}).`);
  },
};
