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
 * ZIGi's panel, in this page's memory, so a panel that is mounted again (an error boundary's reset, WebKit's remount, the
 * switch to connected answers) reopens it instead of an empty chat. Only the chat's id per scope; the chat itself stays in
 * the chat store, and a chat that is not kept is never noted. A full reload starts fresh, as before (History has the chat).
 */
const openChats = new Map<string, string>();
export function noteOpenChat(scope: string, id: string | null): void { if (id) openChats.set(scope, id); else openChats.delete(scope); }
export const openChatFor = (scope: string): string | null => openChats.get(scope) ?? null;
