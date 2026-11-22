'use client';
import {useId, useMemo, useState, type FormEvent} from 'react';
import {MAX_PROPS, PROP_TYPES, type Note, type NoteProp, type Notes, type PropType} from '../../lib/notes/schema';
import {PROP_WORDS, choiceValues, propNameIssue, propNames, propsOf, readValue, removeProp, setProp} from '../../lib/notes/props';
import type {Change} from './note-editor';
import {SecretGuard} from '../secret-guard/secret-guard';

/**
 * Session AV lane 2 (r3-notes; LEDGER #270, Obsidian's properties): a note's own properties — each a name with a value
 * of its type (text, a number, a day, a choice, a tick), up to ten. A value is kept when its field is left (or Enter);
 * a tick at once. Names already used on other notes are offered, and a choice offers the values other notes gave it.
 * Remove has Undo. Shown as table columns and a board in Notes → Notes. Loaded when its fold opens.
 */
function ValueField({prop, label, onKeep, options}: {prop: NoteProp; label: string; onKeep: (v: NoteProp['v']) => void; options: string[]}) {
  const id = useId(), [draft, setDraft] = useState(prop.t === 'tick' ? '' : String(prop.v));
  if (prop.t === 'tick') return <input type="checkbox" aria-label={label} checked={prop.v} onChange={e => onKeep(e.target.checked)}/>;
  const keep = () => { const v = readValue(prop.t, draft); if (v !== null && v !== prop.v) onKeep(v); else if (v === null) setDraft(String(prop.v)); };
  return <>
    <input aria-label={label} type={prop.t === 'date' ? 'date' : prop.t === 'number' ? 'text' : 'text'} inputMode={prop.t === 'number' ? 'decimal' : undefined} list={prop.t === 'choice' && options.length ? `${id}-o` : undefined}
      value={draft} onChange={e => setDraft(e.target.value)} onBlur={keep} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); keep(); } }}/>
    {prop.t === 'choice' && options.length > 0 && <datalist id={`${id}-o`}>{options.map(o => <option key={o} value={o}/>)}</datalist>}
  </>;
}
export default function NoteProps({note, record, change}: {note: Note; record: Notes; change: Change}) {
  const id = useId(), props = propsOf(note), known = useMemo(() => propNames(record.notes).filter(p => !props.some(x => x.k.toLowerCase() === p.name.toLowerCase())), [record.notes, props]);
  const [name, setName] = useState(''), [type, setType] = useState<PropType>('text'), [value, setValue] = useState(''), [problem, setProblem] = useState('');
  const now = () => new Date().toISOString();
  const add = (e: FormEvent) => {
    e.preventDefault(); setProblem('');
    const issue = propNameIssue(name); if (issue) return setProblem(issue);
    const v = readValue(type, type === 'tick' ? value === 'yes' : value);
    if (v === null) return setProblem(type === 'number' ? 'Write a number, for example 12 or 4.5.' : type === 'date' ? 'Choose a day.' : 'Write a value.');
    if (change(r => setProp(r, note.id, {k: name, t: type, v}, now()), `Property “${name.trim()}” added.`)) { setName(''); setValue(''); setType('text'); requestAnimationFrame(() => document.getElementById(`${id}-name`)?.focus()); }
  };
  return <div className="note-props">
    {props.length ? <dl className="note-props-list">{props.map(p => <div key={p.k} className="note-props-row">
      <dt>{p.k} <span className="fine">· {PROP_WORDS[p.t].toLowerCase()}</span></dt>
      <dd><ValueField key={`${p.k}-${String(p.v)}`} prop={p} label={p.k} options={p.t === 'choice' ? choiceValues(record.notes, p.k) : []} onKeep={v => change(r => setProp(r, note.id, {k: p.k, t: p.t, v}, now()), `${p.k}: ${p.t === 'tick' ? (v ? 'ticked' : 'not ticked') : String(v)}.`)}/>
        <button type="button" className="quiet" aria-label={`Remove the property ${p.k}`} onClick={() => { if (change(r => removeProp(r, note.id, p.k, now()), `Property “${p.k}” removed.`)) requestAnimationFrame(() => document.getElementById(`${id}-name`)?.focus()); }}>Remove</button></dd>
    </div>)}</dl> : <p className="fine">No properties yet. Give this note your own fields — a status, a day, a number, a tick — and see every note by them in Notes → Notes → Table or Board.</p>}
    {props.length < MAX_PROPS ? <form className="note-props-add" onSubmit={add} aria-label="Add a property">
      <label className="field"><span>Name</span><input id={`${id}-name`} value={name} maxLength={40} list={known.length ? `${id}-known` : undefined} onChange={e => { setName(e.target.value); setProblem(''); const k = known.find(x => x.name.toLowerCase() === e.target.value.trim().toLowerCase()); if (k) setType(k.type); }} placeholder="Status"/></label>
      {known.length > 0 && <datalist id={`${id}-known`}>{known.map(k => <option key={k.name} value={k.name}/>)}</datalist>}
      <label className="field"><span>Type</span><select value={type} onChange={e => { setType(e.target.value as PropType); setValue(''); }}>{PROP_TYPES.map(t => <option key={t} value={t}>{PROP_WORDS[t]}</option>)}</select></label>
      {type === 'tick' ? <label className="field"><span>Value</span><select value={value || 'no'} onChange={e => setValue(e.target.value)}><option value="no">Not ticked</option><option value="yes">Ticked</option></select></label>
        : <label className="field"><span>Value</span><input type={type === 'date' ? 'date' : 'text'} inputMode={type === 'number' ? 'decimal' : undefined} value={value} maxLength={500} onChange={e => { setValue(e.target.value); setProblem(''); }} list={type === 'choice' && name.trim() && choiceValues(record.notes, name).length ? `${id}-choices` : undefined}/></label>}
      {type === 'choice' && name.trim() && <datalist id={`${id}-choices`}>{choiceValues(record.notes, name).map(o => <option key={o} value={o}/>)}</datalist>}
      <button type="submit" className="secondary">Add the property</button>
      <SecretGuard text={`${name} ${value}`} onRemove={() => { setName(''); setValue(''); }}/>
    </form> : <p className="fine">A note keeps up to {MAX_PROPS} properties.</p>}
    {problem && <p className="field-error" role="alert">{problem}</p>}
  </div>;
}
