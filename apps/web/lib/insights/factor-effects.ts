import {habitDay, type HabitData} from '../habits';
import type {HealthData} from '../health';
import {dailySeries} from '../sleep/engine';
import {addLocalDays} from '../local-date';
import {healthGroupIn} from '../vault/w-homes';
import {sessionDay} from '../meditation/stats';
import {CROSS_MIN_PER_SIDE, CROSS_WINDOW_DAYS, confidenceOf, deviceTime, hoursMinutes, type CrossLabel} from './cross-pillar';
import {FORBIDDEN_INSIGHT_WORDS} from './engine';
import {scheduledOn} from '../supplements/log';

/**
 * Session AV (owner follow-up 1, F-FACTORS; Bearable's factor report): every factor the person keeps, each set against
 * their mood, their energy and that night's sleep, ranked — each habit done or not, each mood tag, each journal tag, a
 * workout, a meditation. The same honest rules as the pairings (lib/insights/cross-pillar.ts): the last 90 days, at
 * least 14 days on each side, a meaningful gap (0.4 of 5, 20 minutes), the probability of superiority at 0.60 or more,
 * "Early sign" or "Consistent". Only days where both are known count: a habit on its scheduled days, a mood tag on days
 * with a mood, a journal tag on days with an entry. The words say what went together, never why. Nothing is stored;
 * this is the person's own screen only (mood tags are Health-private: no ZIGi or NOVA path reads this).
 * Session AV (q3 #8; Bearable also counts symptoms, supplements and next-day effects): each symptom or rated factor (a
 * day rated above None against a day rated None), each supplement or medication (a day it was taken against a day it
 * was skipped, or planned and not taken on a day other doses were logged), and mood and energy the next day as well.
 */
export type Outcome = 'mood' | 'energy' | 'sleep';
export type FactorKind = 'habit' | 'mood-tag' | 'journal-tag' | 'workout' | 'meditation' | 'symptom' | 'supplement';
export type FactorEffect = {id: string; factor: string; kind: FactorKind; outcome: Outcome; /** 1: the outcome on the next day (mood and energy only). */ lag: 0 | 1; withA: {days: number; value: number}; withoutA: {days: number; value: number}; label: CrossLabel; ps: number; contrast: number; sentence: string};
export type FactorResult = {ready: FactorEffect[]; collecting: number; unclear: number; factors: number};
export type FactorInputs = {
  habits: HabitData; health: HealthData; today: string;
  energy?: {days: Readonly<Record<string, {energy: number}>>} | null;
  moodTags?: {entries: Readonly<Record<string, readonly string[]>>} | null;
  journal?: {entries: readonly {date: string; tags?: readonly string[]}[]} | null;
  workouts?: {workouts: readonly {startedAt: string}[]} | null;
  symptoms?: {items?: readonly {id: string; name: string; kind: string}[]; days?: Readonly<Record<string, Readonly<Record<string, number>>>>} | null;
  supplements?: {items?: readonly SupplementLike[]; log?: readonly {itemId: string; date: string; status: string}[]} | null;
  localTime?: (iso: string) => {date: string; hour: number};
};
type SupplementLike = Parameters<typeof scheduledOn>[0] & {id: string; name: string; kind?: string; createdAt: string; times?: readonly string[]};
const GAP: Record<Outcome, number> = {mood: 0.4, energy: 0.4, sleep: 20};
const OUTCOME_WORDS: Record<Outcome, string> = {mood: 'your mood that day', energy: 'your energy that day', sleep: 'your sleep that night'};
const NEXT_WORDS: Record<'mood' | 'energy', string> = {mood: 'your mood the next day', energy: 'your energy the next day'};
const mean = (v: readonly number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const value = (o: Outcome, v: number) => o === 'sleep' ? hoursMinutes(v) : `${v.toFixed(1)} of 5`;

export function factorEffects({habits, health, today, energy, moodTags, journal, workouts, symptoms, supplements, localTime = deviceTime}: FactorInputs, max = 12): FactorResult {
  const start = addLocalDays(today, 1 - CROSS_WINDOW_DAYS), mid = addLocalDays(start, CROSS_WINDOW_DAYS / 2), days: string[] = [];
  for (let d = start; d <= today; d = addLocalDays(d, 1)) days.push(d);
  const moods = (health as {moods?: {days: Record<string, {mood: number}>}}).moods?.days ?? {};
  const night = new Map((health.sleep ? dailySeries(health.sleep, addLocalDays(today, 1), CROSS_WINDOW_DAYS + 1) : []).filter(p => p.asleep !== null).map(p => [p.date, p.asleep!]));
  const outcomeOn: Record<Outcome, (d: string) => number | undefined> = {
    mood: d => moods[d]?.mood, energy: d => energy?.days[d]?.energy,
    sleep: d => addLocalDays(d, 1) > addLocalDays(today, 1) ? undefined : night.get(addLocalDays(d, 1)),
  };
  // Each factor: which days it is known on, and whether it was there.
  const factors: {id: string; name: string; kind: FactorKind; on: (d: string) => boolean | undefined}[] = [];
  for (const h of habits.habits) {
    factors.push({id: `habit:${h.id}`, name: h.title, kind: 'habit', on: d => { const s = habitDay(h, d, today).status; return s === 'complete' ? true : s === 'failed' || s === 'partial' ? false : undefined; }});
  }
  const moodTagDays = moodTags?.entries ?? {}, moodTagNames = new Map<string, string>();
  for (const tags of Object.values(moodTagDays)) for (const t of tags) if (!moodTagNames.has(t.toLowerCase())) moodTagNames.set(t.toLowerCase(), t);
  for (const [key, name] of moodTagNames) factors.push({id: `mood-tag:${key}`, name, kind: 'mood-tag', on: d => moods[d] === undefined ? undefined : (moodTagDays[d] ?? []).some(t => t.toLowerCase() === key)});
  const journalDays = new Map<string, Set<string>>();
  for (const e of journal?.entries ?? []) { const set = journalDays.get(e.date) ?? new Set<string>(); for (const t of e.tags ?? []) set.add(t.toLowerCase()); journalDays.set(e.date, set); }
  const journalNames = new Map<string, string>();
  for (const e of journal?.entries ?? []) for (const t of e.tags ?? []) if (!journalNames.has(t.toLowerCase())) journalNames.set(t.toLowerCase(), t);
  for (const [key, name] of journalNames) factors.push({id: `journal-tag:${key}`, name, kind: 'journal-tag', on: d => journalDays.has(d) ? journalDays.get(d)!.has(key) : undefined});
  const workoutDays = new Set((workouts?.workouts ?? []).map(w => localTime(w.startedAt).date));
  if (workoutDays.size) factors.push({id: 'workout', name: 'A workout', kind: 'workout', on: d => workoutDays.has(d)});
  const meditationDays = new Set((healthGroupIn(health, 'meditation')?.sessions ?? []).filter(s => s.seconds >= 60).map(s => sessionDay(s)));
  if (meditationDays.size) factors.push({id: 'meditation', name: 'Meditation', kind: 'meditation', on: d => meditationDays.has(d)});
  for (const item of symptoms?.items ?? []) factors.push({id: `symptom:${item.id}`, name: item.name, kind: 'symptom', on: d => { const level = symptoms!.days?.[d]?.[item.id]; return typeof level === 'number' ? level > 0 : undefined; }});
  const marks = new Map<string, Map<string, string>>(), tracked = new Set<string>();
  for (const m of supplements?.log ?? []) { tracked.add(m.date); const day = marks.get(m.itemId) ?? new Map<string, string>(); if (day.get(m.date) !== 'taken') day.set(m.date, m.status); marks.set(m.itemId, day); }
  for (const item of supplements?.items ?? []) {
    const mine = marks.get(item.id) ?? new Map<string, string>(), added = localTime(item.createdAt).date;
    if (!mine.size) continue;
    factors.push({id: `supplement:${item.id}`, name: item.name, kind: 'supplement', on: d => { const s = mine.get(d); return s === 'taken' ? true : s === 'skipped' ? false : tracked.has(d) && d >= added && (item.times?.length ?? 0) > 0 && scheduledOn(item, d) ? false : undefined; }});
  }

  const ready: FactorEffect[] = [];
  let collecting = 0, unclear = 0;
  const pairs = [['mood', 0], ['energy', 0], ['sleep', 0], ['mood', 1], ['energy', 1]] as const;
  for (const f of factors) for (const [outcome, lag] of pairs) {
    const sample = days.flatMap(d => { const at = lag ? addLocalDays(d, 1) : d; if (at > today) return []; const a = f.on(d), v = outcomeOn[outcome](at); return a === undefined || v === undefined ? [] : [{date: d, a, value: v}]; });
    if (!sample.length) continue;
    const withA = sample.filter(s => s.a), withoutA = sample.filter(s => !s.a);
    if (withA.length < CROSS_MIN_PER_SIDE || withoutA.length < CROSS_MIN_PER_SIDE) { collecting++; continue; }
    const {label, ps} = confidenceOf(sample, GAP[outcome], mid);
    if (!label) { unclear++; continue; }
    const a = {days: withA.length, value: mean(withA.map(s => s.value))}, b = {days: withoutA.length, value: mean(withoutA.map(s => s.value))};
    const when = f.kind === 'habit' ? `On days you did “${f.name}”` : f.kind === 'mood-tag' ? `On days you tagged your mood “${f.name}”` : f.kind === 'journal-tag' ? `On days your journal had #${f.name}` : f.kind === 'workout' ? 'On days with a workout' : f.kind === 'symptom' ? `On days you rated “${f.name}” above None` : f.kind === 'supplement' ? `On days you took “${f.name}”` : 'On days you meditated';
    const other = f.kind === 'habit' ? 'on scheduled days you did not' : f.kind === 'symptom' ? 'on days rated None' : f.kind === 'supplement' ? 'on days you did not' : 'on other days';
    const sentence = `${when}, ${lag ? NEXT_WORDS[outcome as 'mood' | 'energy'] : OUTCOME_WORDS[outcome]} averaged ${value(outcome, a.value)}; ${other}, ${value(outcome, b.value)}.`;
    const checked = sentence.split(f.name).join(' ');
    if (FORBIDDEN_INSIGHT_WORDS.some(w => new RegExp(`\\b${w}\\b`, 'i').test(checked))) throw Error(`A factor sentence used "${sentence}".`);
    ready.push({id: `${f.id}:${outcome}${lag ? ':next' : ''}`, factor: f.name, kind: f.kind, outcome, lag, withA: a, withoutA: b, label, ps, contrast: outcome === 'sleep' ? Math.abs(a.value - b.value) / 120 : Math.abs(a.value - b.value) / 4, sentence});
  }
  ready.sort((x, y) => (x.label === y.label ? 0 : x.label === 'consistent' ? -1 : 1) || y.contrast - x.contrast || x.id.localeCompare(y.id));
  return {ready: ready.slice(0, max), collecting, unclear, factors: factors.length};
}
