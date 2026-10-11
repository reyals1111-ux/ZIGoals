import type {Plan, Stores} from './plan';

/**
 * Several proposals from one reply ("two eggs, toast and a glass of water") as one batch (ADR-012): "Add all" applies
 * the writes one after another on the latest stores; a batch has one Undo, the inverses in reverse order, refused as a
 * whole when any touched record changed since. Plans without a write (the pre-fill) are not part of a batch.
 */
export type Batch = {plans: Plan[]};
export const batchable = (plans: readonly Plan[], current?: Stores): Plan[] => { const writing = plans.filter(p => p.target !== 'form'); return current ? dedupePlans(writing, current) : writing; };
/**
 * SECURITY_REVIEW_Y F14: two cards that would write the same change ("250 mL" and "1 glass" of water on the same day, the
 * same check-in twice) are one card: the first stays, the rest go. A plan whose write throws is kept as it is.
 */
/** The change without its fresh identifiers and stamps: an entry's id and times are made at write time, the change is what the person sees. */
const FRESH = new Set(['id', 'createdAt', 'updatedAt', 'at', 'loggedAt', 'recordedAt', 'revision']);
const fingerprint = (value: unknown): string => JSON.stringify(value, (key, v) => FRESH.has(key) ? undefined : typeof v === 'string' && /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|health_[a-z0-9-]{8,80}|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)$/i.test(v) ? '#' : v);
export function dedupePlans(plans: readonly Plan[], current: Stores): Plan[] {
  const seen = new Set<string>(), out: Plan[] = [];
  for (const p of plans) {
    let key: string | null = null;
    try { key = `${p.card.kind}\u0000${fingerprint(p.write(current))}`; } catch { key = null; }
    if (key !== null) { if (seen.has(key)) continue; seen.add(key); }
    out.push(p);
  }
  return out;
}
/** Applies every plan in order; the first failure stops the batch and reports how many were applied. */
export function applyBatch(plans: readonly Plan[], current: Stores): {stores: Stores; applied: number; error: string | null} {
  let stores = current, applied = 0;
  for (const plan of plans) {
    try { stores = {...stores, ...plan.write(stores)}; applied++; }
    catch (error) { return {stores, applied, error: error instanceof Error ? error.message : 'A proposal could not be written.'}; }
  }
  return {stores, applied, error: null};
}
/** The batch's Undo: refused in plain words if any record moved; otherwise the inverses, newest first. */
export function undoBatch(plans: readonly Plan[], afterApply: Stores, current: Stores): {stores: Stores; refused: string | null} {
  const withUndo = plans.filter(p => p.undo);
  if (withUndo.some(p => !p.undo!.unchanged(afterApply, current))) return {stores: current, refused: 'Something changed since, so this undo was not applied. Your records are as they are now.'};
  let stores = current;
  for (const plan of [...withUndo].reverse()) stores = {...stores, ...plan.undo!.write(stores)};
  return {stores, refused: null};
}
export const UNDO_WINDOW_MS = 10_000;
