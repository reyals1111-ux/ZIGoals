'use client';
import {useEffect, useId, useRef, useState, type ChangeEvent} from 'react';
import {MAX_IMPORT_BYTES, applyImport, readTaskFile, tasksCsv, type ImportPlan} from '../../lib/tasks/import';
import {MAX_TASKS, type Tasks} from '../../lib/tasks/schema';
import {exportFileName} from '../../lib/showcase-detect';
import {formatNumber} from '../../lib/visual-format';

/**
 * Session AL (Part 8, P-LS-37, C-LS-23/24): import from Todoist (CSV), TickTick (CSV backup) or a calendar's to-dos
 * (.ics), and export every task as CSV. The file is read on this device, never sent; a preview says what will be added
 * and what is left out; Add is one change with one Undo (the page's `apply`). Loaded the first time the panel opens.
 */
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
export default function TasksIo({record, today, showcase, onClose, apply}: {record: Tasks; today: string; showcase: boolean; onClose: () => void; apply: (fn: (r: Tasks) => Tasks, message: string) => boolean}) {
  const id = useId(), input = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null), [error, setError] = useState(''), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { input.current?.focus(); }, []);
  const choose = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; setPlan(null); setError(''); setStatus('');
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) { setError('This file is over 2 MB, more than ZIGoals reads. Export a smaller list.'); return; }
    setBusy(true);
    try { setPlan(readTaskFile(await file.text(), {fileName: file.name, today})); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'This file could not be read.'); }
    finally { setBusy(false); }
  };
  const room = MAX_TASKS - record.tasks.length;
  const add = () => {
    if (!plan) return;
    let overCap = 0, added = 0;
    const ok = apply(r => { const out = applyImport(r, plan, {at: new Date(), newId: kind => `${kind}_${crypto.randomUUID()}`}); overCap = out.overCap; added = out.added.length; return out.record; }, `Imported ${plural(plan.tasks.length - Math.max(0, plan.tasks.length - room), 'task')}.`);
    if (ok) { setStatus(`Added ${plural(added, 'task')}${overCap ? `; ${plural(overCap, 'task')} left out: the list keeps ${MAX_TASKS}` : ''}.`); setPlan(null); }
  };
  const download = () => {
    try {
      const name = exportFileName(`zigoals-tasks-${today}.csv`, showcase);
      const url = URL.createObjectURL(new Blob([tasksCsv(record)], {type: 'text/csv;charset=utf-8'})), link = document.createElement('a');
      link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setStatus(`Saved ${name} with ${plural(record.tasks.length, 'task')}.`);
    } catch { setError('The file could not be made on this device.'); }
  };
  const left = plan ? [plan.skipped.done && `${plural(plan.skipped.done, 'finished task')}`, plan.skipped.unreadable && `${plural(plan.skipped.unreadable, 'row')} with no title`, plan.skipped.notes && `${plural(plan.skipped.notes, 'comment')} with no task`, plan.tasks.length > room && `${plural(plan.tasks.length - room, 'task')} over the ${MAX_TASKS} kept`].filter(Boolean) as string[] : [];
  return <div className="panel tasks-io" role="group" aria-labelledby={`${id}-t`}>
    <h2 id={`${id}-t`}>Import and export</h2>
    <label className="field"><span>Import a Todoist CSV, a TickTick CSV backup or a calendar (.ics) file</span><input ref={input} type="file" accept=".csv,.ics,.ical,text/csv,text/calendar" disabled={busy} onChange={e => void choose(e)} /></label>
    {busy && <p className="fine" role="status">Reading the file on this device…</p>}
    {plan && <div className="tasks-io-preview">
      <p>{plan.tasks.length ? `${plural(Math.min(plan.tasks.length, room), 'task')} to add from ${plan.source === 'todoist' ? 'Todoist' : plan.source === 'ticktick' ? 'TickTick' : 'the calendar file’s to-dos'}${plan.projects.length ? `, into ${plan.projects.map(p => `“${p}”`).join(', ')}` : ', into the Inbox'}: titles, days, times, repeats, priorities, labels, notes and subtasks.` : 'No task in this file can be added.'}</p>
      {left.length > 0 && <p className="fine">Left out: {left.join('; ')}.</p>}
      <div className="tasks-io-actions"><button type="button" className="primary" disabled={!plan.tasks.length || room <= 0} onClick={add}>Add to Tasks</button><button type="button" className="quiet" onClick={() => setPlan(null)}>Cancel</button></div>
    </div>}
    <div className="tasks-io-actions"><button type="button" className="secondary" disabled={!record.tasks.length} onClick={download}>Export as CSV</button><button type="button" className="quiet" onClick={onClose}>Close</button></div>
    {error && <p role="alert" className="tasks-error">{error}</p>}
    <p className="fine" role="status">{status}</p>
    <p className="fine">Files are read on this device and never sent anywhere; nothing in them is opened or run. The CSV opens in any spreadsheet (a cell that starts like a formula is kept as text). Your tasks are also in Settings › Export everything.</p>
  </div>;
}
