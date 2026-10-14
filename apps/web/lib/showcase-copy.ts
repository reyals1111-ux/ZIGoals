/**
 * Session AB-Cloud Part 8 (ADR-023 C24): the Showcase's words, as data. AB-Design replaces the Showcase banners with a
 * first-visit notice, a small "Showcase" chip and a footer line (ADR-024) and reads these; until then the existing banner
 * and the phone's status sheet use SHOWCASE_BANNER. What they say is what the code does: Load and Reset build fresh
 * fictional records for today in this tab's storage and drop the previous ones (lib/showcase-storage.ts
 * activateShowcase); Exit leaves them; the person's own records are never read or changed.
 */
/** The chip: a few words, always visible while the Showcase is on. */
export const SHOWCASE_CHIP = 'Showcase · fictional';
/** The first-visit sheet: what the Showcase is and what happens to what you add. */
export const SHOWCASE_SHEET = 'You are looking at the Showcase: fictional goals, habits, health and money records for today, kept in this tab only. Try anything. Loading or resetting the Showcase starts these examples fresh, so anything you add here is cleared then; your own records are never touched. Exit the Showcase in Settings to return to them.';
/** The footer line on every page while the Showcase is on. */
export const SHOWCASE_FOOTER = 'Showcase data is fictional and stays in this tab. Load or Reset starts it fresh; your own records are untouched.';
/** The existing banner's sentence (until AB-Design's chip replaces it). */
export const SHOWCASE_BANNER = 'Fictional examples · Load or Reset starts them fresh for today; anything you add here is cleared then';
