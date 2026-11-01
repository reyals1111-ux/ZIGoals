import {readDeviceRecord} from '../device-record';
import {getAppStorage} from '../showcase-storage';
import {audioContext, strike, type AudioLike} from '../meditation/bells';
import {ambientState} from '../audio/ambient-state';
import {pomodoroSnapshot, subscribePomodoro} from '../focus-sessions/pomodoro-run';
import {bellStep, type RunShape, type Scheduled} from './plan';
import {BREAK_SHARE, FOCUS_ROUNDS, bellOf, quietBreaksOf, volumeOf, type FocusRounds} from './store';

/**
 * Session AK (BUILD list 2 #15): the page's one listener on the Pomodoro run (lib/focus-sessions/pomodoro-run.ts) that
 * rings the bell at each change and fades the focus sound during breaks, following `bellStep`. Started once by the
 * Focus intervals settings (loaded with the Pomodoro panel); it then lives as long as the page, like the run itself.
 * The bells are made on the device (lib/meditation/bells.ts), scheduled on the audio clock; nothing is fetched.
 */
type Deps = {audio: () => AudioLike | null; now: () => number; prefs: () => FocusRounds; duck: (share: number) => void};
const realDeps: Deps = {
  audio: () => audioContext(), now: () => Date.now(),
  prefs: () => { try { return readDeviceRecord(getAppStorage(), FOCUS_ROUNDS).data; } catch { return {version: 1}; } },
  duck: share => { if (ambientState().playing) void import('../audio/ambient').then(a => a.duckAmbient(share)).catch(() => undefined); },
};
let deps = realDeps, started = false, lastKey: string | null | undefined, scheduled: Scheduled = null, pending: {at: number; stop: () => void}[] = [], unsubscribe: (() => void) | null = null;

function react(): void {
  const run = pomodoroSnapshot().run, live: RunShape | null = run && !run.done ? run : null;
  const key = live ? `${live.id}:${live.index}:${live.phaseStartedAt}` : null;
  if (key === lastKey) return;
  lastKey = key;
  const now = deps.now(), prefs = deps.prefs(), step = bellStep(scheduled, live, now);
  if (step.cancel) { for (const p of pending) if (p.at > now + 1500) p.stop(); }
  pending = step.cancel ? [] : pending.filter(p => p.at > now - 60_000);
  const sound = bellOf(prefs), volume = volumeOf(prefs);
  if (sound !== 'silent' && volume > 0 && (step.ringNow || step.schedule.length)) {
    const ctx = deps.audio();
    if (ctx) {
      try { if (ctx.state === 'suspended') void ctx.resume?.()?.catch(() => undefined); } catch { /* a bell is a nicety */ }
      if (step.ringNow) strike(ctx, sound, volume);
      for (const at of step.schedule) { const s = strike(ctx, sound, volume, ctx.currentTime + Math.max(0, at - now) / 1000); if (s) pending.push({at, stop: s.stop}); }
    }
  }
  scheduled = step.scheduled;
  if (step.quiet === true && quietBreaksOf(prefs)) deps.duck(BREAK_SHARE);
  else if (step.quiet === false) deps.duck(1);
}
/** Starts listening (once per page). Safe to call from every mount. */
export function startRoundsConductor(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  unsubscribe = subscribePomodoro(react);
  react();
}
/** Tests only: replaces the clock, audio and preferences, and forgets the plan. */
export function setRoundsDepsForTests(over: Partial<Deps> | null): void {
  unsubscribe?.(); unsubscribe = null; started = false; lastKey = undefined; scheduled = null; pending = [];
  deps = over ? {...realDeps, ...over} : realDeps;
}
/** Tests only: starts listening without a window. */
export function startRoundsConductorForTests(): void { started = true; unsubscribe = subscribePomodoro(react); react(); }
