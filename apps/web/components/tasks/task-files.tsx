'use client';
import {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';
import {showUndo} from '../ui/undo-toast';
import {SecretGuard} from '../secret-guard/secret-guard';
import {photoScope} from '../../lib/health-aa/photos';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {formatDate} from '../../lib/visual-format';
import {MAX_ATTACHMENTS_PER_TASK, TASK_ATTACHMENTS_CHANGE, TASK_FILE_MAX_BYTES, TASK_FILES_MAX_TOTAL, cleanFileName, deleteTaskAttachment, fileCounts, newAttachmentId, openWay, putTaskAttachment, sizeWords, taskAttachments, type KeptAttachment} from '../../lib/tasks/attachments';
import './task-attachments.css';

/**
 * Session AV lane 2 (r5-notes; LEDGER #355, Akiflow's files on a task). Two parts, each its own lazy chunk:
 * - `TaskFiles` (default), in a task's editor under its photos and voice notes: any file (a PDF, a document, a sheet) up
 *   to 10 MB, kept in this browser as soon as it is chosen, never uploaded or synced; each opens on a tap in the
 *   browser's own viewer when that is safe (PDF, pictures, plain text, sound, film), else it is saved as a download.
 * - `FilesView`, Tasks → Files: every task's files with a search by file or task name, the space they take, Open and
 *   Remove, with Undo in the message (the file is put back as it was).
 */
type FileAttachment = Extract<KeptAttachment, {kind: 'file'}>;
const isFile = (a: KeptAttachment): a is FileAttachment => a.kind === 'file';
/** Opens a kept file the safe way: in the browser's viewer (a new tab) or as a download, never as a page of this site. */
export function openTaskFile(a: Pick<FileAttachment, 'blob' | 'type' | 'name'>) {
  const how = openWay(a.type, a.name), blob = new Blob([a.blob], {type: how.way === 'view' ? how.type : 'application/octet-stream'});
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.rel = 'noopener';
  if (how.way === 'view') link.target = '_blank'; else link.download = a.name;
  document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return how.way;
}
export async function keepTaskFile(taskId: string, file: File): Promise<string> {
  if (!file.size) throw new Error('That file is empty.');
  if (file.size > TASK_FILE_MAX_BYTES) throw new Error(`“${cleanFileName(file.name)}” is ${sizeWords(file.size)}; a file on a task holds at most ${sizeWords(TASK_FILE_MAX_BYTES)}.`);
  const name = cleanFileName(file.name), type = (file.type || 'application/octet-stream').slice(0, 100);
  await putTaskAttachment(photoScope(), newAttachmentId('file'), {taskId, kind: 'file', blob: file.slice(0, file.size, type), type, name, bytes: file.size, at: new Date().toISOString()});
  return name;
}
/** Removes a file from this device; the message's Undo puts the same file back. */
async function removeWithUndo(a: FileAttachment): Promise<void> {
  const {id: fileId, ...value} = a;
  await deleteTaskAttachment(photoScope(), fileId);
  const {orphanSince: _o, ...kept} = value; void _o;
  showUndo({message: `“${a.name}” removed from this device.`, undone: `“${a.name}” is back.`, restore: () => { void putTaskAttachment(photoScope(), fileId, kept).catch(() => undefined); }});
}
function useFiles(taskId?: string) {
  const [kept, setKept] = useState<FileAttachment[] | null>(null), [failed, setFailed] = useState(false);
  const refresh = useCallback(() => { void taskAttachments(photoScope()).then(all => { setKept(all.filter(isFile).filter(a => !taskId || a.taskId === taskId)); setFailed(false); }, () => { setKept([]); setFailed(true); }); }, [taskId]);
  useEffect(() => {
    queueMicrotask(refresh);
    window.addEventListener(ACCOUNT_CHANGE, refresh); window.addEventListener(TASK_ATTACHMENTS_CHANGE, refresh);
    return () => { window.removeEventListener(ACCOUNT_CHANGE, refresh); window.removeEventListener(TASK_ATTACHMENTS_CHANGE, refresh); };
  }, [refresh]);
  return {kept, failed, refresh};
}

export default function TaskFiles({taskId, taskTitle}: {taskId: string; taskTitle: string}) {
  const id = useId(), {kept, failed} = useFiles(taskId), [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null), add = useRef<HTMLButtonElement>(null);
  const full = (kept?.length ?? 0) >= MAX_ATTACHMENTS_PER_TASK;
  const choose = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true); const done: string[] = [];
    try { for (const f of [...list].slice(0, MAX_ATTACHMENTS_PER_TASK)) done.push(await keepTaskFile(taskId, f)); setNote(done.length === 1 ? `“${done[0]}” kept on this device.` : `${done.length} files kept on this device.`); }
    catch (e) { setNote(`${done.length ? `${done.length} kept. ` : ''}${e instanceof Error ? e.message : 'The file was not kept.'}`); }
    finally { setBusy(false); }
  };
  const remove = async (a: FileAttachment) => {
    try { await removeWithUndo(a); setNote(''); requestAnimationFrame(() => add.current?.focus()); } catch { setNote('It could not be removed. Try again.'); }
  };
  return <div className="task-attachments task-files" role="group" aria-labelledby={`${id}-title`}>
    <span id={`${id}-title`} className="task-editor-pause-title">Files{kept?.length ? ` (${kept.length})` : ''}</span>
    {kept === null ? <p className="fine" aria-busy="true">Reading this device’s files…</p>
      : kept.length ? <ul className="task-attachment-list" aria-label={`Files on “${taskTitle}”`}>{kept.map(a => <li key={a.id}>
        <FileLine file={a}/>
        <button type="button" className="quiet" aria-label={`Remove “${a.name}” from “${taskTitle}”`} onClick={() => void remove(a)}>Remove</button>
      </li>)}</ul>
      : <p className="fine">{failed ? 'This browser cannot keep files here.' : 'No files yet. Add a ticket, a PDF or a document (up to 10 MB each). They stay in this browser only.'}</p>}
    <input ref={input} type="file" multiple hidden tabIndex={-1} aria-hidden="true" onChange={e => { void choose(e.target.files); e.target.value = ''; }}/>
    <span className="task-attachment-actions"><button ref={add} type="button" className="secondary" disabled={busy || full || failed} onClick={() => input.current?.click()}>Add a file</button></span>
    <small className="tasks-field-note">{full ? `This task has ${MAX_ATTACHMENTS_PER_TASK} files, the most it keeps.` : 'Kept on this device as soon as you choose them (not with Save). A PDF, a picture or a text file opens in the browser; any other file is saved to open with its own app. Tasks → Files lists them all.'}</small>
    {note && <p className="fine task-attachment-status" aria-live="polite">{note}</p>}
  </div>;
}
function FileLine({file: a, task}: {file: FileAttachment; task?: string}) {
  const way = openWay(a.type, a.name).way, when = formatDate(a.at.slice(0, 10), {year: false});
  return <span className="task-attachment-item task-file-item">
    <button type="button" className="text-link task-file-open" aria-label={`${way === 'view' ? 'Open' : 'Save'} “${a.name}”${task ? ` from “${task}”` : ''}, ${sizeWords(a.bytes)}`} onClick={() => openTaskFile(a)}>{a.name}</button>
    <small>{sizeWords(a.bytes)} · {when}{task ? ` · ${task}` : ''} · {way === 'view' ? 'opens in the browser' : 'saved to open'}</small>
  </span>;
}

/** Tasks → Files: every task's files, a search, the space they take. */
export function FilesView({titles, onOpenTask}: {titles: ReadonlyMap<string, string>; onOpenTask?: (taskId: string) => void}) {
  const {kept} = useFiles(), [q, setQ] = useState(''), [note, setNote] = useState('');
  const shown = useMemo(() => { const k = q.trim().toLowerCase(); return (kept ?? []).filter(a => !a.orphanSince && (!k || a.name.toLowerCase().includes(k) || (titles.get(a.taskId) ?? '').toLowerCase().includes(k))).sort((x, y) => y.at.localeCompare(x.at)); }, [kept, q, titles]);
  // Review b5i B5I-12: the line counts what the list shows (a file of a removed task waits unseen for its 30 days).
  const live = fileCounts(kept ?? []), used = live.bytes;
  const remove = async (a: FileAttachment) => { try { await removeWithUndo(a); setNote(''); } catch { setNote('It could not be removed. Try again.'); } };
  if (kept === null) return <p className="fine" aria-busy="true">Reading this device’s files…</p>;
  return <div className="task-files-view">
    <p className="fine">{live.files ? `${live.files} ${live.files === 1 ? 'file' : 'files'} on your tasks, ${sizeWords(used)} of ${sizeWords(TASK_FILES_MAX_TOTAL)} on this device.` : 'No files on tasks yet. Open a task and use Add a file, or drop a file on Tasks to make an Inbox task holding it.'}</p>
    {live.files > 0 && <>
      <label className="field"><span>Search files</span><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="A file or task name"/></label>
      <SecretGuard text={q} onRemove={() => setQ('')}/>
      {shown.length ? <ul className="task-attachment-list" aria-label="Files on your tasks">{shown.map(a => <li key={a.id}>
        <FileLine file={a} task={titles.get(a.taskId)}/>
        {onOpenTask && titles.has(a.taskId) && <button type="button" className="quiet" aria-label={`Open the task “${titles.get(a.taskId)}”`} onClick={() => onOpenTask(a.taskId)}>Open task</button>}
        <button type="button" className="quiet" aria-label={`Remove “${a.name}”`} onClick={() => void remove(a)}>Remove</button>
      </li>)}</ul> : <p className="fine">No file or task has those words.</p>}
    </>}
    {note && <p className="fine" role="status">{note}</p>}
  </div>;
}
