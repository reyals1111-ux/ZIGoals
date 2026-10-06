'use client';
import {useCallback, useEffect, useState} from 'react';
import type {ChatSummary} from '../../lib/ai/chats';
import {AREA_LABELS} from '../../lib/ai/context/pages';
import {chatAreas, forgetChatAreas, groupHistory, type HistoryFilter} from '../../lib/ai/history';
import {PAGE_AREAS, type PageArea} from '../../lib/ai/settings';
import {getAppStorage} from '../../lib/showcase-storage';
import type {ChatSession} from './use-chat-session';
import './chat-polish.css';

/**
 * ZIGi's History (ADR-012; Session V Part 10 adds Pin, the "Pinned" section and the filter by the page a chat started
 * on): search, rename and delete stay as they were. Everything is on this device; pinning is the only change it makes
 * to a chat (a pinned chat is saved as a version 2 record).
 */
export function HistoryView({session, onOpen}: {session: ChatSession; onOpen: () => void}) {
  const [items, setItems] = useState<ChatSummary[] | null>(null), [query, setQuery] = useState(''), [renaming, setRenaming] = useState<{id: string; title: string} | null>(null), [confirmClear, setConfirmClear] = useState(false), [error, setError] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>('all'), [areas, setAreas] = useState<Record<string, PageArea>>({});
  const {list, search} = session;
  const refresh = useCallback(async () => {
    try { setItems(query.trim() ? await search(query.trim()) : await list()); setError(''); } catch { setError('Your chats could not be read on this device.'); }
    try { setAreas(chatAreas(getAppStorage())); } catch { setAreas({}); }
  }, [list, search, query]);
  // The search waits for a short pause in typing; the list itself loads at once.
  useEffect(() => { if (!query.trim()) { void refresh(); return; } const t = window.setTimeout(() => void refresh(), 180); return () => window.clearTimeout(t); }, [refresh, query]);
  const forget = (ids?: string[]) => { try { forgetChatAreas(getAppStorage(), ids); } catch { /* the index is a convenience */ } };
  const {pinned, recent} = groupHistory(items ?? [], areas, filter);
  const row = (item: ChatSummary) => <li key={item.id} className={item.id === session.chat.id ? 'ai-history-current' : undefined}>
    {renaming?.id === item.id ? <form className="ai-history-rename" onSubmit={e => { e.preventDefault(); void session.rename(item.id, renaming.title).then(() => { setRenaming(null); return refresh(); }); }}><input value={renaming.title} onChange={e => setRenaming({id: item.id, title: e.target.value})} maxLength={120} aria-label="Chat title" autoFocus/><button type="submit" className="secondary">Save</button><button type="button" className="text-link" onClick={() => setRenaming(null)}>Cancel</button></form>
      : <><button type="button" className="ai-history-open" onClick={() => void session.open(item.id).then(onOpen)}><strong>{item.title}</strong><small>{new Date(item.updatedAt).toLocaleString()} · {item.turnCount} turns{item.model ? ` · ${item.model}` : ''}{areas[item.id] ? ` · ${AREA_LABELS[areas[item.id]!]}` : ''}</small></button>
        <span className="ai-history-actions">
          <button type="button" className="text-link ai-history-pin" aria-pressed={!!item.pinned} onClick={() => void session.pin(item.id, !item.pinned).then(refresh)}>Pin</button>
          <button type="button" className="text-link" onClick={() => setRenaming({id: item.id, title: item.title})}>Rename</button>
          <button type="button" className="text-link" onClick={() => void session.remove(item.id).then(() => { forget([item.id]); return refresh(); })}>Delete</button>
        </span></>}
  </li>;
  return <div className="ai-history" aria-label="Chat history">
    <div className="ai-history-tools">
      <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your chats" aria-label="Search your chats"/>
      <label className="ai-history-filter">Page<select value={filter} onChange={e => setFilter(e.target.value as HistoryFilter)}><option value="all">All pages</option>{PAGE_AREAS.map(a => <option key={a} value={a}>{AREA_LABELS[a]}</option>)}</select></label>
      {items && items.length > 0 && (confirmClear ? <span className="ai-card-actions"><button type="button" className="secondary" onClick={() => void session.removeAll().then(() => { forget(); return refresh(); })}>Delete all chats</button><button type="button" className="text-link" onClick={() => setConfirmClear(false)}>Keep them</button></span> : <button type="button" className="text-link" onClick={() => setConfirmClear(true)}>Clear all</button>)}
    </div>
    {error && <p className="ai-card-error" role="alert">{error}</p>}
    {items && pinned.length + recent.length === 0 && <p className="ai-note">No saved chats on this device{query || filter !== 'all' ? ' match' : ''}.</p>}
    {pinned.length > 0 && <section aria-label="Pinned chats"><h3 className="ai-history-heading">Pinned</h3><ul className="ai-history-list">{pinned.map(row)}</ul></section>}
    {recent.length > 0 && (pinned.length > 0 ? <section aria-label="Other chats"><h3 className="ai-history-heading">Recent</h3><ul className="ai-history-list">{recent.map(row)}</ul></section> : <ul className="ai-history-list">{recent.map(row)}</ul>)}
  </div>;
}
