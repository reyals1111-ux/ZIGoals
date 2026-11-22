import {habitDay, habitRuleOn, type HabitData} from '../habits';
import {dailyHealthSummary, type HealthData} from '../health';
import {dailySeries, nightDay} from '../sleep/engine';
import {addLocalDays} from '../local-date';
import {formatCurrencyAmount, formatDate, formatNumber} from '../visual-format';
// Session AV lane 2, round 3 (money; PocketGuard's Financial Wellness, LEDGER #296): the day's spending as an outcome, by Wealth → Spending's own sums.
import {byCategory, totals} from '../money-log/engine';
import type {MoneyEntry} from '../money-log/schema';
import {isCounted, mineCents} from '../money-log/counted';
import {healthGroupIn} from '../vault/w-homes';
import {wallClock} from '../zone-time';
import {entryNutrients, reportNutrients, type ReportNutrient} from '../health-aa/nutrient-report';
import type {HealthVitamins} from '../health-vitamins/schema';
import type {NutrientExtras} from '../health-vitamins/extras';
import {CROSS_MIN_PER_SIDE, CROSS_WINDOW_DAYS, LABEL_WORDS, confidenceOf, deviceTime, habitShare, hoursMinutes, type CrossLabel} from '../insights/cross-pillar';

/**
 * Session AK (lane S, item 2; docs/research/session-ak/COMPETITORS.md (b) 2): "Does one thing go with another?" — the
 * person picks a factor (a habit done, a night or journal tag, a workout day, a fasting day, spending above an amount) and
 * an outcome (mood, energy, sleep, habit completion, steps, pleasant feeling words), on the same day or the next. The
 * rules are the cross-pillar ones (lib/insights/cross-pillar.ts) and nothing is loosened: the last 90 days of the
 * person's own records; at least 14 days on each side before any number is shown; a ready comparison needs its own
 * meaningful gap and a probability of superiority of 0.60 or more in the same direction (0.40 or less for a lower side),
 * and is "Consistent" only with 28 days a side and the same direction in both 45-day halves. The words say what happened
 * together, never why, and every result carries one thing that could explain the pairing without a cause.
 *
 * Unknown is not zero: a day without the records a side needs is left out of the comparison, never counted as "without".
 * Nothing is stored here; nothing leaves the device.
 */
export const OUTCOMES = ['mood', 'energy', 'sleep', 'habits', 'steps', 'feeling'] as const;
export type BaseOutcomeId = typeof OUTCOMES[number];
/** Session AK (BUILD list 2 #12): one of the person's own 1–5 scales (zigoals:scales:v1), as `scale:<id>`. */
export type ScaleOutcomeId = `scale:${string}`;
/** Session AV lane 2 (LEDGER #64, Bearable's experiments): a followed symptom or factor's level (0–3), as `symptom:<id>`. */
export type SymptomOutcomeId = `symptom:${string}`;
/**
 * Session AV lane 2 (food, LEDGER #98, #92; Cronometer's custom charts, Bearable's symptoms against doses): the day's
 * calories and protein from the food diary (a day with no entry, or no value, is unknown), the weight on a weigh-in day,
 * and a symptom's level 0–3 on a day it was logged (`symptom:<id>`).
 */
export type FoodOutcomeId = 'kcal' | 'protein' | 'weight' | 'bp';
/** A lab value by its marker's name as typed, folded (`lab:ferritin`), from "Your numbers". */
export type LabOutcomeId = `lab:${string}`;
/**
 * Session AV lane 2 (rest, LEDGER #98; Cronometer's custom charts): any other nutrient of the nutrient report — carbs,
 * fat, fibre, sugars, saturated fat, sodium, potassium, calcium, iron, the vitamins and the further nutrients — as
 * `nutrient:<report key>` (`nutrient:fiberMg`, `nutrient:vitamin:cMg`, `nutrient:extra:seleniumUg`). A day counts only
 * when every diary entry of that day carries the nutrient (a total that leaves an entry out would read low); today is
 * still open; a day with no entry is unknown.
 */
export type NutrientOutcomeId = `nutrient:${string}`;
/**
 * Session AV lane 2, round 3 (money; PocketGuard's Financial Wellness, LEDGER #296): the day's spending as an outcome —
 * all of it (`spend:EUR`) or one category (`spend:EUR:Groceries`, the category's first 30 characters) — in one currency,
 * never converted. A day's figure is Wealth → Spending's own (`totals` / `byCategory` over that day: entries left out,
 * transfers and Settle-up refunds are not counted, a shared cost counts the person's share). Unknown is not zero: only a
 * day with something in the money log counts (spent nothing that day reads 0); today is still open. Compare's own rules
 * apply unchanged (90 days, 14 days a side, never a cause).
 */
export type SpendOutcomeId = `spend:${string}`;
export const isSpendOutcome = (id: string): id is SpendOutcomeId => /^spend:[A-Z]{3}(?::.{1,30})?$/.test(id);
const spendParts = (id: SpendOutcomeId) => { const [, currency, ...rest] = id.split(':'); return {currency: currency!, category: rest.length ? rest.join(':') : null}; };
export type OutcomeId = BaseOutcomeId | ScaleOutcomeId | FoodOutcomeId | SymptomOutcomeId | LabOutcomeId | NutrientOutcomeId | SpendOutcomeId;
export const isNutrientOutcome = (id: string): id is NutrientOutcomeId => /^nutrient:(?:vitamin:|extra:)?[a-zA-Z0-9]{2,30}$/.test(id);
let defs: ReportNutrient[] | null = null;
/** The nutrient report's rows (labels, units, scales), apart from calories and protein (their own outcomes). */
const nutrientDefs = () => defs ??= reportNutrients({vitamins: {version: 1}, micro: {version: 1}}).filter(n => n.key !== 'kcal' && n.key !== 'proteinMg');
const nutrientDef = (outcome: NutrientOutcomeId) => nutrientDefs().find(n => n.key === outcome.slice(9)) ?? null;
/** Each diary day's values by report key, in stored units; a key is kept only when every entry of the day carries it. */
function nutrientDays(src: CompareSources | undefined): Map<string, Record<string, number>> {
  const health = src?.health; if (!health) return new Map();
  const ctx = {data: health, vitamins: src.nutrientRecords?.vitamins ?? {version: 1 as const}, extras: src.nutrientRecords?.extras ?? {version: 1 as const}, micro: {version: 1 as const}};
  const byDay = new Map<string, Record<string, number>[]>();
  for (const e of health.diary) byDay.set(e.date, [...(byDay.get(e.date) ?? []), entryNutrients(ctx, e)]);
  const out = new Map<string, Record<string, number>>();
  for (const [day, list] of byDay) {
    const keys = Object.keys(list[0] ?? {}).filter(k => list.every(v => typeof v[k] === 'number'));
    out.set(day, Object.fromEntries(keys.map(k => [k, list.reduce((t, v) => t + v[k]!, 0)])));
  }
  return out;
}
const nutrientMemo = new WeakMap<object, Map<string, Record<string, number>>>();
/** Read once per set of sources (the explorer keeps one object while its records stay the same). */
const nutrientDaysOf = (src: CompareSources | undefined) => { if (!src?.health) return new Map<string, Record<string, number>>(); let m = nutrientMemo.get(src); if (!m) { m = nutrientDays(src); nutrientMemo.set(src, m); } return m; };
/** A nutrient's meaningful gap: a tenth of its own daily average over the days with a value. */
const nutrientGap = (src: CompareSources | undefined, outcome: NutrientOutcomeId) => {
  const def = nutrientDef(outcome); if (!def) return 1;
  const v = [...nutrientDaysOf(src).values()].flatMap(d => typeof d[def.key] === 'number' ? [d[def.key]! / def.scale] : []);
  return v.length ? Math.max(Math.abs(v.reduce((a, b) => a + b, 0) / v.length) * 0.1, 1e-6) : 1;
};
export const isLabOutcome = (id: string): id is LabOutcomeId => /^lab:[a-z0-9 -]{1,60}$/.test(id);
export const labKey = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9 -]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
export const isScaleOutcome = (id: string): id is ScaleOutcomeId => /^scale:[a-z0-9-]{1,24}$/.test(id);
export const isSymptomOutcome = (id: string): id is SymptomOutcomeId => /^symptom:[a-z0-9-]{1,40}$/.test(id);
export const FOOD_OUTCOMES: readonly FoodOutcomeId[] = ['kcal', 'protein', 'weight', 'bp'];
const FOOD_GAP: Readonly<Record<FoodOutcomeId, number>> = {kcal: 150, protein: 10, weight: 0.3, bp: 5};
const FOOD_LABELS: Readonly<Record<FoodOutcomeId, string>> = {kcal: 'Calories logged', protein: 'Protein logged (g)', weight: 'Weight (kg)', bp: 'Blood pressure, upper (mmHg)'};
const isFoodOutcome = (id: string): id is FoodOutcomeId => (FOOD_OUTCOMES as readonly string[]).includes(id);
export type Lag = 'same' | 'next';
export type FactorKind = 'habit' | 'sleep-tag' | 'journal-tag' | 'workout' | 'fasting' | 'spend' | 'scale' | 'cycle' | 'dose' | 'symptom' | 'caffeine' | 'caffeine-late' | 'steps';
export type FactorOption = {id: string; kind: FactorKind; label: string; group: string};
export type OutcomeOption = {id: OutcomeId; label: string};

/** The records a comparison may read; each is optional, and one the person does not keep simply offers no factor. */
export type CompareSources = {
  habits?: HabitData | null;
  health?: HealthData | null;
  energy?: {days: Readonly<Record<string, {energy: number}>>; words?: Readonly<Record<string, {pleasantness: 'pleasant' | 'unpleasant'}>>} | null;
  journal?: {entries: readonly {date: string; tags?: readonly string[]}[]} | null;
  workouts?: {workouts: readonly {startedAt: string}[]} | null;
  /** The device fasting key's sessions (Health v2+ `fasting` is read from `health` too; the same id counts once). */
  fasting?: {sessions: readonly {id: string; endedAt: string | null; timeZone: string}[]} | null;
  /** The money log's entries (Session AV lane 2, round 3: with their category and marks, so the spending outcome counts as Wealth → Spending does). */
  money?: {entries: readonly ({kind: string; amount: string; currency: string; date: string} & Partial<Pick<MoneyEntry, 'id' | 'category' | 'excluded' | 'transfer' | 'share' | 'parts' | 'spread'>>)[]} | null;
  localTime?: (iso: string) => {date: string; hour: number};
  /** Session AK (BUILD list 2 #12): the person's own 1–5 scales (removed ones keep their names in `retired`). */
  scales?: {scales: readonly {id: string; name: string; low: string; high: string}[]; retired?: readonly {id: string; name: string; low: string; high: string}[]; days: Readonly<Record<string, Readonly<Record<string, number>>>>} | null;
  /** Session AK (BUILD list 2 #16): the opt-in cycle log's days with a period logged (only when it is turned on). */
  cycle?: {periodDays: readonly string[]} | null;
  /** Session AV lane 2 (food, LEDGER #92, #98): the symptoms log (zigoals:symptoms:v1; LEDGER #64 too) and the supplements and medication log. */
  symptoms?: {items: readonly {id: string; name: string; kind?: string}[]; days: Readonly<Record<string, Readonly<Record<string, number>>>>} | null;
  supplements?: {items?: readonly {id: string; name: string; kind?: string}[]; log?: readonly {itemId: string; date: string; status: string}[]} | null;
  /** Session AV lane 2 (food, LEDGER #98): "Your numbers" (zigoals:health-numbers): blood pressure and lab values by day. */
  numbers?: {entries: readonly {date: string; kind: string; systolic?: number; name?: string; value?: number; unit?: string}[]} | null;
  /** Session AV lane 2 (rest, LEDGER #98): the vitamins and the further nutrients kept beside the diary (as the nutrient report reads them). */
  nutrientRecords?: {vitamins?: HealthVitamins | null; extras?: NutrientExtras | null} | null;
  /**
   * Session AV lane 2, round 4 (health; Pillow, LEDGER #332): what each water entry was and the caffeine typed for it
   * (zigoals:health-extras:v1 `drinks`, keyed by the entry's id), for the caffeine factors.
   */
  drinks?: Readonly<Record<string, {type: string; caffeineMg?: number}>> | null;
};

/** Each outcome's meaningful gap (as the cross-pillar pairings: 0.4 points, 20 minutes, 10 percentage points). */
export const GAP: Readonly<Record<BaseOutcomeId, number>> = {mood: 0.4, energy: 0.4, sleep: 20, habits: 0.1, steps: 1000, feeling: 0.1};
export const OUTCOME_LABELS: Readonly<Record<BaseOutcomeId, string>> = {mood: 'Mood (1–5)', energy: 'Energy (1–5)', sleep: 'Time asleep', habits: 'Habit completion', steps: 'Steps', feeling: 'Pleasant feeling words'};
/** An outcome's meaningful gap; a person's own 1–5 scale uses mood's 0.4 points. */
/** A lab value's meaningful gap: a twentieth of its own average (a marker's units differ), or none with no readings. */
const labGap = (src: CompareSources | undefined, outcome: LabOutcomeId) => { const v = labReadings(src, outcome).map(r => r.value); return v.length ? Math.abs(v.reduce((a, b) => a + b, 0) / v.length) * 0.05 : 1; };
const labReadings = (src: CompareSources | undefined, outcome: LabOutcomeId) => (src?.numbers?.entries ?? []).filter((e): e is {date: string; kind: string; name: string; value: number; unit?: string} => e.kind === 'lab' && typeof e.name === 'string' && typeof e.value === 'number' && labKey(e.name) === outcome.slice(4));
export const gapOf = (outcome: OutcomeId, src?: CompareSources): number => isSpendOutcome(outcome) ? spendGap(src, outcome) : isNutrientOutcome(outcome) ? nutrientGap(src, outcome) : isScaleOutcome(outcome) ? 0.4 : isSymptomOutcome(outcome) ? 0.5 : isLabOutcome(outcome) ? labGap(src, outcome) : isFoodOutcome(outcome) ? FOOD_GAP[outcome] : GAP[outcome];
const scaleOf = (src: CompareSources | undefined, id: string) => src?.scales?.scales.find(s => s.id === id) ?? src?.scales?.retired?.find(s => s.id === id) ?? null;
/** An outcome's label; a scale by its own name ("Stress (1–5)"), or a plain fallback when it is gone. */
const symptomOf = (src: CompareSources | undefined, id: string) => src?.symptoms?.items.find(s => s.id === id) ?? null;
export const outcomeLabel = (outcome: OutcomeId, src?: CompareSources): string => isSpendOutcome(outcome) ? spendLabel(outcome) : isNutrientOutcome(outcome) ? (() => { const d = nutrientDef(outcome); return d ? `${d.label} logged (${d.unit})` : 'A nutrient'; })() : isScaleOutcome(outcome) ? `${scaleOf(src, outcome.slice(6))?.name ?? 'Your scale'} (1–5)` : isSymptomOutcome(outcome) ? `${symptomOf(src, outcome.slice(8))?.name ?? 'A symptom'} (0–3)` : isLabOutcome(outcome) ? (() => { const r = labReadings(src, outcome)[0]; return r ? `${r.name}${r.unit ? ` (${r.unit})` : ''}` : 'A lab value'; })() : isFoodOutcome(outcome) ? FOOD_LABELS[outcome] : OUTCOME_LABELS[outcome];
/** Each logged day's spending in cents (all, or one category), by Wealth → Spending's own sums over that day. */
function spendDays(src: CompareSources | undefined, outcome: SpendOutcomeId): Map<string, number> {
  const {currency, category} = spendParts(outcome), byDay = new Map<string, MoneyEntry[]>(), out = new Map<string, number>();
  for (const e of (src?.money?.entries ?? []) as readonly MoneyEntry[]) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  for (const [day, list] of byDay) {
    const cents = category === null ? totals(list, day, day).find(t => t.currency === currency)?.expenses ?? 0
      : byCategory(list, day, day).filter(c => c.currency === currency && c.category.slice(0, 30) === category).reduce((n, c) => n + c.total, 0);
    out.set(day, cents);
  }
  return out;
}
const spendMemo = new WeakMap<object, Map<string, Map<string, number>>>();
const spendDaysOf = (src: CompareSources | undefined, outcome: SpendOutcomeId) => {
  if (!src) return new Map<string, number>();
  let byId = spendMemo.get(src); if (!byId) { byId = new Map(); spendMemo.set(src, byId); }
  let m = byId.get(outcome); if (!m) { m = spendDays(src, outcome); byId.set(outcome, m); }
  return m;
};
/** Spending's meaningful gap: a tenth of the average logged day, at least one unit of the currency. */
const spendGap = (src: CompareSources | undefined, outcome: SpendOutcomeId) => { const v = [...spendDaysOf(src, outcome).values()]; return v.length ? Math.max(1, v.reduce((a, b) => a + b, 0) / v.length / 100 * 0.1) : 1; };
const spendLabel = (outcome: SpendOutcomeId) => { const {currency, category} = spendParts(outcome); return category ? `Spent on ${category} (${currency})` : `Spent that day (${currency})`; };
/** The spending outcomes the log can offer: all spending in its most used expense currency, then its most used categories. */
export function spendOutcomes(src: CompareSources): OutcomeOption[] {
  const spent = (src.money?.entries ?? []).filter(e => e.kind === 'expense');
  const currency = [...spent.reduce((m, e) => m.set(e.currency, (m.get(e.currency) ?? 0) + 1), new Map<string, number>())].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0]?.[0];
  if (!currency || !/^[A-Z]{3}$/.test(currency)) return [];
  const cats = new Map<string, number>();
  for (const e of spent) if (e.currency === currency && e.category) { const c = e.category.slice(0, 30); cats.set(c, (cats.get(c) ?? 0) + 1); }
  const ids: SpendOutcomeId[] = [`spend:${currency}`, ...byUse(cats).map(c => `spend:${currency}:${c}` as SpendOutcomeId)];
  return ids.filter(isSpendOutcome).map(id => ({id, label: spendLabel(id)}));
}
export const CONFOUNDERS: Readonly<Record<FactorKind, string>> = {
  habit: 'a calm or a busy stretch can shape both the habit and the rest of the day',
  'sleep-tag': 'the evenings you tag may differ in other ways too, such as the day of the week',
  'journal-tag': 'what you write about may follow from the day rather than shape it',
  workout: 'you may plan workouts on days you already expect to go well',
  fasting: 'fasting days may also be days with a different routine',
  spend: 'paydays, weekends and plans with others can shape both',
  scale: 'a rating can reflect the same day it is compared with',
  cycle: 'other things change across the month as well, such as sleep and plans',
  dose: 'a dose may be taken, or skipped, because of how the day already feels',
  symptom: 'how a day feels can shape both what you notice and the rest of the day',
  caffeine: 'busy or tiring days can bring both more coffee and a different night',
  'caffeine-late': 'late coffee often comes with late evenings, which shape the night as well',
  steps: 'active days are often different days too, such as weekends, trips or days off',
};
const MAX_TAGS = 20, MAX_HABITS = 60;

const mean = (v: readonly number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const daysBetween = (from: string, to: string) => { const out: string[] = []; for (let d = from; d <= to; d = addLocalDays(d, 1)) out.push(d); return out; };
const byUse = (counts: Map<string, number>) => [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, MAX_TAGS).map(([t]) => t);
export const compareWindow = (today: string) => ({start: addLocalDays(today, 1 - CROSS_WINDOW_DAYS), end: today});

function sleepNights(src: CompareSources) { return (src.health ? healthGroupIn(src.health, 'sleep')?.nights ?? [] : []).filter(n => n.kind === 'night' && n.end !== null); }
function fastingEnds(src: CompareSources): string[] {
  const seen = new Set<string>(), out: string[] = [];
  const healthFasting = (src.health as {fasting?: {sessions: readonly {id: string; endedAt: string | null; timeZone: string}[]}} | null | undefined)?.fasting?.sessions ?? [];
  for (const s of [...(src.fasting?.sessions ?? []), ...healthFasting]) {
    if (seen.has(s.id) || !s.endedAt) continue;
    seen.add(s.id);
    try { out.push(wallClock(Date.parse(s.endedAt), s.timeZone).date); } catch { /* an unreadable zone is left out */ }
  }
  return out;
}
/**
 * Session AV lane 2 (loose ends; review b2a #1's one spending rule): the spending factor counts as Wealth → Spending
 * does — an entry left out of the figures and either side of a transfer add nothing, and a shared cost counts the
 * person's own share (lib/money-log/counted.ts). In cents.
 */
const expenses = (src: CompareSources, from: string, to: string) => (src.money?.entries ?? []).filter(e => e.kind === 'expense' && e.date >= from && e.date <= to && isCounted(e));
const spentByDay = (entries: ReturnType<typeof expenses>, currency: string) => { const totals = new Map<string, number>(); for (const e of entries) if (e.currency === currency) totals.set(e.date, (totals.get(e.date) ?? 0) + mineCents(e)); return totals; };
/** The spending factor's currency (the most used expense currency in the window) and a usual amount (the median day). */
export function spendBasis(src: CompareSources, today: string): {currency: string; usual: number} | null {
  const {start, end} = compareWindow(today), spent = expenses(src, start, end);
  const currency = [...spent.reduce((m, e) => m.set(e.currency, (m.get(e.currency) ?? 0) + 1), new Map<string, number>())].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0]?.[0];
  if (!currency) return null;
  const sorted = [...spentByDay(spent, currency).values()].sort((a, b) => a - b);
  return {currency, usual: Math.round((sorted[Math.ceil(sorted.length / 2) - 1] ?? 0) / 100)};
}

const CAFFEINATED = new Set(['coffee', 'tea', 'soft drink']);
type CaffeineEntry = {mg: number | null; hour: number | null};
type CaffeineDay = {date: string; entries: CaffeineEntry[]; knownMg: number; unknown: number};
/**
 * Session AV lane 2, round 4 (LEDGER #332): each day with a drink logged, its caffeine as typed. A coffee, tea or soft
 * drink without an amount is unknown (never zero); plain water and the like count as no caffeine. A drink's hour is when
 * it was logged, and only when it was logged on its own day (one logged afterwards has no known hour).
 */
function caffeineDays(src: CompareSources | undefined): CaffeineDay[] {
  const water = (src?.health as {daily?: {water?: readonly {id: string; date: string; createdAt: string}[]}} | null | undefined)?.daily?.water ?? [];
  const local = src?.localTime ?? deviceTime, byDay = new Map<string, CaffeineDay>();
  for (const w of water) {
    const drink = src?.drinks?.[w.id], mg = drink?.caffeineMg ?? (drink && CAFFEINATED.has(drink.type) ? null : 0);
    let hour: number | null = null;
    try { const at = local(w.createdAt); hour = at.date === w.date ? at.hour : null; } catch { hour = null; }
    const day = byDay.get(w.date) ?? {date: w.date, entries: [], knownMg: 0, unknown: 0};
    day.entries.push({mg, hour});
    if (mg === null) day.unknown++; else day.knownMg += mg;
    byDay.set(w.date, day);
  }
  return [...byDay.values()];
}
/** The usual amounts the caffeine and steps factors start from: the middle day of the window, rounded. */
export function dayFactorBasis(src: CompareSources, today: string): {caffeineMg: number | null; steps: number | null; hour: number} {
  const {start} = compareWindow(today), mid = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.ceil(s.length / 2) - 1]! : null; };
  const mg = mid(caffeineDays(src).filter(d => d.date >= start && d.date <= today && d.knownMg > 0).map(d => d.knownMg));
  const steps = mid([...new Set((src.health?.activity ?? []).filter(a => a.date >= start && a.date < today).map(a => a.date))].map(d => dailyHealthSummary(src.health!, d).steps).filter(n => n > 0));
  return {caffeineMg: mg === null ? null : Math.max(10, Math.round(mg / 10) * 10), steps: steps === null ? null : Math.max(500, Math.round(steps / 500) * 500), hour: 14};
}

/** The factors the person's own records can offer, grouped for the picker. */
export function factorOptions(src: CompareSources, today: string): FactorOption[] {
  const out: FactorOption[] = [], {start} = compareWindow(today);
  for (const h of (src.habits?.habits ?? []).filter(h => { const s = habitRuleOn(h, today)?.state; return s !== 'archived'; }).slice(0, MAX_HABITS))
    out.push({id: `habit:${h.id}`, kind: 'habit', label: `Did “${h.title}”`, group: 'Habits'});
  const sleepTags = new Map<string, number>();
  for (const n of sleepNights(src)) if ((nightDay(n) ?? '') >= start) for (const t of n.tags ?? []) sleepTags.set(t, (sleepTags.get(t) ?? 0) + 1);
  for (const t of byUse(sleepTags)) out.push({id: `sleep-tag:${t}`, kind: 'sleep-tag', label: `Night tagged “${t}”`, group: 'Sleep tags'});
  const journalTags = new Map<string, number>();
  for (const e of src.journal?.entries ?? []) if (e.date >= start) for (const t of e.tags ?? []) journalTags.set(t, (journalTags.get(t) ?? 0) + 1);
  for (const t of byUse(journalTags)) out.push({id: `journal-tag:${t}`, kind: 'journal-tag', label: `Journal tag “${t}”`, group: 'Journal tags'});
  if (src.workouts?.workouts.length) out.push({id: 'workout', kind: 'workout', label: 'Workout day', group: 'Days'});
  if (fastingEnds(src).length) out.push({id: 'fasting', kind: 'fasting', label: 'Fasting day (a fast ended)', group: 'Days'});
  if (spendBasis(src, today)) out.push({id: 'spend', kind: 'spend', label: 'Spending above an amount', group: 'Days'});
  // Session AV lane 2, round 4 (health; Pillow, LEDGER #332): caffeine that day above an amount, caffeine after a time,
  // and steps above an amount — the night after is the sleep outcome, under the same rules.
  if (caffeineDays(src).some(d => d.date >= start && d.knownMg > 0)) out.push({id: 'caffeine', kind: 'caffeine', label: 'Caffeine above an amount', group: 'Days'}, {id: 'caffeine-late', kind: 'caffeine-late', label: 'Caffeine after a time', group: 'Days'});
  if ((src.health?.activity ?? []).some(a => a.date >= start && a.steps > 0)) out.push({id: 'steps', kind: 'steps', label: 'Steps above an amount', group: 'Days'});
  // Session AK (#12): each of the person's own scales with a rating, as "rated 4 or 5" against "rated 1 to 3".
  for (const sc of src.scales?.scales ?? []) if (Object.values(src.scales!.days).some(d => d[sc.id] !== undefined)) out.push({id: `scale:${sc.id}`, kind: 'scale', label: `Rated “${sc.name}” 4 or 5 (toward “${sc.high}”)`, group: 'Your scales'});
  // Session AK (#16): a day with a period logged (only while the opt-in cycle log is on).
  if (src.cycle?.periodDays.length) out.push({id: 'cycle', kind: 'cycle', label: 'Period day (from your cycle log)', group: 'Days'});
  // Session AV lane 2 (food, LEDGER #92): a dose taken (against skipped) and a symptom logged (level 1–3 against 0).
  for (const s of (src.supplements?.items ?? []).filter(i => (src.supplements?.log ?? []).some(m => m.itemId === i.id && m.date >= start)).slice(0, MAX_TAGS))
    out.push({id: `dose:${s.id}`, kind: 'dose', label: `Took “${s.name}”`, group: 'Supplements and medication'});
  // Session AV lane 2 (LEDGER #64 habits, #92 food): each followed symptom or factor answered in the window, level 1–3 against 0:
  // a symptom reads "Had …", a factor (or an item without a kind) reads "… noted".
  for (const s of (src.symptoms?.items ?? []).filter(i => Object.entries(src.symptoms!.days).some(([d, l]) => d >= start && l[i.id] !== undefined)).slice(0, MAX_TAGS))
    out.push({id: `symptom:${s.id}`, kind: 'symptom', label: s.kind === 'symptom' ? `Had “${s.name}” (level 1 or more)` : `“${s.name}” noted`, group: 'Symptoms and factors'});
  return out;
}
/** The outcomes with at least one recorded day. */
export function outcomeOptions(src: CompareSources): OutcomeOption[] {
  const moods = src.health ? healthGroupIn(src.health, 'moods')?.days ?? {} : {};
  const has: Record<BaseOutcomeId, boolean> = {
    mood: Object.keys(moods).length > 0, energy: Object.keys(src.energy?.days ?? {}).length > 0, sleep: sleepNights(src).length > 0,
    habits: (src.habits?.habits.length ?? 0) > 0, steps: (src.health?.activity.length ?? 0) > 0, feeling: Object.keys(src.energy?.words ?? {}).length > 0,
  };
  const own = (src.scales?.scales ?? []).filter(sc => Object.values(src.scales!.days).some(d => d[sc.id] !== undefined)).map(sc => ({id: `scale:${sc.id}` as ScaleOutcomeId, label: `${sc.name} (1–5)`}));
  // Session AV lane 2 (food, LEDGER #98, #92): the diary's calories and protein, the weight, and each symptom's level.
  const food: OutcomeOption[] = [...((src.health?.diary.length ?? 0) > 0 ? (['kcal', 'protein'] as const) : []), ...((src.health?.weights.length ?? 0) > 0 ? (['weight'] as const) : []), ...((src.numbers?.entries ?? []).some(e => e.kind === 'bp' && typeof e.systolic === 'number') ? (['bp'] as const) : [])].map(id => ({id, label: FOOD_LABELS[id]}));
  const labs = [...new Set((src.numbers?.entries ?? []).flatMap(e => e.kind === 'lab' && e.name && typeof e.value === 'number' ? [labKey(e.name)] : []))].filter(Boolean).slice(0, MAX_TAGS).map(k => { const id = `lab:${k}` as LabOutcomeId; return {id, label: outcomeLabel(id, src)}; });
  const symptoms = (src.symptoms?.items ?? []).filter(i => Object.values(src.symptoms!.days).some(l => l[i.id] !== undefined)).map(i => ({id: `symptom:${i.id}` as SymptomOutcomeId, label: `${i.name} (0–3)`}));
  // Session AV lane 2 (rest, LEDGER #98): every other nutrient that a diary day carries for all of its entries.
  const carried = new Set([...nutrientDaysOf(src).values()].flatMap(d => Object.keys(d)));
  const nutrients = nutrientDefs().filter(n => carried.has(n.key)).map(n => { const id = `nutrient:${n.key}` as NutrientOutcomeId; return {id, label: outcomeLabel(id, src)}; });
  return [...OUTCOMES.filter(id => has[id]).map(id => ({id, label: OUTCOME_LABELS[id]})), ...own, ...food, ...nutrients, ...labs, ...symptoms, ...spendOutcomes(src)];
}

type DayTest = (d: string) => boolean | null;
type DayValue = (d: string) => number | null;
function factorTest(src: CompareSources, factor: FactorOption, today: string, amount: number | undefined): {test: DayTest; phrase: string} | null {
  const [kind, ...rest] = factor.id.split(':'), arg = rest.join(':');
  if (kind === 'habit') {
    const habit = src.habits?.habits.find(h => h.id === arg);
    if (!habit) return null;
    return {phrase: `On days you completed “${habit.title}”`, test: d => {
      if (d < habit.startDate) return null;
      const day = habitDay(habit, d, today);
      // Done is "with"; a scheduled day left undone is "without"; a skip, a rest day or today still open is neither.
      return day.status === 'complete' ? true : day.status === 'failed' || day.status === 'partial' ? false : null;
    }};
  }
  if (kind === 'sleep-tag') {
    const byDay = new Map<string, boolean>();
    for (const n of sleepNights(src)) { const d = nightDay(n); if (d) byDay.set(d, (byDay.get(d) ?? false) || (n.tags ?? []).includes(arg)); }
    return {phrase: `On days after a night you tagged “${arg}”`, test: d => byDay.get(d) ?? null};
  }
  if (kind === 'journal-tag') {
    const byDay = new Map<string, boolean>();
    for (const e of src.journal?.entries ?? []) byDay.set(e.date, (byDay.get(e.date) ?? false) || (e.tags ?? []).includes(arg));
    return {phrase: `On days you tagged a journal entry “${arg}”`, test: d => byDay.get(d) ?? null};
  }
  if (kind === 'workout') {
    const local = src.localTime ?? deviceTime, days = new Set((src.workouts?.workouts ?? []).map(w => local(w.startedAt).date));
    const first = [...days].sort()[0];
    return first ? {phrase: 'On days with a workout', test: d => d < first ? null : days.has(d)} : null;
  }
  if (kind === 'fasting') {
    const days = new Set(fastingEnds(src)), first = [...days].sort()[0];
    return first ? {phrase: 'On days a fast ended', test: d => d < first ? null : days.has(d)} : null;
  }
  if (kind === 'scale') {
    const sc = src.scales?.scales.find(x => x.id === arg);
    if (!sc) return null;
    // Rated 4 or 5 is "with"; rated 1 to 3 is "without"; a day not rated is neither (unknown, never a low rating).
    return {phrase: `On days you rated “${sc.name}” 4 or 5`, test: d => { const v = src.scales!.days[d]?.[arg]; return v === undefined ? null : v >= 4; }};
  }
  if (kind === 'symptom') {
    // Noted (Mild or more) is "with"; answered None is "without"; a day not answered is neither (unknown, never none).
    // A symptom reads "On days you had …"; a factor (or an item without a kind) "On days with … noted".
    const it = symptomOf(src, arg);
    return it ? {phrase: it.kind === 'symptom' ? `On days you had “${it.name}”` : `On days with “${it.name}” noted`, test: d => { const v = src.symptoms!.days[d]?.[arg]; return v === undefined ? null : v > 0; }} : null;
  }
  if (kind === 'cycle') {
    const sorted = [...new Set(src.cycle?.periodDays ?? [])].sort(), days = new Set(sorted), first = sorted[0], last = sorted.at(-1);
    // Between the first and the last logged period day, a day without one logged counts as "without"; before and after
    // that span a day is unknown (the person may not have been logging), never "without".
    return first && last ? {phrase: 'On period days', test: d => d < first || d > last ? null : days.has(d)} : null;
  }
  if (kind === 'dose') {
    const item = src.supplements?.items?.find(i => i.id === arg);
    if (!item) return null;
    const byDay = new Map<string, boolean>();
    // Taken on a day is "with"; only skipped marks that day is "without"; a day with no mark is neither (unknown).
    for (const m of src.supplements?.log ?? []) if (m.itemId === arg) byDay.set(m.date, (byDay.get(m.date) ?? false) || m.status === 'taken');
    return {phrase: `On days you took “${item.name}”`, test: d => byDay.get(d) ?? null};
  }
  if (kind === 'caffeine' || kind === 'caffeine-late') {
    const basis = dayFactorBasis(src, today), byDay = new Map(caffeineDays(src).map(d => [d.date, d]));
    if (kind === 'caffeine') {
      const limit = amount ?? basis.caffeineMg ?? 200;
      // Above the amount from what is known is "with"; at or under it with nothing unknown is "without"; else unknown.
      return {phrase: `On days with over ${formatNumber(limit)} mg of caffeine logged`, test: d => { const day = byDay.get(d); if (!day) return null; return day.knownMg > limit ? true : day.unknown ? null : false; }};
    }
    const hour = Math.min(23, Math.max(0, Math.round(amount ?? basis.hour)));
    // A drink with caffeine logged at or after the hour is "with"; a day whose drinks are all known and none of them is,
    // "without"; a day with a drink of unknown caffeine or unknown hour that could be one is unknown.
    return {phrase: `On days with caffeine logged after ${String(hour).padStart(2, '0')}:00`, test: d => {
      const day = byDay.get(d); if (!day) return null;
      if (day.entries.some(e => e.hour !== null && e.hour >= hour && e.mg !== null && e.mg > 0)) return true;
      return day.entries.some(e => (e.mg === null || e.mg > 0) && (e.hour === null || e.hour >= hour)) ? null : false;
    }};
  }
  if (kind === 'steps') {
    const limit = amount ?? dayFactorBasis(src, today).steps ?? 8000, days = new Set((src.health?.activity ?? []).map(a => a.date));
    // Only a past day with activity logged counts: a day with nothing logged is unknown, never a day without steps.
    return {phrase: `On days you walked over ${formatNumber(limit)} steps`, test: d => src.health && d < today && days.has(d) ? dailyHealthSummary(src.health, d).steps > limit : null};
  }
  if (kind === 'spend') {
    const basis = spendBasis(src, today);
    if (!basis) return null;
    const limit = amount ?? basis.usual, logged = new Set((src.money?.entries ?? []).map(e => e.date)), totals = spentByDay(expenses(src, '0000-01-01', '9999-12-31'), basis.currency);
    // Only days with something in the money log count: a day with nothing logged is unknown, not a day without spending.
    // A day whose entries are all left out or transfers is a logged day that counts no spending.
    return {phrase: `On days you spent above ${formatNumber(limit)} ${basis.currency}`, test: d => logged.has(d) ? (totals.get(d) ?? 0) > Math.round(limit * 100) : null};
  }
  return null;
}
function outcomeValue(src: CompareSources, outcome: OutcomeId, today: string, span = CROSS_WINDOW_DAYS + 3): DayValue {
  if (isSpendOutcome(outcome)) { const byDay = spendDaysOf(src, outcome); return d => { const v = d < today ? byDay.get(d) : undefined; return v === undefined ? null : v / 100; }; }
  if (isScaleOutcome(outcome)) { const id = outcome.slice(6); return d => src.scales?.days[d]?.[id] ?? null; }
  if (isSymptomOutcome(outcome)) { const id = outcome.slice(8); return d => src.symptoms?.days[d]?.[id] ?? null; }
  if (isNutrientOutcome(outcome)) { const def = nutrientDef(outcome), byDay = nutrientDaysOf(src); return d => { const v = def && d < today ? byDay.get(d)?.[def.key] : undefined; return typeof v === 'number' ? v / def!.scale : null; }; }
  if (outcome === 'kcal' || outcome === 'protein') return d => { if (!src.health || d >= today) return null; const s = dailyHealthSummary(src.health, d); if (!s.entries) return null; const v = outcome === 'kcal' ? s.nutrients.kcal : s.nutrients.proteinMg; return v === null ? null : outcome === 'kcal' ? v : v / 1000; };
  if (outcome === 'weight') { const byDay = new Map<string, number>(); for (const w of src.health?.weights ?? []) byDay.set(w.date, w.grams / 1000); return d => byDay.get(d) ?? null; }
  // A day with two readings counts their average; a day without one is unknown.
  if (outcome === 'bp' || isLabOutcome(outcome)) {
    const byDay = new Map<string, number[]>();
    for (const e of src.numbers?.entries ?? []) { const v = outcome === 'bp' ? (e.kind === 'bp' ? e.systolic : undefined) : (e.kind === 'lab' && e.name && labKey(e.name) === outcome.slice(4) ? e.value : undefined); if (typeof v === 'number') byDay.set(e.date, [...(byDay.get(e.date) ?? []), v]); }
    return d => { const v = byDay.get(d); return v ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  }
  if (outcome === 'mood') { const moods = src.health ? healthGroupIn(src.health, 'moods')?.days ?? {} : {}; return d => moods[d]?.mood ?? null; }
  if (outcome === 'energy') return d => src.energy?.days[d]?.energy ?? null;
  if (outcome === 'feeling') return d => { const w = src.energy?.words?.[d]; return w ? (w.pleasantness === 'pleasant' ? 1 : 0) : null; };
  if (outcome === 'sleep') {
    const series = src.health?.sleep ? dailySeries(src.health.sleep, addLocalDays(today, 1), span) : [];
    const ending = new Map(series.filter(p => p.asleep !== null).map(p => [p.date, p.asleep!]));
    return d => ending.get(addLocalDays(d, 1)) ?? null; // the night that follows the day
  }
  if (outcome === 'habits') return d => src.habits && d < today ? habitShare(src.habits, d, today) : null; // today is still open
  return d => src.health && d < today && src.health.activity.some(a => a.date === d) ? dailyHealthSummary(src.health, d).steps : null;
}
/**
 * Session AK (BUILD list 2 #8, lane B2a; Experiments): the same factor test and outcome as `compare`, day by day over
 * any span (an experiment and the days just before it), so an experiment never loosens or re-implements Compare's rules.
 * `a` is true (with), false (without) or null (neither: unknown, skipped, not yet started); `value` is the outcome on the
 * day it is measured (the same day, or the next with lag "next"), null when unknown or still to come. Null when the
 * factor is gone (a removed habit) or unknown to this build.
 */
export function daySample(src: CompareSources, factorId: string, outcome: OutcomeId, lag: Lag, today: string, from: string, to: string, amount?: number): {factor: FactorOption; phrase: string; days: {date: string; a: boolean | null; value: number | null}[]} | null {
  const kind = factorId.split(':')[0] as FactorKind;
  if (!(kind in CONFOUNDERS) || from > to) return null;
  const factor = factorOptions(src, today).find(f => f.id === factorId) ?? {id: factorId, kind, label: factorId, group: ''};
  const made = factorTest(src, factor, today, amount);
  if (!made) return null;
  const span = Math.max(CROSS_WINDOW_DAYS, Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000)) + 3;
  const value = outcomeValue(src, outcome, today, span);
  return {factor, phrase: made.phrase, days: daysBetween(from, to).map(d => {
    const target = lag === 'same' ? d : addLocalDays(d, 1), v = target > today ? null : value(target);
    return {date: d, a: made.test(d), value: v !== null && Number.isFinite(v) ? v : null};
  })};
}
/** One value in its outcome's own words ("3.8 of 5", "7 h 20 min", "64%", "8,210"). */
export function outcomeText(outcome: OutcomeId, v: number): string {
  if (isSpendOutcome(outcome)) return formatCurrencyAmount((Math.round(v * 100) / 100).toFixed(2), spendParts(outcome).currency);
  if (outcome === 'mood' || outcome === 'energy' || isScaleOutcome(outcome)) return `${formatNumber(v, {minimumFractionDigits: 1, maximumFractionDigits: 1})} of 5`;
  if (isSymptomOutcome(outcome)) return `${formatNumber(v, {minimumFractionDigits: 1, maximumFractionDigits: 1})} of 3`;
  if (isNutrientOutcome(outcome)) { const unit = nutrientDef(outcome)?.unit ?? ''; return `${formatNumber(v, {maximumFractionDigits: v >= 100 ? 0 : v >= 10 ? 1 : 2})}${unit ? ` ${unit}` : ''}`; }
  if (outcome === 'kcal') return `${formatNumber(Math.round(v))} kcal`;
  if (outcome === 'protein') return `${formatNumber(Math.round(v))} g`;
  if (outcome === 'weight') return `${formatNumber(v, {minimumFractionDigits: 1, maximumFractionDigits: 1})} kg`;
  if (outcome === 'bp') return `${formatNumber(Math.round(v))} mmHg`;
  if (isLabOutcome(outcome)) return formatNumber(v, {maximumFractionDigits: 2});
  if (outcome === 'sleep') return hoursMinutes(v);
  if (outcome === 'habits' || outcome === 'feeling') return pct(v);
  return formatNumber(Math.round(v));
}
function outcomeSay(outcome: OutcomeId, lag: Lag, v: string, src?: CompareSources): string {
  const when = lag === 'same' ? 'that day' : 'the next day';
  if (isSpendOutcome(outcome)) { const {category} = spendParts(outcome); return category ? `you spent ${v} on ${category} ${when} on average` : `you spent ${v} ${when} on average`; }
  if (isScaleOutcome(outcome)) return `your “${scaleOf(src, outcome.slice(6))?.name ?? 'scale'}” rating ${when} averaged ${v}`;
  if (isSymptomOutcome(outcome)) return `your “${symptomOf(src, outcome.slice(8))?.name ?? 'symptom'}” level ${when} averaged ${v}`;
  if (isNutrientOutcome(outcome)) return `you logged ${v} of ${(nutrientDef(outcome)?.label ?? 'the nutrient').toLowerCase()} ${when} on average`;
  if (outcome === 'kcal') return `you logged ${v} ${when} on average`;
  if (outcome === 'protein') return `you logged ${v} of protein ${when} on average`;
  if (outcome === 'weight') return `your weight ${when} averaged ${v}`;
  if (outcome === 'bp') return `your upper blood pressure ${when} averaged ${v}`;
  if (isLabOutcome(outcome)) return `your ${outcomeLabel(outcome, src)} ${when} averaged ${v}`;
  switch (outcome) {
    case 'mood': return `your mood ${when} averaged ${v}`;
    case 'energy': return `your energy ${when} averaged ${v}`;
    case 'sleep': return `you slept ${v} ${lag === 'same' ? 'that night' : 'the following night'} on average`;
    case 'habits': return `you completed ${v} of your scheduled habits ${when}`;
    case 'steps': return `you walked ${v} steps ${when} on average`;
    case 'feeling': return `the feeling word you picked ${when} was a pleasant one on ${v} of days`;
  }
}

export type CompareState = 'pending' | 'unclear' | 'ready';
export type CompareResult = {
  factor: FactorOption; outcome: OutcomeId; lag: Lag; window: {start: string; end: string};
  withDays: number; withoutDays: number; need: number; state: CompareState;
  /** The two averages, shown only once each side has its 14 days (null before). */
  withValue: number | null; withoutValue: number | null;
  label: CrossLabel | null; ps: number | null;
  /** The finding in plain words, only when ready. */
  sentence: string | null;
  /** "12 days with, 31 without". */
  counts: string; confounder: string; why: string;
};
/** One comparison over the last 90 days; null when the factor is gone (a habit removed, a tag no longer used). */
export function compare(src: CompareSources, factorId: string, outcome: OutcomeId, lag: Lag, today: string, amount?: number): CompareResult | null {
  const factor = factorOptions(src, today).find(f => f.id === factorId);
  if (!factor) return null;
  const made = factorTest(src, factor, today, amount);
  if (!made) return null;
  const window = compareWindow(today), mid = addLocalDays(window.start, CROSS_WINDOW_DAYS / 2), value = outcomeValue(src, outcome, today);
  const sample: {date: string; a: boolean; value: number}[] = [];
  for (const d of daysBetween(window.start, window.end)) {
    const target = lag === 'same' ? d : addLocalDays(d, 1);
    if (target > today) continue;
    const a = made.test(d);
    if (a === null) continue;
    const v = value(target);
    if (v === null || !Number.isFinite(v)) continue;
    sample.push({date: d, a, value: v});
  }
  const withV = sample.filter(s => s.a).map(s => s.value), withoutV = sample.filter(s => !s.a).map(s => s.value);
  const counts = `${withV.length} ${withV.length === 1 ? 'day' : 'days'} with, ${withoutV.length} without`;
  const confounder = CONFOUNDERS[factor.kind];
  const base = {factor, outcome, lag, window, withDays: withV.length, withoutDays: withoutV.length, need: CROSS_MIN_PER_SIDE, counts, confounder};
  const paired = `From your own records, ${formatDate(window.start)} to ${formatDate(window.end)}: ${counts}, paired by date${lag === 'next' ? ' (each day with the day after it)' : ''}. Days without the records a side needs are left out, never counted as zero.`;
  const caution = `Days that happened together are not proof that one brings the other; ${confounder}. It is not advice, and only you decide what to do with it.`;
  if (withV.length < CROSS_MIN_PER_SIDE || withoutV.length < CROSS_MIN_PER_SIDE)
    return {...base, state: 'pending', withValue: null, withoutValue: null, label: null, ps: null, sentence: null, why: `${paired} A comparison shows once each side has ${CROSS_MIN_PER_SIDE} days. ${caution}`};
  const withValue = mean(withV), withoutValue = mean(withoutV), {label, ps} = confidenceOf(sample, gapOf(outcome, src), mid);
  if (!label) return {...base, state: 'unclear', withValue, withoutValue, label: null, ps, sentence: null, why: `${paired} The two sides are close, so this is not a finding. ${caution}`};
  const sentence = `${made.phrase}, ${outcomeSay(outcome, lag, outcomeText(outcome, withValue), src)}; on other days, ${outcomeText(outcome, withoutValue)}.`;
  return {...base, state: 'ready', withValue, withoutValue, label, ps, sentence, why: `${paired} Label: ${LABEL_WORDS[label].label}. ${LABEL_WORDS[label].line} ${caution}`};
}
