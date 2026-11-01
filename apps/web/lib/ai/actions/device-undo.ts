import {readDeviceRecord, updateDeviceRecord} from '../../device-record';
import {applyDeviceWrite, DEVICE_WRITE_KEYS, deviceWriteSpec} from './device-writes';

/**
 * Owner follow-up 2 (N5): Undo for a card that changed a device record. Until now such a card (`target: 'form'` with
 * `device`) said where to change it back; NOVA's new cards (a task, a workout, a captured note) also carry
 * `device.undo = {patch, label}`, the inverse change through the same registered writer (lib/ai/actions/nova-writes.ts),
 * which refuses when the record moved since. Read structurally (as runner-effects.ts reads a plan), so only a known key
 * with a `remove` patch for the same key is ever an Undo.
 *
 * Runner wiring (components/ai/proposal-list.tsx, the lead's file): a form card whose effect wrote a record and whose plan
 * has `deviceUndoOf(plan)` shows Undo for ten seconds like a journal card, and its Undo calls `undoDeviceWrite`.
 */
export type DeviceUndo = {key: string; patch: Record<string, unknown>; label: string};
type ReadWrite = Pick<Storage, 'getItem' | 'setItem'>;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export const DEVICE_UNDO_FAILED = 'This undo could not be applied. Your records are as they are now.';

export function deviceUndoOf(plan: unknown): DeviceUndo | null {
  if (!object(plan) || !object(plan.device)) return null;
  const {key, undo} = plan.device;
  if (typeof key !== 'string' || !DEVICE_WRITE_KEYS.includes(key) || !object(undo) || !object(undo.patch)) return null;
  if (Object.keys(undo.patch).length !== 1 || !(object(undo.patch.remove) || object(undo.patch.unfile))) return null;
  return {key, patch: undo.patch, label: typeof undo.label === 'string' && undo.label.trim() && undo.label.length <= 120 ? undo.label : 'Undo'};
}
/** Applies a card's Undo on this device's record; null when it was undone, else the sentence to show (nothing changed). */
export function undoDeviceWrite(storage: ReadWrite, plan: unknown): string | null {
  const undo = deviceUndoOf(plan), spec = undo ? deviceWriteSpec(undo.key) : null;
  if (!undo || !spec) return DEVICE_UNDO_FAILED;
  try {
    if (readDeviceRecord(storage, spec).unreadable) return DEVICE_UNDO_FAILED;
    updateDeviceRecord(storage, spec, record => applyDeviceWrite(undo.key, record, undo.patch));
    return null;
  } catch (error) { return error instanceof Error && error.message ? error.message : DEVICE_UNDO_FAILED; }
}
