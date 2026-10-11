'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {ACCOUNT_CHANGE, getAccountScope} from '../../lib/account-session';
import {getAppStorage, isShowcase} from '../../lib/showcase-storage';
import {localDate} from '../../lib/local-date';
import {pushAvailability, readPushRecord, writePushRecord, type PushRecord} from '../../lib/push/client';
import {PUSH_CHANGE, syncPushSchedules, turnOffPush, turnOnPush} from '../../lib/push/device';
import {DEFAULT_QUIET, type QuietHours} from '../../lib/push/schedule';
import {pushSupport, type PushSupport} from '../../lib/push/support';

export type Availability = 'unknown' | 'available' | 'unavailable';
export type PushMessage = {text: string; failed?: boolean} | null;
let availabilityCache: Promise<{available: boolean; publicKey: string | null}> | null = null;
/** One GET per page load: whether this build has push configured (503 while the flag is off). */
export function pushBuildAvailability() { availabilityCache ??= pushAvailability().then(a => a.available ? {available: true, publicKey: a.publicKey} : {available: false, publicKey: null}).catch(() => { availabilityCache = null; return {available: false, publicKey: null}; }); return availabilityCache; }
/**
 * Settings → "Reminders when closed" (ADR-010). Read after mount, nothing written on view: only Turn on, Turn off and
 * the quiet hours write. Showcase never offers it.
 */
export function usePush() {
  const [support, setSupport] = useState<PushSupport>('unsupported');
  const [availability, setAvailability] = useState<Availability>('unknown');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [record, setRecord] = useState<{data: PushRecord | null; unreadable: boolean; locked: boolean; loaded: boolean}>({data: null, unreadable: false, locked: false, loaded: false});
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [account, setAccount] = useState<string | null>(null);
  const [showcase, setShowcase] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<PushMessage>(null);
  const alive = useRef(true);
  const refresh = useCallback(() => {
    setAccount(getAccountScope());
    try { setRecord({...readPushRecord(getAppStorage()), locked: false, loaded: true}); } catch { setRecord({data: null, unreadable: false, locked: true, loaded: true}); }
    setPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  }, []);
  useEffect(() => {
    alive.current = true;
    queueMicrotask(() => { if (!alive.current) return; setSupport(pushSupport()); setShowcase(isShowcase()); refresh(); });
    if (!isShowcase()) void pushBuildAvailability().then(a => { if (!alive.current) return; setAvailability(a.available ? 'available' : 'unavailable'); setPublicKey(a.publicKey); });
    else setAvailability('unavailable');
    window.addEventListener(ACCOUNT_CHANGE, refresh); window.addEventListener(PUSH_CHANGE, refresh);
    return () => { alive.current = false; window.removeEventListener(ACCOUNT_CHANGE, refresh); window.removeEventListener(PUSH_CHANGE, refresh); };
  }, [refresh]);
  const announce = useCallback(() => { window.dispatchEvent(new Event(PUSH_CHANGE)); refresh(); }, [refresh]);
  const turnOn = useCallback(async () => {
    const scope = getAccountScope();
    if (!publicKey) { setMessage({text: 'Reminders while ZIGoals is closed are not available in this build.', failed: true}); return; }
    if (!scope) { setMessage({text: 'Sign in to your account first; reminders while ZIGoals is closed need a signed-in account.', failed: true}); return; }
    setBusy(true); setMessage(null);
    try {
      const outcome = await turnOnPush({account: scope, publicKey, quiet: record.data?.quiet ?? DEFAULT_QUIET});
      setMessage(outcome.ok ? {text: `Reminders while ZIGoals is closed are on for this device.${outcome.note ? ' ' + outcome.note : ''}`} : {text: outcome.message, failed: true});
    } finally { setBusy(false); announce(); }
  }, [publicKey, record.data?.quiet, announce]);
  const turnOff = useCallback(async () => {
    setBusy(true); setMessage(null);
    try {
      const {confirmed} = await turnOffPush({account: getAccountScope()});
      setMessage({text: confirmed ? 'Turned off. Nothing about this device is kept on the server.' : 'Turned off on this device. The server could not confirm the deletion; it forgets this device by itself after 30 days.', failed: !confirmed});
    } catch { setMessage({text: 'This device could not forget the setting. Try again, or clear this site\'s data.', failed: true}); }
    finally { setBusy(false); announce(); }
  }, [announce]);
  const setQuiet = useCallback(async (quiet: QuietHours) => {
    const current = record.data; if (!current) return;
    setBusy(true); setMessage(null);
    try {
      writePushRecord(getAppStorage(), {...current, quiet, lastSyncDay: current.lastSyncDay === localDate() ? '2000-01-01' : current.lastSyncDay});
      const outcome = await syncPushSchedules({account: getAccountScope(), force: true});
      setMessage(outcome.state === 'synced' || outcome.state === 'resubscribed' ? {text: `Quiet hours ${quiet.from}–${quiet.to} saved.${outcome.message ? ' ' + outcome.message : ''}`} : {text: outcome.message ?? 'Quiet hours were saved on this device; the server will get them at the next refresh.', failed: outcome.state !== 'kept'});
    } catch { setMessage({text: 'Quiet hours could not be saved on this device.', failed: true}); }
    finally { setBusy(false); announce(); }
  }, [record.data, announce]);
  return {support, availability, publicKey, record, permission, account, showcase, busy, message, turnOn, turnOff, setQuiet};
}
