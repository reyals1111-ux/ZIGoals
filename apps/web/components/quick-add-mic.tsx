'use client';
import {useEffect, useRef, useState} from 'react';
import {browserSpeechDisclosure, detectBrowser, recognitionConstructor, recognitionErrorText, recognitionText, speechLanguage, type RecognitionLike} from '../lib/ai/voice';
import {normalizeSpoken} from '../lib/ai/spoken/normalize';

/**
 * Session AI (feature 2, voice logging): say a line instead of typing it. The browser's own speech recognition (no AI
 * needed, no key; the disclosure says where the audio goes), English or Dutch by this device's language; the words are
 * read the spoken way (fillers out, numbers as digits, the last of a self-correction) and land in the Quick add line,
 * which previews them as one card or, for several items, one card each (J10). Nothing is saved before Save or Add.
 */
export function QuickAddMic({onText, disabled}: {onText: (text: string) => void; disabled?: boolean}) {
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
    try { r.start(); setListening(true); } catch { setError('Speech recognition could not start here; type the line instead.'); }
  }
  return <div className="quick-add-mic">
    <button type="button" className="secondary" aria-pressed={listening} disabled={disabled} onClick={() => listening ? recognition.current?.stop() : start()}>{listening ? 'Stop' : 'Speak a line'}</button>
    {listening && <p className="fine" role="status">Listening{heard ? `: “${heard}”` : '…'} Say several things at once, like “two glasses of water and a banana”.</p>}
    {!listening && <p className="fine">{browserSpeechDisclosure(browser, false)}</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
