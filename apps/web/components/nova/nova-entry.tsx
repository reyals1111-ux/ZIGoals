'use client';
import {Suspense, lazy, useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {usePathname, useRouter} from 'next/navigation';
import {registerNavExtra} from '../nav-extras';
import {isNovaShortcut} from '../../lib/nova/command-key';
import {LoadBoundary} from '../load-boundary';

const NovaCommandBar = lazy(() => import('./command-bar'));
/** Set by the first page of this page load ("Open ZIGoals on NOVA" looks only at that one). */
let firstPageSeen = false;
/** Whether "Open ZIGoals on NOVA" moved this visit from Today to NOVA, until the person leaves NOVA (Exit then goes to Today). */
let startRedirect = false;
export const openedOnNova = () => startRedirect;

/**
 * NOVA's ways in from every page (owner follow-up 2, N2 and N8), mounted once by the shell; tiny on purpose:
 * - the navigation entry "NOVA" (the sidebar, the tablet rail, the phone's More sheet and the search palette list it
 *   before Settings, through components/nav-extras.ts — a fixed entry like Settings and Help, so the synced page switches,
 *   whose strict schema older builds read, are unchanged);
 * - ⌘/Ctrl + J opens NOVA's command bar (its code loads on the first press), except on NOVA itself, which has its own
 *   command field.
 * - "Open ZIGoals on NOVA" (Make it yours; NOVA's own record): a fresh visit that opens on Today opens on NOVA.
 */
export function NovaEntry() {
  const pathname = usePathname(), onNova = pathname?.startsWith('/app/nova') ?? false;
  const [open, setOpen] = useState(false), [wanted, setWanted] = useState(false);
  const router = useRouter();
  useEffect(() => registerNavExtra(['/app/nova', 'NOVA', 'star']), []);
  // Leaving NOVA ends the start redirect's say over Exit (a later visit to NOVA exits Back, as any other).
  useEffect(() => { if (!onNova) startRedirect = false; }, [onNova]);
  // "Open ZIGoals on NOVA": when the app is opened afresh on Today (the start URL), go to NOVA instead. Writes nothing:
  // the first page of this page load only (a module flag), and only a fresh visit — a reload or Back stays on Today.
  useEffect(() => {
    if (firstPageSeen) return;
    firstPageSeen = true;
    if (pathname !== '/app' || window.location.search) return;
    try { const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined; if (nav && nav.type !== 'navigate') return; } catch { return; }
    // The record is read only here, loaded on use, so the shell carries nothing of NOVA's store.
    void Promise.all([import('../../lib/device-record'), import('../../lib/nova/store'), import('../../lib/showcase-storage')]).then(([dr, nova, st]) => {
      // Security review Z1C-L1: only while the person is still on Today (a slow load must not pull them off a page they moved to).
      if (window.location.pathname === '/app' && !window.location.search && nova.startsOnNova(dr.readDeviceRecord(st.getAppStorage(), nova.NOVA_STORE).data)) { startRedirect = true; router.replace('/app/nova'); }
    }).catch(() => { /* Today it is */ });
  // Only the first page of the session matters.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (onNova) return;
    // Security review Z1C-L2: never over an open dialog (a review sheet waiting for the wallet keeps the screen).
    const onKey = (event: KeyboardEvent) => { if (!isNovaShortcut(event) || document.querySelector('dialog[open], [aria-modal="true"]')) return; event.preventDefault(); setWanted(true); setOpen(true); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNova]);
  if (!wanted || onNova) return null;
  // The bar renders in <body>, as Quick add's sheet does: the shell mounts this entry inside the sidebar, which phones and
  // narrow windows hide (display: none), and a dialog under a hidden ancestor opens with no box at all (lane NV). `wanted`
  // is set only by a key press, so this runs in the browser, after hydration.
  return createPortal(<LoadBoundary quiet><Suspense fallback={null}><NovaCommandBar open={open} onClose={() => setOpen(false)}/></Suspense></LoadBoundary>, document.body);
}
export default NovaEntry;
