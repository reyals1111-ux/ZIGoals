'use client';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import type {Note} from '../../lib/notes/schema';
import {noteName} from '../../lib/notes/schema';
import {noteHref} from '../../lib/notes/links';
import {searchNotes} from '../../lib/search/notes';
import type {EverythingHit} from '../../lib/search/notes-everything';

/**
 * Session AK (B4): search on the Notes page — the notes' full text by default, and with one switch everything else on
 * this device too (goals, habits, Health, workouts, money entries without amounts, assets, the journal). The wider search
 * loads its code when switched on. Nothing leaves the device.
 */
const KIND_WORD: Record<EverythingHit['kind'], string> = {note: 'Note', journal: 'Journal', goal: 'Goal', habit: 'Habit', food: 'Food', recipe: 'Recipe', workout: 'Workout', money: 'Money', asset: 'Asset'};
export function NotesSearch({notes}: {notes: readonly Note[]}) {
  const [query, setQuery] = useState(''), [wide, setWide] = useState(false), [found, setFound] = useState<{q: string; hits: EverythingHit[]; unread: string[]} | null>(null);
  const q = query.trim();
  const local = useMemo(() => q && !wide ? searchNotes(notes, q, 20) : [], [notes, q, wide]);
  useEffect(() => {
    if (!wide || !q) return;
    let live = true;
    const t = window.setTimeout(() => { void import('../../lib/search/notes-everything').then(m => m.searchEverything(q, {limit: 30})).then(r => { if (live) setFound({q, hits: r.hits, unread: r.unread}); }, () => { if (live) setFound({q, hits: [], unread: ['notes']}); }); }, 150);
    return () => { live = false; window.clearTimeout(t); };
  }, [wide, q, notes]);
  const wideHits = wide && found?.q === q ? found.hits : [];
  return <section className="note-search" aria-label="Search notes">
    <label className="field"><span>Search</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={wide ? 'Notes, goals, habits, Health, money…' : 'Your notes'}/></label>
    <label className="switch-row"><input type="checkbox" checked={wide} onChange={e => setWide(e.target.checked)}/> <span>Also search goals, habits, Health, money and the journal</span></label>
    {q && <div role="status" aria-live="polite" className="sr-only">{wide ? (found?.q === q ? `${wideHits.length} results` : 'Searching') : `${local.length} results`}</div>}
    {q && !wide && (local.length ? <ul className="note-results">{local.map(h => <li key={h.note.id}><Link href={noteHref(h.note.id)}><strong>{h.note.kind === 'daily' && h.note.day ? `Daily note · ${h.note.day}` : noteName(h.note)}</strong></Link><p className="fine">{h.snippet}</p></li>)}</ul> : <p className="fine">No note has those words.</p>)}
    {q && wide && found?.q === q && (wideHits.length ? <ul className="note-results">{wideHits.map(h => <li key={`${h.kind}:${h.id}`}><Link href={h.href}><strong>{h.title}</strong></Link> <span className="fine">· {KIND_WORD[h.kind]} · {h.detail}</span>{h.snippet && <p className="fine">{h.snippet}</p>}</li>)}</ul> : <p className="fine">Nothing on this device matches “{q}”.</p>)}
    {wide && found?.q === q && found.unread.length > 0 && <p className="fine">Not searched (could not be read): {found.unread.join(', ')}.</p>}
  </section>;
}
