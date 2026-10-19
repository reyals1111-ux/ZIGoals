import Link from 'next/link';

/**
 * Valdora liquid staking (stZIG) on the Staking page (Session I, Part 7; Session AF): since Session AF a tracked wallet's
 * stZIG balance is read from the chain with the other positions (its own card, in stZIG, never added to the ZIG totals);
 * this card says so and where staking with Valdora happens. It renders from this file alone and makes no request.
 */
export function StakingPlaceholder() {
  return <section className="panel staking-placeholder" aria-labelledby="valdora-staking-title">
    <div className="staking-placeholder-head"><p className="eyebrow">Liquid staking</p><span className="staking-placeholder-badge">Read only</span></div>
    <h2 id="valdora-staking-title">Valdora liquid staking (stZIG)</h2>
    <p>When a wallet you track holds stZIG, its balance appears with your positions, in stZIG, read from the chain. It is never added to your ZIG totals.</p>
    <p className="fine">Staking or unstaking with Valdora happens on Valdora&apos;s own site; ZIGoals signs nothing for it and shows no estimate.</p>
    <Link className="text-link" href="/app/ecosystem#project-valdora">Research Valdora in Ecosystem →</Link>
    <p className="staking-placeholder-more">More ways to stake may appear here once they can be verified.</p>
  </section>;
}
