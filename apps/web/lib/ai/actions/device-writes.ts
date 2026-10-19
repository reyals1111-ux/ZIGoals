import {HABIT_EXTRAS, type HabitExtras} from '../../habits-extras/schema';
import {setHabitArea, setQuitCost, setTimerBell} from '../../habits-extras/store';
import {MICRO_TARGETS, setMicroTarget, MICRO_KEYS, type MicroKey, type MicroTargets} from '../../health-aa/micro';
import {MACRO_MODE, MACRO_MODES, setMacroMode, type MacroModeRecord} from '../../health-aa/macro-mode';
import {HEALTH_COACH, answerCoach, type HealthCoach} from '../../health-aa/coach-schema';
import {GAME, setGameEnabled, type GameRecord} from '../../game/schema';
import type {DeviceRecordSpec} from '../../device-record';
import {GOAL_EXTRAS, setGoalArea, setGoalParent, setGoalReasons, type GoalExtras} from '../../goal-extras/store';
import {AVERAGE_GOALS, AVERAGE_METRICS, addAverageGoal, logAverageValue, type AverageGoals} from '../../average-goals/store';
import {CALCULATOR, rememberInput, type CalculatorRecord} from '../../compound/store';
import {DEFAULT_INPUT, compoundInputSchema} from '../../compound/engine';
import {LIFE_REVIEW, setPeriod, type LifeReviewRecord} from '../../life-review/store';

/**
 * Session AA-Local Part 5: the device-only records a ZIGi card may change (ADR-022 B37), each through the record's own
 * store function, never a raw patch: a habit's area, quit cost or timer bell (`zigoals:habit-extras:v1`), a
 * micronutrient target, the macro mode, the coach's weekly answer and the game-layer switch. The planner names the key
 * and a small typed patch; the runner (`components/ai/use-proposals.ts`) looks the key up here and applies it. A key not
 * listed is no effect. Every write here is a display preference or a per-habit setting on this device; none is a
 * journal entry, so Undo is "change it back on its page" (the card says so).
 */
export type DeviceWrite =
  | {key: typeof HABIT_EXTRAS.key; patch: {area: {habitId: string; areaId: string | null}} | {quitCost: {habitId: string; perDay: number; currency: 'EUR' | 'USD'} | {habitId: string; clear: true}} | {bell: {habitId: string; on: boolean}}}
  | {key: typeof MICRO_TARGETS.key; patch: {target: {nutrient: MicroKey; mg: number | null}}}
  | {key: typeof MACRO_MODE.key; patch: {mode: (typeof MACRO_MODES)[number]; split?: {fat: number; protein: number; carbs: number}}}
  | {key: typeof HEALTH_COACH.key; patch: {answer: {weekStart: string; answer: 'keep' | 'adjust'; kcal?: number; at: string}}}
  | {key: typeof GAME.key; patch: {enabled: boolean}}
  // Session AA-Local, merged second (ADR-022 B53): AA-Cloud's device records, through their own store functions.
  | {key: typeof GOAL_EXTRAS.key; patch: {area: {goalKey: string; areaId: string | null; at: string}} | {reasons: {goalKey: string; why?: string; obstacle?: string; ifThen?: string; at: string}} | {parent: {goalKey: string; parentKey: string | null; at: string}}}
  | {key: typeof AVERAGE_GOALS.key; patch: {add: {id: string; name: string; metric: keyof typeof AVERAGE_METRICS; unit: string; target: number; direction: 'at-least' | 'at-most'; windowDays: 7 | 14 | 30; createdAt: string}} | {log: {goal: string; day: string; value: number}}}
  | {key: typeof CALCULATOR.key; patch: {input: Partial<{start: string; contribution: string; frequency: 'weekly' | 'monthly' | 'yearly'; ratePercent: number; years: number; compounding: 'yearly' | 'quarterly' | 'monthly' | 'daily'; currency: 'USD' | 'EUR'}>}}
  | {key: typeof LIFE_REVIEW.key; patch: {period: 'week' | 'month'}};
export type Entry<T> = {spec: DeviceRecordSpec<T>; apply: (record: T, patch: unknown) => T};
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const id = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(v);
const entries: Record<string, Entry<unknown>> = {
  [HABIT_EXTRAS.key]: {spec: HABIT_EXTRAS as DeviceRecordSpec<unknown>, apply: (r, p) => {
    const record = r as HabitExtras; if (!object(p)) throw new Error('Nothing to change.');
    if (object(p.area) && id(p.area.habitId) && (p.area.areaId === null || (typeof p.area.areaId === 'string' && p.area.areaId.length <= 60))) return setHabitArea(record, p.area.habitId, p.area.areaId as string | null);
    if (object(p.quitCost) && id(p.quitCost.habitId)) { if (p.quitCost.clear === true) return setQuitCost(record, p.quitCost.habitId, null); if (typeof p.quitCost.perDay === 'number' && (p.quitCost.currency === 'EUR' || p.quitCost.currency === 'USD')) return setQuitCost(record, p.quitCost.habitId, {perDay: p.quitCost.perDay, currency: p.quitCost.currency}); }
    if (object(p.bell) && id(p.bell.habitId) && typeof p.bell.on === 'boolean') return setTimerBell(record, p.bell.habitId, p.bell.on);
    throw new Error('That change is not one a card can make.');
  }},
  [MICRO_TARGETS.key]: {spec: MICRO_TARGETS as DeviceRecordSpec<unknown>, apply: (r, p) => { const t = object(p) && object(p.target) ? p.target : null; if (!t || !(MICRO_KEYS as string[]).includes(String(t.nutrient)) || !(t.mg === null || (typeof t.mg === 'number' && t.mg > 0))) throw new Error('That change is not one a card can make.'); return setMicroTarget(r as MicroTargets, t.nutrient as MicroKey, t.mg as number | null); }},
  [MACRO_MODE.key]: {spec: MACRO_MODE as DeviceRecordSpec<unknown>, apply: (r, p) => { if (!object(p) || !(MACRO_MODES as readonly string[]).includes(String(p.mode))) throw new Error('That change is not one a card can make.'); return setMacroMode(r as MacroModeRecord, p.mode as (typeof MACRO_MODES)[number], object(p.split) ? p.split as {fat: number; protein: number; carbs: number} : undefined); }},
  [HEALTH_COACH.key]: {spec: HEALTH_COACH as DeviceRecordSpec<unknown>, apply: (r, p) => { const a = object(p) && object(p.answer) ? p.answer : null; if (!a || typeof a.weekStart !== 'string' || (a.answer !== 'keep' && a.answer !== 'adjust') || typeof a.at !== 'string') throw new Error('That change is not one a card can make.'); return answerCoach(r as HealthCoach, a.weekStart, a.answer, a.at, typeof a.kcal === 'number' ? a.kcal : undefined); }},
  [GAME.key]: {spec: GAME as DeviceRecordSpec<unknown>, apply: (r, p) => { if (!object(p) || typeof p.enabled !== 'boolean') throw new Error('That change is not one a card can make.'); return setGameEnabled(r as GameRecord, p.enabled); }},
  [GOAL_EXTRAS.key]: {spec: GOAL_EXTRAS as DeviceRecordSpec<unknown>, apply: (r, p) => {
    const x = r as GoalExtras; if (!object(p)) throw new Error('Nothing to change.');
    const at = (o: Record<string, unknown>) => typeof o.at === 'string' ? o.at : new Date().toISOString();
    if (object(p.area) && typeof p.area.goalKey === 'string' && (p.area.areaId === null || (typeof p.area.areaId === 'string' && p.area.areaId.length <= 60))) return setGoalArea(x, p.area.goalKey, p.area.areaId as string | null, at(p.area));
    if (object(p.reasons) && typeof p.reasons.goalKey === 'string') { const r2 = p.reasons as Record<string, unknown> & {goalKey: string}; const pick = (v: unknown) => typeof v === 'string' && v.length <= 300 ? v : undefined; return setGoalReasons(x, r2.goalKey, {why: pick(r2.why), obstacle: pick(r2.obstacle), ifThen: pick(r2.ifThen)}, at(r2)); }
    if (object(p.parent) && typeof p.parent.goalKey === 'string' && (p.parent.parentKey === null || typeof p.parent.parentKey === 'string')) return setGoalParent(x, p.parent.goalKey, p.parent.parentKey as string | null, at(p.parent));
    throw new Error('That change is not one a card can make.');
  }},
  [AVERAGE_GOALS.key]: {spec: AVERAGE_GOALS as DeviceRecordSpec<unknown>, apply: (r, p) => {
    const s = r as AverageGoals; if (!object(p)) throw new Error('Nothing to change.');
    if (object(p.add) && id(p.add.id) && typeof p.add.name === 'string' && typeof p.add.metric === 'string' && p.add.metric in AVERAGE_METRICS && typeof p.add.target === 'number') {
      const a = p.add, metric = a.metric as keyof typeof AVERAGE_METRICS; return addAverageGoal(s, {id: a.id, name: a.name, metric, unit: typeof a.unit === 'string' ? a.unit : AVERAGE_METRICS[metric].unit, target: a.target, direction: a.direction === 'at-most' ? 'at-most' : 'at-least', windowDays: a.windowDays === 14 ? 14 : a.windowDays === 30 ? 30 : 7, createdAt: typeof a.createdAt === 'string' ? a.createdAt : new Date().toISOString()});
    }
    if (object(p.log) && typeof p.log.goal === 'string' && typeof p.log.day === 'string' && typeof p.log.value === 'number') {
      const l = p.log as {goal: string; day: string; value: number}, q = l.goal.trim().toLowerCase(), goal = s.goals.find(g => g.id === l.goal) ?? s.goals.find(g => g.name.toLowerCase() === q && g.status === 'active') ?? s.goals.find(g => g.name.toLowerCase() === q);
      if (!goal) throw new Error(`No average goal is called "${l.goal}".`);
      return logAverageValue(s, goal.id, {day: l.day, value: l.value});
    }
    throw new Error('That change is not one a card can make.');
  }},
  [CALCULATOR.key]: {spec: CALCULATOR as DeviceRecordSpec<unknown>, apply: (r, p) => {
    const c = r as CalculatorRecord; if (!object(p) || !object(p.input)) throw new Error('Nothing to change.');
    const base = c.last ?? DEFAULT_INPUT, i = p.input, num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v * 100) / 100) : undefined;
    const next = compoundInputSchema.parse({...base, ...(typeof i.start === 'string' ? {start: i.start} : num(i.start) ? {start: num(i.start)} : {}), ...(typeof i.contribution === 'string' ? {contribution: i.contribution} : num(i.contribution) ? {contribution: num(i.contribution)} : {}),
      ...(typeof i.frequency === 'string' ? {frequency: i.frequency} : {}), ...(typeof i.ratePercent === 'number' ? {ratePercent: i.ratePercent} : {}), ...(typeof i.years === 'number' ? {years: i.years} : {}), ...(typeof i.compounding === 'string' ? {compounding: i.compounding} : {}), ...(typeof i.currency === 'string' ? {currency: i.currency} : {})});
    return rememberInput(c, next);
  }},
  [LIFE_REVIEW.key]: {spec: LIFE_REVIEW as DeviceRecordSpec<unknown>, apply: (r, p) => { if (!object(p) || (p.period !== 'week' && p.period !== 'month')) throw new Error('That change is not one a card can make.'); return setPeriod(r as LifeReviewRecord, p.period); }},
};
const keys: string[] = Object.keys(entries);
/** The keys a card may change; a key registered later (`registerDeviceWrite`) joins this same list. */
export const DEVICE_WRITE_KEYS: readonly string[] = keys;
/**
 * Session AF (L4, ADR-028 H73): another lane's device record joins the list through its own entry, the pattern of
 * `registerSlotCard` and `installAaPlanner`: the Checklist's two records are registered by lib/ai/actions/checklist-writes.ts
 * with the Checklist lane's own entries (lib/checklist/commands.ts). A key already listed is never replaced, so a
 * registration can add a record and never change how an existing one is written. Returns whether it was added.
 */
export function registerDeviceWrite<T>(key: string, entry: Entry<T>): boolean {
  if (entries[key] || !/^zigoals:[a-z-]+:v1$/.test(key) || entry.spec.key !== key) return false;
  entries[key] = entry as unknown as Entry<unknown>; keys.push(key);
  return true;
}
/** The record after the patch, or a thrown error with the reason; the runner validates the key first (`deviceWriteSpec`). */
export function applyDeviceWrite(key: string, record: unknown, patch: unknown): unknown { const e = entries[key]; if (!e) throw new Error('No card can change that record.'); return e.apply(record, patch); }
export function deviceWriteSpec(key: string): DeviceRecordSpec<unknown> | null { return entries[key]?.spec ?? null; }
