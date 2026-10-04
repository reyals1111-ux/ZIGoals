import {z} from 'zod';
import {PROVIDER_IDS} from './providers';
import {AI_CHATS_SESSION_KEY} from './settings';

/**
 * Conversations (ADR-012): device-only, per scope (the account id or "local"), in IndexedDB `zigoals-ai-chats-v1`; in
 * Showcase they live in the tab's session storage under `zigoals:ai-chats:v1` through the app storage, so the demo
 * leaves nothing behind. A chat holds turns and the provider/model label, never a key and never the page context that
 * was attached. Zod-validated, read-tolerant (an unreadable record is skipped, never rewritten), bounded.
 */
export const AI_CHATS_DATABASE = 'zigoals-ai-chats-v1';
const STORE = 'chats', LIMIT_MS = 3000;
export const MAX_CHATS = 200, MAX_TURNS = 200, MAX_TURN_CHARS = 20_000, MAX_SHOWCASE_CHATS = 50;
const stamp = z.iso.datetime();
export const chatTurnSchema = z.strictObject({
  id: z.string().min(1).max(80),
  role: z.enum(['user', 'assistant']),
  text: z.string().max(MAX_TURN_CHARS),
  at: stamp,
  provider: z.enum(PROVIDER_IDS).nullable().optional(),
  model: z.string().max(200).nullable().optional(),
  usage: z.strictObject({input: z.number().int().min(0).nullable(), output: z.number().int().min(0).nullable()}).nullable().optional(),
  /** The reply stopped early: the output cap, a stop, or an error named here in plain words. */
  stopped: z.string().max(200).optional(),
});
export type ChatTurn = z.infer<typeof chatTurnSchema>;
export const chatSchema = z.strictObject({
  version: z.literal(1), id: z.string().min(1).max(80), scope: z.string().min(1).max(80), title: z.string().min(1).max(120),
  provider: z.enum(PROVIDER_IDS).nullable(), model: z.string().max(200).nullable(), createdAt: stamp, updatedAt: stamp,
  turns: z.array(chatTurnSchema).max(MAX_TURNS),
});
export type Chat = z.infer<typeof chatSchema>;
export type ChatSummary = Pick<Chat, 'id' | 'title' | 'updatedAt' | 'provider' | 'model'> & {turnCount: number};
export interface ChatStore {
  list(): Promise<ChatSummary[]>;
  read(id: string): Promise<Chat | null>;
  save(chat: Chat): Promise<void>;
  rename(id: string, title: string): Promise<void>;
  remove(id: string): Promise<void>;
  removeAll(): Promise<void>;
  search(query: string): Promise<ChatSummary[]>;
}
const summary = (chat: Chat): ChatSummary => ({id: chat.id, title: chat.title, updatedAt: chat.updatedAt, provider: chat.provider, model: chat.model, turnCount: chat.turns.length});
const byRecent = (a: ChatSummary, b: ChatSummary) => b.updatedAt.localeCompare(a.updatedAt);
/** A title from the first words of the first message. */
export function titleFor(text: string): string { const words = text.replace(/\s+/g, ' ').trim(); return (words.length > 60 ? `${words.slice(0, 57).trimEnd()}…` : words) || 'New chat'; }
export function newChat(scope: string, provider: Chat['provider'], model: string | null, now = new Date(), id = crypto.randomUUID()): Chat {
  const at = now.toISOString(); return {version: 1, id, scope, title: 'New chat', provider, model, createdAt: at, updatedAt: at, turns: []};
}
const matches = (chat: Chat, query: string) => { const q = query.trim().toLowerCase(); return !q || chat.title.toLowerCase().includes(q) || chat.turns.some(t => t.text.toLowerCase().includes(q)); };
const CAP_MESSAGE = `You have ${MAX_CHATS} saved chats on this device. Delete some in History before starting another.`;

function limited<T>(work: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false; const timer = setTimeout(() => { settled = true; reject(Error('Chat storage did not answer in time.')); }, LIMIT_MS);
    work.then(value => { clearTimeout(timer); if (!settled) { settled = true; resolve(value); } }, error => { clearTimeout(timer); if (!settled) { settled = true; reject(error); } });
  });
}
const answer = <T,>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const finished = (t: IDBTransaction) => new Promise<void>((resolve, reject) => { t.oncomplete = () => resolve(); t.onabort = () => reject(t.error ?? Error('Chat storage refused the change.')); t.onerror = () => undefined; });
const available = () => typeof indexedDB !== 'undefined' && !!indexedDB;
async function existing(): Promise<IDBDatabase | null> {
  if (!available()) return null;
  if (typeof indexedDB.databases === 'function' && !(await limited(indexedDB.databases())).some(d => d.name === AI_CHATS_DATABASE)) return null;
  return limited(new Promise<IDBDatabase | null>((resolve, reject) => {
    let missing = false, request: IDBOpenDBRequest;
    try { request = indexedDB.open(AI_CHATS_DATABASE); } catch (error) { reject(error); return; }
    request.onupgradeneeded = event => { if (event.oldVersion === 0) { missing = true; request.transaction?.abort(); } };
    request.onerror = event => { if (missing) { event.preventDefault(); resolve(null); } else reject(request.error); };
    request.onsuccess = () => { const db = request.result; if (!db.objectStoreNames.contains(STORE)) { db.close(); resolve(null); return; } db.onversionchange = () => db.close(); resolve(db); };
  }));
}
function writable(): Promise<IDBDatabase> {
  if (!available()) return Promise.reject(Error('Chat storage is unavailable in this browser.'));
  return limited(new Promise<IDBDatabase>((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try { request = indexedDB.open(AI_CHATS_DATABASE, 1); } catch (error) { reject(error); return; }
    request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
  }));
}
const slot = (scope: string, id: string) => `${scope}:${id}`;
const scopeRange = (scope: string) => IDBKeyRange.bound(`${scope}:`, `${scope}:￿`);
/** The IndexedDB store of one scope. Records of other scopes are never read. */
export function indexedDbChatStore(scope: string): ChatStore {
  const readAll = async (): Promise<Chat[]> => {
    const db = await existing(); if (!db) return [];
    try { const values = await answer(db.transaction(STORE, 'readonly').objectStore(STORE).getAll(scopeRange(scope))); return values.flatMap(value => { const parsed = chatSchema.safeParse(value); return parsed.success && parsed.data.scope === scope ? [parsed.data] : []; }); } finally { db.close(); }
  };
  const write = async (work: (store: IDBObjectStore) => void) => { const db = await writable(); try { const t = db.transaction(STORE, 'readwrite'); work(t.objectStore(STORE)); await finished(t); } finally { db.close(); } };
  return {
    list: async () => (await readAll()).map(summary).sort(byRecent),
    search: async query => (await readAll()).filter(chat => matches(chat, query)).map(summary).sort(byRecent),
    read: async id => { const db = await existing(); if (!db) return null; try { const parsed = chatSchema.safeParse(await answer(db.transaction(STORE, 'readonly').objectStore(STORE).get(slot(scope, id)))); return parsed.success && parsed.data.scope === scope ? parsed.data : null; } finally { db.close(); } },
    save: async chat => {
      const valid = chatSchema.parse({...chat, scope});
      const db = await writable();
      try {
        const t = db.transaction(STORE, 'readwrite'), store = t.objectStore(STORE), key = slot(scope, valid.id);
        const count = await answer(store.count(scopeRange(scope))), present = await answer(store.getKey(key));
        if (present === undefined && count >= MAX_CHATS) { t.abort(); throw Error(CAP_MESSAGE); }
        store.put(valid, key); await finished(t);
      } finally { db.close(); }
    },
    rename: async (id, title) => { const db = await existing(); if (!db) return; try { const t = db.transaction(STORE, 'readwrite'), store = t.objectStore(STORE), current = store.get(slot(scope, id)); current.onsuccess = () => { const parsed = chatSchema.safeParse(current.result); if (parsed.success) store.put(chatSchema.parse({...parsed.data, title, updatedAt: new Date().toISOString()}), slot(scope, id)); }; await finished(t); } finally { db.close(); } },
    remove: id => write(store => { store.delete(slot(scope, id)); }).catch(() => undefined),
    removeAll: () => write(store => { store.delete(scopeRange(scope)); }).catch(() => undefined),
  };
}
const sessionSchema = z.strictObject({version: z.literal(1), chats: z.array(chatSchema).max(MAX_SHOWCASE_CHATS)});
/** Showcase: the chats of the tab, in the app storage (session storage); unreadable bytes read as none and are replaced only by the next save. */
export function sessionChatStore(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, scope: string): ChatStore {
  const readAll = (): Chat[] => { try { const raw = storage.getItem(AI_CHATS_SESSION_KEY); if (raw === null) return []; const parsed = sessionSchema.safeParse(JSON.parse(raw)); return parsed.success ? parsed.data.chats.filter(c => c.scope === scope) : []; } catch { return []; } };
  const writeAll = (chats: Chat[]) => { storage.setItem(AI_CHATS_SESSION_KEY, JSON.stringify(sessionSchema.parse({version: 1, chats}))); };
  return {
    list: async () => readAll().map(summary).sort(byRecent),
    search: async query => readAll().filter(chat => matches(chat, query)).map(summary).sort(byRecent),
    read: async id => readAll().find(c => c.id === id) ?? null,
    save: async chat => { const valid = chatSchema.parse({...chat, scope}), rest = readAll().filter(c => c.id !== valid.id); if (rest.length >= MAX_SHOWCASE_CHATS) throw Error(`Showcase keeps at most ${MAX_SHOWCASE_CHATS} chats.`); writeAll([...rest, valid]); },
    rename: async (id, title) => { writeAll(readAll().map(c => c.id === id ? chatSchema.parse({...c, title, updatedAt: new Date().toISOString()}) : c)); },
    remove: async id => { writeAll(readAll().filter(c => c.id !== id)); },
    removeAll: async () => { storage.removeItem(AI_CHATS_SESSION_KEY); },
  };
}
/** Account deletion or erase: every chat of that scope leaves this device (keys are the key store's business). */
export async function forgetChats(scope: string): Promise<void> { await indexedDbChatStore(scope).removeAll(); }
