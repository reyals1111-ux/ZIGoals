'use client';
import {useSyncExternalStore} from 'react';
import type {ZigiState} from './manifest';

/**
 * ZIGi's in-page signals (ADR-012 follow-up part E; Session V Part 12; Session X-Local Part 1): what happened (events),
 * how ZIGi looks now (the state), and which files show each state (the frames). This tiny module is all the launcher
 * shell carries on every app page; the machine that turns events into states (events.ts), the manifest and the frames'
 * source arrive with the lazily loaded alive chunk (alive.ts) or the chat chunk. Events emitted before the machine is
 * listening (the first "open" happens before the chat chunk arrives) wait here, at most a few, and go to it when it
 * starts. Pure in-page signals: no notifications, no badges, nothing sent or stored.
 */
export type ZigiEvent =
  | 'open' | 'close' | 'reply-pending' | 'reply-streaming' | 'reply-done' | 'reply-with-proposals' | 'action-applied' | 'error' | 'listening' | 'speaking' | 'idle' | 'sleepy'
  // Session V Part 12: ZIGi alive.
  | 'tool-call' | 'writing-proposal' | 'local-answer' | 'ambiguity' | 'not-understood' | 'streak-milestone' | 'careful' | 'encourage'
  | 'offline' | 'online' | 'reminder-due' | 'model-loading' | 'model-ready'
  // Session X-Local Part 4: a small success (an accepted card, a logged entry) and a surprise (an AI hint).
  | 'success' | 'surprise'
  // Session X-Local Phase 2 (P2.5): ZIGi is on but not set up (no model chosen yet): attention at rest; set-up ends it.
  | 'attention' | 'connected';
type Listener = (event: ZigiEvent) => void;
const listeners = new Set<Listener>(), early: ZigiEvent[] = [];
export const zigiEvents = {
  emit(event: ZigiEvent): void {
    if (!listeners.size) { if (early.length < 8) early.push(event); return; }
    for (const listener of listeners) listener(event);
  },
  on(listener: Listener): () => void {
    listeners.add(listener);
    for (const event of early.splice(0)) listener(event);
    return () => { listeners.delete(listener); };
  },
};
/**
 * Session X-Local Part 4: semantic signals, the one thing the app and the chat tell ZIGi's companion controller
 * (components/zigi/semantic.ts, in the alive chunk): `{type}` and whether the host validated the fact (the store
 * confirmed the write). The controller applies the rules (validated-only celebrations, cooldowns, priority holds, the
 * nudge budget, quiet hours, the typing guard, the daily celebration cap, the rate limit) and turns an allowed signal into
 * one of the machine's events above. Signals sent before the controller listens wait here, at most a few.
 */
export type ZigiSignal = {type: string; validated: boolean};
type SignalListener = (signal: ZigiSignal) => void;
const signalListeners = new Set<SignalListener>(), earlySignals: ZigiSignal[] = [];
export const zigiSignals = {
  /** A plain signal: what the chat or the app observed. A celebration asked this way is refused by the controller. */
  emit(type: string): void { zigiSignals.send({type, validated: false}); },
  /** A host-validated fact: the store confirmed the write, the engine counted the milestone. */
  emitValidated(type: string): void { zigiSignals.send({type, validated: true}); },
  send(signal: ZigiSignal): void {
    if (!signalListeners.size) { if (earlySignals.length < 8) earlySignals.push(signal); return; }
    for (const listener of signalListeners) listener(signal);
  },
  on(listener: SignalListener): () => void {
    signalListeners.add(listener);
    for (const signal of earlySignals.splice(0)) listener(signal);
    return () => { signalListeners.delete(listener); };
  },
};
function store<T>(initial: T) {
  let current = initial;
  const watchers = new Set<() => void>();
  return {
    get: (): T => current,
    set(next: T): void { if (next === current) return; current = next; for (const watch of watchers) watch(); },
    subscribe(watch: () => void): () => void { watchers.add(watch); return () => { watchers.delete(watch); }; },
  };
}
export const zigiState = store<ZigiState>('idle');
const idle = (): ZigiState => 'idle';
/** ZIGi's current state, for the launcher's figure and the panel's avatar (idle until the machine says otherwise). */
export function useZigiState(): ZigiState { return useSyncExternalStore(zigiState.subscribe, zigiState.get, idle); }
/**
 * Session X-Local Part 1: the files that show each state right now, published by the alive chunk from the manifest, the
 * chosen skin and the motion setting: a poster (the still frame, 1× and 2×), while motion is allowed the animated file
 * the browser can play, and whether the clip is the state's own (then the CSS move rests while it plays) or a worn one
 * (the state's own CSS move stays on top). Until the chunk arrives the shell shows its one constant frame.
 */
export type ZigiFrame = {poster: {x1: string; x2: string}; animated: string | null; own: boolean};
export type ZigiFrames = Partial<Record<string, ZigiFrame>>;
export const zigiFrames = store<ZigiFrames | null>(null);
const none = (): ZigiFrames | null => null;
export function useZigiFrames(): ZigiFrames | null { return useSyncExternalStore(zigiFrames.subscribe, zigiFrames.get, none); }
/**
 * Session X-Local Part 3: the idle variation playing right now (a clip's files), or null for the base idle. Set by the
 * rotation in the alive chunk only while the state is idle; the figure shows it instead of idle's own frame.
 */
export const zigiIdleVariant = store<ZigiFrame | null>(null);
export function useZigiIdleVariant(): ZigiFrame | null { return useSyncExternalStore(zigiIdleVariant.subscribe, zigiIdleVariant.get, none as () => ZigiFrame | null); }
