'use client';
import {useEffect} from 'react';
import {zigiEvents, zigiState, type ZigiEvent} from './bus';
import {oneShotMs, ZIGI_MANIFEST, type ZigiState} from './manifest';

export {zigiEvents, type ZigiEvent} from './bus';
/**
 * What ZIGi reacts to (ADR-012, follow-up part E; Session V Part 12): the chat tells it when the panel opens or closes,
 * when a reply is pending, streaming or done, when it read the person's records (a tool call) or writes a proposal, when
 * the app applied a proposal (and a check-in reached a streak milestone), when a question needs a choice or was not
 * understood, when a message touched a sensitive topic, when the person looks back at their week, when the device goes
 * offline, when the microphone listens or a reply is read aloud. Pure in-page events: no notifications, no badges,
 * nothing sent. The machine is a pure function (`transition`), tested without React; the hook adds the timers (a
 * one-shot state plays for its manifest duration, then ZIGi rests; a long quiet spell with the panel open makes ZIGi
 * sleepy) and runs once per page, in the chat chunk, writing the state the launcher and the panel show (bus.ts).
 * Celebrate follows only `action-applied`, which the proposal list emits after the store confirmed the write, never
 * because the AI said something was done; proud follows only a streak milestone the habit engine counted.
 */
/** How long each one-shot state plays before ZIGi rests, in milliseconds (from the manifest). */
export const TRANSIENT_MS: Partial<Record<ZigiState, number>> = Object.fromEntries(Object.keys(ZIGI_MANIFEST.states).filter(s => oneShotMs(s) > 0).map(s => [s, oneShotMs(s)]));
/** The panel open without any event for this long makes ZIGi sleepy; the next event wakes it. */
export const SLEEPY_AFTER_MS = 90_000;
/** The tab's own note of the day ZIGi last greeted; the greeting shows once a day, on the first open (sessionStorage: nothing persists beyond the tab). */
export const GREETED_KEY = 'zigoals:ai:greeted:v1';
export type ZigiContext = {open: boolean; greetedToday: boolean; offline?: boolean};
/** Where ZIGi rests between events: idle, or offline while the device is. */
export const restState = (context: ZigiContext): ZigiState => context.offline ? 'offline' : 'idle';
/** The state an event leads to, from the current state and context; `null` means the event changes nothing. */
export function transition(current: ZigiState, event: ZigiEvent, context: ZigiContext): ZigiState | null {
  switch (event) {
    case 'open': return context.greetedToday ? restState(context) : 'greeting';
    case 'close': return 'wave-goodbye';
    case 'reply-pending': return 'thinking';
    case 'tool-call': return 'reading-your-data';
    case 'reply-streaming': return 'speaking';
    case 'writing-proposal': return 'writing-proposal';
    case 'reply-done': return 'insight';
    case 'reply-with-proposals': return 'presenting';
    case 'local-answer': return 'success';
    case 'ambiguity': return 'curious';
    case 'not-understood': return 'confused';
    case 'action-applied': return 'celebrate';
    case 'streak-milestone': return 'proud';
    case 'careful': return 'empathetic';
    case 'encourage': return 'encouraging';
    case 'error': return 'error';
    case 'offline': return current === 'idle' || current === 'sleepy' ? 'offline' : null;
    case 'online': return current === 'offline' ? 'idle' : null;
    case 'reminder-due': return 'reminder';
    // Phase 2: not connected yet (ZIGi on, no model chosen) asks for attention at rest; the set-up done, ZIGi rests again.
    case 'attention': return current === 'idle' || current === 'sleepy' ? 'attention' : null;
    case 'connected': return current === 'attention' ? restState(context) : null;
    case 'model-loading': return 'loading-model';
    case 'model-ready': return current === 'loading-model' ? restState(context) : null;
    // Session X-Local Part 4: a small success (an accepted card, a logged entry); a surprise the AI hinted at.
    case 'success': return 'success';
    case 'surprise': return 'surprised';
    case 'listening': return 'listening';
    case 'speaking': return 'speaking';
    case 'idle': return current === 'sleepy' || current === 'listening' || current === 'speaking' || current === 'attention' ? restState(context) : null;
    case 'sleepy': return context.open && current === 'idle' ? 'sleepy' : null;
  }
}
/** The state a single event maps to from idle with the panel open and the greeting still due (the manifest test's view). */
export function stateForEvent(event: ZigiEvent): ZigiState { return transition('idle', event, {open: true, greetedToday: false}) ?? 'idle'; }
const today = () => new Date().toISOString().slice(0, 10);
function greetedToday(): boolean { try { return window.sessionStorage.getItem(GREETED_KEY) === today(); } catch { return false; } }
function markGreeted(): void { try { window.sessionStorage.setItem(GREETED_KEY, today()); } catch { /* the tab's storage refused; ZIGi greets again next time */ } }
// One machine per page: its timers live here, so a remount (React's development double effects) never loses them.
let open = false, offline = false, rest: number | null = null, sleepy: number | null = null, listenAfter = false;
const clear = (id: number | null) => { if (id) window.clearTimeout(id); return null; };
const context = (): ZigiContext => ({open, greetedToday: greetedToday(), offline});
function armSleepy(): void {
  sleepy = clear(sleepy);
  if (open) sleepy = window.setTimeout(() => { sleepy = null; const next = transition(zigiState.get(), 'sleepy', context()); if (next) zigiState.set(next); }, SLEEPY_AFTER_MS);
}
function handle(event: ZigiEvent): void {
  if (event === 'open') open = true; else if (event === 'close') open = false;
  if (event === 'offline') offline = true; else if (event === 'online') offline = false;
  // Phase 2 (P2.5, found by the states spec): the composer takes focus the moment the panel opens, so "listening" was
  // replacing the greeting in the same frame and the greeting never showed. The greeting plays out; listening follows it.
  if (event === 'listening' && zigiState.get() === 'greeting' && rest !== null) { listenAfter = true; armSleepy(); return; }
  // A second "open" while the greeting plays (the launcher's effect used to fire twice) must not cut the greeting short.
  if (event === 'open' && zigiState.get() === 'greeting' && rest !== null) { armSleepy(); return; }
  if (event === 'idle' || event === 'close' || event === 'speaking' || event === 'reply-pending') listenAfter = false;
  const next = transition(zigiState.get(), event, context());
  if (event === 'open' && next === 'greeting') markGreeted();
  armSleepy();
  // An event that changes nothing leaves a playing one-shot to finish and rest as planned.
  if (next === null) return;
  rest = clear(rest);
  zigiState.set(next);
  const after = oneShotMs(next);
  if (after) rest = window.setTimeout(() => { rest = null; const listen = listenAfter && open; listenAfter = false; zigiState.set(listen ? 'listening' : restState(context())); armSleepy(); }, after);
}
/**
 * Starts ZIGi's state machine on this page (Session X-Local Part 1: the alive chunk starts it on every app page; the chat
 * panel's hook below still does, harmlessly, on the first open). One listener per page whoever starts it: the bus
 * holds listeners in a set, so a second start adds nothing, and the last stop removes it.
 */
let runners = 0;
export function startZigiMachine(): () => void {
  runners++;
  const off = zigiEvents.on(handle);
  const onOffline = () => zigiEvents.emit('offline'), onOnline = () => zigiEvents.emit('online');
  window.addEventListener('offline', onOffline); window.addEventListener('online', onOnline);
  if (navigator.onLine === false && !offline) zigiEvents.emit('offline');
  let stopped = false;
  return () => { if (stopped) return; stopped = true; runners--; window.removeEventListener('offline', onOffline); window.removeEventListener('online', onOnline); if (!runners) off(); };
}
/** Runs ZIGi's state machine while the chat chunk is on the page (mounted once, in the chat panel). */
export function useZigiMachine(): void {
  useEffect(() => startZigiMachine(), []);
}
