'use client';
import {usePathname, useRouter} from 'next/navigation';
import {useLayoutEffect, useRef, useState} from 'react';
import {startHref} from '../../lib/pages/visibility';
import {pagesViewSnapshot} from '../../lib/pages/view-store';
import type {PagesView} from '../../lib/pages/schema';
import {documentAllowsCamera, healthNavigation} from '../../lib/health-navigation';
import {isAccountLocked} from '../../lib/account-session';

/**
 * The start page (Session W Part 2): when ZIGoals opens on a bare /app (the Home Screen app, a typed address, a bookmark
 * of Today) and the person chose another start page, or hid Today, it opens there instead. Only the document's first
 * route counts: an in-app link to Today always shows Today, and an address with a query or a hash is a deliberate link.
 * The choice is decided from the private settings once they open; until then the device's mirror predicts it, and a
 * predicted move keeps Today's content unrendered (`hold`) so nothing of it shows or starts. Unreadable settings never
 * move anything. The move replaces the history entry; into Health it is a document load like every other way into Health
 * (lib/health-navigation.ts), so its camera permission holds.
 */
export function useStartPage(state: 'pending' | 'ready' | 'unreadable', view: PagesView): boolean {
  const router = useRouter(), pathname = usePathname();
  const decided = useRef(false), [hold, setHold] = useState(false);
  useLayoutEffect(() => {
    if (decided.current) return;
    const {pathname: path, search, hash} = window.location;
    if (path !== '/app' || search || hash) { decided.current = true; setHold(false); return; }
    if (state === 'unreadable') { decided.current = true; setHold(false); return; }
    // The store's view, not this render's: the shell reports newly opened settings in a layout effect of this same commit.
    const target = startHref(pagesViewSnapshot());
    if (state === 'pending') { setHold(target !== '/app'); return; }
    decided.current = true;
    if (target === '/app') { setHold(false); return; }
    setHold(true);
    let accountOpen: boolean;
    try { accountOpen = !isAccountLocked(); } catch { accountOpen = false; }
    const document_ = healthNavigation({href: target, origin: window.location.origin, cameraAllowed: documentAllowsCamera(document), accountOpen, button: 0, modified: false, target: '', download: false});
    if (document_ === 'document') window.location.replace(target); else router.replace(target);
  }, [state, view, router]);
  // Arriving anywhere else ends the hold (the start page, or a page the person chose before the move).
  return hold && pathname === '/app';
}
