'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {ChatSummary} from '../../lib/ai/chats';
import {AREA_LABELS} from '../../lib/ai/context/pages';
import {chatAreas, forgetChatAreas, groupHistory, type HistoryFilter} from '../../lib/ai/history';
import {PAGE_AREAS, type PageArea} from '../../lib/ai/settings';
import {getAppStorage} from '../../lib/showcase-storage';
import {ReplyIcon} from './reply-actions';
import {formatDateTime} from '../../lib/visual-format';
import type {ChatSession} from './use-chat-session';
import './chat-polish.css';

/**
 * ZIGi's History (ADR-012; Session V Part 10 adds Pin, the "Pinned" section and the filter by the page a chat started
 * on): search, rename and delete stay as they were. Everything is on this device; pinning is the only change it makes
 * to a chat (a pinned chat is saved as a version 2 record). Session Z-Cloud panel polish round 2: each row is one line
 * of title and one of details (an ellipsis when they do not fit; the whole text is the row's tooltip), and Pin, Rename
 * and Delete are icon buttons with the same names, each 44 px with a tooltip. Session AB-Cloud Part 8 (ADR-023 C26,
 * persona #10): Delete and "Delete all chats" hide at once and offer Undo for 8 seconds; the chats are removed only when
 * that time ends, another delete replaces it, or History closes.
 */
const UNDO_MS = 8000;
type Pending = {ids: string[] | 'all'; text: string};
export function HistoryView({session, onOpen}: {session: ChatSession; onOpen: () => void}) {
  const [items, setItems] = useState<ChatSummary[] | null>(null), [query, setQuery] = useState(''), [renaming, setRenaming] = useState<{id: string; title: string} | null>(null), [confirmClear, setConfirmClear] = useState(false), [error, setError] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>('all'), [areas, setAreas] = useState<Record<string, PageArea>>({});
  const {list, search} = session;
  const [pending, setPending] = useState<Pending | null>(null), pendingRef = useRef<Pending | null>(null), timer = useRef<number | null>(null);
  const refresh = useCallback(async () => {
    try { setItems(query.trim() ? await search(query.trim()) : await list()); setError(''); } catch { setError('Your chats could not be read on this device.'); }
    try { setAreas(chatAreas(getAppStorage())); } catch { setAreas({}); }
  }, [list, search, query]);
  // The search waits for a short pause in typing; the list itself loads at once.
  useEffect(() => { if (!query.trim()) { void refresh(); return; } const t = window.setTimeout(() => void refresh(), 180); return () => window.clearTimeout(t); }, [refresh, query]);
  const forget = (ids?: string[]) => { try { forgetChatAreas(getAppStorage(), ids); } catch { /* the index is a convenience */ } };
  // The removal itself, when the Undo time ends or another delete replaces it.
  const commit = useCallback(async () => {
    const p = pendingRef.current; pendingRef.current = null; setPending(null);
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
    if (!p) return;
    try { if (p.ids === 'all') { await session.removeAll(); forget(); } else { for (const id of p.ids) await session.remove(id); forget(p.ids); } }
    catch { setError('A chat could not be deleted on this device.'); }
    await refresh();
  }, [session, refresh]);
  const remove = async (next: Pending) => {
    await commit();
    pendingRef.current = next; setPending(next); setConfirmClear(false);
    timer.current = window.setTimeout(() => void commit(), UNDO_MS);
  };
  const undo = () => { if (timer.current !== null) window.clearTimeout(timer.current); timer.current = null; pendingRef.current = null; setPending(null); };
  // Closing History ends the Undo time: what was deleted is removed then (only on close, not when the search changes).
  const latest = useRef(commit);
  useEffect(() => { latest.current = commit; }, [commit]);
  useEffect(() => () => { void latest.current(); }, []);
  const hidden = (item: ChatSummary) => pending !== null && (pending.ids === 'all' || pending.ids.includes(item.id));
  const {pinned, recent} = groupHistory((items ?? []).filter(item => !hidden(item)), areas, filter);
  const details = (item: ChatSummary) => `${formatDateTime(item.updatedAt)} · ${item.turnCount} turns${item.model ? ` · ${item.model}` : ''}${areas[item.id] ? ` · ${AREA_LABELS[areas[item.id]!]}` : ''}`;
  const row = (item: ChatSummary) => <li key={item.id} className={item.id === session.chat.id ? 'ai-history-current' : undefined}>
    {renaming?.id === item.id ? <form className="ai-history-rename" onSubmit={e => { e.preventDefault(); void session.rename(item.id, renaming.title).then(() => { setRenaming(null); return refresh(); }); }}><input value={renaming.title} onChange={e => setRenaming({id: item.id, title: e.target.value})} maxLength={120} aria-label="Chat title" autoFocus/><button type="submit" className="secondary">Save</button><button type="button" className="text-link" onClick={() => setRenaming(null)}>Cancel</button></form>
      : <><button type="button" className="ai-history-open" title={`${item.title}\n${details(item)}`} onClick={() => void session.open(item.id).then(onOpen)}><strong>{item.title}</strong><small>{details(item)}</small></button>
        <span className="ai-history-actions">
          <ReplyIcon glyph="pin" label="Pin" tip={item.pinned ? 'Unpin' : 'Pin to the top'} className="ai-history-pin" pressed={!!item.pinned} onClick={() => void session.pin(item.id, !item.pinned).then(refresh)}/>
          <ReplyIcon glyph="edit" label="Rename" tip="Rename" onClick={() => setRenaming({id: item.id, title: item.title})}/>
          <ReplyIcon glyph="delete" label="Delete" tip="Delete" onClick={() => void remove({ids: [item.id], text: `“${item.title}” deleted.`})}/>
        </span></>}
  </li>;
  return <div className="ai-history" role="region" aria-label="Chat history">
    <div className="ai-history-tools">
      <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your chats" aria-label="Search your chats"/>
      <label className="ai-history-filter">Page<select value={filter} onChange={e => setFilter(e.target.value as HistoryFilter)}><option value="all">All pages</option>{PAGE_AREAS.map(a => <option key={a} value={a}>{AREA_LABELS[a]}</option>)}</select></label>
      {items && items.filter(item => !hidden(item)).length > 0 && (confirmClear ? <span className="ai-card-actions"><button type="button" className="secondary" onClick={() => void remove({ids: 'all', text: 'All chats deleted.'})}>Delete all chats</button><button type="button" className="text-link" onClick={() => setConfirmClear(false)}>Keep them</button></span> : <button type="button" className="text-link" onClick={() => setConfirmClear(true)}>Clear all</button>)}
    </div>
    {pending && <p className="ai-note ai-history-undo" role="status">{pending.text} <button type="button" className="text-link" onClick={undo}>Undo</button></p>}
    {error && <p className="ai-card-error" role="alert">{error}</p>}
    {items && pinned.length + recent.length === 0 && <p className="ai-note">No saved chats on this device{query || filter !== 'all' ? ' match' : ''}.</p>}
    {pinned.length > 0 && <section aria-label="Pinned chats"><h3 className="ai-history-heading">Pinned</h3><ul className="ai-history-list">{pinned.map(row)}</ul></section>}
    {recent.length > 0 && (pinned.length > 0 ? <section aria-label="Other chats"><h3 className="ai-history-heading">Recent</h3><ul className="ai-history-list">{recent.map(row)}</ul></section> : <ul className="ai-history-list">{recent.map(row)}</ul>)}
  </div>;
}
