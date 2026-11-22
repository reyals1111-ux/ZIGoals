'use client';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import type {Note, Notes} from '../../lib/notes/schema';
import {FILTER_WORDS, boardColumns, byProp, choiceValues, filterNotes, propNames, propOf, removeProp, setProp, valueWords, type PropFilter} from '../../lib/notes/props';
import type {Change} from './note-editor';
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
/**
 * Session AV lane 2 (r3-notes; LEDGER #270, Obsidian's Bases): the table also has a column for each of your own
 * properties (up to ten, the most used first), sortable like the others, and up to three filters on them ("Status is
 * Planning", "Budget is at least 500", "Booked is ticked"); the board groups the notes by a choice property.
 */
const OPS_FOR: Record<string, PropFilter['op'][]> = {text: ['contains', 'is', 'not', 'set', 'unset'], choice: ['is', 'not', 'set', 'unset'], number: ['atLeast', 'atMost', 'is', 'set', 'unset'], date: ['atLeast', 'atMost', 'is', 'set', 'unset'], tick: ['ticked', 'unticked']};
const NO_VALUE_OPS: readonly PropFilter['op'][] = ['set', 'unset', 'ticked', 'unticked'];
type ColKey = SortKey | `prop:${string}`;
function Filters({notes, filters, onChange}: {notes: readonly Note[]; filters: PropFilter[]; onChange: (f: PropFilter[]) => void}) {
  const names = useMemo(() => propNames(notes), [notes]);
  if (!names.length) return null;
  const typeOf = (n: string) => names.find(x => x.name === n)?.type ?? 'text';
  const put = (i: number, f: PropFilter) => onChange(filters.map((x, k) => k === i ? f : x));
  return <div className="notes-filters" role="group" aria-label="Filters on your properties">
    {filters.map((f, i) => { const t = typeOf(f.name), needs = !NO_VALUE_OPS.includes(f.op); return <div key={i} className="notes-filter" role="group" aria-label={`Filter ${i + 1}`}>
      <label className="field"><span>Property</span><select value={f.name} onChange={e => put(i, {name: e.target.value, op: OPS_FOR[typeOf(e.target.value)]![0]!, value: ''})}>{names.map(n => <option key={n.name} value={n.name}>{n.name}</option>)}</select></label>
      <label className="field"><span>Which</span><select value={f.op} onChange={e => put(i, {...f, op: e.target.value as PropFilter['op']})}>{OPS_FOR[t]!.map(o => <option key={o} value={o}>{FILTER_WORDS[o]}</option>)}</select></label>
      {needs && (t === 'choice' ? <label className="field"><span>Value</span><select value={f.value ?? ''} onChange={e => put(i, {...f, value: e.target.value})}><option value="">Choose</option>{choiceValues(notes, f.name).map(v => <option key={v} value={v}>{v}</option>)}</select></label>
        : <label className="field"><span>Value</span><input type={t === 'date' ? 'date' : 'text'} inputMode={t === 'number' ? 'decimal' : undefined} value={f.value ?? ''} onChange={e => put(i, {...f, value: e.target.value})}/></label>)}
      <button type="button" className="quiet" aria-label={`Remove filter ${i + 1}`} onClick={() => { onChange(filters.filter((_, k) => k !== i)); requestAnimationFrame(() => document.querySelector<HTMLElement>('.notes-filters > button')?.focus()); }}>Remove</button>
    </div>; })}
    {filters.length < 3 && <button type="button" className="quiet" onClick={() => { const n = names[0]!; onChange([...filters, {name: n.name, op: OPS_FOR[n.type]![0]!, value: ''}]); }}>Add a filter</button>}
  </div>;
}
const nameOf = (n: Note) => noteRows([n])[0]!.name;
export function NotesTable({notes}: {notes: readonly Note[]}) {
  const [key, setKey] = useState<ColKey>('changed'), [dir, setDir] = useState<'ascending' | 'descending'>('descending'), [filters, setFilters] = useState<PropFilter[]>([]);
  const pcols = useMemo(() => propNames(notes).slice(0, 10), [notes]);
  const shown = useMemo(() => filterNotes(notes, filters.filter(f => NO_VALUE_OPS.includes(f.op) || (f.value ?? '').trim())), [notes, filters]);
  const rows = useMemo(() => {
    if (!key.startsWith('prop:')) return sortRows(noteRows(shown), key as SortKey, dir);
    const name = key.slice(5), byId = new Map(noteRows(shown).map(r => [r.id, r]));
    return [...shown].sort((a, b) => byProp(name, dir)(a, b) || nameOf(a).localeCompare(nameOf(b))).map(n => byId.get(n.id)!);
  }, [shown, key, dir]);
  const notesById = useMemo(() => new Map(notes.map(n => [n.id, n])), [notes]);
  const sortBy = (k: ColKey) => { if (k === key) setDir(d => d === 'ascending' ? 'descending' : 'ascending'); else { setKey(k); setDir(k.startsWith('prop:') ? 'ascending' : firstDirection(k as SortKey)); } };
  const label = (k: ColKey) => k.startsWith('prop:') ? k.slice(5) : SORT_LABELS[k as SortKey];
  const cols: ColKey[] = [...COLS, ...pcols.map(p => `prop:${p.name}` as ColKey)];
  return <>
    <Filters notes={notes} filters={filters} onChange={setFilters}/>
    {filters.length > 0 && <p className="fine" role="status">{rows.length === 1 ? '1 note' : `${formatNumber(rows.length)} notes`} of {formatNumber(notes.length)} pass the filters.</p>}
    <div className="notes-table-wrap" role="region" aria-label="Notes as a table" tabIndex={0}>
    <table className="notes-table">
      <caption className="sr-only">Your notes, sorted by {label(key).toLowerCase()}, {dir}. A column&rsquo;s button sorts by it.</caption>
      <thead><tr>{cols.map(k => <th key={k} scope="col" aria-sort={k === key ? dir : 'none'}><button type="button" className="notes-sort" onClick={() => sortBy(k)}>{label(k)}<span aria-hidden="true">{k === key ? (dir === 'ascending' ? ' ↑' : ' ↓') : ''}</span></button></th>)}</tr></thead>
      <tbody>{rows.map(r => <tr key={r.id}>
        <th scope="row"><Link className="text-link" href={noteHref(r.id)}>{r.name}</Link>{r.pinned && <span className="fine"> · pinned</span>}{r.example && <span className="fine"> · example</span>}</th>
        <td>{r.tags.length ? r.tags.map(t => `#${t}`).join(' ') : <span className="fine">—</span>}</td>
        <td className="num">{formatNumber(r.words)}</td><td className="num">{formatNumber(r.links)}</td>
        <td>{formatDate(r.changed, {year: false})}</td><td>{formatDate(r.made, {year: false})}</td>
        {pcols.map(p => { const v = propOf(notesById.get(r.id)!, p.name); return <td key={p.name} className={v?.t === 'number' ? 'num' : undefined}>{v ? (v.t === 'date' ? formatDate(v.v) : v.t === 'number' ? formatNumber(v.v) : valueWords(v)) : <span className="fine">—</span>}</td>; })}
      </tr>)}</tbody>
    </table>
  </div></>;
}
/** Session AV lane 2 (r3-notes; LEDGER #270, Obsidian's Bases kanban): the notes in columns by a choice property; a card moves with its "Move to" choice (Undo). */
export function NotesBoard({notes, record, change}: {notes: readonly Note[]; record?: Notes; change?: Change}) {
  const choices = useMemo(() => propNames(notes).filter(p => p.type === 'choice'), [notes]);
  const [by, setBy] = useState(choices[0]?.name ?? '');
  const name = choices.some(c => c.name === by) ? by : choices[0]?.name ?? '';
  const cols = useMemo(() => name ? boardColumns(notes, name) : [], [notes, name]);
  if (!choices.length) return <p className="fine">The board groups your notes by a choice property, such as a status. Open a note, then Properties: add one with the type Choice (for example Status: Planning), and give other notes theirs.</p>;
  const values = cols.flatMap(c => c.value === null ? [] : [c.value]);
  const move = (n: Note, to: string) => {
    if (!change || !record) return;
    const id = n.id, now = new Date().toISOString();
    const done = change(r => to ? setProp(r, id, {k: name, t: 'choice', v: to}, now) : removeProp(r, id, name, now), `“${nameOf(n)}” is in ${to || `no ${name}`} now.`);
    if (done) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-board-card="${id}"] select`)?.focus());
  };
  return <>
    <div className="notes-board-pick"><label className="field"><span>Group by</span><select value={name} onChange={e => setBy(e.target.value)}>{choices.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</select></label></div>
    <div className="notes-board" role="region" aria-label={`Notes as a board, by ${name}`} tabIndex={0}>{cols.map(c => <section key={c.value ?? '∅'} className="notes-board-col" aria-label={`${c.value ?? `No ${name}`}: ${c.notes.length === 1 ? '1 note' : `${c.notes.length} notes`}`}>
      <h3>{c.value ?? `No ${name}`} <span className="fine">· {c.notes.length}</span></h3>
      {c.notes.length ? <ul>{c.notes.map(n => <li key={n.id} className="notes-board-card" data-board-card={n.id}>
        <Link href={noteHref(n.id)}>{nameOf(n)}</Link>
        {change && <select aria-label={`Move “${nameOf(n)}” to`} value={c.value ?? ''} onChange={e => move(n, e.target.value)}>{values.map(v => <option key={v} value={v}>{v}</option>)}<option value="">No {name}</option></select>}
      </li>)}</ul> : <p className="fine">None.</p>}
    </section>)}</div>
  </>;
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
export default function NotesViews({notes, layout, today, record, change}: {notes: readonly Note[]; layout: 'table' | 'gallery' | 'chart' | 'board'; today: string; record?: Notes; change?: Change}) {
  return layout === 'table' ? <NotesTable notes={notes}/> : layout === 'gallery' ? <NotesGallery notes={notes}/> : layout === 'board' ? <NotesBoard notes={notes} record={record} change={change}/> : <NotesChart notes={notes} today={today}/>;
}
