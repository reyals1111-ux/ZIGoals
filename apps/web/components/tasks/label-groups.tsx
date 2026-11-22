'use client';
import {useId, useState} from 'react';
import type {useTaskList} from './use-task-list';
import {groupLabels, removeLabelGroup, setLabelGroup, tasksWithSeveral} from '../../lib/tasks/label-groups';
import {MAX_LABEL_GROUPS, type Tasks} from '../../lib/tasks/schema';
import {formatNumber} from '../../lib/visual-format';
import './tasks-r6.css';

/**
 * Session AV lane 2 (r6-plan, LEDGER #397; OmniFocus 4.7's mutually exclusive tags), in Tasks → Areas and templates: label
 * groups across all projects ("Where: @home, @office, @errand"). Giving a task one label of a group — in its editor, in
 * quick add, from the Select bar or by a project's rule — takes the group's other label away. Making a group changes no task.
 */
type List = ReturnType<typeof useTaskList>;
export function LabelGroups({list, record}: {list: List; record: Tasks}) {
  const id = useId(), groups = record.labelGroups ?? [];
  const [editing, setEditing] = useState<string | null>(null), [name, setName] = useState(''), [labels, setLabels] = useState(''), [error, setError] = useState('');
  const start = (g?: {id: string; name: string; labels: string[]}) => { setEditing(g?.id ?? 'new'); setName(g?.name ?? ''); setLabels(g ? g.labels.map(l => `@${l}`).join(' ') : ''); setError(''); };
  const keep = () => {
    const gid = editing && editing !== 'new' ? editing : `lgroup_${crypto.randomUUID().slice(0, 12)}`, group = {id: gid, name, labels: groupLabels(labels)};
    try { setLabelGroup(record, group); } catch (e) { setError(e instanceof Error ? e.message : 'That group could not be kept.'); return; }
    if (list.change(r => setLabelGroup(r, group), `Label group “${name.trim()}”: a task carries one of ${group.labels.map(l => `@${l}`).join(', ')}.`, editing === 'new' ? 'The group is taken back.' : 'The group is as it was.')) { setEditing(null); setError(''); }
  };
  return <section className="tasks-r6-groups" aria-labelledby={`${id}-t`}>
    <h4 id={`${id}-t`}>Label groups</h4>
    {groups.length ? <ul className="tasks-r6-group-list" aria-label="Label groups">{groups.map(g => { const several = tasksWithSeveral(record, g); return <li key={g.id}>
      <span><strong dir="auto">{g.name}</strong>: {g.labels.map(l => `@${l}`).join(', ')}{several ? <small> · {several === 1 ? '1 open task carries' : `${formatNumber(several)} open tasks carry`} more than one; each keeps one at its next change</small> : null}</span>
      <button type="button" className="text-link" aria-label={`Change the label group “${g.name}”`} onClick={() => start(g)}>Change</button>
      <button type="button" className="text-link" aria-label={`Remove the label group “${g.name}”`} onClick={() => list.change(r => removeLabelGroup(r, g.id), `Removed the group “${g.name}”; its labels stay on the tasks.`, 'The group is back.')}>Remove</button>
    </li>; })}</ul> : <p className="fine">A group holds labels of which a task carries one, such as Where: @home, @office, @errand, or Energy: @low, @high. Giving a task @office then takes @home away, in the editor and in quick add.</p>}
    {editing ? <form className="tasks-r6-set" noValidate onSubmit={e => { e.preventDefault(); keep(); }}>
      <label className="field"><span>Group name</span><input dir="auto" value={name} maxLength={40} placeholder="Where" autoFocus onChange={e => { setName(e.target.value); setError(''); }} /></label>
      <label className="field"><span>Its labels</span><input value={labels} maxLength={600} placeholder="@home @office @errand" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined} onChange={e => { setLabels(e.target.value); setError(''); }} /></label>
      <p className="tasks-r6-actions"><button type="submit" className="secondary">{editing === 'new' ? 'Add the group' : 'Save the group'}</button><button type="button" className="quiet" onClick={() => { setEditing(null); setError(''); requestAnimationFrame(() => document.getElementById(`${id}-t`)?.parentElement?.querySelector<HTMLElement>('.tasks-r6-new')?.focus()); }}>Cancel</button></p>
      {error && <p id={`${id}-e`} className="tasks-field-error" role="alert">{error}</p>}
    </form> : groups.length < MAX_LABEL_GROUPS && <button type="button" className="secondary tasks-r6-new" onClick={() => start()}>New label group</button>}
  </section>;
}
