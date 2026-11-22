'use client';
import {useRef} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus, showUndo} from '../ui/undo-toast';
import {TASK_PLAN, type TaskVersion} from '../../lib/tasks/plan-record';
import {deleteTaskVersion, deleteTaskVersions, putBackTaskVersions, taskVersionsOf} from '../../lib/tasks/versions';
import type {Task} from '../../lib/tasks/schema';
import {formatClock, formatDate} from '../../lib/visual-format';

/**
 * Session AV lane 2 (rest, LEDGER #33; Notion's version history, as Notes has it): a task's earlier titles and notes —
 * when each was saved, its words to read, "Restore this version" (through the task's Save, so the words it replaces are
 * kept too, with Undo), "Delete this version" and "Delete all earlier versions" (each with Undo). On this device only.
 * Loaded when its fold in the task editor opens.
 */
const two = (n: number) => String(n).padStart(2, '0');
export const versionWhen = (iso: string) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? `${formatDate(`${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`)}, ${formatClock(`${two(d.getHours())}:${two(d.getMinutes())}`)}` : iso; };
export default function TaskVersions({task, onRestore}: {task: Task; onRestore: (v: TaskVersion) => void}) {
  const plan = useDeviceRecord(TASK_PLAN), list = useRef<HTMLOListElement>(null), versions = taskVersionsOf(plan.data, task.id);
  if (!plan.loaded) return <p className="fine">Opening…</p>;
  if (!versions.length) return <p className="fine">When you save a change to this task’s title or notes, what it said before is kept here, up to ten versions, so you can read or restore them. They stay on this device.</p>;
  const guard = () => { if (plan.unreadable) { showStatus('The earlier versions could not be read on this device, so nothing was changed.', {tone: 'error'}); return false; } return true; };
  const removeOne = (v: TaskVersion) => {
    if (!guard()) return;
    const out = deleteTaskVersion(plan.data, v.id); if (!out.removed) return;
    const gone = out.removed;
    plan.update(p => deleteTaskVersion(p, v.id).plan);
    // Focus stays in the list (the next version, or the fold's summary when none is left).
    requestAnimationFrame(() => { const next = list.current?.querySelector<HTMLElement>('summary'); (next ?? list.current?.closest('details')?.querySelector<HTMLElement>('summary'))?.focus(); });
    showUndo({message: `Deleted the version of ${versionWhen(gone.savedAt)}.`, undone: 'The version is back.', restore: () => plan.update(p => putBackTaskVersions(p, [gone]))});
  };
  const removeAll = () => {
    if (!guard()) return;
    const out = deleteTaskVersions(plan.data, task.id); if (!out.removed.length) return;
    const gone = out.removed;
    plan.update(p => deleteTaskVersions(p, task.id).plan);
    showUndo({message: `Deleted ${gone.length === 1 ? 'the earlier version' : `all ${gone.length} earlier versions`} of “${task.title}”.`, undone: gone.length === 1 ? 'The version is back.' : 'The versions are back.', restore: () => plan.update(p => putBackTaskVersions(p, gone))});
  };
  return <>
    <ol ref={list} className="task-versions-list">{versions.map(v => <li key={v.id}>
      <details><summary>Saved {versionWhen(v.savedAt)} <span className="fine">· {v.title.slice(0, 60)}{v.title.length > 60 ? '…' : ''}</span></summary>
        <p className="task-version-words"><span className="fine">Title:</span> <span dir="auto">{v.title}</span></p>
        {v.notes ? <p className="task-version-words"><span className="fine">Notes:</span> <span dir="auto">{v.notes}</span></p> : <p className="fine">No notes then.</p>}
        <p className="task-versions-actions">
          <button type="button" className="secondary" aria-label={`Restore the version of ${versionWhen(v.savedAt)}`} onClick={() => onRestore(v)}>Restore this version</button>
          <button type="button" className="quiet" aria-label={`Delete the version of ${versionWhen(v.savedAt)}`} onClick={() => removeOne(v)}>Delete this version</button>
        </p>
      </details>
    </li>)}</ol>
    <p className="task-versions-actions"><button type="button" className="quiet" onClick={removeAll}>Delete all earlier versions</button></p>
  </>;
}
