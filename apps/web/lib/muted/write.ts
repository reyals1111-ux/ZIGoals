import {updateDeviceRecord} from '../device-record';
import {HABIT_EXTRAS} from '../habits-extras/schema';
import {getAppStorage} from '../showcase-storage';
import {ZIGI_STORE_EVENT} from '../ai/store/keys';
import {withMuted, type MutedKind} from './rule';

/**
 * Session AV lane 2 (LEDGER #56): hides an item (or offers it again) in this device's habit extras and tells every reader
 * of the record, as `useDeviceRecord().update` does. Loaded on the tap, so the pages that offer the items stay light.
 * Throws when the record cannot be written (the caller says so in plain words).
 */
export function setMuted(kind: MutedKind, id: number | string, on: boolean): void {
  updateDeviceRecord(getAppStorage(), HABIT_EXTRAS, r => withMuted(r, kind, id, on));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: HABIT_EXTRAS.key}));
}
