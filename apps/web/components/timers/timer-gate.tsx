'use client';
import {usePathname} from 'next/navigation';
import {Suspense, lazy, useEffect, useState} from 'react';
import {getAppStorage} from '../../lib/showcase-storage';
import {TIMERS_KEY_LITERAL, TIMERS_OPEN, mayShowStrip} from '../../lib/timers/open';
const TimerStrip = lazy(() => import('./timer-strip'));
const TimersSheet = lazy(() => import('./timers-sheet'));

/**
 * Session AW (X1, LEDGER #440): mounted once by the shell. It renders nothing — and loads nothing more — until a timer
 * runs, is paused or has ended (then the small strip shows on every page), or until something asks for the Timers sheet
 * (Tasks → More views → Timers, the command menu's "Timers", or `?timers=1` on any page). No first-screen card.
 */
export default function TimerGate() {
  const [strip, setStrip] = useState(false), [open, setOpen] = useState(false), path = usePathname();
  useEffect(() => {
    const check = () => { let raw: string | null = null; try { raw = getAppStorage().getItem(TIMERS_KEY_LITERAL); } catch { raw = null; } setStrip(mayShowStrip(raw)); };
    const onStore = (e: Event) => { const key = (e as CustomEvent<unknown>).detail; if (!key || key === TIMERS_KEY_LITERAL) check(); };
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key.endsWith(TIMERS_KEY_LITERAL)) check(); };
    const onOpen = () => setOpen(true);
    check();
    window.addEventListener('zigoals:zigi-store', onStore); window.addEventListener('storage', onStorage); window.addEventListener(TIMERS_OPEN, onOpen);
    return () => { window.removeEventListener('zigoals:zigi-store', onStore); window.removeEventListener('storage', onStorage); window.removeEventListener(TIMERS_OPEN, onOpen); };
  }, []);
  // `?timers=1` (the command menu's row, a notification at a timer's end) opens the sheet once; the address loses it.
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('timers') !== '1') return;
      url.searchParams.delete('timers'); window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
      setOpen(true);
    } catch { /* no address */ }
  }, [path]);
  return <>
    {strip && <Suspense fallback={null}><TimerStrip /></Suspense>}
    {open && <Suspense fallback={null}><TimersSheet onClose={() => setOpen(false)} /></Suspense>}
  </>;
}
