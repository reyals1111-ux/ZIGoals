'use client';
import {APP_ENVIRONMENT, FINANCIAL_EXECUTION_ALLOWED} from '../../lib/app-environment';
import {SHOWCASE_FOOTER} from '../../lib/showcase-copy';
import {useShowcase} from '../showcase-controls';
import {WorkspaceStatus} from '../workspace-status';
import {useAlphaFacts} from './alpha-facts';
import './about-this-alpha.css';

/**
 * Session AC (owner finding 3 on Alpha #41, `TIER 3 (public-safety labels)`): the facts the footer's disclaimer block
 * carried, word for word, always one tap away in Settings (its "About this alpha" panel and Settings → Your data) and in
 * Help ("About this Alpha"); the first visit still shows them in the Alpha notice. The spans keep the hosted verifier's
 * class names (`network-banner`, `mode-strip`), the money facts follow the same rule the footer did (shown while the
 * shell's banners are), and the build environment stays in Settings' HTML for the deploy gate.
 */
export function AboutThisAlpha() {
  const facts = useAlphaFacts(), showcase = useShowcase();
  return <div className="about-alpha" role="group" aria-label="This Alpha's facts">
    <p className="about-alpha-facts alpha-disclaimer">
      {facts?.financial && <><span className="network-banner"><strong>{facts.network.label}</strong> {facts.network.sentence}</span> <span className="mode-strip">{facts.mode}</span> </>}
      {!FINANCIAL_EXECUTION_ALLOWED && <span>Contract execution is disabled on this Alpha.</span>}
      <span>Browser storage is not a backup.</span>
      <span>Independent project · Unaudited alpha · Idle strategy only.</span>
      <span>Never share secrets, private backups or wallet details.</span>
    </p>
    <div className="about-alpha-status">{showcase ? <p>{SHOWCASE_FOOTER}</p> : <WorkspaceStatus/>}</div>
    <p className="about-alpha-build">Build environment <span className="about-alpha-env">{APP_ENVIRONMENT}</span></p>
    {/* Session AF (L2b; the WalletConnect licence's distribution notice, docs/dependencies/WALLETCONNECT.md). */}
    <p className="about-alpha-notices fine">Portions © 2025 Reown, Inc. All Rights Reserved. <a className="text-link" href="/licenses/walletconnect.txt">WalletConnect notices</a></p>
  </div>;
}
