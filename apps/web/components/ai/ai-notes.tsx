'use client';
import {useId, useMemo, useState, type FormEvent} from 'react';
import {addNote, CATEGORY_LABELS, deleteNote, editNote, isHealthNote, newestFirst, restoreNote, type MemoryCategory} from '../../lib/ai/memory';
import {AI_MEMORY, AI_OPTIONS, MAX_NOTE_CHARS, MAX_NOTES, MEMORY_CATEGORIES, type AiMemory, type MemoryNoteRecord} from '../../lib/ai/store/records';
import {isShowcase} from '../../lib/showcase-storage';
import {Switch} from './ai-switch';
import {useDeviceRecord} from './use-device-record';
import {trackedQuestions, ZIGI_SUGGESTIONS} from '../../lib/zigi-suggestions';

/**
 * Settings → ZIGi · your AI → "What ZIGi knows about me" (Session V Part 8): the person's own notes for ZIGi, written
 * here or confirmed on a "Remember this?" card. Add, edit, delete one (with Undo) or delete all; "Use my notes" decides
 * whether they go to the person's AI with their messages (on by default once a note exists). Device-only
 * (`zigoals:ai-memory:v1`), in "Export everything", never synced; in Showcase the tab's own session storage, so fictional
 * notes never reach the person's own. Loaded only when the card opens.
 */
const excerpt = (text: string) => text.length > 40 ? `${text.slice(0, 40)}…` : text;
export default function AiNotes() {
  const memory = useDeviceRecord(AI_MEMORY), options = useDeviceRecord(AI_OPTIONS), showcase = isShowcase();
  const notes = useMemo(() => newestFirst(memory.data.notes ?? []), [memory.data.notes]);
  const [draft, setDraft] = useState(''), [category, setCategory] = useState<MemoryCategory>('preferences');
  const [editing, setEditing] = useState<string | null>(null), [confirmAll, setConfirmAll] = useState(false);
  const [message, setMessage] = useState<{text: string; failed?: boolean; restore?: MemoryNoteRecord} | null>(null);
  const using = options.data.useNotes !== false, hint = useId();
  const change = (apply: (current: AiMemory) => AiMemory, text: string, restore?: MemoryNoteRecord): boolean => {
    try { memory.update(apply); setMessage({text, ...(restore ? {restore} : {})}); return true; }
    catch (error) { setMessage({text: error instanceof Error ? error.message : 'The note could not be saved on this device.', failed: true}); return false; }
  };
  const add = (event: FormEvent) => { event.preventDefault(); if (change(current => addNote(current, {text: draft, category, source: 'person'}, new Date()), 'Note added.')) setDraft(''); };
  const remove = (note: MemoryNoteRecord) => { change(current => deleteNote(current, note.id), 'Note deleted.', note); setEditing(null); };
  const useNotes = (next: boolean) => {
    try { options.update(current => ({...current, useNotes: next})); setMessage({text: next ? 'ZIGi uses your notes again.' : 'Your notes stay here and go nowhere.'}); }
    catch (error) { setMessage({text: `Not saved on this device. ${error instanceof Error ? error.message : ''}`.trim(), failed: true}); }
  };
  const deleteAll = () => {
    try { memory.clear(); setMessage({text: 'All notes were deleted from this device.'}); } catch { setMessage({text: 'The notes could not be deleted on this device.', failed: true}); }
    setConfirmAll(false); setEditing(null);
  };
  if (!memory.loaded || !options.loaded) return <p className="ai-note" role="status">Reading your notes…</p>;
  return <div className="ai-pack-body ai-memory">
    {showcase && <p className="ai-note">Showcase (fictional): notes you add here stay in this tab and are gone when it closes. They never reach your own notes.</p>}
    {memory.unreadable && <p role="alert">The notes on this device could not be read, so ZIGi uses none of them. Adding a note starts a new list in their place.</p>}
    <Switch checked={using} onChange={useNotes} label="Use my notes" note={<>On: your notes go to your AI with each message, as a removable &ldquo;About me&rdquo; chip you see first, and its lookups can read them; never from Settings or a private screen. Notes about health or your diet style go only while Health is shared with ZIGi. Off: they stay here and go nowhere.{notes.length ? '' : ' Nothing to send yet.'}</>}/>
    <form className="ai-memory-add" onSubmit={add} aria-label="Add a note">
      <label className="field">Kind of note<select value={category} onChange={e => setCategory(e.target.value as MemoryCategory)}>{MEMORY_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select></label>
      <label className="field">Your note<textarea value={draft} maxLength={MAX_NOTE_CHARS} rows={2} onChange={e => setDraft(e.target.value)} placeholder="For example: I'm training for a half marathon in April; I prefer short answers." autoComplete="off" aria-describedby={hint}/></label>
      <small id={hint} className="ai-memory-hint">{draft.trim().length} of {MAX_NOTE_CHARS} characters. Never a key, a password or a recovery phrase.</small>
      <div className="ai-card-actions"><button type="submit" className="primary" disabled={!draft.trim() || notes.length >= MAX_NOTES}>Add note</button><span className="ai-note">{notes.length} of {MAX_NOTES} notes · on this device only, in Export everything, never synced</span></div>
    </form>
    {notes.length === 0 ? <p className="ai-note">No notes yet. ZIGi can also offer a &ldquo;Remember this?&rdquo; card when you tell it something lasting about yourself; nothing is kept until you confirm it.</p>
      : <ul className="ai-memory-list" aria-label="Your notes">{notes.map(note => <li key={note.id} className="ai-memory-note">
        {editing === note.id ? <NoteEdit note={note} onCancel={() => setEditing(null)} onSave={(text, kind) => { if (change(current => editNote(current, note.id, {text, category: kind}, new Date()), 'Note saved.')) setEditing(null); }}/> : <>
          <p className="ai-memory-text">{note.text}</p>
          <p className="ai-memory-meta">{CATEGORY_LABELS[note.category]} · {note.source === 'zigi' ? 'from a ZIGi card you confirmed' : 'written by you'} · {note.updatedAt.slice(0, 10)}{isHealthNote(note.category) ? ' · goes to your AI only while Health is shared' : ''}</p>
          <div className="ai-card-actions"><button type="button" className="secondary" aria-label={`Edit the note "${excerpt(note.text)}"`} onClick={() => { setEditing(note.id); setMessage(null); }}>Edit</button><button type="button" className="text-link" aria-label={`Delete the note "${excerpt(note.text)}"`} onClick={() => remove(note)}>Delete</button></div>
        </>}
      </li>)}</ul>}
    {notes.length > 0 && (!confirmAll ? <div className="ai-card-actions"><button type="button" className="text-link" onClick={() => setConfirmAll(true)}>Delete all notes</button></div>
      : <div className="ai-confirm" role="group" aria-label="Delete all notes"><p>All {notes.length} notes go from this device. This cannot be undone.</p><div className="ai-card-actions"><button type="button" className="primary" onClick={deleteAll}>Delete all {notes.length}</button><button type="button" className="text-link" onClick={() => setConfirmAll(false)}>Keep them</button></div></div>)}
    {message && <p role={message.failed ? 'alert' : 'status'} className="ai-note">{message.text}{message.restore && <> <button type="button" className="text-link" onClick={() => change(current => restoreNote(current, message.restore!), 'The note is back.')}>Undo</button></>}</p>}
    <YourQuestions/>
  </div>;
}
/**
 * Session Z-Cloud Part 2 (owner plan edit 9): the questions this device counts for "Yours" suggestions, every one of them,
 * with a one-tap "Forget all". Kept on this device only (`zigoals:zigi-suggestions:v1`), never synced, never sent.
 */
function YourQuestions() {
  const record = useDeviceRecord(ZIGI_SUGGESTIONS), [note, setNote] = useState('');
  const list = record.loaded ? trackedQuestions(record.data).sort((a, b) => Number(b.promoted) - Number(a.promoted) || b.asks - a.asks) : [];
  const forget = () => { try { record.clear(); setNote('Your questions were forgotten on this device.'); } catch { setNote('They could not be removed on this device.'); } };
  return <section className="ai-your-questions" aria-labelledby="ai-your-questions-title">
    <h5 id="ai-your-questions-title" className="ai-your-questions-title">Your frequent questions</h5>
    <p className="ai-note">A question you ask three times within a month becomes a &ldquo;Yours&rdquo; suggestion. Kept on this device only and never synced; it goes to your AI only when you send it. Health questions are kept only while Health is shared with ZIGi.</p>
    {list.length === 0 ? <p className="ai-note">None yet.</p> : <>
      <ul className="ai-memory-list" aria-label="Your frequent questions">{list.map(q => <li key={q.key} className="ai-memory-note"><p className="ai-memory-text">{q.text}</p><p className="ai-memory-meta">{q.promoted ? 'A suggestion' : `Asked ${q.asks === 1 ? 'once' : `${q.asks} times`} in the last 30 days`}{q.pinned ? ' · pinned' : ''}{q.health ? ' · Health' : ''}</p></li>)}</ul>
      <div className="ai-card-actions"><button type="button" className="secondary" onClick={forget}>Forget all</button></div>
    </>}
    {note && <p role="status" className="ai-note">{note}</p>}
  </section>;
}
function NoteEdit({note, onSave, onCancel}: {note: MemoryNoteRecord; onSave: (text: string, category: MemoryCategory) => void; onCancel: () => void}) {
  const [text, setText] = useState(note.text), [kind, setKind] = useState<MemoryCategory>(note.category);
  return <form className="ai-memory-edit" aria-label={`Edit the note "${excerpt(note.text)}"`} onSubmit={event => { event.preventDefault(); onSave(text, kind); }}>
    <label className="field">Kind of note<select value={kind} onChange={e => setKind(e.target.value as MemoryCategory)}>{MEMORY_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select></label>
    <label className="field">Note<textarea value={text} maxLength={MAX_NOTE_CHARS} rows={3} onChange={e => setText(e.target.value)} autoComplete="off"/></label>
    <div className="ai-card-actions"><button type="submit" className="primary" disabled={!text.trim()}>Save</button><button type="button" className="text-link" onClick={onCancel}>Cancel</button></div>
  </form>;
}
