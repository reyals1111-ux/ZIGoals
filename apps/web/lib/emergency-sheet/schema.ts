import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (lane M, item 17, COMPETITORS M9 alternative): "If something happens to me", the family emergency sheet,
 * TIER 3 (stored format). A NEW device-only key, loose and versioned, holding only what the person types for it: where
 * each account's documents are, accounts not tracked in Wealth, wallets by their PUBLIC address, insurance and a note.
 * The accounts themselves are read from Wealth when the sheet is shown, never copied here. Every list and text is
 * bounded. It never holds keys or recovery words: the sheet refuses to print while any field looks like one
 * (./secrets.ts). Not synced; for Export everything and the account erase.
 */
export const EMERGENCY_SHEET_KEY = 'zigoals:emergency-sheet:v1';
export const MAX_SHEET_ROWS = 50, MAX_DOCUMENT_NOTES = 200, MAX_NOTE = 4000;
const rowId = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
const text = (max: number) => z.string().trim().max(max);
export const sheetAccountSchema = z.looseObject({id: rowId, name: text(80).min(1), institution: text(80).optional(), kind: text(40).optional(), value: text(40).optional(), documents: text(200).optional()});
export const sheetWalletSchema = z.looseObject({id: rowId, label: text(80).min(1), network: text(40).optional(), address: text(120).min(1), documents: text(200).optional()});
export const sheetInsuranceSchema = z.looseObject({id: rowId, provider: text(80).min(1), kind: text(60).optional(), reference: text(60).optional(), documents: text(200).optional()});
export const emergencySheetSchema = z.looseObject({
  version: z.literal(1),
  /** Where the documents of a Wealth account are, by the account's id. */
  documents: z.record(z.string().regex(/^[A-Za-z0-9-]{1,80}$/), text(200)).refine(r => Object.keys(r).length <= MAX_DOCUMENT_NOTES, `At most ${MAX_DOCUMENT_NOTES} notes.`).default({}),
  accounts: z.array(sheetAccountSchema).max(MAX_SHEET_ROWS).default([]),
  wallets: z.array(sheetWalletSchema).max(MAX_SHEET_ROWS).default([]),
  insurance: z.array(sheetInsuranceSchema).max(MAX_SHEET_ROWS).default([]),
  note: text(MAX_NOTE).optional(),
  updatedAt: z.iso.datetime({offset: true}).optional(),
});
export type EmergencySheet = z.infer<typeof emergencySheetSchema>;
export type SheetAccount = z.infer<typeof sheetAccountSchema>;
export type SheetWallet = z.infer<typeof sheetWalletSchema>;
export type SheetInsurance = z.infer<typeof sheetInsuranceSchema>;
export const emptyEmergencySheet = (): EmergencySheet => ({version: 1, documents: {}, accounts: [], wallets: [], insurance: []});
export const EMERGENCY_SHEET: DeviceRecordSpec<EmergencySheet> = {key: EMERGENCY_SHEET_KEY, schema: emergencySheetSchema, empty: emptyEmergencySheet};
