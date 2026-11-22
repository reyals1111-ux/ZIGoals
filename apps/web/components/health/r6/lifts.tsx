'use client';
import {useId, useRef, useState} from 'react';
import {ENERGY} from '../../../lib/energy/schema';
import {addLift, liftsOf, LIFT_MAX_CHARS, MAX_LIFTS, moveLift, removeLift, restoreLift} from '../../../lib/mood-words/lifts';
import {useDeviceRecord} from '../../ai/use-device-record';
import {showUndo} from '../../ui/undo-toast';
import './body-r6.css';

/**
 * Session AV lane 2, round 6 (r6-body; LEDGER #412, Moodfit's own strategies): "What lifts me", the person's own short
 * list, offered first beside the built-in choices when the check-in's word is unpleasant; one tap makes one a task for
 * today (with Undo). The list is edited here (add, move, remove with Undo); it is kept in the loose daily energy record
 * on this device. Their own words only: nothing is suggested from them, and they never go in a notification. With
 * `lowDay`, a calm link to the person's own "On a low day" page (LEDGER #416). Its own chunk, loaded with the choices.
 */
export default function Lifts({lowDay = false}: {lowDay?: boolean}) {
  const energy = useDeviceRecord(ENERGY), id = useId(), [draft, setDraft] = useState(''), [status, setStatus] = useState(''), [editing, setEditing] = useState(false), list = liftsOf(energy.data);
  const input = useRef<HTMLInputElement>(null), box = useRef<HTMLDivElement>(null);
  if (!energy.loaded || energy.unreadable) return null;
  const save = (change: Parameters<typeof energy.update>[0], said: string) => { try { energy.update(change); setStatus(said); return true; } catch (cause) { setStatus(cause instanceof Error ? cause.message : 'This could not be saved on this device.'); return false; } };
  const add = () => { const line = draft; if (save(r => addLift(r, line), `“${line.replace(/\s+/g, ' ').trim()}” is in what lifts you.`)) { setDraft(''); input.current?.focus(); } };
  const remove = (line: string) => {
    const at = list.indexOf(line);
    if (!save(r => removeLift(r, line), `“${line}” is removed.`)) return;
    showUndo({message: `“${line}” is removed from what lifts you.`, restore: () => energy.update(r => restoreLift(r, line, at)), undone: `“${line}” is back.`});
    requestAnimationFrame(() => (box.current?.querySelector<HTMLElement>('.r6-lines button') ?? input.current)?.focus());
  };
  const move = (line: string, by: -1 | 1) => { if (save(r => moveLift(r, line, by), `“${line}” moved ${by < 0 ? 'up' : 'down'}.`)) requestAnimationFrame(() => box.current?.querySelector<HTMLButtonElement>(`[data-line="${CSS.escape(line)}"][data-move="${by}"]:not(:disabled)`)?.focus()); };
  async function makeTask(line: string) {
    try {
      const {addTask, tasksToday} = await import('../../../lib/tasks/device');
      const made = addTask({title: line, due: tasksToday()});
      setStatus(`“${line}” is a task for today.`);
      showUndo({message: `Task for today: “${line}”.`, restore: made.undo, undone: `The task “${line}” is removed.`, link: {href: `/app/tasks?task=${encodeURIComponent(made.task.id)}`, label: 'Open Tasks'}});
    } catch (cause) { setStatus(cause instanceof Error ? cause.message : 'The task was not saved. Nothing was changed.'); }
  }
  return <div className="r6-lifts" ref={box} role="group" aria-labelledby={`${id}-title`}>
    <p id={`${id}-title`} className="r6-subtitle"><strong>What lifts you</strong> <span className="fine">· your own list</span></p>
    {list.length ? <ul className="r6-lines">{list.map((line, i) => <li key={line}>
      <span>{line}</span>
      <button type="button" className="secondary" onClick={() => void makeTask(line)}>Make it a task for today<span className="sr-only">: {line}</span></button>
      {editing && <>
        <button type="button" className="quiet" data-line={line} data-move="-1" disabled={i === 0} aria-label={`Move “${line}” up`} onClick={() => move(line, -1)}>↑</button>
        <button type="button" className="quiet" data-line={line} data-move="1" disabled={i === list.length - 1} aria-label={`Move “${line}” down`} onClick={() => move(line, 1)}>↓</button>
        <button type="button" className="quiet" aria-label={`Remove “${line}”`} onClick={() => remove(line)}>Remove</button>
      </>}
    </li>)}</ul> : <p className="fine">Nothing here yet. Write down a few small things that lift you, on a good day, so they are here on a harder one: a walk round the block, a call to someone, a song.</p>}
    {(editing || !list.length) && list.length < MAX_LIFTS && <div className="r6-add">
      <label className="field"><span>Something that lifts you ({list.length} of {MAX_LIFTS})</span><input ref={input} type="text" value={draft} maxLength={LIFT_MAX_CHARS} autoComplete="off" onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}/></label>
      <button type="button" className="secondary" onClick={add}>Add</button>
    </div>}
    {list.length > 0 && <p><button type="button" className="text-link" aria-expanded={editing} onClick={() => setEditing(v => !v)}>{editing ? 'Done editing' : 'Edit what lifts you'}</button></p>}
    {lowDay && <p className="fine"><a className="text-link" href="/app/health?view=meditation#low-day">Open your “On a low day” page</a>: the small things you wrote down for a harder day.</p>}
    <p className="fine" role="status" aria-live="polite">{status}</p>
  </div>;
}
