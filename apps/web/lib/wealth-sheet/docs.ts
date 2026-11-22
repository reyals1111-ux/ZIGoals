import * as z from 'zod';
import {WEALTH_DOCS_DB_LITERAL} from '../av2-money-device-keys';

/**
 * Session AV lane 2 (money; Kubera's documents): a photo or PDF kept with an account (a statement, a deed, a policy), on
 * this device only — IndexedDB `zigoals-wealth-docs-v1` (one store, `docs`), never localStorage, never synced, never
 * uploaded; keyed `<scope>:<accountId>:<docId>` like the money photos (an account, the Showcase and the local person each
 * keep their own). A photo is shrunk on the device by the caller; a PDF is kept as chosen, at most 2 MB; at most 10 a
 * account and 200 a scope. In Export everything as files (`wealth-docs/…`) and deleted by Erase everything (the lead lists
 * the database). A document whose account is gone is kept until the person deletes it.
 */
export const WEALTH_DOCS_DB = WEALTH_DOCS_DB_LITERAL, WEALTH_DOCS_STORE = 'docs';
export const MAX_DOC_BYTES = 2_000_000, MAX_DOCS_PER_ACCOUNT = 10, MAX_DOCS = 200;
export const DOC_TYPES = ['image/webp', 'image/jpeg', 'application/pdf'] as const;
export const wealthDocSchema = z.object({
  accountId: z.string().regex(/^[0-9a-fA-F-]{8,40}$/), docId: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/),
  name: z.string().trim().min(1).max(120), blob: z.instanceof(Blob), type: z.enum(DOC_TYPES), bytes: z.number().int().min(1).max(MAX_DOC_BYTES), addedAt: z.iso.datetime(),
});
export type WealthDoc = z.infer<typeof wealthDocSchema>;
export const docKey = (scope: string, accountId: string, docId: string) => `${scope}:${accountId}:${docId}`;
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('This browser cannot keep documents.')); return; }
    const req = indexedDB.open(WEALTH_DOCS_DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(WEALTH_DOCS_STORE)) req.result.createObjectStore(WEALTH_DOCS_STORE); };
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error ?? new Error('The document store is unavailable.'));
  });
}
async function run<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(WEALTH_DOCS_STORE, mode), req = act(t.objectStore(WEALTH_DOCS_STORE));
    let result: T | undefined;
    if (req) req.onsuccess = () => { result = req.result; };
    t.oncomplete = () => { db.close(); resolve(result); };
    t.onerror = () => { db.close(); reject(t.error ?? new Error('The document was not kept.')); };
    t.onabort = () => { db.close(); reject(t.error ?? new Error('The document was not kept.')); };
  });
}
/** The keys of this scope's documents, as `<accountId>:<docId>`. */
export async function docKeys(scope: string): Promise<string[]> {
  const keys = (await run<IDBValidKey[]>('readonly', s => s.getAllKeys())) ?? [];
  return keys.map(String).filter(k => k.startsWith(`${scope}:`)).map(k => k.slice(scope.length + 1));
}
export async function getDoc(scope: string, accountId: string, docId: string): Promise<WealthDoc | null> {
  const parsed = wealthDocSchema.safeParse(await run<unknown>('readonly', s => s.get(docKey(scope, accountId, docId))));
  return parsed.success ? parsed.data : null;
}
/** The documents of one account, newest first (their blobs read too; at most 10). */
export async function accountDocs(scope: string, accountId: string): Promise<WealthDoc[]> {
  const ids = (await docKeys(scope)).filter(k => k.startsWith(`${accountId}:`)).map(k => k.slice(accountId.length + 1));
  const docs = (await Promise.all(ids.map(id => getDoc(scope, accountId, id)))).filter((d): d is WealthDoc => !!d);
  return docs.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}
/** Keeps a document; refuses an 11th for an account or a 201st on the device, in plain words. */
export async function putDoc(scope: string, doc: WealthDoc): Promise<void> {
  const value = wealthDocSchema.parse(doc), keys = await docKeys(scope);
  if (keys.filter(k => k.startsWith(`${value.accountId}:`)).length >= MAX_DOCS_PER_ACCOUNT) throw new Error(`At most ${MAX_DOCS_PER_ACCOUNT} documents an account; delete one first.`);
  if (keys.length >= MAX_DOCS) throw new Error(`At most ${MAX_DOCS} documents on this device; delete one first.`);
  await run('readwrite', s => s.put(value, docKey(scope, value.accountId, value.docId)));
}
export async function deleteDoc(scope: string, accountId: string, docId: string): Promise<void> { await run('readwrite', s => s.delete(docKey(scope, accountId, docId))); }
/**
 * Review b2a #4 (privacy): deletes every document of one scope (the Showcase's, when a Showcase starts or ends:
 * lib/showcase-storage.ts `clearShowcasePhotos`); every other scope's documents stay. Returns how many were deleted.
 */
export async function deleteWealthDocs(scope: string): Promise<number> {
  const keys = await docKeys(scope);
  if (keys.length) await run('readwrite', s => { for (const k of keys) s.delete(`${scope}:${k}`); });
  return keys.length;
}
/** The file name inside Export everything: the account id, the document's name made safe for a path. */
export const docFileName = (d: Pick<WealthDoc, 'accountId' | 'docId' | 'name' | 'type'>) => `wealth-docs/${d.accountId}/${d.docId}-${d.name.replace(/\.[A-Za-z0-9]{1,5}$/, '').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 60) || 'document'}.${d.type === 'application/pdf' ? 'pdf' : d.type === 'image/jpeg' ? 'jpg' : 'webp'}`;
/** Every kept document of this scope as a ZIP entry for Export everything (the lead adds it beside the money photos). */
export async function exportWealthDocEntries(scope: string, now = new Date()): Promise<{name: string; data: Uint8Array; modified: Date}[]> {
  const out: {name: string; data: Uint8Array; modified: Date}[] = [];
  let keys: string[] = []; try { keys = await docKeys(scope); } catch { return out; }
  for (const k of keys) { const [accountId = '', docId = ''] = k.split(':'); try { const d = await getDoc(scope, accountId, docId); if (d) out.push({name: docFileName(d), data: new Uint8Array(await d.blob.arrayBuffer()), modified: now}); } catch { /* skipped */ } }
  return out;
}
