'use client';
import {useEffect, useRef} from 'react';
import './chat-polish.css';

/**
 * ZIGi's keyboard shortcuts (Session V Part 10), opened with "?" while the focus is in the panel but not in a text
 * field. A small modal dialog that closes with Escape or its button and gives the focus back.
 */
export const SHORTCUTS: readonly [string, string][] = [
  ['⌘K / Ctrl+K', 'Open or close ZIGi'],
  ['Enter', 'Send the message'],
  ['Shift+Enter', 'A new line in the message'],
  ['/', 'Commands: /log, /ask, /plan, /review, /pack, /insights, /remember, /help'],
  ['↑ in an empty message box', 'Edit your last message'],
  ['Escape', 'Close the command list, this sheet or the panel'],
  ['?', 'These shortcuts'],
];
export function ShortcutsSheet({open, onClose}: {open: boolean; onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null), back = useRef<Element | null>(null);
  useEffect(() => {
    const d = dialog.current; if (!d) return;
    if (open && !d.open) { back.current = d.ownerDocument.activeElement; d.showModal(); }
    else if (!open && d.open) { d.close(); (back.current as HTMLElement | null)?.focus?.(); }
  }, [open]);
  // `data-ai-dialog`: part of the chat, so the launcher's sensitive-screen check does not take it for a page's sheet.
  return <dialog ref={dialog} data-ai-dialog="" className="ai-shortcuts" aria-labelledby="ai-shortcuts-title" onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}>
    <h3 id="ai-shortcuts-title">Keyboard shortcuts</h3>
    <dl className="ai-shortcuts-list">{SHORTCUTS.map(([keys, what]) => <div key={keys}><dt><kbd>{keys}</kbd></dt><dd>{what}</dd></div>)}</dl>
    <div className="ai-card-actions"><button type="button" className="secondary" onClick={onClose}>Close</button></div>
  </dialog>;
}
