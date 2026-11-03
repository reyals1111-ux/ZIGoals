'use client';
import Link from 'next/link';
import {useMemo, useState, type FormEvent} from 'react';
import {addMemory, deleteNote, editMemory, isHealthNote, memoryExport, memoryGroups, memoryKind, memorySource, MEMORY_KIND_LABELS, restoreNote, setPinned, type MemoryKind} from '../../../lib/ai/memory';
import {AI_MEMORY, AI_OPTIONS, MAX_NOTE_CHARS, MAX_NOTES, MEMORY_KINDS, type MemoryNoteRecord} from '../../../lib/ai/store/records';
import {isShowcase} from '../../../lib/showcase-storage';
import {formatDate} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import '../../ai/ai.css';
import './panels.css';

/**
 * NOVA's Memory panel (Session AK, owner follow-up 2 N7): ZIGi's one memory (`zigoals:ai-memory:v1`), so what the person
 * tells ZIGi NOVA knows, and back. Grouped as pinned, preferences, decisions, people and context; each note with where it
 * came from and its dates; edit, pin, forget (with Undo) and export. A note is kept only when the person writes it or
 * accepts a proposal; a note about health goes to an AI only while Health is shared. "Use my notes" and the switch for
 * notes from ZIGi's cards stay in Settings → What ZIGi knows about me (one place for those choices).
 */
const KIND_HINT: Record<MemoryKind, string> = {preference: 'I prefer short answers in the morning.', decision: 'I decided to review my week on Sundays.', person: 'Sam is my running partner.', context: 'I work from home on Fridays.'};
const excerpt = (text: string) => text.length > 40 ? `${text.slice(0, 40)}…` : text;
export default function MemoryPanel() {
  const memory = useDeviceRecord(AI_MEMORY), options = useDeviceRecord(AI_OPTIONS), showcase = isShowcase();
  const groups = useMemo(() => memoryGroups(memory.data.notes ?? []), [memory.data.notes]), count = memory.data.notes?.length ?? 0;
  const [kind, setKind] = useState<MemoryKind>('preference'), [draft, setDraft] = useState(''), [about, setAbout] = useState('');
  const [editing, setEditing] = useState<string | null>(null), [message, setMessage] = useState<{text: string; failed?: boolean; restore?: MemoryNoteRecord} | null>(null);
  const change = (apply: Parameters<typeof memory.update>[0], text: string, restore?: MemoryNoteRecord) => {
    try { memory.update(apply); setMessage({text, ...(restore ? {restore} : {})}); return true; }
    catch (error) { setMessage({text: error instanceof Error ? error.message : 'Not saved on this device.', failed: true}); return false; }
  };
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (change(current => addMemory(current, {text: draft, kind, source: 'person', by: 'person', label: 'NOVA', ...(about ? {about} : {})}, new Date(), true), 'Kept in your memory.')) { setDraft(''); setAbout(''); }
  };
  const exportFile = () => {
    const url = URL.createObjectURL(new Blob([memoryExport(memory.data, new Date())], {type: 'application/json'})), a = document.createElement('a');
    a.href = url; a.download = 'my-memory.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage({text: 'Your memory was saved as a file (my-memory.json): your words, kinds and dates only.'});
  };
  if (!memory.loaded || !options.loaded) return <p className="ai-note" role="status">Reading your memory…</p>;
  return <div className="nova-memory ai-memory">
    <p className="ai-note">One memory for NOVA and ZIGi, on this device only, never synced, in Export everything. NOVA or ZIGi may propose something to remember; nothing is kept until you accept it.{options.data.useNotes === false ? ' "Use my notes" is off: your memory stays here and goes to no AI.' : ''}{showcase ? ' Showcase: notes you add stay in this tab.' : ''}</p>
    {memory.unreadable && <p role="alert">Your memory on this device could not be read, so none of it is used. Adding a note starts a new list in its place.</p>}
    <form className="ai-memory-add" onSubmit={add} aria-label="Remember something">
      <label className="field">Kind<select value={kind} onChange={e => setKind(e.target.value as MemoryKind)}>{MEMORY_KINDS.map(k => <option key={k} value={k}>{MEMORY_KIND_LABELS[k]}</option>)}</select></label>
      <label className="field">What to remember<textarea value={draft} maxLength={MAX_NOTE_CHARS} rows={2} onChange={e => setDraft(e.target.value)} placeholder={`For example: ${KIND_HINT[kind]}`} autoComplete="off"/></label>
      <label className="field">About a day (optional)<input type="date" value={about} onChange={e => setAbout(e.target.value)}/></label>
      <div className="ai-card-actions"><button type="submit" className="primary" disabled={!draft.trim() || count >= MAX_NOTES}>Remember</button><span className="ai-note">{count} of {MAX_NOTES} · never a key or a password</span></div>
    </form>
    {count === 0 ? <div className="nova-panel-empty"><p><strong>Nothing remembered yet.</strong></p><p className="ai-note">Add a preference, a decision, a person or some context above. In a chat, NOVA and ZIGi can offer a &ldquo;Remember this?&rdquo; card; it is kept only when you press Remember.</p></div>
      : groups.map(group => <section key={group.id} aria-labelledby={`nova-mem-${group.id}`}>
        <h4 id={`nova-mem-${group.id}`}>{group.label} <span className="ai-note">({group.notes.length})</span></h4>
        <ul className="ai-memory-list">{group.notes.map(note => <li key={note.id} className="ai-memory-note">
          {editing === note.id ? <MemoryEdit note={note} onCancel={() => setEditing(null)} onSave={(text, k, day) => { if (change(current => editMemory(current, note.id, {text, kind: k, about: day || null}, new Date()), 'Saved.')) setEditing(null); }}/> : <>
            <p className="ai-memory-text">{note.text}</p>
            <p className="ai-memory-meta">{MEMORY_KIND_LABELS[memoryKind(note)]} · {memorySource(note)} · kept {formatDate(note.createdAt)}{note.updatedAt !== note.createdAt ? `, changed ${formatDate(note.updatedAt)}` : ''}{note.about ? ` · about ${formatDate(note.about)}` : ''}{note.paused ? ' · paused' : ''}{isHealthNote(note.category) ? ' · Health: goes to an AI only while Health is shared' : ''}</p>
            <div className="ai-card-actions">
              <button type="button" className="secondary" aria-pressed={note.pinned === true} aria-label={`${note.pinned ? 'Unpin' : 'Pin'} "${excerpt(note.text)}"`} onClick={() => change(current => setPinned(current, note.id, !note.pinned, new Date()), note.pinned ? 'Unpinned.' : 'Pinned: kept first and sent first.')}>{note.pinned ? 'Unpin' : 'Pin'}</button>
              <button type="button" className="secondary" aria-label={`Edit "${excerpt(note.text)}"`} onClick={() => { setEditing(note.id); setMessage(null); }}>Edit</button>
              <button type="button" className="text-link" aria-label={`Forget "${excerpt(note.text)}"`} onClick={() => change(current => deleteNote(current, note.id), 'Forgotten.', note)}>Forget</button>
            </div>
          </>}
        </li>)}</ul>
      </section>)}
    {count > 0 && <div className="ai-card-actions"><button type="button" className="secondary" onClick={exportFile}>Export my memory</button><Link className="text-link nova-link" href="/app/settings#zigi-notes">More choices in Settings</Link></div>}
    {message && <p role={message.failed ? 'alert' : 'status'} className="ai-note">{message.text}{message.restore && <> <button type="button" className="text-link" onClick={() => change(current => restoreNote(current, message.restore!), 'It is back.')}>Undo</button></>}</p>}
  </div>;
}
function MemoryEdit({note, onSave, onCancel}: {note: MemoryNoteRecord; onSave: (text: string, kind: MemoryKind, about: string) => void; onCancel: () => void}) {
  const [text, setText] = useState(note.text), [kind, setKind] = useState<MemoryKind>(memoryKind(note)), [about, setAbout] = useState(note.about ?? '');
  return <form className="ai-memory-edit" aria-label={`Edit "${excerpt(note.text)}"`} onSubmit={event => { event.preventDefault(); onSave(text, kind, about); }}>
    <label className="field">Kind<select value={kind} onChange={e => setKind(e.target.value as MemoryKind)}>{MEMORY_KINDS.map(k => <option key={k} value={k}>{MEMORY_KIND_LABELS[k]}</option>)}</select></label>
    <label className="field">Note<textarea value={text} maxLength={MAX_NOTE_CHARS} rows={3} onChange={e => setText(e.target.value)} autoComplete="off"/></label>
    <label className="field">About a day (optional)<input type="date" value={about} onChange={e => setAbout(e.target.value)}/></label>
    <div className="ai-card-actions"><button type="submit" className="primary" disabled={!text.trim()}>Save</button><button type="button" className="text-link" onClick={onCancel}>Cancel</button></div>
  </form>;
}
