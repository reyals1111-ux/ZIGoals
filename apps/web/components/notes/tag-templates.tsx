'use client';
import {useRouter} from 'next/navigation';
import {useId, useState} from 'react';
import {MAX_TAG_TEMPLATES, MAX_TEMPLATE_BODY, type Notes} from '../../lib/notes/schema';
import {removeTagTemplate, setTagTemplate, tagTemplatesOf, templateWords} from '../../lib/notes/tag-templates';
import {addTopic, updateNote} from '../../lib/notes/store';
import {cleanTag} from '../../lib/notes/bulk';
import {noteHref} from '../../lib/notes/links';
import {localDate} from '../../lib/local-date';
import {formatDate} from '../../lib/visual-format';
import {SecretGuard} from '../secret-guard/secret-guard';
import type {Change} from './note-editor';

/**
 * Session AV lane 2 (r5-notes; LEDGER #362, Logseq's "Apply template to tags"): Notes → Notes → Templates for tags
 * (lazy, loaded when its fold opens). Each tag's words; a new, still empty note given that tag starts from them once.
 * "New #meeting note" makes one at once. `{date}` becomes the day.
 */
export default function TagTemplates({record, change}: {record: Notes; change: Change}) {
  const router = useRouter(), list = tagTemplatesOf(record), id = useId();
  const [editing, setEditing] = useState<string | null>(list.length ? null : ''), [tag, setTag] = useState(''), [text, setText] = useState('');
  const open = (t?: {tag: string; body: string}) => { setEditing(t?.tag ?? ''); setTag(t?.tag ?? ''); setText(t?.body ?? ''); };
  const save = () => { const name = cleanTag(tag); if (change(r => { const next = setTagTemplate(r, tag, text); return editing && name && editing.toLowerCase() !== name.toLowerCase() ? removeTagTemplate(next, editing) : next; }, `A new note tagged #${name ?? tag} starts from these words.`)) setEditing(null); };
  const make = (t: {tag: string; body: string}) => {
    const today = localDate(), title = `${t.tag.split('/').pop()!.replace(/^./, c => c.toUpperCase())} · ${formatDate(today)}`;
    let made = '';
    if (change(r => { const out = addTopic(r, {title, body: templateWords(t, today), now: new Date().toISOString()}); made = out.note.id; return updateNote(out.record, made, {tags: [t.tag]}, new Date().toISOString()); }, `“${title}” made from the #${t.tag} template.`)) router.push(noteHref(made));
  };
  return <div className="note-tag-templates">
    {list.length > 0 && <ul className="note-list">{list.map(t => <li key={t.tag}>
      <strong>#{t.tag}</strong> <span className="fine">· {t.body.split('\n').find(l => l.trim())?.slice(0, 60) ?? ''}</span>
      <div className="note-actions">
        <button type="button" className="secondary" onClick={() => make(t)}>New #{t.tag} note</button>
        <button type="button" className="quiet" aria-label={`Change the #${t.tag} template`} onClick={() => open(t)}>Change</button>
        <button type="button" className="quiet" aria-label={`Remove the #${t.tag} template`} onClick={() => change(r => removeTagTemplate(r, t.tag), `The #${t.tag} template is removed; notes with that tag start empty.`)}>Remove</button>
      </div>
    </li>)}</ul>}
    {editing === null ? <div className="note-actions"><button type="button" className="quiet" disabled={list.length >= MAX_TAG_TEMPLATES} onClick={() => open()}>Add a template for a tag</button>{list.length >= MAX_TAG_TEMPLATES && <span className="fine">At most {MAX_TAG_TEMPLATES}.</span>}</div>
      : <form className="note-tag-template-form" aria-label="A template for a tag" onSubmit={e => { e.preventDefault(); save(); }}>
        <label className="field"><span>Tag</span><input value={tag} maxLength={40} onChange={e => setTag(e.target.value)} placeholder="meeting" aria-describedby={`${id}-help`}/></label>
        <label className="field"><span>A new note with this tag starts with</span><textarea rows={5} maxLength={MAX_TEMPLATE_BODY} value={text} placeholder={'## Who\n\n## What we decided\n- \n\n## Next steps\n- [ ] '} onChange={e => setText(e.target.value)}/></label>
        <SecretGuard text={tag} onRemove={() => setTag('')}/>
        <SecretGuard text={text} onRemove={() => setText('')}/>
        <p className="fine" id={`${id}-help`}>When you give a new, still empty note this tag in its Tags field, it starts from these words once; nothing is written until you save the note. A tag under it (#meeting/standup) uses it too. {'{date}'} becomes the day.</p>
        <div className="note-actions">
          <button type="submit" className="primary" disabled={!cleanTag(tag) || !text.trim()}>Save the template</button>
          <button type="button" className="quiet" onClick={() => setEditing(null)}>Cancel</button>
        </div>
      </form>}
  </div>;
}
