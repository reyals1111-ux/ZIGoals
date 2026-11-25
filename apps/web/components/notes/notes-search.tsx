'use client';
import Link from 'next/link';
import {Suspense, lazy, useEffect, useMemo, useState} from 'react';
import type {Note, NoteKind} from '../../lib/notes/schema';
import {noteName} from '../../lib/notes/schema';
import {noteHref} from '../../lib/notes/links';
import type {EverythingHit} from '../../lib/search/notes-everything';
import type {PropFilter} from '../../lib/notes/props';
// Session AW (x3; LEDGER #441, Evernote's saved searches): the words, a tag, a kind of note and property filters, kept by name.
import {findNotes, narrowed, searching, type SearchState} from '../../lib/notes/saved-searches';
import {LoadBoundary} from '../load-boundary';
const SavedSearches = lazy(() => import('./notes-saved-searches'));

/**
 * Session AK (B4): search on the Notes page — the notes' full text by default, and with one switch everything else on
 * this device too (goals, habits, Health, workouts, money entries without amounts, assets, the journal). The wider search
 * loads its code when switched on. Nothing leaves the device.
 */
const KIND_WORD: Record<EverythingHit['kind'], string> = {note: 'Note', journal: 'Journal', goal: 'Goal', habit: 'Habit', food: 'Food', recipe: 'Recipe', workout: 'Workout', money: 'Money', asset: 'Asset'};
export function NotesSearch({notes, onSearching}: {notes: readonly Note[]; /** Session AL (PR-105): told while a search is typed, so the page shows only its results. */ onSearching?: (searching: boolean) => void}) {
  const [query, setQuery] = useState(''), [wide, setWide] = useState(false), [found, setFound] = useState<{q: string; hits: EverythingHit[]; unread: string[]} | null>(null);
  // Session AW (x3; LEDGER #441): the narrowing beyond the words (notes only), and the saved search opened, by name.
  const [tag, setTag] = useState(''), [kind, setKind] = useState<'' | NoteKind>(''), [filters, setFilters] = useState<PropFilter[]>([]), [opened, setOpened] = useState<string | null>(null);
  const state: SearchState = useMemo(() => ({words: query, tag, kind, filters, wide}), [query, tag, kind, filters, wide]);
  const q = query.trim(), active = searching(state) && !(wide && !q && !narrowed(state)), asNarrowed = !wide && narrowed(state);
  useEffect(() => { onSearching?.(active); }, [active, onSearching]);
  const local = useMemo(() => active && !wide ? findNotes(notes, state, 20) : [], [notes, state, active, wide]);
  const open = (next: SearchState, name: string | null) => { setQuery(next.words); setWide(next.wide); setTag(next.tag); setKind(next.kind); setFilters(next.filters); setOpened(name); };
  const narrow = (patch: Partial<Pick<SearchState, 'tag' | 'kind' | 'filters'>>) => { if ('tag' in patch) setTag(patch.tag ?? ''); if ('kind' in patch) setKind(patch.kind ?? ''); if ('filters' in patch) setFilters(patch.filters ?? []); setOpened(null); };
  useEffect(() => {
    if (!wide || !q) return;
    let live = true;
    const t = window.setTimeout(() => { void import('../../lib/search/notes-everything').then(m => m.searchEverything(q, {limit: 30})).then(r => { if (live) setFound({q, hits: r.hits, unread: r.unread}); }, () => { if (live) setFound({q, hits: [], unread: ['notes']}); }); }, 150);
    return () => { live = false; window.clearTimeout(t); };
  }, [wide, q, notes]);
  const wideHits = wide && found?.q === q ? found.hits : [];
  return <section className="note-search" aria-label="Search notes">
    <label className="field"><span>Search</span><input type="search" value={query} onChange={e => { setQuery(e.target.value); setOpened(null); }} placeholder={wide ? 'Notes, goals, habits, Health, money…' : 'Your notes'}/></label>
    <label className="switch-row"><input type="checkbox" checked={wide} onChange={e => { setWide(e.target.checked); setOpened(null); if (e.target.checked) { setTag(''); setKind(''); setFilters([]); } }}/> <span>Also search goals, habits, Health, money and the journal</span></label>
    {/* Session AW (x3; LEDGER #441): saved searches to open in one tap, the narrowing (a tag, a kind, a property) and "Keep this search". */}
    <LoadBoundary quiet><Suspense fallback={null}><SavedSearches notes={notes} state={state} opened={opened} onOpen={open} onNarrow={narrow}/></Suspense></LoadBoundary>
    {active && <div role="status" aria-live="polite" className="sr-only">{wide ? (found?.q === q ? `${wideHits.length} results` : 'Searching') : `${local.length} results`}</div>}
    {opened && active && !wide && <p className="fine note-saved-line">Saved search &ldquo;{opened}&rdquo;: {local.length === 1 ? '1 note' : `${local.length} notes`}{local.length >= 20 ? ' (the first 20)' : ''}.</p>}
    {(q || asNarrowed) && !wide && (local.length ? <ul className="note-results">{local.map(h => <li key={h.note.id}><Link href={noteHref(h.note.id)}><strong>{h.note.kind === 'daily' && h.note.day ? `Daily note · ${h.note.day}` : noteName(h.note)}</strong></Link>{h.note.archived && <span className="fine"> · archived</span>}<p className="fine">{h.snippet}</p></li>)}</ul> : <p className="fine">{q ? 'No note has those words' : 'No note is like that'}{asNarrowed ? ' with the tag, kind or properties chosen' : ''}.</p>)}
    {q && wide && found?.q === q && (wideHits.length ? <ul className="note-results">{wideHits.map(h => <li key={`${h.kind}:${h.id}`}><Link href={h.href}><strong>{h.title}</strong></Link> <span className="fine">· {KIND_WORD[h.kind]} · {h.detail}</span>{h.snippet && <p className="fine">{h.snippet}</p>}</li>)}</ul> : <p className="fine">Nothing on this device matches “{q}”.</p>)}
    {wide && found?.q === q && found.unread.length > 0 && <p className="fine">Not searched (could not be read): {found.unread.join(', ')}.</p>}
  </section>;
}
