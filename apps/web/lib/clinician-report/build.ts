import {habitDay, habitRuleOn, type HabitData} from '../habits';
import type {HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {asleep, bedClock, clockFromMidnight, clockFromNoon, dailySeries, nightDay, wakeClock} from '../sleep/engine';
import {healthGroupIn} from '../vault/w-homes';
import {quadrantOfWord, QUADRANTS, type QuadrantId} from '../mood-words/words';
import {wordsOf} from '../mood-words/schema';

/**
 * Session AK (lane S, item 14; COMPETITORS.md (b) 14): "Report for a visit" — a printable summary of the person's own log
 * for a date range and the sections they choose, to take to a doctor or another health professional. It is built on this
 * device from records already here (nothing is fetched, uploaded or stored), rendered as a print page (inline SVG charts
 * and tables, HTML escaped by React) the person prints or saves as a PDF. Numbers are what the person logged or imported:
 * a missing day stays missing, never zero. There is no medication or symptom record in ZIGoals, so those sections do not
 * exist; the notes section holds the short notes the person wrote with a mood or a night.
 */
export const REPORT_SECTIONS = ['sleep', 'mood', 'notes', 'weight', 'habits'] as const;
export type ReportSectionId = typeof REPORT_SECTIONS[number];
export const SECTION_LABELS: Readonly<Record<ReportSectionId, string>> = {sleep: 'Sleep', mood: 'Mood and energy', notes: 'Notes with mood and sleep', weight: 'Weight', habits: 'Habits'};
export const MAX_RANGE_DAYS = 366, MAX_ROWS = 120, MAX_HABITS = 40;

export type ReportInput = {from: string; to: string; today: string; sections: readonly ReportSectionId[]; health: HealthData | null; habits: HabitData | null;
  energy: {days: Readonly<Record<string, {energy: number}>>; words?: Readonly<Record<string, unknown>>} | null};
export type Range = {from: string; to: string; days: number};
export type SleepRow = {date: string; bed: string; wake: string; asleep: number; estimated: boolean; quality: number | null; tags: string[]};
export type SleepSection = {nights: number; avgAsleep: number | null; avgBed: string | null; avgWake: string | null; avgQuality: number | null; estimated: boolean; goal: number | null; series: {date: string; asleep: number | null}[]; rows: SleepRow[]; more: number};
export type MoodSection = {moodDays: number; avgMood: number | null; energyDays: number; avgEnergy: number | null; series: {date: string; mood: number | null; energy: number | null}[]; words: {id: QuadrantId; title: string; count: number; examples: string[]}[]; wordDays: number};
export type NoteRow = {date: string; kind: 'mood' | 'sleep'; text: string};
export type NotesSection = {rows: NoteRow[]; more: number};
export type WeightSection = {rows: {date: string; grams: number}[]; first: number | null; last: number | null; change: number | null; more: number};
export type HabitRow = {title: string; scheduled: number; done: number; skipped: number; share: number | null};
export type HabitsSection = {rows: HabitRow[]; more: number};
export type Report = {range: Range; sleep?: SleepSection; mood?: MoodSection; notes?: NotesSection; weight?: WeightSection; habits?: HabitsSection};

const avg = (v: readonly number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
const round1 = (v: number | null) => v === null ? null : Math.round(v * 10) / 10;
const daysOf = (r: Range) => Array.from({length: r.days}, (_, i) => addLocalDays(r.from, i));
const inRange = (d: string, r: Range) => d >= r.from && d <= r.to;
/** The range the report uses: in order, never after today, at most 366 days (the newest are kept). */
export function reportRange(from: string, to: string, today: string): Range {
  let a = from <= to ? from : to, b = from <= to ? to : from;
  if (b > today) b = today;
  if (a > b) a = b;
  if (addLocalDays(a, MAX_RANGE_DAYS - 1) < b) a = addLocalDays(b, 1 - MAX_RANGE_DAYS);
  let days = 1; for (let d = a; d < b; d = addLocalDays(d, 1)) days++;
  return {from: a, to: b, days};
}
const moodDays = (h: HealthData | null) => h ? healthGroupIn(h, 'moods')?.days ?? {} : {};
const nights = (h: HealthData | null) => (h ? healthGroupIn(h, 'sleep')?.nights ?? [] : []).filter(n => n.end !== null);

/** Which sections have anything in the range, so the form can say "nothing logged" beside the empty ones. */
export function sectionHasData(input: Omit<ReportInput, 'sections'>, id: ReportSectionId): boolean {
  const r = reportRange(input.from, input.to, input.today);
  switch (id) {
    case 'sleep': return nights(input.health).some(n => n.kind === 'night' && inRange(nightDay(n) ?? '', r));
    case 'mood': return Object.keys(moodDays(input.health)).some(d => inRange(d, r)) || Object.keys(input.energy?.days ?? {}).some(d => inRange(d, r));
    case 'notes': return Object.entries(moodDays(input.health)).some(([d, m]) => inRange(d, r) && !!m.note) || nights(input.health).some(n => !!n.note && inRange(nightDay(n) ?? '', r));
    case 'weight': return (input.health?.weights ?? []).some(w => inRange(w.date, r));
    case 'habits': return (input.habits?.habits.length ?? 0) > 0;
  }
}

export function buildReport(input: ReportInput): Report {
  const range = reportRange(input.from, input.to, input.today), want = new Set(input.sections), out: Report = {range};
  if (want.has('sleep')) {
    const sleep = input.health ? healthGroupIn(input.health, 'sleep') : undefined;
    const series = sleep ? dailySeries(sleep, range.to, range.days) : daysOf(range).map(date => ({date, asleep: null, estimated: false, bed: null, wake: null, quality: null}));
    const logged = series.filter(p => p.asleep !== null), rated = logged.filter(p => p.quality !== null);
    const all = nights(input.health).filter(n => n.kind === 'night' && inRange(nightDay(n) ?? '', range)).sort((a, b) => a.end!.localeCompare(b.end!));
    const rows: SleepRow[] = all.map(n => { const a = asleep(n)!; return {date: nightDay(n)!, bed: clockFromNoon(bedClock(n)), wake: clockFromMidnight(wakeClock(n)!), asleep: a.minutes, estimated: a.estimated, quality: n.quality ?? null, tags: n.tags ?? []}; });
    const bed = avg(logged.map(p => p.bed!)), wake = avg(logged.map(p => p.wake!));
    out.sleep = {nights: logged.length, avgAsleep: logged.length ? Math.round(avg(logged.map(p => p.asleep!))!) : null, avgBed: bed === null ? null : clockFromNoon(Math.round(bed)), avgWake: wake === null ? null : clockFromMidnight(Math.round(wake)),
      avgQuality: round1(avg(rated.map(p => p.quality!))), estimated: logged.some(p => p.estimated), goal: sleep?.goal?.minutes ?? null,
      series: series.map(p => ({date: p.date, asleep: p.asleep})), rows: rows.slice(-MAX_ROWS), more: Math.max(0, rows.length - MAX_ROWS)};
  }
  if (want.has('mood')) {
    const moods = moodDays(input.health), energy = input.energy?.days ?? {}, words = wordsOf(input.energy);
    const series = daysOf(range).map(date => ({date, mood: moods[date]?.mood ?? null, energy: energy[date]?.energy ?? null}));
    const m = series.filter(p => p.mood !== null).map(p => p.mood!), e = series.filter(p => p.energy !== null).map(p => p.energy!);
    const picked = Object.entries(words).filter(([d]) => inRange(d, range)).map(([, w]) => w.word);
    const quads = QUADRANTS.map(q => { const hits = picked.filter(w => quadrantOfWord(w)?.id === q.id); return {id: q.id, title: q.title, count: hits.length, examples: [...new Set(hits)].slice(0, 5)}; });
    out.mood = {moodDays: m.length, avgMood: round1(avg(m)), energyDays: e.length, avgEnergy: round1(avg(e)), series, words: quads.filter(q => q.count > 0), wordDays: picked.length};
  }
  if (want.has('notes')) {
    const rows: NoteRow[] = [
      ...Object.entries(moodDays(input.health)).filter(([d, m]) => inRange(d, range) && m.note?.trim()).map(([date, m]) => ({date, kind: 'mood' as const, text: m.note!.trim()})),
      ...nights(input.health).filter(n => n.note?.trim() && inRange(nightDay(n) ?? '', range)).map(n => ({date: nightDay(n)!, kind: 'sleep' as const, text: n.note!.trim()})),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
    out.notes = {rows: rows.slice(-MAX_ROWS), more: Math.max(0, rows.length - MAX_ROWS)};
  }
  if (want.has('weight')) {
    const rows = (input.health?.weights ?? []).filter(w => inRange(w.date, range)).sort((a, b) => a.date.localeCompare(b.date)).map(w => ({date: w.date, grams: w.grams}));
    const first = rows[0]?.grams ?? null, last = rows.at(-1)?.grams ?? null;
    out.weight = {rows: rows.slice(-MAX_ROWS), first, last, change: first !== null && last !== null && rows.length > 1 ? last - first : null, more: Math.max(0, rows.length - MAX_ROWS)};
  }
  if (want.has('habits')) {
    const rows: HabitRow[] = [];
    for (const h of input.habits?.habits ?? []) {
      let scheduled = 0, done = 0, skipped = 0;
      for (const d of daysOf(range)) {
        if (d < h.startDate || !habitRuleOn(h, d)) continue;
        const day = habitDay(h, d, input.today);
        if (day.status === 'skipped' || day.status === 'planned-skip') { skipped++; continue; }
        if (day.scheduled && day.status !== 'due') scheduled++;
        if (day.status === 'complete') done++;
      }
      if (scheduled || done || skipped) rows.push({title: h.title, scheduled, done, skipped, share: scheduled ? Math.min(1, done / scheduled) : null});
    }
    rows.sort((a, b) => a.title.localeCompare(b.title));
    out.habits = {rows: rows.slice(0, MAX_HABITS), more: Math.max(0, rows.length - MAX_HABITS)};
  }
  return out;
}
