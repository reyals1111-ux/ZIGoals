/**
 * Session AB-Cloud Part 8 (ADR-023 C24): the Showcase's words, as data. The chip and its sheet (AB-Design, ADR-024) read
 * SHOWCASE_CHIP and SHOWCASE_SHEET; Settings' facts block and the phone's Status sheet read SHOWCASE_FOOTER (Session AC:
 * the footer's line moved to Settings, and the banner's own sentence left with the banner). What they say is what the code does: Load and Reset build fresh
 * fictional records for today in this tab's storage and drop the previous ones (lib/showcase-storage.ts
 * activateShowcase); Exit leaves them; the person's own records are never read or changed.
 */
/** The chip: a few words, always visible while the Showcase is on. */
export const SHOWCASE_CHIP = 'Showcase · fictional';
/** The first-visit sheet: what the Showcase is and what happens to what you add. */
export const SHOWCASE_SHEET = 'You are looking at the Showcase: fictional goals, habits, health and money records for today, kept in this tab only. Try anything. Loading or resetting the Showcase starts these examples fresh, so anything you add here is cleared then; your own records are never touched. Exit the Showcase in Settings to return to them.';
/** The short line: Settings' facts block and the phone's Status sheet, while the Showcase is on. */
export const SHOWCASE_FOOTER = 'Showcase data is fictional and stays in this tab. Load or Reset starts it fresh; your own records are untouched.';
