'use client';
import {useSyncExternalStore} from 'react';
import type {ZigiState} from './manifest';

/**
 * ZIGi's in-page signals (ADR-012 follow-up part E; Session V Part 12): what happened (events) and how ZIGi looks now
 * (the state). This tiny module is all the launcher shell carries on every app page; the machine that turns events into
 * states (events.ts) and the manifest arrive with the chat chunk. Events emitted before the machine is listening (the
 * first "open" happens before the chat chunk arrives) wait here, at most a few, and go to it when it starts. Pure
 * in-page signals: no notifications, no badges, nothing sent or stored.
 */
export type ZigiEvent =
  | 'open' | 'close' | 'reply-pending' | 'reply-streaming' | 'reply-done' | 'reply-with-proposals' | 'action-applied' | 'error' | 'listening' | 'speaking' | 'idle' | 'sleepy'
  // Session V Part 12: ZIGi alive.
  | 'tool-call' | 'writing-proposal' | 'local-answer' | 'ambiguity' | 'not-understood' | 'streak-milestone' | 'careful' | 'encourage'
  | 'offline' | 'online' | 'reminder-due' | 'model-loading' | 'model-ready';
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
let current: ZigiState = 'idle';
const watchers = new Set<() => void>();
export const zigiState = {
  get: (): ZigiState => current,
  set(next: ZigiState): void { if (next === current) return; current = next; for (const watch of watchers) watch(); },
  subscribe(watch: () => void): () => void { watchers.add(watch); return () => { watchers.delete(watch); }; },
};
const idle = (): ZigiState => 'idle';
/** ZIGi's current state, for the launcher's figure and the panel's avatar (idle until the machine says otherwise). */
export function useZigiState(): ZigiState { return useSyncExternalStore(zigiState.subscribe, zigiState.get, idle); }
