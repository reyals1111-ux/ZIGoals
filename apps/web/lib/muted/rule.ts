import {HABIT_EXTRAS_KEY} from '../aa-device-keys';
import {getAppStorage} from '../showcase-storage';

/**
 * Session AV lane 2 (habits; LEDGER #56, Finch's muted tags and exercises): one list of what the person does not want
 * offered — daily journal questions (by their place in the list), the ready journal templates (by id) and breathing
 * patterns (by id). Kept as the optional `muted` field ({questions?, templates?, breathing?}) of the loose habit extras
 * record (`zigoals:habit-extras:v1`; TIER 3 stored format, additive), so it is exported, erased, restored and synced
 * with the extras as they are. Read here with plain checks (no schema module), so the journal and meditation first chunks
 * gain almost nothing; a hidden item is only left out of what is offered, never removed from anything written. Pure,
 * apart from `mutedNow()`, which reads this device's record.
 */
export type MutedKind = 'questions' | 'templates' | 'breathing';
export type Muted = {questions: ReadonlySet<number>; templates: ReadonlySet<string>; breathing: ReadonlySet<string>};
export const NOTHING_MUTED: Muted = {questions: new Set(), templates: new Set(), breathing: new Set()};
const MAX = 200, ID = /^[a-z0-9][a-z0-9-]{0,59}$/;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function readMuted(extras: unknown): Muted {
  const m = isObj(extras) ? extras.muted : undefined;
  if (!isObj(m)) return NOTHING_MUTED;
  const arr = (v: unknown) => Array.isArray(v) ? v.slice(0, MAX) : [];
  return {
    questions: new Set(arr(m.questions).filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < 1000)),
    templates: new Set(arr(m.templates).filter((s): s is string => typeof s === 'string' && ID.test(s))),
    breathing: new Set(arr(m.breathing).filter((s): s is string => typeof s === 'string' && ID.test(s))),
  };
}
/** The extras with one item hidden (`on`) or offered again. Every other field, and later fields of `muted`, kept. */
export function withMuted<T extends object>(extras: T, kind: MutedKind, id: number | string, on: boolean): T {
  if (kind === 'questions' ? !(typeof id === 'number' && Number.isInteger(id) && id >= 0 && id < 1000) : !(typeof id === 'string' && ID.test(id))) throw new Error('This item could not be found.');
  const m: Record<string, unknown> = {...(isObj((extras as {muted?: unknown}).muted) ? (extras as {muted: Record<string, unknown>}).muted : {})};
  const list = (Array.isArray(m[kind]) ? m[kind] as unknown[] : []).filter(x => x !== id);
  if (on) list.push(id);
  if (list.length > MAX) throw new Error('Too many hidden items on this device.');
  if (list.length) m[kind] = list; else delete m[kind];
  const {muted: _drop, ...rest} = extras as T & {muted?: unknown}; void _drop;
  return (Object.keys(m).length ? {...rest, muted: m} : rest) as T;
}
/** This device's muted list now (the Showcase's own copy in a Showcase tab); nothing on the server or when unreadable. */
export function mutedNow(): Muted {
  if (typeof window === 'undefined') return NOTHING_MUTED;
  try { const raw = getAppStorage().getItem(HABIT_EXTRAS_KEY); return raw ? readMuted(JSON.parse(raw)) : NOTHING_MUTED; } catch { return NOTHING_MUTED; }
}
export const mutedCount = (m: Muted) => m.questions.size + m.templates.size + m.breathing.size;
