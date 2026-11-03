'use client';
import Link from 'next/link';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {Suspense, lazy, useEffect, useState} from 'react';
import {LoadBoundary} from '../load-boundary';
import {SecretGuard} from '../secret-guard/secret-guard';
import {CaptureBox} from './capture-box';
import {NoteEditor} from './note-editor';
import {InboxItem} from './inbox-item';
import {NotesSearch} from './notes-search';
import {useLinkIndex, useLinkTargets, useNotes} from './use-notes';
import {addLocalDays, localDate} from '../../lib/local-date';
import {formatDate} from '../../lib/visual-format';
import {noteName} from '../../lib/notes/schema';
import {addTopic, dailiesOf, dailyNoteOf, inboxOf, topicsOf} from '../../lib/notes/store';
import {linkKey, noteHref} from '../../lib/notes/links';
import {notePhotoIds, deleteNotePhoto, orphanPhotoIds} from '../../lib/notes/photos';
import {photoScope} from '../../lib/health-aa/photos';
import './notes.css';

const ThisDayStrip = lazy(() => import('./this-day-strip'));
const GraphView = lazy(() => import('./graph-view'));
const NotesFiles = lazy(() => import('./notes-files'));
/** Session AK WA (B5): "Ask about my notes" through NOVA's chat (its permission, privacy mode and the person's own model). */
const NotesAsk = lazy(() => import('./notes-ask'));

/**
 * Session AK (B): the Notes page — built on the Journal's ideas, all on this device. Capture at the top; then Today (the
 * daily note with its "This day" strip), the Inbox to file, Notes (topics), Days (every daily note), the Graph (a star
 * system, or a list), and Files (Markdown export and import). The place is in the address (?view=, ?day=, ?note=,
 * ?capture=1), so the palette, Quick add, NOVA and the PWA shortcut can open any of it. Every change says what happened;
 * delete and file have Undo.
 */
const VIEWS = [['today', 'Today'], ['inbox', 'Inbox'], ['notes', 'Notes'], ['days', 'Days'], ['graph', 'Graph'], ['files', 'Files']] as const;
type View = (typeof VIEWS)[number][0];
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export default function NotesWorkspace({showcase = false}: {showcase?: boolean}) {
  const params = useSearchParams(), router = useRouter(), path = usePathname();
  const {notes, status, undo, runUndo, change} = useNotes(), targets = useLinkTargets();
  const record = notes.data, index = useLinkIndex(record, targets), today = localDate();
  const noteId = params.get('note'), dayParam = params.get('day'), capture = params.get('capture') === '1';
  const day = dayParam === 'today' || !dayParam ? today : DAY.test(dayParam) ? dayParam : today;
  const view: View = noteId ? 'notes' : dayParam ? 'today' : (VIEWS.find(([v]) => v === params.get('view'))?.[0] ?? 'today');
  const go = (q: Record<string, string>) => { const query = new URLSearchParams(q).toString(); router.replace(query ? `${path}?${query}` : path, {scroll: false}); };
  const inbox = inboxOf(record), open = noteId ? record.notes.find(n => n.id === noteId) ?? null : null;
  const [newTitle, setNewTitle] = useState('');
  // Photos whose note is gone (deleted on an earlier visit, past its Undo) are removed from this browser.
  useEffect(() => {
    if (!notes.loaded || notes.unreadable) return;
    const named = record.notes.map(n => n.photoId);
    void notePhotoIds(photoScope()).then(ids => Promise.all(orphanPhotoIds(ids, named).map(id => deleteNotePhoto(photoScope(), id))), () => undefined);
    // Only on arrival: a photo deleted with its note during this visit can still come back with Undo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.loaded]);
  const createNote = (title: string) => {
    const name = title.trim(); if (!name) return;
    const existing = index.byKey.get(linkKey(name));
    if (existing) { router.push(existing.href); return; }
    let made = '';
    if (change(r => { const out = addTopic(r, {title: name, now: new Date().toISOString()}); made = out.note.id; return out.record; }, `“${name}” made. Write in it below.`)) { setNewTitle(''); router.push(noteHref(made)); }
  };
  if (!notes.loaded) return <p className="fine">Loading your notes…</p>;
  return <div className="notes-workspace">
    {showcase && <p className="fine">Fictional Showcase notes, labelled as examples.</p>}
    {notes.unreadable && <p role="alert">This device&rsquo;s notes could not be read; they are not written over.</p>}
    <section className="panel note-capture-panel" aria-label="Capture">
      <CaptureBox autoFocus={capture} showInboxLink={view !== 'inbox'}/>
    </section>
    <nav className="note-tabs" aria-label="Notes views">
      {VIEWS.map(([v, label]) => <button key={v} type="button" className={`note-tab${view === v ? ' is-on' : ''}`} aria-current={view === v ? 'page' : undefined} onClick={() => go(v === 'today' ? {} : {view: v})}>
        {label}{v === 'inbox' && inbox.length > 0 && <><span className="note-tab-count" aria-hidden="true">{inbox.length}</span><span className="sr-only">, {inbox.length} to file</span></>}
      </button>)}
    </nav>
    {(status || undo) && <p className="note-status" role="status" aria-live="polite">{status} {undo && <button type="button" className="text-link" onClick={runUndo}>Undo</button>}</p>}

    {/* "Open note", not "Note": the note's text box is labelled "Note", and the region around it shared that name (lane NV). */}
    {noteId && <section className="panel" aria-label="Open note">
      <p className="note-back"><button type="button" className="text-link" onClick={() => go(open?.kind === 'daily' ? {view: 'days'} : open?.kind === 'inbox' ? {view: 'inbox'} : {view: 'notes'})}>← {open?.kind === 'daily' ? 'Days' : open?.kind === 'inbox' ? 'Inbox' : 'All notes'}</button></p>
      {open ? <>
        <h2 className="note-title">{open.kind === 'daily' && open.day ? formatDate(open.day, {weekday: true}) : noteName(open)}{open.example && <span className="fine"> · Showcase example</span>}</h2>
        {open.kind === 'daily' && open.day && <LoadBoundary quiet><Suspense fallback={<p className="fine">Reading this day…</p>}><ThisDayStrip day={open.day}/></Suspense></LoadBoundary>}
        <NoteEditor key={open.id} note={open} index={index} change={change} onCreateLink={createNote} onDeleted={() => go({view: open.kind === 'inbox' ? 'inbox' : open.kind === 'daily' ? 'days' : 'notes'})}/>
      </> : <p className="fine">This note is not on this device. It may have been deleted. <Link className="text-link" href="/app/notes?view=notes">All notes</Link></p>}
    </section>}

    {!noteId && view === 'today' && (() => { const note = dailyNoteOf(record, day); return <section className="panel note-day" aria-labelledby="note-day-title">
      <div className="note-day-head">
        <button type="button" className="quiet" aria-label="The day before" onClick={() => go({day: addLocalDays(day, -1)})}>←</button>
        <h2 id="note-day-title" className="note-title">{day === today ? 'Today · ' : ''}{formatDate(day, {weekday: true})}</h2>
        <button type="button" className="quiet" aria-label="The day after" disabled={day >= today} onClick={() => go({day: addLocalDays(day, 1)})}>→</button>
        {day !== today && <button type="button" className="text-link" onClick={() => go({})}>Today</button>}
      </div>
      <LoadBoundary quiet><Suspense fallback={<p className="fine">Reading this day…</p>}><ThisDayStrip day={day}/></Suspense></LoadBoundary>
      <NoteEditor key={`day-${day}-${note?.id ?? 'new'}`} note={note} day={day} index={index} change={change} onCreateLink={createNote}/>
      {!note && <p className="fine">A daily note for this day is made when you save.</p>}
    </section>; })()}

    {!noteId && view === 'inbox' && <section className="panel" aria-labelledby="note-inbox-title">
      <h2 id="note-inbox-title">Inbox</h2>
      {inbox.length ? <ul className="note-inbox">{inbox.map(n => <InboxItem key={n.id} note={n} record={record} targets={targets} today={today} change={change}/>)}</ul>
        : <p className="fine">Nothing to file. Capture a thought above, from Quick add, the search palette (&ldquo;Capture a note&rdquo;) or NOVA; it waits here until you file it into a day, a note, a goal or a habit.</p>}
    </section>}

    {!noteId && view === 'notes' && <section className="panel" aria-labelledby="note-list-title">
      <h2 id="note-list-title">Notes</h2>
      <form className="note-new" onSubmit={e => { e.preventDefault(); createNote(newTitle); }}>
        <label className="field"><span>New note</span><input value={newTitle} maxLength={120} onChange={e => setNewTitle(e.target.value)} placeholder="A title, for example Trip ideas"/></label>
        <button type="submit" className="secondary" disabled={!newTitle.trim()}>Make note</button>
        <SecretGuard text={newTitle} onRemove={() => setNewTitle('')}/>
      </form>
      <NotesSearch notes={record.notes}/>
      {topicsOf(record).length ? <ul className="note-list">{topicsOf(record).map(n => <li key={n.id}><Link href={noteHref(n.id)}><strong>{noteName(n)}</strong></Link>{n.pinned && <span className="fine"> · pinned</span>}{n.example && <span className="fine"> · example</span>}<p className="fine">{n.body.replace(/\s+/g, ' ').slice(0, 120)}</p></li>)}</ul>
        : <p className="fine">No notes yet. Give one a title above, or file something from the inbox. A note that links a goal or a habit shows on its page.</p>}
    </section>}

    {!noteId && view === 'days' && <section className="panel" aria-labelledby="note-days-title">
      <h2 id="note-days-title">Days</h2>
      {dailiesOf(record).length ? <ul className="note-list">{dailiesOf(record).map(n => <li key={n.id}><Link href={`/app/notes?day=${n.day}`}><strong>{formatDate(n.day!, {weekday: true})}</strong></Link><p className="fine">{n.body.replace(/\s+/g, ' ').slice(0, 120) || 'No words yet.'}</p></li>)}</ul>
        : <p className="fine">No daily notes yet. <button type="button" className="text-link" onClick={() => go({})}>Write today&rsquo;s</button>: what you did shows beside it, from your habits, Health, money and goals.</p>}
    </section>}

    {!noteId && view === 'graph' && <section className="panel" aria-labelledby="note-graph-title">
      <h2 id="note-graph-title">Graph</h2>
      <LoadBoundary label="The graph"><Suspense fallback={<p className="fine">Drawing your notes…</p>}><GraphView notes={record.notes} index={index}/></Suspense></LoadBoundary>
    </section>}

    {!noteId && view === 'files' && <section className="panel" aria-labelledby="note-files-title">
      <h2 id="note-files-title">Files</h2>
      <LoadBoundary label="Markdown files"><Suspense fallback={<p className="fine">Loading…</p>}><NotesFiles record={record} targets={targets} change={change}/></Suspense></LoadBoundary>
    </section>}

    {!noteId && !notes.unreadable && <LoadBoundary quiet><Suspense fallback={null}><NotesAsk notes={record.notes.length} showcase={showcase}/></Suspense></LoadBoundary>}
    <p className="fine notes-privacy">Notes, their photos and your choices stay on this device and are never synced. They reach an AI only if you let NOVA or ZIGi use them, with your own model, within the scopes you choose.</p>
  </div>;
}
