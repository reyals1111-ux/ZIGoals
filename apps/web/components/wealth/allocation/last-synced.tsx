'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {canRefreshNow, lastSyncedText, nextRefresh} from '../../../lib/allocation/exchange-refresh';

/**
 * Session AK (7.2): "Last synced 4 min ago · Refresh now" for a connected exchange, and its automatic read while the
 * app is open, visible and online (lib/allocation/exchange-refresh.ts: every 15 minutes, never within 60 seconds of
 * the last try, backing off after failures, nothing in the background). Reading stays read-only through the existing
 * relay; this only decides when. Off in the Showcase (the panel does not render it there).
 */
const isVisible = () => typeof document === 'undefined' || document.visibilityState === 'visible';
const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;
export function useExchangeAutoRefresh({lastReadAt, read, enabled = true}: {lastReadAt?: string; read: () => Promise<unknown>; enabled?: boolean}) {
  const [busy, setBusy] = useState(false), [now, setNow] = useState(() => Date.now()), [lastTry, setLastTry] = useState<number | null>(null), failures = useRef(0), reading = useRef(false);
  const run = useCallback(async () => {
    if (reading.current) return;
    reading.current = true; setBusy(true); setLastTry(Date.now());
    try { await read(); failures.current = 0; } catch { failures.current++; } finally { reading.current = false; setBusy(false); setNow(Date.now()); }
  }, [read]);
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const plan = () => {
      if (timer) clearTimeout(timer);
      const t = Date.now(), last = Math.max(lastReadAt ? Date.parse(lastReadAt) || 0 : 0, lastTry ?? 0) || null;
      const next = nextRefresh(last, t, isVisible(), isOnline(), failures.current);
      if (next.at === null) return;
      // The read sets lastTry, which runs this effect again and plans the next one.
      timer = setTimeout(() => { void run(); }, Math.max(0, next.at - t));
    };
    plan();
    const tick = setInterval(() => setNow(Date.now()), 10_000);
    document.addEventListener('visibilitychange', plan); window.addEventListener('online', plan); window.addEventListener('offline', plan);
    return () => { if (timer) clearTimeout(timer); clearInterval(tick); document.removeEventListener('visibilitychange', plan); window.removeEventListener('online', plan); window.removeEventListener('offline', plan); };
  }, [enabled, lastReadAt, lastTry, run]);
  const manual = canRefreshNow(lastTry, now);
  return {busy, now, refreshNow: run, canRefresh: manual.ok && !busy, waitSeconds: manual.inSeconds};
}
export function LastSyncedLine({lastReadAt, now, busy, canRefresh, waitSeconds, onRefresh, label}: {lastReadAt?: string; now: number; busy: boolean; canRefresh: boolean; waitSeconds: number; onRefresh: () => void; label: string}) {
  return <p className="last-synced fine">
    <span aria-live="polite">{busy ? 'Syncing…' : lastSyncedText(lastReadAt ?? null, now)}</span>
    {' · '}
    <button type="button" className="text-link last-synced-button" disabled={!canRefresh} onClick={onRefresh} aria-label={`Refresh ${label} now`}>{waitSeconds > 0 && !busy ? `Refresh in ${waitSeconds} s` : 'Refresh now'}</button>
  </p>;
}
/** The line and the automatic read for one exchange, for components/exchanges/exchanges-panel.tsx. */
export function ExchangeAutoRefresh({label, lastReadAt, read, enabled = true}: {label: string; lastReadAt?: string; read: () => Promise<unknown>; enabled?: boolean}) {
  const state = useExchangeAutoRefresh({lastReadAt, read, enabled});
  return <LastSyncedLine lastReadAt={lastReadAt} now={state.now} busy={state.busy} canRefresh={state.canRefresh} waitSeconds={state.waitSeconds} label={label} onRefresh={() => void state.refreshNow()}/>;
}
