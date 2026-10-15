'use client';
import {useEffect, useId, useMemo, useRef, useState, type KeyboardEvent} from 'react';
import {useRouter} from 'next/navigation';
import {KIND_LABEL, search, type SearchHit, type SearchItem} from '../../lib/search/engine';
import {PillarMark, pillarOf, pillarOfHref} from '../pillars';
import {HELP_ITEMS, PAGES, SETTINGS} from '../../lib/search/static';
import {SEARCH_RECENT, clearRecent, rememberQuery} from '../../lib/search/recent';
import {GOAL_LIBRARY} from '../../lib/templates/goal-library';
import {askZigiWhenShown} from '../zigi-door';
import {useDeviceRecord} from '../ai/use-device-record';
import {useUnifiedGoals} from '../use-unified-goals';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {usePlatform} from '../platform/use-platform';
import {useAverageGoals} from '../goals/use-average-goals';
import {NAV_ITEMS, useVisibleNav} from '../app-nav';

const NAV_HREFS = new Set<string>(NAV_ITEMS.map(([href]) => href));
import './search.css';

/**
 * The search palette (Session AA-Cloud Part 4): one field, results grouped by kind, arrows to move, Enter to open,
 * Escape to close, focus back where it was. With nothing typed it offers the recent searches (kept on this device,
 * "Clear" empties them). The last row hands the words to ZIGi ("Ask ZIGi: …"), which only fills ZIGi's composer: nothing
 * is sent until the person sends it. Everything searched is this device's own; nothing leaves it. A phone shows it as a
 * full-screen sheet.
 */
/** Session AB-Design (owner request 28): a hit's pillar — by record kind, or by the page's path. */
const rowPillar = (row: Row) => row.hit ? (row.hit.kind === 'page' ? pillarOfHref(row.hit.href) : pillarOf(row.hit.kind)) : null;
type Row = {id: string; label: string; detail?: string; kind: 'hit' | 'recent' | 'ask'; hit?: SearchHit; query?: string};
/** Phase 2, Part 10 (owner request 36): the four pillars as shortcuts before typing, and where a result opens. */
const PILLAR_LINKS = [['goals', 'Goals', '/app/goals'], ['habits', 'Habits', '/app/habits'], ['health', 'Health', '/app/health'], ['wealth', 'Wealth', '/app/wealth']] as const;
const placeOf = (href: string) => { const seg = href.split(/[?#]/)[0]!.split('/')[2]; return seg ? seg[0]!.toUpperCase() + seg.slice(1).replace(/-/g, ' ') : 'Today'; };

/** `zigi`: whether ZIGi's launcher showed when the palette opened (it steps aside while the palette is open). */
export default function SearchPalette({initial = '', zigi = false, onClose}: {initial?: string; zigi?: boolean; onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null), input = useRef<HTMLInputElement>(null), returnTo = useRef<Element | null>(null);
  const router = useRouter(), base = useId(), [query, setQuery] = useState(initial), [active, setActive] = useState(0);
  const recent = useDeviceRecord(SEARCH_RECENT);
  const goals = useUnifiedGoals(), habits = useHabits(), health = useHealth(), platform = usePlatform(), averages = useAverageGoals(), nav = useVisibleNav();

  useEffect(() => {
    returnTo.current = document.activeElement;
    const d = dialog.current;
    if (d && !d.open) d.showModal();
    input.current?.focus();
    return () => { if (returnTo.current instanceof HTMLElement) returnTo.current.focus(); };
  }, []);

  const items = useMemo<SearchItem[]>(() => {
    const shown = new Set<string>(nav.items.map(([href]) => href));
    // A page under a navigation entry the person hid stays out of the results with it; other pages are always found.
    const pageShown = (href: string) => { const root = href.split(/[?#]/)[0]!.split('/').slice(0, 3).join('/'); return !NAV_HREFS.has(root) || shown.has(root) || root === '/app'; };
    const out: SearchItem[] = [...PAGES.filter(p => pageShown(p.href)), ...nav.items.filter(([href]) => !PAGES.some(p => p.href === href)).map(([href, label]): SearchItem => ({id: `page:${href}`, kind: 'page', title: label, href})), ...SETTINGS, ...HELP_ITEMS];
    if (goals.loaded) for (const g of goals.goals) out.push({id: `goal:${g.key}`, kind: 'goal', title: g.name, subtitle: `${g.type} · ${g.status}`, href: g.href});
    if (averages.loaded && !averages.unreadable) for (const g of averages.data.goals) out.push({id: `goal:average:${g.id}`, kind: 'goal', title: g.name, subtitle: `Keep an average · ${g.status}`, href: `/app/goals/average/${g.id}`});
    if (habits.loaded && !habits.error) for (const h of habits.data.habits) out.push({id: `habit:${h.id}`, kind: 'habit', title: h.title, subtitle: h.category, href: `/app/habits#habit-${h.id}`, keywords: [h.description]});
    if (health.loaded && !health.error) {
      for (const f of health.data.foods) out.push({id: `food:${f.id}`, kind: 'food', title: f.name, subtitle: f.brand ? `${f.brand} · in Health` : 'In Health', href: '/app/health'});
      for (const r of health.data.recipes) out.push({id: `recipe:${r.id}`, kind: 'recipe', title: r.name, subtitle: 'Recipe · in Health', href: '/app/health'});
    }
    if (platform.loaded && !platform.error) for (const p of platform.data.positions) if (!p.archivedAt) out.push({id: `asset:${p.id}`, kind: 'asset', title: p.providerId === 'native-zig' ? `ZIG ${p.sourceType.replaceAll('_', ' ').toLowerCase()}` : p.providerId, subtitle: `${p.asset}${p.assetClass ? ` · ${p.assetClass}` : ''}`, href: `/app/wealth/asset/${encodeURIComponent(p.id)}`, keywords: [p.asset]});
    for (const t of GOAL_LIBRARY) out.push({id: `template:${t.id}`, kind: 'template', title: t.title, subtitle: `Template · ${t.summary}`, href: t.kind === 'average' ? `/app/goals/average/new?template=${t.id}` : `/app/goals/new?template=${t.id}`, keywords: t.keywords});
    return out;
  }, [goals.loaded, goals.goals, averages.loaded, averages.unreadable, averages.data, habits.loaded, habits.error, habits.data, health.loaded, health.error, health.data, platform.loaded, platform.error, platform.data, nav.items]);

  const trimmed = query.trim(), hits = useMemo(() => trimmed ? search(items, trimmed) : [], [items, trimmed]);
  const rows: Row[] = trimmed
    ? [...hits.map((hit): Row => ({id: hit.id, label: hit.title, detail: hit.subtitle, kind: 'hit', hit})), {id: 'ask', label: `Ask ZIGi: “${trimmed}”`, detail: zigi ? 'Opens ZIGi with these words; nothing is sent until you send it.' : 'ZIGi is off or hidden. Turn it on in Settings → ZIGi.', kind: 'ask', query: trimmed}]
    : (recent.loaded && !recent.unreadable ? recent.data.queries : []).map((q, i): Row => ({id: `recent-${i}`, label: q, detail: 'Recent search', kind: 'recent', query: q}));
  const current = Math.min(active, Math.max(0, rows.length - 1));

  const close = () => { dialog.current?.close(); onClose(); };
  const remember = (q: string) => { try { recent.update(s => rememberQuery(s, q)); } catch { /* search still works */ } };
  function choose(row: Row) {
    if (row.kind === 'recent') { setQuery(row.query!); setActive(0); input.current?.focus(); return; }
    if (row.kind === 'ask') { if (!zigi) return; remember(row.query!); close(); void askZigiWhenShown(row.query!); return; }
    remember(trimmed);
    close();
    router.push(row.hit!.href);
  }
  function keys(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (rows.length) setActive((current + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length); }
    else if (e.key === 'Home' && e.ctrlKey) { e.preventDefault(); setActive(0); }
    else if (e.key === 'End' && e.ctrlKey) { e.preventDefault(); setActive(Math.max(0, rows.length - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const row = rows[current]; if (row) choose(row); }
  }
  useEffect(() => { document.getElementById(`${base}-row-${current}`)?.scrollIntoView({block: 'nearest'}); }, [current, base]);

  const listId = `${base}-list`, activeId = rows.length ? `${base}-row-${current}` : undefined;
  const groups = trimmed ? [...new Set(hits.map(h => h.kind))] : [];
  // Rows are already in display order (search() groups by kind), so a row's index is its place in the list.
  const option = (row: Row) => { const i = rows.indexOf(row); return <li key={row.id} id={`${base}-row-${i}`} role="option" aria-selected={i === current} aria-disabled={row.kind === 'ask' && !zigi ? true : undefined} className={`search-row is-${row.kind}`} onPointerMove={() => setActive(i)} onClick={() => choose(row)}>
    {rowPillar(row) && <PillarMark pillar={rowPillar(row)!} size={14}/>}<span className="search-row-title">{row.label}</span>{row.detail && <span className="search-row-detail">{row.detail}</span>}
  </li>; };

  return <dialog ref={dialog} className="search-palette" aria-label="Search" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === dialog.current) close(); }}>
    <div className="search-box">
      <div className="search-field">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
        <input ref={input} type="search" role="combobox" aria-expanded={rows.length > 0} aria-controls={listId} aria-activedescendant={activeId} aria-autocomplete="list" aria-label="Search goals, habits, foods, assets, pages, settings and Help" placeholder="Search goals, habits, foods, assets, pages…" value={query} onChange={e => { setQuery(e.target.value); setActive(0); }} onKeyDown={keys} autoComplete="off" spellCheck={false} enterKeyHint="go" />
        <button type="button" className="quiet search-close" onClick={close}>Close</button>
      </div>
      <p className="sr-only" role="status">{trimmed ? `${hits.length} ${hits.length === 1 ? 'result' : 'results'}` : ''}</p>
      {!trimmed && <nav className="search-pillars" aria-label="Go to a pillar">{PILLAR_LINKS.map(([pillar, label, href]) => <button key={pillar} type="button" className="search-pillar" onClick={() => { close(); router.push(href); }}><PillarMark pillar={pillar} size={16}/><span>{label}</span></button>)}</nav>}
      <div className="search-body">
      <ul id={listId} role="listbox" aria-label={trimmed ? 'Results' : 'Recent searches'} className="search-results">
        {trimmed ? <>
          {groups.map(kind => <li key={kind} role="presentation" className="search-group"><span className="search-group-label" id={`${base}-g-${kind}`}>{KIND_LABEL[kind]}</span><ul role="group" aria-labelledby={`${base}-g-${kind}`}>{rows.filter(r => r.hit?.kind === kind).map(option)}</ul></li>)}
          {!hits.length && <li role="presentation" className="search-empty">Nothing on this device matches “{trimmed}”.</li>}
          {rows.filter(r => r.kind === 'ask').map(option)}
        </> : rows.map(option)}
      </ul>
      {/* A preview of the highlighted row on wide screens; it repeats the row's own words (decorative for screen readers). */}
      <aside className="search-preview" aria-hidden="true">{(() => { const row = rows[current]; if (!row) return <p className="search-preview-tip">Search goals, habits, foods, assets, pages, settings and Help. Everything stays on this device.</p>;
        const pillar = rowPillar(row);
        return <>
          {pillar ? <PillarMark pillar={pillar} size={26}/> : <span className="search-preview-mark">{row.kind === 'ask' ? '✦' : row.kind === 'recent' ? '↺' : '•'}</span>}
          <p className="search-preview-kind">{row.kind === 'hit' && row.hit ? KIND_LABEL[row.hit.kind] : row.kind === 'ask' ? 'ZIGi' : 'Recent search'}</p>
          <p className="search-preview-title">{row.label}</p>
          {row.detail && <p className="search-preview-detail">{row.detail}</p>}
          <p className="search-preview-where">{row.kind === 'hit' && row.hit ? <>Opens in <strong>{placeOf(row.hit.href)}</strong> · Enter</> : row.kind === 'ask' ? 'Opens ZIGi with these words · Enter' : 'Searches again · Enter'}</p>
        </>; })()}</aside>
      </div>
      {!trimmed && <div className="search-foot">
        {rows.length ? <button type="button" className="text-link" onClick={() => { try { recent.update(clearRecent); } catch { /* nothing to clear */ } }}>Clear recent searches</button> : <p>Type to search everything on this device. Recent searches stay on this device.</p>}
        <p className="search-keys" aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close</p>
      </div>}
    </div>
  </dialog>;
}
