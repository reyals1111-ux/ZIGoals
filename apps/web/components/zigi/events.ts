'use client';
import {useEffect, useRef, useState} from 'react';
import type {ZigiState} from './zigi-avatar';

/**
 * What ZIGi reacts to (ADR-012): the chat tells it when a reply is pending, streaming or done, when a proposal was
 * added, when something failed, when the microphone listens or a reply is read aloud. Pure in-page events: no
 * notifications, no badges, nothing stored, nothing sent.
 */
export type ZigiEvent = 'open' | 'reply-pending' | 'reply-streaming' | 'reply-done' | 'reply-with-proposals' | 'action-applied' | 'error' | 'listening' | 'speaking' | 'idle';
type Listener = (event: ZigiEvent) => void;
const listeners = new Set<Listener>();
export const zigiEvents = {
  emit(event: ZigiEvent): void { for (const listener of listeners) listener(event); },
  on(listener: Listener): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; },
};
const TRANSIENT: Partial<Record<ZigiState, number>> = {celebrate: 2500, greeting: 2500, error: 4000, insight: 3000, presenting: 3000};
export function stateForEvent(event: ZigiEvent): ZigiState {
  switch (event) {
    case 'open': return 'greeting';
    case 'reply-pending': return 'thinking';
    case 'reply-streaming': return 'speaking';
    case 'reply-done': return 'insight';
    case 'reply-with-proposals': return 'presenting';
    case 'action-applied': return 'celebrate';
    case 'error': return 'error';
    case 'listening': return 'listening';
    case 'speaking': return 'speaking';
    case 'idle': return 'idle';
  }
}
/** The avatar state driven by the chat's events; transient states fall back to idle after a moment. */
export function useZigiState(initial: ZigiState = 'idle'): ZigiState {
  const [state, setState] = useState<ZigiState>(initial), timer = useRef<number | null>(null);
  useEffect(() => zigiEvents.on(event => {
    const next = stateForEvent(event);
    setState(next);
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    const after = TRANSIENT[next];
    if (after) timer.current = window.setTimeout(() => { timer.current = null; setState('idle'); }, after);
  }), []);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  return state;
}
