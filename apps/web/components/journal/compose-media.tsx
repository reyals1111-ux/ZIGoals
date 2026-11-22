'use client';
import {useEffect, useMemo, useRef, useState} from 'react';
import {MAX_AUDIO_SECONDS, MAX_ENTRY_PHOTOS} from '../../lib/journal/schema';
import {clipLength} from '../../lib/journal/keep-media';

/**
 * Session AV lane 2 (journal; LEDGER #35 photos, #42 Day One's audio recorder): photos and one voice note for the entry
 * being written. A photo is chosen from the device and shrunk when the entry is saved; a voice note is recorded in this
 * browser (MediaRecorder, at most 5 minutes) and kept on this device only — never sent, never transcribed. The pending
 * files live in the Write form until Save (its state); this part only shows and changes them. Loaded when opened.
 */
export type PendingMedia = {photos: File[]; audio: {blob: Blob; seconds: number} | null};
const CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
function recorderType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const t of CANDIDATES) { try { if (MediaRecorder.isTypeSupported(t)) return t; } catch { /* keep looking */ } }
  return '';
}
export default function ComposeMedia({value, onChange}: {value: PendingMedia; onChange: (next: PendingMedia) => void}) {
  const file = useRef<HTMLInputElement>(null), recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), chunks = useRef<Blob[]>([]), started = useRef(0), timer = useRef<number | null>(null);
  const latest = useRef(value); latest.current = value;
  const [recording, setRecording] = useState(false), [elapsed, setElapsed] = useState(0), [said, setSaid] = useState(''), [problem, setProblem] = useState('');
  const canRecord = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && recorderType() !== null;
  const previews = useMemo(() => value.photos.map(f => URL.createObjectURL(f)), [value.photos]);
  useEffect(() => () => { for (const u of previews) URL.revokeObjectURL(u); }, [previews]);
  const audioUrl = useMemo(() => value.audio ? URL.createObjectURL(value.audio.blob) : null, [value.audio]);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  const release = () => { if (timer.current) window.clearInterval(timer.current); timer.current = null; stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; };
  useEffect(() => () => { const r = recorder.current; if (r && r.state !== 'inactive') r.stop(); release(); }, []);
  const stop = () => { const r = recorder.current; if (r && r.state !== 'inactive') r.stop(); };
  const start = async () => {
    setProblem(''); setSaid('');
    try {
      const media = await navigator.mediaDevices.getUserMedia({audio: true});
      stream.current = media; chunks.current = [];
      const type = recorderType(), rec = new MediaRecorder(media, {...(type ? {mimeType: type} : {}), audioBitsPerSecond: 32_000});
      recorder.current = rec;
      rec.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = () => {
        const seconds = Math.min(MAX_AUDIO_SECONDS, Math.round((Date.now() - started.current) / 1000));
        const blob = new Blob(chunks.current, {type: (rec.mimeType || type || 'audio/webm').split(';')[0]});
        release(); setRecording(false); recorder.current = null;
        if (!blob.size) { setProblem('Nothing was recorded. Try again.'); return; }
        onChange({...latest.current, audio: {blob, seconds}});
        setSaid(`Voice note recorded, ${clipLength(seconds)}. It is kept on this device when you save the entry.`);
      };
      started.current = Date.now(); setElapsed(0); setRecording(true); rec.start(1000);
      timer.current = window.setInterval(() => { const s = Math.round((Date.now() - started.current) / 1000); setElapsed(s); if (s >= MAX_AUDIO_SECONDS) stop(); }, 1000);
      setSaid('Recording. Press Stop when you are done (at most 5 minutes).');
    } catch (e) {
      release(); setRecording(false);
      setProblem(e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'The microphone is not allowed for ZIGoals in this browser. Allow it in the browser’s site settings to record.' : 'The microphone could not start in this browser.');
    }
  };
  const addPhotos = (files: FileList | null) => {
    const picked = [...(files ?? [])].filter(f => f.type.startsWith('image/') || !f.type);
    const room = MAX_ENTRY_PHOTOS - value.photos.length;
    if (!picked.length) return;
    if (room <= 0) { setProblem(`An entry holds up to ${MAX_ENTRY_PHOTOS} photos.`); return; }
    onChange({...value, photos: [...value.photos, ...picked.slice(0, room)]});
    setProblem(picked.length > room ? `An entry holds up to ${MAX_ENTRY_PHOTOS} photos; the first ${room} were added.` : '');
    setSaid(picked.length === 1 ? 'Photo added. It is shrunk and kept on this device when you save.' : 'Photos added. They are shrunk and kept on this device when you save.');
  };
  return <div className="journal-compose-media">
    <div className="journal-compose-media-actions">
      <input ref={file} type="file" accept="image/*" multiple hidden tabIndex={-1} aria-hidden="true" onChange={e => { addPhotos(e.target.files); e.target.value = ''; }}/>
      <button type="button" className="secondary" disabled={value.photos.length >= MAX_ENTRY_PHOTOS} onClick={() => file.current?.click()}>Add a photo</button>
      {canRecord ? (recording
        ? <button type="button" className="primary journal-record-stop" onClick={stop}>Stop recording · {clipLength(elapsed)}</button>
        : <button type="button" className="secondary" disabled={!!value.audio} onClick={() => void start()}>{value.audio ? 'One voice note per entry' : 'Record a voice note'}</button>)
        : <p className="fine">This browser cannot record audio here.</p>}
    </div>
    {value.photos.length > 0 && <ul className="journal-compose-photos" aria-label="Photos for this entry">{value.photos.map((f, i) => <li key={`${f.name}-${i}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo, never uploaded */}
      <img src={previews[i]} alt={`Photo ${i + 1} for this entry`} width={88} height={88}/>
      <button type="button" className="quiet" aria-label={`Remove photo ${i + 1}`} onClick={() => { onChange({...value, photos: value.photos.filter((_, k) => k !== i)}); setSaid('Photo removed.'); }}>Remove</button>
    </li>)}</ul>}
    {value.audio && audioUrl && <div className="journal-compose-audio">
      <audio controls preload="metadata" src={audioUrl} aria-label={`Your voice note, ${clipLength(value.audio.seconds)}`}/>
      <button type="button" className="quiet" onClick={() => { onChange({...value, audio: null}); setSaid('Voice note removed.'); }}>Remove the voice note</button>
    </div>}
    <p className="fine">Photos and voice notes stay on this device: never synced, never sent, never transcribed.</p>
    {problem && <p className="field-error" role="alert">{problem}</p>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </div>;
}
