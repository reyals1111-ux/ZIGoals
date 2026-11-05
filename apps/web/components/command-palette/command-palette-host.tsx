'use client';
import {Suspense, lazy, useEffect, useRef, useState} from 'react';
import {LoadBoundary} from '../load-boundary';
import {openZigiPanel} from '../zigi-door';
import {isSensitiveScreen} from '../ai/use-sensitive-screen';

/**
 * Session AL fourth pass (LS-H36, C-LS-22): the command palette's keys, mounted once by the shell beside the Search host.
 * - Ctrl/⌘+K opens (or closes) the command palette: pages, Quick add, a new task, recent tasks, Search and ZIGi — on
 *   every page and from inside a text field, as Todoist's and TickTick's do. Not on NOVA, whose command field keeps ⌘K,
 *   and not over another dialog (ZIGi's own panel keeps Ctrl/⌘+K to close itself).
 * - Ctrl/⌘+Shift+Z is ZIGi's own shortcut now (Z for ZIGi); the palette's "Ask ZIGi" row does the same. While ZIGi's panel
 *   is open the key is left to the launcher, which closes it (Session AL, Q11).
 * - Not on a private screen either (a sign-in, unlock or recovery form, a sensitive field with the focus): the keys do nothing.
 * The keys are read in the capture phase and taken (preventDefault), so ZIGi's older Ctrl/⌘+K listener leaves them.
 * The palette itself loads at its first open.
 */
const CommandPalette = lazy(() => import('./command-palette'));
export const COMMAND_PALETTE_EVENT = 'zigoals:command-palette';
export const openCommandPalette = () => window.dispatchEvent(new Event(COMMAND_PALETTE_EVENT));
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
let hosts = 0;

export function CommandPaletteHost() {
  const [open, setOpen] = useState(false), openRef = useRef(false);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => {
    if (++hosts > 1) return () => { hosts--; }; // one host per page, wherever it is mounted
    const onKey = (e: KeyboardEvent) => {
      // CI12: an Escape pressed while the menu is still loading closes it too (the loaded menu handles its own Escape).
      if (e.key === 'Escape' && openRef.current && !document.querySelector('dialog.command-palette[open]')) { setOpen(false); return; }
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.defaultPrevented) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && e.shiftKey) {
        // Redo in a text field stays Redo, except in the menu's own search field, whose footer offers this key for ZIGi (CI12).
        if (typing(e.target) && !(e.target as HTMLElement).closest('dialog.command-palette')) return;
        if (document.querySelector('dialog.ai-chat[open]')) return; // the launcher closes the open panel
        e.preventDefault(); setOpen(false); void openZigiPanel(); return;
      }
      if (key !== 'k' || e.shiftKey) return;
      if (window.location.pathname.startsWith('/app/nova')) return;
      const palette = document.querySelector('dialog.command-palette[open]');
      if (document.querySelector('dialog[open]:not(.command-palette)') || (!palette && isSensitiveScreen())) return;
      e.preventDefault(); setOpen(o => !o);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener(COMMAND_PALETTE_EVENT, onOpen);
    return () => { hosts--; window.removeEventListener('keydown', onKey, true); window.removeEventListener(COMMAND_PALETTE_EVENT, onOpen); };
  }, []);
  // Offline before its first use the palette cannot load: the page stays as it is (LoadBoundary, quiet).
  return open ? <LoadBoundary quiet><Suspense fallback={null}><CommandPalette onClose={() => setOpen(false)} /></Suspense></LoadBoundary> : null;
}
export default CommandPaletteHost;
