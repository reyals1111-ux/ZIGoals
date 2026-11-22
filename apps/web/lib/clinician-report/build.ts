import {habitDay, habitRuleOn, type HabitData} from '../habits';
import {scaleNutrition, type HealthData} from '../health';
import {addLocalDays, localDate} from '../local-date';
import {asleep, bedClock, clockFromMidnight, clockFromNoon, dailySeries, nightDay, wakeClock} from '../sleep/engine';
import {healthGroupIn} from '../vault/w-homes';
import {quadrantOfWord, QUADRANTS, type QuadrantId} from '../mood-words/words';
import {wordsOf} from '../mood-words/schema';
// Session AK (BUILD list 2 #4, lane G1a): "Your numbers" (blood pressure and lab values) as a report section.
import {VERDICT_WORDS, rangeText, verdictOf} from '../health-numbers/engine';
import type {HealthNumbers} from '../health-numbers/store';
// Session AV (owner follow-up 1, F-REPORT-MORE; Bearable's visit report): symptoms and factors, supplements and medication.
import {SEVERITY_WORDS, type Symptoms} from '../symptoms/schema';
import type {Supplements} from '../supplements/schema';
import {scheduledOn} from '../supplements/log';

/**
 * Session AK (lane S, item 14; COMPETITORS.md (b) 14): "Report for a visit" — a printable summary of the person's own log
 * for a date range and the sections they choose, to take to a doctor or another health professional. It is built on this
 * device from records already here (nothing is fetched, uploaded or stored), rendered as a print page (inline SVG charts
 * and tables, HTML escaped by React) the person prints or saves as a PDF. Numbers are what the person logged or imported:
 * a missing day stays missing, never zero. The notes section holds the short notes the person wrote with a mood or a night.
 * Session AV (owner follow-up 1, F-REPORT-MORE): the symptoms and factors the person rates each day, and the supplements
 * and medication they log, are sections too — as they recorded them, with nothing interpreted.
 */
export const REPORT_SECTIONS = ['sleep', 'mood', 'notes', 'weight', 'habits', 'numbers', 'symptoms', 'supplements', 'nutrition'] as const;
export type ReportSectionId = typeof REPORT_SECTIONS[number];
export const SECTION_LABELS: Readonly<Record<ReportSectionId, string>> = {sleep: 'Sleep', mood: 'Mood and energy', notes: 'Notes with mood and sleep', weight: 'Weight', habits: 'Habits', numbers: 'Your numbers (blood pressure and lab values)', symptoms: 'Symptoms and factors', supplements: 'Supplements and medication', nutrition: 'Nutrition (from the food diary)'};
export const MAX_RANGE_DAYS = 366, MAX_ROWS = 120, MAX_HABITS = 40;

export type ReportInput = {from: string; to: string; today: string; sections: readonly ReportSectionId[]; health: HealthData | null; habits: HabitData | null;
  energy: {days: Readonly<Record<string, {energy: number}>>; words?: Readonly<Record<string, unknown>>} | null;
  /** Session AK (#4): `zigoals:health-numbers:v1`; optional, so a caller without it builds as before. */
  numbers?: HealthNumbers | null;
  /** Session AV (F-REPORT-MORE): `zigoals:symptoms:v1` and `zigoals:supplements:v1`; optional, as `numbers`. */
  symptoms?: Symptoms | null; supplements?: Supplements | null};
export type Range = {from: string; to: string; days: number};
/** The local calendar day of an ISO instant; a value that does not parse keeps its own first ten characters. */
const addedDay = (iso: string) => { const t = new Date(iso); return Number.isFinite(t.getTime()) ? localDate(t) : iso.slice(0, 10); };
export type SleepRow = {date: string; bed: string; wake: string; asleep: number; estimated: boolean; quality: number | null; tags: string[]};
export type SleepSection = {nights: number; avgAsleep: number | null; avgBed: string | null; avgWake: string | null; avgQuality: number | null; estimated: boolean; goal: number | null; series: {date: string; asleep: number | null}[]; rows: SleepRow[]; more: number};
export type MoodSection = {moodDays: number; avgMood: number | null; energyDays: number; avgEnergy: number | null; series: {date: string; mood: number | null; energy: number | null}[]; words: {id: QuadrantId; title: string; count: number; examples: string[]}[]; wordDays: number};
export type NoteRow = {date: string; kind: 'mood' | 'sleep'; text: string};
export type NotesSection = {rows: NoteRow[]; more: number};
export type WeightSection = {rows: {date: string; grams: number}[]; first: number | null; last: number | null; change: number | null; more: number};
export type HabitRow = {title: string; scheduled: number; done: number; skipped: number; share: number | null};
export type HabitsSection = {rows: HabitRow[]; more: number};
/** Session AK (#4): readings as the person typed them; a lab value's range is the one they copied, the verdict only against it. */
export type BpRow = {date: string; systolic: number; diastolic: number; pulse: number | null; note: string | null};
export type LabRow = {date: string; name: string; value: number; unit: string; range: string | null; verdict: string | null};
export type NumbersSection = {bp: BpRow[]; bpMore: number; labs: LabRow[]; labsMore: number};
/** Session AV (F-REPORT-MORE): per symptom or factor, the days rated in the range, the days above None, the strong days and the average level. */
export type SymptomRow = {name: string; kind: 'symptom' | 'factor'; rated: number; noted: number; strong: number; average: number | null; averageWord: string | null};
export type SymptomsSection = {rows: SymptomRow[]};
/** Session AV (F-REPORT-MORE): per supplement or medication, the planned doses in the range and what was logged of them. */
export type SupplementRow = {name: string; dose: string | null; kind: 'supplement' | 'medication'; planned: number | null; taken: number; skipped: number; notLogged: number | null};
export type SupplementsSection = {rows: SupplementRow[]};
/**
 * Session AV lane 2 (food, LEDGER #98; Cronometer's reports): what the food diary holds for the range — the days with food
 * logged and, per nutrient, the average a day over the days that carry a value (a day without one is left out, never
 * counted as 0), as the nutrient report counts them.
 */
export type NutritionRow = {name: string; unit: string; average: number | null; days: number};
export type NutritionSection = {loggedDays: number; rows: NutritionRow[]};
const NUTRITION_ROWS = [['kcal', 'Calories', 'kcal', 1], ['proteinMg', 'Protein', 'g', 1000], ['carbsMg', 'Carbohydrates', 'g', 1000], ['fatMg', 'Fat', 'g', 1000], ['fiberMg', 'Fiber', 'g', 1000], ['sugarMg', 'Sugars', 'g', 1000], ['saturatedFatMg', 'Saturated fat', 'g', 1000], ['sodiumMg', 'Sodium', 'mg', 1], ['potassiumMg', 'Potassium', 'mg', 1], ['calciumMg', 'Calcium', 'mg', 1], ['ironMg', 'Iron', 'mg', 1]] as const;
export type Report = {range: Range; sleep?: SleepSection; mood?: MoodSection; notes?: NotesSection; weight?: WeightSection; habits?: HabitsSection; numbers?: NumbersSection; symptoms?: SymptomsSection; nutrition?: NutritionSection; supplements?: SupplementsSection};

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
    case 'numbers': return (input.numbers?.entries ?? []).some(e => inRange(e.date, r));
    case 'symptoms': return Object.entries(input.symptoms?.days ?? {}).some(([d, v]) => inRange(d, r) && Object.keys(v).length > 0);
    case 'supplements': return (input.supplements?.items ?? []).length > 0;
    case 'nutrition': return (input.health?.diary ?? []).some(e => inRange(e.date, r));
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
  if (want.has('numbers')) {
    const inside = (input.numbers?.entries ?? []).filter(e => inRange(e.date, range)).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const bp: BpRow[] = inside.filter(e => e.kind === 'bp' && e.systolic !== undefined && e.diastolic !== undefined).map(e => ({date: e.date, systolic: e.systolic!, diastolic: e.diastolic!, pulse: e.pulse ?? null, note: e.note ?? null}));
    const labs: LabRow[] = inside.filter(e => e.kind === 'lab' && e.name && e.value !== undefined).map(e => { const v = verdictOf(e); return {date: e.date, name: e.name!, value: e.value!, unit: e.unit ?? '', range: rangeText(e), verdict: v ? VERDICT_WORDS[v] : null}; });
    out.numbers = {bp: bp.slice(-MAX_ROWS), bpMore: Math.max(0, bp.length - MAX_ROWS), labs: labs.slice(-MAX_ROWS), labsMore: Math.max(0, labs.length - MAX_ROWS)};
  }
  if (want.has('symptoms')) {
    const days = Object.entries(input.symptoms?.days ?? {}).filter(([d]) => inRange(d, range));
    out.symptoms = {rows: (input.symptoms?.items ?? []).map(item => {
      const levels = days.map(([, v]) => v[item.id]).filter((n): n is number => typeof n === 'number'), a = avg(levels), r1 = round1(a);
      return {name: item.name, kind: item.kind, rated: levels.length, noted: levels.filter(n => n > 0).length, strong: levels.filter(n => n === 3).length, average: r1, averageWord: a === null ? null : SEVERITY_WORDS[Math.round(a)] ?? null};
    }).filter(r => r.rated > 0)};
  }
  if (want.has('supplements')) {
    const marks = (input.supplements?.log ?? []).filter(m => inRange(m.date, range));
    out.supplements = {rows: (input.supplements?.items ?? []).map(item => {
      // A time of day is a planned dose on each chosen weekday from the day it was added; no time is "as needed".
      // Session AV (q3 #48): the day it was added is the device's local date of `createdAt`, not its UTC date.
      const added = addedDay(item.createdAt);
      const planned = item.times?.length ? daysOf(range).filter(d => d >= added && scheduledOn(item, d)).length * item.times.length : null;
      const mine = marks.filter(m => m.itemId === item.id), taken = mine.filter(m => m.status === 'taken').length, skipped = mine.filter(m => m.status === 'skipped').length;
      return {name: item.name, dose: item.dose ?? null, kind: item.kind ?? 'supplement', planned, taken, skipped, notLogged: planned === null ? null : Math.max(0, planned - taken - skipped)};
    })};
  }
  if (want.has('nutrition')) {
    const days = daysOf(range).filter(d => (input.health?.diary ?? []).some(e => e.date === d));
    const totals = days.map(d => { const entries = input.health!.diary.filter(e => e.date === d).map(e => scaleNutrition(e.snapshot.nutrients, e.quantityMilli)); return entries; });
    out.nutrition = {loggedDays: days.length, rows: NUTRITION_ROWS.map(([key, name, unit, scale]) => {
      // A day counts for a nutrient only when every entry of it carries the value (else that day's total is unknown).
      const known = totals.filter(entries => entries.every(n => typeof n[key] === 'number')).map(entries => entries.reduce((t, n) => t + (n[key] as number), 0));
      return {name, unit, average: known.length ? Math.round(known.reduce((a, b) => a + b, 0) / known.length / scale * 10) / 10 : null, days: known.length};
    })};
  }
  return out;
}
