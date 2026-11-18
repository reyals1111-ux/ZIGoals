import {dailyHealthSummary, type HealthData} from '../../../health';
import {dailyData, waterOn} from '../../../health-daily';
import {weightReadingText} from '../../../health-units';
import {sessionDay} from '../../../meditation/stats';
import {emptyMeditation} from '../../../meditation/schema';
import {dailySeries} from '../../../sleep/engine';
import {emptySleep} from '../../../sleep/schema';
import {healthGroupIn} from '../../../vault/w-homes';
import {formatNumber} from '../../../visual-format';
import {durationMinutes, finished} from '../../../workouts/engine';
import type {Workouts} from '../../../workouts/schema';
import {stepsByDay} from '../../../nova/cards/steps';
import {weightCard} from '../../../nova/cards/weight';
import {durationWords, waterAmount} from '../../../nova/widgets/words';
import {daysBetween} from '../../tools/range';
import {dayWords, periodWords, resolvePeriod, type Period} from './period';
import type {DayPoint, DayState} from './series';
import {t} from './text';
import {periodFor, trackAnswer, type Track} from './track';
import type {Ask, Domain, Exact, ExactWidget, Lang, Query} from './types';

/**
 * Session AS (ADR-042, Part 1): Health, exactly — each measure as a track (track.ts) from Health's own records and the
 * person's own targets: water, steps, sleep, calories, protein, workouts, meditation, weight and resting heart rate. A day
 * with nothing logged is unknown ("nothing logged"), never zero. The whole environment holds no Health while the gate is
 * closed (lib/ai/tools/env.ts), so nothing here is reached then; mood and symptoms are not read here at all.
 */
const SOURCE = ['Your Health records', 'Je Health-gegevens'] as const;
const logged = (value: number | null, target: number | null, date: string, today: string): DayState => value === null ? (date === today ? 'open' : 'none') : target === null || value >= target ? 'done' : date === today ? 'open' : 'part';
const TARGET = {did: ['target reached', 'doel gehaald'], not: ['below your target', 'onder je doel']} as const, LOGGED = {did: ['logged', 'gelogd'], not: ['nothing logged', 'niets gelogd']} as const;
const widgetsOf = (domain: Domain, calendar: string, trend: string, fallback: string) => (ask: Ask, period: Period): ExactWidget[] => {
  if (ask === 'missed' || ask === 'not-done' || ask === 'skipped' || ((ask === 'done') && period.days.length > 1)) return [{id: calendar, period: period.token, fallback}];
  if (ask === 'compare') return [{id: 'health-compare', ref: domain, period: period.token, fallback}];
  if (ask === 'streak') return [{id: 'streak-flames', ref: domain, fallback}];
  return period.days.length > 1 || ask === 'trend' || ask === 'average' || ask === 'best' || ask === 'worst' ? [{id: trend, period: period.token, fallback}] : [{id: fallback}];
};
const minutes = (value: number, lang: Lang) => `${formatNumber(Math.round(value))} ${lang === 'nl' ? (Math.round(value) === 1 ? 'minuut' : 'minuten') : (Math.round(value) === 1 ? 'minute' : 'minutes')}`;

export function waterTrack(health: HealthData, today: string): Track {
  const unit = dailyData(health).preferences.waterUnit, target = waterOn(health, today).targetMl ?? null;
  return {key: 'water', domain: 'water', name: 'Water', kind: target === null ? 'event' : 'log', ...(target === null ? LOGGED : TARGET), source: SOURCE,
    points: days => days.map(date => { const w = waterOn(health, date), value = w.entries ? w.millilitres : null; return {date, value, state: logged(value, w.targetMl ?? null, date, today)}; }),
    measure: {text: v => waterAmount(Math.round(v), unit), kind: 'sum', target}, widgets: widgetsOf('water', 'water-days', 'water-week', 'water')};
}
export function stepsTrack(health: HealthData, today: string): Track {
  const by = stepsByDay(health), target = health.targets.steps ?? null;
  return {key: 'steps', domain: 'steps', name: 'Steps', kind: target === null ? 'event' : 'log', ...(target === null ? LOGGED : TARGET), source: SOURCE,
    points: days => days.map(date => { const value = by.get(date) ?? null; return {date, value, state: logged(value, target, date, today)}; }),
    measure: {text: (v, lang) => `${formatNumber(Math.round(v))} ${lang === 'nl' ? 'stappen' : 'steps'}`, kind: 'sum', target}, widgets: widgetsOf('steps', 'steps-days', 'steps-trend', 'steps')};
}
export function sleepTrack(health: HealthData, today: string): Track {
  const sleep = healthGroupIn(health, 'sleep') ?? emptySleep(), goal = sleep.goal?.minutes ?? null;
  return {key: 'sleep', domain: 'sleep', name: 'Sleep', kind: goal === null ? 'event' : 'log', did: goal === null ? LOGGED.did : ['sleep goal reached', 'slaapdoel gehaald'], not: goal === null ? ['no night logged', 'geen nacht gelogd'] : ['under your sleep goal', 'onder je slaapdoel'], source: SOURCE,
    points: days => {
      if (!days.length) return [];
      const last = days.at(-1)!, series = dailySeries(sleep, last, daysBetween(days[0]!, last) + 1), by = new Map(series.map(p => [p.date, p.asleep]));
      // A night belongs to the day it ends on, so today's night is over: under the goal is under the goal, not "open".
      return days.map(date => { const value = by.get(date) ?? null; return {date, value, state: value === null ? (date === today ? 'open' : 'none') : goal === null || value >= goal ? 'done' : 'part'}; });
    },
    measure: {text: v => durationWords(Math.round(v)), kind: 'level', target: goal}, widgets: widgetsOf('sleep', 'sleep-nights', 'sleep-trend', 'sleep'), todayWords: ['last night', 'afgelopen nacht']};
}
function nutrientTrack(health: HealthData, today: string, key: 'kcal' | 'proteinMg'): Track {
  const kcal = key === 'kcal', target = kcal ? null : health.targets.proteinMg ?? null, scale = kcal ? 1 : 1000;
  return {key: kcal ? 'calories' : 'protein', domain: kcal ? 'calories' : 'protein', name: kcal ? 'Calories' : 'Protein', kind: target === null ? 'event' : 'log', ...(target === null ? LOGGED : TARGET), source: SOURCE,
    points: days => days.map(date => { const s = dailyHealthSummary(health, date), raw = s.entries ? s.knownNutrients[key] : null, value = raw === null ? null : raw / scale; return {date, value, state: logged(value, target === null ? null : target / scale, date, today)}; }),
    measure: {text: v => `${formatNumber(Math.round(v))} ${kcal ? 'kcal' : 'g'}`, kind: 'sum', target: target === null ? null : target / scale}, widgets: widgetsOf(kcal ? 'calories' : 'protein', 'food-days', 'nutrition-gauges', 'health-hud')};
}
export const caloriesTrack = (health: HealthData, today: string) => nutrientTrack(health, today, 'kcal');
export const proteinTrack = (health: HealthData, today: string) => nutrientTrack(health, today, 'proteinMg');
export function workoutsTrack(workouts: Workouts | null | undefined, today: string): Track {
  const by = new Map<string, number>(), each = new Map<string, number>();
  for (const w of workouts ? finished(workouts) : []) { by.set(w.date, (by.get(w.date) ?? 0) + durationMinutes(w)); each.set(w.date, (each.get(w.date) ?? 0) + 1); }
  return {key: 'workouts', events: {count: days => days.reduce((n, d) => n + (each.get(d) ?? 0), 0), word: (n, lang) => `${n} ${n === 1 ? 'workout' : 'workouts'}${lang === 'nl' ? '' : ''}`}, domain: 'workouts', name: 'Workouts', kind: 'event', did: ['a workout logged', 'een workout gelogd'], not: ['no workout', 'geen workout'], source: ['Your workout log', 'Je workoutlog'],
    points: days => days.map(date => { const value = by.get(date) ?? null; return {date, value, state: value === null ? (date === today ? 'open' : 'none') : 'done'}; }),
    measure: {text: minutes, kind: 'sum', target: null}, widgets: widgetsOf('workouts', 'workout-days', 'workout-days', 'workouts')};
}
export function meditationTrack(health: HealthData, today: string): Track {
  const m = healthGroupIn(health, 'meditation') ?? emptyMeditation(), by = new Map<string, number>();
  const each = new Map<string, number>();
  for (const s of m.sessions) { const d = sessionDay(s); by.set(d, (by.get(d) ?? 0) + s.seconds / 60); each.set(d, (each.get(d) ?? 0) + 1); }
  return {key: 'meditation', events: {count: days => days.reduce((n, d) => n + (each.get(d) ?? 0), 0), word: (n, lang) => `${n} ${lang === 'nl' ? (n === 1 ? 'sessie' : 'sessies') : (n === 1 ? 'session' : 'sessions')}`}, domain: 'meditation', name: 'Meditation', kind: 'event', did: ['a session logged', 'een sessie gelogd'], not: ['no session', 'geen sessie'], source: SOURCE,
    points: days => days.map(date => { const value = by.get(date) ?? null; return {date, value, state: value === null ? (date === today ? 'open' : 'none') : 'done'}; }),
    measure: {text: minutes, kind: 'sum', target: null}, widgets: widgetsOf('meditation', 'meditation-days', 'meditation', 'meditation')};
}
export function weightTrack(health: HealthData, today: string): Track {
  const unit = dailyData(health).preferences.weightUnit, by = new Map(health.weights.map(w => [w.date, w.grams]));
  return {key: 'weight', domain: 'weight', name: 'Weight', kind: 'event', did: ['weighed in', 'gewogen'], not: ['no weigh-in', 'geen weging'], source: SOURCE,
    points: days => days.map(date => { const value = by.get(date) ?? null; return {date, value, state: value === null ? (date === today ? 'open' : 'none') : 'done'}; }),
    measure: {text: v => weightReadingText(Math.round(v), unit), kind: 'level', target: null}, widgets: widgetsOf('weight', 'weight-trend', 'weight-trend', 'weight')};
}
export function heartTrack(health: HealthData, today: string): Track {
  const by = new Map<string, number>();
  for (const d of healthGroupIn(health, 'vitals')?.days ?? []) if (typeof d.restingHr === 'number') by.set(d.date, d.restingHr);
  return {key: 'vitals', domain: 'vitals', name: 'Resting heart rate', kind: 'event', did: ['recorded', 'vastgelegd'], not: ['nothing recorded', 'niets vastgelegd'], source: SOURCE,
    points: days => days.map(date => { const value = by.get(date) ?? null; return {date, value, state: value === null ? (date === today ? 'open' : 'none') : 'done'}; }),
    measure: {text: v => `${formatNumber(Math.round(v))} bpm`, kind: 'level', target: null}, widgets: widgetsOf('vitals', 'heart-trend', 'heart-trend', 'health-trends')};
}
/** The newest day with a value on or before today, looking back a year. */
function latest(track: Track, today: string): DayPoint | null {
  const back = track.points(resolvePeriod('last-366-days', today)!.days);
  for (let i = back.length - 1; i >= 0; i--) if (back[i]!.value !== null) return back[i]!;
  return null;
}
const NL_NAME: Partial<Record<Domain, string>> = {water: 'Water', steps: 'Stappen', sleep: 'Slaap', calories: 'Calorieën', protein: 'Eiwit', workouts: 'Workouts', meditation: 'Meditatie', weight: 'Gewicht', vitals: 'Rusthartslag'};
const EMPTY: Partial<Record<Domain, [string, string]>> = {
  water: ['No water logged yet.', 'Nog geen water gelogd.'], steps: ['No steps logged yet.', 'Nog geen stappen gelogd.'], sleep: ['No nights logged yet.', 'Nog geen nachten gelogd.'], calories: ['No food logged yet.', 'Nog geen eten gelogd.'], protein: ['No food logged yet.', 'Nog geen eten gelogd.'],
  workouts: ['No workouts logged yet.', 'Nog geen workouts gelogd.'], meditation: ['No meditation logged yet.', 'Nog geen meditatie gelogd.'], weight: ['No weight logged yet.', 'Nog geen gewicht gelogd.'], vitals: ['No heart rate is recorded yet.', 'Er is nog geen hartslag vastgelegd.'],
};
export function healthTrack(domain: Domain, health: HealthData, workouts: Workouts | null | undefined, today: string): Track | null {
  switch (domain) {
    case 'water': return waterTrack(health, today); case 'steps': return stepsTrack(health, today); case 'sleep': return sleepTrack(health, today);
    case 'calories': return caloriesTrack(health, today); case 'protein': return proteinTrack(health, today); case 'workouts': return workoutsTrack(workouts, today);
    case 'meditation': return meditationTrack(health, today); case 'weight': return weightTrack(health, today); case 'vitals': return heartTrack(health, today);
    default: return null;
  }
}
export function healthAnswer(q: Query, health: HealthData, workouts: Workouts | null | undefined, today: string): Exact | null {
  const lang = q.lang;
  if (q.domain === 'health') return healthScan(q, health, workouts, today);
  const made = healthTrack(q.domain, health, workouts, today);
  if (!made) return null;
  const track = lang === 'nl' ? {...made, name: NL_NAME[q.domain] ?? made.name} : made;
  const newest = latest(track, today), out = (text: string, facts: Record<string, unknown>, widgets: ExactWidget[]): Exact => ({kind: 'answer', text, facts: {about: q.domain, ask: q.ask, ...facts}, widgets, query: q, source: track.source[lang === 'nl' ? 1 : 0]});
  if (!newest) return out(EMPTY[q.domain]![lang === 'nl' ? 1 : 0], {logged: 0}, track.widgets('status', resolvePeriod('today', today)!, q));
  // Weight: "what is my weight", "am I losing weight" — the newest reading and the change over the period, in the Weight card's own words.
  if (q.domain === 'weight' && (q.ask === 'status' || q.ask === 'total' || q.ask === 'trend' || q.ask === 'done' || q.ask === 'open') && q.shape !== 'dates' && q.shape !== 'count') {
    const p = periodFor({...q, ask: 'trend'}, today), range = p.days.length <= 8 ? 'week' : p.days.length <= 45 ? 'month' : p.days.length <= 120 ? 'quarter' : 'year', card = weightCard(health, today, range);
    const when = newest.date === today ? t(lang, 'today', 'vandaag') : dayWords(newest.date, today);
    const change = card.change ? (lang === 'nl' ? (card.change.direction === 'flat' ? `geen verandering sinds ${card.change.since}` : `${weightReadingText(Math.abs(card.change.grams), card.unit)} ${card.change.direction === 'down' ? 'lager' : 'hoger'} dan op ${card.change.since}`) : card.change.text) : null;
    return out(`${track.name}: ${card.latest!.text} (${when})${change ? `, ${change}` : t(lang, `; one weigh-in in ${card.window.words}, so no change to state yet`, '; één weging in deze periode, dus nog geen verandering')}${card.target ? t(lang, `. Your goal is ${card.target.text}`, `. Je doel is ${card.target.text}`) : ''}.`,
      {latest: {day: newest.date, grams: newest.value}, change: card.change ? {grams: card.change.grams, direction: card.change.direction} : null, target: card.target?.grams ?? null, readings: card.readings.length}, [{id: 'weight-trend', range, fallback: 'weight'}]);
  }
  // Resting heart rate: a level, so "what is my heart rate" is the newest recorded value with its day (never a live reading).
  if (q.domain === 'vitals' && (q.ask === 'status' || q.ask === 'total' || q.ask === 'done' || q.ask === 'open') && (!q.period || q.period === 'today')) {
    const when = newest.date === today ? t(lang, 'today', 'vandaag') : dayWords(newest.date, today);
    return out(t(lang, `Resting heart rate: ${track.measure!.text(newest.value!, 'en')}, recorded ${when}. This is the latest record, not a live reading.`, `Rusthartslag: ${track.measure!.text(newest.value!, 'nl')}, vastgelegd ${when}. Dit is de laatste registratie, geen live meting.`), {latest: {day: newest.date, bpm: newest.value}}, [{id: 'heart-trend', fallback: 'health-trends'}]);
  }
  // "How did I sleep" with no day: last night; a status over a period reads as its average.
  const ask: Ask = q.ask === 'status' && q.period && q.period !== 'today' && q.period !== 'yesterday' ? (track.measure?.kind === 'level' ? 'average' : 'total') : q.ask === 'status' || q.ask === 'done' && q.shape === 'amount' ? 'total' : q.ask;
  return trackAnswer({...q, ask}, track, today);
}
/**
 * "How is my health": what the records hold right now, measure by measure, each with its own day (addition A3: facts and
 * the person's own targets, never a score or a judgement). A measure with nothing recorded is left out and counted.
 */
export function healthScan(q: Query, health: HealthData, workouts: Workouts | null | undefined, today: string): Exact {
  const lang = q.lang, parts: string[] = [], facts: Record<string, unknown> = {}, missing: string[] = [];
  const when = (date: string) => date === today ? '' : ` (${dayWords(date, today)})`;
  const one = (track: Track, label: [string, string], todayOnly: boolean) => {
    const point = todayOnly ? track.points([today])[0]! : latest(track, today), m = track.measure!;
    if (!point || point.value === null) { missing.push(label[lang === 'nl' ? 1 : 0]); facts[track.key] = null; return; }
    facts[track.key] = {day: point.date, value: point.value, target: m.target};
    // "8,800 of 8,000 steps": the unit is said once.
    const value = m.text(point.value, lang), goal = m.target !== null ? m.text(m.target, lang) : null, unit = goal ? goal.slice(goal.lastIndexOf(' ')) : '';
    parts.push(`${label[lang === 'nl' ? 1 : 0]} ${goal && unit.trim() && value.endsWith(unit) ? value.slice(0, -unit.length) : value}${goal ? ` ${t(lang, 'of', 'van')} ${goal}` : ''}${todayOnly ? '' : when(point.date)}`);
  };
  one(sleepTrack(health, today), ['sleep', 'slaap'], false);
  one(stepsTrack(health, today), ['steps today', 'stappen vandaag'], true);
  one(waterTrack(health, today), ['water today', 'water vandaag'], true);
  one(weightTrack(health, today), ['weight', 'gewicht'], false);
  one(heartTrack(health, today), ['resting heart rate', 'rusthartslag'], false);
  const week = resolvePeriod('this-week', today)!, done = workoutsTrack(workouts, today).points(week.days).filter(p => p.state === 'done').length;
  facts.workoutsThisWeek = done;
  if (done) parts.push(t(lang, `${done} ${done === 1 ? 'workout' : 'workouts'} ${periodWords(week, 'en', today)}`, `${done} ${done === 1 ? 'workout' : 'workouts'} ${periodWords(week, 'nl', today)}`));
  const text = parts.length ? t(lang, `Your health, from what is recorded: ${parts.join('; ')}.`, `Je gezondheid, uit wat er is vastgelegd: ${parts.join('; ')}.`) + (missing.length ? t(lang, ` Nothing recorded for: ${missing.join(', ')}.`, ` Niets vastgelegd voor: ${missing.join(', ')}.`) : '')
    : t(lang, 'Nothing is recorded on Health yet.', 'Er is nog niets vastgelegd bij Health.');
  return {kind: 'answer', text, facts: {about: 'health', ask: q.ask, ...facts}, widgets: [{id: 'health-scan', fallback: 'health-hud'}], query: q, source: SOURCE[lang === 'nl' ? 1 : 0]};
}
