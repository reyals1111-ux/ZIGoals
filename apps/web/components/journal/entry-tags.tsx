'use client';
import {useId, useState, type FormEvent} from 'react';
import {MAX_TAG, MAX_TAGS, cleanTag} from '../../lib/journal/tags';

/**
 * Session AV (owner follow-up 1, F-JOURNAL-TAGS; Day One): an entry's tags under its text — each with its own remove
 * button, and "Add a tag" opening one short field. 44 px targets; the words say which entry each control is for.
 */
export function EntryTags({tags, day, onAdd, onRemove}: {tags: readonly string[]; day: string; onAdd: (tag: string) => void; onRemove: (tag: string) => void}) {
  const [open, setOpen] = useState(false), [value, setValue] = useState(''), [problem, setProblem] = useState(''), id = useId();
  const add = (event: FormEvent) => {
    event.preventDefault();
    const tag = cleanTag(value);
    if (!tag) return setProblem('Type a tag first.');
    if (tags.some(t => t.toLowerCase() === tag.toLowerCase())) return setProblem('This entry has that tag already.');
    onAdd(tag); setValue(''); setProblem(''); setOpen(false);
  };
  return <div className="journal-entry-tags">
    {tags.length > 0 && <ul className="journal-tag-list" aria-label={`Tags of the entry of ${day}`}>
      {tags.map(t => <li key={t} className="journal-tag"><span>#{t}</span><button type="button" className="journal-tag-remove" aria-label={`Remove the tag ${t} from the entry of ${day}`} onClick={() => onRemove(t)}>×</button></li>)}
    </ul>}
    {tags.length < MAX_TAGS && (open
      ? <form className="journal-tag-form" onSubmit={add} aria-label={`Add a tag to the entry of ${day}`}>
          <label className="field"><span>Tag</span><input autoFocus maxLength={MAX_TAG} autoComplete="off" enterKeyHint="done" value={value} aria-invalid={problem ? true : undefined} aria-describedby={problem ? `${id}-problem` : undefined} onChange={e => { setValue(e.target.value); setProblem(''); }} placeholder="work, family, a walk"/></label>
          <button type="submit" className="secondary">Add</button><button type="button" className="quiet" onClick={() => { setOpen(false); setValue(''); setProblem(''); }}>Cancel</button>
          {problem && <p id={`${id}-problem`} className="field-error" role="alert">{problem}</p>}
        </form>
      : <button type="button" className="text-link journal-tag-add" aria-label={`Add a tag to the entry of ${day}`} onClick={() => setOpen(true)}>Add a tag</button>)}
  </div>;
}
