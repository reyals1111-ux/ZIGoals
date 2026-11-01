import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {AGENDA_SOURCES, AGENDA_VIEWS, type AgendaSource, type AgendaView} from './build';
import {EXTRA_SOURCES, type ExtraSource} from './extra-sources';

/**
 * Session AK (F5d): the agenda's one small record, `zigoals:agenda:v1` — the view the person last chose (day, week or
 * month) and the sources they hid. A display record: device only, versioned and loose, every field optional, never
 * synced; written only when the person changes the view or a filter, never on view. The agenda's items are never stored;
 * they are read again from each page's own record. Bytes that do not parse read as empty and unreadable and are never
 * rewritten by a read (lib/device-record.ts).
 */
export const AGENDA_KEY = 'zigoals:agenda:v1';
export const agendaSchema = z.looseObject({
  version: z.literal(1),
  view: z.enum(AGENDA_VIEWS).optional(),
  hidden: z.array(z.enum(AGENDA_SOURCES)).max(AGENDA_SOURCES.length).refine(h => new Set(h).size === h.length, 'Each source once.').optional(),
  /**
   * Session AK (T1, T2; TIER 3 (stored format), additive): the newer kinds the person hid (tasks, imported events). A
   * field of its own, so `hidden` keeps exactly the values older builds read; a value this build does not know is
   * dropped on read rather than failing the record.
   */
  hiddenExtra: z.array(z.string().max(20)).max(10).transform(h => EXTRA_SOURCES.filter(s => h.includes(s))).optional().catch(undefined),
});
export type AgendaRecord = z.infer<typeof agendaSchema>;
export const emptyAgenda = (): AgendaRecord => ({version: 1});
export const AGENDA: DeviceRecordSpec<AgendaRecord> = {key: AGENDA_KEY, schema: agendaSchema, empty: emptyAgenda};

export const setAgendaView = (record: AgendaRecord, view: AgendaView): AgendaRecord => record.view === view ? record : agendaSchema.parse({...record, view});
/** Shows or hides one source (kept in the sources' own order). */
export function setSourceShown(record: AgendaRecord, source: AgendaSource, shown: boolean): AgendaRecord {
  const hidden = new Set(record.hidden ?? []);
  if (shown) hidden.delete(source); else hidden.add(source);
  return agendaSchema.parse({...record, hidden: AGENDA_SOURCES.filter(s => hidden.has(s))});
}

/** Session AK (T1, T2): shows or hides tasks or imported events (their own field, `hiddenExtra`). */
export function setExtraShown(record: AgendaRecord, source: ExtraSource, shown: boolean): AgendaRecord {
  const hidden = new Set(record.hiddenExtra ?? []);
  if (shown) hidden.delete(source); else hidden.add(source);
  return agendaSchema.parse({...record, hiddenExtra: EXTRA_SOURCES.filter(s => hidden.has(s))});
}
