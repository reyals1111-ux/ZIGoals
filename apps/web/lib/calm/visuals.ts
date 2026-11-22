import {HABIT_EXTRAS_KEY} from '../aa-device-keys';
import {getAppStorage} from '../showcase-storage';

/**
 * Session AV lane 2 (habits pillar; LEDGER #79 Calm Shift, #80 Calm Scenes): a calm visual behind a sitting or a
 * breathing guide. "Slow left and right" (Shift's slow left-right layer, as a visual: a soft light that glides from one
 * side to the other at a pace you choose) or one of four still-or-drifting scenes drawn on the device (no picture, no
 * video, no audio). Kept as the optional `calm` field ({visual?, pace?}) of the loose habit extras record
 * (`zigoals:habit-extras:v1`; TIER 3 stored format, additive), so it is exported, erased, restored and synced with the
 * extras. Read with plain checks (no schema module). Relaxation to rest your eyes on, never therapy. Pure, apart from
 * `calmNow()`.
 */
export const CALM_VISUALS = ['shift', 'dusk', 'sea', 'forest', 'night'] as const;
export type CalmVisual = (typeof CALM_VISUALS)[number];
export const SHIFT_PACES = ['steady', 'slow', 'slower'] as const;
export type ShiftPace = (typeof SHIFT_PACES)[number];
/** Seconds for one glide from one side to the other. */
export const PACE_SECONDS: Record<ShiftPace, number> = {steady: 1.5, slow: 3, slower: 5};
export const CALM_WORDS: Record<CalmVisual, {en: string; nl: string; about: string}> = {
  shift: {en: 'Slow left and right', nl: 'Langzaam links en rechts', about: 'A soft light glides from side to side. Let your eyes follow it, or rest on it.'},
  dusk: {en: 'Dusk', nl: 'Schemering', about: 'An evening sky, warm low down and deepening above.'},
  sea: {en: 'Sea', nl: 'Zee', about: 'A quiet sea under a pale sky; the water moves very slowly.'},
  forest: {en: 'Forest', nl: 'Bos', about: 'Layers of green, with light coming through.'},
  night: {en: 'Night sky', nl: 'Nachthemel', about: 'A dark sky with a few still stars.'},
};
export const PACE_WORDS: Record<ShiftPace, {en: string; nl: string}> = {
  steady: {en: 'Steady (1.5 s a side)', nl: 'Gelijkmatig (1,5 s per kant)'},
  slow: {en: 'Slow (3 s a side)', nl: 'Langzaam (3 s per kant)'},
  slower: {en: 'Slower (5 s a side)', nl: 'Langzamer (5 s per kant)'},
};
/**
 * Session AV lane 2 (rest, LEDGER #79; TIER 3 (stored formats), additive inside the loose `calm` object): the slow
 * left-right sound, opt-in. `calm.sound` is its volume (1–100) while it is on; absent, it is off (the default).
 */
export const SHIFT_SOUND_DEFAULT = 40;
export type Calm = {visual: CalmVisual | null; pace: ShiftPace; sound?: number};
export const NO_CALM: Calm = {visual: null, pace: 'slow'};
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function readCalm(extras: unknown): Calm {
  const c = isObj(extras) ? extras.calm : undefined;
  if (!isObj(c)) return NO_CALM;
  const visual = (CALM_VISUALS as readonly unknown[]).includes(c.visual) ? c.visual as CalmVisual : null;
  const pace = (SHIFT_PACES as readonly unknown[]).includes(c.pace) ? c.pace as ShiftPace : 'slow';
  const sound = Number.isInteger(c.sound) && (c.sound as number) >= 1 && (c.sound as number) <= 100 ? c.sound as number : undefined;
  return {visual, pace, ...(sound ? {sound} : {})};
}
/**
 * The extras with the calm visual set (null: none), and optionally the pace and the slow left-right sound (its volume
 * 1–100; null: off). Later fields of `calm` are kept.
 */
export function withCalm<T extends object>(extras: T, change: {visual?: CalmVisual | null; pace?: ShiftPace; sound?: number | null}): T {
  if (change.visual !== undefined && change.visual !== null && !CALM_VISUALS.includes(change.visual)) throw new Error('This visual could not be found.');
  if (change.pace !== undefined && !SHIFT_PACES.includes(change.pace)) throw new Error('This pace could not be found.');
  if (change.sound !== undefined && change.sound !== null && !(Number.isInteger(change.sound) && change.sound >= 1 && change.sound <= 100)) throw new Error('Choose a volume from 1 to 100.');
  const old = (extras as {calm?: unknown}).calm, c: Record<string, unknown> = {...(isObj(old) ? old : {})};
  if (change.visual === null) delete c.visual; else if (change.visual) c.visual = change.visual;
  if (change.pace) c.pace = change.pace;
  if (change.sound === null) delete c.sound; else if (change.sound !== undefined) c.sound = change.sound;
  const {calm: _drop, ...rest} = extras as T & {calm?: unknown}; void _drop;
  return (Object.keys(c).length ? {...rest, calm: c} : rest) as T;
}
/** This device's calm visual now (the Showcase's own copy in a Showcase tab); none on the server or when unreadable. */
export function calmNow(): Calm {
  if (typeof window === 'undefined') return NO_CALM;
  try { const raw = getAppStorage().getItem(HABIT_EXTRAS_KEY); return raw ? readCalm(JSON.parse(raw)) : NO_CALM; } catch { return NO_CALM; }
}
/**
 * Where the gliding light is, from -1 (left) to 1 (right), `ms` into the session at a pace: an eased back-and-forth
 * (a cosine), so it slows at each side and never jumps.
 */
export function shiftPosition(ms: number, pace: ShiftPace): number {
  const period = PACE_SECONDS[pace] * 2000;
  return -Math.cos((2 * Math.PI * (((ms % period) + period) % period)) / period);
}
