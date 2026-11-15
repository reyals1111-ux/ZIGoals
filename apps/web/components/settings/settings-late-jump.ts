/**
 * Session AP (D20): a Settings jump whose target is drawn a moment later (ZIGi's sections load on demand) opens its group
 * and lands on it once it arrives; watched for up to 10 s, stopped by the person's own scroll, tap or key. Returns the stop.
 */
export function watchLateJump(id: string, reveal: (id: string) => boolean): () => void {
  let done = false;
  const stop = () => { done = true; watch.disconnect(); window.clearTimeout(timer); window.removeEventListener('wheel', stop); window.removeEventListener('pointerdown', stop); window.removeEventListener('keydown', stop); };
  const watch = new MutationObserver(() => {
    if (done || !document.getElementById(id)) return;
    stop();
    reveal(id);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({block: 'start', behavior: 'instant'}));
  });
  watch.observe(document.body, {childList: true, subtree: true});
  const timer = window.setTimeout(stop, 10_000);
  window.addEventListener('wheel', stop, {passive: true}); window.addEventListener('pointerdown', stop); window.addEventListener('keydown', stop);
  return stop;
}

/**
 * Session AP (D-088, CI 1726; moved here from settings-fold.tsx for Settings' weight): every jump on Settings (the address
 * on arrival, a link, the router's own pushes, back and forward) opens its target's group and lands on it; a target drawn
 * a moment later is watched for (above). Returns the stop.
 */
export function startJumps(reveal: (id: string) => boolean): () => void {
  let late: (() => void) | null = null;
  const id = (hash: string) => { if (hash.length < 2) return null; try { return decodeURIComponent(hash.slice(1)); } catch { return null; } };
  const jump = (target: string | null) => {
    if (!target) return;
    if (document.getElementById(target)) { if (reveal(target)) document.getElementById(target)?.scrollIntoView({block: 'start', behavior: 'instant'}); return; }
    late?.(); late = watchLateJump(target, reveal);
  };
  const here = (url: URL) => url.pathname === window.location.pathname && url.hash.length > 1;
  // Capture: before the link's own scroll (an index link, a Help or Search link to a section, any #anchor here).
  const onClick = (event: MouseEvent) => {
    const link = (event.target as Element | null)?.closest?.('a[href*="#"]') as HTMLAnchorElement | null;
    if (!link) return;
    const url = new URL(link.href, window.location.href);
    if (here(url)) jump(id(url.hash));
  };
  // The router's own pushes (Search, a Link) where the browser reports navigations; it fires before the scroll.
  type Nav = {addEventListener: (t: string, f: (e: {destination: {url: string}}) => void) => void; removeEventListener: (t: string, f: (e: {destination: {url: string}}) => void) => void};
  const nav = (window as Window & {navigation?: Nav}).navigation;
  const onNavigate = (event: {destination: {url: string}}) => { try { const url = new URL(event.destination.url); if (here(url)) jump(id(url.hash)); } catch { /* not a URL we handle */ } };
  // Anything else (back and forward, a typed fragment): the browser already tried to scroll, so scroll once it is open.
  const onHash = () => jump(id(window.location.hash));
  // A frame later on arrival, so the folds are in place before the target's group is opened.
  const frame = requestAnimationFrame(() => jump(id(window.location.hash)));
  document.addEventListener('click', onClick, true);
  nav?.addEventListener('navigate', onNavigate);
  window.addEventListener('hashchange', onHash);
  return () => { cancelAnimationFrame(frame); late?.(); document.removeEventListener('click', onClick, true); nav?.removeEventListener('navigate', onNavigate); window.removeEventListener('hashchange', onHash); };
}
