/**
 * Phase 2, Part 11 (owner request 8): inside a card, the Showcase is named by one quiet tag (the chip's words) before the
 * card's own plain sentence about what is fictional — not a shouted "SHOWCASE DATA ·" line. The words stay; the clutter goes.
 */
export function ShowcaseTag() { return <span className="showcase-tag"><span aria-hidden="true" className="showcase-tag-dot"/>Showcase</span>; }
