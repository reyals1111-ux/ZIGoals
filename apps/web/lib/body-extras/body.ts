import {bodyExtrasSchema, type BodyExtras, type Milestones} from './schema';

/**
 * Session AV lane 2 (body; LEDGER #205 Yazio's milestones, #210 its BMI figure): pure rules.
 * - BMI: weight (kg) ÷ height (m)², one decimal, the number only — no category word, no "healthy range", no ideal weight
 *   (the no-medical-advice rule); the page says what it is and that it says nothing about one person's health.
 * - Milestones: opt-in steps from the weight they start at towards the Health weight goal, every 2 kg or every 10 % of the
 *   way; the first time a reading reaches one it is remembered with its day and celebrated once (Thanks); passing it again
 *   after a step back is not a second celebration. Turning them on remembers nothing as reached (the start is the start).
 */
export const bmiOf = (heightCm: number, grams: number): number | null => heightCm >= 50 && grams > 0 ? Math.round(grams / 1000 / (heightCm / 100) ** 2 * 10) / 10 : null;
export function setHeight(r: BodyExtras, heightCm: number | null): BodyExtras {
  if (heightCm !== null && !(heightCm >= 50 && heightCm <= 272)) throw Error('Enter a height from 50 to 272 cm.');
  const {heightCm: _h, ...rest} = r; void _h;
  return bodyExtrasSchema.parse(heightCm === null ? rest : {...rest, heightCm: Math.round(heightCm * 10) / 10});
}
export type Mark = {index: number; grams: number};
/** The steps on the way, nearest first; the last is the goal itself. */
export function marksOf(m: Pick<Milestones, 'step' | 'startGrams' | 'goalGrams'>): Mark[] {
  // The direction of the way (+1 up, -1 down); written out, as the staking guard keeps every signer-shaped call to the wallet files.
  const span = m.goalGrams - m.startGrams, dir = span > 0 ? 1 : span < 0 ? -1 : 0;
  if (!dir) return [];
  const out: Mark[] = [];
  if (m.step === '10pct') for (let i = 1; i <= 10; i++) out.push({index: i, grams: Math.round(m.startGrams + span * i / 10)});
  else { for (let i = 1; i <= 100 && Math.abs(2000 * i) < Math.abs(span); i++) out.push({index: i, grams: m.startGrams + dir * 2000 * i}); out.push({index: out.length + 1, grams: m.goalGrams}); }
  return out;
}
const passed = (m: Milestones, mark: Mark, grams: number) => m.goalGrams < m.startGrams ? grams <= mark.grams : grams >= mark.grams;
export function turnOnMilestones(r: BodyExtras, input: {step: Milestones['step']; startGrams: number; goalGrams: number; today: string}): BodyExtras {
  if (Math.abs(input.goalGrams - input.startGrams) < 500) throw Error('Your latest weight is already at your weight goal, so there is no way to mark.');
  return bodyExtrasSchema.parse({...r, milestones: {step: input.step, startGrams: Math.round(input.startGrams), goalGrams: Math.round(input.goalGrams), startedOn: input.today, reached: []}});
}
export function turnOffMilestones(r: BodyExtras): BodyExtras { const {milestones: _m, ...rest} = r; void _m; return bodyExtrasSchema.parse(rest); }
/** Remembers the steps a reading has reached for the first time (with its day); the record is unchanged when none is new. */
export function reachMilestones(r: BodyExtras, grams: number, day: string): BodyExtras {
  const m = r.milestones; if (!m) return r;
  const known = new Set(m.reached.map(x => x.index)), fresh = marksOf(m).filter(k => !known.has(k.index) && passed(m, k, grams));
  if (!fresh.length) return r;
  return bodyExtrasSchema.parse({...r, milestones: {...m, reached: [...m.reached, ...fresh.map(k => ({index: k.index, on: day}))].slice(-100)}});
}
/** The reached steps not yet celebrated (oldest first). */
export const toCelebrate = (r: BodyExtras) => (r.milestones?.reached ?? []).filter(x => !x.quiet && !x.shownAt);
export function markCelebrated(r: BodyExtras, now: Date): BodyExtras {
  const m = r.milestones; if (!m) return r;
  return bodyExtrasSchema.parse({...r, milestones: {...m, reached: m.reached.map(x => x.shownAt || x.quiet ? x : {...x, shownAt: now.toISOString()})}});
}
export type MilestoneView = {marks: (Mark & {reached: string | null})[]; next: Mark | null; done: number; total: number; down: boolean};
export function milestoneView(r: BodyExtras): MilestoneView | null {
  const m = r.milestones; if (!m) return null;
  const on = new Map(m.reached.map(x => [x.index, x.on] as const)), marks = marksOf(m).map(k => ({...k, reached: on.get(k.index) ?? null}));
  return {marks, next: marks.find(k => !k.reached) ?? null, done: marks.filter(k => k.reached).length, total: marks.length, down: m.goalGrams < m.startGrams};
}
