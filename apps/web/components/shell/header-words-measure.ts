
/**
 * Session AO (D-070, DV-247, DV-223; owner decision 13 Nov): the header's icon buttons show a short visible word beside
 * their icon wherever it fits, on every width from 388 px up: in the status row the Game layer rocket ("Game layer") and
 * the layout lock ("Unlock layout" / "Lock layout"); in the phone's top bar the wallet shortcut ("Wealth"). Their
 * accessible names are unchanged and contain the word (WCAG 2.5.3). Where a word would make its row spill past its edge
 * or wrap onto a second line, the icons stay alone, as before; every target stays at least 44 px.
 *
 * As served, the icons alone (so the first paint never spills or wraps). Each measure tries the words and keeps them only
 * if the row still fits, in one synchronous step (the try is never painted). Measured on the row's own size changes, when
 * its buttons change (the lock portals in after hydration, the lock's word changes when it opens) and once the fonts load;
 * never per frame.
 */
export const WORDS_ATTR = 'data-words';

/** Whether the row's own boxes stay inside it, on the line(s) they held without the words. */
function rowFits(row: HTMLElement, height: number) {
  const box = row.getBoundingClientRect();
  if (row.offsetHeight > height + 1 || row.scrollWidth > row.clientWidth + 1) return false;
  for (const child of Array.from(row.children) as HTMLElement[]) {
    if (!child.getClientRects().length) continue;
    const r = child.getBoundingClientRect();
    if (r.width && (r.right > box.right + .5 || r.left < box.left - .5)) return false;
  }
  return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
}

/** Tries the words on `target` (the attribute that shows them) and keeps them only if `row` still fits. */
function tryWords(target: HTMLElement, row: HTMLElement) {
  if (!row.getClientRects().length) return;
  const pageSpill = document.documentElement.scrollWidth > document.documentElement.clientWidth;
  target.removeAttribute(WORDS_ATTR);
  // A page that already scrolls sideways for another reason never takes the words away from the row.
  const height = row.offsetHeight;
  target.setAttribute(WORDS_ATTR, '');
  const fits = pageSpill ? row.offsetHeight <= height + 1 && row.scrollWidth <= row.clientWidth + 1 : rowFits(row, height);
  if (!fits) target.removeAttribute(WORDS_ATTR);
}

/** Starts measuring the status row; returns the stop. */
export function watchStatusRow(row: HTMLElement): () => void {
  let alive = true;
  const measure = () => { if (alive) tryWords(row, row); };
  measure();
  // The row's width follows the window; its height changes only if it wraps, which a measure undoes in the same step.
  const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
  ro?.observe(row);
  // The lock and a page's own tools portal in after hydration, and the lock's word changes when it opens: a mutation is
  // measured before the next paint. (Only the words' attribute changes in a measure, and attributes are not observed.)
  const mo = typeof MutationObserver === 'undefined' ? null : new MutationObserver(measure);
  mo?.observe(row, {childList: true, subtree: true, characterData: true});
  void document.fonts?.ready.then(measure, () => {});
  return () => { alive = false; ro?.disconnect(); mo?.disconnect(); };
}
/** Starts measuring the phone top bar's wallet word; returns the stop. */
export function watchTopBar(link: HTMLElement, row: HTMLElement, actions: HTMLElement | null): () => void {
  let frame = 0;
  const measure = () => { frame = 0; tryWords(link, row); };
  // The bar's buttons change size inside their own observer callbacks (the Checklist pill), so a measure waits for the
  // next frame instead of resizing an observed box inside this one's callback.
  const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
  measure();
  const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
  ro?.observe(row); if (actions) ro?.observe(actions);
  void document.fonts?.ready.then(schedule, () => {});
  return () => { cancelAnimationFrame(frame); frame = -1; ro?.disconnect(); };
}
