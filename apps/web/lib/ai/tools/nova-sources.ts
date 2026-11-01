import {readDeviceRecord, type DeviceRecordSpec} from '../../device-record';
import {TASKS} from '../../tasks/schema';
import {FOCUS_SESSIONS} from '../../focus-sessions/schema';
import {BUDGETS} from '../../budgets/schema';
import {NOTES} from '../../notes/schema';
import {MUSIC} from '../../music/schema';
import {CALENDAR_IMPORT} from '../../ics/calendar';
import type {NovaToolSources} from './nova-tools';
import {HEALTH_NUMBERS} from '../../health-numbers/store';
import {CYCLE} from '../../cycle/store';
import {SCALES} from '../../scales/store';

/**
 * Owner follow-up 2 (N4): the device records NOVA's tools read, read at the moment of the question like the rest of the
 * tool sources. A record that cannot be read is null (its tool then says nothing is kept; nothing is guessed). The notes
 * are read only when the caller says NOVA's Notes scope is granted; ZIGi's page paths never pass them.
 */
type Read = {getItem(key: string): string | null};
export function readNovaToolSources(storage: Read, {notes = false}: {notes?: boolean} = {}): NovaToolSources {
  const one = <T>(spec: DeviceRecordSpec<T>): T | null => { try { const r = readDeviceRecord(storage, spec); return r.unreadable ? null : r.data; } catch { return null; } };
  // Owner follow-up 2 (G8): BUILD list 2's records. Your numbers and the cycle log describe health: toolEnv drops them while
  // the Health gate is closed, and their tools run only through it (the cycle log also needs its own switch).
  return {tasks: one(TASKS), focus: one(FOCUS_SESSIONS), budgets: one(BUDGETS), music: one(MUSIC), calendar: one(CALENDAR_IMPORT), ...(notes ? {notes: one(NOTES)} : {}),
    healthNumbers: one(HEALTH_NUMBERS), cycle: one(CYCLE), scales: one(SCALES)};
}
