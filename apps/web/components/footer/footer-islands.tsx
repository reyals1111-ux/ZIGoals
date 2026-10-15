'use client';
import {createContext, lazy, Suspense, useContext, useEffect, useRef, useState, type ReactNode, type RefObject} from 'react';
import {FINANCIAL_EXECUTION_ALLOWED} from '../../lib/app-environment';
import {SHOWCASE_FOOTER} from '../../lib/showcase-copy';
import {useShowcase} from '../showcase-controls';
import {WorkspaceStatus} from '../workspace-status';

/**
 * Phase 2 (weights, never a raised budget; no-JavaScript honesty): the footer banner is a server component
 * (site-footer.tsx) — its markup arrives with the HTML and costs no script on any page. These are its few live parts:
 * the honesty values the shell already knows (passed down through FooterFacts), the Showcase/storage line, Back to top
 * and the opening moment's path (its own chunk, requested as the page hydrates, so no page sees a late request).
 */
export type FooterFactsValue = {network: {label: string; sentence: string}; mode: string; financial: boolean};
const FooterFactsContext = createContext<FooterFactsValue | null>(null);
export function FooterFacts({value, children}: {value: FooterFactsValue; children: ReactNode}) { return <FooterFactsContext.Provider value={value}>{children}</FooterFactsContext.Provider>; }

/** The disclaimer's live first spans; their class names are the hosted verifier's (`network-banner`, `mode-strip`). */
export function FooterHonesty() {
  const facts = useContext(FooterFactsContext);
  return <>
    {facts?.financial && <><span className="network-banner"><strong>{facts.network.label}</strong> {facts.network.sentence}</span> <span className="mode-strip">{facts.mode}</span> </>}
    {!FINANCIAL_EXECUTION_ALLOWED && <span>Financial execution is disabled on this Alpha.</span>}
  </>;
}
/** While the Showcase is on, its own line (AB-Cloud's SHOWCASE_FOOTER); otherwise where the records live and sync. */
export function FooterStatus() { const showcase = useShowcase(); return <div className="site-footer-status">{showcase ? SHOWCASE_FOOTER : <WorkspaceStatus/>}</div>; }
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
