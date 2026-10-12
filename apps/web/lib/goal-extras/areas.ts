import {GOAL_EXTRAS, GOAL_EXTRAS_KEY, BUILT_IN_AREAS} from './store';
import {readDeviceRecord} from '../device-record';

/**
 * The life areas' public face (Session AA-Cloud, asked for by Session AA-Local's handoff): the seven built-in ids and
 * labels, and a tolerant read of the person's areas. Custom areas live in the goal-extras record
 * (`zigoals:goal-extras:v1`, its `areas` list), not in a key of their own (ADR-021 A15). A read never writes.
 */
export const LIFE_AREAS_KEY = GOAL_EXTRAS_KEY;
export const DEFAULT_AREA_IDS = BUILT_IN_AREAS.map(a => a.id);
export const AREAS: Readonly<Record<string, string>> = Object.fromEntries(BUILT_IN_AREAS.map(a => [a.id, a.label]));
export function readLifeAreas(storage: Pick<Storage, 'getItem'>): {id: string; label: string; color: string; custom: boolean}[] {
  const extras = readDeviceRecord(storage, GOAL_EXTRAS).data;
  return [...BUILT_IN_AREAS.map(a => ({...a, custom: false})), ...extras.areas.map(a => ({id: a.id, label: a.label, color: a.color, custom: true}))];
}
/**
 * A habit's life area for the balance wheel: Session AA-Local's own record (`zigoals:habit-extras:v1`, its `areas` map),
 * read without ever writing it; then the goal-extras record's `habitAreas` (the Showcase's); else none.
 */
export function habitAreasFrom(storage: Pick<Storage, 'getItem'>): Record<string, string> {
  const out: Record<string, string> = {...(readDeviceRecord(storage, GOAL_EXTRAS).data.habitAreas ?? {})};
  try {
    const raw = storage.getItem('zigoals:habit-extras:v1');
    const parsed = raw ? JSON.parse(raw) as {areas?: unknown} : null;
    if (parsed && parsed.areas && typeof parsed.areas === 'object') for (const [id, area] of Object.entries(parsed.areas as Record<string, unknown>)) if (typeof area === 'string' && /^[a-z0-9-]{1,40}$/.test(area) && /^[A-Za-z0-9_-]{1,100}$/.test(id)) out[id] = area;
  } catch { /* unreadable: the goal-extras areas and the default stand */ }
  return out;
}
