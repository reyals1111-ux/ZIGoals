'use client';
import {useId, useMemo, useRef, useState, type FormEvent} from 'react';
import type {Habit} from '../../lib/habits';
import {IDENTITY_MAX, MAX_IDENTITIES, countLine, identitiesOf, identityCounts, removeIdentity, restoreIdentity, saveIdentity, type Identity} from '../../lib/habit-intentions/identity';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {showStatus, showUndo} from '../ui/undo-toast';
import type {HabitExtrasState} from './use-habit-extras';
import './habit-mind.css';

/**
 * Session AV lane 2 (r4-mind; LEDGER #323, Atoms' person behind the habits): "Who you are becoming" on the Habits page —
 * up to five lines in the person's own words, each joined to the habits that serve it, with the ticks this month and this
 * week counted toward it ("12 times this month · 3 times this week"). Counts only, never a score. Add, change and remove
 * (with Undo); focus goes to the form's first field and back to the control that opened it. Its own chunk.
 */
export default function HabitIdentity({habits, today, extras}: {habits: readonly Habit[]; today: string; extras: HabitExtrasState}) {
  const id = useId(), box = useRef<HTMLElement>(null);
  const list = useMemo(() => extras.loaded && !extras.unreadable ? identitiesOf(extras.data) : [], [extras.loaded, extras.unreadable, extras.data]);
  const counts = useMemo(() => identityCounts(list, habits, today), [list, habits, today]);
  const [editing, setEditing] = useState<string | 'new' | null>(null), [text, setText] = useState(''), [picked, setPicked] = useState<ReadonlySet<string>>(new Set()), [error, setError] = useState('');
  const keep = useMemo(() => new Set(habits.map(h => h.id)), [habits]);
  const focus = (selector: string) => requestAnimationFrame(() => box.current?.querySelector<HTMLElement>(selector)?.focus());
  const open = (item: Identity | null) => { setEditing(item ? item.id : 'new'); setText(item?.text ?? ''); setPicked(new Set(item?.habits ?? [])); setError(''); focus('.habit-identity-form input[type="text"]'); };
  const close = (back: string) => { setEditing(null); setError(''); focus(back); };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const wasNew = editing === 'new';
    try { extras.update(r => saveIdentity(r, {...(wasNew ? {} : {id: editing!}), text, habits: [...picked]}, keep)); } catch (e) { setError(e instanceof Error && /^(?:Write the line|Up to)/.test(e.message) ? e.message : `Not saved. ${deviceSettingFailureMessage(e)}`); return; }
    showStatus(wasNew ? 'Your line is added. Each tick of its habits counts toward it.' : 'Your line is changed.');
    close(wasNew ? '.habit-identity-add' : `[data-identity="${editing}"] .habit-identity-edit`);
  };
  const remove = (item: Identity) => {
    const at = list.findIndex(i => i.id === item.id);
    try { extras.update(r => removeIdentity(r, item.id)); } catch (e) { showStatus(`Not removed. ${deviceSettingFailureMessage(e)}`, {tone: 'error'}); return; }
    showUndo({message: `“${item.text}” is removed. Its habits stay as they are.`, undone: 'Your line is back.', restore: () => extras.update(r => restoreIdentity(r, item, at))});
    focus('.habit-identity-title');
  };
  if (!extras.loaded || extras.unreadable) return null;
  const form = <form className="habit-identity-form" aria-label={editing === 'new' ? 'A new line about who you are becoming' : 'Change your line'} onSubmit={save} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); close(editing === 'new' ? '.habit-identity-add' : '.habit-identity-title'); } }}>
    <label className="field"><span>In your own words</span><input type="text" maxLength={IDENTITY_MAX} value={text} onChange={e => { setText(e.target.value); setError(''); }} placeholder="I am someone who moves every day"/></label>
    <fieldset className="habit-identity-habits"><legend>The habits that serve it</legend>
      {habits.length ? habits.map(h => <label key={h.id} className="switch-row"><input type="checkbox" checked={picked.has(h.id)} onChange={e => setPicked(p => { const n = new Set(p); if (e.target.checked) n.add(h.id); else n.delete(h.id); return n; })}/> <span>{h.title}</span></label>)
        : <p className="fine">Add a habit first; then join it here.</p>}
    </fieldset>
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="actions"><button type="submit" className="primary">{editing === 'new' ? 'Add the line' : 'Save'}</button><button type="button" className="quiet" onClick={() => close(editing === 'new' ? '.habit-identity-add' : '.habit-identity-title')}>Cancel</button></div>
  </form>;
  return <section className="panel habit-identity" aria-labelledby={`${id}-title`} ref={box}>
    <div className="habit-section-heading"><div><p className="eyebrow">The person behind the habits</p><h2 id={`${id}-title`} className="habit-identity-title" tabIndex={-1}>Who you are becoming</h2>
      <p className="fine">Each tick is a small vote for the person you want to be. Counted from your own habits, never scored.</p></div></div>
    {counts.length ? <ul className="habit-identity-list">{counts.map(c => <li key={c.identity.id} data-identity={c.identity.id}>
      {editing === c.identity.id ? form : <>
        <p className="habit-identity-line">{c.identity.text}</p>
        <p className="fine habit-identity-count">{countLine(c)}</p>
        {c.habits.length > 0 && <p className="fine habit-identity-joined">Through {c.habits.map(h => h.title).join(', ')}</p>}
        <div className="actions"><button type="button" className="quiet habit-identity-edit" aria-label={`Edit “${c.identity.text}”`} onClick={() => open(c.identity)}>Edit</button><button type="button" className="quiet" aria-label={`Remove “${c.identity.text}”`} onClick={() => remove(c.identity)}>Remove</button></div>
      </>}
    </li>)}</ul> : editing !== 'new' && <p className="fine habit-identity-empty">Write who you want to be in a line — “I am someone who reads every evening” — and join the habits that serve it. Their ticks count toward it here.</p>}
    {editing === 'new' ? form : list.length < MAX_IDENTITIES && <button type="button" className="secondary habit-identity-add" onClick={() => open(null)}>{list.length ? 'Add another line' : 'Write your first line'}</button>}
  </section>;
}
