import type {HealthTargets} from '../health';

/**
 * Session AV lane 2 (food, LEDGER #88, #97, #107; MyFitnessPal's goals by day, Cronometer's Macro Scheduler, MacroFactor's
 * per-day targets): the targets of one day — the Targets' own, with that weekday's calories and macro grams where the
 * person set them in Targets → "Targets by weekday" (`zigoals:food-plus:v1` `weekdays`). Kept without a schema library on
 * purpose: Health's and Today's first chunks read it (a few hundred bytes); the full record is validated where it is
 * written (lib/food-plus/schema.ts). A value that is not a whole number in range is ignored, never guessed.
 */
export type WeekdayTargets = Partial<Record<'0' | '1' | '2' | '3' | '4' | '5' | '6', {kcal?: number; proteinG?: number; carbsG?: number; fatG?: number}>>;
export const FOOD_PLUS_STORAGE_KEY = 'zigoals:food-plus:v1';
/** The device-record save event (lib/ai/store/keys.ts ZIGI_STORE_EVENT, inlined so this module imports nothing). */
export const DEVICE_RECORD_EVENT = 'zigoals:zigi-store';
/** 0 Sunday … 6 Saturday, for a YYYY-MM-DD day (no time zone: the day is already the journal's). */
export const weekdayOfDay = (date: string): number => new Date(`${date}T12:00:00Z`).getUTCDay();
const whole = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : undefined;
/** The `weekdays` part of a stored food-plus record's text, or {} (never throws). */
export function weekdayTargetsOf(raw: string | null): WeekdayTargets {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as {version?: unknown; weekdays?: Record<string, unknown>};
    if (parsed?.version !== 1 || !parsed.weekdays || typeof parsed.weekdays !== 'object') return {};
    const out: WeekdayTargets = {};
    for (const key of ['0', '1', '2', '3', '4', '5', '6'] as const) {
      const v = parsed.weekdays[key] as Record<string, unknown> | undefined;
      if (!v || typeof v !== 'object') continue;
      const day = {kcal: whole(v.kcal, 1, 100_000), proteinG: whole(v.proteinG, 0, 5000), carbsG: whole(v.carbsG, 0, 5000), fatG: whole(v.fatG, 0, 5000)};
      const kept = Object.fromEntries(Object.entries(day).filter(([, n]) => n !== undefined));
      if (Object.keys(kept).length) out[key] = kept;
    }
    return out;
  } catch { return {}; }
}
/** The `sugarAlcohols` part (food id → mg per serving), or {} (never throws). */
export function sugarAlcoholsOf(raw: string | null): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as {version?: unknown; sugarAlcohols?: Record<string, unknown>};
    if (parsed?.version !== 1 || !parsed.sugarAlcohols || typeof parsed.sugarAlcohols !== 'object') return {};
    return Object.fromEntries(Object.entries(parsed.sugarAlcohols).filter((e): e is [string, number] => /^health_[a-z0-9-]{8,80}$/.test(e[0]) && whole(e[1], 0, 1_000_000) !== undefined));
  } catch { return {}; }
}
/** The sugar alcohols (mg) in a day's food entries, from the grams set per serving of each library food. */
export const sugarAlcoholMg = (entries: readonly {sourceId: string; sourceKind: string; quantityMilli: number}[], perServing: Record<string, number>): number =>
  entries.reduce((sum, e) => sum + (e.sourceKind === 'food' && perServing[e.sourceId] ? Math.round(perServing[e.sourceId]! * e.quantityMilli / 1000) : 0), 0);
/** The day's targets: the weekday's own values over the Targets' (grams → milligrams); `byWeekday` says which came from the weekday. */
export function dayTargets(base: HealthTargets, date: string, weekdays: WeekdayTargets): HealthTargets & {byWeekday: ('kcal' | 'proteinMg' | 'carbsMg' | 'fatMg')[]} {
  const day = weekdays[String(weekdayOfDay(date)) as keyof WeekdayTargets];
  const byWeekday: ('kcal' | 'proteinMg' | 'carbsMg' | 'fatMg')[] = [];
  const out = {...base};
  if (day?.kcal !== undefined) { out.kcal = day.kcal; byWeekday.push('kcal'); }
  for (const [g, mg] of [['proteinG', 'proteinMg'], ['carbsG', 'carbsMg'], ['fatG', 'fatMg']] as const) {
    const v = day?.[g];
    if (v !== undefined) { out[mg] = v > 0 ? v * 1000 : null; byWeekday.push(mg); }
  }
  return {...out, byWeekday};
}
