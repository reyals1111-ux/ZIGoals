'use client';
import {useId, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {JOURNAL, JOURNAL_NAME_MAX, JOURNAL_THEMES, MAX_JOURNALS, type JournalTheme} from '../../lib/journal/schema';
import {THEME_WORDS, addBook, bookCounts, changeBook, removeBook, restoreBook} from '../../lib/journal/books';
import {showUndo} from '../ui/undo-toast';

/**
 * Session AV lane 2 (journal; LEDGER #43, Day One's journals and themes): "Your journals" — make a journal with a name and
 * a colour, rename it, change its colour, remove it (its entries move to the main Journal; Undo puts them back). Up to
 * ten beside the main one. Focus never falls to the page: after a change it goes to the journal's own control, or to
 * "Make a journal". Loaded when its fold opens.
 */
function ThemePicker({value, onChange, legend}: {value: JournalTheme; onChange: (t: JournalTheme) => void; legend: string}) {
  const name = useId();
  return <fieldset className="journal-theme-picker"><legend>{legend}</legend>
    {JOURNAL_THEMES.map(t => <label key={t} className="journal-theme-choice"><input type="radio" name={name} checked={value === t} onChange={() => onChange(t)}/><span className="journal-book-dot" data-tone={t} aria-hidden="true"/><span>{THEME_WORDS[t]}</span></label>)}
  </fieldset>;
}
export default function JournalBooks({onMade}: {onMade?: (id: string) => void}) {
  const journal = useDeviceRecord(JOURNAL), box = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(''), [theme, setTheme] = useState<JournalTheme>('teal'), [problem, setProblem] = useState(''), [said, setSaid] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null), [newName, setNewName] = useState('');
  if (!journal.loaded) return <p className="fine">Loading…</p>;
  const counts = bookCounts(journal.data), books = counts.slice(1);
  const focus = (selector: string) => requestAnimationFrame(() => (box.current?.querySelector<HTMLElement>(selector) ?? box.current?.querySelector<HTMLElement>('.journal-books-make input'))?.focus());
  const make = (event: FormEvent) => {
    event.preventDefault(); setProblem('');
    let id = '';
    try { journal.update(c => { const out = addBook(c, {name, theme}); id = out.book.id; return out.journal; }); } catch (e) { setProblem(e instanceof Error ? e.message : 'This could not be kept on this device.'); return; }
    setSaid(`“${name.trim()}” made. Choose it when you write, or move an entry into it.`); setName(''); onMade?.(id);
  };
  const rename = (id: string) => {
    try { journal.update(c => changeBook(c, id, {name: newName})); } catch (e) { setProblem(e instanceof Error ? e.message : 'This could not be kept on this device.'); return; }
    setSaid(`Renamed to “${newName.trim()}”.`); setRenaming(null); setProblem(''); focus(`[data-rename="${id}"]`);
  };
  const remove = (id: string, label: string) => {
    let undo: ReturnType<typeof removeBook>['undo'] | null = null;
    try { journal.update(c => { const out = removeBook(c, id); undo = out.undo; return out.journal; }); } catch (e) { setProblem(e instanceof Error ? e.message : 'This could not be removed on this device.'); return; }
    const kept = undo as ReturnType<typeof removeBook>['undo'] | null;
    showUndo({message: `“${label}” removed. Its ${kept?.moved.length === 1 ? 'entry is' : 'entries are'} in your main Journal.`, undone: `“${label}” is back, with its entries.`, restore: () => { if (kept) journal.update(c => restoreBook(c, kept)); }});
    focus('.journal-books-make input');
  };
  return <div className="journal-books" ref={box}>
    <ul className="journal-books-list" aria-label="Your journals">
      {counts.map(b => <li key={b.id ?? 'main'} className="journal-books-row">
        <p className="journal-books-name"><span className="journal-book-dot" data-tone={b.theme} aria-hidden="true"/><strong>{b.name}</strong> <span className="fine">· {b.count === 1 ? '1 entry' : `${b.count} entries`}{b.id === null ? ' · the main journal' : ''}</span></p>
        {b.id !== null && (renaming === b.id
          ? <form className="journal-books-rename" aria-label={`Rename ${b.name}`} onSubmit={e => { e.preventDefault(); rename(b.id!); }} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setRenaming(null); focus(`[data-rename="${b.id}"]`); } }}>
              <label className="field"><span>New name</span><input autoFocus value={newName} maxLength={JOURNAL_NAME_MAX} onChange={e => { setNewName(e.target.value); setProblem(''); }}/></label>
              <button type="submit" className="secondary">Save</button><button type="button" className="quiet" onClick={() => { setRenaming(null); focus(`[data-rename="${b.id}"]`); }}>Cancel</button>
            </form>
          : <div className="journal-books-actions">
              <button type="button" className="text-link" data-rename={b.id} aria-label={`Rename ${b.name}`} onClick={() => { setRenaming(b.id); setNewName(b.name); setProblem(''); }}>Rename</button>
              <button type="button" className="text-link" aria-label={`Remove ${b.name}`} onClick={() => remove(b.id!, b.name)}>Remove</button>
            </div>)}
        {b.id !== null && <ThemePicker legend={`Colour of ${b.name}`} value={b.theme} onChange={t => { try { journal.update(c => changeBook(c, b.id!, {theme: t})); setSaid(`${b.name} is ${THEME_WORDS[t].toLowerCase()} now.`); } catch { setProblem('This could not be kept on this device.'); } }}/>}
      </li>)}
    </ul>
    {books.length < MAX_JOURNALS ? <form className="journal-books-make" aria-label="Make a journal" onSubmit={make}>
      <label className="field"><span>A new journal</span><input value={name} maxLength={JOURNAL_NAME_MAX} placeholder="Travel, Dreams, Work" onChange={e => { setName(e.target.value); setProblem(''); }}/></label>
      <ThemePicker legend="Its colour" value={theme} onChange={setTheme}/>
      <button type="submit" className="secondary">Make a journal</button>
    </form> : <p className="fine">You have {MAX_JOURNALS} journals beside the main one, the most this device keeps.</p>}
    {problem && <p className="field-error" role="alert">{problem}</p>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
    <p className="fine">Every journal stays on this device. Removing one keeps its entries: they move to your main Journal.</p>
  </div>;
}
