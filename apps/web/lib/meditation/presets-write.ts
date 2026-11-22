import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {HABIT_EXTRAS} from '../habits-extras/schema';
import {HEALTH_EXTRAS} from '../health-extras';
import {getAppStorage} from '../showcase-storage';
import {ZIGI_STORE_EVENT} from '../ai/store/keys';
import {storedPreset, withPreset, withPresetBack, withoutPreset, withRunPlan, type TimerPlan} from './presets';

/**
 * Session AV lane 2 (LEDGER #184): keeps the timer presets in this device's habit extras (synced with them) and the
 * running preset's bells in the device-only Health extras, and tells every reader of the record, as lib/calm/write.ts
 * does. Loaded on the tap. Each throws when the record cannot be written (the caller says so in plain words).
 */
const told = (key: string) => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: key})); };
export function savePreset(input: {name: string; plan: TimerPlan}, id?: string): void {
  updateDeviceRecord(getAppStorage(), HABIT_EXTRAS, r => withPreset(r, input, id));
  told(HABIT_EXTRAS.key);
}
/** Deletes a preset; returns how to put it back where it was (the toast's Undo). */
export function deletePreset(id: string): () => void {
  const held = storedPreset(readDeviceRecord(getAppStorage(), HABIT_EXTRAS).data, id);
  updateDeviceRecord(getAppStorage(), HABIT_EXTRAS, r => withoutPreset(r, id));
  told(HABIT_EXTRAS.key);
  return () => { if (!held) return; updateDeviceRecord(getAppStorage(), HABIT_EXTRAS, r => withPresetBack(r, held.raw, held.index)); told(HABIT_EXTRAS.key); };
}
/** The bells of the session that begins at `startedAt` (null clears them). */
export function saveRunPlan(startedAt: string | null, plan: TimerPlan | null): void {
  updateDeviceRecord(getAppStorage(), HEALTH_EXTRAS, r => withRunPlan(r, startedAt, plan));
}
