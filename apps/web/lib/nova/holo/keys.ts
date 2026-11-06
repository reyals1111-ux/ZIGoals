/**
 * Session AL Part 11, second pass (lane L8; ledger P-TK-41: TK-074, N-TK-29; L10a's request): when a key pressed on NOVA
 * is a single-key shortcut. Pure, no DOM: the dashboard passes the event and what it was typed into.
 * - Never inside a text field: an input, a text area, a select, anything editable, or an element whose role is a text box,
 *   search box, combo box or spin button.
 * - Never with Ctrl, ⌘ or Alt; never with Shift on a letter (Shift + C is a capital C, someone typing); never while an input
 *   method composes a character; never a key held down (auto-repeat).
 * - "?" (Shift + /) opens the list of shortcuts; "[" and "]" fold the side panels; a letter, a digit or "," is a dock key.
 * - Typing, not a shortcut (TK-074: words typed while no field had the focus opened Music): a dock key waits `BURST_MS`;
 *   a second letter within that time means the person is typing words, so both go to the command field instead.
 */
export type KeyLike = {key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean; isComposing?: boolean; repeat?: boolean};
export type TargetLike = {tagName?: string; isContentEditable?: boolean; role?: string | null} | null;
export const BURST_MS = 350;
const TEXT_ROLES = new Set(['textbox', 'searchbox', 'combobox', 'spinbutton']);

/** Whether keys pressed here are words (a field or anything editable), never shortcuts. */
export function isTextEntry(t: TargetLike): boolean {
  if (!t) return false;
  if (t.isContentEditable) return true;
  if (t.tagName && /^(INPUT|TEXTAREA|SELECT)$/i.test(t.tagName)) return true;
  return !!t.role && TEXT_ROLES.has(t.role.toLowerCase());
}

export type ShortcutKind = 'none' | 'help' | 'panel' | 'dock';
/** What a key is on NOVA's page (the caller has already ruled out text fields, the open chat and an open dialog). */
export function shortcutKind(e: KeyLike): ShortcutKind {
  if (e.isComposing || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return 'none';
  if (e.key === '?') return 'help';
  if (e.shiftKey) return 'none';
  if (e.key === '[' || e.key === ']') return 'panel';
  return /^[\p{L}\p{N},]$/u.test(e.key) ? 'dock' : 'none';
}
/** Whether a printable key starts or continues typed words (letters and digits; a comma or a bracket never does). */
export const typedLetter = (e: KeyLike): boolean => !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing && e.key.length === 1 && /^[\p{L}\p{N}]$/u.test(e.key);

/** One line per shortcut for the list ("?"): the key as written on screen and what it does. */
export function shortcutLines(entries: readonly {key: string; label: string; hidden?: boolean}[], {panels, persona}: {panels: boolean; persona: string}): {keys: string; does: string}[] {
  return [
    ...entries.filter(e => !e.hidden).map(e => ({keys: e.key.toUpperCase(), does: `Open ${e.label}`})),
    ...(panels ? [{keys: '[', does: 'Fold or show the left panel'}, {keys: ']', does: 'Show or hide Behind the intelligence'}] : []),
    {keys: '?', does: 'This list of shortcuts'},
  ].concat([{keys: 'Ctrl/⌘ + K', does: `Go to the field “What’s on your mind?”`}, {keys: 'Esc', does: `Leave fullscreen, close what is open, then leave ${persona}`}]);
}
