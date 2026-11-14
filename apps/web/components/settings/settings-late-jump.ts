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
