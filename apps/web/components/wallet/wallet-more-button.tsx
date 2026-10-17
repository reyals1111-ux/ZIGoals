'use client';
import {Suspense, lazy, useCallback, useEffect, useId, useRef, useState} from 'react';

/** The menu itself is its own chunk, loaded on the first open, so the shell's first load barely grows. */
const WalletMenu = lazy(() => import('./wallet-menu'));

/**
 * Session AE (Part 6, ADR-027): the ▾ beside "Connect Keplr" in the status row (computers; phones show the same choices in
 * the Status & wallet sheet). A 44 px menu button: ArrowDown or a click opens the menu, Escape or a click outside closes
 * it and the focus comes back here. Off in the Showcase, like Connect Keplr, since the Showcase keeps its simulated wallet.
 */
export function WalletMoreButton({disabled}: {disabled: boolean}) {
  const [open, setOpen] = useState(false), id = useId(), root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const shown = open && !disabled;
  const close = useCallback((focus: boolean) => { setOpen(false); if (focus) trigger.current?.focus({preventScroll: true}); }, []);
  useEffect(() => {
    if (!shown) return;
    const away = (event: PointerEvent) => {
      if (root.current?.contains(event.target as Node)) return;
      setOpen(false);
      // A click on something that takes focus keeps it; otherwise the focus comes back to the button, not to the page.
      requestAnimationFrame(() => { if (!document.activeElement || document.activeElement === document.body) trigger.current?.focus({preventScroll: true}); });
    };
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
  }, [shown]);
  return <div ref={root} className="wallet-more" onKeyDown={event => { if (event.key === 'Escape' && shown) { event.preventDefault(); event.stopPropagation(); close(true); } }}>
    <button ref={trigger} type="button" className="secondary wallet-more-trigger" aria-label="More wallets" aria-haspopup="menu" aria-expanded={shown} aria-controls={shown ? id : undefined} disabled={disabled}
      title={disabled ? 'The Showcase keeps its simulated wallet' : 'More wallets: Keplr, other wallets read-only, Bitcoin watch-only'}
      onClick={() => setOpen(o => !o)} onKeyDown={event => { if (event.key === 'ArrowDown' && !shown) { event.preventDefault(); setOpen(true); } }}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
    {shown && <Suspense fallback={null}><WalletMenu variant="menu" id={id} onClose={close}/></Suspense>}
  </div>;
}
