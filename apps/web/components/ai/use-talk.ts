'use client';
import {useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent} from 'react';
import {browserSpeechDisclosure, detectBrowser} from '../../lib/ai/voice';
import {resolveVoiceLanguage} from '../../lib/zigi-voice-lang';
import {voicePrefs, ZIGI_VOICE} from '../../lib/zigi-voice';
import {zigiSignals} from '../zigi/bus';
import {unlockSpeech, voiceEngine, type EngineSnapshot, type Origin, type VoiceEngine} from './voice-engine';
import {useDeviceRecord} from './use-device-record';
import {TALK_EVENT, TALK_PENDING, TALK_STOP_EVENT, type TalkRequest} from './talk-events';

/**
 * Talk to ZIGi from the composer (Session Z-Cloud Part 3, ADR-019). The microphone shows wherever the browser offers
 * speech recognition, connected to an AI or not (the words then go to the on-device answers). A press starts listening
 * at once, inside the press (iOS); a press shorter than 300 ms is a tap (it keeps listening until the person stops talking
 * or taps again), a longer one is push-to-talk (listening stops on release). The first press in a browser shows which
 * service hears the audio, once, before anything is recorded. Escape cancels. ZIGi's launcher asks for the same session
 * through `TALK_EVENT` (a hold, "Tap ZIGi to talk", the keyboard shortcut); when this composer cannot start yet it lights
 * its microphone with "Tap the mic to talk" instead.
 */
export {TALK_EVENT, TALK_PENDING, TALK_STOP_EVENT, type TalkRequest} from './talk-events';
export const HOLD_MS = 300;
type Phase = {pressAt: number; startedHere: boolean; wasListening: boolean} | null;
export function useTalk({language, onDevicePreferred, enabled, onWords}: {language: string | null; onDevicePreferred: boolean; enabled: boolean; onWords: (text: string, origin: Origin) => void}) {
  const engine = useMemo<VoiceEngine | null>(() => typeof window === 'undefined' ? null : voiceEngine(), []);
  const record = useDeviceRecord(ZIGI_VOICE), prefs = voicePrefs(record.data);
  const browser = typeof navigator === 'undefined' ? 'other' : detectBrowser(navigator.userAgent);
  const lang = resolveVoiceLanguage(language, typeof navigator === 'undefined' ? undefined : navigator.language);
  const [snapshot, setSnapshot] = useState<EngineSnapshot | null>(null), [onDevice, setOnDevice] = useState(false);
  const [disclosing, setDisclosing] = useState(false), [highlight, setHighlight] = useState(false), [unavailable, setUnavailable] = useState(false);
  const words = useRef(onWords); useEffect(() => { words.current = onWords; });
  const phase = useRef<Phase>(null);
  const supported = !!engine?.supported, disclosed = !!record.data.disclosed?.[browser];
  const listening = snapshot?.state === 'listening';
  useEffect(() => engine?.subscribe(setSnapshot), [engine]);
  useEffect(() => engine?.onEnd(end => { zigiSignals.emit('idle'); if (end.text && !end.cancelled) words.current(end.text, end.origin); }), [engine]);
  useEffect(() => { if (listening) zigiSignals.emit('assistant_listening'); }, [listening]);
  // Chrome's on-device recognition, where it says it is available for this language.
  useEffect(() => {
    const ctor = typeof window === 'undefined' ? null : (window as unknown as {SpeechRecognition?: {available?: (o: {langs: string[]; processLocally?: boolean}) => Promise<string>}}).SpeechRecognition;
    if (!onDevicePreferred || !ctor?.available) { setOnDevice(false); return; }
    let active = true;
    ctor.available({langs: [lang], processLocally: true}).then(r => { if (active) setOnDevice(r === 'available'); }).catch(() => { if (active) setOnDevice(false); });
    return () => { active = false; };
  }, [lang, onDevicePreferred]);
  const markDisclosed = useCallback(() => { try { record.update(r => ({...r, disclosed: {...r.disclosed, [browser]: new Date().toISOString()}})); } catch { /* shown again next time; never blocks talking */ } }, [browser, record]);
  /** Starts inside the caller's own gesture. False when it cannot (then the reason is on screen). */
  const begin = useCallback((origin: Origin): boolean => {
    if (!engine || !enabled) return false;
    if (!supported) { setUnavailable(true); return false; }
    if (!disclosed) { setDisclosing(true); return false; }
    unlockSpeech();
    try { window.speechSynthesis?.cancel(); } catch { /* nothing reading */ }
    setHighlight(false); setUnavailable(false);
    return engine.start({lang, origin, onDevice});
  }, [disclosed, enabled, engine, lang, onDevice, supported]);
  const stop = useCallback(() => engine?.stop(), [engine]);
  const cancel = useCallback(() => engine?.cancel(), [engine]);
  /** The disclosure's own "Talk now": seen, then listening, in the same click. */
  const acceptDisclosure = useCallback(() => {
    markDisclosed(); setDisclosing(false);
    if (!engine) return;
    unlockSpeech();
    engine.start({lang, origin: 'composer', onDevice});
  }, [engine, lang, markDisclosed, onDevice]);
  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    // The release belongs to this press even if something opens over the microphone meanwhile.
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* an old browser keeps the plain events */ }
    const was = engine?.current.state === 'listening';
    phase.current = {pressAt: Date.now(), startedHere: false, wasListening: was};
    if (was) return;
    phase.current.startedHere = begin('composer');
  }, [begin, engine]);
  const onPointerUp = useCallback(() => {
    const p = phase.current; phase.current = null; if (!p) return;
    if (p.wasListening) { stop(); return; }
    if (p.startedHere && Date.now() - p.pressAt >= HOLD_MS) stop();
  }, [stop]);
  const onPointerCancel = useCallback(() => { const p = phase.current; phase.current = null; if (p?.startedHere && Date.now() - p.pressAt >= HOLD_MS) stop(); }, [stop]);
  /** Enter or Space on the focused microphone: start, or stop. */
  const onKeyActivate = useCallback(() => { if (engine?.current.state === 'listening') stop(); else begin('composer'); }, [begin, engine, stop]);
  // The launcher's requests (a hold, a tap with "Tap ZIGi to talk", the shortcut) and its stop on release.
  useEffect(() => {
    const onTalk = (event: Event) => {
      const detail = (event as CustomEvent<TalkRequest>).detail; if (!detail) return;
      if (engine?.current.state === 'listening') { stop(); detail.handled = 'started'; return; }
      if (supported && disclosed && enabled && begin(detail.origin)) detail.handled = 'started';
      else { setHighlight(true); detail.handled = 'highlight'; }
    };
    const onStop = () => stop();
    window.addEventListener(TALK_EVENT, onTalk); window.addEventListener(TALK_STOP_EVENT, onStop);
    const pending = window as unknown as Record<string, unknown>;
    if (pending[TALK_PENDING]) { delete pending[TALK_PENDING]; setHighlight(true); }
    return () => { window.removeEventListener(TALK_EVENT, onTalk); window.removeEventListener(TALK_STOP_EVENT, onStop); };
  }, [begin, disclosed, enabled, engine, stop, supported]);
  // Escape cancels listening (before it would close the panel); the microphone is released at once.
  useEffect(() => {
    if (!listening) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [cancel, listening]);
  // Leaving the panel ends listening; nothing keeps the microphone.
  useEffect(() => () => { if (engine?.current.state === 'listening' && engine.current.origin === 'composer') engine.cancel(); }, [engine]);
  const disclosure = browserSpeechDisclosure(browser, onDevice);
  const reason = browser === 'firefox' ? 'Firefox has no speech recognition yet.' : 'This browser doesn’t offer speech recognition here.';
  return {engine, prefs, record, browser, lang, supported, listening, snapshot, disclosing, disclosure, highlight, unavailable, reason,
    begin, stop, cancel, acceptDisclosure, dismissDisclosure: () => setDisclosing(false), dismissHighlight: () => setHighlight(false), dismissUnavailable: () => setUnavailable(false),
    onPointerDown, onPointerUp, onPointerCancel, onKeyActivate};
}
