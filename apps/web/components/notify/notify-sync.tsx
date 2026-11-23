'use client';
import {useEffect, useState} from 'react';
import {catchInstallPrompt} from '../../lib/install/prompt-store';
import './notify-sync.css';
import {getAppStorage, isShowcase} from '../../lib/showcase-storage';
import {readDeviceRecord} from '../../lib/device-record';
import {NOTIFY_PREFS} from '../../lib/notify/prefs';
import {readPushRecord} from '../../lib/push/client';
import {showToast} from '../ui/undo-toast';
import {RELOAD_MARK, UPDATE_WAITING} from '../../lib/sw/stale-code';
import {swVersion} from '../../lib/sw/register';

const REMINDERS_CHANGE = 'zigoals:reminders-change', PRIVATE_CHANGE = 'zigoals:private-change';
/** The device lock's event (components/device-lock.tsx LOCK_EVENT): locking hides names from notifications at once (F5). */
const LOCK_EVENT = 'zigoals-device-lock';
export const NOTIFY_CHANGE = 'zigoals:notify-change';
let headroomShown = false, lastBuildCheck = 0, scheduleChecked = false;
/** Session AV Part 2 (D-PWA): an open tab asks its own server which version it serves, at most every ten minutes. */
const BUILD_CHECK_MS = 10 * 60_000;
/** Session AV (PK-3): how long after the worker is known the page asks it to keep the later parts (the page settles first). */
const WARM_AFTER_MS = 6000;
const OWN_COMMIT = (process.env.NEXT_PUBLIC_APP_COMMIT ?? '').toLowerCase();
/** Session AV Part 3 (D-KEEP): device records that are the person's own entries (a save of one is "new data"), not a fold or a setting. */
const PERSONAL_SAVE = /^zigoals:(money-log|tasks|notes|journal|meal-words|mood-tags|workouts|checklist-days|checklist):v1$/;
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
  // Session AV Part 2 ([TIER 3] (PWA), ADR-045 D-PWA): the same note when a newer version is known without a waiting worker
  // (this tab's server answers another build, or code of this version could not be loaded while the person was busy).
  const [newer, setNewer] = useState(false);
  useEffect(() => {
    // After the one automatic reload into a newer version: say so, once (lib/sw/update-recovery.ts).
    // The recovery's own code loads only when this tab reloaded itself (its mark is there) or asks its server (below).
    let marked = false; try { marked = window.sessionStorage.getItem(RELOAD_MARK) !== null; } catch { marked = false; }
    if (marked) void import('../../lib/sw/update-recovery').then(m => { if (m.takeUpdatedNotice(window.sessionStorage, OWN_COMMIT)) showToast({message: 'Updated to the newest version.'}); }).catch(() => {});
    const waitingNote = () => setNewer(true);
    const check = async () => {
      if (document.visibilityState !== 'visible' || !/^[0-9a-f]{40}$/.test(OWN_COMMIT) || navigator.onLine === false) return;
      const now = Date.now(); if (now - lastBuildCheck < BUILD_CHECK_MS) return; lastBuildCheck = now;
      // A HEAD to this app's own page, never stored (the service worker passes anything but GET to the network).
      const served = await import('../../lib/sw/update-recovery').then(m => m.servedBuild()).catch(() => '');
      if (served && served !== OWN_COMMIT) setNewer(true);
    };
    window.addEventListener(UPDATE_WAITING, waitingNote); document.addEventListener('visibilitychange', check); window.addEventListener('focus', check); window.addEventListener('online', check);
    return () => { window.removeEventListener(UPDATE_WAITING, waitingNote); document.removeEventListener('visibilitychange', check); window.removeEventListener('focus', check); window.removeEventListener('online', check); };
  }, []);
  useEffect(() => catchInstallPrompt(window), []);
  useEffect(() => {
    let active = true, timer = 0, warmTimer = 0;
    const idle = (fn: () => void) => { const w = window as Window & {requestIdleCallback?: (cb: () => void, o?: {timeout: number}) => number}; if (w.requestIdleCallback) w.requestIdleCallback(fn, {timeout: 4000}); else window.setTimeout(fn, 1500); };
    const watch = (reg: ServiceWorkerRegistration | null) => {
      if (!reg || !active) return;
      // Only this app's next build is offered: ADR-010's account worker (/push-sw.js) installing on the same scope takes
      // over by itself (Q19) and never answers "Reload" (CI lane P).
      const offer = () => {
        if (!active || !reg.waiting || !navigator.serviceWorker.controller || new URL(reg.waiting.scriptURL).pathname !== '/sw.js') return;
        // Session AV Part 2 (D-PWA): this page already runs the waiting worker's version (it was loaded after the deploy):
        // there is nothing to reload for, so the worker takes over quietly instead of offering "A new version is ready".
        if (new URL(reg.waiting.scriptURL).searchParams.get('v') === swVersion()) { reg.waiting.postMessage({type: 'zigoals:sw-reload'}); return; }
        setWaiting(reg.waiting);
      };
      offer();
      reg.addEventListener('updatefound', () => { const next = reg.installing; next?.addEventListener('statechange', () => { if (next.state === 'installed') offer(); }); });
      // Session AV (PK-3, [TIER 3] (PWA)): once this version's worker runs and the page has settled, online, the worker is
      // asked to keep the parts the app's pages load after their first paint (public/sw.js warmLazy: once per version,
      // within a byte budget, never under Data Saver or on 2G), so a page never visited online still opens offline.
      warmTimer = window.setTimeout(() => idle(() => {
        if (!active || !navigator.onLine) return;
        void navigator.serviceWorker.ready.then(ready => {
          const worker = ready.active, at = worker ? new URL(worker.scriptURL) : null;
          if (active && worker && at?.pathname === '/sw.js' && at.searchParams.get('v') === swVersion()) worker.postMessage({type: 'zigoals:sw-warm'});
        }).catch(() => undefined);
      }), WARM_AFTER_MS);
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
    // Session AK Part 3 (security review F6): what the person asked for while offline is OFFERED again, never run by
    // itself: one toast per reconnect (a toast replaces the one before), and the job leaves only once it was offered. An
    // exchange is read only when "Read now" is tapped (lib/notify/offline-offer.ts).
    const onOnline = async () => {
      if (!active) return;
      try {
        const [queue, {offerFor}] = await Promise.all([import('../../lib/offline-queue/queue'), import('../../lib/notify/offline-offer')]);
        for (const job of await queue.readJobs()) {
          const offer = offerFor(job);
          if (offer && active) showToast(offer);
          await queue.removeJob(job.id);
          if (offer) break;
        }
      } catch { /* no queue on this device */ }
    };
    // Security review F5: locking (or unlocking) rewrites the snapshot at once, so no name shows after the lock goes on.
    const onLock = () => { void refresh(); };
    window.addEventListener('online', onOnline);
    // Session AK (8.9): the backup reminder is shown on Settings → Your data (components/restore/backup-reminder.tsx), never
    // as a toast on another page, and nothing is written until the person acts.
    // Session AK (A6): once per visit, if a module is nearly full, say so calmly with what to do.
    idle(() => { if (!active || headroomShown) return; headroomShown = true; void import('../../lib/storage-headroom').then(m => { const line = m.headroomMessage(m.moduleUse(window.localStorage)); if (line && active) showToast({message: line, link: {href: '/app/settings/data', label: 'Your data'}}); }).catch(() => {}); });
    // Session AV lane 2 (N6 #193): once per visit, a scheduled copy that is due is written into the person's folder (or,
    // where the browser wants a tap or cannot write to a folder, a calm note links to Your data). Loaded only on a device
    // with a schedule; the file is made here and never leaves the device.
    idle(() => { if (!active || scheduleChecked) return; scheduleChecked = true; let raw: string | null = null; try { raw = isShowcase() ? null : getAppStorage().getItem('zigoals:backup-reminder:v1'); } catch { raw = null; } if (!raw || !raw.includes('"schedule"')) return;
      void import('../../lib/backup-folder/run').then(m => m.runScheduledBackup()).then(r => { if (!active) return; if (r.state === 'written') showToast({message: `A copy of everything was saved in your backup folder (${r.name}).`}); else if (r.state === 'ask' || r.state === 'remind' || r.state === 'failed') showToast({message: r.state === 'failed' ? 'Your scheduled copy could not be written.' : 'Your scheduled copy is due.', link: {href: '/app/settings/data#backup-schedule', label: r.state === 'remind' ? 'Make it' : 'Open Your data'}}); }).catch(() => {}); });
    // Session AV Part 3 (D-KEEP): after the person's first save in this tab, ask once to keep this site's data (only where the
    // browser never asks the person; lib/keep-data/persist-once.ts). Never on view.
    let keepAsked = false;
    const saved = (event: Event) => { const key = (event as CustomEvent<unknown>).detail; if (keepAsked || (event.type === 'zigoals:zigi-store' && !(typeof key === 'string' && PERSONAL_SAVE.test(key)))) return; keepAsked = true; void import('../../lib/keep-data/persist-once').then(m => m.keepDataOnce(window)).catch(() => {}); };
    window.addEventListener(PRIVATE_CHANGE, saved); window.addEventListener('zigoals:zigi-store', saved);
    const every = window.setInterval(() => { void refresh(); }, 10 * 60_000);
    window.addEventListener(REMINDERS_CHANGE, later); window.addEventListener(PRIVATE_CHANGE, later); window.addEventListener(NOTIFY_CHANGE, later); window.addEventListener(LOCK_EVENT, onLock); window.addEventListener('storage', later); document.addEventListener('visibilitychange', onVisible);
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => { active = false; window.removeEventListener(PRIVATE_CHANGE, saved); window.removeEventListener('zigoals:zigi-store', saved); window.clearTimeout(timer); window.clearTimeout(warmTimer); window.clearInterval(every); window.removeEventListener(REMINDERS_CHANGE, later); window.removeEventListener(PRIVATE_CHANGE, later); window.removeEventListener(NOTIFY_CHANGE, later); window.removeEventListener(LOCK_EVENT, onLock); window.removeEventListener('storage', later); window.removeEventListener('online', onOnline); document.removeEventListener('visibilitychange', onVisible); navigator.serviceWorker?.removeEventListener('message', onMessage); };
  }, []);
  if (!waiting && !newer) return null;
  const reload = () => {
    if (!waiting) { window.location.reload(); return; }
    // Session AV lane 2 ([TIER 3] (PWA), CI run 2016, j04-offline): the page reloads when the new worker takes over, or
    // after 3 s at the latest. Chromium sometimes held the waiting worker's takeover for 25 s and more after skipWaiting
    // (1 in 10 locally, the old worker still busy), and the tapped Reload did nothing; the load lets it take over.
    let gone = false;
    const go = () => { if (gone) return; gone = true; window.location.reload(); };
    navigator.serviceWorker?.addEventListener('controllerchange', go, {once: true});
    waiting.postMessage({type: 'zigoals:sw-reload'});
    window.setTimeout(go, 3000);
  };
  return <div className="sw-update" role="status"><span>A new version of ZIGoals is ready. Your records are saved on this device.</span><button type="button" className="primary" onClick={reload}>Reload</button><button type="button" className="quiet" onClick={() => { setWaiting(null); setNewer(false); }}>Later</button></div>;
}
