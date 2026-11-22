'use client';
import {useEffect, useRef, useState} from 'react';
import {browserSpeechDisclosure, detectBrowser, recognitionConstructor, recognitionErrorText, recognitionText, speechLanguage, type RecognitionLike} from '../../../lib/ai/voice';
import {normalizeSpoken} from '../../../lib/ai/spoken/normalize';
import './food-plus.css';

/**
 * Session AV lane 2 (food, LEDGER #85; MyFitnessPal's Voice Log, Cronometer's voice logging): a microphone beside Health's
 * "What did you eat?" field. The browser's own speech recognition, where the browser has it (English or Dutch by this
 * device's language); where it has none, nothing is shown. The words are read the spoken way (fillers out, numbers as
 * digits) and put in the field, where they can be changed before "Log in words" — nothing is logged by speaking, and no
 * model reads them. The browser's own words on where the audio goes are one tap away (as Quick add's mic).
 */
export default function MealMic({onText, disabled}: {onText: (text: string) => void; disabled?: boolean}) {
  const [listening, setListening] = useState(false), [error, setError] = useState(''), [heard, setHeard] = useState('');
  const recognition = useRef<RecognitionLike | null>(null), done = useRef(onText);
  useEffect(() => { done.current = onText; });
  const [ctor] = useState(() => typeof window === 'undefined' ? null : recognitionConstructor(window as unknown as {SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown}));
  useEffect(() => () => recognition.current?.abort(), []);
  if (!ctor) return null;
  const browser = typeof navigator === 'undefined' ? 'other' : detectBrowser(navigator.userAgent);
  function start() {
    setError(''); setHeard('');
    const r = new ctor!(); recognition.current = r;
    r.lang = speechLanguage(null, navigator.language); r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    let final = '';
    r.onresult = event => { const t = recognitionText(event.results); final = t.final || final; setHeard(t.final || t.interim); };
    r.onerror = event => { setError(recognitionErrorText(event.error)); };
    r.onend = () => { setListening(false); recognition.current = null; const words = normalizeSpoken(final); if (words) done.current(words); };
    try { r.start(); setListening(true); } catch { setError('Speech recognition could not start here; type what you ate instead.'); }
  }
  return <div className="food-plus-mic-row">
    <button type="button" className="secondary food-plus-mic" aria-pressed={listening} disabled={disabled} onClick={() => listening ? recognition.current?.stop() : start()}>{listening ? 'Stop listening' : 'Speak your meal'}</button>
    {listening && <p className="fine" role="status">Listening{heard ? `: “${heard}”` : '…'} Say it as you would type it, like “two eggs and a slice of toast”.</p>}
    {!listening && <details className="food-plus-mic-how"><summary>Speech is handled by your browser, not by ZIGoals. <span className="text-link">How speech works</span></summary><p className="fine">{browserSpeechDisclosure(browser, false)}</p></details>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
