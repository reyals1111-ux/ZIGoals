import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (BUILD list 2 #3): how the Journal shows "On this day" on this device. A new device-only key, loose and
 * versioned, every field optional; written only when the person turns it off or on, or chooses "Not this one". Some
 * memories hurt, so it can be hidden as a whole (`onThisDay: false`) or one entry at a time (`hidden`, entry ids).
 */
export const JOURNAL_DISPLAY_KEY = 'zigoals:journal-display:v1';
export const MAX_HIDDEN_MEMORIES = 500;
export const journalDisplaySchema = z.looseObject({
  version: z.literal(1),
  /** false: "On this day" is hidden. Missing or true: shown when something matches. */
  onThisDay: z.boolean().optional(),
  /** Journal entry ids the person chose not to see in "On this day" again (the entries themselves stay). */
  hidden: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,80}$/)).max(MAX_HIDDEN_MEMORIES).optional(),
});
export type JournalDisplay = z.infer<typeof journalDisplaySchema>;
export const emptyJournalDisplay = (): JournalDisplay => ({version: 1});
export const JOURNAL_DISPLAY: DeviceRecordSpec<JournalDisplay> = {key: JOURNAL_DISPLAY_KEY, schema: journalDisplaySchema, empty: emptyJournalDisplay};

export const onThisDayShown = (d: JournalDisplay) => d.onThisDay !== false;
export const setOnThisDay = (d: JournalDisplay, on: boolean): JournalDisplay => journalDisplaySchema.parse({...d, onThisDay: on});
/**
 * Adds one entry to the "not again" list (each once). Security review F10 (R1-F9): past the cap nothing is made to give
 * way any more (that silently brought the oldest hidden memory back). Ids of entries that no longer exist (`existing`,
 * when the caller knows the journal) are let go first; when the list is still full, the record comes back unchanged and
 * the caller says so (`hideMemoryFull`, HIDE_FULL_NOTE).
 */
export function hideMemory(d: JournalDisplay, id: string, existing?: readonly string[]): JournalDisplay {
  let hidden = (d.hidden ?? []).filter(x => x !== id);
  if (hidden.length >= MAX_HIDDEN_MEMORIES && existing) { const kept = new Set(existing); hidden = hidden.filter(x => kept.has(x)); }
  if (hidden.length >= MAX_HIDDEN_MEMORIES) return d;
  return journalDisplaySchema.parse({...d, hidden: [...hidden, id]});
}
/** True when this entry cannot be set aside: the list is full (after letting go of entries that no longer exist). */
export const hideMemoryFull = (d: JournalDisplay, id: string, existing?: readonly string[]): boolean => !(hideMemory(d, id, existing).hidden ?? []).includes(id);
export const HIDE_FULL_NOTE = `${MAX_HIDDEN_MEMORIES} memories are already set aside, the most this device keeps, so this one still shows here. To set it aside, show the others again under Privacy, or hide “On this day”.`;
export const unhideAll = (d: JournalDisplay): JournalDisplay => { const next = {...d}; delete next.hidden; return journalDisplaySchema.parse(next); };
