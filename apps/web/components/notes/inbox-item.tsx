'use client';
import Link from 'next/link';
import {useEffect, useId, useState} from 'react';
import {noteName, type Note, type Notes} from '../../lib/notes/schema';
import {fileNote, topicsOf, dailiesOf, removeNote, type FileTarget} from '../../lib/notes/store';
import {noteHref, type LinkSources} from '../../lib/notes/links';
import {getNotePhoto} from '../../lib/notes/photos';
import {photoScope} from '../../lib/health-aa/photos';
import {formatDate} from '../../lib/visual-format';
import type {Change} from './note-editor';
import {SecretGuard} from '../secret-guard/secret-guard';

/**
 * Session AK (B1): one capture in the inbox — its words or photo, when it came in, and how to file it: into today's
 * note or its own day's note, into another note, to a goal or a habit (it becomes a note that links there), or as a new
 * note with a title. Delete has Undo.
 */
type Choice = 'today' | 'its-day' | 'note' | 'goal' | 'habit' | 'new';
const SOURCE_WORD = {text: 'Typed', voice: 'Spoken', photo: 'Photo', import: 'Imported', nova: 'From NOVA'} as const;
export function InboxItem({note, record, targets, today, change}: {note: Note; record: Notes; targets: Omit<LinkSources, 'notes'>; today: string; change: Change}) {
  const id = useId(), [open, setOpen] = useState(false), [choice, setChoice] = useState<Choice>('today');
  const notes = [...topicsOf(record), ...dailiesOf(record)], goals = targets.goals ?? [], habits = targets.habits ?? [];
  const [noteId, setNoteId] = useState(''), [goal, setGoal] = useState(''), [habit, setHabit] = useState(''), [title, setTitle] = useState(noteName(note));
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let made: string | null = null, live = true;
    if (note.photoId) void getNotePhoto(photoScope(), note.photoId).then(p => { if (live && p) { made = URL.createObjectURL(p.blob); setUrl(made); } }, () => undefined);
    return () => { live = false; if (made) URL.revokeObjectURL(made); };
  }, [note.photoId]);
  const name = noteName(note);
  const target = (): FileTarget | null => {
    switch (choice) {
      case 'today': return {kind: 'daily', day: today};
      case 'its-day': return {kind: 'daily', day: note.day ?? today};
      case 'note': return noteId ? {kind: 'note', id: noteId} : null;
      case 'goal': { const g = goals.find(x => x.id === goal); return g ? {kind: 'goal', name: g.name} : null; }
      case 'habit': { const h = habits.find(x => x.id === habit); return h ? {kind: 'habit', name: h.title} : null; }
      case 'new': return title.trim() ? {kind: 'topic', title} : null;
    }
  };
  const where = () => choice === 'today' ? 'today’s note' : choice === 'its-day' ? `the note of ${formatDate(note.day ?? today)}` : choice === 'note' ? `“${notes.find(n => n.id === noteId)?.title ?? 'the note'}”` : choice === 'goal' ? `a note linked to ${goals.find(g => g.id === goal)?.name}` : choice === 'habit' ? `a note linked to ${habits.find(h => h.id === habit)?.title}` : `the new note “${title.trim()}”`;
  const file = () => { const t = target(); if (!t) return; const said = `Filed into ${where()}.`; if (change(r => { const out = fileNote(r, note.id, t, new Date().toISOString()); return {record: out.record, undo: out.undo}; }, said)) setOpen(false); };
  const options: [Choice, string][] = [['today', 'Today’s note'], ...(note.day && note.day !== today ? [['its-day', `Its day’s note (${formatDate(note.day)})`] as [Choice, string]] : []), ...(notes.length ? [['note', 'Another note'] as [Choice, string]] : []), ...(goals.length ? [['goal', 'A goal'] as [Choice, string]] : []), ...(habits.length ? [['habit', 'A habit'] as [Choice, string]] : []), ['new', 'A new note']];
  return <li className="note-inbox-item">
    <div className="note-inbox-main">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo: next/image has nothing to optimise
        <img className="note-inbox-photo" src={url} alt={`Your photo${note.body ? ` with “${name}”` : ''}`} width={64} height={64}/>)}
      <div>
        {note.body ? <p className="note-inbox-text">{note.body.length > 280 ? `${note.body.slice(0, 279)}…` : note.body}</p> : <p className="note-inbox-text fine">A photo, no words yet.</p>}
        <p className="fine">{SOURCE_WORD[note.source ?? 'text']} · {formatDate(note.day ?? note.createdAt.slice(0, 10))}{note.example ? ' · Showcase example' : ''}</p>
      </div>
    </div>
    <div className="note-actions">
      <button type="button" className="secondary" aria-expanded={open} aria-controls={`${id}-file`} onClick={() => setOpen(o => !o)}>{open ? 'Close' : 'File…'}</button>
      <Link className="quiet" href={noteHref(note.id)} aria-label={`Edit “${name}”`}>Edit</Link>
      <button type="button" className="quiet" aria-label={`Delete “${name}”`} onClick={() => change(r => removeNote(r, note.id), `“${name}” deleted.`)}>Delete</button>
    </div>
    {open && <fieldset id={`${id}-file`} className="note-file">
      <legend>File “{name.length > 40 ? `${name.slice(0, 39)}…` : name}” into</legend>
      <div className="note-file-choices">{options.map(([value, label]) => <label key={value} className="note-file-choice"><input type="radio" name={`${id}-to`} checked={choice === value} onChange={() => setChoice(value)}/> <span>{label}</span></label>)}</div>
      {choice === 'note' && <label className="field"><span>Which note</span><select value={noteId} onChange={e => setNoteId(e.target.value)}><option value="">Choose a note</option>{notes.map(n => <option key={n.id} value={n.id}>{n.kind === 'daily' && n.day ? formatDate(n.day, {weekday: true}) : noteName(n)}</option>)}</select></label>}
      {choice === 'goal' && <label className="field"><span>Which goal</span><select value={goal} onChange={e => setGoal(e.target.value)}><option value="">Choose a goal</option>{goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>}
      {choice === 'habit' && <label className="field"><span>Which habit</span><select value={habit} onChange={e => setHabit(e.target.value)}><option value="">Choose a habit</option>{habits.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}</select></label>}
      {choice === 'new' && <><label className="field"><span>Title of the new note</span><input value={title} maxLength={120} onChange={e => setTitle(e.target.value)}/></label><SecretGuard text={title} onRemove={() => setTitle('')}/></>}
      <div className="note-actions"><button type="button" className="primary" disabled={!target()} onClick={file}>File it</button></div>
      {(choice === 'goal' || choice === 'habit') && <p className="fine">It becomes a note that starts with a link to the {choice}, so it shows under &ldquo;Notes that link here&rdquo; there.</p>}
    </fieldset>}
  </li>;
}
