import {enabledSocialLinks} from '../../lib/social-links';
import {ButterflyGlyph, HeartGlyph, LotusGlyph} from './pillar-glyphs';
import {IGoalsWordmark} from '../brand/igoals-wordmark';
import {FooterMotion, FooterTop} from './footer-islands';
import './site-footer.css';

/**
 * The three steps (owner request 2): Goals → Habits → Health, each with its word in the slogan's first line. The second
 * line, "= Wealth", is where they lead.
 */
const STEPS = [
  {n: '01', pillar: 'goals', title: 'Goals', body: 'Pick what matters: a destination with meaning.', glyph: <LotusGlyph size={28}/>},
  {n: '02', pillar: 'habits', title: 'Habits', body: 'Small daily steps that build the pattern.', glyph: <ButterflyGlyph size={28}/>},
  {n: '03', pillar: 'health', title: 'Health', body: 'Care for the body that carries you there.', glyph: <HeartGlyph size={28}/>},
] as const;
const X_PATH = 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z';
const Globe = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 3.8 5.8 3.8 9s-1.2 6.2-3.8 9c-2.6-2.8-3.8-5.8-3.8-9S9.4 5.8 12 3z"/></svg>;

/**
 * Session AB-Design (owner request 2) → Session AD, "the final look" (ADR-026 Part 1): one full-width footer banner on every
 * page that ends where the planet artwork ends (the whole planet shown, never cropped on a computer or tablet). The
 * owner's wordmark, the slogan in two lines ("Goals · Habits · Health", then a larger "= Wealth"), the three steps on
 * their constellation line, and at the very bottom the social row and Back to top between two dividers. The link columns
 * are gone: every one of their links is reachable in two taps from the sidebar, the phone's More, Help and Settings.
 * The first time the banner is seen in a visit, each word appears with its step, the line draws between them, "= Wealth"
 * arrives and the wordmark shines once while the planet's flare rises along its rim (footer-path.tsx); reduced motion,
 * Motion Off, or before that script arrives: the final, resting state.
 */
export function SiteFooter() {
  const social = enabledSocialLinks();
  return <footer className="site-footer" aria-label="About ZIGoals">
    <div className="site-footer-art" aria-hidden="true"/>
    <div className="site-footer-glow" aria-hidden="true"><i data-glow="mist"/><i data-glow="horizon"/></div>
    <div className="site-footer-inner">
      <div className="site-footer-stage">
        <div className="site-footer-brand">
          <span className="site-footer-logo" data-footer-logo=""><IGoalsWordmark/><span className="site-footer-shine" aria-hidden="true"><i/></span></span>
          <p className="site-footer-slogan">
            <span className="site-footer-line1">{STEPS.map((s, i) => <span key={s.n}>{i > 0 && <> <span className="site-footer-dot" data-word={i} aria-hidden="true">·</span> </>}<span className="site-footer-word" data-pillar={s.pillar} data-word={i}>{s.title}</span></span>)}</span>
            {' '}
            <span className="site-footer-result" data-footer-wealth=""><span className="site-footer-equals">=</span> <span className="site-footer-wealth">Wealth</span></span>
          </p>
          <p className="site-footer-tagline">Same you. A brighter tomorrow.</p>
        </div>
        <ol className="site-footer-steps" aria-label="How ZIGoals works">
          {STEPS.map((s, i) => <li key={s.n} data-pillar={s.pillar} data-step={i}>
            <span className="site-footer-node" aria-hidden="true" data-footer-node=""><span className="site-footer-glyph">{s.glyph}</span><span className="site-footer-n">{s.n}</span></span>
            <strong>{s.title}</strong>
            <p>{s.body}</p>
          </li>)}
        </ol>
        <FooterMotion/>
      </div>
      <div className="site-footer-social">
        <div className="site-footer-social-links">
          {social.map(link => <a key={link.id} href={link.href} rel="noopener noreferrer" target="_blank" aria-label={link.label}><svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false"><path d={X_PATH} fill="currentColor"/></svg><span>@{link.href.split('/').pop()}</span></a>)}
          <a href="https://zigoals.app" rel="noopener" aria-label="zigoals.app"><Globe/><span>zigoals.app</span></a>
        </div>
        <FooterTop/>
      </div>
    </div>
  </footer>;
}
