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
/** Adds one entry to the "not again" list (each once; the oldest make way past the cap). */
export const hideMemory = (d: JournalDisplay, id: string): JournalDisplay => journalDisplaySchema.parse({...d, hidden: [...(d.hidden ?? []).filter(x => x !== id), id].slice(-MAX_HIDDEN_MEMORIES)});
export const unhideAll = (d: JournalDisplay): JournalDisplay => { const next = {...d}; delete next.hidden; return journalDisplaySchema.parse(next); };
