'use client';
import {usePathname} from 'next/navigation';
import {Suspense, lazy, useCallback, useEffect, useRef, useState} from 'react';
import {launcherApp} from '../../lib/ai/apps';
import {usePhoneActive} from '../phone/use-phone-layout';
import {ZigiFigure} from '../zigi/zigi-figure';
import {useZigiState, zigiSignals, zigiState} from '../zigi/bus';
import {useAccountCleanup, useLauncherRecord, useZigiLook} from './use-launcher-record';
import {useSensitiveScreen} from './use-sensitive-screen';
import {ASK_EVENT, LAUNCHER_SHOWN_ATTRIBUTE} from './ask';
import {usePagesView} from '../pages/use-pages-view';
import {isShown} from '../../lib/pages/visibility';
import './ai-launcher.css';

/**
 * The ZIGi launcher (ADR-012, Part 6): a floating ZIGi button that opens the chat, an "Open <app>" pill without logos
 * where the person's AI has its own app, and a Hide control (undo for ten seconds, then "Show ZIGi" in Settings).
 * Client-only after mount. Hidden on sensitive screens, when the launcher is switched off, and on phones while a sheet
 * or the keyboard is open. ⌘K / Ctrl+K toggles the chat. The chat bundle loads on the first open and stays mounted
 * afterwards so the conversation survives closing the panel. Focus returns here when the chat closes.
 * Follow-up part A: this file is the launcher shell that every app page ships; it reads the device record with the tiny
 * tolerant reader (launcher-record.ts) and the app table (apps.ts) only. The Zod schema, the key store, the chat store,
 * the setup, voice and proposals all arrive with the chat chunk, warmed on hover or focus and loaded on the first open.
 * Session V Part 12: pill, circle and a "Hide ZIGi" chevron below it are one control, on the side and at the size the
 * person chose in Customize; the figure is centred on its optical centre and breathes through CSS alone (Calm by
 * default, livelier with Full, still with Off, reduced motion or Motion Off). While hidden, a small "Show ZIGi" tab at
 * the screen's edge brings it back (on by default; outside the launcher's own test id).
 */
const loadChat = () => import('./ai-chat');
// React's own lazy loading: the launcher renders only after mount, so the chunk is never asked for on the server.
const AiChat = lazy(loadChat);
const HIDE_UNDO_MS = 10_000;
/** Session V Part 13: the knock, loaded only once the person turned knocking on; Part 16: browser agents, only where the browser offers them. */
const ZigiCompanion = lazy(() => import('../zigi/companion'));
/** Session V Part 16: a browser that offers tools to AI agents (WebMCP); only there can the person's switch for them matter. */
const agentsOffered = () => [document, navigator].some(host => typeof (host as {modelContext?: {registerTool?: unknown}}).modelContext?.registerTool === 'function');
/** ZIGi greets once when the person comes back from a reminder notification (the worker's message or its address). */
function greetOnce(): void {
  zigiState.set('greeting');
  window.setTimeout(() => { if (zigiState.get() === 'greeting') zigiState.set('idle'); }, 2500);
}
export function AiLauncher() {
  const [mounted, setMounted] = useState(false), [open, setOpen] = useState(false), [loaded, setLoaded] = useState(false), [undoUntil, setUndoUntil] = useState<number | null>(null);
  const launcher = useLauncherRecord(), {look, loaded: lookLoaded} = useZigiLook(), sensitive = useSensitiveScreen(), phone = usePhoneActive(), pathname = usePathname() ?? '', zigi = useZigiState();
  // Session W Part 2: the synced "ZIGi button" switch (Your pages & buttons) hides it on every device, edge tab and ⌘K
  // included; the chevron below the button stays this device's own hide.
  const switchedOff = !isShown(usePagesView(), 'zigi'), hidden = launcher.record.launcherHidden || switchedOff;
  const button = useRef<HTMLButtonElement>(null), timer = useRef<number | null>(null), warmed = useRef(false);
  useEffect(() => { setMounted(true); }, []);
  useAccountCleanup(useCallback(() => setOpen(false), []));
  const toggle = useCallback(() => setOpen(current => !current), []);
  // The chunk is warmed on hover or focus and when the browser is idle after the person has interacted once; it mounts on the first open.
  const warm = useCallback(() => { if (warmed.current) return; warmed.current = true; void loadChat().catch(() => { warmed.current = false; }); }, []);
  // The bundle loads and ZIGi greets when the panel opens; both after the render, never inside a state updater.
  useEffect(() => { if (open) { setLoaded(true); zigiSignals.emit('user_opened_panel'); } else if (loaded) zigiSignals.emit('user_closed_panel'); }, [open, loaded]);
  const close = useCallback(() => { setOpen(false); requestAnimationFrame(() => button.current?.focus({preventScroll: true})); }, []);
  // Session V Part 14: the mini window's "Back to tab".
  const reopen = useCallback(() => setOpen(true), []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.defaultPrevented) return;
      if (hidden || sensitive) return;
      event.preventDefault(); toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sensitive, hidden, toggle]);
  useEffect(() => { if ((sensitive || switchedOff) && open) setOpen(false); }, [sensitive, switchedOff, open]);
  // A page's "Ask ZIGi about this" opens the panel (the composer takes the text); hidden or sensitive, nothing happens.
  useEffect(() => { const onAsk = () => { if (!hidden && !sensitive) setOpen(true); }; window.addEventListener(ASK_EVENT, onAsk); return () => window.removeEventListener(ASK_EVENT, onAsk); }, [hidden, sensitive]);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('zigi') === 'hello') { url.searchParams.delete('zigi'); window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`); greetOnce(); }
    const onMessage = (event: MessageEvent) => { if (event.data?.type === 'zigoals:push-open') greetOnce(); };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, []);
  const hide = () => {
    setOpen(false); launcher.setLauncherHidden(true); setUndoUntil(Date.now() + HIDE_UNDO_MS);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { timer.current = null; setUndoUntil(null); }, HIDE_UNDO_MS);
  };
  const undoHide = () => { launcher.setLauncherHidden(false); setUndoUntil(null); if (timer.current) { window.clearTimeout(timer.current); timer.current = null; } requestAnimationFrame(() => button.current?.focus({preventScroll: true})); };
  // The focus moves to ZIGi once the edge tab brought it back (the tab itself is gone by then).
  const showAgain = () => { launcher.setLauncherHidden(false); setUndoUntil(null); requestAnimationFrame(() => requestAnimationFrame(() => button.current?.focus({preventScroll: true}))); };
  // Session V Part 9: the page's "Ask ZIGi" affordances show only while this button does (CSS reads the root's mark).
  const shown = mounted && pathname.startsWith('/app') && launcher.loaded && !hidden && !sensitive;
  useEffect(() => { const root = document.documentElement; if (shown) root.dataset[LAUNCHER_SHOWN_ATTRIBUTE] = 'shown'; else delete root.dataset[LAUNCHER_SHOWN_ATTRIBUTE]; return () => { delete root.dataset[LAUNCHER_SHOWN_ATTRIBUTE]; }; }, [shown]);
  const visible = mounted && pathname.startsWith('/app') && launcher.loaded && lookLoaded && !hidden && !sensitive;
  const edgeTab = mounted && pathname.startsWith('/app') && launcher.loaded && lookLoaded && launcher.record.launcherHidden && !switchedOff && look.edgeTab && !sensitive;
  // Session X-Local Part 1 (ADR-017 S7): once ZIGi is on screen and the browser is idle, the small alive chunk loads: the
  // state machine on every page and the frames each state shows. Never in the shell, never before ZIGi is visible.
  useEffect(() => {
    if (!visible && !edgeTab) return;
    let cancelled = false;
    const load = () => { if (!cancelled) void import('../zigi/alive').then(m => { if (!cancelled) m.startZigiAlive(); }).catch(() => undefined); };
    // Safari has no requestIdleCallback: a short timer stands in.
    const idle = typeof window.requestIdleCallback === 'function', handle = idle ? window.requestIdleCallback(load, {timeout: 2000}) : window.setTimeout(load, 800);
    return () => { cancelled = true; if (idle) window.cancelIdleCallback(handle); else window.clearTimeout(handle); };
  }, [visible, edgeTab]);
  if (!mounted || !pathname.startsWith('/app')) return null;
  const app = launcherApp(launcher.record), agents = agentsOffered();
  return <>
    {visible && <div className={`ai-launcher${phone ? ' ai-launcher-phone' : ''}`} data-testid="ai-launcher" data-glass-off="" data-side={look.side} data-size={look.size}>
      {app && <a className="ai-launcher-pill" href={app.url} target="_blank" rel="noopener noreferrer">Open {app.name} ↗</a>}
      <div className="ai-launcher-stack">
        <button ref={button} type="button" className="ai-launcher-button" aria-label={open ? 'Close ZIGi, your AI' : 'Open ZIGi, your AI (⌘K or Ctrl+K)'} aria-haspopup="dialog" aria-expanded={open} onClick={toggle} onPointerEnter={warm} onFocus={warm} data-state={zigi}>
          <ZigiFigure state={zigi}/>
        </button>
        <button type="button" className="ai-launcher-hide" aria-label="Hide ZIGi" data-tip="Hide ZIGi" onClick={hide}>
          <svg viewBox="0 0 22 12" width="22" height="12" aria-hidden="true" focusable="false"><defs><linearGradient id="zigi-chevron-nebula" x1="0" x2="1" y1="0" y2="0"><stop offset="0"/><stop offset=".5"/><stop offset="1"/></linearGradient></defs><path d="M3 3l8 6 8-6" fill="none" stroke="url(#zigi-chevron-nebula)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>}
    {edgeTab && <button type="button" className={`ai-edge-tab${phone ? ' ai-edge-tab-phone' : ''}`} data-side={look.side} aria-label="Show ZIGi" onClick={showAgain}><ZigiFigure state="peek"/></button>}
    {undoUntil !== null && <div className="ai-launcher-toast" role="status"><span>{look.edgeTab ? 'ZIGi is hidden. Show it again from the tab at the edge of the screen, or Settings → ZIGi · your AI.' : 'ZIGi is hidden. Show it again from Settings → ZIGi · your AI.'}</span><button type="button" className="secondary" onClick={undoHide}>Undo</button></div>}
    {loaded && <Suspense fallback={null}><AiChat open={open && visible} onClose={close} onOpen={reopen} sensitive={sensitive} phone={phone}/></Suspense>}
    {lookLoaded && (look.knock || agents) && <Suspense fallback={null}><ZigiCompanion knock={look.knock} agents={agents} away={!visible || open} visible={visible} sensitive={sensitive} phone={phone} side={look.side} onPropose={reopen}/></Suspense>}
  </>;
}
