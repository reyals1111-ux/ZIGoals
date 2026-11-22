'use client';
import {useCallback, useEffect, useId, useRef, useState} from 'react';
import {ConfirmInline} from '../ui/confirm-inline';
import {compressImage, photoScope} from '../../lib/health-aa/photos';
import {shrinkToLimit} from '../../lib/meal-estimates/photos';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {formatDate} from '../../lib/visual-format';
import {MAX_ATTACHMENTS_PER_TASK, TASK_VOICE_MAX_BYTES, TASK_VOICE_MAX_SECONDS, clockSeconds, deleteTaskAttachment, newAttachmentId, putTaskAttachment, sweepTaskAttachments, taskAttachmentsFor, voiceBaseType, voiceRecorderType, type KeptAttachment} from '../../lib/tasks/attachments';
import './task-attachments.css';

/**
 * Session AV lane 2 (roadmap, LEDGER #8; Todoist's attachments): photos and short voice notes on a task, in the task
 * editor beside its comments. Kept in this browser only (IndexedDB `zigoals-task-attachments-v1`) as soon as they are
 * added, never uploaded, synced or sent; in Export everything as files; gone with Erase everything. Its own chunk, loaded
 * when an editor opens. No motion: the recording says its seconds in words, nothing pulses.
 */
export default function TaskAttachments({taskId, taskTitle, liveTaskIds}: {taskId: string; taskTitle: string; /** Every task id in the list, for the orphan sweep (an attachment whose task is gone is deleted 30 days later). */ liveTaskIds?: readonly string[]}) {
  const id = useId(), [kept, setKept] = useState<KeptAttachment[] | null>(null), [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null), [recording, setRecording] = useState(false), [seconds, setSeconds] = useState(0);
  const photoInput = useRef<HTMLInputElement>(null), photoButton = useRef<HTMLButtonElement>(null), recordButton = useRef<HTMLButtonElement>(null), stopButton = useRef<HTMLButtonElement>(null);
  const recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), chunks = useRef<Blob[]>([]), started = useRef(0), timers = useRef<number[]>([]), keepIt = useRef(true);
  // Read after mount, so a server render and the first client render agree.
  const [canRecord, setCanRecord] = useState(false);
  useEffect(() => { const can = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && !!voiceRecorderType(t => MediaRecorder.isTypeSupported(t)); queueMicrotask(() => setCanRecord(can)); }, []);
  const refresh = useCallback(() => { void taskAttachmentsFor(photoScope(), taskId).then(setKept, () => { setKept([]); setNote('This browser cannot keep photos or voice notes here.'); }); }, [taskId]);
  const liveKey = liveTaskIds?.join(',');
  useEffect(() => {
    queueMicrotask(refresh);
    window.addEventListener(ACCOUNT_CHANGE, refresh);
    return () => window.removeEventListener(ACCOUNT_CHANGE, refresh);
  }, [refresh]);
  useEffect(() => { if (liveKey !== undefined) void sweepTaskAttachments(photoScope(), liveKey ? liveKey.split(',') : []).catch(() => undefined); }, [liveKey]);
  const clearTimers = () => { for (const t of timers.current) { window.clearTimeout(t); window.clearInterval(t); } timers.current = []; };
  const release = () => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; };
  useEffect(() => () => { keepIt.current = false; clearTimers(); const r = recorder.current; if (r && r.state !== 'inactive') { r.onstop = null; r.stop(); } release(); }, []);
  const full = (kept?.length ?? 0) >= MAX_ATTACHMENTS_PER_TASK;

  async function addPhoto(file: File) {
    setBusy(true); setNote('Preparing the photo on this device…');
    try {
      const out = await shrinkToLimit(step => compressImage(file, step.edge, step.quality));
      await putTaskAttachment(photoScope(), newAttachmentId('photo'), {taskId, kind: 'photo', blob: out.blob, type: out.type, bytes: out.blob.size, at: new Date().toISOString()});
      setNote(`Photo kept on this device (${Math.max(1, Math.round(out.blob.size / 1000))} kB).`); refresh();
    } catch (e) { setNote(e instanceof Error ? e.message : 'The photo was not kept.'); } finally { setBusy(false); }
  }
  async function keepVoice(blob: Blob, secs: number) {
    const type = voiceBaseType(blob.type);
    if (!blob.size || !type) { setNote('Nothing was recorded.'); return; }
    if (blob.size > TASK_VOICE_MAX_BYTES) { setNote('That recording is too large to keep. Try a shorter one.'); return; }
    try {
      await putTaskAttachment(photoScope(), newAttachmentId('voice'), {taskId, kind: 'voice', blob: new Blob([blob], {type}), type, bytes: blob.size, seconds: Math.min(TASK_VOICE_MAX_SECONDS, Math.round(secs * 10) / 10), at: new Date().toISOString()});
      setNote(`Voice note kept on this device (${clockSeconds(secs)}).`); refresh();
    } catch (e) { setNote(e instanceof Error ? e.message : 'The voice note was not kept.'); }
  }
  async function startRecording() {
    const mime = voiceRecorderType(t => MediaRecorder.isTypeSupported(t));
    let media: MediaStream;
    try { media = await navigator.mediaDevices.getUserMedia({audio: true}); }
    catch { setNote('The microphone was not allowed. Allow it for this site in the browser’s settings to record a voice note.'); return; }
    stream.current = media; chunks.current = []; keepIt.current = true;
    let rec: MediaRecorder;
    try { rec = new MediaRecorder(media, mime ? {mimeType: mime} : undefined); } catch { release(); setNote('This browser cannot record here.'); return; }
    recorder.current = rec;
    rec.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
    rec.onstop = () => {
      const secs = (Date.now() - started.current) / 1000, blob = new Blob(chunks.current, {type: rec.mimeType || mime || 'audio/webm'});
      chunks.current = []; recorder.current = null; clearTimers(); release(); setRecording(false);
      requestAnimationFrame(() => recordButton.current?.focus());
      if (keepIt.current) void keepVoice(blob, secs); else setNote('Recording cancelled; nothing was kept.');
    };
    rec.start(250); started.current = Date.now(); setSeconds(0); setRecording(true); setNote('');
    requestAnimationFrame(() => stopButton.current?.focus());
    timers.current.push(window.setInterval(() => setSeconds(Math.min(TASK_VOICE_MAX_SECONDS, Math.floor((Date.now() - started.current) / 1000))), 500));
    timers.current.push(window.setTimeout(() => { if (rec.state !== 'inactive') rec.stop(); }, TASK_VOICE_MAX_SECONDS * 1000));
  }
  const stop = (keep: boolean) => { keepIt.current = keep; const r = recorder.current; if (r && r.state !== 'inactive') r.stop(); };
  async function remove(a: KeptAttachment) {
    setConfirming(null);
    try { await deleteTaskAttachment(photoScope(), a.id); setNote(a.kind === 'photo' ? 'Photo removed from this device.' : 'Voice note removed from this device.'); refresh(); requestAnimationFrame(() => photoButton.current?.focus()); }
    catch { setNote('It could not be removed. Try again.'); }
  }

  return <div className="task-attachments" role="group" aria-labelledby={`${id}-title`}>
    <span id={`${id}-title`} className="task-editor-pause-title">Photos and voice notes{kept?.length ? ` (${kept.length})` : ''}</span>
    {kept === null ? <p className="fine" aria-busy="true">Reading this device’s attachments…</p>
      : kept.length ? <ul className="task-attachment-list" aria-label={`Photos and voice notes on “${taskTitle}”`}>{kept.map((a, i) => <li key={a.id}>
        <AttachmentView attachment={a} n={i + 1} taskTitle={taskTitle}/>
        <button type="button" className="quiet" aria-expanded={confirming === a.id} aria-label={`Remove ${a.kind === 'photo' ? 'photo' : 'voice note'} ${i + 1} from “${taskTitle}”`} onClick={() => setConfirming(a.id)}>Remove</button>
        {confirming === a.id && <ConfirmInline title={a.kind === 'photo' ? 'Remove this photo?' : 'Remove this voice note?'} confirmLabel="Remove" onConfirm={() => void remove(a)} onCancel={() => setConfirming(null)}><p>It is deleted from this device. This cannot be undone.</p></ConfirmInline>}
      </li>)}</ul>
      : <p className="fine">No photos or voice notes yet. Add a photo of a receipt, a part or a whiteboard, or record a short voice note (up to a minute). They stay in this browser only.</p>}
    <input ref={photoInput} type="file" accept="image/*" hidden tabIndex={-1} aria-hidden="true" onChange={e => { const f = e.target.files?.[0]; if (f) void addPhoto(f); e.target.value = ''; }}/>
    <span className="task-attachment-actions">
      <button ref={photoButton} type="button" className="secondary" disabled={busy || full || recording} onClick={() => photoInput.current?.click()}>Add a photo</button>
      {canRecord && (recording
        ? <><button ref={stopButton} type="button" className="secondary" onClick={() => stop(true)}>Stop and keep ({clockSeconds(seconds)} of {clockSeconds(TASK_VOICE_MAX_SECONDS)})</button>
          <button type="button" className="quiet" onClick={() => stop(false)}>Cancel recording</button></>
        : <button ref={recordButton} type="button" className="secondary" disabled={busy || full} onClick={() => void startRecording()}>Record a voice note</button>)}
    </span>
    {recording && <p className="fine task-attachment-recording" role="status"><span aria-hidden="true">● </span>Recording… it stops by itself at one minute.</p>}
    <small className="tasks-field-note">{full ? `This task has ${MAX_ATTACHMENTS_PER_TASK}, the most it keeps. Remove one to add another.` : `Kept on this device as soon as you add them (not with Save). Never uploaded or synced; in Export everything as files.${canRecord ? '' : ' This browser cannot record voice notes.'}`}</small>
    {note && <p className="fine task-attachment-status" aria-live="polite">{note}</p>}
  </div>;
}

function AttachmentView({attachment: a, n, taskTitle}: {attachment: KeptAttachment; n: number; taskTitle: string}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { const made = URL.createObjectURL(a.blob); queueMicrotask(() => setUrl(made)); return () => URL.revokeObjectURL(made); }, [a.blob]);
  const when = formatDate(a.at.slice(0, 10), {year: false});
  if (a.kind === 'photo') return <span className="task-attachment-item">
    {url && <a className="task-attachment-thumb" href={url} target="_blank" rel="noreferrer" aria-label={`Open photo ${n} of “${taskTitle}”, added ${when}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo: next/image has nothing to optimise */}
      <img src={url} alt="" width={64} height={64}/>
    </a>}
    <small>Photo · {when}</small>
  </span>;
  return <span className="task-attachment-item task-attachment-voice">
    {url && <audio controls preload="metadata" src={url} aria-label={`Voice note ${n} of “${taskTitle}”, ${clockSeconds(a.seconds)}, added ${when}`}/>}
    <small>Voice note · {clockSeconds(a.seconds)} · {when}</small>
  </span>;
}
