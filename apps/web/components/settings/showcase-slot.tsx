'use client';
import {ShowcaseControls, useShowcase} from '../showcase-controls';

/**
 * Session AL (P-NB-65, P-DV-112; NB-029, DV-262, DV-273, N-002): on a person's own profile the Showcase card sits at the
 * foot of "Your app", after the real preferences, in its own "Try it" place, so loading the demo is never the first
 * control next to data choices. Inside the Showcase it stays at the top, where "Return to my data" is wanted first.
 */
export function ShowcaseSlot({at}: {at: 'top' | 'bottom'}) {
  const active = useShowcase();
  if ((at === 'top') !== active) return null;
  return at === 'bottom'
    ? <div className="settings-try-it" role="group" aria-label="Try it"><p className="eyebrow">TRY IT</p><ShowcaseControls/></div>
    : <ShowcaseControls/>;
}
