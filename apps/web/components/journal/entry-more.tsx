'use client';
import {useId, useRef, useState, type FormEvent, type KeyboardEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {JOURNAL, MAX_TEXT, OWN_TITLE_MAX, type JournalEntry} from '../../lib/journal/schema';
import {bookOf, booksOf, moveEntry} from '../../lib/journal/books';
import {editEntry, restoreVersion, undoEntryChange, versionsOf, type EntryUndo} from '../../lib/journal/versions';
import {newOwnTemplateId, suggestedTitle, templateFromEntry} from '../../lib/journal-prompts/own';
import {formatClock, formatDate, formatNumber} from '../../lib/visual-format';
import {SecretGuard} from '../secret-guard/secret-guard';
import {showStatus, showUndo} from '../ui/undo-toast';

/**
 * Session AV lane 2 (journal): an entry's "More" — the things done less often than tagging, so each row stays light
 * (q4 #34): change its words (Day One edits an entry), its earlier versions to read and restore (LEDGER #33, Notion's
 * version history: every change keeps the words it replaced, on this device), save it as a template (LEDGER #39, Day
 * One; QUALITY.md "Not fixed"), and move it to another journal (LEDGER #43). Every change says what happened and offers
 * Undo; focus goes back to the control that opened the part. Loaded when "More" opens.
 */
const two = (n: number) => String(n).padStart(2, '0');
/** A saved moment in this device's own time: "Nov 20, 2026, 9:05 PM". */
const when = (iso: string) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? `${formatDate(`${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`)}, ${formatClock(`${two(d.getHours())}:${two(d.getMinutes())}`)}` : iso; };
export default function EntryMore({entry, day}: {entry: JournalEntry; day: string}) {
  const journal = useDeviceRecord(JOURNAL), id = useId(), box = useRef<HTMLDivElement>(null);
  const books = booksOf(journal.data), current = bookOf(journal.data, entry)?.id ?? '';
  const [to, setTo] = useState(current), [part, setPart] = useState<'edit' | 'template' | null>(null);
  const [text, setText] = useState(entry.text), [title, setTitle] = useState(() => suggestedTitle(entry.text)), [problem, setProblem] = useState('');
  if (!journal.loaded) return <p className="fine">Loading…</p>;
  const versions = versionsOf(journal.data, entry.id);
  const back = (selector: string) => requestAnimationFrame(() => box.current?.querySelector<HTMLElement>(selector)?.focus());
  const close = (selector: string) => { setPart(null); setProblem(''); back(selector); };
  const offerUndo = (message: string, undo: EntryUndo) => showUndo({message, undone: 'The entry is back as it was.', restore: () => journal.update(c => undoEntryChange(c, undo))});
  const save = (event: FormEvent) => {
    event.preventDefault();
    let undo: EntryUndo | null = null;
    try { journal.update(c => { const out = editEntry(c, entry.id, text, new Date().toISOString()); undo = out.undo; return out.journal; }); } catch (e) { setProblem(e instanceof Error ? e.message : 'This could not be saved on this device.'); return; }
    const made = undo as EntryUndo | null;
    if (made) offerUndo(`The entry of ${day} is changed. Its earlier words are under Earlier versions.`, made); else showStatus('Nothing changed.');
    close('[data-part="edit"]');
  };
  const restore = (versionId: string, savedAt: string) => {
    let undo: EntryUndo | null = null;
    try { journal.update(c => { const out = restoreVersion(c, entry.id, versionId, new Date().toISOString()); undo = out.undo; return out.journal; }); } catch (e) { showStatus(e instanceof Error ? e.message : 'This could not be restored on this device.', {tone: 'error'}); return; }
    if (undo) offerUndo(`The words of ${when(savedAt)} are back. The words they replaced are kept as a version.`, undo);
    back('[data-part="edit"]');
  };
  const keepTemplate = (event: FormEvent) => {
    event.preventDefault();
    try { journal.update(c => templateFromEntry(c, entry, title, newOwnTemplateId())); } catch (e) { setProblem(e instanceof Error ? e.message : 'This could not be kept on this device.'); return; }
    showStatus(`Saved as your template “${title.trim()}”. Start from it under Start from a prompt.`);
    close('[data-part="template"]');
  };
  const move = () => {
    try { journal.update(c => moveEntry(c, entry.id, to || null)); } catch (e) { showStatus(e instanceof Error ? e.message : 'This could not be kept on this device.', {tone: 'error'}); return; }
    showStatus(`The entry of ${day} is in ${to ? books.find(b => b.id === to)?.name ?? 'that journal' : 'your main Journal'} now.`);
  };
  const escape = (selector: string) => (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(selector); } };
  return <div className="journal-entry-more-body" ref={box}>
    <div className="journal-entry-more-actions">
      <button type="button" className="secondary" data-part="edit" aria-expanded={part === 'edit'} onClick={() => { setText(entry.text); setProblem(''); setPart(part === 'edit' ? null : 'edit'); }}>Edit the words</button>
      <button type="button" className="quiet" data-part="template" aria-expanded={part === 'template'} onClick={() => { setTitle(suggestedTitle(entry.text)); setProblem(''); setPart(part === 'template' ? null : 'template'); }}>Save as a template</button>
    </div>
    {part === 'edit' && <form className="journal-entry-edit" aria-label={`Edit the entry of ${day}`} onSubmit={save} onKeyDown={escape('[data-part="edit"]')}>
      <label className="field"><span>The entry&rsquo;s words</span><textarea autoFocus rows={6} maxLength={MAX_TEXT} value={text} onChange={e => { setText(e.target.value); setProblem(''); }}/></label>
      <SecretGuard text={text} onRemove={() => setText(entry.text)}/>
      <p className="fine">{formatNumber(text.length)} / {formatNumber(MAX_TEXT)}. The words you change are kept as an earlier version, on this device.</p>
      <div className="journal-actions"><button type="submit" className="primary" disabled={!text.trim() || text.trim() === entry.text}>Save the change</button><button type="button" className="quiet" onClick={() => close('[data-part="edit"]')}>Cancel</button></div>
    </form>}
    {part === 'template' && <form className="journal-entry-template" aria-label={`Save the entry of ${day} as a template`} onSubmit={keepTemplate} onKeyDown={escape('[data-part="template"]')}>
      <label className="field"><span>Template name</span><input autoFocus value={title} maxLength={OWN_TITLE_MAX} onChange={e => { setTitle(e.target.value); setProblem(''); }}/></label>
      <p className="fine">A new entry started from it holds these words{entry.tags?.length ? ` and the tags ${entry.tags.map(t => `#${t}`).join(' ')}` : ''}, ready to change.</p>
      <div className="journal-actions"><button type="submit" className="primary">Keep this template</button><button type="button" className="quiet" onClick={() => close('[data-part="template"]')}>Cancel</button></div>
    </form>}
    {problem && <p className="field-error" role="alert">{problem}</p>}
    <section className="journal-versions" aria-labelledby={`${id}-versions`}>
      <h3 id={`${id}-versions`} className="journal-versions-title">Earlier versions <span className="fine">· {versions.length ? versions.length : 'none yet'}</span></h3>
      {versions.length ? <ol className="journal-versions-list">{versions.map(v => <li key={v.id}>
        <details><summary>Saved {when(v.savedAt)} <span className="fine">· {v.text.replace(/\s+/g, ' ').slice(0, 60)}{v.text.length > 60 ? '…' : ''}</span></summary>
          <p className="journal-entry-text">{v.text}</p>
          <button type="button" className="secondary" aria-label={`Restore the words of ${when(v.savedAt)}`} onClick={() => restore(v.id, v.savedAt)}>Restore this version</button>
        </details>
      </li>)}</ol> : <p className="fine">When you change this entry&rsquo;s words, the words it had are kept here, up to ten, so you can read or restore them.</p>}
    </section>
    {books.length > 0 ? <div className="journal-entry-move" role="group" aria-labelledby={`${id}-move`}>
      <span id={`${id}-move`} className="sr-only">Move the entry of {day}</span>
      <label className="field"><span>Journal</span><select value={to} onChange={e => setTo(e.target.value)}><option value="">Journal (main)</option>{books.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <button type="button" className="secondary" disabled={to === current} onClick={move}>Move</button>
    </div> : <p className="fine">Make a second journal under &ldquo;Your journals&rdquo; to move entries between journals.</p>}
  </div>;
}
