import {updateDeviceRecord} from '../device-record';
import {HABIT_EXTRAS} from '../habits-extras/schema';
import {getAppStorage} from '../showcase-storage';
import {ZIGI_STORE_EVENT} from '../ai/store/keys';
import {withCalm, type CalmVisual, type ShiftPace} from './visuals';

/**
 * Session AV lane 2 (LEDGER #79, #80): keeps the calm visual (or none) and the glide's pace in this device's habit
 * extras and tells every reader of the record, as lib/muted/write.ts does. Loaded on the tap. Throws when the record
 * cannot be written (the caller says so in plain words).
 */
export function setCalm(change: {visual?: CalmVisual | null; pace?: ShiftPace; sound?: number | null}): void {
  updateDeviceRecord(getAppStorage(), HABIT_EXTRAS, r => withCalm(r, change));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: HABIT_EXTRAS.key}));
}
