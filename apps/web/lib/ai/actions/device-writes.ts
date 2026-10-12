import {HABIT_EXTRAS, type HabitExtras} from '../../habits-extras/schema';
import {setHabitArea, setQuitCost, setTimerBell} from '../../habits-extras/store';
import {MICRO_TARGETS, setMicroTarget, MICRO_KEYS, type MicroKey, type MicroTargets} from '../../health-aa/micro';
import {MACRO_MODE, MACRO_MODES, setMacroMode, type MacroModeRecord} from '../../health-aa/macro-mode';
import {HEALTH_COACH, answerCoach, type HealthCoach} from '../../health-aa/coach-schema';
import {GAME, setGameEnabled, type GameRecord} from '../../game/schema';
import type {DeviceRecordSpec} from '../../device-record';

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
  | {key: typeof GAME.key; patch: {enabled: boolean}};
type Entry<T> = {spec: DeviceRecordSpec<T>; apply: (record: T, patch: unknown) => T};
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
};
export const DEVICE_WRITE_KEYS: readonly string[] = Object.keys(entries);
/** The record after the patch, or a thrown error with the reason; the runner validates the key first (`deviceWriteSpec`). */
export function applyDeviceWrite(key: string, record: unknown, patch: unknown): unknown { const e = entries[key]; if (!e) throw new Error('No card can change that record.'); return e.apply(record, patch); }
export function deviceWriteSpec(key: string): DeviceRecordSpec<unknown> | null { return entries[key]?.spec ?? null; }
