'use client';
import {useEffect} from 'react';
import {getAppStorage, isShowcase} from '../../lib/showcase-storage';
import {readDeviceRecord} from '../../lib/device-record';
import {NOTIFY_PREFS} from '../../lib/notify/prefs';
import {readPushRecord} from '../../lib/push/client';
import {showToast} from '../ui/undo-toast';

const REMINDERS_CHANGE = 'zigoals:reminders-change', PRIVATE_CHANGE = 'zigoals:private-change';
export const NOTIFY_CHANGE = 'zigoals:notify-change';
const hereOn = () => { try { return !isShowcase() && readDeviceRecord(getAppStorage(), NOTIFY_PREFS).data.here === true; } catch { return false; } };
const accountPushOn = () => { try { return readPushRecord(getAppStorage()).data !== null; } catch { return false; } };
/**
 * Session AK Parts 2–3 (ADR-036 Q3, Q4, A1): renders nothing.
 * - Registers this build's service worker once the page is idle (offline use for everyone), unless the device runs
 *   ADR-010's account reminders, whose worker it leaves alone (one push path per device, Q15).
 * - On a device with notifications on: keeps the snapshot and the wake list current (on open, focus, leaving the page,
 *   record changes, every 10 minutes) and applies taps queued while ZIGoals was closed, each once, with an Undo toast.
 * The notification code loads only on such a device.
 */
export function NotifySync() {
  useEffect(() => {
    let active = true, timer = 0;
    const idle = (fn: () => void) => { const w = window as Window & {requestIdleCallback?: (cb: () => void, o?: {timeout: number}) => number}; if (w.requestIdleCallback) w.requestIdleCallback(fn, {timeout: 4000}); else window.setTimeout(fn, 1500); };
    idle(() => { if (active && !accountPushOn()) void import('../../lib/sw/register').then(m => m.registerAppWorker()); });
    const apply = async () => {
      if (!active || !hereOn()) return;
      const [{applyQueuedActions}, {localDate}] = await Promise.all([import('../../lib/notify/actions'), import('../../lib/local-date')]);
      for (const done of await applyQueuedActions(localDate())) showToast({message: done.message, ...(done.undo ? {undo: done.undo, undone: 'Undone. The habit is back to how it was.'} : {})});
    };
    const refresh = async () => { if (!active || !hereOn()) return; try { await (await import('../../lib/notify/device')).refreshNotifications(); } catch { /* the next moment tries again */ } };
    const later = () => { window.clearTimeout(timer); timer = window.setTimeout(() => { void refresh(); }, 1500); };
    const onVisible = () => { if (document.visibilityState === 'hidden') void refresh(); else { void apply().then(refresh); } };
    const onMessage = (event: MessageEvent) => { const type = (event.data as {type?: unknown} | null)?.type; if (type === 'zigoals:notify-action') void apply().then(refresh); };
    idle(() => { void apply().then(refresh); });
    const every = window.setInterval(() => { void refresh(); }, 10 * 60_000);
    window.addEventListener(REMINDERS_CHANGE, later); window.addEventListener(PRIVATE_CHANGE, later); window.addEventListener(NOTIFY_CHANGE, later); window.addEventListener('storage', later); document.addEventListener('visibilitychange', onVisible);
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => { active = false; window.clearTimeout(timer); window.clearInterval(every); window.removeEventListener(REMINDERS_CHANGE, later); window.removeEventListener(PRIVATE_CHANGE, later); window.removeEventListener(NOTIFY_CHANGE, later); window.removeEventListener('storage', later); document.removeEventListener('visibilitychange', onVisible); navigator.serviceWorker?.removeEventListener('message', onMessage); };
  }, []);
  return null;
}
