import {emptyPlatform} from '../positions';
import {emptyHabitData} from '../habits';
import {createEmptyHealth} from '../health';
import {DEVICE_PARTS, MODULE_PARTS, summarizePart, type ModuleName, type PartSummary, type PlannedPart, type RestoreGroup} from './plan';
import {applyRestore, currentValue, type RestoreOutcome} from './apply';
import type {OpenedBackup} from './read-backup';

/**
 * Session AL (GAP-176, C-BN-28): "Erase one area" — Goals and Wealth, Habits, Today and Life, or Health — on this device.
 * It is a Replace with the empty record, through the same path a restore takes (lib/restore/apply.ts), so it inherits
 * everything a restore guarantees: each record goes through its own page's write path (a module keeps its recovery copy
 * and is announced like a page's save, so sync, where it is on, carries it as an edit), it is fenced against an account
 * or Showcase change, and the whole erase can be undone for RESTORE_UNDO_DAYS (also after a reload). The rules of a
 * restore's Replace stay: deleted habits stay deleted, a deleted goal's extras stay dormant, the other share of a shared
 * record (the Checklist path vs its Health quick inputs, ZIGi's other notes) stays as it is.
 *
 * Left out on purpose: Today's preferences (the layout and the welcome's "done" mark; erasing them would restart the
 * welcome, not erase data), photos (deleted on their own pages), keys and secrets, and everything a restore never writes.
 */
export const ERASE_AREAS: readonly Exclude<RestoreGroup, 'Photos'>[] = ['Goals and Wealth', 'Habits', 'Today and Life', 'Health'];
export type EraseArea = typeof ERASE_AREAS[number];
const EMPTY_MODULE: Partial<Record<ModuleName, () => unknown>> = {finance: emptyPlatform, habits: emptyHabitData, health: createEmptyHealth};
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const same = (a: unknown, b: unknown) => { try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; } };
export const ERASE_REFUSED = 'This version cannot erase this record here, so it is left as it is.';
const versionOf = (v: unknown) => isObject(v) && typeof v.schemaVersion === 'number' ? v.schemaVersion : 0;
/** The empty value a part is replaced with. A module keeps the version this device holds it in (newer fields are optional), so an erase never counts as an older copy. */
function emptyFor(part: PlannedPart, current: unknown): unknown {
  if (part.kind === 'module') { const empty = EMPTY_MODULE[part.name]!() as Record<string, unknown>; return {...empty, schemaVersion: Math.max(versionOf(empty), versionOf(current))}; }
  const empty = part.schema.safeParse(part.empty()), value = empty.success ? empty.data : part.empty();
  return part.slice ? part.slice.pick(value) : value;
}
/** The parts of an area this erase can replace: Goals and Wealth, Habits and Health modules, and the area's device records. */
export function eraseParts(area: EraseArea): PlannedPart[] {
  return [...MODULE_PARTS.filter(p => p.group === area && EMPTY_MODULE[p.name]), ...DEVICE_PARTS.filter(p => p.group === area)].map(p => ({...p, summary: null}));
}
export type EraseRow = {part: PlannedPart; held: PartSummary | null; unreadable: boolean; problem?: string};
/**
 * What this device holds of each part of an area (parts that hold nothing are left out), each with the empty value the
 * erase writes. A copy that does not read is listed too: the erase replaces it and keeps its bytes as a recovery copy.
 */
export async function eraseInventory(storage: Storage, area: EraseArea): Promise<EraseRow[]> {
  const out: EraseRow[] = [];
  for (const base of eraseParts(area)) {
    let current: unknown, unreadable = false;
    try { current = await currentValue(storage, base); } catch { unreadable = true; }
    if (!unreadable && current === undefined) continue;
    const part: PlannedPart = {...base, value: emptyFor(base, current)};
    if (unreadable) { out.push({part, held: null, unreadable}); continue; }
    const mine = part.kind === 'device' && part.slice ? part.slice.pick(current) : current;
    const held = summarizePart(part, mine);
    const nothing = part.kind === 'device' && part.slice ? !part.slice.has(mine) : part.kind === 'module' ? held.counts === 'Saved preferences' : same(mine, part.value);
    if (nothing) continue;
    out.push({part, held, unreadable, ...(part.schema.safeParse(part.value).success ? {} : {problem: ERASE_REFUSED})});
  }
  return out;
}
const NO_FILE: OpenedBackup = {file: new Blob(), json: {format: 'zigoals-everything', version: 1, exportedAt: new Date(0).toISOString(), modules: {}, device: {}}, vision: [], photos: [], oversized: 0, demo: false};
/** Erases the listed rows (from eraseInventory, those without a problem) on this device; the outcome is a restore's, with its Undo. */
export async function eraseArea(rows: readonly EraseRow[], options: {signal?: AbortSignal} = {}): Promise<RestoreOutcome> {
  return applyRestore(NO_FILE, rows.filter(r => !r.problem).map(r => ({part: r.part, mode: 'replace' as const})), {vision: false, progress: false}, options);
}
