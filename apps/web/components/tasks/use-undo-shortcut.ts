'use client';
import {useEffect, type RefObject} from 'react';
import {isUndoShortcut} from '../../lib/tasks/undo-shortcut';

/**
 * Session AL (P-LS-08): Ctrl/⌘+Z presses the visible toast's Undo button (the one toast, components/ui/undo-toast.tsx),
 * never inside a text field or while a dialog is open. The button does what a click does, so the same restore runs.
 */
export function useUndoShortcut({enabled = true, page}: {enabled?: boolean; /** A page that is itself a dialog (the Checklist): its own element does not count as an open dialog. */ page?: RefObject<HTMLElement | null>} = {}) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const dialog = [...document.querySelectorAll('dialog[open], [aria-modal="true"]')].some(d => d !== page?.current);
      if (!isUndoShortcut(e, e.target as HTMLElement | null, dialog)) return;
      const undo = document.querySelector<HTMLButtonElement>('.aa-toast .aa-toast-undo:not([disabled])');
      if (undo) { e.preventDefault(); undo.click(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, page]);
}
