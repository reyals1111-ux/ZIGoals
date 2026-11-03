import {balanceOn, moneyText} from '../accounts/net-worth';
import type {Account} from '../accounts/schema';
import {MAX_DOCUMENT_NOTES, MAX_SHEET_ROWS, emergencySheetSchema, type EmergencySheet, type SheetAccount, type SheetInsurance, type SheetWallet} from './schema';
import {findSecrets, type SecretFinding} from './secrets';

/**
 * Session AK (lane M, item 17): the sheet's content, pure. Wealth's accounts (name, institution, kind, the latest
 * balance as an approximate value) with the person's note on where the documents are, then what they typed: other
 * accounts, wallets by public address, insurance and a note. `printable` refuses while any field looks like a key or
 * recovery words, and names the field.
 */
export type SheetRow = {name: string; institution: string; kind: string; value: string; documents: string};
export type SheetView = {accounts: SheetRow[]; wallets: SheetWallet[]; insurance: SheetInsurance[]; note: string};
export function sheetView(sheet: EmergencySheet, accounts: readonly Account[], today: string, kindLabel: (kind: Account['kind']) => string = k => k, dateLabel: (day: string) => string = d => d): SheetView {
  const fromWealth = accounts.filter(a => !a.archivedAt).map(a => {
    const b = balanceOn(a, today);
    return {name: a.name, institution: a.institution ?? '', kind: kindLabel(a.kind), value: b ? `about ${moneyText(b)} ${a.currency} (${dateLabel(b.date)})` : 'no balance entered', documents: sheet.documents[a.id] ?? ''};
  });
  const typed = sheet.accounts.map(a => ({name: a.name, institution: a.institution ?? '', kind: a.kind ?? '', value: a.value ?? '', documents: a.documents ?? ''}));
  return {accounts: [...fromWealth, ...typed], wallets: sheet.wallets, insurance: sheet.insurance, note: sheet.note ?? ''};
}
/** Every text on the sheet, each with a label the person can find. */
export function sheetFields(view: SheetView): [string, string][] {
  return [
    ...view.accounts.flatMap((a, i): [string, string][] => [[`Account ${i + 1} (${a.name})`, `${a.name} ${a.institution} ${a.kind} ${a.value}`], [`Account ${i + 1} (${a.name}): where the documents are`, a.documents]]),
    ...view.wallets.flatMap((w, i): [string, string][] => [[`Wallet ${i + 1} (${w.label})`, `${w.label} ${w.network ?? ''}`], [`Wallet ${i + 1} (${w.label}): address`, w.address], [`Wallet ${i + 1} (${w.label}): where the documents are`, w.documents ?? '']]),
    ...view.insurance.flatMap((x, i): [string, string][] => [[`Insurance ${i + 1} (${x.provider})`, `${x.provider} ${x.kind ?? ''} ${x.reference ?? ''}`], [`Insurance ${i + 1} (${x.provider}): where the documents are`, x.documents ?? '']]),
    ['The note', view.note],
  ];
}
export function printable(view: SheetView): {ok: true} | {ok: false; findings: SecretFinding[]} {
  const findings = findSecrets(sheetFields(view));
  return findings.length ? {ok: false, findings} : {ok: true};
}
/** A public address, as typed: one piece, no spaces, 20 to 120 characters. */
export const addressIssue = (address: string): string | null => /^[A-Za-z0-9:._-]{20,120}$/.test(address.trim()) ? null : 'Enter the public address in one piece (20 to 120 letters and digits, no spaces).';
type Rows = {accounts: SheetAccount; wallets: SheetWallet; insurance: SheetInsurance};
/** Adds or replaces a typed row; throws with the reason (the record's limits). */
export function putRow<K extends keyof Rows>(sheet: EmergencySheet, list: K, row: Rows[K], now: Date): EmergencySheet {
  const rows = sheet[list] as Rows[K][], at = rows.findIndex(r => r.id === row.id);
  if (at < 0 && rows.length >= MAX_SHEET_ROWS) throw Error(`Up to ${MAX_SHEET_ROWS} rows in each list.`);
  const next = at < 0 ? [...rows, row] : rows.map(r => r.id === row.id ? row : r);
  return emergencySheetSchema.parse({...sheet, [list]: next, updatedAt: now.toISOString()});
}
export function removeRow(sheet: EmergencySheet, list: keyof Rows, id: string, now: Date): EmergencySheet {
  return emergencySheetSchema.parse({...sheet, [list]: (sheet[list] as {id: string}[]).filter(r => r.id !== id), updatedAt: now.toISOString()});
}
export function setDocuments(sheet: EmergencySheet, accountId: string, text: string, now: Date): EmergencySheet {
  const documents = {...sheet.documents};
  if (text.trim()) documents[accountId] = text.trim().slice(0, 200); else delete documents[accountId];
  if (Object.keys(documents).length > MAX_DOCUMENT_NOTES) throw Error(`Up to ${MAX_DOCUMENT_NOTES} document notes.`);
  return emergencySheetSchema.parse({...sheet, documents, updatedAt: now.toISOString()});
}
export const setNote = (sheet: EmergencySheet, note: string, now: Date): EmergencySheet => emergencySheetSchema.parse({...sheet, note: note.trim() ? note : undefined, updatedAt: now.toISOString()});
