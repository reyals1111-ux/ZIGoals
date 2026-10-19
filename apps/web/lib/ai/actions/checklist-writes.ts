import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from '../../af-checklist-keys';
import {checklistDaysDeviceWrite, checklistDeviceWrite} from '../../checklist/commands';
import {CHECKLIST, CHECKLIST_DAYS, type Checklist, type ChecklistDays} from '../../checklist/schema';
import {addFavourite, newChecklistId} from '../../checklist/store';
import {readDeviceRecord, type DeviceRecordSpec} from '../../device-record';
import {getAppStorage} from '../../showcase-storage';
import {registerDeviceWrite, type Entry} from './device-writes';

/**
 * Session AF (L4, P8.6): the Checklist's two device records join the records a ZIGi card may change, through the
 * Checklist lane's own entries (lib/checklist/commands.ts, L3): `{add: {text}}` adds a custom item and `{check: {item,
 * done, day}}` ticks one. One patch is ZIGi's: `{star: {habitId, label}}` stars a habit the person has onto the path,
 * through the Checklist's own pure mutator `addFavourite` (lib/checklist/store.ts), exactly as the star button does. A
 * record whose stored bytes do not read is never written over (the Checklist's own rule, use-checklist-record.ts).
 * Loaded with the lazy planner chunk (plan-af.ts), before any Checklist card can exist.
 */
export const CHECKLIST_UNREADABLE = 'Your Checklist on this device could not be read. It has not been changed.';
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function guarded<T>(spec: DeviceRecordSpec<T>, apply: (record: T, patch: unknown) => T): Entry<T> {
  return {spec, apply: (record, patch) => {
    let unreadable = false;
    try { unreadable = readDeviceRecord(getAppStorage(), spec).unreadable; } catch { unreadable = false; }
    if (unreadable) throw new Error(CHECKLIST_UNREADABLE);
    return apply(record, patch);
  }};
}
export const checklistEntry: Entry<Checklist> = guarded(CHECKLIST, (record, patch) => {
  if (object(patch) && object(patch.star)) {
    const star = patch.star, habitId = typeof star.habitId === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(star.habitId) ? star.habitId : null;
    if (!habitId) throw new Error('That change is not one a card can make.');
    return addFavourite(record, {kind: 'habit', habitId}, {id: newChecklistId(), at: new Date(), label: typeof star.label === 'string' ? star.label.slice(0, 120) : undefined});
  }
  return checklistDeviceWrite.apply(record, patch);
});
export const checklistDaysEntry: Entry<ChecklistDays> = guarded(CHECKLIST_DAYS, (days, patch) => checklistDaysDeviceWrite(() => readDeviceRecord(getAppStorage(), CHECKLIST).data).apply(days, patch));
registerDeviceWrite(CHECKLIST_KEY, checklistEntry);
registerDeviceWrite(CHECKLIST_DAYS_KEY, checklistDaysEntry);
export const CHECKLIST_WRITE_KEYS = [CHECKLIST_KEY, CHECKLIST_DAYS_KEY] as const;
