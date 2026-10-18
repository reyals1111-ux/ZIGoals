'use client';
import {useCallback} from 'react';
import {readDeviceRecord, type DeviceRecordSpec} from '../../lib/device-record';
import {getAppStorage} from '../../lib/showcase-storage';
import {CHECKLIST, CHECKLIST_DAYS, type Checklist, type ChecklistDays} from '../../lib/checklist/schema';
import {ChecklistError} from '../../lib/checklist/store';
import {useDeviceRecord, type DeviceRecordState} from '../ai/use-device-record';

/** Said when this device's Checklist bytes cannot be read: nothing is written over them (the linked-wallets tone). */
export const CHECKLIST_UNREADABLE_MESSAGE = 'Your Checklist on this device could not be read. It has not been changed.';
/**
 * One of the Checklist's device records in a component (lib/checklist/schema.ts), read through the app storage (per
 * account; the tab's own in the Showcase) and refreshed on every save anywhere on the page. A write first checks that the
 * stored bytes still read: unreadable bytes are never replaced by a write built on the empty value.
 */
function useSafeRecord<T>(spec: DeviceRecordSpec<T>): DeviceRecordState<T> {
  const record = useDeviceRecord(spec), {update: write} = record;
  const update = useCallback((change: (current: T) => T) => {
    if (readDeviceRecord(getAppStorage(), spec).unreadable) throw new ChecklistError(CHECKLIST_UNREADABLE_MESSAGE);
    return write(change);
  }, [spec, write]);
  return {...record, update};
}
export const useChecklistRecord = (): DeviceRecordState<Checklist> => useSafeRecord(CHECKLIST);
export const useChecklistDays = (): DeviceRecordState<ChecklistDays> => useSafeRecord(CHECKLIST_DAYS);
