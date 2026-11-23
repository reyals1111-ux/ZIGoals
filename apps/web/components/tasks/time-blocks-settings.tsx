'use client';
import {useId, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus, showUndo} from '../ui/undo-toast';
import {BLOCK_COLOURS, TASK_PLAN, type BlockColour, type TimeBlock} from '../../lib/tasks/plan-record';
import {addBlock, editBlock, removeBlock, type BlockInput} from '../../lib/tasks/time-blocks';
import {WEEKDAY_ORDER, WEEKDAY_WORDS} from '../../lib/tasks/work-hours';
import {LOOK_COLOUR_WORDS, LOOK_HEX} from '../../lib/tasks/look';
import {formatClock, formatDate} from '../../lib/visual-format';
import './tasks-r5.css';

/**
 * Session AV lane 2 (r5-plan, LEDGER #348; Akiflow's time slots), in Tasks → This week, its own chunk: named blocks of time
 * ("Deep work, 9:00–11:00") once on a day or on chosen weekdays, in one of the calm colours. Kept in `zigoals:task-plan:v1`
 * the moment they are saved, and said; a removal has Undo. Tasks go into a block from their editor, from Tasks → Today or by
 * dragging them onto the block on the Agenda's hour grid.
 */
export const blockWhen = (b: Pick<TimeBlock, 'on' | 'days' | 'from' | 'to'>): string => `${formatClock(b.from)}–${formatClock(b.to)}, ${b.on ? formatDate(b.on, {weekday: true, year: false}) : b.days!.length === 7 ? 'every day' : WEEKDAY_ORDER.filter(d => b.days!.includes(d)).map(d => WEEKDAY_WORDS[d]).join(', ')}`;
type Draft = {name: string; colour: BlockColour; from: string; to: string; repeat: 'days' | 'once'; days: number[]; on: string};
const blank = (today: string): Draft => ({name: '', colour: 'blue', from: '09:00', to: '11:00', repeat: 'days', days: [1, 2, 3, 4, 5], on: today});
export default function TimeBlocksSettings({today}: {today: string}) {
  const plan = useDeviceRecord(TASK_PLAN), id = useId(), nameRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft>(() => blank(today)), [editing, setEditing] = useState<string | null>(null), [error, setError] = useState('');
  if (!plan.loaded) return null;
  const blocks = plan.data.blocks ?? [];
  const write = (fn: Parameters<typeof plan.update>[0]): boolean => {
    if (plan.unreadable) { showStatus('Your planning choices could not be read on this device, so nothing was written over them.', {tone: 'error'}); return false; }
    try { plan.update(fn); return true; } catch (e) { setError(e instanceof Error ? e.message : 'That could not be kept on this device.'); return false; }
  };
  const input = (): BlockInput => ({name: draft.name, colour: draft.colour, from: draft.from, to: draft.to, ...(draft.repeat === 'once' ? {on: draft.on} : {days: draft.days})});
  const save = (e: FormEvent) => {
    e.preventDefault(); setError('');
    const value = input();
    const ok = write(p => editing ? editBlock(p, editing, value) : addBlock(p, value, `blk_${crypto.randomUUID().slice(0, 12)}`));
    if (!ok) return;
    showStatus(`${editing ? 'Saved' : 'Added'} “${value.name.trim()}”: ${blockWhen({...value, days: value.days})}.`);
    setEditing(null); setDraft(blank(today)); nameRef.current?.focus();
  };
  const remove = (b: TimeBlock) => {
    if (!write(p => removeBlock(p, b.id))) return;
    showUndo({message: `Removed the block “${b.name}”. Its tasks keep their day.`, undone: `“${b.name}” is back.`, restore: () => plan.update(p => ({...p, blocks: [...(p.blocks ?? []).filter(x => x.id !== b.id), b]}))});
  };
  const open = (b: TimeBlock) => { setEditing(b.id); setDraft({name: b.name, colour: b.colour, from: b.from, to: b.to, repeat: b.on ? 'once' : 'days', days: b.days ?? [1, 2, 3, 4, 5], on: b.on ?? today}); requestAnimationFrame(() => nameRef.current?.focus()); };
  const toggleDay = (d: number) => setDraft(x => ({...x, days: x.days.includes(d) ? x.days.filter(y => y !== d) : [...x.days, d]}));
  return <details className="tasks-blocks">
    <summary>Time blocks <small>{blocks.length ? `${blocks.length} ${blocks.length === 1 ? 'block' : 'blocks'}` : 'named time for a kind of work'}</small></summary>
    {blocks.length ? <ul className="tasks-blocks-list" aria-label="Your time blocks">{blocks.map(b => <li key={b.id} style={{['--block-colour' as string]: LOOK_HEX[b.colour]}}>
      <span className="tasks-block-swatch" aria-hidden="true" />
      <span><strong dir="auto">{b.name}</strong> <small>{blockWhen(b)} · {LOOK_COLOUR_WORDS[b.colour]}</small></span>
      <button type="button" className="text-link" aria-label={`Change the block “${b.name}”`} onClick={() => open(b)}>Change</button>
      <button type="button" className="text-link" aria-label={`Remove the block “${b.name}”`} onClick={() => remove(b)}>Remove</button>
    </li>)}</ul> : <p className="fine">No time blocks yet. A block is time kept for one kind of work, such as “Deep work, 9:00–11:00” on weekdays or “Errands” on Saturday. Drop tasks into it: Plan my day places them inside the block, it says how many are done, and “Move what is left” sends the rest to the next block of the same name.</p>}
    <form className="tasks-hours-form tasks-blocks-form" aria-labelledby={`${id}-form`} noValidate onSubmit={save}>
      <p id={`${id}-form`} className="fine"><strong>{editing ? 'Change the block' : 'Add a block'}</strong></p>
      <label className="field"><span>Name</span><input ref={nameRef} dir="auto" value={draft.name} maxLength={60} placeholder="Deep work" onChange={e => setDraft(x => ({...x, name: e.target.value}))} /></label>
      <label className="field"><span>Colour</span><select value={draft.colour} onChange={e => setDraft(x => ({...x, colour: e.target.value as BlockColour}))}>{BLOCK_COLOURS.map(c => <option key={c} value={c}>{LOOK_COLOUR_WORDS[c]}</option>)}</select></label>
      <label className="field"><span>From</span><input type="time" value={draft.from} onChange={e => setDraft(x => ({...x, from: e.target.value || '09:00'}))} /></label>
      <label className="field"><span>Until</span><input type="time" value={draft.to} onChange={e => setDraft(x => ({...x, to: e.target.value || '11:00'}))} /></label>
      <fieldset><legend>When</legend>
        <label className="tasks-hours-choice"><input type="radio" name={`${id}-repeat`} checked={draft.repeat === 'days'} onChange={() => setDraft(x => ({...x, repeat: 'days'}))} /> On these weekdays</label>
        <label className="tasks-hours-choice"><input type="radio" name={`${id}-repeat`} checked={draft.repeat === 'once'} onChange={() => setDraft(x => ({...x, repeat: 'once'}))} /> Once, on one day</label>
      </fieldset>
      {draft.repeat === 'days' ? <fieldset className="tasks-blocks-days"><legend>Weekdays</legend>{WEEKDAY_ORDER.map(d => <label key={d} className="tasks-hours-choice"><input type="checkbox" checked={draft.days.includes(d)} onChange={() => toggleDay(d)} /> {WEEKDAY_WORDS[d]}</label>)}</fieldset>
        : <label className="field"><span>Day</span><input type="date" min={today} value={draft.on} onChange={e => setDraft(x => ({...x, on: e.target.value}))} /></label>}
      <span className="task-editor-actions"><button type="submit" className="secondary">{editing ? 'Save the block' : 'Add the block'}</button>{editing && <button type="button" className="quiet" onClick={() => { setEditing(null); setDraft(blank(today)); }}>Cancel</button>}</span>
      {error && <p className="tasks-field-error" role="alert">{error}</p>}
    </form>
    <p className="fine">Blocks show on the Day Timeline, the Agenda’s hour grid and Tasks → Today. Kept on this device.</p>
  </details>;
}
