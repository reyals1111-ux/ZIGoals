import {getAccountScope} from '../account-session';
import {getAppStorage, isShowcase} from '../showcase-storage';
import {indexedDbChatStore, sessionChatStore, type Chat, type ChatStore} from './chats';
import {SHOWCASE_SCOPE} from './keys';

/**
 * Which records ZIGi reads and writes right now (ADR-012): the signed-in account's, the device's ("local"), or the
 * Showcase tab's. The scope keys the chats and the key store, so one account never sees another's conversations or
 * keys, and the demo leaves nothing behind.
 */
export const LOCAL_SCOPE = 'local';
export function currentAiScope(): string {
  if (isShowcase()) return SHOWCASE_SCOPE;
  try { return getAccountScope()?.toLowerCase() ?? LOCAL_SCOPE; } catch { return LOCAL_SCOPE; }
}
/** The chat store of the current scope: the tab's storage in Showcase, IndexedDB otherwise. */
export function currentChatStore(): ChatStore {
  const scope = currentAiScope();
  return scope === SHOWCASE_SCOPE ? sessionChatStore(getAppStorage(), scope) : indexedDbChatStore(scope);
}
/** Every chat of a store, oldest first, for the export (T4). Reads only; never a key. */
export async function exportChats(store: ChatStore): Promise<Chat[]> {
  const summaries = await store.list();
  const chats = await Promise.all(summaries.map(s => store.read(s.id)));
  return chats.flatMap(c => c ? [c] : []).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
