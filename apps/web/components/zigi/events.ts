'use client';
import {useEffect, useRef, useState} from 'react';
import type {ZigiState} from './zigi-avatar';

/**
 * What ZIGi reacts to (ADR-012, follow-up part E): the chat tells it when the panel opens or closes, when a reply is
 * pending, streaming or done, when the app applied a proposal, when something failed, when the microphone listens or a
 * reply is read aloud. Pure in-page events: no notifications, no badges, nothing sent. The state machine is a pure
 * function (`transition`) so it can be tested without React; the hook adds the two timers (transient states fall back
 * to idle, a long quiet spell with the panel open makes ZIGi sleepy). Celebrate follows only `action-applied`, which
 * the proposal list emits after the store confirmed the write, never because the AI said something was done.
 */
export type ZigiEvent = 'open' | 'close' | 'reply-pending' | 'reply-streaming' | 'reply-done' | 'reply-with-proposals' | 'action-applied' | 'error' | 'listening' | 'speaking' | 'idle' | 'sleepy';
type Listener = (event: ZigiEvent) => void;
const listeners = new Set<Listener>();
export const zigiEvents = {
  emit(event: ZigiEvent): void { for (const listener of listeners) listener(event); },
  on(listener: Listener): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; },
};
/** How long a transient state shows before idle, in milliseconds. */
export const TRANSIENT_MS: Partial<Record<ZigiState, number>> = {celebrate: 2500, greeting: 2500, error: 4000, insight: 3000, presenting: 3000};
/** The panel open without any event for this long makes ZIGi sleepy; the next event wakes it. */
export const SLEEPY_AFTER_MS = 90_000;
/** The tab's own note of the day ZIGi last greeted; the greeting shows once a day, on the first open (sessionStorage: nothing persists beyond the tab). */
export const GREETED_KEY = 'zigoals:ai:greeted:v1';
export type ZigiContext = {open: boolean; greetedToday: boolean};
/** The state an event leads to, from the current state and context; `null` means the event changes nothing. */
export function transition(current: ZigiState, event: ZigiEvent, context: ZigiContext): ZigiState | null {
  switch (event) {
    case 'open': return context.greetedToday ? 'idle' : 'greeting';
    case 'close': return 'idle';
    case 'reply-pending': return 'thinking';
    case 'reply-streaming': return 'speaking';
    case 'reply-done': return 'insight';
    case 'reply-with-proposals': return 'presenting';
    case 'action-applied': return 'celebrate';
    case 'error': return 'error';
    case 'listening': return 'listening';
    case 'speaking': return 'speaking';
    case 'idle': return current === 'sleepy' ? 'idle' : current === 'listening' || current === 'speaking' ? 'idle' : null;
    case 'sleepy': return context.open && current === 'idle' ? 'sleepy' : null;
  }
}
/** The state a single event maps to from idle with the panel open and the greeting still due (the manifest test's view). */
export function stateForEvent(event: ZigiEvent): ZigiState { return transition('idle', event, {open: true, greetedToday: false}) ?? 'idle'; }
const today = () => new Date().toISOString().slice(0, 10);
function greetedToday(): boolean { try { return window.sessionStorage.getItem(GREETED_KEY) === today(); } catch { return false; } }
function markGreeted(): void { try { window.sessionStorage.setItem(GREETED_KEY, today()); } catch { /* the tab's storage refused; ZIGi greets again next time */ } }
/** The avatar state driven by the chat's events; transient states fall back to idle, quiet spells make ZIGi sleepy. */
export function useZigiState(initial: ZigiState = 'idle'): ZigiState {
  const [state, setState] = useState<ZigiState>(initial), current = useRef<ZigiState>(initial), open = useRef(false), fallback = useRef<number | null>(null), sleepy = useRef<number | null>(null);
  useEffect(() => {
    const clear = (ref: {current: number | null}) => { if (ref.current) { window.clearTimeout(ref.current); ref.current = null; } };
    const apply = (next: ZigiState) => { current.current = next; setState(next); };
    const armSleepy = () => { clear(sleepy); if (open.current) sleepy.current = window.setTimeout(() => { sleepy.current = null; const next = transition(current.current, 'sleepy', {open: open.current, greetedToday: true}); if (next) apply(next); }, SLEEPY_AFTER_MS); };
    const off = zigiEvents.on(event => {
      if (event === 'open') open.current = true; else if (event === 'close') open.current = false;
      const next = transition(current.current, event, {open: open.current, greetedToday: greetedToday()});
      if (event === 'open' && next === 'greeting') markGreeted();
      clear(fallback); armSleepy();
      if (next === null) return;
      apply(next);
      const after = TRANSIENT_MS[next];
      if (after) fallback.current = window.setTimeout(() => { fallback.current = null; apply('idle'); armSleepy(); }, after);
    });
    return () => { off(); clear(fallback); clear(sleepy); };
  }, []);
  return state;
}
