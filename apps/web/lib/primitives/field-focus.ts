import {readLoopLevel} from '../motion-loops/loops';

/**
 * Session AL (3d, BUG-009, TK-024, DV-016): an error is seen where its field is. After a failed submit the first invalid
 * field (in the page's order, not the order the checks ran) is scrolled to the middle of the screen and takes the focus,
 * so its message, rendered right under it, is in view and read with it. Smooth only at the Full motion level; under
 * Calm, Off or the device's reduced motion the page jumps. A field inside a closed <details> is opened first.
 */
export function stillScroll(): boolean {
  return readLoopLevel() !== 'full';
}

/** Scrolls `el` into view (centred) and focuses it without a second jump. */
export function revealField(el: HTMLElement): void {
  for (let at = el.parentElement; at; at = at.parentElement) if (at instanceof HTMLDetailsElement && !at.open && !el.closest('summary')) at.open = true;
  try { el.scrollIntoView({block: 'center', inline: 'nearest', behavior: stillScroll() ? 'auto' : 'smooth'}); } catch { /* an old engine without options */ }
  try { el.focus({preventScroll: true}); } catch { el.focus(); }
}

/** The first of these ids in document order that can take the focus, revealed; null when none is on the page. */
export function focusFirstInvalid(ids: readonly string[], root: Document = document): HTMLElement | null {
  const found = ids.map(id => root.getElementById(id)).filter((el): el is HTMLElement => el instanceof HTMLElement && !el.hasAttribute('disabled') && !el.closest('[inert]'));
  if (!found.length) return null;
  found.sort((a, b) => a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  revealField(found[0]!);
  return found[0]!;
}
