'use client';
import {useEffect} from 'react';
import {ACCOUNT_CHANGE, getAccountScope} from '../../lib/account-session';
import {HABITS_KEY} from '../../lib/habits';
import {REMINDERS_KEY} from '../../lib/reminders/schema';
import {PUSH_KEY, readPushRecord} from '../../lib/push/client';
import {PUSH_CHANGE, syncPushSchedules} from '../../lib/push/device';
import {AI_OPTIONS_KEY, ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {getAppStorage, isShowcase} from '../../lib/showcase-storage';

const REMINDERS_CHANGE = 'zigoals:reminders-change';
/** Session V Part 13: the opted-in names table lives in its own chunk, loaded only on a device with push on, or when that choice, push or the account changes. */
const syncLabels = () => import('../../lib/push/labels-sync').then(m => m.syncPushLabels()).catch(() => undefined);
const pushOn = () => { try { return readPushRecord(getAppStorage()).data !== null; } catch { return false; } };
/**
 * Keeps the push Worker's schedule set in step with this device (ADR-010): once a day after the app opens, and after
 * a reminder time or habit changes. It does nothing on a device without a push record, so most devices never make a
 * request here; it renders nothing and never shows a message. Session V Part 13: on a device with push on it also keeps
 * the opted-in table of reminder names in step (written only while "Show what a reminder is for in notifications" is
 * on; deleted otherwise), on the same moments, whenever ZIGi's options change (that switch, or "Turn off ZIGi"), when
 * push goes on or off, and when the account changes or locks.
 */
export function PushSync() {
  useEffect(() => {
    let active = true, timer = 0, labelTimer = 0, running = false, again = false;
    const run = async (force: boolean) => {
      if (!active || isShowcase()) return;
      if (running) { again = again || force; return; }
      running = true;
      try {
        try { await syncPushSchedules({account: getAccountScope(), force}); } catch { /* the next open tries again */ }
        if (pushOn()) await syncLabels();
      } finally { running = false; if (active && again) { again = false; void run(true); } }
    };
    const later = (force: boolean) => { window.clearTimeout(timer); timer = window.setTimeout(() => { void run(force); }, 800); };
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(REMINDERS_KEY) || event.key.endsWith(HABITS_KEY) || event.key.endsWith(PUSH_KEY)) later(true); };
    // The names table follows the person's own switch and push going on or off at once; another account, a sign-out or
    // a lock once the account has settled (a locked account shows the generic line). The syncs take turns (labels-sync).
    const labels = () => { if (active && !isShowcase()) void syncLabels(); };
    const labelsLater = () => { window.clearTimeout(labelTimer); labelTimer = window.setTimeout(labels, 800); };
    const onChange = () => later(true), onAccount = () => { later(false); labelsLater(); };
    const onOptions = (event: Event) => { const key = (event as CustomEvent<string>).detail; if (!key || key === AI_OPTIONS_KEY) labels(); };
    queueMicrotask(() => { void run(false); });
    window.addEventListener(REMINDERS_CHANGE, onChange); window.addEventListener('storage', onStorage); window.addEventListener(ACCOUNT_CHANGE, onAccount); window.addEventListener(ZIGI_STORE_EVENT, onOptions); window.addEventListener(PUSH_CHANGE, labels);
    return () => { active = false; window.clearTimeout(timer); window.clearTimeout(labelTimer); window.removeEventListener(REMINDERS_CHANGE, onChange); window.removeEventListener('storage', onStorage); window.removeEventListener(ACCOUNT_CHANGE, onAccount); window.removeEventListener(ZIGI_STORE_EVENT, onOptions); window.removeEventListener(PUSH_CHANGE, labels); };
  }, []);
  return null;
}
