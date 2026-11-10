'use client';
import {ZigiPartBoundary} from '../zigi/part-boundary';
import {usePathname} from 'next/navigation';
import {Suspense, lazy, useCallback, useEffect, useRef, useState} from 'react';
import {launcherApp} from '../../lib/ai/apps';
import {useCompactShell, usePhoneActive} from '../phone/use-phone-layout';
import {firstScreenControls, restLift} from './launcher-rest';
import {ZigiFigure} from '../zigi/zigi-figure';
import {useZigiState, zigiSignals, zigiState} from '../zigi/bus';
import {useAccountCleanup, useLauncherRecord, useZigiLook} from './use-launcher-record';
import {SENSITIVE_SELECTOR, isSensitiveScreen, useSensitiveScreen} from './use-sensitive-screen';
import {ZIGI_OPEN_EVENT} from '../zigi-door';
import {ASK_EVENT, LAUNCHER_SHOWN_ATTRIBUTE} from './ask';
import {usePagesView} from '../pages/use-pages-view';
import {isShown} from '../../lib/pages/visibility';
import './ai-launcher.css';
import {LAUNCHER_HOLD_MS, TALK_EVENT, TALK_PENDING, TALK_STOP_EVENT, type TalkOrigin, type TalkRequest} from './talk-events';
import {getAppStorage} from '../../lib/showcase-storage';
import {hideToast, showUndo} from '../ui/undo-toast';

/**
 * The ZIGi launcher (ADR-012, Part 6): a floating ZIGi button that opens the chat, an "Open <app>" pill without logos
 * where the person's AI has its own app, and a Hide control (undo for ten seconds, then "Show ZIGi" in Settings).
 * Client-only after mount. Hidden on sensitive screens, when the launcher is switched off, and on phones while a sheet
 * or the keyboard is open. ⌘/Ctrl+Shift+Z opens or closes the chat (Session AL, Q11: ⌘/Ctrl+K is the command menu now,
 * components/command-palette/, whose first row is "Ask ZIGi"). The chat bundle loads on the first open and stays mounted
 * afterwards so the conversation survives closing the panel. Focus returns here when the chat closes.
 * Follow-up part A: this file is the launcher shell that every app page ships; it reads the device record with the tiny
 * tolerant reader (launcher-record.ts) and the app table (apps.ts) only. The Zod schema, the key store, the chat store,
 * the setup, voice and proposals all arrive with the chat chunk, warmed on hover or focus and loaded on the first open.
 * Session V Part 12: pill, circle and a "Hide ZIGi" chevron below it are one control, on the side and at the size the
 * person chose in Customize; the figure is centred on its optical centre and breathes through CSS alone (Calm by
 * default, livelier with Full, still with Off, reduced motion or Motion Off). While hidden, a small "Show ZIGi" tab at
 * the screen's edge brings it back (on by default; outside the launcher's own test id).
 * Session AL (owner decision O3): below 901 px (phones and the tablet rail) nothing floats: no button and no edge tab.
 * ZIGi opens from the "Apps & extras" sheet (ZIGI_OPEN_EVENT, components/zigi-door.ts), ⌘/Ctrl+Shift+Z, the
 * command menu (⌘/Ctrl+K) and the pages' "Ask ZIGi";
 * the chevron's device hide is a computer's choice about the floating button and does not apply there. The panel, its
 * conversation and every rule about sensitive screens and the synced switch are the same at every width.
 */
const loadChat = () => import('./ai-chat');
// React's own lazy loading: the launcher renders only after mount, so the chunk is never asked for on the server.
const AiChat = lazy(loadChat);
const HIDE_UNDO_MS = 10_000;
/** Session V Part 13: the knock, loaded only once the person turned knocking on; Part 16: browser agents, only where the browser offers them. */
// Session AI (B1 CI): with knocking on, the knock's due rules (their own chunk, ADR-022 B41) load beside the companion
// instead of after it, so a slow page still shows a due knock in time (CI run 40394055893).
const ZigiCompanion = lazy(() => Promise.all([import('../zigi/companion'), import('../../lib/ai/knock/compute').catch(() => null)]).then(([m]) => m));
/** Session V Part 16: a browser that offers tools to AI agents (WebMCP); only there can the person's switch for them matter. */
const agentsOffered = () => [document, navigator].some(host => typeof (host as {modelContext?: {registerTool?: unknown}}).modelContext?.registerTool === 'function');
/**
 * Session Z-Cloud Part 3: the voice choices the launcher needs ("Tap ZIGi to talk", whether this browser's disclosure was
 * seen), read tolerantly from `zigoals:zigi-voice:v1` without its schema; anything unreadable means the defaults.
 */
function talkChoices(): {tapToTalk: boolean; used: boolean} {
  try { const v = JSON.parse(getAppStorage().getItem('zigoals:zigi-voice:v1') ?? 'null') as {tapToTalk?: unknown; disclosed?: Record<string, unknown>} | null; return {tapToTalk: v?.tapToTalk === true, used: !!v?.disclosed && Object.keys(v.disclosed).length > 0}; }
  catch { return {tapToTalk: false, used: false}; }
}
/** ZIGi greets once when the person comes back from a reminder notification (the worker's message or its address). */
/**
 * Session AL (ADR-037 Q6; L7's request): the parts of the sensitive rule that hold while something shows (an open dialog,
 * a private step, a shown secret), as opposed to a sensitive field that merely has the focus. Only these close an open
 * panel; a focused field leaves it open, paused ("On this private screen I read nothing from the page").
 */
const STANDING_SENSITIVE = SENSITIVE_SELECTOR.split(', ').filter(part => !part.includes(':focus')).join(', ');
const standingSensitive = (root: ParentNode = document): boolean => root.querySelector(STANDING_SENSITIVE) !== null;
/** Whether the screen is sensitive because of what it shows (not only a focused field); checked on the same signals as the rule. */
function useStandingSensitive(sensitive: boolean): boolean {
  const [standing, setStanding] = useState(false);
  useEffect(() => {
    if (!sensitive) return;
    let frame = 0;
    const check = () => { frame = 0; setStanding(standingSensitive()); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(check); };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['open', 'type', 'readonly', 'class']});
    return () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, [sensitive]);
  return sensitive && standing;
}
function greetOnce(): void {
  zigiState.set('greeting');
  window.setTimeout(() => { if (zigiState.get() === 'greeting') zigiState.set('idle'); }, 2500);
}
export function AiLauncher() {
  const [mounted, setMounted] = useState(false), [open, setOpen] = useState(false), [loaded, setLoaded] = useState(false);
  const launcher = useLauncherRecord(), {look, loaded: lookLoaded} = useZigiLook(), sensitive = useSensitiveScreen(), standing = useStandingSensitive(sensitive), phone = usePhoneActive(), compact = useCompactShell(), pathname = usePathname() ?? '', zigi = useZigiState();
  // Session W Part 2: the synced "ZIGi button" switch (Your pages & buttons) hides it on every device, edge tab and keys
  // included; the chevron below the button stays this device's own hide.
  const switchedOff = !isShown(usePagesView(), 'zigi'), hidden = (launcher.record.launcherHidden && !compact) || switchedOff;
  const button = useRef<HTMLButtonElement>(null), hideToastId = useRef<number | null>(null), warmed = useRef(false);
  const box = useRef<HTMLDivElement>(null), waves = useRef<HTMLSpanElement>(null);
  // Session Z-Cloud Part 3: a press held for LAUNCHER_HOLD_MS is push-to-talk (released: listening stops); a tap opens the
  // panel, or talks when the person chose "Tap ZIGi to talk". The composer starts listening inside the event's own task.
  const hold = useRef<{timer: number; held: boolean; down: number} | null>(null), heldClick = useRef(false);
  useEffect(() => { setMounted(true); }, []);
  useAccountCleanup(useCallback(() => setOpen(false), []));
  const toggle = useCallback(() => setOpen(current => !current), []);
  const requestTalk = useCallback((origin: TalkOrigin) => {
    const detail: TalkRequest = {origin};
    window.dispatchEvent(new CustomEvent(TALK_EVENT, {detail}));
    if (!detail.handled) (window as unknown as Record<string, unknown>)[TALK_PENDING] = true;
    setOpen(true);
  }, []);
  // The chunk is warmed on hover or focus and when the browser is idle after the person has interacted once; it mounts on the first open.
  const warm = useCallback(() => { if (warmed.current) return; warmed.current = true; void loadChat().catch(() => { warmed.current = false; }); }, []);
  // The bundle loads and ZIGi greets when the panel opens; both after the render, never inside a state updater.
  // The panel's open and close reach ZIGi once each (Phase 2: this effect fired twice on the first open, once for `open` and once for `loaded`, and the second "open" was cutting the greeting short).
  const wasOpen = useRef(false);
  useEffect(() => { if (open) setLoaded(true); if (open && !wasOpen.current) zigiSignals.emit('user_opened_panel'); else if (!open && wasOpen.current) zigiSignals.emit('user_closed_panel'); wasOpen.current = open; }, [open]);
  // Below 901 px there is no button: focus goes back to the "Apps & extras" button that opened the panel.
  const close = useCallback(() => { setOpen(false); requestAnimationFrame(() => (button.current ?? document.querySelector<HTMLElement>('[data-testid="apps-extras-button"]'))?.focus({preventScroll: true})); }, []);
  // Session V Part 14: the mini window's "Back to tab".
  const reopen = useCallback(() => setOpen(true), []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Session Z-Cloud Part 3: ⌘/Ctrl+Shift+Space talks to ZIGi (or stops listening) from any page.
      if (event.code === 'Space' && event.shiftKey && (event.metaKey || event.ctrlKey) && !event.altKey && !event.defaultPrevented) { if (hidden || sensitive) return; event.preventDefault(); requestTalk('shortcut'); return; }
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.defaultPrevented) return;
      const key = event.key.toLowerCase();
      // Session AL (Q11): ⌘/Ctrl+Shift+Z outside a text field closes the open panel (the command menu's host opens it and
      // leaves the key here while the panel shows; Redo in a text field stays Redo).
      if (key === 'z' && event.shiftKey) {
        const t = event.target;
        if (!open || (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) return;
        event.preventDefault(); close(); return;
      }
      // ⌘/Ctrl+K: the command menu's host takes it first (capture phase, preventDefault), so it reaches here only while a
      // dialog is open (ZIGi's own panel: it closes) or on NOVA when NOVA's field did not take it (the earlier toggle stays).
      if (key !== 'k' || event.shiftKey) return;
      if (hidden || sensitive) return;
      event.preventDefault(); toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sensitive, hidden, toggle, requestTalk, open, close]);
  // Session AL (Q6): a private step or dialog that shows closes the panel; a sensitive field that only has the focus pauses it.
  // CI17: only while it still shows (the state is read on the next frame; a sheet that closed just before ZIGi opened at
  // once must not close the panel again; the panel shows once the state has caught up).
  useEffect(() => { if (((standing && standingSensitive()) || switchedOff) && open) setOpen(false); }, [standing, switchedOff, open]);
  // A page's "Ask ZIGi about this" opens the panel (the composer takes the text); hidden or sensitive, nothing happens.
  useEffect(() => { const onAsk = () => { if (!hidden && !sensitive) setOpen(true); }; window.addEventListener(ASK_EVENT, onAsk); return () => window.removeEventListener(ASK_EVENT, onAsk); }, [hidden, sensitive]);
  // Session AL (O3): the "Apps & extras" sheet's ZIGi entry. The sheet has closed and the screen is checked again here, so a
  // sensitive form that appeared meanwhile still keeps ZIGi out.
  useEffect(() => { const onOpen = () => { if (!hidden && !isSensitiveScreen()) { warm(); setOpen(true); } }; window.addEventListener(ZIGI_OPEN_EVENT, onOpen); return () => window.removeEventListener(ZIGI_OPEN_EVENT, onOpen); }, [hidden, warm]);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('zigi') === 'hello') { url.searchParams.delete('zigi'); window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`); greetOnce(); }
    const onMessage = (event: MessageEvent) => { if (event.data?.type === 'zigoals:push-open') greetOnce(); };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, []);
  const hide = () => {
    zigiSignals.emit('companion_hidden'); // Session AK Part 12: a Studio-4 reaction once its art lands
    setOpen(false); launcher.setLauncherHidden(true);
    // Session AL (3e): the app's one Undo toast (components/ui/undo-toast.tsx) instead of the launcher's own.
    hideToastId.current = showUndo({message: look.edgeTab ? 'ZIGi is hidden. Show it again from the tab at the edge of the screen, or Settings → ZIGi · Your Personal AI Companion.' : 'ZIGi is hidden. Show it again from Settings → ZIGi · Your Personal AI Companion.',
      restore: () => { hideToastId.current = null; launcher.setLauncherHidden(false); requestAnimationFrame(() => requestAnimationFrame(() => button.current?.focus({preventScroll: true}))); }, undone: 'ZIGi is back.', timeoutMs: HIDE_UNDO_MS});
  };
  // The focus moves to ZIGi once the edge tab brought it back (the tab itself is gone by then).
  const showAgain = () => { launcher.setLauncherHidden(false); if (hideToastId.current !== null) { hideToast(hideToastId.current); hideToastId.current = null; } requestAnimationFrame(() => requestAnimationFrame(() => button.current?.focus({preventScroll: true}))); };
  // Session V Part 9: the page's "Ask ZIGi" affordances show only while this button does (CSS reads the root's mark).
  const shown = mounted && pathname.startsWith('/app') && launcher.loaded && !hidden && !sensitive;
  useEffect(() => { const root = document.documentElement; if (shown) root.dataset[LAUNCHER_SHOWN_ATTRIBUTE] = 'shown'; else delete root.dataset[LAUNCHER_SHOWN_ATTRIBUTE]; return () => { delete root.dataset[LAUNCHER_SHOWN_ATTRIBUTE]; }; }, [shown]);
  const visible = mounted && pathname.startsWith('/app') && launcher.loaded && lookLoaded && !hidden && !sensitive;
  // Session AL (Q6): the open panel stays while only a focused field makes the screen sensitive; it reads nothing then.
  const panelVisible = mounted && pathname.startsWith('/app') && launcher.loaded && lookLoaded && !hidden && !standing;
  // Session AL (O3): the floating button and its edge tab are a computer's only (the panel follows `visible`).
  const floating = visible && !compact;
  // Session X-Local Part 9, the owner's H7 (ADR-017 S81): on a phone, at the top of a page, the launcher rests where it
  // covers no first-screen control (lifted to the nearest free band, by a CSS variable); scrolled past the top it is back in
  // its corner. Placed on mount, after the page settles, on resize and on every route; measured against `main`'s controls.
  useEffect(() => {
    const el = box.current; if (!phone || !el) return;
    let frame = 0; const timers: number[] = [];
    const place = () => {
      if (window.scrollY > 40) { el.style.setProperty('--zigi-rest-lift', '0px'); return; }
      // Measured from the corner with the glide off for this frame (a rect read mid-transition would be the moving box), and
      // the new lift applied before the glide returns, so the launcher simply rests where it should; only the way back glides.
      const glide = el.style.transition; el.style.transition = 'none';
      el.style.setProperty('--zigi-rest-lift', '0px');
      const r = el.getBoundingClientRect();
      const lift = restLift({left: r.left, top: r.top, right: r.right, bottom: r.bottom}, firstScreenControls(document, window.innerHeight));
      el.style.setProperty('--zigi-rest-lift', `${lift}px`);
      void el.offsetWidth; el.style.transition = glide;
    };
    // Keyboard users: the moment anything in the page takes visible focus, the launcher is back in its corner at once (no
    // glide), where the phone's scroll padding keeps a focused control clear of it (ADR-016 X40); a lifted launcher could
    // otherwise sit over a focused control mid-screen (CI's WCAG 2.4.11 check on Today found two). It stays there for the page.
    // Session Y (ADR-018 Y44): a tap or click focuses without `:focus-visible` and leaves the launcher where it rests; moved
    // between the press and the release, it landed on the control being pressed and the tap was lost.
    let focused = false;
    const corner = () => { const glide = el.style.transition; el.style.transition = 'none'; el.style.setProperty('--zigi-rest-lift', '0px'); void el.offsetWidth; el.style.transition = glide; };
    const keyboardFocus = (t: Element) => { try { return t.matches(':focus-visible'); } catch { return true; } };
    const onFocus = (event: FocusEvent) => { const t = event.target; if (!(t instanceof Element) || el.contains(t) || !document.querySelector('main')?.contains(t) || !keyboardFocus(t)) return; focused = true; corner(); };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { if (focused) corner(); else place(); }); };
    document.addEventListener('focusin', onFocus);
    schedule(); for (const ms of [300, 1200, 3000]) timers.push(window.setTimeout(schedule, ms));
    window.addEventListener('scroll', schedule, {passive: true}); window.addEventListener('resize', schedule); window.addEventListener('load', schedule);
    // The page's first screen fills in after mount (parts load on demand, images arrive): every change to `main` places again.
    // Session AK CI-3 (WebKit, 390x844 Health): so does a change above `main` in the content column (the notice, the "still
    // opening" panel leaving), which moves `main`'s controls without changing `main` itself; the column's size says so.
    const main = document.querySelector('main') ?? document.body, column = main.closest('.app-content'), mutations = new MutationObserver(schedule), sizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    mutations.observe(main, {childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open']}); sizes?.observe(main); if (column) sizes?.observe(column);
    return () => { cancelAnimationFrame(frame); for (const t of timers) window.clearTimeout(t); mutations.disconnect(); sizes?.disconnect(); document.removeEventListener('focusin', onFocus); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); window.removeEventListener('load', schedule); el.style.removeProperty('--zigi-rest-lift'); };
  }, [phone, pathname, floating]);
  const edgeTab = !compact && mounted && pathname.startsWith('/app') && launcher.loaded && lookLoaded && launcher.record.launcherHidden && !switchedOff && look.edgeTab && !sensitive;
  // Session X-Local Part 1 (ADR-017 S7): once ZIGi is on screen and the browser is idle, the small alive chunk loads: the
  // state machine on every page and the frames each state shows. Never in the shell, never before ZIGi is visible.
  useEffect(() => {
    if (!visible && !edgeTab) return;
    let cancelled = false;
    let unsubscribe = () => {};
    const load = () => {
      if (cancelled) return;
      void import('../zigi/alive').then(m => { if (!cancelled) m.startZigiAlive(); }).catch(() => undefined);
      // Session Z-Cloud Part 3: the voice engine (small) for the launcher's waves; once the person has talked to ZIGi in this
      // browser, the chat too, so a hold or the shortcut can start listening inside the press.
      void import('./voice-engine').then(m => { if (cancelled) return; unsubscribe = m.voiceEngine().subscribe(s => { const el = waves.current; if (!el) return; const on = s.state === 'listening'; if (el.dataset.on !== String(on)) el.dataset.on = String(on); el.style.setProperty('--zigi-level', on ? s.level.toFixed(3) : '0'); }); }).catch(() => undefined);
      if (talkChoices().used) warm();
    };
    // Safari has no requestIdleCallback: a short timer stands in.
    const idle = typeof window.requestIdleCallback === 'function', handle = idle ? window.requestIdleCallback(load, {timeout: 2000}) : window.setTimeout(load, 800);
    return () => { cancelled = true; unsubscribe(); if (idle) window.cancelIdleCallback(handle); else window.clearTimeout(handle); };
  }, [visible, edgeTab, warm]);
  if (!mounted || !pathname.startsWith('/app')) return null;
  const app = launcherApp(launcher.record), agents = agentsOffered();
  return <>
    {floating && <div ref={box} className={`ai-launcher${phone ? ' ai-launcher-phone' : ''}`} data-testid="ai-launcher" data-glass-off="" data-side={look.side} data-size={look.size}>
      {app && <a className="ai-launcher-pill" href={app.url} target="_blank" rel="noopener noreferrer">Open {app.name} ↗</a>}
      <div className="ai-launcher-stack">
        <span className="ai-launcher-ring">
        <span ref={waves} className="zigi-waves" data-on="false" aria-hidden="true"><i/><i/><i/><b className="zigi-level-bar"/></span>
        <button ref={button} type="button" className="ai-launcher-button" aria-label={open ? 'Close ZIGi, your personal AI companion' : 'Open ZIGi, your personal AI companion (⌘/Ctrl+Shift+Z; hold to talk)'} aria-haspopup="dialog" aria-expanded={open}
          onClick={() => { if (heldClick.current) { heldClick.current = false; return; } if (!open && talkChoices().tapToTalk) requestTalk('launcher'); else toggle(); }}
          onPointerDown={event => { heldClick.current = false; if (event.button !== 0) return; warm(); try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* an old browser keeps the plain events */ } const h = {timer: 0, held: false, down: performance.now()}; h.timer = window.setTimeout(() => { h.held = true; heldClick.current = true; requestTalk('launcher'); }, LAUNCHER_HOLD_MS); hold.current = h; }}
          // Session AL (CI_INTERMITTENTS Fix 2): a busy main thread can deliver the release before the hold timer (WebKit,
          // zigi-voice-z:221); the press's own length decides, so a hold stays a hold. A cancelled press is never one.
          onPointerUp={() => { const h = hold.current; hold.current = null; if (!h) return; window.clearTimeout(h.timer); if (!h.held && performance.now() - h.down >= LAUNCHER_HOLD_MS) { h.held = true; heldClick.current = true; requestTalk('launcher'); } if (h.held) window.dispatchEvent(new Event(TALK_STOP_EVENT)); }}
          onPointerCancel={() => { const h = hold.current; hold.current = null; if (!h) return; window.clearTimeout(h.timer); if (h.held) window.dispatchEvent(new Event(TALK_STOP_EVENT)); }}
          onContextMenu={event => event.preventDefault()} onPointerEnter={warm} onFocus={warm} data-state={zigi}>
          <ZigiFigure state={zigi}/>
        </button>
        </span>
        <button type="button" className="ai-launcher-hide" aria-label="Hide ZIGi" data-tip="Hide ZIGi" onClick={hide}>
          <svg viewBox="0 0 22 12" width="22" height="12" aria-hidden="true" focusable="false"><defs><linearGradient id="zigi-chevron-nebula" x1="0" x2="1" y1="0" y2="0"><stop offset="0"/><stop offset=".5"/><stop offset="1"/></linearGradient></defs><path d="M3 3l8 6 8-6" fill="none" stroke="url(#zigi-chevron-nebula)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>}
    {edgeTab && <button type="button" className={`ai-edge-tab${phone ? ' ai-edge-tab-phone' : ''}`} data-side={look.side} aria-label="Show ZIGi" onClick={showAgain}><ZigiFigure state="peek"/></button>}
    {loaded && <ZigiPartBoundary label="ZIGi's chat" className="ai-launcher-toast"><Suspense fallback={null}><AiChat open={open && panelVisible} onClose={close} onOpen={reopen} sensitive={sensitive} phone={phone}/></Suspense></ZigiPartBoundary>}
    {/* Session AL (CI 1539, zigi-browser-agents): browser agents follow ZIGi's own visibility, so below 901 px (ZIGi in Apps & extras) the tools are offered too; the knock keeps to the floating launcher through `away` (Q8). */}
    {lookLoaded && (look.knock || agents) && <ZigiPartBoundary quiet><Suspense fallback={null}><ZigiCompanion knock={look.knock} agents={agents} away={!floating || open} visible={visible} sensitive={sensitive} phone={phone} side={look.side} onPropose={reopen}/></Suspense></ZigiPartBoundary>}
  </>;
}
