'use client';
import {useEffect} from 'react';
import {ACCOUNT_CHANGE, getAccountScope} from '../../lib/account-session';
import {HABITS_KEY} from '../../lib/habits';
import {REMINDERS_KEY} from '../../lib/reminders/schema';
import {PUSH_KEY} from '../../lib/push/client';
import {syncPushSchedules} from '../../lib/push/device';
import {isShowcase} from '../../lib/showcase-storage';

const REMINDERS_CHANGE = 'zigoals:reminders-change';
/**
 * Keeps the push Worker's schedule set in step with this device (ADR-010): once a day after the app opens, and after
 * a reminder time or habit changes. It does nothing on a device without a push record, so most devices never make a
 * request here; it renders nothing and never shows a message.
 */
export function PushSync() {
  useEffect(() => {
    let active = true, timer = 0, running = false, again = false;
    const run = async (force: boolean) => {
      if (!active || isShowcase()) return;
      if (running) { again = again || force; return; }
      running = true;
      try { await syncPushSchedules({account: getAccountScope(), force}); } catch { /* the next open tries again */ }
      finally { running = false; if (active && again) { again = false; void run(true); } }
    };
    const later = (force: boolean) => { window.clearTimeout(timer); timer = window.setTimeout(() => { void run(force); }, 800); };
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(REMINDERS_KEY) || event.key.endsWith(HABITS_KEY) || event.key.endsWith(PUSH_KEY)) later(true); };
    const onChange = () => later(true), onAccount = () => later(false);
    queueMicrotask(() => { void run(false); });
    window.addEventListener(REMINDERS_CHANGE, onChange); window.addEventListener('storage', onStorage); window.addEventListener(ACCOUNT_CHANGE, onAccount);
    return () => { active = false; window.clearTimeout(timer); window.removeEventListener(REMINDERS_CHANGE, onChange); window.removeEventListener('storage', onStorage); window.removeEventListener(ACCOUNT_CHANGE, onAccount); };
  }, []);
  return null;
}
