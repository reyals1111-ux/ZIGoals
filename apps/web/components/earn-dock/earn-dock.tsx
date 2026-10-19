'use client';
import {usePathname} from 'next/navigation';
import {Suspense, lazy, useEffect, useRef, useState} from 'react';
import {EARN_PREFS, earnPrefsOf, setEarnPref} from '../../lib/earn/records';
import {useDeviceRecord} from '../ai/use-device-record';
import {LoadBoundary} from '../load-boundary';
import {usePhoneActive} from '../phone/use-phone-layout';
import {EarnDockMark} from './earn-dock-mark';
import './earn-dock.css';

const EarnDockFan = lazy(() => import('./earn-dock-fan'));
/**
 * Session AF chunk 2 (Part 5: P5.1–P5.5; ADR-028 H12, H65, H68): the Earn dock, an optional launcher on top of the
 * right-edge stack (Earn dock → Music → Checklist → ZIGi), in the nebula style of its neighbours: the same circle, rim and
 * glow, following ZIGi's size, through the stack's `--launcher-slot-earn` (music-launcher.css). Pressing it fans out round
 * buttons for the live ecosystem apps (their own chunk, loaded on the first press), each opening that app's section of
 * the Earn page; the fan moves once per opening and stands still under reduced motion and Motion Off. The arrow under it
 * tucks it into the screen's edge; the edge tab brings it back. Off in Settings on this device (`zigoals:earn-prefs:v1`
 * dockShown, dockFolded). Phones get no floating button (H68): the Earn page's app strip and a row in More instead.
 */
export function EarnDock() {
  const pathname = usePathname() ?? '', phone = usePhoneActive(), prefs = useDeviceRecord(EARN_PREFS);
  const [mounted, setMounted] = useState(false), [open, setOpen] = useState(false), [loaded, setLoaded] = useState(false);
  const root = useRef<HTMLDivElement>(null), button = useRef<HTMLButtonElement>(null);
  useEffect(() => { queueMicrotask(() => setMounted(true)); }, []);
  const p = earnPrefsOf(prefs.data), shown = mounted && prefs.loaded && !prefs.unreadable && p.dockShown && !phone && pathname.startsWith('/app');
  // Escape closes the fan and gives focus back; a press outside closes it too.
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    const away = (e: PointerEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', key); document.addEventListener('pointerdown', away);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', away); };
  }, [open]);
  useEffect(() => { setOpen(false); }, [pathname]);
  const fold = (folded: boolean) => { try { prefs.update(r => setEarnPref(r, {dockFolded: folded})); setOpen(false); } catch { /* storage refused: stays as it is */ } };
  if (!shown) return null;
  if (p.dockFolded) return <button type="button" className="earn-dock-edge" aria-label="Show the Earn dock" onClick={() => fold(false)}><EarnDockMark size={24}/></button>;
  return <div className="earn-dock-stack" ref={root} data-open={open || undefined}>
    {open && loaded && <LoadBoundary quiet><Suspense fallback={null}><EarnDockFan onPick={() => setOpen(false)}/></Suspense></LoadBoundary>}
    <button type="button" ref={button} className="earn-dock-button" aria-expanded={open} aria-controls="earn-dock-fan" aria-label={open ? 'Close the Earn dock' : 'Open the Earn dock: ways to earn'}
      onClick={() => { setLoaded(true); setOpen(o => !o); }}><EarnDockMark/></button>
    <button type="button" className="earn-dock-fold" aria-label="Tuck the Earn dock away" data-tip="Tuck away" onClick={() => fold(true)}>
      <svg viewBox="0 0 12 22" width="12" height="22" aria-hidden="true" focusable="false"><defs><linearGradient id="earn-dock-fold-nebula" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ffd27a"/><stop offset=".5" stopColor="#826cff"/><stop offset="1" stopColor="#c664ff"/></linearGradient></defs><path d="M3 3l6 8-6 8" fill="none" stroke="url(#earn-dock-fold-nebula)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
  </div>;
}
export default EarnDock;
