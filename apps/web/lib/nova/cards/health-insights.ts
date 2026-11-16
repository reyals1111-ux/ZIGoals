import {addLocalDays} from '../../local-date';
import type {MoodTags} from '../../mood-tags/schema';
import {GOES_WITH, TAG_MIN_DAYS, TAG_WINDOW_DAYS, goodDayTags} from '../../mood-tags/tags';
import type {Symptoms} from '../../symptoms/schema';
import {itemCounts} from '../../symptoms/symptoms';
import {formatNumber} from '../../visual-format';
import {finished} from '../../workouts/engine';
import type {Workouts} from '../../workouts/schema';
import {paceText, splitPace} from '../../workouts/splits';
import type {SplitsRecord} from '../../workouts/splits-schema';
import {logDayWords} from './weight';

/**
 * Session AM-2 (step 3, "NOVA connected"): the figures of three Health widgets NOVA makes on request, pure and read only:
 * "Run splits" (lib/workouts/splits.ts), "Mood tags" (lib/mood-tags/tags.ts) and "Symptoms" (lib/symptoms/symptoms.ts).
 *
 * Health rule (ADR-037 Q14, Q16; ADR-040 owner addition 1): these three read health-type records, so their widgets exist
 * only under the Health gate — NOVA's Health permission and the device's Health switch — and a request for one is kept
 * by the widget's name, never the person's words (lib/nova/summon/words.ts keptAskWords). The caller reads the records
 * only once that gate is open (lib/nova/stage/connect-extras.ts); these functions hold no gate of their own.
 *
 * Unknown is not zero: a day without an answer is unknown, never "none"; a tag with too few days is "not enough days
 * yet". The mood findings are counts and "goes with", never a cause. Nothing is written.
 */

/* ---- Run splits ---- */
export type SplitLine = {km: number; label: string; meters: number; seconds: number; /** Seconds per kilometre (a short last split scaled up). */ pace: number; paceText: string; /** Kilometres an hour, for the columns (taller is faster). */ speed: number; short: boolean};
export type RunLine = {id: string; name: string; date: string; dateText: string; paceText: string; splits: SplitLine[]; /** Metres covered by the splits (null: a run too long to keep them). */ meters: number | null; distanceText: string | null; fastest: SplitLine | null; slowest: SplitLine | null};
export type RunSplitsCard = {/** 'empty': no workout on this device has a pace from a GPX or TCX file. */ state: 'empty' | 'live'; run: RunLine | null; /** The runs before it, newest first. */ earlier: {id: string; name: string; dateText: string; paceText: string}[]; runs: number};
const kmText = (meters: number) => `${formatNumber(meters / 1000, {maximumFractionDigits: 2})} km`;
export function runSplitsCard(workouts: Workouts, splits: SplitsRecord, day: string): RunSplitsCard {
  const paced = finished(workouts).filter(w => w.date <= day && Object.hasOwn(splits.workouts, w.id)).sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt));
  const line = (w: typeof paced[number]): RunLine => {
    const s = splits.workouts[w.id]!, rows = s.splits.map((x): SplitLine => { const pace = splitPace(x); return {km: x.km, label: String(x.km), meters: x.meters, seconds: x.seconds, pace, paceText: paceText(pace), speed: 3600 / pace, short: x.meters < 1000}; });
    const whole = rows.filter(r => !r.short), meters = rows.length ? rows.reduce((n, r) => n + r.meters, 0) : null;
    const pick = (better: (a: number, b: number) => boolean) => whole.reduce<SplitLine | null>((best, r) => !best || better(r.pace, best.pace) ? r : best, null);
    return {id: w.id, name: w.name, date: w.date, dateText: logDayWords(w.date, day), paceText: paceText(s.paceSecondsPerKm), splits: rows, meters, distanceText: meters === null ? null : kmText(meters), fastest: whole.length > 1 ? pick((a, b) => a < b) : null, slowest: whole.length > 1 ? pick((a, b) => a > b) : null};
  };
  const all = paced.map(line);
  return {state: all.length ? 'live' : 'empty', run: all[0] ?? null, earlier: all.slice(1, 4).map(r => ({id: r.id, name: r.name, dateText: r.dateText, paceText: r.paceText})), runs: all.length};
}
export function runSplitsRows(card: RunSplitsCard): [string, string][] {
  const run = card.run;
  if (!run) return [['Run splits', 'No run with a pace yet']];
  return [
    [`${run.name}, ${run.dateText}`, `Average pace ${run.paceText}${run.distanceText ? ` over ${run.distanceText}` : ''}`],
    ...run.splits.map(s => [`Kilometre ${s.km}${s.short ? ` (${formatNumber(s.meters)} m)` : ''}`, s.paceText] as [string, string]),
    ...(run.fastest && run.slowest ? [['Fastest and slowest kilometre', `${run.fastest.paceText} (km ${run.fastest.km}) and ${run.slowest.paceText} (km ${run.slowest.km})`] as [string, string]] : []),
    ...card.earlier.map(r => [`${r.name}, ${r.dateText}`, `Average pace ${r.paceText}`] as [string, string]),
  ];
}

/* ---- Mood tags: what goes with your good days ---- */
export type MoodTagRow = {tag: string; days: number; good: number; /** Good or Great days among the tagged days (0–1). */ share: number; otherDays: number; otherGood: number; sentence: string};
export type MoodTagsCard = {/** 'empty': no tag on a day with a mood in the last 365 days. */ state: 'empty' | 'waiting' | 'live'; rows: MoodTagRow[]; pending: {tag: string; days: number; need: number}[]; tags: number; moodDays: number; windowDays: number; note: string};
export function moodTagsCard(moods: Readonly<Record<string, {mood: number}>>, tags: MoodTags, today: string): MoodTagsCard {
  const found = goodDayTags(moods, tags, today, 6);
  // Every tag on a day with a mood in the window is either a finding, pending, or one that did not go with good days more often.
  const start = addLocalDays(today, 1 - TAG_WINDOW_DAYS), used = new Set<string>();
  for (const [day, list] of Object.entries(tags.entries)) if (day >= start && day <= today && moods[day]?.mood !== undefined) for (const t of list) used.add(t.toLocaleLowerCase());
  return {
    state: !used.size ? 'empty' : found.ready.length ? 'live' : 'waiting',
    rows: found.ready.map(f => ({tag: f.tag, days: f.withDays, good: f.withGood, share: f.withGood / f.withDays, otherDays: f.otherDays, otherGood: f.otherGood, sentence: f.sentence})),
    pending: found.pending.slice(0, 6), tags: used.size, moodDays: found.moodDays, windowDays: TAG_WINDOW_DAYS, note: GOES_WITH,
  };
}
export function moodTagsRows(card: MoodTagsCard): [string, string][] {
  if (card.state === 'empty') return [['Mood tags', 'No tag on a day with a mood yet']];
  return [
    ...card.rows.map(r => [`Tag “${r.tag}”`, r.sentence] as [string, string]),
    ...card.pending.map(p => [`Tag “${p.tag}”`, `On ${p.days} ${p.days === 1 ? 'day' : 'days'} so far; a comparison needs ${p.need}`] as [string, string]),
    ['How to read this', `${card.note} Each needs at least ${TAG_MIN_DAYS} tagged days and ${TAG_MIN_DAYS} other days with a mood.`],
  ];
}

/* ---- Symptoms and factors ---- */
export type SymptomRow = {id: string; name: string; kind: 'symptom' | 'factor'; answered: number; noted: number; strong: number; /** Days it was there among the days answered (null: no answer in the window, unknown). */ share: number | null; words: string};
export type SymptomsCard = {/** 'empty': nothing is followed yet. */ state: 'empty' | 'live'; days: number; rows: SymptomRow[]; /** Days in the window with at least one answer, and the newest of them. */ answeredDays: number; lastDay: string | null; mostNoted: SymptomRow | null};
export function symptomsCard(record: Symptoms, today: string, days = 30): SymptomsCard {
  const kinds = new Map(record.items.map(i => [i.id, i.kind])), start = addLocalDays(today, 1 - days);
  const rows = itemCounts(record, today, days).map((c): SymptomRow => ({id: c.id, name: c.name, kind: kinds.get(c.id) ?? 'symptom', answered: c.answered, noted: c.noted, strong: c.strong, share: c.answered ? c.noted / c.answered : null,
    words: c.answered ? `there on ${c.noted} of ${c.answered} ${c.answered === 1 ? 'day' : 'days'} answered${c.strong ? `, strong on ${c.strong}` : ''}` : 'no answer in this range'}))
    .sort((a, b) => b.noted - a.noted || b.answered - a.answered || a.name.localeCompare(b.name));
  const answered = Object.keys(record.days).filter(d => d >= start && d <= today).sort();
  return {state: record.items.length ? 'live' : 'empty', days, rows, answeredDays: answered.length, lastDay: answered.at(-1) ?? null, mostNoted: rows.find(r => r.noted > 0) ?? null};
}
export function symptomsRows(card: SymptomsCard, shown = card.rows.length): [string, string][] {
  if (card.state === 'empty') return [['Symptoms and factors', 'Nothing followed yet']];
  return [
    [`Days answered in the last ${card.days}`, `${card.answeredDays}`],
    ...card.rows.slice(0, shown).map(r => [`${r.name} (${r.kind})`, r.words] as [string, string]),
    ...(card.rows.length > shown ? [['More', `${card.rows.length - shown} more on Health`] as [string, string]] : []),
    ['How to read this', 'A day without an answer is unknown, never counted as none.'],
  ];
}
