'use client';
import Link from 'next/link';
import {useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {SecretGuard} from '../secret-guard/secret-guard';
import {NOTES, MAX_BODY, type Note} from '../../lib/notes/schema';
import {capture} from '../../lib/notes/capture';
import {browserSpeechDisclosure, detectBrowser, MAX_RECORDING_MS, recognitionConstructor, recognitionErrorText, recognitionText, speechLanguage, type RecognitionConstructor, type RecognitionLike} from '../../lib/ai/voice';
import {readAiSettings} from '../../lib/ai/settings';
import {getAppStorage} from '../../lib/showcase-storage';
import './notes.css';

/**
 * Session AK (B1): "Capture a note" — a few words, typed or spoken, and/or a photo, straight into the notes inbox to be
 * filed later. Used on the Notes page, in Quick add, from the command palette (/app/notes?capture=1) and by NOVA's dock
 * and widgets (lane NA mounts `CaptureBox`). Speaking is OFF until the person turns it on here, after reading where the
 * audio goes (the browser's own speech recognition may send it to the browser maker; on-device where Chrome offers it).
 * A photo is shrunk on this device and kept in this browser only. The secret guard watches the words.
 */
export type CaptureBoxProps = {compact?: boolean; autoFocus?: boolean; onSaved?: (note: Note) => void; heading?: string; showInboxLink?: boolean};
export function CaptureBox({compact = false, autoFocus = false, onSaved, heading, showInboxLink = true}: CaptureBoxProps) {
  const record = useDeviceRecord(NOTES), id = useId(), file = useRef<HTMLInputElement>(null), field = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(''), [photo, setPhoto] = useState<File | null>(null);
  const [status, setStatus] = useState(''), [busy, setBusy] = useState(false), [spoken, setSpoken] = useState(false);
  const preview = useMemo(() => photo ? URL.createObjectURL(photo) : null, [photo]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => { if (autoFocus) field.current?.focus(); }, [autoFocus]);
  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    if (busy) return;
    if (!text.trim() && !photo) { setStatus('Write or say a few words, or add a photo, first.'); field.current?.focus(); return; }
    setBusy(true); setStatus(photo ? 'Preparing the photo on this device…' : '');
    const result = await capture({text, photo: photo ?? undefined, source: photo && !text.trim() ? 'photo' : spoken ? 'voice' : 'text'});
    setBusy(false);
    if (!result.ok) { setStatus(result.error); return; }
    setText(''); setPhoto(null); setSpoken(false);
    setStatus('Saved to your notes inbox, on this device.');
    onSaved?.(result.note);
  };
  // Named by its heading when it has one (Quick add). Without one (the Notes page, inside its "Capture" region) the form
  // carries no name of its own, so "Capture a note" names only the box you type in, not the form around it too (lane NV).
  return <form className={`note-capture${compact ? ' is-compact' : ''}`} onSubmit={e => void save(e)} aria-labelledby={heading ? `${id}-title` : undefined}>
    {heading && <h3 id={`${id}-title`} className="note-capture-title">{heading}</h3>}
    <label className="field"><span>{compact ? 'A note to file later' : 'Capture a note'}</span>
      <textarea ref={field} rows={compact ? 3 : 4} maxLength={MAX_BODY} value={text} onChange={e => setText(e.target.value)} placeholder="An idea, a task, something to remember…"
        onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); void save(); } }}/>
    </label>
    <SecretGuard text={text} onRemove={() => setText('')}/>
    {preview && <div className="note-capture-photo">
      {/* eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo, never uploaded */}
      <img src={preview} alt="The photo you chose" width={72} height={72}/>
      <button type="button" className="quiet" onClick={() => setPhoto(null)}>Remove photo</button>
    </div>}
    <div className="note-capture-actions">
      <button type="submit" className="primary" disabled={busy}>Save to inbox</button>
      <input ref={file} id={`${id}-photo`} type="file" accept="image/*" hidden tabIndex={-1} aria-hidden="true" onChange={e => { const f = e.target.files?.[0]; if (f) { setPhoto(f); setStatus('The photo stays on this device; it is shrunk before it is kept.'); } e.target.value = ''; }}/>
      <button type="button" className="secondary" onClick={() => file.current?.click()}>{photo ? 'Change photo' : 'Add a photo'}</button>
      {record.loaded && <SpeakButton on={record.data.voice} turnOn={on => { try { record.update(r => ({...r, voice: on})); } catch { setStatus('This choice could not be kept on this device.'); } }} onText={words => { setText(t => [t.trimEnd(), words].filter(Boolean).join(t.trim() ? ' ' : '').slice(0, MAX_BODY)); setSpoken(true); }}/>}
    </div>
    <p className="fine note-capture-status" role="status" aria-live="polite">{status}{status.startsWith('Saved') && showInboxLink ? <> <Link className="text-link" href="/app/notes?view=inbox">Open the inbox</Link></> : null}</p>
  </form>;
}
export default CaptureBox;

type SpeechEnv = {ctor: RecognitionConstructor | null; disclosure: string; lang: string};
const SERVER_ENV: SpeechEnv = {ctor: null, disclosure: '', lang: 'en-GB'};
let speechEnv: SpeechEnv | null = null;
const noSubscribe = () => () => {};
/** What this browser offers for speech, read once (the same object every time, as useSyncExternalStore needs). */
function readSpeechEnv(): SpeechEnv {
  if (speechEnv) return speechEnv;
  const ctor = recognitionConstructor(window as unknown as {SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown});
  let setting: string | null = null; try { setting = readAiSettings(getAppStorage()).data.voice.language ?? null; } catch { setting = null; }
  speechEnv = {ctor, disclosure: browserSpeechDisclosure(detectBrowser(navigator.userAgent), false), lang: speechLanguage(setting, navigator.language)};
  return speechEnv;
}
/** The microphone: off until turned on (with the browser's own words about where audio goes), then one tap to speak. */
function SpeakButton({on, turnOn, onText}: {on: boolean; turnOn: (on: boolean) => void; onText: (words: string) => void}) {
  const [asking, setAsking] = useState(false), [listening, setListening] = useState(false), [interim, setInterim] = useState(''), [error, setError] = useState('');
  const rec = useRef<RecognitionLike | null>(null), timer = useRef<number | null>(null);
  const env = useSyncExternalStore(noSubscribe, readSpeechEnv, () => SERVER_ENV);
  useEffect(() => () => { try { rec.current?.abort(); } catch { /* stopped */ } if (timer.current) window.clearTimeout(timer.current); }, []);
  if (!env.ctor) return on ? <p className="fine">This browser has no speech recognition. Type, or use your keyboard&rsquo;s dictation.</p> : null;
  const start = () => {
    setError(''); setInterim('');
    const r = new env.ctor!();
    r.lang = env.lang; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    let final = '';
    r.onresult = ev => { const t = recognitionText(ev.results); if (t.final) final = t.final; setInterim(t.interim); };
    r.onerror = ev => { const t = recognitionErrorText(ev.error); if (t) setError(t); };
    r.onend = () => { rec.current = null; setListening(false); setInterim(''); if (timer.current) window.clearTimeout(timer.current); if (final) onText(final); };
    rec.current = r;
    try { r.start(); setListening(true); timer.current = window.setTimeout(() => { try { r.stop(); } catch { /* stopped */ } }, MAX_RECORDING_MS); } catch { rec.current = null; setError('Speech recognition could not start.'); }
  };
  if (!on) return <>
    <button type="button" className="quiet" aria-expanded={asking} onClick={() => setAsking(a => !a)}>Speak a note…</button>
    {asking && <div className="note-voice-ask" role="group" aria-label="Speaking notes">
      <p className="fine">{env.disclosure} Off until you turn it on; your words land in the box for you to check before saving.</p>
      <div className="note-capture-actions"><button type="button" className="secondary" onClick={() => { turnOn(true); setAsking(false); }}>Turn on speaking notes</button><button type="button" className="quiet" onClick={() => setAsking(false)}>Not now</button></div>
    </div>}
  </>;
  return <>
    <button type="button" className={listening ? 'primary' : 'secondary'} aria-pressed={listening} onClick={() => { if (listening) { try { rec.current?.stop(); } catch { /* stopped */ } } else start(); }}>{listening ? 'Stop listening' : 'Speak'}</button>
    {(listening || interim || error) && <p className="fine note-voice-live" role="status">{error || (interim ? `Hearing: ${interim}` : 'Listening…')}</p>}
    <button type="button" className="text-link note-voice-off" onClick={() => turnOn(false)}>Turn speaking off</button>
  </>;
}
