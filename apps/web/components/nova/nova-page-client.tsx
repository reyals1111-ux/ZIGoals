'use client';
import {Suspense, lazy, useEffect, useState} from 'react';
import {LoadBoundary} from '../load-boundary';
import './nova-chrome.css';

/**
 * Session AK (owner follow-up 2 N2, follow-up 3 N12; lane NA): /app/nova's client part. While NOVA is open, `<html>`
 * carries `data-nova-view="on"`: nova-chrome.css hides the app's own sidebar, top bar, status row and footer (and the
 * page no longer scrolls behind NOVA), and they come back the moment NOVA closes (the attribute leaves with this
 * component). The dashboard is its own chunk, mounted after hydration (it reads only this device's records), so the
 * route's own script stays small and the server never renders a guess of anyone's day.
 */
export const NOVA_VIEW_ATTRIBUTE = 'novaView';
const NovaDashboard = lazy(() => import('./nova-dashboard'));
export function NovaPageClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset[NOVA_VIEW_ATTRIBUTE] = 'on';
    setMounted(true);
    return () => { delete root.dataset[NOVA_VIEW_ATTRIBUTE]; };
  }, []);
  return <section className="nova-root" data-entrance="nova" aria-labelledby="nova-page-title">
    <h1 id="nova-page-title" className="sr-only">NOVA</h1>
    {mounted ? <LoadBoundary label="NOVA"><Suspense fallback={<NovaWaiting/>}><NovaDashboard/></Suspense></LoadBoundary> : <NovaWaiting/>}
  </section>;
}
function NovaWaiting() {
  return <div className="nova-frame nova-waiting" data-accent="violet"><span className="nova-waiting-star" aria-hidden="true"/><p className="nova-reading" role="status">NOVA is starting…</p></div>;
}
