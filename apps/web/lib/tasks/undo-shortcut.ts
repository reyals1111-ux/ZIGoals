/**
 * Session AL (P-LS-08, LS-072/LS-058/LS-075; L10b's condition): Ctrl+Z (⌘+Z on a Mac) runs the visible toast's Undo on
 * the pages that use the one toast (Tasks, the Checklist, Agenda, Notes, Journal). It never fires inside a text field, a
 * select or an editable area (they keep their own undo), with Shift or Alt held (redo and other shortcuts), or while a
 * dialog is open. Pure, so the rule itself is tested (lib/tasks/al-second-pass.test.ts).
 */
export type KeyLike = {key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented?: boolean};
export type TargetLike = {tagName?: string; isContentEditable?: boolean} | null | undefined;

/** True when the focus is somewhere text is typed. */
export const isTypingTarget = (t: TargetLike): boolean => !!t && (!!t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName ?? ''));
/** True when this key press is the page's Undo shortcut. */
export const isUndoShortcut = (e: KeyLike, target: TargetLike, dialogOpen = false): boolean =>
  !e.defaultPrevented && !dialogOpen && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z' && !isTypingTarget(target);
