'use client';
import {Suspense, lazy, useEffect, useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {registerNavExtra} from '../nav-extras';
import {isNovaShortcut} from '../../lib/nova/command-key';
import {LoadBoundary} from '../load-boundary';

const NovaCommandBar = lazy(() => import('./command-bar'));

/**
 * NOVA's ways in from every page (owner follow-up 2, N2 and N8), mounted once by the shell; tiny on purpose:
 * - the navigation entry "NOVA" (the sidebar, the tablet rail, the phone's More sheet and the search palette list it
 *   before Settings, through components/nav-extras.ts — a fixed entry like Settings and Help, so the synced page switches,
 *   whose strict schema older builds read, are unchanged);
 * - ⌘/Ctrl + J opens NOVA's command bar (its code loads on the first press), except on NOVA itself, which has its own
 *   command field.
 * - "Open ZIGoals on NOVA" (Make it yours; NOVA's own record): the session's first page, when it is Today, becomes NOVA.
 */
export function NovaEntry() {
  const pathname = usePathname(), onNova = pathname?.startsWith('/app/nova') ?? false;
  const [open, setOpen] = useState(false), [wanted, setWanted] = useState(false);
  const router = useRouter();
  useEffect(() => registerNavExtra(['/app/nova', 'NOVA', 'star']), []);
  // "Open ZIGoals on NOVA": once per browser session, when the app opens on Today (the start URL), go to NOVA instead.
  useEffect(() => {
    let first = false;
    try { first = !sessionStorage.getItem('zigoals:nova-started'); sessionStorage.setItem('zigoals:nova-started', '1'); } catch { return; /* storage unavailable: Today it is */ }
    if (!first || pathname !== '/app' || window.location.search) return;
    // The record is read only here, loaded on use, so the shell carries nothing of NOVA's store.
    void Promise.all([import('../../lib/device-record'), import('../../lib/nova/store'), import('../../lib/showcase-storage')]).then(([dr, nova, st]) => {
      if (nova.startsOnNova(dr.readDeviceRecord(st.getAppStorage(), nova.NOVA_STORE).data)) router.replace('/app/nova');
    }).catch(() => { /* Today it is */ });
  // Only the first page of the session matters.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (onNova) return;
    const onKey = (event: KeyboardEvent) => { if (!isNovaShortcut(event)) return; event.preventDefault(); setWanted(true); setOpen(true); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNova]);
  if (!wanted || onNova) return null;
  return <LoadBoundary quiet><Suspense fallback={null}><NovaCommandBar open={open} onClose={() => setOpen(false)}/></Suspense></LoadBoundary>;
}
export default NovaEntry;
