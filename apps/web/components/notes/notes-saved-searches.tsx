'use client';
import {useId, useMemo, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import type {Note, NoteKind} from '../../lib/notes/schema';
import {FILTER_WORDS, type PropFilter} from '../../lib/notes/props';
import {tagTree} from '../../lib/notes/tags';
import {MAX_SAVED_SEARCHES, NOTE_SEARCHES, fromSaved, keepSearch, newSearchId, putBackSearch, removeSearch, renameSearch, searchWords, searching, toSaved, type SearchState} from '../../lib/notes/saved-searches';
import {showStatus, showUndo} from '../ui/undo-toast';
import {Filters} from './notes-views';
import {SecretGuard} from '../secret-guard/secret-guard';

/**
 * Session AW (x3; LEDGER #441, Evernote's saved searches): inside the Notes search (its own chunk, loaded with the Notes
 * list) — the searches kept by name, each opened in one tap; "Narrow the search" by a tag, the kind of note (inbox,
 * daily, topic) and up to three of the table's property filters; "Keep this search" with a name (up to 12, the same name
 * replaces it); and "Rename or remove" with Undo. Only the search is kept on this device (zigoals:note-searches:v1),
 * never a note it finds, so a saved search always reads the notes as they are now; a locked note is found by its name
 * only. Never synced, as the notes.
 */
const KINDS: [NoteKind, string][] = [['topic', 'Topic notes'], ['daily', 'Daily notes'], ['inbox', 'Inbox captures']];
export default function SavedSearches({notes, state, opened, onOpen, onNarrow}: {notes: readonly Note[]; state: SearchState; opened: string | null; onOpen: (s: SearchState, name: string | null) => void; onNarrow: (patch: Partial<Pick<SearchState, 'tag' | 'kind' | 'filters'>>) => void}) {
  const record = useDeviceRecord(NOTE_SEARCHES), id = useId(), list = record.data.searches;
  const tags = useMemo(() => tagTree(notes), [notes]);
  const [name, setName] = useState(''), [problem, setProblem] = useState(''), [narrowOpen, setNarrowOpen] = useState(false), [manageOpen, setManageOpen] = useState(false);
  const [renaming, setRenaming] = useState<Record<string, string>>({});
  const active = searching(state), narrowCount = (state.tag ? 1 : 0) + (state.kind ? 1 : 0) + state.filters.length;
  const keep = (event: FormEvent) => {
    event.preventDefault(); setProblem('');
    const clean = (name || opened || '').trim();
    try { record.update(c => keepSearch(c, toSaved(newSearchId(), clean, state))); setName(''); showStatus(`“${clean.replace(/\s+/g, ' ')}” is kept with your saved searches, above the search.`); }
    catch (e) { setProblem(e instanceof Error ? e.message : 'This could not be kept on this device.'); }
  };
  const rename = (searchId: string, old: string) => {
    const next = (renaming[searchId] ?? old).trim();
    try { record.update(c => renameSearch(c, searchId, next)); setRenaming(r => { const n = {...r}; delete n[searchId]; return n; }); showStatus(`Renamed to “${next}”.`); }
    catch (e) { showStatus(e instanceof Error ? e.message : 'This could not be kept on this device.', {tone: 'error'}); }
  };
  const remove = (searchId: string) => {
    let out: ReturnType<typeof removeSearch> | null = null;
    try { record.update(c => { out = removeSearch(c, searchId); return out.record; }); } catch { showStatus('This could not be removed on this device.', {tone: 'error'}); return; }
    const done = out as ReturnType<typeof removeSearch> | null;
    if (!done?.removed) return;
    const removed = done.removed, at = done.at;
    showUndo({message: `Saved search “${removed.name}” removed.`, undone: 'The saved search is back.', restore: () => record.update(c => putBackSearch(c, removed, at))});
  };
  if (!record.loaded) return null;
  return <div className="note-saved-searches">
    {list.length > 0 && <div className="note-saved-list" role="group" aria-label="Saved searches">
      <span className="fine">Saved searches</span>
      {list.map(x => <button key={x.id} type="button" className="quiet" aria-pressed={opened === x.name} title={searchWords(x, FILTER_WORDS)} onClick={() => onOpen(fromSaved(x), x.name)}>{x.name}</button>)}
    </div>}
    {!state.wide && <details className="note-fold note-narrow-fold" open={narrowOpen || narrowCount > 0 || undefined} onToggle={e => setNarrowOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Narrow the search <span className="fine">· {narrowCount ? `${narrowCount} chosen` : 'a tag, a kind of note, a property'}</span></summary>
      <div className="note-narrow">
        <label className="field"><span>Tag</span><select value={state.tag} onChange={e => onNarrow({tag: e.target.value})}><option value="">Any tag</option>{tags.map(t => <option key={t.tag} value={t.tag}>{`${'· '.repeat(t.depth)}#${t.tag}`}</option>)}</select></label>
        <label className="field"><span>Kind of note</span><select value={state.kind} onChange={e => onNarrow({kind: e.target.value as '' | NoteKind})}><option value="">Every kind</option>{KINDS.map(([k, w]) => <option key={k} value={k}>{w}</option>)}</select></label>
        <Filters notes={notes} filters={state.filters} onChange={(f: PropFilter[]) => onNarrow({filters: f})}/>
        {narrowCount > 0 && <button type="button" className="quiet" onClick={() => onNarrow({tag: '', kind: '', filters: []})}>Clear the narrowing</button>}
      </div>
    </details>}
    {active ? <form className="note-keep-search" onSubmit={keep} aria-labelledby={`${id}-keep`}>
      <label className="field"><span id={`${id}-keep`}>Keep this search as</span><input value={name} maxLength={60} onChange={e => setName(e.target.value)} placeholder={opened ?? 'A name, for example Trip ideas'}/></label>
      <button type="submit" className="secondary" disabled={!(name || opened || '').trim()}>Keep this search</button>
      <SecretGuard text={name} onRemove={() => setName('')}/>
      {problem && <p className="field-error" role="alert">{problem}</p>}
    </form> : list.length === 0 && <p className="fine">Type words or narrow the search, then &ldquo;Keep this search&rdquo; to open it again in one tap (up to {MAX_SAVED_SEARCHES}).</p>}
    {list.length > 0 && <details className="note-fold note-saved-manage" open={manageOpen || undefined} onToggle={e => setManageOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Rename or remove saved searches <span className="fine">· {list.length} of {MAX_SAVED_SEARCHES}</span></summary>
      {manageOpen && <ul className="note-saved-manage-list">{list.map(x => <li key={x.id}>
        <label className="field"><span>Name of “{x.name}”</span><input value={renaming[x.id] ?? x.name} maxLength={60} onChange={e => setRenaming(r => ({...r, [x.id]: e.target.value}))} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); rename(x.id, x.name); } }}/></label>
        <SecretGuard text={renaming[x.id] ?? ''} onRemove={() => setRenaming(r => ({...r, [x.id]: ''}))}/>
        <p className="fine">{searchWords(x, FILTER_WORDS)}</p>
        <div className="note-actions"><button type="button" className="secondary" disabled={(renaming[x.id] ?? x.name).trim() === x.name} onClick={() => rename(x.id, x.name)}>Rename</button><button type="button" className="quiet" aria-label={`Remove the saved search “${x.name}”`} onClick={() => remove(x.id)}>Remove</button></div>
      </li>)}</ul>}
    </details>}
  </div>;
}
