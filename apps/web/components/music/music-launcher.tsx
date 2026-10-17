'use client';
import {usePathname} from 'next/navigation';
import {Suspense, lazy, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {ambientState, serverAmbientState, subscribeAmbient} from '../../lib/audio/ambient-state';
import {isShown} from '../../lib/pages/visibility';
import {getAppStorage} from '../../lib/showcase-storage';
import {MUSIC_KEY} from '../../lib/w-device-keys';
import {usePagesView} from '../pages/use-pages-view';
import {usePhoneActive} from '../phone/use-phone-layout';
import {MUSIC_OPEN_EVENT} from './music-events';
import {useUiPrefs} from '../../lib/ui-prefs/use-ui-prefs';
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
/** Session AE (Part 2.5, ADR-027): the music button is ZIGi's twin; its glyph is drawn in ZIGi's nebula colours (cyan,
 *  violet, magenta, pink) as ZIGi's origami figure is, so the two circles read as one pair. */
const MusicNote = () => { const id = `mn${useId().replace(/[^a-zA-Z0-9]/g, '')}`; return <svg className="music-note" viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" focusable="false"><defs><linearGradient id={id} x1="3" y1="20" x2="21" y2="4" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#63e7ff"/><stop offset=".42" stopColor="#826cff"/><stop offset=".75" stopColor="#c664ff"/><stop offset="1" stopColor="#ff74be"/></linearGradient></defs><g fill={`url(#${id})`} stroke={`url(#${id})`} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6.4 20 4.1v2.7L9 9.1z" strokeWidth=".6"/><path d="M9.2 7.4v10.2M19.8 5.2v9.9" fill="none" strokeWidth="1.8"/><ellipse cx="6.7" cy="17.7" rx="3" ry="2.3" transform="rotate(-20 6.7 17.7)" strokeWidth=".4"/><ellipse cx="17.3" cy="15.4" rx="3" ry="2.3" transform="rotate(-20 17.3 15.4)" strokeWidth=".4"/></g><path d="M4.6 3.2l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" fill="#d9f6ff"/></svg>; };
export function MusicLauncher() {
  const [mounted, setMounted] = useState(false), [open, setOpen] = useState(false), [loaded, setLoaded] = useState(false), [mini, setMini] = useState(false);
  const pathname = usePathname() ?? '', shown = isShown(usePagesView(), 'music'), phone = usePhoneActive();
  const ambient = useSyncExternalStore(subscribeAmbient, ambientState, serverAmbientState), button = useRef<HTMLButtonElement>(null);
  // Session AB-Design (owner request 6): the button sits above ZIGi's and can be tucked into the screen's edge (zigoals:ui-prefs:v1).
  const prefs = useUiPrefs(), folded = prefs.loaded && !prefs.unreadable && !!prefs.data.musicFolded;
  const setFolded = (value: boolean) => { try { prefs.update(p => ({...p, musicFolded: value})); } catch { /* storage refused: stays as it is */ } };
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
  const close = useCallback(() => { setOpen(false); requestAnimationFrame(() => (button.current ?? document.querySelector<HTMLElement>('.music-mini-open') ?? document.querySelector<HTMLElement>('[data-testid="ai-launcher"] .ai-launcher-button') ?? document.querySelector<HTMLElement>('.phone-more-top'))?.focus({preventScroll: true})); }, []);
  if (!mounted || !shown || !pathname.startsWith('/app')) return null;
  return <>
    {mini ? <Suspense fallback={null}><MusicMini phone={phone} onOpen={open ? close : show} expanded={open}/></Suspense>
      : !phone && (folded
        ? <button ref={button} type="button" className="music-edge-tab" data-playing={ambient.playing ? '' : undefined} aria-label="Show the music button" onClick={() => setFolded(false)}><MusicNote/></button>
        : <div className="music-launcher-stack">
          <button ref={button} type="button" className="music-launcher" data-playing={ambient.playing ? '' : undefined} aria-haspopup="dialog" aria-expanded={open} aria-label={open ? 'Close the music player' : 'Open the music player'} onClick={() => open ? close() : show()}><MusicNote/></button>
          <button type="button" className="music-launcher-fold" aria-label="Tuck the music button away" data-tip="Tuck away" onClick={() => setFolded(true)}>
            <svg viewBox="0 0 12 22" width="12" height="22" aria-hidden="true" focusable="false"><defs><linearGradient id="music-fold-nebula" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--brand-cyan, #63e7ff)"/><stop offset=".5" stopColor="var(--brand-violet, #826cff)"/><stop offset="1" stopColor="var(--brand-magenta, #c664ff)"/></linearGradient></defs><path d="M3 3l6 8-6 8" fill="none" stroke="url(#music-fold-nebula)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>)}
    {loaded && <Suspense fallback={null}><MusicPanel open={open} onClose={close} phone={phone}/></Suspense>}
  </>;
}
