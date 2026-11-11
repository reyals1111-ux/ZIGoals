import {MAX_WIDGETS} from '../nova/store';
import {MAX_ASKS, MAX_PARAMS} from '../nova/stage/record';
import {same} from './extras-merge';

/**
 * Session AM (ADR-038 O2, D18, D19; TIER 3 (sync)): what the `nova` extras section needs beside the two records' own
 * schemas (lib/vault/extras-sections.ts).
 *
 * Of NOVA's own record, `zigoals:nova:v1`, exactly two fields travel: the layout and the arranged (pinned) widgets. The
 * list is an allow-list (`syncFields`), so a field a later build adds to that loose record stays on the device until
 * that build names it here. Every other field the record has today is named in NOVA_DEVICE_FIELDS; a unit test
 * (lib/vault/extras-nova.test.ts) keeps the two lists and the schema in step, so a new field cannot be added without
 * deciding where it lives.
 */
export const NOVA_SYNC_FIELDS: readonly string[] = ['layout', 'widgets'];
export const NOVA_DEVICE_FIELDS: readonly string[] = ['openingSeen', 'dock', 'persona', 'accent', 'customInstructions', 'shortcuts', 'yourName', 'panels', 'routing', 'wake', 'startOnNova'];

type Loose = Record<string, unknown>;
const isObject = (v: unknown): v is Loose => !!v && typeof v === 'object' && !Array.isArray(v);
const size = (v: unknown) => Array.isArray(v) ? v.length : isObject(v) ? Object.keys(v).length : 0;
/**
 * A field is fitted only when this merge joined two devices' values (the result is neither side's own). A value taken
 * whole from one side is left exactly as that side wrote it, and a bound is never set below what one side already
 * holds: a longer list from a later build is not cut here (this build then says it cannot combine it, and changes and
 * uploads nothing).
 */
function joined(field: string, merged: Loose, local: Loose | undefined, remote: Loose | undefined, bound: number): number | null {
  const value = merged[field];
  if (value === undefined || same(value, local?.[field]) || same(value, remote?.[field])) return null;
  return Math.max(bound, size(local?.[field]), size(remote?.[field]));
}
const time = (v: unknown) => { const t = isObject(v) && typeof v.at === 'string' ? Date.parse(v.at) : NaN; return Number.isNaN(t) ? null : t; };
/** Newest first by `at` (the order both lists are kept in), at most `max`; a list this build cannot read that way is left as it is. */
function newestFirst(list: unknown, max: number): unknown {
  if (!Array.isArray(list) || !list.every(v => time(v) !== null)) return list;
  return list.map((v, i) => ({v, i, t: time(v)!})).sort((a, b) => b.t - a.t || a.i - b.i).slice(0, max).map(x => x.v);
}
/**
 * The stage record after a merge: two devices' requests and made widgets joined can be more than one device may hold
 * (200 requests, 24 widgets, 48 parameters), which the record's own schema would refuse, and are in this device's order
 * with the other's after. The joined lists are put back in the record's own order (newest first) and the newest are
 * kept, as the record itself does when a request or a widget is added, so the merge is always a record this device can
 * read and a request from the phone stands where its time puts it. It reads only the three values, so every device
 * settles on the same record.
 */
export function fitNovaStage(merged: Loose, local?: Loose, remote?: Loose): Loose {
  const out: Loose = {...merged};
  const asks = joined('asks', merged, local, remote, MAX_ASKS), made = joined('made', merged, local, remote, MAX_WIDGETS), params = joined('params', merged, local, remote, MAX_PARAMS);
  if (asks !== null) out.asks = newestFirst(merged.asks, asks);
  if (made !== null) out.made = newestFirst(merged.made, made);
  if (params !== null && isObject(merged.params) && Object.keys(merged.params).length > params) { const all = merged.params; out.params = Object.fromEntries(Object.keys(all).sort().slice(-params).map(k => [k, all[k]])); }
  return out;
}
/** The arranged widgets after a merge that joined two devices' lists: at most 24, the first places kept (lib/nova/store.ts renumbers the places when it reads them). */
export function fitNovaArrangement(merged: Loose, local?: Loose, remote?: Loose): Loose {
  const max = joined('widgets', merged, local, remote, MAX_WIDGETS), list = merged.widgets;
  if (max === null || !Array.isArray(list) || list.length <= max) return merged;
  const slot = (v: unknown) => isObject(v) && typeof v.slot === 'number' ? v.slot : Number.MAX_SAFE_INTEGER;
  return {...merged, widgets: list.map((v, i) => ({v, i})).sort((a, b) => slot(a.v) - slot(b.v) || a.i - b.i).slice(0, max).map(x => x.v)};
}
