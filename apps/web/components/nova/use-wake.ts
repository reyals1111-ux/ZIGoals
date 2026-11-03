'use client';
import {useEffect, useRef, useState} from 'react';
import {isWakePhrase, wakeSupport} from '../../lib/nova/widgets/telemetry';

type Recognition = {lang: string; continuous: boolean; interimResults: boolean; processLocally?: boolean; start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: {results: ArrayLike<ArrayLike<{transcript: string}>>; resultIndex: number}) => void) | null; onend: (() => void) | null; onerror: ((e: {error: string}) => void) | null};
/**
 * Session AK (owner follow-up 3, N12; lane NA): "Hey NOVA". Listens only when the person turned it on, only where the
 * browser recognises speech ON THE DEVICE (processLocally; nothing is sent), only while NOVA's page is visible and its
 * chat closed. Hearing the persona's wake phrase opens the chat. Stops on leaving, hiding the tab or any error.
 */
export function useWakePhrase({on, persona, paused, onWake}: {on: boolean; persona: string; paused: boolean; onWake: () => void}): 'off' | 'listening' | 'unavailable' {
  const [state, setState] = useState<'off' | 'listening' | 'unavailable'>('off'), wake = useRef(onWake);
  wake.current = onWake;
  useEffect(() => {
    if (!on || paused) { setState('off'); return; }
    let stopped = false, rec: Recognition | null = null, retry = 0, timer = 0;
    const begin = () => {
      if (stopped || rec || document.visibilityState === 'hidden') return;
      const Ctor = (window as unknown as {SpeechRecognition?: new () => Recognition}).SpeechRecognition;
      if (!Ctor) { setState('unavailable'); return; }
      rec = new Ctor(); rec.lang = document.documentElement.lang || 'en-US'; rec.continuous = true; rec.interimResults = false; rec.processLocally = true;
      rec.onresult = e => { for (let i = e.resultIndex; i < e.results.length; i++) if (isWakePhrase(e.results[i]?.[0]?.transcript ?? '', persona)) { stopped = true; rec?.stop(); wake.current(); return; } };
      rec.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'language-not-supported') { stopped = true; setState('unavailable'); } };
      rec.onend = () => { rec = null; if (!stopped && retry < 20 && document.visibilityState !== 'hidden') { retry++; timer = window.setTimeout(begin, 600); } };
      try { rec.start(); setState('listening'); } catch { setState('unavailable'); }
    };
    void wakeSupport(window).then(r => { if (stopped) return; if (r.ok) begin(); else setState('unavailable'); });
    const visible = () => { if (document.visibilityState === 'hidden') rec?.abort(); else if (!stopped) begin(); };
    document.addEventListener('visibilitychange', visible);
    return () => { stopped = true; window.clearTimeout(timer); document.removeEventListener('visibilitychange', visible); try { rec?.abort(); } catch { /* already stopped */ } };
  }, [on, paused, persona]);
  return state;
}
