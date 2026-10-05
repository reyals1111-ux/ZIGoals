import type {Plan, Stores} from './plan';

/**
 * Several proposals from one reply ("two eggs, toast and a glass of water") as one batch (ADR-012): "Add all" applies
 * the writes one after another on the latest stores; a batch has one Undo, the inverses in reverse order, refused as a
 * whole when any touched record changed since. Plans without a write (the pre-fill) are not part of a batch.
 */
export type Batch = {plans: Plan[]};
export const batchable = (plans: readonly Plan[]): Plan[] => plans.filter(p => p.target !== 'form');
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
