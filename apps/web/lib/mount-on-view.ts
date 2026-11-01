/**
 * Session AK G2 (RELEASE_REVIEW R11, SESSION_AK_F8 proposal 2): when a part of a page below the first screen mounts.
 * Pure rules for components/use-mount-on-view.ts: at once when the address points into it (`#dashboard-…` on Today), when
 * it is forced (arranging Today, a brand-new device's short Today) or on a wide screen (the part is in the first screen
 * there, and a computer has the time); otherwise when it scrolls within `rootMargin` of the screen, or when the browser is
 * first idle after load, so a page that never scrolls still gets it within a moment.
 */
export type MountRule = {hashPrefixes: readonly string[]; force?: boolean; wide?: boolean};
export function mountsAtOnce(hash: string, rule: MountRule): boolean {
  if (rule.force || rule.wide) return true;
  return !!hash && hash !== '#' && rule.hashPrefixes.some(prefix => hash.startsWith(prefix));
}
/** Phones and small tablets defer; from this width up the part mounts with the page. */
export const DEFER_BELOW = '(max-width: 1000px)';
export const ROOT_MARGIN = '600px 0px';
