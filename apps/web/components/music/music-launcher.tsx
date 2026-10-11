'use client';
import {usePathname} from 'next/navigation';
import {Suspense, lazy, useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {ambientState, serverAmbientState, subscribeAmbient} from '../../lib/audio/ambient-state';
import {isShown} from '../../lib/pages/visibility';
import {getAppStorage} from '../../lib/showcase-storage';
import {MUSIC_KEY} from '../../lib/w-device-keys';
import {usePagesView} from '../pages/use-pages-view';
import {usePhoneActive} from '../phone/use-phone-layout';
import {MUSIC_OPEN_EVENT} from './music-events';
import './music-launcher.css';

/**
 * The music player's button (Session W Part 20): a round button at the bottom, on the side opposite ZIGi's, only while
 * "Music player" shows under Your pages & buttons (hidden by default for existing people; the Showcase shows it). The
 * panel and the mini-bar load on first use; until then this shell part reads one flag of this device's music record
 * (`zigoals:music:v1`, without its schema) and whether a focus sound plays. Today's widget, the phone's More sheet and
 * Settings → Music open the same panel. Session Z-Cloud Part 4.12 (persona item 12): on a phone ZIGi is the one floating
 * button; the player opens from ZIGi's "⋯" menu and the More sheet (the mini-bar, when chosen, stays).
 */
const MusicPanel = lazy(() => import('./music-panel'));
const MusicMini = lazy(() => import('./music-mini'));
function readMini(): boolean {
  try { const raw = getAppStorage().getItem(MUSIC_KEY), value = raw ? JSON.parse(raw) as {version?: unknown; mini?: unknown} : null; return !!value && value.version === 1 && value.mini === true; } catch { return false; }
}
export function MusicLauncher() {
  const [mounted, setMounted] = useState(false), [open, setOpen] = useState(false), [loaded, setLoaded] = useState(false), [mini, setMini] = useState(false);
  const pathname = usePathname() ?? '', shown = isShown(usePagesView(), 'music'), phone = usePhoneActive();
  const ambient = useSyncExternalStore(subscribeAmbient, ambientState, serverAmbientState), button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const read = () => setMini(readMini());
    queueMicrotask(() => { setMounted(true); read(); });
    const onSaved = (event: Event) => { const key = (event as CustomEvent<string>).detail; if (!key || key === MUSIC_KEY) read(); };
    window.addEventListener(ZIGI_STORE_EVENT, onSaved); window.addEventListener('storage', read); window.addEventListener(ACCOUNT_CHANGE, read);
    return () => { window.removeEventListener(ZIGI_STORE_EVENT, onSaved); window.removeEventListener('storage', read); window.removeEventListener(ACCOUNT_CHANGE, read); };
  }, []);
  const show = useCallback(() => { setLoaded(true); setOpen(true); }, []);
  useEffect(() => { const onOpen = () => { if (shown) show(); }; window.addEventListener(MUSIC_OPEN_EVENT, onOpen); return () => window.removeEventListener(MUSIC_OPEN_EVENT, onOpen); }, [shown, show]);
  useEffect(() => { if (!shown && open) queueMicrotask(() => setOpen(false)); }, [shown, open]);
  // On a phone the player opens from ZIGi's "⋯" menu or the More sheet (Session Z-Cloud Part 4.12), whose items are gone
  // once it shows, so focus returns to ZIGi's launcher there, or to More when ZIGi's button is not shown.
  const close = useCallback(() => { setOpen(false); requestAnimationFrame(() => (button.current ?? document.querySelector<HTMLElement>('.music-mini-open') ?? document.querySelector<HTMLElement>('[data-testid="ai-launcher"] .ai-launcher-button') ?? document.querySelector<HTMLElement>('.phone-more-button'))?.focus({preventScroll: true})); }, []);
  if (!mounted || !shown || !pathname.startsWith('/app')) return null;
  return <>
    {mini ? <Suspense fallback={null}><MusicMini phone={phone} onOpen={open ? close : show} expanded={open}/></Suspense>
      : !phone && <button ref={button} type="button" className="music-launcher" data-playing={ambient.playing ? '' : undefined} aria-haspopup="dialog" aria-expanded={open} aria-label={open ? 'Close the music player' : 'Open the music player'} onClick={() => open ? close() : show()}>
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M9 18V6l11-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0m11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0M9 10l11-2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>}
    {loaded && <Suspense fallback={null}><MusicPanel open={open} onClose={close} phone={phone}/></Suspense>}
  </>;
}
