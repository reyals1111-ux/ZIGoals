import {pickVoice, type SpeechVoiceLike} from '../ai/voice-privacy';

/**
 * Session AW (programmes; owner decision 1d and amendment 3, ADR-046): "Read aloud" with the device's own voice, for the
 * written meditation guides, the stretches and programme steps. The browser's Web Speech synthesis, no dependency.
 *
 * PRIVACY: only a voice the browser reports as running on this device (`localService === true`) is ever offered or used.
 * An online voice (Chrome's "Google …" voices, `localService === false`) sends the text to a speech service, so it is
 * never chosen, not even as a fallback, and the browser's default voice is never left to choose (an utterance always
 * carries the chosen local voice). With no local voice for the language, or no speech synthesis, Read aloud is not
 * offered at all. Nothing is stored and nothing is sent by ZIGoals. The voice list is read again on `voiceschanged`
 * (Chrome fills it late) and at the moment of speaking.
 *
 * Pure and DOM-free, so it is tested with a mocked synthesis (lib/read-aloud/speaker.test.ts); the hook
 * (components/read-aloud/use-local-read-aloud.ts) connects it to `window.speechSynthesis`.
 */
export type VoiceLike = SpeechVoiceLike & {voiceURI?: string};
export type UtteranceLike = {onend: ((event?: unknown) => void) | null; onerror: ((event?: unknown) => void) | null};
export type SynthLike = {
  getVoices(): readonly VoiceLike[]; speak(utterance: UtteranceLike): void; cancel(): void; pause(): void; resume(): void;
  addEventListener?(type: 'voiceschanged', listener: () => void): void; removeEventListener?(type: 'voiceschanged', listener: () => void): void;
};
export type ReadAloudState = 'idle' | 'speaking' | 'paused';
export type ReadAloudSnapshot = {available: boolean; state: ReadAloudState; voiceName: string | null};

/** This device's own voice for the language, or null. Only `localService === true` voices are ever considered. */
export function localVoiceFor<V extends VoiceLike>(voices: readonly V[], lang: string): V | null {
  const local = voices.filter(v => v && v.localService === true);
  const chosen = pickVoice(local, lang, true);
  return chosen && chosen.localService === true ? chosen : null;
}

/** The text in sentence-sized pieces (some browsers stop a long utterance after about fifteen seconds), at most 5,000 characters. */
export function speechChunks(text: string, max = 220): string[] {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 5000);
  if (!clean) return [];
  const sentences = clean.match(/[^.!?…]+[.!?…]+["”’)]*\s*|[^.!?…]+$/g) ?? [clean];
  const out: string[] = [];
  for (const raw of sentences) {
    let s = raw.trim();
    while (s.length > max) { const cut = s.lastIndexOf(' ', max); const at = cut > max / 2 ? cut : max; out.push(s.slice(0, at).trim()); s = s.slice(at).trim(); }
    if (!s) continue;
    const last = out.at(-1);
    if (last && last.length + s.length + 1 <= max) out[out.length - 1] = `${last} ${s}`; else out.push(s);
  }
  return out;
}

export type Speaker = {snapshot(): ReadAloudSnapshot; speak(text: string): boolean; pause(): void; resume(): void; stop(): void; dispose(): void};
/**
 * A reader for one place on the page. `makeUtterance` builds the browser's utterance for a piece of text and the chosen
 * local voice. Stops only what it started itself (ZIGi's own voice is left alone unless this reader speaks).
 */
export function createSpeaker({synth, makeUtterance, lang, onChange}: {synth: SynthLike; makeUtterance: (text: string, voice: VoiceLike) => UtteranceLike; lang: string; onChange?: (s: ReadAloudSnapshot) => void}): Speaker {
  let voice: VoiceLike | null = null, state: ReadAloudState = 'idle', run = 0, disposed = false;
  const snap = (): ReadAloudSnapshot => ({available: !!voice, state, voiceName: voice?.name ?? null});
  const emit = () => { if (!disposed) onChange?.(snap()); };
  const readVoices = (): VoiceLike | null => { try { return localVoiceFor(synth.getVoices() ?? [], lang); } catch { return null; } };
  const refresh = () => { voice = readVoices(); if (!voice && state !== 'idle') stop(); else emit(); };
  try { synth.addEventListener?.('voiceschanged', refresh); } catch { /* an old browser without the event: the first read stands */ }
  voice = readVoices();
  function stop() {
    if (state === 'idle') return;
    run++; state = 'idle';
    try { synth.cancel(); } catch { /* nothing was speaking */ }
    emit();
  }
  return {
    snapshot: snap,
    speak(text) {
      if (disposed) return false;
      // The voice list again, at the moment of use: a voice that went away (or became an online one) is never used.
      const chosen = readVoices(); voice = chosen;
      const pieces = speechChunks(text);
      if (!chosen || chosen.localService !== true || !pieces.length) { if (state !== 'idle') stop(); else emit(); return false; }
      const mine = ++run;
      try { synth.cancel(); } catch { /* nothing to cancel */ }
      state = 'speaking'; emit();
      pieces.forEach((piece, i) => {
        const u = makeUtterance(piece, chosen);
        const end = () => { if (mine === run && i === pieces.length - 1) { state = 'idle'; emit(); } };
        u.onend = end; u.onerror = () => { if (mine === run) { state = 'idle'; emit(); } };
        try { synth.speak(u); } catch { if (mine === run) { state = 'idle'; emit(); } }
      });
      return true;
    },
    pause() { if (state !== 'speaking') return; try { synth.pause(); state = 'paused'; } catch { /* keeps speaking */ } emit(); },
    resume() { if (state !== 'paused') return; try { synth.resume(); state = 'speaking'; } catch { /* stays paused */ } emit(); },
    stop,
    dispose() { if (state !== 'idle') stop(); disposed = true; try { synth.removeEventListener?.('voiceschanged', refresh); } catch { /* gone already */ } },
  };
}
