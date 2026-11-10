/**
 * Session AL (lane L7; AK's known limitation D7, ADR-036 line 1019): what the person is typing in ZIGi's composer lives
 * here, in this page's memory, not only in the composer's own state. The switch from on-device to connected answers (and
 * WebKit's remount around it) mounts a new composer; it starts from this draft, so the typed words survive. Per scope (an
 * account change never carries words across), in memory only: nothing is stored on the device or sent anywhere.
 */
const drafts = new Map<string, string>();
export const readDraft = (scope: string): string => drafts.get(scope) ?? '';
export function writeDraft(scope: string, text: string): void { if (text) drafts.set(scope, text.slice(0, 20_000)); else drafts.delete(scope); }
export const clearDrafts = (): void => drafts.clear();

/**
 * Session AL (lane L7; Professor PR-011/PR-025/PR-041, Moscow MO-054/MO-062, P-PR-07, P-MO-17): the conversation open in
 * ZIGi's panel, so a panel that is mounted again (an error boundary's reset, WebKit's remount, the switch to connected
 * answers) reopens it instead of an empty chat. Only the chat's id per scope; the chat itself stays in the chat store, and
 * a chat that is not kept is never noted.
 * Second pass (PR-041: the panel found closed after ~10 minutes, "the chat was lost on reopen"): the id is also kept in
 * this TAB's session storage (`zigoals:zigi-open-chat:v1`, an id and a time per scope, nothing of the chat), so even after
 * a full reload of the page ZIGi's panel reopens the same conversation for 30 minutes. Closing the tab forgets it.
 */
export const OPEN_CHAT_KEY = 'zigoals:zigi-open-chat:v1';
export const OPEN_CHAT_KEEP_MS = 30 * 60_000;
type Kept = Record<string, {id: string; at: number}>;
const openChats = new Map<string, string>();
const tab = (): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null => { try { return typeof window === 'undefined' ? null : window.sessionStorage; } catch { return null; } };
function readKept(store: ReturnType<typeof tab>): Kept {
  try { const raw = JSON.parse(store?.getItem(OPEN_CHAT_KEY) ?? '{}') as unknown; return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Kept : {}; } catch { return {}; }
}
export function noteOpenChat(scope: string, id: string | null, now = Date.now(), store = tab()): void {
  if (id) openChats.set(scope, id); else openChats.delete(scope);
  if (!store) return;
  try {
    const kept = readKept(store);
    if (id) kept[scope] = {id: id.slice(0, 200), at: now}; else delete kept[scope];
    if (Object.keys(kept).length) store.setItem(OPEN_CHAT_KEY, JSON.stringify(kept)); else store.removeItem(OPEN_CHAT_KEY);
  } catch { /* a refused store keeps it in memory only */ }
}
export function openChatFor(scope: string, now = Date.now(), store = tab()): string | null {
  const here = openChats.get(scope); if (here) return here;
  const kept = readKept(store)[scope];
  return kept && typeof kept.id === 'string' && typeof kept.at === 'number' && now - kept.at >= 0 && now - kept.at <= OPEN_CHAT_KEEP_MS ? kept.id : null;
}
/** Tests: forget what this page holds in memory (as a reload does). */
export const forgetOpenChatsInMemory = (): void => openChats.clear();
