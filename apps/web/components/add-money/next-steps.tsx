import {GuideLinkOut} from './out-link';
import {NEXT_STEPS} from '../../lib/onramps/next-steps';
import type {BuyAssetId} from '../../lib/onramps/assets';

/** Session AF (L2b, Part 4, A2.8): "What can I do with it now?" for one asset, every link from the verified lists. */
export function NextSteps({asset, headingId}: {asset: BuyAssetId; headingId: string}) {
  return <section className="add-money-next panel" aria-labelledby={headingId}>
    <h2 id={headingId}>What can I do with it now?</h2>
    <ol className="add-money-guides">{NEXT_STEPS[asset].map(g => <li key={g.id} data-guide={g.id}>
      <h3>{g.title}</h3><p>{g.body}</p>
      {g.steps && <ol className="add-money-guide-steps">{g.steps.map(s => <li key={s}>{s}</li>)}</ol>}
      {g.links.length > 0 && <p className="add-money-actions">{g.links.map(l => <GuideLinkOut key={l.label} link={l}/>)}</p>}
    </li>)}</ol>
  </section>;
}
