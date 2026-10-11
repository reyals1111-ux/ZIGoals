import {MAX_RECORDING_MS, recognitionConstructor, recognitionText, type RecognitionConstructor, type RecognitionLike} from '../../lib/ai/voice';

/**
 * Talk to ZIGi (Session Z-Cloud Part 3, ADR-019): one listening session at a time for the whole page, shared by the
 * composer's microphone and ZIGi's launcher. No React and no other import, so the launcher can load it while the
 * browser is idle once ZIGi is on screen, and `start()` can run synchronously inside the person's own press or click
 * (iOS Safari starts speech recognition, and unlocks speech synthesis, only inside the gesture itself).
 *
 * The words come from the browser's own speech recognition (Chrome and Edge, Safari on macOS and iOS; on-device where
 * Chrome offers it). The level that drives ZIGi's waves comes from a Web Audio analyser on the microphone where a second
 * capture is safe (Chromium outside iOS); elsewhere from the recognition's own sound and speech events. Audio is never
 * stored or sent anywhere by ZIGoals; every microphone track stops the moment listening ends, however it ends.
 */
export type EngineState = 'idle' | 'listening';
export type EngineSnapshot = {state: EngineState; interim: string; final: string; level: number; error: string; origin: Origin | null; lang: string};
export type Origin = 'composer' | 'launcher' | 'shortcut';
export type EngineEnd = {text: string; origin: Origin; cancelled: boolean; error: string};
type Listener = (snapshot: EngineSnapshot) => void;
type EndListener = (end: EngineEnd) => void;
type Scope = Window & {SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown; AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext};
export type StartOptions = {lang: string; origin: Origin; onDevice?: boolean; meter?: boolean};

/** Whether a second microphone capture beside speech recognition is safe: Chromium outside iOS (on iOS every browser is WebKit). */
export function analyserAllowed(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) || (ua.includes('macintosh') && ua.includes('mobile/'))) return false;
  return (ua.includes('chrome/') || ua.includes('edg/') || ua.includes('chromium/')) && !ua.includes('firefox/');
}
/** Plain words for the recognition's error codes (Session Z-Cloud: no speech is a gentle retry; offline says so). */
export function engineErrorText(code: string, online: boolean): string {
  switch (code) {
    case 'no-speech': return 'I didn’t hear anything. Tap the microphone and try again.';
    case 'network': return online ? 'Your browser’s speech service could not be reached. Try again, or use your keyboard’s dictation.' : 'You’re offline, so your browser’s speech service can’t be reached. Use your keyboard’s dictation, or type.';
    case 'audio-capture': return 'No microphone was found. Use your keyboard’s dictation, or type.';
    case 'language-not-supported': return 'This language isn’t available for speech here. Choose English or Dutch in Settings → ZIGi · Your Personal AI Companion → Voice.';
    case 'aborted': return '';
    default: return 'Listening stopped unexpectedly. Try again, or type.';
  }
}
export class VoiceEngine {
  private ctor: RecognitionConstructor | null;
  private recognition: RecognitionLike | null = null;
  private stream: MediaStream | null = null;
  private audio: AudioContext | null = null;
  private frame = 0;
  private timer = 0;
  private decay = 0;
  private snapshot: EngineSnapshot = {state: 'idle', interim: '', final: '', level: 0, error: '', origin: null, lang: ''};
  private listeners = new Set<Listener>();
  private endListeners = new Set<EndListener>();
  private session = 0;
  constructor(private scope: Scope) { this.ctor = recognitionConstructor(scope); }
  get supported(): boolean { return this.ctor !== null; }
  get current(): EngineSnapshot { return this.snapshot; }
  /** Every change of state, words and level. */
  subscribe(listener: Listener): () => void { this.listeners.add(listener); listener(this.snapshot); return () => { this.listeners.delete(listener); }; }
  /** Called once per listening session, when it ends with or without words. */
  onEnd(listener: EndListener): () => void { this.endListeners.add(listener); return () => { this.endListeners.delete(listener); }; }
  private set(change: Partial<EngineSnapshot>) { this.snapshot = {...this.snapshot, ...change}; for (const l of [...this.listeners]) { try { l(this.snapshot); } catch { /* a listener's own problem */ } } }
  /**
   * Starts listening, synchronously: `recognition.start()` runs before this returns, so a press or click handler keeps its
   * gesture. Returns false (and says why in the snapshot) when the browser has no recognition or refuses to start.
   */
  start({lang, origin, onDevice = false, meter = true}: StartOptions): boolean {
    if (!this.ctor) { this.set({error: 'Speech recognition isn’t offered by this browser.'}); return false; }
    if (this.recognition) this.cancel();
    const session = ++this.session;
    const recognition = new this.ctor();
    recognition.lang = lang; recognition.interimResults = true; recognition.continuous = false; recognition.maxAlternatives = 1;
    if (onDevice) { try { recognition.processLocally = true; } catch { /* an older Chrome */ } }
    let finalText = '';
    recognition.onresult = event => { if (session !== this.session) return; const {final, interim} = recognitionText(event.results); if (final) finalText = final; this.pulse(0.65 + Math.min(0.35, (interim.length % 7) / 20)); this.set({interim, final: finalText}); };
    recognition.onerror = event => { if (session !== this.session) return; const text = engineErrorText(event.error, typeof navigator === 'undefined' || navigator.onLine !== false); if (text) this.set({error: text}); };
    recognition.onend = () => { if (session === this.session) this.finish(finalText || this.snapshot.interim, false); };
    const events = recognition as unknown as Record<string, unknown>;
    // Safari and Chrome both fire these; they drive the waves where no analyser may run.
    events.onaudiostart = () => { if (session === this.session) this.pulse(0.25); };
    events.onsoundstart = () => { if (session === this.session) this.pulse(0.5); };
    events.onspeechstart = () => { if (session === this.session) this.pulse(0.8); };
    events.onsoundend = () => { if (session === this.session) this.pulse(0.15); };
    this.recognition = recognition;
    try { recognition.start(); }
    catch { this.recognition = null; this.set({state: 'idle', error: 'Listening could not start here. Use your keyboard’s dictation, or type.', origin: null}); return false; }
    this.set({state: 'listening', interim: '', final: '', error: '', level: 0.12, origin, lang});
    this.timer = this.scope.setTimeout(() => this.stop(), MAX_RECORDING_MS);
    if (meter && analyserAllowed(this.scope.navigator?.userAgent ?? '')) void this.meter(session);
    return true;
  }
  /** Stops listening and keeps what was heard (the recognition delivers its last words, then ends). */
  stop(): void {
    const recognition = this.recognition;
    if (!recognition) return;
    try { recognition.stop(); } catch { this.finish(this.snapshot.final || this.snapshot.interim, false); }
  }
  /** Escape: stops at once and drops the words. */
  cancel(): void {
    const recognition = this.recognition;
    if (!recognition) { this.release(); return; }
    this.session++;
    try { recognition.abort(); } catch { /* already ended */ }
    this.recognition = null;
    this.endSession('', true);
  }
  private finish(text: string, cancelled: boolean) {
    this.recognition = null;
    this.session++;
    this.endSession(text.trim(), cancelled);
  }
  private endSession(text: string, cancelled: boolean) {
    const origin = this.snapshot.origin ?? 'composer', error = this.snapshot.error;
    this.release();
    this.set({state: 'idle', interim: '', final: '', level: 0, origin: null});
    for (const l of [...this.endListeners]) { try { l({text, origin, cancelled, error}); } catch { /* a listener's own problem */ } }
  }
  /** Every microphone track stops, the analyser closes, the timers clear: nothing keeps the microphone. */
  private release() {
    if (this.timer) { this.scope.clearTimeout(this.timer); this.timer = 0; }
    if (this.decay) { this.scope.clearInterval(this.decay); this.decay = 0; }
    if (this.frame) { this.scope.cancelAnimationFrame(this.frame); this.frame = 0; }
    this.stream?.getTracks().forEach(track => { try { track.stop(); } catch { /* already stopped */ } });
    this.stream = null;
    const audio = this.audio; this.audio = null;
    if (audio && audio.state !== 'closed') void audio.close().catch(() => undefined);
  }
  /** A short burst on the waves from a recognition event, falling back towards a resting glow. */
  private pulse(level: number) {
    if (this.stream) return; // the analyser drives the level
    this.set({level: Math.max(0, Math.min(1, level))});
    if (!this.decay) this.decay = this.scope.setInterval(() => { if (this.snapshot.state !== 'listening') return; this.set({level: Math.max(0.12, this.snapshot.level * 0.82)}); }, 90);
  }
  private async meter(session: number) {
    const media = this.scope.navigator?.mediaDevices;
    const Ctx = this.scope.AudioContext ?? this.scope.webkitAudioContext;
    if (!media?.getUserMedia || !Ctx) return;
    let stream: MediaStream;
    try { stream = await media.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true}}); } catch { return; }
    if (session !== this.session || this.snapshot.state !== 'listening') { stream.getTracks().forEach(t => t.stop()); return; }
    this.stream = stream;
    try {
      const audio = new Ctx(); this.audio = audio;
      const analyser = audio.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.6;
      audio.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (session !== this.session || !this.audio) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0; for (const v of data) { const x = (v - 128) / 128; sum += x * x; }
        const rms = Math.sqrt(sum / data.length);
        this.set({level: Math.max(0.1, Math.min(1, rms * 4.5))});
        this.frame = this.scope.requestAnimationFrame(tick);
      };
      this.frame = this.scope.requestAnimationFrame(tick);
    } catch { this.release(); }
  }
}
/** The one engine of this page (both the composer and the launcher use it). */
export function voiceEngine(scope: Window = window): VoiceEngine {
  const holder = scope as Window & {__zigiVoiceEngine?: VoiceEngine};
  holder.__zigiVoiceEngine ??= new VoiceEngine(scope as Scope);
  return holder.__zigiVoiceEngine;
}
/**
 * iOS speaks only after a gesture has unlocked speech synthesis: an empty utterance inside the person's press does it,
 * once per page. Nothing is heard.
 */
export function unlockSpeech(scope: Window = window): void {
  const holder = scope as Window & {__zigiSpeechUnlocked?: boolean};
  if (holder.__zigiSpeechUnlocked || !('speechSynthesis' in scope) || typeof SpeechSynthesisUtterance === 'undefined') return;
  holder.__zigiSpeechUnlocked = true;
  try { const silent = new SpeechSynthesisUtterance(''); silent.volume = 0; scope.speechSynthesis.speak(silent); } catch { /* nothing to unlock */ }
}
