import {readDeviceRecord, type DeviceRecordSpec} from '../../device-record';
import {TASKS} from '../../tasks/schema';
import {FOCUS_SESSIONS} from '../../focus-sessions/schema';
import {BUDGETS} from '../../budgets/schema';
import {NOTES} from '../../notes/schema';
import {MUSIC} from '../../music/schema';
import {CALENDAR_IMPORT} from '../../ics/calendar';
import type {NovaToolSources} from './nova-tools';

/**
 * Owner follow-up 2 (N4): the device records NOVA's tools read, read at the moment of the question like the rest of the
 * tool sources. A record that cannot be read is null (its tool then says nothing is kept; nothing is guessed). The notes
 * are read only when the caller says NOVA's Notes scope is granted; ZIGi's page paths never pass them.
 */
type Read = {getItem(key: string): string | null};
export function readNovaToolSources(storage: Read, {notes = false}: {notes?: boolean} = {}): NovaToolSources {
  const one = <T>(spec: DeviceRecordSpec<T>): T | null => { try { const r = readDeviceRecord(storage, spec); return r.unreadable ? null : r.data; } catch { return null; } };
  return {tasks: one(TASKS), focus: one(FOCUS_SESSIONS), budgets: one(BUDGETS), music: one(MUSIC), calendar: one(CALENDAR_IMPORT), ...(notes ? {notes: one(NOTES)} : {})};
}
