import {z} from 'zod';

/**
 * The import undo ledger (Session P, PR 3, W3 and I1): which records an import created, so one tap removes exactly
 * them while nothing was touched. One device key: {version: 1, imports: ImportRecord[]} (newest first, at most 20,
 * each kept seven days; `dismissed` hides the page banner). It stays device-only: the records it names are ordinary Portfolio, Wealth and Health records.
 */
export const IMPORT_UNDO_KEY = 'zigoals:import-undo:v1';
export const MAX_IMPORT_RECORDS = 20, IMPORT_UNDO_DAYS = 7;
const instant = z.iso.datetime();
export const importRecordSchema = z.strictObject({
  id: z.uuid(), kind: z.enum(['portfolio', 'wealth', 'nutrition']), at: instant, label: z.string().min(1).max(120),
  portfolioId: z.string().min(1).max(100).optional(), createdIds: z.array(z.string().min(1).max(100)).max(20_000), expiresAt: instant,
  /** The page banner was dismissed; the record stays undoable from "Recent imports". */
  dismissed: z.boolean().optional(),
});
export type ImportRecord = z.infer<typeof importRecordSchema>;
export const importUndoSchema = z.strictObject({version: z.literal(1), imports: z.array(importRecordSchema).max(MAX_IMPORT_RECORDS)});
export type ImportUndo = z.infer<typeof importUndoSchema>;
export const emptyImportUndo = (): ImportUndo => ({version: 1, imports: []});
