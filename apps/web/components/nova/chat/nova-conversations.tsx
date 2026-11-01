'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {ChatSummary} from '../../../lib/ai/chats';
import {AREA_LABELS} from '../../../lib/ai/context/pages';
import {forgetChatAreas, groupHistory} from '../../../lib/ai/history';
import {currentChatStore} from '../../../lib/ai/scope';
import {chatOrigins, delegatedTurns, forgetNovaChats, type ChatOrigin} from '../../../lib/nova/bridge';
import {chatFileName, chatMarkdown} from '../../../lib/nova/bridge-export';
import {getAppStorage} from '../../../lib/showcase-storage';
import {formatDateTime} from '../../../lib/visual-format';
import {ReplyIcon} from '../../ai/reply-actions';
import type {ChatSession} from '../../ai/use-chat-session';

/**
 * NOVA's conversations (Session AK, owner follow-up 2 N2): the one list NOVA and ZIGi share (the same chats on this
 * device), each with where it started (NOVA, or ZIGi on a page), searchable, pinned ones first. Open, pin, save as a
 * Markdown file (made here, downloaded by the browser; nothing is sent) and delete, which hides at once and offers Undo
 * for 8 seconds before the chat leaves this device (as ZIGi's History does).
 */
const UNDO_MS = 8000;
export function originLabel(origin: ChatOrigin | undefined, persona: string): string {
  if (!origin) return '';
  return origin.by === 'nova' ? `Started in ${persona}` : origin.area ? `Started with ZIGi on ${AREA_LABELS[origin.area]}` : 'Started with ZIGi';
}
/** Saves one conversation as a Markdown file on this device (the browser's own download). */
export async function downloadChat(chatId: string, persona: string): Promise<boolean> {
  const chat = await currentChatStore().read(chatId); if (!chat) return false;
  const storage = getAppStorage(), origin = chatOrigins(storage, [chat.id])[chat.id]!;
  const text = chatMarkdown({chat, origin, delegated: delegatedTurns(storage), persona});
  const url = URL.createObjectURL(new Blob([text], {type: 'text/markdown;charset=utf-8'})), link = document.createElement('a');
  link.href = url; link.download = chatFileName(chat); document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
export function NovaConversations({session, persona, onOpen}: {session: ChatSession; persona: string; onOpen: () => void}) {
  const [items, setItems] = useState<ChatSummary[] | null>(null), [query, setQuery] = useState(''), [origins, setOrigins] = useState<Record<string, ChatOrigin>>({}), [error, setError] = useState(''), [note, setNote] = useState('');
  const [pending, setPending] = useState<{id: string; title: string} | null>(null), pendingRef = useRef<{id: string; title: string} | null>(null), timer = useRef<number | null>(null);
  const {list, search} = session;
  const refresh = useCallback(async () => {
    try { const found = query.trim() ? await search(query.trim()) : await list(); setItems(found); setError(''); try { setOrigins(chatOrigins(getAppStorage(), found.map(c => c.id))); } catch { setOrigins({}); } }
    catch { setError('Your conversations could not be read on this device.'); }
  }, [list, search, query]);
  useEffect(() => { if (!query.trim()) { void refresh(); return; } const t = window.setTimeout(() => void refresh(), 180); return () => window.clearTimeout(t); }, [refresh, query]);
  const commit = useCallback(async () => {
    const p = pendingRef.current; pendingRef.current = null; setPending(null);
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
    if (!p) return;
    try { await session.remove(p.id); const storage = getAppStorage(); forgetChatAreas(storage, [p.id]); forgetNovaChats(storage, [p.id]); }
    catch { setError('A conversation could not be deleted on this device.'); }
    await refresh();
  }, [session, refresh]);
  const latest = useRef(commit);
  useEffect(() => { latest.current = commit; }, [commit]);
  useEffect(() => () => { void latest.current(); }, []);
  const remove = async (item: ChatSummary) => { await commit(); pendingRef.current = {id: item.id, title: item.title}; setPending({id: item.id, title: item.title}); timer.current = window.setTimeout(() => void commit(), UNDO_MS); };
  const undo = () => { if (timer.current !== null) window.clearTimeout(timer.current); timer.current = null; pendingRef.current = null; setPending(null); };
  const shown = (items ?? []).filter(item => item.id !== pending?.id);
  const {pinned, recent} = groupHistory(shown, {}, 'all');
  const details = (item: ChatSummary) => [formatDateTime(item.updatedAt), `${item.turnCount} ${item.turnCount === 1 ? 'turn' : 'turns'}`, originLabel(origins[item.id], persona)].filter(Boolean).join(' · ');
  const row = (item: ChatSummary) => <li key={item.id} className={item.id === session.chat.id ? 'nova-list-current' : undefined}>
    <button type="button" className="nova-list-open" title={`${item.title}\n${details(item)}`} onClick={() => void session.open(item.id).then(onOpen)}>
      <strong>{item.title}</strong><small>{details(item)}</small>
    </button>
    <span className="nova-list-actions">
      <ReplyIcon glyph="pin" label={item.pinned ? `Unpin “${item.title}”` : `Pin “${item.title}”`} tip={item.pinned ? 'Unpin' : 'Pin to the top'} pressed={!!item.pinned} onClick={() => void session.pin(item.id, !item.pinned).then(refresh)}/>
      <ReplyIcon glyph="copy" label={`Save “${item.title}” as a Markdown file`} tip="Save as Markdown" onClick={() => void downloadChat(item.id, persona).then(ok => setNote(ok ? `Saved “${item.title}” as a Markdown file on this device.` : 'That conversation could not be read.'))}/>
      <ReplyIcon glyph="delete" label={`Delete “${item.title}”`} tip="Delete" onClick={() => void remove(item)}/>
    </span>
  </li>;
  return <section className="nova-list" aria-label="Conversations">
    <div className="nova-list-tools">
      <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search conversations" aria-label="Search conversations"/>
    </div>
    <p className="ai-note">One list for {persona} and ZIGi: what you said to either is here, on this device only.</p>
    {pending && <p className="ai-note nova-list-undo" role="status">“{pending.title}” deleted. <button type="button" className="text-link" onClick={undo}>Undo</button></p>}
    {note && <p className="ai-note" role="status">{note}</p>}
    {error && <p className="ai-card-error" role="alert">{error}</p>}
    {items && pinned.length + recent.length === 0 && <p className="ai-note">{query ? 'No conversation matches.' : `No conversations yet. Ask ${persona} or ZIGi anything; it is kept here, on this device.`}</p>}
    {pinned.length > 0 && <><h3 className="nova-list-heading">Pinned</h3><ul className="nova-list-items" aria-label="Pinned conversations">{pinned.map(row)}</ul></>}
    {recent.length > 0 && <>{pinned.length > 0 && <h3 className="nova-list-heading">Recent</h3>}<ul className="nova-list-items" aria-label={pinned.length ? 'Other conversations' : 'Conversations'}>{recent.map(row)}</ul></>}
  </section>;
}
