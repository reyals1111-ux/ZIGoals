'use client';
import Link from 'next/link';
import type {ReactNode} from 'react';
import {APP_ENVIRONMENT, FINANCIAL_EXECUTION_ALLOWED} from '../../lib/app-environment';
import {enabledSocialLinks} from '../../lib/social-links';
import {Wordmark} from '../brand-mark';
import {useEntrance} from '../use-entrance';
import {BullGlyph, ButterflyGlyph, HeartGlyph, LotusGlyph} from './pillar-glyphs';
import './site-footer.css';

/** The three steps of the slogan "Goals, Habits & Health = Wealth" (owner request 2); Today's old 3-step card lives on here. */
const STEPS = [
  {n: '01', title: 'Goals', body: 'Pick what matters: a destination with meaning. Arrange each page your way.', glyph: <LotusGlyph size={26}/>},
  {n: '02', title: 'Habits & Health', body: 'Log a habit, a meal or a few push-ups. Every small step adds to the pattern.', glyph: <><ButterflyGlyph size={26}/><HeartGlyph size={20} className="site-footer-glyph-heart"/></>},
  {n: '03', title: '= Wealth', body: 'Everything you own and work toward, in one view. Your records stay private in this browser.', glyph: <BullGlyph size={26}/>},
] as const;
const X_PATH = 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z';

/**
 * Session AB-Design (owner request 2, ADR-024 D6): one full-width footer banner on every page. The planet horizon is
 * drawn exactly once as the band's own background (the two stacked layers it replaces repeated it on wide screens), the
 * wordmark and the slogan are the centrepiece, a constellation line links the three steps (it draws itself once when
 * first seen; fully drawn under reduced motion and Motion Off), then the links and the Alpha's full disclaimer line.
 * The disclaimer spans keep the class names the hosted-Alpha verifier reads (`network-banner`, `mode-strip`).
 */
export function SiteFooter({network, mode, financial, status}: {network: {label: string; sentence: string}; mode: string; financial: boolean; status?: ReactNode}) {
  const steps = useEntrance<HTMLOListElement>('site-footer-steps');
  const social = enabledSocialLinks();
  return <footer className="site-footer" aria-label="About ZIGoals">
    <div className="site-footer-art" aria-hidden="true"/>
    <div className="site-footer-inner">
      <div className="site-footer-brand">
        <Wordmark/>
        <p className="site-footer-slogan"><span>Goals, Habits &amp; Health</span> <span className="site-footer-equals">=</span> <span className="site-footer-wealth">Wealth</span></p>
        <p className="site-footer-tagline">Same you. A brighter tomorrow.</p>
      </div>
      <ol ref={steps} className="site-footer-steps" aria-label="How ZIGoals works">
        <svg className="site-footer-line" viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs><linearGradient id="site-footer-line-g" x1="0" x2="1"><stop offset="0" stopColor="#23eaff"/><stop offset=".5" stopColor="#9273ff"/><stop offset="1" stopColor="#f06dff"/></linearGradient></defs>
          <path className="site-footer-path" pathLength={1} d="M40 40 C 220 10, 360 70, 600 40 S 980 10, 1160 40" fill="none" stroke="url(#site-footer-line-g)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        {STEPS.map(s => <li key={s.n}>
          <span className="site-footer-node" aria-hidden="true"><span className="site-footer-glyph">{s.glyph}</span><span className="site-footer-n">{s.n}</span></span>
          <strong>{s.title}</strong>
          <p>{s.body}</p>
        </li>)}
      </ol>
      <nav className="site-footer-links" aria-label="ZIGoals links">
        <a href="https://zigoals.app" rel="noopener">zigoals.app</a>
        <Link href="/app/help" prefetch={false}>Help</Link>
        <Link href="/app/help#feedback" prefetch={false}>Send feedback</Link>
        <a href="mailto:hello@zigoals.app">Private security contact</a>
        <Link href="/app/settings" prefetch={false}>Make a backup in Settings →</Link>
        {social.map(link => <a key={link.id} className="site-footer-social" href={link.href} rel="noopener noreferrer" target="_blank" aria-label={link.label}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d={X_PATH} fill="currentColor"/></svg><span>{link.label.replace(' on X', '')}</span></a>)}
      </nav>
      {status}
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
