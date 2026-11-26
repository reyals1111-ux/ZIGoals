'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {usePathname} from 'next/navigation';
import {createSpeaker, type ReadAloudSnapshot, type Speaker, type SynthLike, type UtteranceLike, type VoiceLike} from '../../lib/read-aloud/speaker';

/**
 * Session AW (programmes; amendment 3, ADR-046): the hook behind <ReadAloud>. It connects lib/read-aloud/speaker.ts to the
 * browser's `speechSynthesis`, offering only this device's own voices (`localService === true`). Without speech synthesis
 * or a local voice for the language, `available` stays false and nothing is shown. It stops speaking when the component
 * goes away, when the route changes and when the page is hidden for good (pagehide). ZIGi's own voice
 * (components/ai/use-voice.ts) is separate and unchanged.
 */
const IDLE: ReadAloudSnapshot = {available: false, state: 'idle', voiceName: null};
type SpeechWindow = {speechSynthesis?: SynthLike; SpeechSynthesisUtterance?: new (text: string) => UtteranceLike & {voice: unknown; lang: string}};
function browserSpeech(): {synth: SynthLike; Utterance: NonNullable<SpeechWindow['SpeechSynthesisUtterance']>} | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as SpeechWindow;
  try { return w.speechSynthesis && typeof w.SpeechSynthesisUtterance === 'function' ? {synth: w.speechSynthesis, Utterance: w.SpeechSynthesisUtterance} : null; } catch { return null; }
}
export function useLocalReadAloud(lang: string) {
  const [snap, setSnap] = useState<ReadAloudSnapshot>(IDLE);
  const speaker = useRef<Speaker | null>(null);
  useEffect(() => {
    const speech = browserSpeech();
    if (!speech) return;
    const s = createSpeaker({synth: speech.synth, lang, onChange: setSnap, makeUtterance: (text: string, voice: VoiceLike) => {
      const u = new speech.Utterance(text);
      u.voice = voice; u.lang = voice.lang;
      return u;
    }});
    speaker.current = s;
    // The first read of the voice list is shown after mount, so the server's page and the first paint match (nothing).
    queueMicrotask(() => setSnap(s.snapshot()));
    const hide = () => s.stop();
    window.addEventListener('pagehide', hide);
    return () => { window.removeEventListener('pagehide', hide); s.dispose(); if (speaker.current === s) speaker.current = null; setSnap(IDLE); };
  }, [lang]);
  // A route change stops the reading (a page kept mounted across a change of address included).
  const pathname = usePathname();
  useEffect(() => () => speaker.current?.stop(), [pathname]);
  const speak = useCallback((text: string) => speaker.current?.speak(text) ?? false, []);
  const pause = useCallback(() => speaker.current?.pause(), []);
  const resume = useCallback(() => speaker.current?.resume(), []);
  const stop = useCallback(() => speaker.current?.stop(), []);
  return {...snap, speak, pause, resume, stop};
}
