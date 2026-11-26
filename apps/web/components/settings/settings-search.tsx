'use client';
import './settings-search.css';
import Link from 'next/link';
import {useId, useRef, useState, type KeyboardEvent} from 'react';
import type {SettingsEntry} from '../../lib/settings-search';

type Index = typeof import('../../lib/settings-search');
const MAX_QUERY = 80;

/**
 * Session AW Part 3 (simplicity c): "Search Settings" in the page's heading. The field is all that loads with the page;
 * the index (lib/settings-search, words in English and Dutch for every section and anchor, the lower groups' too) loads
 * the first time the field is used, so the lower groups keep their own chunk and nothing of theirs is imported here.
 * A result is a plain link to its anchor: Settings' own jump handling opens the group that holds it and lays the groups out
 * first (SettingsFolds, SettingsRenderAll, KeepSettingsJump). Keyboard: ↓ from the field to the results, ↑/↓ between
 * them, Enter on the field opens the first, Escape clears.
 */
export function SettingsSearch({chain}: {chain: boolean}) {
  const id = useId(), [query, setQuery] = useState(''), [index, setIndex] = useState<Index | null>(null), [open, setOpen] = useState(true), [failed, setFailed] = useState(false);
  const list = useRef<HTMLUListElement>(null), field = useRef<HTMLInputElement>(null), loading = useRef(false);
  const load = () => {
    if (index || loading.current) return;
    loading.current = true;
    // Session AW Part 6 (aw-offline.spec): a failed load (offline, its file not on this device yet) says so, and the next
    // word typed tries again; it never stays on "Searching…".
    import('../../lib/settings-search').then(m => { setFailed(false); setIndex(m); }, () => { loading.current = false; setFailed(true); });
  };
  const words = query.trim();
  const results: SettingsEntry[] = index && words.length >= 2 ? index.searchSettings(words, {chain}) : [];
  const shown = open && words.length >= 2 && !!index;
  const links = () => [...(list.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [])];
  const onField = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && links().length) { event.preventDefault(); links()[0]!.focus(); }
    else if (event.key === 'Enter' && links().length) { event.preventDefault(); links()[0]!.click(); }
    else if (event.key === 'Escape' && query) { event.preventDefault(); setQuery(''); }
  };
  const onList = (event: KeyboardEvent<HTMLUListElement>) => {
    const all = links(), at = all.indexOf(document.activeElement as HTMLAnchorElement);
    if (at < 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = at + (event.key === 'ArrowDown' ? 1 : -1);
      if (next < 0) field.current?.focus(); else all[Math.min(next, all.length - 1)]!.focus();
    } else if (event.key === 'Escape') { event.preventDefault(); field.current?.focus(); setQuery(''); }
  };
  const status = words.length < 2 ? '' : !index ? (failed ? 'Search needs a connection the first time. The rest of Settings keeps working.' : 'Searching…') : results.length === 0 ? `No setting matches “${words}”. Try another word.` : `${results.length} ${results.length === 1 ? 'setting' : 'settings'} found.`;
  return <div className="settings-search" role="search" aria-label="Settings">
    <label htmlFor={`${id}-q`}>Search Settings</label>
    <input ref={field} id={`${id}-q`} type="search" value={query} maxLength={MAX_QUERY} autoComplete="off" spellCheck={false} enterKeyHint="go"
      placeholder="For example: dark mode, backup, meldingen" aria-describedby={`${id}-n`} aria-controls={shown && results.length > 0 ? `${id}-r` : undefined}
      onFocus={() => { load(); setOpen(true); }} onChange={e => { load(); setOpen(true); setQuery(e.target.value.slice(0, MAX_QUERY)); }} onKeyDown={onField}/>
    <p id={`${id}-n`} role="status" className="settings-search-status">{status}</p>
    {shown && results.length > 0 && <ul id={`${id}-r`} ref={list} className="settings-search-results" aria-label={`Settings matching “${words}”`} onKeyDown={onList}>
      {results.map(entry => {
        const href = index!.entryHref(entry), content = <><strong>{entry.label}</strong><small>{index!.SETTINGS_GROUP_TITLES[entry.group]}{entry.href ? ' · opens its own page' : ''}</small></>;
        // A jump within Settings closes the list (the page scrolls to the section); the field keeps the words.
        return <li key={`${entry.anchor}|${entry.label}`}>{entry.href ? <Link href={href}>{content}</Link> : <a href={href} onClick={() => setOpen(false)}>{content}</a>}</li>;
      })}
    </ul>}
    {shown && results.length === 0 && <p className="settings-search-help"><Link className="text-link" href="/app/help">Search Help instead →</Link></p>}
  </div>;
}
