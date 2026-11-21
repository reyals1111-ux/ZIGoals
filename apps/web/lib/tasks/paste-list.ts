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
/**
 * Session AV (1c, q1 #17, fresh-agent review; Todoist's pasted outline): the same list with its indentation kept, so an
 * indented line becomes a subtask of the nearest line above it that is less indented ("- Trip\n  - Book the train").
 * `parents[i]` is the index of line i's parent, or null for a top-level line. A tab counts as four spaces. Pure.
 */
export function pastedOutline(text: string): {lines: string[]; parents: (number | null)[]; more: number} | null {
  const rows = text.split(/\r\n|\r|\n/).map(raw => ({indent: /^[ \t]*/.exec(raw)![0].replace(/\t/g, '    ').length, line: raw.replace(LEAD, '').replace(/\s+/g, ' ').trim()})).filter(r => r.line);
  if (rows.length < 2) return null;
  const kept = rows.slice(0, PASTE_MAX), parents: (number | null)[] = [], stack: {indent: number; index: number}[] = [];
  kept.forEach((r, i) => {
    while (stack.length && stack.at(-1)!.indent >= r.indent) stack.pop();
    parents.push(stack.at(-1)?.index ?? null);
    stack.push({indent: r.indent, index: i});
  });
  return {lines: kept.map(r => r.line), parents, more: Math.max(0, rows.length - PASTE_MAX)};
}
/**
 * Session AV (1c, q1 #17): one typed line naming several short things ("melk, brood en eieren", "Call the bank; book the
 * dentist; pay rent") read as one task each, for the add field to OFFER ("Make 3 tasks"), never to do by itself. Split at
 * semicolons and at commas that are not inside a number ("1,5 uur"); with a comma, a last "and"/"en" splits too. Two to
 * twenty parts, each one to eight words. Null otherwise. Pure.
 */
export function lineList(text: string): string[] | null {
  if (/[\r\n]/.test(text) || !/[;,]/.test(text)) return null;
  const parts = text.split(/\s*;\s*|\s*(?<!\d),(?!\d)\s*|\s*,\s+/).map(p => p.trim());
  if (/,/.test(text) && parts.length >= 2) { const last = parts.pop()!, split = last.split(/\s+(?:and|en|&)\s+/i); parts.push(...(split.length === 2 ? split : [last])); }
  const items = parts.filter(Boolean);
  if (items.length < 2 || items.length > 20 || items.length !== parts.length) return null;
  return items.every(p => p.split(/\s+/).length <= 8) ? items : null;
}
