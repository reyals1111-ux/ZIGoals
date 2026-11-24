'use client';
import {useEffect, useId, useMemo} from 'react';
import {moodChoices} from '../../lib/journal/mood-filter';
import type {JournalEntry} from '../../lib/journal/schema';
import type {ListOptions} from '../../lib/journal/list-options';

/**
 * Session AV lane 2 (r4-mind; LEDGER #310, Journey's favourites, search by mood and sort): the Journal list's three
 * choices — Favourites only, a mood or a feeling word (the days it was chosen), and Newest or Oldest first. The page keeps
 * the choice; this part works out the days of a mood (again when the records change). Its own chunk.
 */
export default function EntryListOptions({entries, moods, feelings, moodWords, value, onChange}: {entries: readonly JournalEntry[]; moods: Readonly<Record<string, number>>; feelings: {words?: Readonly<Record<string, unknown>>} | null; moodWords: readonly string[]; value: ListOptions; onChange: (next: ListOptions) => void}) {
  const id = useId(), choices = useMemo(() => moodChoices(entries, moods, feelings, moodWords), [entries, moods, feelings, moodWords]);
  const starred = entries.filter(e => e.star === true).length;
  // A chosen mood's days follow the records (a new entry on a day with that mood joins the list).
  const days = value.mood ? choices.find(c => c.value === value.mood)?.days ?? [] : null, key = days?.join(',') ?? '';
  useEffect(() => { if (value.mood && key !== (value.days ?? []).join(',')) onChange({...value, days: days ?? []}); },
    // The days' key is the dependency (the list of days is made anew on every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, value.mood]);
  return <div className="journal-list-options" role="group" aria-label="Show entries">
    <button type="button" className="quiet journal-list-star" aria-pressed={value.star} onClick={() => onChange({...value, star: !value.star})}><span aria-hidden="true">{value.star ? '★' : '☆'}</span> Favourites <small>{starred}</small></button>
    <label className="field"><span>Mood</span><select id={`${id}-mood`} value={value.mood} onChange={e => { const c = choices.find(x => x.value === e.target.value); onChange({...value, mood: c ? c.value : '', days: c ? c.days : null}); }}>
      <option value="">Any mood</option>
      {choices.map(c => <option key={c.value} value={c.value}>{c.label} ({c.days.length === 1 ? '1 day' : `${c.days.length} days`})</option>)}
    </select></label>
    <label className="field"><span>Order</span><select value={value.order} onChange={e => onChange({...value, order: e.target.value === 'oldest' ? 'oldest' : 'newest'})}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
    {!choices.length && <p className="fine journal-list-hint">Rate a day&rsquo;s mood or pick a feeling word, and the days you wrote can be shown by mood here.</p>}
  </div>;
}
