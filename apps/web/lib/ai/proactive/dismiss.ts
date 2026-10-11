import {updateDeviceRecord} from '../../device-record';
import {ZIGI, type ZigiRecord} from '../store/records';

/**
 * Chips and the brief card dismissed for the day (Session V Part 9), in `zigoals:zigi:v1` (a display preference of this
 * device, defined with the storage foundation): only the current day is kept, so a new day starts with everything back.
 * Written only when the person dismisses something, never on view.
 */
export const BRIEF_ID = 'brief';
export function dismissedOn(record: ZigiRecord, day: string): Set<string> {
  return new Set(record.dismissed?.day === day ? record.dismissed.ids : []);
}
export function dismissFor(storage: Pick<Storage, 'getItem' | 'setItem'>, day: string, id: string): ZigiRecord {
  return updateDeviceRecord(storage, ZIGI, current => {
    const kept = current.dismissed?.day === day ? current.dismissed.ids.filter(x => x !== id) : [];
    return {...current, dismissed: {day, ids: [...kept, id.slice(0, 80)].slice(-50)}};
  });
}
