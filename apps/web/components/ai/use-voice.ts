'use client';
import {currentInstallContext} from '../../lib/install/platform';
const isInstalled = () => { try { return currentInstallContext() === 'installed'; } catch { return false; } };
import {useCallback, useEffect, useRef, useState} from 'react';
import {readKey} from '../../lib/ai/keys';
import {PROVIDERS} from '../../lib/ai/providers';
import type {AiSettings} from '../../lib/ai/settings';
import {browserSpeechDisclosure, detectBrowser, MAX_RECORDING_MS, recognitionConstructor, recognitionErrorText, recognitionText, recorderMimeType, speechLanguage, transcribe, type RecognitionLike, microphoneDeniedText} from '../../lib/ai/voice';
import {zigiEvents} from '../zigi/events';

/**
 * Voice input (ADR-012, Part 7). "browser": the Web Speech API with the disclosure for this browser, on-device where
 * Chrome offers it; "provider": a MediaRecorder recording (WebM/Opus, or MP4/AAC on Safari), at most a minute, sent
 * to the provider's documented transcription endpoint with the key read for that call. Either way the words land in
 * the composer for the person to edit and send. Microphone tracks are released as soon as recording ends.
 */
export type VoiceState = 'idle' | 'listening' | 'recording' | 'transcribing';
export type Voice = {
  mode: AiSettings['voice']['transcription']; available: boolean; state: VoiceState; interim: string; error: string; disclosure: string | null; language: string; secondsLeft: number | null;
  start: () => Promise<void>; stop: () => void; cancel: () => void;
};
export function useVoice({settings, scope, onText}: {settings: AiSettings; scope: string; onText: (text: string) => void}): Voice {
  const [state, setState] = useState<VoiceState>('idle'), [interim, setInterim] = useState(''), [error, setError] = useState(''), [secondsLeft, setSecondsLeft] = useState<number | null>(null), [onDevice, setOnDevice] = useState(false);
  const recognition = useRef<RecognitionLike | null>(null), recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), chunks = useRef<Blob[]>([]), timer = useRef<number | null>(null), ticker = useRef<number | null>(null), controller = useRef<AbortController | null>(null), handler = useRef(onText);
  useEffect(() => { handler.current = onText; });
  const mode = settings.voice.transcription;
  const language = speechLanguage(settings.voice.language, typeof navigator === 'undefined' ? undefined : navigator.language);
  const browser = typeof navigator === 'undefined' ? 'other' : detectBrowser(navigator.userAgent);
  const ctor = typeof window === 'undefined' ? null : recognitionConstructor(window as unknown as {SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown});
  const canRecord = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const providerOk = mode === 'provider' && !!settings.provider && !!PROVIDERS[settings.provider].transcription && !!settings.voice.transcriptionModel && canRecord;
  const available = mode === 'browser' ? !!ctor : providerOk;
  useEffect(() => {
    if (mode !== 'browser' || !ctor?.available) { setOnDevice(false); return; }
    let active = true;
    ctor.available({langs: [language], processLocally: true}).then(result => { if (active) setOnDevice(result === 'available'); }).catch(() => { if (active) setOnDevice(false); });
    return () => { active = false; };
  }, [mode, ctor, language]);
  const clearTimers = () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null; } if (ticker.current) { window.clearInterval(ticker.current); ticker.current = null; } setSecondsLeft(null); };
  const releaseStream = () => { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; };
  const finishIdle = useCallback(() => { clearTimers(); setState('idle'); setInterim(''); zigiEvents.emit('idle'); }, []);
  const startBrowser = useCallback(async () => {
    if (!ctor) { setError(browserSpeechDisclosure(browser, false)); return; }
    const instance = new ctor();
    instance.lang = language; instance.interimResults = true; instance.continuous = false; instance.maxAlternatives = 1;
    if (onDevice) { try { instance.processLocally = true; } catch { /* older Chrome */ } }
    let finalText = '';
    instance.onresult = event => { const {final, interim: partial} = recognitionText(event.results); if (final) finalText = final; setInterim(partial); };
    instance.onerror = event => { const text = recognitionErrorText(event.error); if (text) setError(text); };
    instance.onend = () => { recognition.current = null; if (finalText) handler.current(finalText); finishIdle(); };
    recognition.current = instance;
    setError(''); setState('listening'); zigiEvents.emit('listening');
    try { instance.start(); } catch { recognition.current = null; setError('Speech recognition could not start.'); finishIdle(); return; }
    timer.current = window.setTimeout(() => instance.stop(), MAX_RECORDING_MS);
  }, [browser, ctor, finishIdle, language, onDevice]);
  const startProvider = useCallback(async () => {
    if (!providerOk || !settings.provider) { setError('Provider transcription needs OpenAI with a transcription model chosen in Settings; or switch to browser speech.'); return; }
    const mime = recorderMimeType(type => MediaRecorder.isTypeSupported(type));
    let media: MediaStream;
    try { media = await navigator.mediaDevices.getUserMedia({audio: true}); }
    catch { setError(microphoneDeniedText(detectBrowser(navigator.userAgent), isInstalled())); return; }
    stream.current = media; chunks.current = [];
    const rec = new MediaRecorder(media, mime ? {mimeType: mime} : undefined);
    recorder.current = rec;
    const provider = settings.provider, model = settings.voice.transcriptionModel!;
    rec.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
    rec.onstop = async () => {
      releaseStream(); recorder.current = null; clearTimers();
      const blob = new Blob(chunks.current, {type: rec.mimeType || mime || 'audio/webm'}); chunks.current = [];
      if (!blob.size) { finishIdle(); return; }
      setState('transcribing');
      const abort = new AbortController(); controller.current = abort;
      try { const key = await readKey(scope, provider); const text = await transcribe({provider, key, blob, mime: blob.type, model, language, signal: abort.signal}); if (text) handler.current(text); }
      catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'The recording could not be transcribed.'); }
      finally { controller.current = null; finishIdle(); }
    };
    setError(''); setState('recording'); zigiEvents.emit('listening');
    rec.start(250);
    const startedAt = Date.now();
    setSecondsLeft(MAX_RECORDING_MS / 1000);
    ticker.current = window.setInterval(() => setSecondsLeft(Math.max(0, Math.ceil((MAX_RECORDING_MS - (Date.now() - startedAt)) / 1000))), 500);
    timer.current = window.setTimeout(() => { if (rec.state !== 'inactive') rec.stop(); }, MAX_RECORDING_MS);
  }, [finishIdle, language, providerOk, scope, settings.provider, settings.voice.transcriptionModel]);
  const start = useCallback(async () => {
    if (state !== 'idle') return;
    if (mode === 'browser') await startBrowser(); else if (mode === 'provider') await startProvider(); else setError('Voice is off. Turn it on in Settings → ZIGi · your AI → Voice.');
  }, [mode, startBrowser, startProvider, state]);
  const stop = useCallback(() => {
    if (recognition.current) { try { recognition.current.stop(); } catch { /* already stopped */ } return; }
    const rec = recorder.current; if (rec && rec.state !== 'inactive') rec.stop();
  }, []);
  const cancel = useCallback(() => {
    if (recognition.current) { try { recognition.current.abort(); } catch { /* already stopped */ } recognition.current = null; }
    const rec = recorder.current; if (rec) { rec.onstop = null; if (rec.state !== 'inactive') rec.stop(); recorder.current = null; }
    controller.current?.abort(); controller.current = null; chunks.current = []; releaseStream(); finishIdle();
  }, [finishIdle]);
  useEffect(() => cancel, [cancel]);
  const disclosure = mode === 'browser' ? browserSpeechDisclosure(browser, onDevice) : mode === 'provider' && settings.provider ? `Recordings (up to a minute) go from this browser to ${PROVIDERS[settings.provider].name} for transcription with your key; nothing through ZIGoals.` : null;
  return {mode, available, state, interim, error, disclosure, language, secondsLeft, start, stop, cancel};
}
/** Read-aloud through the browser's speech synthesis (off by default; the person chooses it per reply or in Settings). */
export function useReadAloud(language: string) {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const stop = useCallback(() => { if (supported) window.speechSynthesis.cancel(); setSpeaking(false); zigiEvents.emit('idle'); }, [supported]);
  const speak = useCallback((text: string) => {
    if (!supported || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 5000));
    utterance.lang = language;
    utterance.onend = () => { setSpeaking(false); zigiEvents.emit('idle'); };
    utterance.onerror = () => { setSpeaking(false); zigiEvents.emit('idle'); };
    setSpeaking(true); zigiEvents.emit('speaking');
    window.speechSynthesis.speak(utterance);
  }, [language, supported]);
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);
  return {supported, speaking, speak, stop};
}
