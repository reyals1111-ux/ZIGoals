/**
 * Session AK M1/M2/M4: the motion layer's one small runtime, started by app/app/template.tsx after the page has mounted
 * (its own chunk, loaded on use, so no route carries it in its first scripts). It renders nothing; it
 *  - keeps view transitions available only in Full and Calm (lib/motion/view-transition-gate.ts),
 *  - marks <html data-zg-ambient="drift|still">: slow ambient drifts (aurora, mesh) run only in Full motion, on a device
 *    that is not low-end, not on a low battery, and while the tab is visible (lib/motion/ambient.ts),
 *  - marks <html data-zg-vt="on"> while page transitions can run (for the transition CSS and the specs),
 *  - plays the once-on-view moments in Full motion: chart lines draw, long pages' blocks rise (./on-view.ts).
 * The level itself (<html data-app-motion>) stays with MotionPreferenceSync.
 */
import {currentMotionLevel, MOTION_EVENT, MOTION_KEY} from '../../lib/motion/level';
import {ambientAllowed, deviceSignals, readBattery, type BatteryState} from '../../lib/motion/ambient';
import {gateViewTransitions} from '../../lib/motion/view-transition-gate';
import {watchOnView} from './on-view';

let battery: BatteryState | null = null, batteryAsked = false;

export function applyMotionRuntime() {
  const root = document.documentElement;
  const level = currentMotionLevel();
  const vt = gateViewTransitions(document, level);
  if (vt) root.dataset.zgVt = 'on'; else delete root.dataset.zgVt;
  root.dataset.zgAmbient = ambientAllowed({level, ...deviceSignals(), battery, hidden: document.visibilityState === 'hidden'}) ? 'drift' : 'still';
}

/** Starts the runtime; returns the function that stops it (the template calls it when the page leaves). */
export function startMotionRuntime(): () => void {
  const apply = applyMotionRuntime;
  apply();
  const stopOnView = watchOnView();
  const onStorage = (event: StorageEvent) => { if (!event.key || event.key === MOTION_KEY) apply(); };
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  window.addEventListener(MOTION_EVENT, apply);
  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', apply);
  reduced?.addEventListener?.('change', apply);
  if (!batteryAsked) {
    batteryAsked = true;
    void readBattery().then(state => { battery = state; apply(); });
  }
  return () => {
    stopOnView();
    window.removeEventListener(MOTION_EVENT, apply);
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', apply);
    reduced?.removeEventListener?.('change', apply);
  };
}
