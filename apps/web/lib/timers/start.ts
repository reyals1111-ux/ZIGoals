import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {getAppStorage} from '../showcase-storage';
import {ZIGI_STORE_EVENT} from '../ai/store/keys';
import {TIMERS, startTimer, type Timer, type Timers} from './store';

/**
 * Session AW (X1, LEDGER #440): the small API other features start timers with (round 7's #449 starts one from a recipe
 * step: `startNamedTimer('Pasta · Simmer', 900)`). Writes `zigoals:timers:v1` through the app storage (the person's own, or
 * the Showcase tab's), tells every open reader (the strip appears at once) and the notification plan (a wake at its end
 * once notifications are on). Throws, with nothing written, when it cannot be kept.
 */
type Storage_ = Pick<Storage, 'getItem' | 'setItem'>;
export function announceTimers(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: TIMERS.key}));
  window.dispatchEvent(new Event('zigoals:notify-change'));
}
export function writeTimers(change: (r: Timers) => Timers, storage: Storage_ = getAppStorage()): Timers {
  const read = readDeviceRecord(storage, TIMERS);
  if (read.unreadable) throw new Error('Your timers could not be read on this device, so nothing was written over them.');
  const next = updateDeviceRecord(storage, TIMERS, change);
  announceTimers();
  return next;
}
const newId = () => `tm-${(globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`).replace(/[^A-Za-z0-9_-]/g, '')}`;
export function startNamedTimer(name: string, seconds: number, {now = Date.now(), storage}: {now?: number; storage?: Storage_} = {}): Timer {
  let started: Timer | null = null;
  writeTimers(r => { const out = startTimer(r, {name, seconds: Math.round(seconds)}, now, newId()); started = out.timer; return out.timers; }, storage);
  return started!;
}
/** Opens the Timers sheet on whatever page is open (components/timers/timer-gate.tsx listens). */
export {openTimersEvent as openTimers} from './open';
