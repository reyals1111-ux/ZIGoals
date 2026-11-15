/**
 * Session AP (owner decision 14 Nov, 4a; ADR-040): on a computer the floating launchers (ZIGi, the Checklist, music, the
 * Earn dock) stay floating, but while their column would cover the page's content (Today's right column at 1440 as the
 * page scrolls) they fold into the window's edge, and come back when nothing is under them. No layout changes: the
 * column slides sideways by `--launcher-tuck` and keeps its centre inside the window, so every button stays reachable;
 * hovering it or giving it the keyboard focus brings it back at once (components/launchers/auto-tuck.css).
 * Owner rules: it changes only after the new state has held for 150 ms (no flicker while scrolling), never moves the
 * focus, and costs almost nothing: at most one check per frame on scroll or resize, two points per launcher read with
 * elementsFromPoint, nothing on idle frames. Motion Off and reduced motion get no slide (CSS). A person's own "tuck
 * away" choice is unaffected (those launchers are then edge tabs, not in this column).
 */
export const TUCK_ATTR = 'data-launchers-tucked';
export const HOLD_MS = 150;
const LAUNCHERS = '.ai-launcher, .music-launcher-stack, .checklist-launcher-stack, .earn-dock-stack';
const COMPACT = '(max-width: 900.98px), (max-width: 767.98px), (pointer: coarse) and (max-height: 500px)';

/** The element under a point that is not a launcher (or the page's own background). */
function contentAt(x: number, y: number, main: HTMLElement): Element | null {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el.closest(LAUNCHERS)) continue;
    if (el === document.documentElement || el === document.body) return null;
    return main.contains(el) && el !== main ? el : null;
  }
  return null;
}
/** Content counts when it is a card, text or a control, not the page's own wide wrapper around everything. */
function isContent(el: Element, main: HTMLElement): boolean {
  if (el.closest('a, button, input, select, textarea, img, svg, canvas, video, p, h1, h2, h3, h4, li, td, th, label')) return true;
  return el.getBoundingClientRect().width < main.getBoundingClientRect().width * 0.9;
}
/** Whether any launcher, at its untucked place, sits over content. */
export function launchersCoverContent(): boolean {
  const main = document.getElementById('main');
  if (!main) return false;
  for (const launcher of document.querySelectorAll<HTMLElement>(LAUNCHERS)) {
    const r = launcher.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    // Where it stands untucked: its rectangle less the slide in force now.
    const slide = parseFloat(getComputedStyle(launcher).translate) || 0;
    const left = r.left - slide, right = r.right - slide;
    for (const [x, y] of [[(left + right) / 2, r.top + r.height / 2], [left + (right - left) * 0.25, r.top + r.height * 0.25]] as const) {
      const el = contentAt(x, y, main);
      if (el && isContent(el, main)) return true;
    }
  }
  return false;
}

/** Starts the watcher on this page; returns the clean-up. */
export function startLauncherAutoTuck(): () => void {
  const root = document.documentElement;
  let media: MediaQueryList | null = null;
  try { media = window.matchMedia(COMPACT); } catch { media = null; }
  let frame = 0, timer = 0, pending: boolean | null = null;
  const shown = () => root.hasAttribute(TUCK_ATTR);
  const set = (on: boolean) => { if (on) root.setAttribute(TUCK_ATTR, ''); else root.removeAttribute(TUCK_ATTR); };
  const check = () => {
    frame = 0;
    const want = !media?.matches && launchersCoverContent();
    if (want === shown()) { pending = null; window.clearTimeout(timer); return; }
    if (pending === want) return; // already waiting for this state to hold
    pending = want; window.clearTimeout(timer);
    timer = window.setTimeout(() => { const still = !media?.matches && launchersCoverContent(); pending = null; if (still === want) set(want); }, HOLD_MS);
  };
  const soon = () => { if (!frame) frame = window.requestAnimationFrame(check); };
  window.addEventListener('scroll', soon, {passive: true});
  window.addEventListener('resize', soon, {passive: true});
  media?.addEventListener?.('change', soon);
  // The page's own late parts (cards that arrive after the first paint) are seen without any scroll.
  const later = [400, 1200, 2500].map(ms => window.setTimeout(soon, ms));
  soon();
  return () => {
    window.removeEventListener('scroll', soon); window.removeEventListener('resize', soon); media?.removeEventListener?.('change', soon);
    window.cancelAnimationFrame(frame); window.clearTimeout(timer); for (const t of later) window.clearTimeout(t);
    root.removeAttribute(TUCK_ATTR);
  };
}
