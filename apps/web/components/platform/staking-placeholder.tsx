import Link from 'next/link';

/**
 * Valdora liquid staking (stZIG) on the Staking page (Session I, Part 7): named, honestly not tracked. ZIGoals reads no
 * Valdora data and shows no balance, rate or estimate; the card points to the project's research record. It renders
 * from this file alone and makes no request.
 */
export function StakingPlaceholder() {
  return <section className="panel staking-placeholder" aria-labelledby="valdora-staking-title">
    <div className="staking-placeholder-head"><p className="eyebrow">Liquid staking</p><span className="staking-placeholder-badge">Not tracked yet</span></div>
    <h2 id="valdora-staking-title">Valdora liquid staking (stZIG)</h2>
    <p>ZIGoals does not track stZIG yet. It will appear here, beside your native staking, once ZIGoals can read and verify it.</p>
    <p className="fine">Nothing is read or connected for Valdora today, and no amount is shown or estimated.</p>
    <Link className="text-link" href="/app/ecosystem#project-valdora">Research Valdora in Ecosystem →</Link>
    <p className="staking-placeholder-more">More ways to stake may appear here once they can be verified.</p>
  </section>;
}
