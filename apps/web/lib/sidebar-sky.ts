/**
 * Session AF (L5a, Part 10.1, ADR-028 H28): the sidebar sky's parallax maths, used by components/shell/sidebar-sky.tsx.
 * The stars layer scrolls with the sidebar's content and is moved back down by 55 % of every scrolled pixel, so on screen
 * it travels at 45 % of the content's speed.
 */
/** The share of each scrolled pixel the stars give back (1 − 0.45, the stars' share of the content's speed). */
export const SKY_LAG = .55;
/** The stars' total drift over the sidebar's whole scroll (what the scroll-driven animation runs to), in px. */
export const skyRange = (scrollHeight: number, clientHeight: number) => Math.round(SKY_LAG * Math.max(0, scrollHeight - clientHeight));
/** The stars' drift at one scroll position (the resting value, and the listener's), in px to one decimal. */
export const skyOffset = (scrollTop: number) => Math.round(SKY_LAG * Math.max(0, scrollTop) * 10) / 10;
/** How the drift is driven: a CSS scroll-driven animation while the sidebar scrolls where the engine has one, else a
 *  scroll listener coalesced to one write per frame. */
export const skyDriver = (supportsTimeline: boolean): 'timeline' | 'listener' => supportsTimeline ? 'timeline' : 'listener';
/** The drift runs only on the computer's sidebar (wider than 900 px), with motion welcome and Motion Off not chosen. */
export const skyAllowed = ({desktop, reduced, motionOff}: {desktop: boolean; reduced: boolean; motionOff: boolean}) => desktop && !reduced && !motionOff;
