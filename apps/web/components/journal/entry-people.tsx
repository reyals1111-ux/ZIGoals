'use client';
import {useId, useRef, useState, type FormEvent} from 'react';
import {MAX_PEOPLE, PERSON_MAX} from '../../lib/journal/schema';
import {cleanPerson} from '../../lib/journal/people';

/**
 * Session AV lane 2 (r6-notes; LEDGER #401, Diarium's people): "Who was there" under an entry (lazy). Each name is a
 * button that shows "Entries with …"; × takes it off (focus to the next name, or back to "Who was there"). The field
 * offers the names used before; nothing is read from the device's contacts. Up to eight names, 44 px targets, and the
 * words say which entry each control is for.
 */
export default function EntryPeople({people, day, known = [], onAdd, onRemove, onPick}: {people: readonly string[]; day: string; known?: readonly string[]; onAdd: (name: string) => void; onRemove: (name: string) => void; onPick: (name: string) => void}) {
  const [open, setOpen] = useState(false), [value, setValue] = useState(''), [problem, setProblem] = useState(''), id = useId(), box = useRef<HTMLDivElement>(null);
  const focusAfter = (index: number | null) => requestAnimationFrame(() => {
    const removes = [...(box.current?.querySelectorAll<HTMLButtonElement>('.journal-person-remove') ?? [])];
    const target = index === null ? null : removes[Math.min(index, removes.length - 1)] ?? null;
    (target ?? box.current?.querySelector<HTMLButtonElement>('.journal-person-add') ?? removes.at(-1) ?? null)?.focus();
  });
  const close = () => { setOpen(false); setValue(''); setProblem(''); focusAfter(null); };
  const add = (event: FormEvent) => {
    event.preventDefault();
    const name = cleanPerson(value);
    if (!name) return setProblem('Type a name first.');
    if (people.some(p => p.toLowerCase() === name.toLowerCase())) return setProblem('This entry has that name already.');
    onAdd(name); close();
  };
  const offered = known.filter(k => !people.some(p => p.toLowerCase() === k.toLowerCase())).slice(0, 50);
  return <div className="journal-entry-people" ref={box}>
    {people.length > 0 && <ul className="journal-people-list" aria-label={`Who was there, the entry of ${day}`}>
      {people.map((p, i) => <li key={p} className="journal-person">
        <button type="button" className="journal-person-name" aria-label={`Entries with ${p}`} onClick={() => onPick(p)}>{p}</button>
        <button type="button" className="journal-person-remove" aria-label={`Take ${p} off the entry of ${day}`} onClick={() => { onRemove(p); focusAfter(people.length > 1 ? i : null); }}>×</button>
      </li>)}
    </ul>}
    {people.length < MAX_PEOPLE && (open
      ? <form className="journal-tag-form" onSubmit={add} aria-label={`Who was there, the entry of ${day}`} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }}>
          <label className="field"><span>Name</span><input autoFocus maxLength={PERSON_MAX} autoComplete="off" enterKeyHint="done" list={offered.length ? `${id}-known` : undefined} value={value} aria-invalid={problem ? true : undefined} aria-describedby={problem ? `${id}-problem` : `${id}-hint`} onChange={e => { setValue(e.target.value); setProblem(''); }} placeholder="Anna"/></label>
          {offered.length > 0 && <datalist id={`${id}-known`}>{offered.map(k => <option key={k} value={k}/>)}</datalist>}
          <button type="submit" className="secondary">Add</button><button type="button" className="quiet" onClick={close}>Cancel</button>
          {problem ? <p id={`${id}-problem`} className="field-error" role="alert">{problem}</p> : <p id={`${id}-hint`} className="fine">Names you type; nothing is read from your contacts.</p>}
        </form>
      : <button type="button" className="text-link journal-person-add" aria-label={`Who was there: add a name to the entry of ${day}`} onClick={() => setOpen(true)}>Who was there</button>)}
  </div>;
}
