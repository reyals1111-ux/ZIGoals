'use client';
import {useEffect, useId, useMemo, useRef, useState, type KeyboardEvent} from 'react';
import {useRouter} from 'next/navigation';
import {NAV_ITEMS} from '../app-nav';
import {usePagesView} from '../pages/use-pages-view';
import {hrefShown, isShown} from '../../lib/pages/visibility';
import {useDeviceRecord} from '../ai/use-device-record';
import {TASKS} from '../../lib/tasks/schema';
import {formatDate} from '../../lib/visual-format';
import {askZigiWhenShown, openZigiPanel} from '../zigi-door';
import {openSearch} from '../search/search-trigger';
import {APP_PAGES, PALETTE_GROUPS, filterRows, orderRows, type PaletteRow} from './palette-items';
import './command-palette.css';

/**
 * Session AL fourth pass (LS-H36, C-LS-22): the command palette (Ctrl/⌘+K). One field; the rows below narrow as you type:
 * actions (Ask ZIGi, Quick add, Add a task, Search everything), the pages you have switched on, and your recent open
 * tasks. ↑/↓ move, Enter opens, Escape closes at the first press and the focus goes back where it was. Nothing typed here
 * leaves this device; "Ask ZIGi" only fills ZIGi's composer.
 */
export default function CommandPalette({onClose}: {onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null), input = useRef<HTMLInputElement>(null), returnTo = useRef<HTMLElement | null>(null);
  const router = useRouter(), view = usePagesView(), tasks = useDeviceRecord(TASKS), base = useId();
  const [typed, setTyped] = useState(''), [active, setActive] = useState(0);
  useEffect(() => {
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const d = dialog.current; if (d && !d.open) d.showModal();
    input.current?.focus();
    return () => { if (d?.open) d.close(); };
  }, []);
  const rows = useMemo(() => {
    const words = typed.trim();
    const actions: PaletteRow[] = [
      ...(isShown(view, 'zigi') ? [{id: 'zigi', group: 'Actions' as const, label: words ? `Ask ZIGi: “${words}”` : 'Ask ZIGi', detail: 'Your personal AI companion · Ctrl/⌘+Shift+Z', run: 'zigi' as const, words: 'ai chat assistant help'}] : []),
      ...(isShown(view, 'quick-add') ? [{id: 'quick-add', group: 'Actions' as const, label: 'Quick add', detail: 'Log water, a meal, a habit, a note or a task in one line', run: 'quick-add' as const, words: 'log add new'}] : []),
      {id: 'new-task', group: 'Actions', label: 'Add a task', detail: 'Tasks, with the add field ready', href: '/app/tasks?add=1', words: 'todo to-do new'},
      {id: 'search', group: 'Actions', label: words ? `Search everything for “${words}”` : 'Search everything', detail: 'Goals, habits, foods, assets, pages and Help · /', run: 'search', words: 'find'},
    ];
    const pages: PaletteRow[] = [...NAV_ITEMS.map(([href, label]) => [href, label, ''] as const), ...APP_PAGES]
      .filter(([href]) => { try { return hrefShown(view, href); } catch { return true; } })
      .map(([href, label, more]) => ({id: `page:${href}`, group: 'Pages', label, detail: 'Page', href, words: `go open ${more}`}));
    const open = tasks.loaded && !tasks.unreadable ? tasks.data.tasks.filter(t => !t.doneAt) : [];
    const recent = [...open].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
    const taskRows: PaletteRow[] = recent.map(t => ({id: `task:${t.id}`, group: 'Recent tasks', label: t.title, detail: t.due ? `Task · due ${formatDate(t.due, {weekday: true, year: false})}` : 'Task', href: `/app/tasks?task=${encodeURIComponent(t.id)}`}));
    // Search and Ask ZIGi always carry the typed words, so they stay whatever is typed.
    const kept = (r: PaletteRow) => r.run === 'search' || r.run === 'zigi';
    const matched = filterRows([...actions.filter(r => !kept(r)), ...pages, ...taskRows], words);
    const shownTasks = matched.filter(r => r.group === 'Recent tasks').slice(0, words ? 8 : 5);
    return orderRows(actions.filter(kept), [...matched.filter(r => r.group !== 'Recent tasks'), ...shownTasks], words);
  }, [typed, view, tasks.loaded, tasks.unreadable, tasks.data]);
  const current = Math.min(active, Math.max(0, rows.length - 1));
  useEffect(() => { document.getElementById(`${base}-row-${current}`)?.scrollIntoView({block: 'nearest'}); }, [current, base]);

  const close = (refocus = true) => { dialog.current?.close(); onClose(); if (refocus) requestAnimationFrame(() => returnTo.current?.focus({preventScroll: true})); };
  const run = (row: PaletteRow) => {
    const words = typed.trim();
    close(false); // what the row opens takes the focus
    if (row.run === 'zigi') { void (words ? askZigiWhenShown(words) : openZigiPanel()); return; }
    if (row.run === 'search') { openSearch(words); return; }
    if (row.run === 'quick-add') {
      const trigger = [...document.querySelectorAll<HTMLButtonElement>('.quick-add-trigger')].find(b => b.offsetParent !== null);
      if (trigger) trigger.click(); else router.push('/app/tasks?add=1');
      return;
    }
    if (row.href) router.push(row.href);
  };
  const keys = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (rows.length) setActive((current + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length); }
    else if (e.key === 'Home' && e.ctrlKey) { e.preventDefault(); setActive(0); }
    else if (e.key === 'End' && e.ctrlKey) { e.preventDefault(); setActive(Math.max(0, rows.length - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const row = rows[current]; if (row) run(row); }
    // One Escape closes, whatever is typed (a search field would clear its text first).
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  };
  const listId = `${base}-list`;
  return <dialog ref={dialog} className="command-palette" aria-label="Command menu" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === dialog.current) close(); }}>
    <div className="command-palette-box">
      <input ref={input} className="command-palette-field" type="text" role="combobox" aria-expanded={rows.length > 0} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={rows.length ? `${base}-row-${current}` : undefined} aria-label="Go to a page, run an action or find a task" placeholder="Type a page, an action or a task…"
        value={typed} autoComplete="off" spellCheck={false} onChange={e => { setTyped(e.target.value); setActive(0); }} onKeyDown={keys} />
      <div id={listId} role="listbox" aria-label="Commands" className="command-palette-list">
        {PALETTE_GROUPS.map(group => { const items = rows.filter(r => r.group === group); return items.length ? <div key={group} role="group" aria-labelledby={`${base}-${group.replace(/\s/g, '')}`}>
          <p id={`${base}-${group.replace(/\s/g, '')}`} className="command-palette-group" role="presentation">{group}</p>
          {items.map(row => { const i = rows.indexOf(row); return <div key={row.id} id={`${base}-row-${i}`} role="option" aria-selected={i === current} className="command-palette-row" onPointerMove={() => setActive(i)} onClick={() => run(row)}>
            <span className="command-palette-label" dir="auto">{row.label}</span>{row.detail && <span className="command-palette-detail">{row.detail}</span>}
          </div>; })}
        </div> : null; })}
        {!rows.length && <p className="command-palette-none" role="presentation">Nothing matches “{typed.trim()}”.</p>}
      </div>
      <p className="command-palette-keys">↑ ↓ to move · Enter to open · Esc to close · Ctrl/⌘+Shift+Z opens ZIGi</p>
      <p className="sr-only" role="status" aria-live="polite">{rows.length === 1 ? '1 command' : `${rows.length} commands`}</p>
    </div>
  </dialog>;
}
