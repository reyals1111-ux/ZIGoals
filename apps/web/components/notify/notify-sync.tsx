'use client';
import {useEffect, useState} from 'react';
import {catchInstallPrompt} from '../../lib/install/prompt-store';
import './notify-sync.css';
import {getAppStorage, isShowcase} from '../../lib/showcase-storage';
import {readDeviceRecord} from '../../lib/device-record';
import {NOTIFY_PREFS} from '../../lib/notify/prefs';
import {readPushRecord} from '../../lib/push/client';
import {showToast} from '../ui/undo-toast';

const REMINDERS_CHANGE = 'zigoals:reminders-change', PRIVATE_CHANGE = 'zigoals:private-change';
export const NOTIFY_CHANGE = 'zigoals:notify-change';
let headroomShown = false;
const hereOn = () => { try { return !isShowcase() && readDeviceRecord(getAppStorage(), NOTIFY_PREFS).data.here === true; } catch { return false; } };
const accountPushOn = () => { try { return readPushRecord(getAppStorage()).data !== null; } catch { return false; } };
/** ADR-010's account worker is registered (or on its way): never replaced by this build's worker (Q15, Q19). */
const accountWorker = async () => { try { const reg = await navigator.serviceWorker?.getRegistration('/'); return [reg?.active, reg?.waiting, reg?.installing].some(w => w && new URL(w.scriptURL).pathname === '/push-sw.js'); } catch { return false; } };
/**
 * Session AK Parts 2–3 (ADR-036 Q3, Q4, A1): renders nothing.
 * - Registers this build's service worker once the page is idle (offline use for everyone), unless the device runs
 *   ADR-010's account reminders, whose worker it leaves alone (one push path per device, Q15).
 * - On a device with notifications on: keeps the snapshot and the wake list current (on open, focus, leaving the page,
 *   record changes, every 10 minutes) and applies taps queued while ZIGoals was closed, each once, with an Undo toast.
 * The notification code loads only on such a device.
 * Session AK Part 3: it also keeps the browser's install offer for Settings and Help, and says when a new version of the
 * app is ready ("A new version is ready · Reload"): the new worker takes over only on that tap, so nothing is lost.
 */
export function NotifySync() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => catchInstallPrompt(window), []);
  useEffect(() => {
    let active = true, timer = 0;
    const idle = (fn: () => void) => { const w = window as Window & {requestIdleCallback?: (cb: () => void, o?: {timeout: number}) => number}; if (w.requestIdleCallback) w.requestIdleCallback(fn, {timeout: 4000}); else window.setTimeout(fn, 1500); };
    const watch = (reg: ServiceWorkerRegistration | null) => {
      if (!reg || !active) return;
      const offer = () => { if (active && reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting); };
      offer();
      reg.addEventListener('updatefound', () => { const next = reg.installing; next?.addEventListener('statechange', () => { if (next.state === 'installed') offer(); }); });
    };
    idle(() => { if (active && !accountPushOn()) void accountWorker().then(account => account || !active ? null : import('../../lib/sw/register').then(m => m.registerAppWorker())).then(reg => watch(reg ?? null)); });
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
    // Session AK Part 3: what the person asked for while offline is offered again, never run by itself.
    const onOnline = async () => {
      if (!active) return;
      try {
        const queue = await import('../../lib/offline-queue/queue');
        for (const job of await queue.readJobs()) {
          if (job.kind === 'food-lookup') showToast({message: `You’re back online. Look up barcode ${job.value} now?`, link: {href: `/app/health?barcode=${job.value}#foods`, label: 'Look it up'}});
          else window.dispatchEvent(new CustomEvent('zigoals:exchange-refresh', {detail: job.value}));
          await queue.removeJob(job.id);
        }
      } catch { /* no queue on this device */ }
    };
    window.addEventListener('online', onOnline);
    // Session AK (8.9): once a month, while there are records, a calm reminder to keep a copy (the person marks it).
    idle(() => { if (!active || isShowcase()) return; void Promise.all([import('../../lib/backup-reminder'), import('../../lib/device-record'), import('../../lib/local-date')]).then(([b, d, l]) => {
      const storage = getAppStorage(), today = l.localDate(), record = d.readDeviceRecord(storage, b.BACKUP_REMINDER).data;
      const hasRecords = Object.keys(window.localStorage).some(k => /zigoals:(habits|health|platform):v1$/.test(k));
      if (!b.backupDue(record, today, hasRecords)) return;
      try { d.updateDeviceRecord(storage, b.BACKUP_REMINDER, x => ({...x, askedOn: today})); } catch { return; }
      showToast({message: 'A month since your last copy, as far as ZIGoals knows. Export everything keeps your records safe outside this browser.', link: {href: '/app/settings/data#dh-copies', label: 'Keep a copy'}});
    }).catch(() => {}); });
    // Session AK (A6): once per visit, if a module is nearly full, say so calmly with what to do.
    idle(() => { if (!active || headroomShown) return; headroomShown = true; void import('../../lib/storage-headroom').then(m => { const line = m.headroomMessage(m.moduleUse(window.localStorage)); if (line && active) showToast({message: line, link: {href: '/app/settings/data', label: 'Your data'}}); }).catch(() => {}); });
    const every = window.setInterval(() => { void refresh(); }, 10 * 60_000);
    window.addEventListener(REMINDERS_CHANGE, later); window.addEventListener(PRIVATE_CHANGE, later); window.addEventListener(NOTIFY_CHANGE, later); window.addEventListener('storage', later); document.addEventListener('visibilitychange', onVisible);
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => { active = false; window.clearTimeout(timer); window.clearInterval(every); window.removeEventListener(REMINDERS_CHANGE, later); window.removeEventListener(PRIVATE_CHANGE, later); window.removeEventListener(NOTIFY_CHANGE, later); window.removeEventListener('storage', later); window.removeEventListener('online', onOnline); document.removeEventListener('visibilitychange', onVisible); navigator.serviceWorker?.removeEventListener('message', onMessage); };
  }, []);
  if (!waiting) return null;
  const reload = () => {
    navigator.serviceWorker?.addEventListener('controllerchange', () => window.location.reload(), {once: true});
    waiting.postMessage({type: 'zigoals:sw-reload'});
  };
  return <div className="sw-update" role="status"><span>A new version of ZIGoals is ready. Your records are saved on this device.</span><button type="button" className="primary" onClick={reload}>Reload</button><button type="button" className="quiet" onClick={() => setWaiting(null)}>Later</button></div>;
}
