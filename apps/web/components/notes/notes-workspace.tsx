'use client';
import Link from 'next/link';
import {NebulaFlow} from '../nebula-flow';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {hideToast, lastToastId} from '../ui/undo-toast';
import {LoadBoundary} from '../load-boundary';
import {SecretGuard} from '../secret-guard/secret-guard';
import {CaptureBox} from './capture-box';
import {NoteEditor} from './note-editor';
import {InboxItem} from './inbox-item';
import {NotesSearch} from './notes-search';
import {useLinkIndex, useLinkTargets, useNotes} from './use-notes';
import {addLocalDays, localDate} from '../../lib/local-date';
import {formatDate} from '../../lib/visual-format';
import {noteName, notePhotoIdsOf, shortNoteName, type Note, type Notes} from '../../lib/notes/schema';
import type {Change} from './note-editor';
import {focusList, taggableNotes} from '../../lib/notes/focus';
import {addTopic, dailiesOf, dailyNoteOf, inboxOf, updateNote} from '../../lib/notes/store';
import {linkKey, noteHref} from '../../lib/notes/links';
import {sweepNotePhotos} from '../../lib/notes/photos';
import {dailyStart, dueSchedules, everyWords, runSchedules, schedulesOf} from '../../lib/notes/schedules';
import {photoScope} from '../../lib/health-aa/photos';
import {openTicks} from '../../lib/notes/ticks';
import {focused, tagTree} from '../../lib/notes/tags';
import {snippetOf} from '../../lib/notes/lock';
import {notReadBack} from '../../lib/notes/read-back';
import './notes.css';
import {useUndoShortcut} from '../tasks/use-undo-shortcut';

const ThisDayStrip = lazy(() => import('./this-day-strip'));
// Session AV lane 2 (LEDGER #31): reminders written inside notes ("@remind tomorrow 9:00 …").
const NotesRemindersPanel = lazy(() => import('./note-reminders').then(m => ({default: m.NotesRemindersPanel})));
const GraphView = lazy(() => import('./graph-view'));
const NotesFiles = lazy(() => import('./notes-files'));
/** Session AK WA (B5): "Ask about my notes" through NOVA's chat (its permission, privacy mode and the person's own model). */
const NotesAsk = lazy(() => import('./notes-ask'));
// Session AV lane 2 (notes; LEDGER #32): repeating notes and the daily note template, each loaded when its fold opens.
const NoteSchedules = lazy(() => import('./note-schedules'));
const DailyTemplate = lazy(() => import('./daily-template'));
// Session AV lane 2 (notes; LEDGER #29, #30): the notes as a table, a gallery or a chart, loaded when chosen.
const NotesViews = lazy(() => import('./notes-views'));
// Session AV lane 2 (r3-notes; LEDGER #264): the open tick boxes of every note, loaded when the fold opens.
const NotesTicks = lazy(() => import('./notes-ticks'));
// Session AV lane 2 (r3-notes; LEDGER #273, Obsidian's Canvas): boards of cards placed by hand, loaded when Canvas opens.
const NotesCanvas = lazy(() => import('./notes-canvas'));
// Session AV lane 2 (r5-notes; LEDGER #360, Logseq): Recently deleted, loaded when its fold opens.
const NotesTrash = lazy(() => import('./notes-trash'));
// Session AV lane 2 (r5-notes; LEDGER #359, Logseq): act on several notes at once, loaded on Select.
const NotesSelect = lazy(() => import('./notes-select'));
// Session AV lane 2 (r5-notes; LEDGER #362, Logseq): a template for every note with a tag, loaded when its fold opens.
const TagTemplates = lazy(() => import('./tag-templates'));
// Session AV lane 2 (r5-notes; LEDGER #365, Logseq): flashcards from the notes, loaded when their fold opens.
const NotesCards = lazy(() => import('./notes-cards'));
// Session AV lane 2 (r6-notes; LEDGER #399, Capacities): rename or merge a tag, loaded when its fold opens.
const TagRename = lazy(() => import('./tag-rename'));
// Session AV lane 2 (r6-notes; LEDGER #402, Capacities): the daily notes not read back yet, loaded when their fold opens.
const ReadBackList = lazy(() => import('./read-back-list'));
const LAYOUTS = [['list', 'List'], ['table', 'Table'], ['gallery', 'Gallery'], ['board', 'Board'], ['chart', 'Chart']] as const; // Session AV lane 2 (r3-notes; LEDGER #270): Board
type Layout = (typeof LAYOUTS)[number][0];

/**
 * Session AK (B): the Notes page — built on the Journal's ideas, all on this device. Capture at the top; then Today (the
 * daily note with its "This day" strip), the Inbox to file, Notes (topics), Days (every daily note), the Graph (a star
 * system, or a list), and Files (Markdown export and import). The place is in the address (?view=, ?day=, ?note=,
 * ?capture=1), so the palette, Quick add, NOVA and the PWA shortcut can open any of it. Every change says what happened;
 * delete and file have Undo.
 */
const VIEWS = [['today', 'Today'], ['inbox', 'Inbox'], ['notes', 'Notes'], ['days', 'Days'], ['graph', 'Graph'], ['canvas', 'Canvas'], ['files', 'Files']] as const; // Session AV lane 2 (r3-notes; LEDGER #273): Canvas
type View = (typeof VIEWS)[number][0];
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export default function NotesWorkspace({showcase = false}: {showcase?: boolean}) {
  const params = useSearchParams(), router = useRouter(), path = usePathname();
  const {notes, status, change: changeNotes} = useNotes(), targets = useLinkTargets();
  const record = notes.data, index = useLinkIndex(record, targets), today = localDate();
  const [searching, setSearching] = useState(false);
  const [layout, setLayout] = useState<Layout>('list'); // Session AV lane 2 (LEDGER #29, #30)
  // Session AV lane 2 (review B3C-12): Open tick boxes loads its chunk only when its fold opens; the count is worked out
  // once per change of the notes, not on every keystroke in the search.
  const [ticksOpen, setTicksOpen] = useState(false);
  const openTickCount = useMemo(() => openTicks(record.notes).length, [record.notes]);
  useUndoShortcut(); // Session AL (P-LS-08): Ctrl/⌘+Z runs the toast's Undo, never in a text field.
  const noteId = params.get('note'), dayParam = params.get('day'), capture = params.get('capture') === '1';
  const day = dayParam === 'today' || !dayParam ? today : DAY.test(dayParam) ? dayParam : today;
  const view: View = noteId ? 'notes' : dayParam ? 'today' : (VIEWS.find(([v]) => v === params.get('view'))?.[0] ?? 'today');
  const go = (q: Record<string, string>) => { const query = new URLSearchParams(q).toString(); router.replace(query ? `${path}?${query}` : path, {scroll: false}); };
  const inbox = inboxOf(record), open = noteId ? record.notes.find(n => n.id === noteId) ?? null : null;
  // Session AL final pass (PR-106, AL-TOAST-011): a "deleted · Undo" toast belongs to the view it was made in (or the one a
  // delete moves to) and ends when the person opens another Notes view; it had stayed over Days and the Graph.
  const toastOf = useRef<{id: number; view: View} | null>(null);
  const change = useCallback<typeof changeNotes>((fn, said, offer) => {
    const before = lastToastId(), ok = changeNotes(fn, said, offer), id = lastToastId();
    if (id !== before) toastOf.current = {id, view};
    return ok;
  }, [changeNotes, view]);
  useEffect(() => { const t = toastOf.current; if (t && t.view !== view) { hideToast(t.id); toastOf.current = null; } }, [view]);
  const [newTitle, setNewTitle] = useState('');
  // Session AV lane 2 (r4-notes; LEDGER #306, Bear's tag as a workspace): one tag Notes is focused on — its list, search
  // and graph — until cleared; kept in the notes record (`focusTag`), so it stays on this device.
  const focus = record.focusTag;
  const setFocus = (tag?: string) => change(r => { const next = {...r}; if (tag) next.focusTag = tag; else delete next.focusTag; return next; }, tag ? `Notes now show the notes tagged #${tag}.` : 'Focus cleared: every note shows.');
  const focusTag = (tag: string) => { if (setFocus(tag)) go({view: 'notes'}); };
  // Photos whose note is gone are removed from this browser once no note has named them for 30 days (security review
  // Z1B-7, AL Part 14: a Restore of an older copy, then its Undo, must find today's photos still here).
  useEffect(() => {
    if (!notes.loaded || notes.unreadable) return;
    // Session AV lane 2 (r3-notes; LEDGER #273): the photos on a board are named too, so the sweep keeps them.
    // Session AV lane 2 (r4-notes; LEDGER #307): and every photo of a note, not only its first.
    // Session AV lane 2 (r5-notes; LEDGER #360): and every photo of a note in Recently deleted.
    const named = [...record.notes.flatMap(n => notePhotoIdsOf(n)), ...(record.trash ?? []).flatMap(n => notePhotoIdsOf(n)), ...(record.canvases ?? []).flatMap(c => c.nodes.map(n => n.photo))];
    void sweepNotePhotos(photoScope(), named).catch(() => undefined);
    // Only on arrival: a photo deleted with its note during this visit can still come back with Undo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.loaded]);
  // Session AV lane 2 (r5-notes; LEDGER #360): a note deleted more than 30 days ago leaves Recently deleted on arrival.
  useEffect(() => {
    if (!notes.loaded || notes.unreadable || !record.trash?.length) return;
    const cutoff = Date.now() - 30 * 86_400_000;
    if (record.trash.some(n => Date.parse(n.deletedAt) < cutoff)) void import('../../lib/notes/trash').then(({purgeTrash}) => change(r => purgeTrash(r, {before: cutoff}).record, '')).catch(() => undefined);
    // Once on arrival (the photos left go with the arrival sweep's grace).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.loaded]);
  const [readBackOpen, setReadBackOpen] = useState(false); // Session AV lane 2 (r6-notes; LEDGER #402)
  const [trashOpen, setTrashOpen] = useState(false), [selecting, setSelecting] = useState(false), [templatesOpen, setTemplatesOpen] = useState(false), [cardsOpen, setCardsOpen] = useState(false);
  const doneSelecting = () => { setSelecting(false); requestAnimationFrame(() => document.querySelector<HTMLElement>('.note-select-button')?.focus()); };
  // Session AV lane 2 (notes; LEDGER #32): the repeating notes due for this period are made when Notes opens.
  const [madeNote, setMadeNote] = useState(0);
  useEffect(() => {
    if (!notes.loaded || notes.unreadable || showcase || !dueSchedules(record, today).length) return;
    let made = 0;
    change(r => { const out = runSchedules(r, today, new Date().toISOString()); made = out.made.length; return out.record; }, '');
    if (made) setTimeout(() => setMadeNote(made), 0);
    // Once on arrival, and when the day changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.loaded, today]);
  const createNote = (title: string) => {
    const name = title.trim(); if (!name) return;
    const existing = index.byKey.get(linkKey(name));
    if (existing) { router.push(existing.href); return; }
    let made = '';
    if (change(r => { const out = addTopic(r, {title: name, now: new Date().toISOString()}); made = out.note.id; return out.record; }, `“${name}” made. Write in it below.`)) { setNewTitle(''); router.push(noteHref(made)); }
  };
  if (!notes.loaded) return <p className="fine">Loading your notes…</p>;
  const listFirst = view === 'notes' && !noteId && !capture;
  const capturePanel = <section className="panel note-capture-panel" aria-label="Capture">
    <CaptureBox autoFocus={capture} showInboxLink={view !== 'inbox'}/>
  </section>;
  return <div className="notes-workspace">
    {showcase && <p className="fine">Fictional Showcase notes, labelled as examples.</p>}
    {notes.unreadable && <p role="alert">This device&rsquo;s notes could not be read; they are not written over.</p>}
    {/* Session AL (N-DV-07, P-DV-124): the views first, so a phone sees them in its first screen */}
    <nav className="note-tabs" aria-label="Notes views">
      {VIEWS.map(([v, label]) => <button key={v} type="button" className={`note-tab${view === v ? ' is-on' : ''}`} aria-current={view === v ? 'page' : undefined} onClick={() => go(v === 'today' ? {} : {view: v})}>
        {label}{v === 'inbox' && inbox.length > 0 && <><span className="note-tab-count" aria-hidden="true">{inbox.length}</span><span className="sr-only">, {inbox.length} to file</span></>}
      </button>)}
    </nav>
    {/* Session AW (simplicity-b, Part 3): in the Notes view "New note" comes first and Capture follows the list (above it,
        "New note" began 1.05–1.17 screens down); Today, the Inbox and every other view keep Capture at the top. */}
    {!listFirst && capturePanel}
    {status && <p className="note-status" role="status" aria-live="polite">{status}</p>}
    {madeNote > 0 && !status && <p className="note-status" role="status">{madeNote === 1 ? 'A repeating note was made for this period' : `${madeNote} repeating notes were made for this period`}: see <button type="button" className="text-link" onClick={() => { setMadeNote(0); go({view: 'notes'}); }}>Notes</button>.</p>}

    {/* "Open note", not "Note": the note's text box is labelled "Note", and the region around it shared that name (lane NV). */}
    {noteId && <section className="panel" aria-label="Open note">
      <p className="note-back"><button type="button" className="text-link" onClick={() => go(open?.kind === 'daily' ? {view: 'days'} : open?.kind === 'inbox' ? {view: 'inbox'} : {view: 'notes'})}>← {open?.kind === 'daily' ? 'Days' : open?.kind === 'inbox' ? 'Inbox' : 'All notes'}</button></p>
      {open ? <>
        <h2 className="note-title">{/* Session AL (PR-107, P-PR-45): a note with no title of its own is not headed by its first line, which the note shows just below (it read twice) */open.kind === 'daily' && open.day ? formatDate(open.day, {weekday: true}) : open.title.trim() ? open.title.trim() : open.kind === 'inbox' ? `Inbox capture · ${formatDate(open.day ?? open.createdAt.slice(0, 10))}` : noteName(open)}{open.example && <span className="fine"> · Showcase example</span>}</h2>
        {open.kind === 'daily' && open.day && <LoadBoundary quiet><Suspense fallback={<p className="fine">Reading this day…</p>}><ThisDayStrip day={open.day} readBack={open.readBack}/></Suspense></LoadBoundary>}
        <NoteEditor key={open.id} note={open} record={record} index={index} change={change} onCreateLink={createNote} onTag={focusTag} onDeleted={() => { const to: View = open.kind === 'inbox' ? 'inbox' : open.kind === 'daily' ? 'days' : 'notes'; if (toastOf.current) toastOf.current.view = to; go({view: to}); }} onMerged={id => router.push(noteHref(id))}/>
      </> : <p className="fine">This note is not on this device. It may have been deleted. <Link className="text-link" href="/app/notes?view=notes">All notes</Link></p>}
    </section>}

    {!noteId && view === 'today' && (() => { const note = dailyNoteOf(record, day); return <section className="panel note-day" aria-labelledby="note-day-title">
      <div className="note-day-head">
        <button type="button" className="quiet" aria-label="The day before" onClick={() => go({day: addLocalDays(day, -1)})}>←</button>
        <h2 id="note-day-title" className="note-title">{day === today ? 'Today · ' : ''}{formatDate(day, {weekday: true})}</h2>
        <button type="button" className="quiet" aria-label="The day after" disabled={day >= today} onClick={() => go({day: addLocalDays(day, 1)})}>→</button>
        {day !== today && <button type="button" className="text-link" onClick={() => go({})}>Today</button>}
      </div>
      <LoadBoundary quiet><Suspense fallback={<p className="fine">Reading this day…</p>}><ThisDayStrip day={day} readBack={note?.readBack}/></Suspense></LoadBoundary>
      <NoteEditor key={`day-${day}-${note?.id ?? 'new'}`} note={note} record={record} day={day} start={note ? undefined : dailyStart(record, day)} index={index} change={change} onCreateLink={createNote} onTag={focusTag}/>
      {!note && <p className="fine">A daily note for this day is made when you save.{record.dailyTemplate ? ' It starts from your daily note template (Days → Daily note template).' : ''}</p>}
    </section>; })()}

    {!noteId && view === 'inbox' && <section className="panel" aria-labelledby="note-inbox-title">
      <h2 id="note-inbox-title">Inbox</h2>
      {inbox.length ? <ul className="note-inbox">{inbox.map(n => <InboxItem key={n.id} note={n} record={record} targets={targets} today={today} change={change}/>)}</ul>
        : <p className="fine">Nothing to file. Capture a thought above, from Quick add, the search palette (&ldquo;Capture a note&rdquo;) or NOVA; it waits here until you file it into a day, a note, a goal or a habit.</p>}
    </section>}

    {!noteId && view === 'notes' && (() => { const topics = focusList(record, focus), shelved = record.notes.filter(n => n.archived && n.kind !== 'inbox'); return <section className="panel" aria-labelledby="note-list-title">
      <h2 id="note-list-title">Notes</h2>
      <form className="note-new" onSubmit={e => { e.preventDefault(); createNote(newTitle); }}>
        <label className="field"><span>New note</span><input value={newTitle} maxLength={120} onChange={e => setNewTitle(e.target.value)} placeholder="A title, for example Trip ideas"/></label>
        <button type="submit" className="secondary" disabled={!newTitle.trim()}>Make note</button>
        <SecretGuard text={newTitle} onRemove={() => setNewTitle('')}/>
      </form>
      <details className="note-fold note-schedules-fold"><summary>Repeating notes <span className="fine">· {schedulesOf(record).length ? schedulesOf(record).map(x => `${x.title} (${everyWords(x)})`).slice(0, 2).join(', ') : 'a note made every day, week or month'}</span></summary>
        <LoadBoundary quiet><Suspense fallback={<p className="fine">Opening…</p>}><NoteSchedules record={record} change={change} today={today}/></Suspense></LoadBoundary>
      </details>
      <details className="note-fold note-tag-templates-fold" onToggle={e => setTemplatesOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Templates for tags <span className="fine">· {record.tagTemplates?.length ? record.tagTemplates.map(t => `#${t.tag}`).slice(0, 3).join(', ') : 'a new note with a tag starts from its words'}</span></summary>
        {templatesOpen && <LoadBoundary quiet><Suspense fallback={<p className="fine">Opening…</p>}><TagTemplates record={record} change={change}/></Suspense></LoadBoundary>}
      </details>
      <TagFocus notes={taggableNotes(record)} focus={focus} onFocus={setFocus} record={record} change={change}/>
      <NotesSearch notes={focused(record.notes, focus)} onSearching={setSearching}/>
      <LoadBoundary quiet><Suspense fallback={null}><NotesRemindersPanel record={record}/></Suspense></LoadBoundary>
      <details className="note-fold note-cards-fold" onToggle={e => setCardsOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Review cards <span className="fine">· a line “question :: answer” in a note is a card</span></summary>
        {cardsOpen && <LoadBoundary quiet><Suspense fallback={<p className="fine">Opening…</p>}><NotesCards notes={record.notes}/></Suspense></LoadBoundary>}
      </details>
      {(() => { const n = openTickCount; return <details className="note-fold note-ticks-fold" open={ticksOpen || undefined} onToggle={e => setTicksOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Open tick boxes <span className="fine">· {n ? `${n} across your notes` : 'none yet; a line that starts with - [ ] is one'}</span></summary>
        {ticksOpen && <LoadBoundary quiet><Suspense fallback={<p className="fine">Opening…</p>}><NotesTicks record={record} change={change}/></Suspense></LoadBoundary>}
      </details>; })()}
      {topics.length > 0 && !searching && <div className="note-layouts" role="group" aria-label="Show notes as">{LAYOUTS.map(([l, label]) => <button key={l} type="button" className="quiet" aria-pressed={layout === l} onClick={() => { setLayout(l); setSelecting(false); }}>{label}</button>)}</div>}
      {/* Session AV lane 2 (r5-notes; LEDGER #359): Select in the list. */}
      {topics.length > 0 && !searching && layout === 'list' && <div className="note-actions note-select-open"><button type="button" className="quiet note-select-button" aria-pressed={selecting} onPointerEnter={() => void import('./notes-select').catch(() => undefined)} onClick={() => selecting ? doneSelecting() : setSelecting(true)}>Select</button></div>}
      {selecting && layout === 'list' && !searching && topics.length > 0 && <LoadBoundary label="Select"><Suspense fallback={<p className="fine">Opening…</p>}><NotesSelect notes={topics} record={record} change={change} onDone={doneSelecting}/></Suspense></LoadBoundary>}
      {/* Session AL (PR-105, P-PR-43): while a search is typed, its results are the list (the full list no longer stays below "No note has those words.") */}
      {searching || (selecting && layout === 'list' && topics.length) ? null : topics.length && layout !== 'list' ? <LoadBoundary label="This layout"><Suspense fallback={<p className="fine">Laying out your notes…</p>}><NotesViews notes={layout === 'chart' ? focused(record.notes.filter(n => !n.archived), focus) : topics} layout={layout} today={today} record={record} change={change}/></Suspense></LoadBoundary> : topics.length ? <ul className="note-list">{topics.map(n => <li key={n.id}><Link href={noteHref(n.id)}><strong>{n.kind === 'daily' && n.day ? formatDate(n.day, {weekday: true}) : noteName(n)}</strong></Link>{n.kind === 'daily' && <span className="fine"> · daily note</span>}{n.pinned && <span className="fine"> · pinned</span>}{n.example && <span className="fine"> · example</span>}<p className="fine">{snippetOf(n)}</p></li>)}</ul>
        : focus ? <p className="fine">No note is tagged #{focus} yet. <button type="button" className="text-link" onClick={() => setFocus()}>Clear the focus</button> to see every note.</p>
        : <p className="fine">No notes yet. Give one a title above, or file something from the inbox. A note that links a goal or a habit shows on its page.</p>}
      {/* Session AV lane 2 (r4-notes; LEDGER #315): archived notes wait here, out of the list and the graph. */}
      {shelved.length > 0 && !searching && <details className="note-fold note-archived-fold"><summary>Archived <span className="fine">· {shelved.length} {shelved.length === 1 ? 'note' : 'notes'}, still in Search</span></summary>
        <ul className="note-list">{shelved.map(n => <li key={n.id}><Link href={noteHref(n.id)}><strong>{n.kind === 'daily' && n.day ? formatDate(n.day, {weekday: true}) : noteName(n)}</strong></Link>
          <button type="button" className="text-link" onClick={() => change(r => updateNote(r, n.id, {archived: false}, new Date().toISOString()), `“${shortNoteName(n)}” is back in the list.`)}>Back to the list</button></li>)}</ul>
      </details>}
      {/* Session AV lane 2 (r5-notes; LEDGER #360): deleted notes wait here 30 days. */}
      {!searching && <details className="note-fold note-trash-fold" open={trashOpen || undefined} onToggle={e => setTrashOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Recently deleted <span className="fine">· {record.trash?.length ? `${record.trash.length} ${record.trash.length === 1 ? 'note' : 'notes'}, kept 30 days` : 'none; a deleted note waits here 30 days'}</span></summary>
        {trashOpen && <LoadBoundary quiet><Suspense fallback={<p className="fine">Opening…</p>}><NotesTrash record={record} change={change}/></Suspense></LoadBoundary>}
      </details>}
    </section>; })()}
    {listFirst && capturePanel}

    {!noteId && view === 'days' && <section className="panel" aria-labelledby="note-days-title">
      <h2 id="note-days-title">Days</h2>
      <details className="note-fold note-daily-template-fold"><summary>Daily note template <span className="fine">· {record.dailyTemplate ? 'a new daily note starts from it' : 'a new daily note starts empty'}</span></summary>
        <LoadBoundary quiet><Suspense fallback={<p className="fine">Opening…</p>}><DailyTemplate record={record} change={change}/></Suspense></LoadBoundary>
      </details>
      {/* Session AV lane 2 (r6-notes; LEDGER #402): the daily notes of the last 30 days not read back yet. */}
      {(() => { const left = notReadBack(record, today).length; return <details className="note-fold note-read-back-fold" onToggle={e => setReadBackOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Not read back yet <span className="fine">· {left ? `${left} ${left === 1 ? 'daily note' : 'daily notes'} of the last 30 days` : 'none of the last 30 days'}</span></summary>
        {readBackOpen && <LoadBoundary quiet><Suspense fallback={<p className="fine">Opening…</p>}><ReadBackList record={record} change={change} today={today}/></Suspense></LoadBoundary>}
      </details>; })()}
      {dailiesOf(record).some(n => !n.archived) ? <ul className="note-list">{dailiesOf(record).filter(n => !n.archived).map(n => <li key={n.id}><Link href={`/app/notes?day=${n.day}`}><strong>{formatDate(n.day!, {weekday: true})}</strong></Link>{n.readBack && <span className="fine note-read-back-mark"> · read back</span>}<p className="fine">{snippetOf(n) || 'No words yet.'}</p></li>)}</ul>
        : <p className="fine">No daily notes yet. <button type="button" className="text-link" onClick={() => go({})}>Write today&rsquo;s</button>: what you did shows beside it, from your habits, Health, money and goals.</p>}
    </section>}

    {!noteId && view === 'graph' && <section className="panel" aria-labelledby="note-graph-title">
      <h2 id="note-graph-title">Graph</h2>
      {focus && <FocusLine focus={focus} onClear={() => setFocus()}/>}
      <LoadBoundary label="The graph"><Suspense fallback={<p className="fine">Drawing your notes…</p>}><GraphView notes={focused(record.notes.filter(n => !n.archived && !n.locked), focus)} index={index}/></Suspense></LoadBoundary>
    </section>}

    {!noteId && view === 'canvas' && <section className="panel" aria-labelledby="note-canvas-title">
      <h2 id="note-canvas-title"><NebulaFlow identity="note-canvas-title">Canvas</NebulaFlow></h2>
      <LoadBoundary label="The canvas"><Suspense fallback={<p className="fine">Opening your boards…</p>}><NotesCanvas record={record} change={change}/></Suspense></LoadBoundary>
    </section>}

    {!noteId && view === 'files' && <section className="panel" aria-labelledby="note-files-title">
      <h2 id="note-files-title">Files</h2>
      <LoadBoundary label="Markdown files"><Suspense fallback={<p className="fine">Loading…</p>}><NotesFiles record={record} targets={targets} change={change}/></Suspense></LoadBoundary>
    </section>}

    {!noteId && !notes.unreadable && <LoadBoundary quiet><Suspense fallback={null}><NotesAsk notes={record.notes.length} showcase={showcase}/></Suspense></LoadBoundary>}
    <p className="fine notes-privacy">Notes, their photos and your choices stay on this device and are never synced. They reach an AI only if you let NOVA or ZIGi use them, with your own model, within the scopes you choose.</p>
  </div>;
}

/** Session AV lane 2 (r4-notes; LEDGER #306): the focus tag, said where Notes is narrowed by it. */
function FocusLine({focus, onClear}: {focus: string; onClear: () => void}) {
  return <p className="note-focus-line">Showing notes tagged <strong>#{focus}</strong> (and the tags under it). <button type="button" className="text-link" onClick={onClear}>Clear focus</button></p>;
}
/** Session AV lane 2 (r4-notes; LEDGER #306, Bear's tag sidebar): every tag, nested, with its count; one becomes the focus. */
function TagFocus({notes, focus, onFocus, record, change}: {notes: readonly Note[]; focus?: string; onFocus: (tag?: string) => void; record: Notes; change: Change}) {
  const tree = tagTree(notes), tops = tree.filter(t => !t.depth).length, on = (t: string) => focus?.toLowerCase() === t.toLowerCase();
  const [renaming, setRenaming] = useState(false);
  return <>
    {focus && <FocusLine focus={focus} onClear={() => onFocus()}/>}
    <details className="note-fold note-tags-fold"><summary>Tags <span className="fine">· {tree.length ? `${tops} ${tops === 1 ? 'tag' : 'tags'}${tree.length > tops ? ` and ${tree.length - tops} nested` : ''}` : 'none yet; write #travel in a note'}</span></summary>
      {tree.length ? <ul className="note-tag-tree" aria-label="Tags">{tree.map(t => <li key={t.tag} data-depth={t.depth}>
        <button type="button" className="note-tag-pick" aria-pressed={on(t.tag)} onClick={() => onFocus(on(t.tag) ? undefined : t.tag)}>
          <span>#{t.depth ? t.name : t.tag}</span> <span className="fine">{t.count} {t.count === 1 ? 'note' : 'notes'}</span>{t.depth > 0 && <span className="sr-only"> (under #{t.tag.split('/').slice(0, -1).join('/')})</span>}
        </button></li>)}</ul>
        : <p className="fine">Write #travel anywhere in a note, or type it in the note&rsquo;s Tags field. A / nests a tag: #work/meetings sits under #work. Choose a tag here to focus Notes on it — the list, Search and the Graph — until you clear it.</p>}
      {tree.length > 0 && <p className="fine">Choose a tag to focus Notes on it (the list, Search and the Graph); choose it again, or Clear focus, to see every note.</p>}
      {/* Session AV lane 2 (r6-notes; LEDGER #399): rename or merge a tag across every note. */}
      {tree.length > 0 && <details className="note-fold note-tag-rename-fold" onToggle={e => setRenaming((e.currentTarget as HTMLDetailsElement).open)}><summary>Rename or merge a tag <span className="fine">· in every note at once, with Undo</span></summary>
        {renaming && <LoadBoundary quiet><Suspense fallback={<p className="fine">Opening…</p>}><TagRename record={record} change={change}/></Suspense></LoadBoundary>}
      </details>}
    </details>
  </>;
}
