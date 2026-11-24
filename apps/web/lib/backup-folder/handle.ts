/**
 * Session AV lane 2 (N6 #193): the folder a scheduled copy is written into, chosen once with the browser's own folder
 * picker (File System Access: Chromium on computers). The browser gives a handle, kept in this device's IndexedDB
 * `zigoals-backup-folder-v1` per account scope (never exported, never synced: a handle means nothing on another device).
 * Writing needs the browser's permission for the folder; Chromium keeps it across visits when the person allows it on
 * every visit, else it asks again with a tap.
 */
export const BACKUP_FOLDER_DB = 'zigoals-backup-folder-v1';
const STORE = 'folders';

type Permission = 'granted' | 'denied' | 'prompt';
/** The parts of the File System Access API used here (not all of it is in TypeScript's DOM library). */
export type FolderHandle = {
  kind: 'directory'; name: string;
  queryPermission?: (d: {mode: 'readwrite'}) => Promise<Permission>;
  requestPermission?: (d: {mode: 'readwrite'}) => Promise<Permission>;
  getFileHandle: (name: string, o?: {create?: boolean}) => Promise<{createWritable: () => Promise<{write: (data: BufferSource | Blob) => Promise<void>; close: () => Promise<void>; abort?: () => Promise<void>}>}>;
};
type Picker = (o?: {id?: string; mode?: 'readwrite'; startIn?: string}) => Promise<FolderHandle>;

/** Whether this browser can write into a chosen folder (and the page is not in a frame, where the picker is refused). */
export function folderSupported(win: Window | undefined = typeof window === 'undefined' ? undefined : window): boolean {
  try { return !!win && typeof (win as unknown as {showDirectoryPicker?: unknown}).showDirectoryPicker === 'function' && win.isSecureContext && win.top === win; } catch { return false; }
}
/** The browser's folder picker (a user gesture); null when the person closes it. */
export async function pickFolder(win: Window = window): Promise<FolderHandle | null> {
  const picker = (win as unknown as {showDirectoryPicker: Picker}).showDirectoryPicker;
  try { return await picker.call(win, {id: 'zigoals-backups', mode: 'readwrite', startIn: 'documents'}); }
  catch (e) { if (e instanceof DOMException && e.name === 'AbortError') return null; throw e; }
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => { const r = indexedDB.open(BACKUP_FOLDER_DB, 1); r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); }; r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}
async function run<T>(mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  try { return await new Promise<T | undefined>((resolve, reject) => { const t = db.transaction(STORE, mode), r = work(t.objectStore(STORE)); t.oncomplete = () => resolve(r ? r.result : undefined); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error); }); }
  finally { db.close(); }
}
export const keepFolder = (scope: string, handle: FolderHandle) => run('readwrite', s => { s.put(handle, scope); });
export async function folderOf(scope: string): Promise<FolderHandle | null> {
  try { const h = await run<unknown>('readonly', s => s.get(scope)); return h && typeof h === 'object' && (h as FolderHandle).kind === 'directory' ? h as FolderHandle : null; } catch { return null; }
}
export const forgetFolder = (scope: string) => run('readwrite', s => { s.delete(scope); }).catch(() => undefined);
/** The permission to write there now: asking only when `ask` (a tap) and the browser would ask. */
export async function writable(handle: FolderHandle, ask: boolean): Promise<boolean> {
  try {
    const now = handle.queryPermission ? await handle.queryPermission({mode: 'readwrite'}) : 'granted';
    if (now === 'granted') return true;
    if (!ask || now === 'denied' || !handle.requestPermission) return false;
    return await handle.requestPermission({mode: 'readwrite'}) === 'granted';
  } catch { return false; }
}
/** Writes one file into the folder (a new file, or one of the same name replaced); a failed write leaves no half file. */
export async function writeInto(handle: FolderHandle, name: string, bytes: Uint8Array): Promise<void> {
  const file = await handle.getFileHandle(name, {create: true}), out = await file.createWritable();
  try { await out.write(new Uint8Array(bytes)); await out.close(); }
  catch (e) { await out.abort?.().catch(() => undefined); throw e; }
}
