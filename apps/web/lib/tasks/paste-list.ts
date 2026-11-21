/**
 * Session AV (owner follow-up 1, F-PASTE-LIST; Todoist's Quick Add of a pasted list): a pasted list read as one task per
 * line. Bullets, numbers and check boxes in front of a line are dropped ("- ", "* ", "• ", "1. ", "2) ", "[ ] ", "☐ ");
 * empty lines are skipped. Two lines or more make a list; one line is an ordinary paste. At most 50 tasks at once (the
 * rest are counted, never added unseen). Pure.
 */
export const PASTE_MAX = 50;
const LEAD = /^\s*(?:(?:[-*•–—+]|\d{1,3}[.)])\s+)?(?:\[[ xX]?\]\s*|[☐☑✓✔]\s*)?/;
export function pastedList(text: string): {lines: string[]; more: number} | null {
  const lines = text.split(/\r\n|\r|\n/).map(l => l.replace(LEAD, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (lines.length < 2) return null;
  return {lines: lines.slice(0, PASTE_MAX), more: Math.max(0, lines.length - PASTE_MAX)};
}
