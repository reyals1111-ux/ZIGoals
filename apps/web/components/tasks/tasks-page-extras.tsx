'use client';
import {useState} from 'react';
import type {salvageTasks} from '../../lib/tasks/device';
import {MAX_TASKS, type TaskLevel, type Tasks} from '../../lib/tasks/schema';
import {formatNumber} from '../../lib/visual-format';

/**
 * CI14 (page weights; budgets are never raised): the parts of the Tasks page that show only after an action or in a rare
 * state — saving a typed filter, the bulk bar for selected tasks, and the salvage of an unreadable list — moved here from
 * tasks-page.tsx unchanged, a chunk of their own that the page asks for as it loads.
 */
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
export function FilterSave({onSave}: {onSave: (name: string) => boolean}) {
  const [name, setName] = useState('');
  return <form className="tasks-inline-form" noValidate onSubmit={e => { e.preventDefault(); if (name.trim() && onSave(name.trim())) setName(''); }}><label className="field"><span>Save this filter as</span><input value={name} maxLength={60} placeholder="Calls today" onChange={e => setName(e.target.value)} /></label><button type="submit" className="quiet" disabled={!name.trim()}>Save filter</button></form>;
}
export function BulkBar({count, total, projects, onDone, onLevel, onDue, onMove, onRemove, onClear, onAll}: {count: number; total: number; projects: NonNullable<Tasks['projects']>; onDone: () => void; onLevel: (l: TaskLevel) => void; onDue: (d: 'today' | 'tomorrow') => void; onMove: (p: string | null) => void; onRemove: () => void; onClear: () => void; onAll: () => void}) {
  return <div className="tasks-bulk" role="toolbar" aria-label={`${count} selected`}>
    <strong>{formatNumber(count)} selected</strong>
    {count < total && <button type="button" className="text-link" onClick={onAll}>Select all {formatNumber(total)}</button>}
    <button type="button" className="secondary" onClick={onDone}>Done</button>
    <label className="field"><span>Priority</span><select value="" onChange={e => { if (e.target.value) onLevel(Number(e.target.value) as TaskLevel); }}><option value="">Set…</option>{([1, 2, 3, 4] as const).map(l => <option key={l} value={l}>P{l}</option>)}</select></label>
    <button type="button" className="quiet" onClick={() => onDue('today')}>Due today</button>
    <button type="button" className="quiet" onClick={() => onDue('tomorrow')}>Due tomorrow</button>
    <label className="field"><span>Move to</span><select value="" onChange={e => { if (e.target.value) onMove(e.target.value === 'inbox' ? null : e.target.value); }}><option value="">Choose…</option><option value="inbox">Inbox</option>{projects.filter(p => !p.archived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <button type="button" className="quiet" onClick={onRemove}>Remove</button>
    <button type="button" className="text-link" onClick={onClear}>Clear selection</button>
  </div>;
}
export function Salvage({salvage, onKeep}: {salvage: ReturnType<typeof salvageTasks>; onKeep: () => void}) {
  const save = () => {
    if (!salvage) return;
    const url = URL.createObjectURL(new Blob([salvage.raw], {type: 'application/json'})), a = document.createElement('a');
    a.href = url; a.download = 'zigoals-tasks-unreadable-copy.json'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return <section className="notice tasks-salvage" role="alert">
    <h2>We couldn’t read your tasks on this device</h2>
    <p>Nothing has been written over them. {salvage && salvage.total ? `${plural(salvage.readable.tasks.length, 'task')} of ${formatNumber(salvage.total)} can still be read${salvage.overCap ? ` (the list keeps ${MAX_TASKS}; open ones first)` : ''}${salvage.dropped ? `; ${plural(salvage.dropped, 'entry', 'entries')} cannot` : ''}.` : 'The saved data is damaged.'} Save a copy first, then keep what can be read to go on adding tasks.</p>
    <p className="tasks-io-actions"><button type="button" className="secondary" onClick={save} disabled={!salvage}>Save a copy of the data</button>{salvage && <button type="button" className="quiet" onClick={onKeep}>{salvage.readable.tasks.length ? `Keep the ${formatNumber(salvage.readable.tasks.length)} readable tasks` : 'Start an empty list'}</button>}</p>
  </section>;
}
