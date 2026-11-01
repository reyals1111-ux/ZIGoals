'use client';
import {Suspense, forwardRef, lazy, useCallback, useEffect, useId, useRef, useState} from 'react';
import {readPrivacyMode} from '../../../lib/nova/setup';
import {getAppStorage} from '../../../lib/showcase-storage';
// Owner follow-up 2 (N9): in Guarded mode, exactly what will be sent shows before it is sent (lane NC's preview, loaded on use).
const AboutToSend = lazy(() => import('../setup/about-to-send').then(m => ({default: m.AboutToSend})));
import {INPUT_COUNTER_FROM, MAX_INPUT_CHARS} from '../../../lib/ai/chats';
import {AREA_LABELS} from '../../../lib/ai/context/pages';
import {lastQuestion} from '../../../lib/ai/session';
import type {AiSettings} from '../../../lib/ai/settings';
import {browserSpeechDisclosure, detectBrowser} from '../../../lib/ai/voice';
import {ZIGI_PAGES, type ZigiPage} from '../../../lib/nova/bridge';
import type {ChatSession} from '../../ai/use-chat-session';
import {useTalk} from '../../ai/use-talk';
import {VoiceWaves} from '../../ai/voice-waves';
import {SecretGuard} from '../../secret-guard/secret-guard';

/**
 * NOVA's message box (Session AK, owner follow-up 2 N2): Enter sends, Shift+Enter keeps a new line, ↑ in an empty box
 * puts the last message back to edit (sending it replaces that message and its answer), Stop ends a reply. Under it, ZIGi:
 * "Let ZIGi answer" hands the words to ZIGi as a task on the chosen page (answered here, in two voices), "Open ZIGi there"
 * takes them to ZIGi on that page (nothing is sent before Send there). Speech input is off until the person turns it on,
 * after an honest note on where this browser sends the audio; ZIGoals never keeps the audio.
 */
export type Editing = {id: string; text: string; seq: number};
type Props = {session: ChatSession; persona: string; settings: AiSettings; sensitive: boolean; editing: Editing | null; onEditing: (editing: Editing | null) => void;
  /** `pasted`: the words came (at least partly) from a paste; a card from the reply is then never auto-accepted (N9). */
  onSend: (text: string, replace?: string, pasted?: boolean) => void; onDelegate: (text: string, area: ZigiPage, replace?: string) => void; onOpenZigi: (text: string, area: ZigiPage) => void;
  /** Session AK (owner follow-up 3 N11): "Ask my Hermes", shown only once the person's Hermes Agent is connected. */
  onHermes?: (text: string, area: ZigiPage) => void;
  speechOn: boolean; onSpeech: (on: boolean) => void; onListening: (listening: boolean) => void; onSpoken: () => void};
export const NovaComposer = forwardRef<HTMLTextAreaElement, Props>(function NovaComposer({session, persona, settings, sensitive, editing, onEditing, onSend, onDelegate, onOpenZigi, onHermes, speechOn, onSpeech, onListening, onSpoken}, ref) {
  const [text, setText] = useState(''), [page, setPage] = useState<ZigiPage>('today'), [zigiOpen, setZigiOpen] = useState(false), [speechNote, setSpeechNote] = useState(false);
  const hintId = useId(), zigiId = useId(), pasted = useRef(false);
  const busy = session.status !== 'idle';
  const box = useCallback(() => (ref as {current: HTMLTextAreaElement | null} | null)?.current ?? null, [ref]);
  const editSeq = editing?.seq;
  useEffect(() => { if (editing) setText(editing.text); }, [editSeq]); // eslint-disable-line react-hooks/exhaustive-deps -- a new edit, not every render
  // The box grows with the words up to six lines, then scrolls.
  useEffect(() => {
    const el = box(); if (!el) return;
    el.style.height = 'auto';
    const line = parseFloat(getComputedStyle(el).lineHeight) || 24, max = Math.ceil(line * 6 + 24);
    el.style.height = `${Math.min(Math.max(el.scrollHeight + 2, 52), max)}px`;
    el.style.overflowY = el.scrollHeight + 2 > max ? 'auto' : 'hidden';
  }, [text, box]);
  const clear = () => { setText(''); onEditing(null); pasted.current = false; };
  const submit = (spoken?: string) => {
    if (busy) return;
    const value = (spoken ?? text).trim(); if (!value) return;
    const fromPaste = spoken === undefined && pasted.current;
    if (spoken === undefined) clear(); else onSpoken();
    onSend(value, editing?.id, fromPaste);
  };
  const handTo = (open: boolean) => {
    const value = text.trim(); if (!value || (busy && !open)) return;
    if (open) { onOpenZigi(value, page); clear(); return; }
    onDelegate(value, page, editing?.id); clear();
  };
  const browser = typeof navigator === 'undefined' ? 'other' : detectBrowser(navigator.userAgent);
  return <form className="nova-composer-wrap" onSubmit={event => { event.preventDefault(); submit(); }}>
    {editing && <p className="ai-editing">Editing your last message: sending it replaces the message and its answer. <button type="button" className="text-link" onClick={clear}>Cancel editing</button></p>}
    {text.length >= INPUT_COUNTER_FROM && <p className="ai-note" role="status" aria-live="polite">{text.length >= MAX_INPUT_CHARS ? `That is the limit: ${MAX_INPUT_CHARS.toLocaleString('en-US')} characters.` : `${text.length.toLocaleString('en-US')} of ${MAX_INPUT_CHARS.toLocaleString('en-US')} characters`}</p>}
    <SecretGuard text={text} onRemove={() => setText('')} chat/>
    {speechNote && !speechOn && <div className="nova-speech-note" role="group" aria-label="Speech input">
      <p>Speech input is off. {browserSpeechDisclosure(browser, false)} ZIGoals never stores the audio, and the microphone is released the moment you stop.</p>
      <div className="ai-card-actions">{browser !== 'firefox' && <button type="button" className="primary" onClick={() => { onSpeech(true); setSpeechNote(false); }}>Turn on speech input</button>}<button type="button" className="text-link" onClick={() => setSpeechNote(false)}>Not now</button></div>
    </div>}
    {/* Lane NC: shown whenever the send path changes the message (redacted: a cloud in Guarded, an unconfirmed Hermes in
        Strict or Guarded; refused: a cloud in Strict), with the same names and Hermes rule as the engine's hook. */}
    {(() => { let mode = null as ReturnType<typeof readPrivacyMode>; try { mode = readPrivacyMode(getAppStorage()); } catch { mode = 'strict'; } return mode && mode !== 'relaxed' && text.trim() && settings.enabled && settings.mode !== 'subscription' && settings.provider ? <Suspense fallback={null}><AboutToSend message={text} mode={mode} provider={settings.provider} model={settings.model} baseUrl={settings.baseUrl} assistant={persona} hideWhenSent/></Suspense> : null; })()}
    <div className="nova-composer">
      <textarea ref={ref} value={text} rows={1} maxLength={MAX_INPUT_CHARS} enterKeyHint="send" autoComplete="off" aria-label={`Message ${persona}`} aria-describedby={hintId} placeholder={`Message ${persona}…`}
        onChange={e => { setText(e.target.value.slice(0, MAX_INPUT_CHARS)); if (!e.target.value) pasted.current = false; }} onPaste={() => { pasted.current = true; }}
        onKeyDown={e => {
          if (e.key === 'ArrowUp' && !text && !busy) { const last = lastQuestion(session.chat); if (last) { e.preventDefault(); onEditing({id: last.id, text: last.text, seq: Date.now()}); } return; }
          if (e.key === 'Escape' && editing) { e.preventDefault(); e.stopPropagation(); clear(); return; }
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
        }}/>
      <div className="nova-composer-actions">
        {speechOn && !sensitive ? <NovaMic settings={settings} onListening={onListening} onWords={words => { if (!text.trim() && !editing && !busy) submit(words); else setText(current => `${current.trim()}${current.trim() ? ' ' : ''}${words}`); }}/>
          : <button type="button" className="secondary nova-mic nova-mic-off" aria-label="Speech input is off" title="Speech input is off: see where the audio would go" aria-expanded={speechNote} onClick={() => setSpeechNote(v => !v)}><MicGlyph off/></button>}
        {busy ? <button type="button" className="secondary nova-stop" onClick={session.stop}>Stop</button>
          : <button type="submit" className="primary nova-send" disabled={!text.trim()} aria-label="Send">Send</button>}
      </div>
    </div>
    <p className="nova-composer-hint" id={hintId}><span>Enter to send</span><span>Shift + Enter for a new line</span><span>↑ edits your last message</span></p>
    <div className="nova-zigi-row">
      <button type="button" className="text-link nova-zigi-toggle" aria-expanded={zigiOpen} aria-controls={zigiId} onClick={() => setZigiOpen(o => !o)}>{onHermes ? 'Ask ZIGi or your Hermes' : 'Ask ZIGi about a page'}</button>
      <div id={zigiId} className="nova-zigi-tools" hidden={!zigiOpen} role="group" aria-label={onHermes ? 'Ask ZIGi or your Hermes' : 'Ask ZIGi about a page'}>
        {/* Named "Page" by its own word (aria-labelledby): wrapped bare, the label's name also took every option's text (lane NV). */}
        <label className="nova-zigi-page"><span id={`${zigiId}-page`}>Page</span><select aria-labelledby={`${zigiId}-page`} value={page} onChange={e => setPage(e.target.value as ZigiPage)}>{ZIGI_PAGES.map(p => <option key={p} value={p}>{AREA_LABELS[p]}</option>)}</select></label>
        <button type="button" className="secondary" disabled={!text.trim() || busy} onClick={() => handTo(false)} title="ZIGi answers here, with that page's records">Let ZIGi answer here</button>
        {onHermes && <button type="button" className="secondary" disabled={!text.trim() || busy} onClick={() => { const value = text.trim(); if (!value) return; onHermes(value, page); clear(); }} title="Your own Hermes Agent answers here, with that page's records under your privacy mode; any change comes back as a card">Ask my Hermes</button>}
        <button type="button" className="secondary" disabled={!text.trim()} onClick={() => handTo(true)} title="Opens ZIGi on that page with your words in its box; nothing is sent until you press Send there">Open ZIGi on {AREA_LABELS[page]}</button>
        {!text.trim() && <p className="ai-note">Type the question first, then choose where ZIGi looks.</p>}
      </div>
    </div>
  </form>;
});
/** The microphone, mounted only once the person turned speech input on (the browser's own recognition; on-device where offered). */
function NovaMic({settings, onListening, onWords}: {settings: AiSettings; onListening: (listening: boolean) => void; onWords: (words: string) => void}) {
  const words = useRef(onWords); useEffect(() => { words.current = onWords; });
  const talk = useTalk({language: settings.voice.language, onDevicePreferred: true, enabled: true, onWords: w => words.current(w)});
  useEffect(() => { onListening(talk.listening); }, [talk.listening, onListening]);
  useEffect(() => () => onListening(false), [onListening]);
  return <>
    {talk.disclosing && <div className="nova-speech-note" role="group" aria-label="Before you talk"><p>{talk.disclosure} ZIGoals never stores the audio.</p><div className="ai-card-actions"><button type="button" className="primary" onClick={talk.acceptDisclosure}>Talk now</button><button type="button" className="text-link" onClick={talk.dismissDisclosure}>Not now</button></div></div>}
    {talk.listening && <span className="nova-live-words" aria-hidden="true">{talk.snapshot?.final || talk.snapshot?.interim || 'Listening…'}</span>}
    <span className="ai-sr-only" role="status" aria-live="polite">{talk.listening ? 'Listening…' : ''}</span>
    {!talk.listening && talk.snapshot?.error && <span className="ai-card-error" role="alert">{talk.snapshot.error}</span>}
    {talk.unavailable && <span className="ai-note" role="status">{talk.reason} <button type="button" className="text-link" onClick={talk.dismissUnavailable}>OK</button></span>}
    {talk.prefs.micShown && <button type="button" className={`secondary nova-mic${talk.listening ? ' nova-mic-on' : ''}`} aria-label={talk.listening ? 'Stop listening' : 'Talk'} aria-pressed={talk.listening} title={talk.listening ? 'Stop listening (Escape cancels)' : 'Talk: tap, or hold and release'}
      onPointerDown={talk.onPointerDown} onPointerUp={talk.onPointerUp} onPointerCancel={talk.onPointerCancel} onContextMenu={e => e.preventDefault()} onClick={e => { if (e.detail === 0) talk.onKeyActivate(); }}>
      <VoiceWaves engine={talk.engine}/>
      <MicGlyph listening={talk.listening}/>
    </button>}
  </>;
}
/** The microphone in the nebula stroke: a square while listening, struck through while speech input is off. */
function MicGlyph({listening = false, off = false}: {listening?: boolean; off?: boolean}) {
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
    {listening ? <rect x="7" y="7" width="10" height="10" rx="2.5" fill="currentColor"/> : <><rect x="9" y="3.5" width="6" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>}
    {off && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>}
  </svg>;
}
