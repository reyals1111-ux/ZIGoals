'use client';
import {useId, useRef, useState, type FormEvent} from 'react';
import {MAX_TAG, MAX_TAGS, cleanTag} from '../../lib/journal/tags';

/**
 * Session AV (owner follow-up 1, F-JOURNAL-TAGS; Day One): an entry's tags under its text — each with its own remove
 * button, and "Add a tag" opening one short field. 44 px targets; the words say which entry each control is for.
 * Session AV (1c, q4 #5, fresh-agent review): focus never falls to the page — after a tag is added (or the field is
 * cancelled) it goes back to "Add a tag"; after a tag is removed, to the next tag's remove button (or the one before, or
 * "Add a tag"). The field offers the tags already in use (`known`, Day One suggests them as you type).
 */
export function EntryTags({tags, day, known = [], onAdd, onRemove}: {tags: readonly string[]; day: string; known?: readonly string[]; onAdd: (tag: string) => void; onRemove: (tag: string) => void}) {
  const [open, setOpen] = useState(false), [value, setValue] = useState(''), [problem, setProblem] = useState(''), id = useId();
  const box = useRef<HTMLDivElement>(null);
  /** After the change has drawn: the remove button at `index` (clamped), else "Add a tag". */
  const focusAfter = (index: number | null) => requestAnimationFrame(() => {
    const removes = [...(box.current?.querySelectorAll<HTMLButtonElement>('.journal-tag-remove') ?? [])];
    const target = index === null ? null : removes[Math.min(index, removes.length - 1)] ?? null;
    (target ?? box.current?.querySelector<HTMLButtonElement>('.journal-tag-add') ?? removes.at(-1) ?? null)?.focus();
  });
  const close = () => { setOpen(false); setValue(''); setProblem(''); focusAfter(null); };
  const add = (event: FormEvent) => {
    event.preventDefault();
    const tag = cleanTag(value);
    if (!tag) return setProblem('Type a tag first.');
    if (tags.some(t => t.toLowerCase() === tag.toLowerCase())) return setProblem('This entry has that tag already.');
    onAdd(tag); close();
  };
  const offered = known.filter(k => !tags.some(t => t.toLowerCase() === k.toLowerCase())).slice(0, 50);
  return <div className="journal-entry-tags" ref={box}>
    {tags.length > 0 && <ul className="journal-tag-list" aria-label={`Tags of the entry of ${day}`}>
      {tags.map((t, i) => <li key={t} className="journal-tag"><span>#{t}</span><button type="button" className="journal-tag-remove" aria-label={`Remove the tag ${t} from the entry of ${day}`} onClick={() => { onRemove(t); focusAfter(tags.length > 1 ? i : null); }}>×</button></li>)}
    </ul>}
    {tags.length < MAX_TAGS && (open
      ? <form className="journal-tag-form" onSubmit={add} aria-label={`Add a tag to the entry of ${day}`} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }}>
          <label className="field"><span>Tag</span><input autoFocus maxLength={MAX_TAG} autoComplete="off" enterKeyHint="done" list={offered.length ? `${id}-known` : undefined} value={value} aria-invalid={problem ? true : undefined} aria-describedby={problem ? `${id}-problem` : undefined} onChange={e => { setValue(e.target.value); setProblem(''); }} placeholder="work, family, a walk"/></label>
          {offered.length > 0 && <datalist id={`${id}-known`}>{offered.map(k => <option key={k} value={k}/>)}</datalist>}
          <button type="submit" className="secondary">Add</button><button type="button" className="quiet" onClick={close}>Cancel</button>
          {problem && <p id={`${id}-problem`} className="field-error" role="alert">{problem}</p>}
        </form>
      : <button type="button" className="text-link journal-tag-add" aria-label={`Add a tag to the entry of ${day}`} onClick={() => setOpen(true)}>Add a tag</button>)}
  </div>;
}
