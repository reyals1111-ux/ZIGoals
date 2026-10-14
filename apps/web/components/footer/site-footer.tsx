'use client';
import Link from 'next/link';
import {Suspense, lazy, useEffect, useRef, useState, type ReactNode} from 'react';
import {APP_ENVIRONMENT, FINANCIAL_EXECUTION_ALLOWED} from '../../lib/app-environment';
import {enabledSocialLinks} from '../../lib/social-links';
import {ButterflyGlyph, HeartGlyph, LotusGlyph} from './pillar-glyphs';
import {LogoWordmark} from '../brand/logo-wordmark';
import './site-footer.css';

/**
 * The three steps of the slogan (owner request 2, re-cut at the owner's Phase 2 correction): Goals → Habits → Health; the
 * slogan above them already says "= Wealth", and the constellation path flows from Health up into that word.
 */
const STEPS = [
  {n: '01', pillar: 'goals', title: 'Goals', body: 'Pick what matters: a destination with meaning.', glyph: <LotusGlyph size={28}/>},
  {n: '02', pillar: 'habits', title: 'Habits', body: 'Small daily steps that build the pattern.', glyph: <ButterflyGlyph size={28}/>},
  {n: '03', pillar: 'health', title: 'Health', body: 'Care for the body that carries you there.', glyph: <HeartGlyph size={28}/>},
] as const;
const X_PATH = 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z';
const Globe = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 3.8 5.8 3.8 9s-1.2 6.2-3.8 9c-2.6-2.8-3.8-5.8-3.8-9S9.4 5.8 12 3z"/></svg>;
const GROUPS: readonly {title: string; links: readonly {label: string; href: string; external?: boolean}[]}[] = [
  {title: 'Product', links: [{label: 'Today', href: '/app'}, {label: 'Goals', href: '/app/goals'}, {label: 'Habits', href: '/app/habits'}, {label: 'Health', href: '/app/health'}, {label: 'Wealth', href: '/app/wealth'}]},
  {title: 'Help & feedback', links: [{label: 'Help', href: '/app/help'}, {label: 'What’s new', href: '/app/help#whats-new-alpha'}, {label: 'Send feedback', href: '/app/help#feedback'}, {label: 'Private security contact', href: 'mailto:hello@zigoals.app', external: true}]},
  {title: 'Your data', links: [{label: 'Make a backup in Settings', href: '/app/settings'}, {label: 'Storage & sync settings', href: '/app/settings#encrypted-sync'}, {label: 'Your data', href: '/app/settings/data'}]},
];
/** The opening animation's path and particles load with the footer, the first time it comes near the screen. */
const FooterPath = lazy(() => import('./footer-path'));

/**
 * Session AB-Design (owner request 2; rebuilt to the owner's Phase 2 brief, ADR-024 P6): one full-width footer banner on
 * every page. The planet horizon is drawn exactly once as the band's own background. Centrepiece: the origami Z/G logo
 * acting as the "Z" of "ZIGoals", the slogan "Goals, Habits & Health = Wealth" and its small line; under it the three
 * steps Goals → Habits → Health on a glowing constellation path that flows up into "Wealth". The first time the banner
 * is seen in a session the path draws itself, the nodes ignite in turn and "Wealth" lights up (footer-path.tsx); under
 * reduced motion and Motion Off, and before that script arrives, everything simply shows its final, resting state.
 * Then the social row, three groups of links, the Showcase line and the Alpha's full disclaimer — whose spans keep the
 * class names the hosted-Alpha verifier reads (`network-banner`, `mode-strip`).
 */
export function SiteFooter({network, mode, financial, status}: {network: {label: string; sentence: string}; mode: string; financial: boolean; status?: ReactNode}) {
  const social = enabledSocialLinks(), root = useRef<HTMLElement>(null), stage = useRef<HTMLDivElement>(null), [near, setNear] = useState(false);
  useEffect(() => {
    const el = root.current; if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { queueMicrotask(() => setNear(true)); return; }
    const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setNear(true); io.disconnect(); } }, {rootMargin: '0px 0px 700px 0px'});
    io.observe(el); return () => io.disconnect();
  }, []);
  return <footer ref={root} className="site-footer" aria-label="About ZIGoals">
    <div className="site-footer-art" aria-hidden="true"/>
    <div className="site-footer-sweep" aria-hidden="true"/>
    <div className="site-footer-inner">
      <div ref={stage} className="site-footer-stage">
        <div className="site-footer-brand">
          <LogoWordmark className="site-footer-logo"/>
          <p className="site-footer-slogan"><span>Goals, Habits &amp; Health</span> <span className="site-footer-result"><span className="site-footer-equals">=</span> <span className="site-footer-wealth" data-footer-wealth="">Wealth</span></span></p>
          <p className="site-footer-tagline">Same you. A brighter tomorrow.</p>
        </div>
        <ol className="site-footer-steps" aria-label="How ZIGoals works">
          {STEPS.map((s, i) => <li key={s.n} data-pillar={s.pillar} data-step={i}>
            <span className="site-footer-node" aria-hidden="true" data-footer-node=""><span className="site-footer-glyph">{s.glyph}</span><span className="site-footer-n">{s.n}</span></span>
            <strong>{s.title}</strong>
            <p>{s.body}</p>
          </li>)}
        </ol>
        {near && <Suspense fallback={null}><FooterPath stage={stage} footer={root}/></Suspense>}
      </div>
      <div className="site-footer-social">
        <div className="site-footer-social-links">
          {social.map(link => <a key={link.id} href={link.href} rel="noopener noreferrer" target="_blank" aria-label={link.label}><svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false"><path d={X_PATH} fill="currentColor"/></svg><span>@{link.href.split('/').pop()}</span></a>)}
          <a href="https://zigoals.app" rel="noopener" aria-label="zigoals.app"><Globe/><span>zigoals.app</span></a>
        </div>
        <a className="site-footer-top" href="#main" onClick={event => { event.preventDefault(); window.scrollTo({top: 0, behavior: 'smooth'}); document.getElementById('main')?.focus({preventScroll: true}); }}>Back to top <span aria-hidden="true">↑</span></a>
      </div>
      <nav className="site-footer-links" aria-label="ZIGoals links">
        {GROUPS.map(g => <div key={g.title} className="site-footer-group"><p className="site-footer-group-title">{g.title}</p><ul>{g.links.map(l => <li key={l.label}>{l.external ? <a href={l.href}>{l.label}</a> : <Link href={l.href} prefetch={false}>{l.label}</Link>}</li>)}</ul></div>)}
      </nav>
      <div className="site-footer-status">{status}</div>
      <p className="site-footer-disclaimer alpha-disclaimer">
        {financial && <><span className="network-banner"><strong>{network.label}</strong> {network.sentence}</span> <span className="mode-strip">{mode}</span> </>}
        {!FINANCIAL_EXECUTION_ALLOWED && <span>Financial execution is disabled on this Alpha.</span>}
        <span>Browser storage is not a backup.</span>
        <span>Independent project · Unaudited alpha · Idle strategy only.</span>
        <span>Never share secrets, private backups or wallet details.</span>
        <span className="site-footer-build">Your goals. Onchain. · {APP_ENVIRONMENT}</span>
      </p>
    </div>
  </footer>;
}
