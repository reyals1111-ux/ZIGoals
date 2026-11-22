'use client';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import type {Note} from '../../lib/notes/schema';
import {SORT_LABELS, firstDirection, noteRows, notesPerTag, notesPerWeek, sortRows, type SortKey} from '../../lib/notes/table';
import {noteHref} from '../../lib/notes/links';
import {getNotePhoto} from '../../lib/notes/photos';
import {photoScope} from '../../lib/health-aa/photos';
import {formatDate, formatNumber} from '../../lib/visual-format';

/**
 * Session AV lane 2 (notes; LEDGER #29 Notion's database views: a table and a gallery of notes; #30 Notion's chart view:
 * notes per tag). The Notes list in three layouts — the list (as before, in the workspace), a table with sortable columns
 * (name, tags, words, links, changed, made; a column header is a button and says its order), and a gallery of cards
 * with each note's photo — and a chart of notes per tag and per week, drawn as labelled bars with their numbers in words.
 * Loaded when a layout other than the list, or the chart, is chosen.
 */
const COLS: SortKey[] = ['name', 'tags', 'words', 'links', 'changed', 'made'];
export function NotesTable({notes}: {notes: readonly Note[]}) {
  const [key, setKey] = useState<SortKey>('changed'), [dir, setDir] = useState<'ascending' | 'descending'>('descending');
  const rows = useMemo(() => sortRows(noteRows(notes), key, dir), [notes, key, dir]);
  const sortBy = (k: SortKey) => { if (k === key) setDir(d => d === 'ascending' ? 'descending' : 'ascending'); else { setKey(k); setDir(firstDirection(k)); } };
  return <div className="notes-table-wrap" role="region" aria-label="Notes as a table" tabIndex={0}>
    <table className="notes-table">
      <caption className="sr-only">Your notes, sorted by {SORT_LABELS[key].toLowerCase()}, {dir}. A column&rsquo;s button sorts by it.</caption>
      <thead><tr>{COLS.map(k => <th key={k} scope="col" aria-sort={k === key ? dir : 'none'}><button type="button" className="notes-sort" onClick={() => sortBy(k)}>{SORT_LABELS[k]}<span aria-hidden="true">{k === key ? (dir === 'ascending' ? ' ↑' : ' ↓') : ''}</span></button></th>)}</tr></thead>
      <tbody>{rows.map(r => <tr key={r.id}>
        <th scope="row"><Link className="text-link" href={noteHref(r.id)}>{r.name}</Link>{r.pinned && <span className="fine"> · pinned</span>}{r.example && <span className="fine"> · example</span>}</th>
        <td>{r.tags.length ? r.tags.map(t => `#${t}`).join(' ') : <span className="fine">—</span>}</td>
        <td className="num">{formatNumber(r.words)}</td><td className="num">{formatNumber(r.links)}</td>
        <td>{formatDate(r.changed, {year: false})}</td><td>{formatDate(r.made, {year: false})}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}
function Thumb({note}: {note: Note}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let made: string | null = null, live = true;
    if (note.photoId) void getNotePhoto(photoScope(), note.photoId).then(p => { if (live && p) { made = URL.createObjectURL(p.blob); setUrl(made); } }, () => undefined);
    return () => { live = false; if (made) URL.revokeObjectURL(made); };
  }, [note.photoId]);
  // eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo
  return url ? <img className="notes-card-photo" src={url} alt="" loading="lazy"/> : null;
}
export function NotesGallery({notes}: {notes: readonly Note[]}) {
  const rows = useMemo(() => new Map(noteRows(notes).map(r => [r.id, r])), [notes]);
  return <ul className="notes-gallery" aria-label="Notes as a gallery">{notes.map(n => { const r = rows.get(n.id)!; return <li key={n.id} className="notes-card">
    {n.photoId && <Thumb note={n}/>}
    <Link className="notes-card-link" href={noteHref(n.id)}><strong>{r.name}</strong></Link>
    <p className="fine notes-card-text">{n.body.replace(/\(SHOWCASE DATA\)/g, '').replace(/\s+/g, ' ').trim().slice(0, 140) || 'No words yet.'}</p>
    <p className="fine">{[r.tags.map(t => `#${t}`).join(' '), `${formatNumber(r.words)} words`, `changed ${formatDate(r.changed, {year: false})}`].filter(Boolean).join(' · ')}{n.example ? ' · example' : ''}</p>
  </li>; })}</ul>;
}
export function NotesChart({notes, today}: {notes: readonly Note[]; today: string}) {
  const per = useMemo(() => notesPerTag(notes), [notes]), weeks = useMemo(() => notesPerWeek(notes, today), [notes, today]);
  const top = Math.max(1, ...per.tags.map(t => t.count), per.untagged), topWeek = Math.max(1, ...weeks.map(w => w.count));
  return <div className="notes-chart">
    <section aria-labelledby="notes-chart-tags"><h3 id="notes-chart-tags">Notes per tag</h3>
      {per.tags.length ? <ul className="notes-bars">{[...per.tags.slice(0, 12), ...(per.untagged ? [{tag: '', count: per.untagged}] : [])].map(t => <li key={t.tag || 'none'}>
        <span className="notes-bar-label">{t.tag ? `#${t.tag}` : 'No tag'}</span>
        <span className="notes-bar" aria-hidden="true"><span style={{width: `${(t.count / top) * 100}%`}} data-none={t.tag ? undefined : ''}/></span>
        <span className="notes-bar-value">{t.count === 1 ? '1 note' : `${formatNumber(t.count)} notes`}</span>
      </li>)}</ul> : <p className="fine">No note has a tag yet. A note imported with tags in its front matter (Files → Import), or a Showcase note, shows here.</p>}
    </section>
    <section aria-labelledby="notes-chart-weeks"><h3 id="notes-chart-weeks">Written or changed, per week</h3>
      <ul className="notes-bars">{weeks.map(w => <li key={w.start}>
        <span className="notes-bar-label">Week of {formatDate(w.start, {year: false})}</span>
        <span className="notes-bar" aria-hidden="true"><span style={{width: `${(w.count / topWeek) * 100}%`}}/></span>
        <span className="notes-bar-value">{w.count === 1 ? '1 note' : `${formatNumber(w.count)} notes`}</span>
      </li>)}</ul>
    </section>
    <p className="fine">Counted from your own notes on this device.</p>
  </div>;
}
export default function NotesViews({notes, layout, today}: {notes: readonly Note[]; layout: 'table' | 'gallery' | 'chart'; today: string}) {
  return layout === 'table' ? <NotesTable notes={notes}/> : layout === 'gallery' ? <NotesGallery notes={notes}/> : <NotesChart notes={notes} today={today}/>;
}
