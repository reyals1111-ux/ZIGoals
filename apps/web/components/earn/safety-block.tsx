import {DECOY_ZIG_DENOM} from '../../lib/earn/options';
import {SectionHeading} from '../ui/section-heading';

/**
 * Session AF (L1): the scam safety block. Four plain warnings, the decoy "ZIG" denom written out in full, and what ZIGoals
 * will never do. The facts come from the chain's own bank metadata for the decoy (docs/earn/af/R1_ZIG_FINANCE.md, LB3).
 */
export function SafetyBlock() {
  return <section id="safety" className="earn-safety panel" aria-labelledby="safety-title">
    <SectionHeading id="safety-title" eyebrow="Before you sign anything" title="Stay safe"/>
    <ul className="earn-safety-tiles">
      <li><h3>Use verified links only</h3><p>Every outside link on this page comes from ZIGoals’ verified list and carries the mark “verified link” with the day it was checked. A link in a message, an advert or a search result can lead to a copy of a real site.</p></li>
      <li><h3>Beware the decoy “ZIG”</h3><p>A token named “ZIG” with 6 decimals exists on ZIGChain: <code className="earn-denom">{DECOY_ZIG_DENOM}</code>. Real ZIG is <code className="earn-denom">azig</code>, with 18 decimals. Apps show the name, so check the token’s full name before you swap or send. ZIGoals never counts the decoy as ZIG.</p></li>
      <li><h3>Never share your seed phrase</h3><p>Your 12 or 24 words are your money. Not with ZIGoals, not with “support”, not with anyone, and never in a photo or a chat. Nobody genuine will ask.</p></li>
      <li><h3>Sign only what you started</h3><p>ZIGoals will never ask you to sign anything you didn’t start. If a signing window appears out of nowhere, reject it.</p></li>
    </ul>
  </section>;
}
