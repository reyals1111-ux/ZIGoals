import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import type {ChatSummary} from './chats';
import type {PageArea} from './settings';
import {MAX_CHAT_AREAS, ZIGI} from './store/records';

/**
 * ZIGi's History (Session V Part 10): pinned chats first, then the rest by date, filtered by the page a chat started
 * on. That page is kept in `zigoals:zigi:v1` (chat id → area, the newest 200), written when a chat's first message is
 * asked, so the chat record itself stays version 1 when it uses nothing else new. Chats from before this part have no
 * page and show under "All pages" only.
 */
export type HistoryFilter = 'all' | PageArea;
type Storage_ = Pick<Storage, 'getItem' | 'setItem'>;
export function chatAreas(storage: Pick<Storage, 'getItem'>): Record<string, PageArea> {
  return readDeviceRecord(storage, ZIGI).data.chatAreas ?? {};
}
export function rememberChatArea(storage: Storage_, chatId: string, area: PageArea): void {
  if (chatAreas(storage)[chatId] === area) return;
  updateDeviceRecord(storage, ZIGI, current => {
    const areas = {...(current.chatAreas ?? {})};
    delete areas[chatId]; areas[chatId] = area;
    const ids = Object.keys(areas);
    for (const old of ids.slice(0, Math.max(0, ids.length - MAX_CHAT_AREAS))) delete areas[old];
    return {...current, chatAreas: areas};
  });
}
/** Deleted chats leave the index too (all of them when `ids` is omitted). */
export function forgetChatAreas(storage: Storage_, ids?: readonly string[]): void {
  const areas = chatAreas(storage);
  if (!Object.keys(areas).length || (ids && !ids.some(id => id in areas))) return;
  updateDeviceRecord(storage, ZIGI, current => { const next = {...(current.chatAreas ?? {})}; for (const id of ids ?? Object.keys(next)) delete next[id]; return {...current, chatAreas: next}; });
}
export function groupHistory(chats: readonly ChatSummary[], areas: Readonly<Record<string, PageArea>>, filter: HistoryFilter): {pinned: ChatSummary[]; recent: ChatSummary[]} {
  const shown = chats.filter(c => filter === 'all' || areas[c.id] === filter);
  return {pinned: shown.filter(c => c.pinned), recent: shown.filter(c => !c.pinned)};
}
