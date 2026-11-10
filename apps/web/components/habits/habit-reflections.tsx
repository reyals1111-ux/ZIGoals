'use client';
import {useId, useMemo, useState} from 'react';
import Link from 'next/link';
import {formatDate} from '../../lib/visual-format';
import type {HabitData} from '../../lib/habits';

/**
 * Session AL (GAP-086, P-DVG-16, P-NB-C18): every note and mood written at a check-in, newest first, in one searchable
 * list (by words, habit name or mood). Read-only: it reads the habit journal and stores nothing; each row opens that
 * habit's own page. Its own chunk, loaded when the fold opens.
 */
const MOOD: Record<string, string> = {energized: 'Energized', good: 'Good', neutral: 'Neutral', difficult: 'Difficult', calm: 'Calm'};
type Reflection = {key: string; habitId: string; habit: string; date: string; note: string; mood?: string};
export function reflectionsOf(data: HabitData): Reflection[] {
  return data.habits.flatMap(h => h.entries.filter(e => e.disposition === 'logged' && (e.note.trim() || e.mood)).map(e => ({key: `${h.id}:${e.date}`, habitId: h.id, habit: h.title, date: e.date, note: e.note.trim(), ...(e.mood ? {mood: MOOD[e.mood] ?? e.mood} : {})})))
    .sort((a, b) => b.date.localeCompare(a.date) || a.habit.localeCompare(b.habit));
}
export function matchReflections(all: readonly Reflection[], query: string): Reflection[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [...all];
  return all.filter(r => { const text = `${r.habit} ${r.note} ${r.mood ?? ''}`.toLowerCase(); return words.every(w => text.includes(w)); });
}
const SHOWN = 50;
export default function HabitReflections({data}: {data: HabitData}) {
  const all = useMemo(() => reflectionsOf(data), [data]), [query, setQuery] = useState(''), id = useId();
  const found = useMemo(() => matchReflections(all, query), [all, query]);
  return <div className="habit-reflections">
    <label className="field">Search your notes and moods<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="For example: tired, calm, Read" aria-describedby={`${id}-count`} /></label>
    <p id={`${id}-count`} className="fine" role="status">{query.trim() ? `${found.length} of ${all.length} ${all.length === 1 ? 'reflection' : 'reflections'} match.` : `${all.length} ${all.length === 1 ? 'reflection' : 'reflections'}, newest first.`}</p>
    {found.length > 0 ? <ol className="habit-reflection-list">{found.slice(0, SHOWN).map(r => <li key={r.key}>
      <p className="habit-reflection-head"><time dateTime={r.date}>{formatDate(r.date)}</time> · <Link className="text-link" href={`/app/habits?habit=${encodeURIComponent(r.habitId)}`}>{r.habit}</Link>{r.mood ? ` · ${r.mood}` : ''}</p>
      {r.note && <p className="habit-reflection-note">{r.note}</p>}
    </li>)}</ol> : <p>No note or mood matches “{query.trim()}”.</p>}
    {found.length > SHOWN && <p className="fine">Showing the newest {SHOWN}. Search to find older ones.</p>}
  </div>;
}
