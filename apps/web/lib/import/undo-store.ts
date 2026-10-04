import {IMPORT_UNDO_DAYS, IMPORT_UNDO_KEY, MAX_IMPORT_RECORDS, emptyImportUndo, importUndoSchema, type ImportRecord, type ImportUndo} from './undo-schema';

type Read = Pick<Storage, 'getItem'>;
type ReadWrite = Pick<Storage, 'getItem' | 'setItem'>;
/** Unreadable bytes mean "nothing to undo" (`unreadable` says so) and are never rewritten; imports still work. */
export function readImportUndo(storage: Read): {data: ImportUndo; unreadable: boolean} {
  let raw: string | null;
  try { raw = storage.getItem(IMPORT_UNDO_KEY); } catch { return {data: emptyImportUndo(), unreadable: true}; }
  if (raw === null) return {data: emptyImportUndo(), unreadable: false};
  try { const parsed = importUndoSchema.safeParse(JSON.parse(raw)); return parsed.success ? {data: parsed.data, unreadable: false} : {data: emptyImportUndo(), unreadable: true}; } catch { return {data: emptyImportUndo(), unreadable: true}; }
}
/** The records still undoable now. */
export const liveImports = (data: ImportUndo, now: Date) => data.imports.filter(r => Date.parse(r.expiresAt) > now.getTime());
/** Writes a change; expired records are pruned on every save. Throws, with nothing written, when the key is unreadable or storage refuses. */
export function updateImportUndo(storage: ReadWrite, now: Date, change: (current: ImportUndo) => ImportUndo): ImportUndo {
  const current = readImportUndo(storage);
  if (current.unreadable) throw Error('Your recent imports on this device could not be read. They were not changed.');
  const changed = change(current.data), next = importUndoSchema.parse({version: 1, imports: liveImports(changed, now).slice(0, MAX_IMPORT_RECORDS)});
  storage.setItem(IMPORT_UNDO_KEY, JSON.stringify(next));
  return next;
}
export const expiry = (at: Date) => new Date(at.getTime() + IMPORT_UNDO_DAYS * 86_400_000).toISOString();
/** A new import goes first; the 21st drops the oldest. */
export const recordImport = (current: ImportUndo, record: Omit<ImportRecord, 'expiresAt'>): ImportUndo => ({...current, imports: [{...record, expiresAt: expiry(new Date(record.at))}, ...current.imports].slice(0, MAX_IMPORT_RECORDS)});
export const forgetImport = (current: ImportUndo, id: string): ImportUndo => ({...current, imports: current.imports.filter(r => r.id !== id)});
/** Hides the page banner; the record stays in "Recent imports" until undone or expired. */
export const dismissImport = (current: ImportUndo, id: string): ImportUndo => ({...current, imports: current.imports.map(r => r.id === id ? {...r, dismissed: true} : r)});
/** The person's explicit choice to replace an unreadable ledger: the old bytes are copied to a recovery key first. */
export function startOverImportUndo(storage: ReadWrite): ImportUndo {
  const previous = storage.getItem(IMPORT_UNDO_KEY);
  if (previous !== null) storage.setItem(`${IMPORT_UNDO_KEY}:recovery:${crypto.randomUUID()}`, previous);
  const next = emptyImportUndo();
  storage.setItem(IMPORT_UNDO_KEY, JSON.stringify(next));
  return next;
}
