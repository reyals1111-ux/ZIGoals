'use client';
import {lazy, Suspense, useEffect, useRef, useState, type RefObject} from 'react';

/**
 * Phase 2 (weights, never a raised budget; no-JavaScript honesty): the footer banner is a server component
 * (site-footer.tsx) — its markup arrives with the HTML and costs no script on any page. These are its few live parts:
 * Back to top and the opening moment's path (its own chunk, requested as the page hydrates, so no page sees a late
 * request). Session AC: the page ends after the link columns; the Alpha's facts and the storage line moved to Settings
 * (components/alpha/about-this-alpha.tsx), Help and the first-visit notice.
 */
export function FooterTop() {
  return <a className="site-footer-top" href="#main" aria-label="Back to top" onClick={event => { event.preventDefault(); window.scrollTo({top: 0, behavior: 'smooth'}); document.getElementById('main')?.focus({preventScroll: true}); }}><span className="site-footer-top-word">Back to top</span> <span aria-hidden="true">↑</span></a>;
}
const FooterPath = lazy(() => import('./footer-path'));
/** The constellation path and the opening moment: mounted inside the stage; finds its stage and footer from there. */
export function FooterMotion() {
  const marker = useRef<HTMLSpanElement>(null), stage = useRef<HTMLDivElement | null>(null), footer = useRef<HTMLElement | null>(null), [ready, setReady] = useState(false);
  useEffect(() => { const el = marker.current; stage.current = el?.closest<HTMLDivElement>('.site-footer-stage') ?? null; footer.current = el?.closest<HTMLElement>('.site-footer') ?? null; if (stage.current && footer.current) setReady(true); }, []);
  return <><span ref={marker} hidden/>{ready && <Suspense fallback={null}><FooterPath stage={stage as RefObject<HTMLDivElement | null>} footer={footer as RefObject<HTMLElement | null>}/></Suspense>}</>;
}
