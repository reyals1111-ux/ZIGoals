'use client';
import {ShowcaseControls, useShowcase} from '../showcase-controls';

/**
 * Session AL (P-NB-65, P-DV-112; NB-029, DV-262, DV-273, N-002): on a person's own profile the Showcase card sits at the
 * foot of "Your app", after the real preferences, in its own "Try it" place, so loading the demo is never the first
 * control next to data choices. Inside the Showcase it stays at the top, where "Return to my data" is wanted first.
 */
export const TRY_PAGES = 'The Showcase switches on every page (Earn, Markets, Staking, Chess, Journey and more) so you can see them all. Your own ZIGoals starts with fewer pages, and shows only the ones you switch on under Your pages & buttons.';
export const OPEN_PAGES = 'The Showcase shows every page. Your own ZIGoals keeps the pages you chose: when you return to your data, its menu is yours again.';
export function ShowcaseSlot({at}: {at: 'top' | 'bottom'}) {
  const active = useShowcase();
  if ((at === 'top') !== active) return null;
  // Session AL (N-NB-15): the Showcase switches every page on (16 in the menu against 9 on a new device), so the card says
  // that a person's own app starts smaller and keeps only the pages they choose, before and while the demo is open.
  return at === 'bottom'
    ? <div className="settings-try-it" role="group" aria-label="Try it"><p className="eyebrow">TRY IT</p><ShowcaseControls/><p className="fine settings-try-it-pages">{TRY_PAGES}</p></div>
    : <><ShowcaseControls/><p className="fine settings-try-it-pages">{OPEN_PAGES}</p></>;
}
