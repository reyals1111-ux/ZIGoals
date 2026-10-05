'use client';
import {usePathname} from 'next/navigation';
import {Suspense, lazy, useCallback, useEffect, useRef, useState} from 'react';
import {launcherApp} from '../../lib/ai/apps';
import {usePhoneActive} from '../phone/use-phone-layout';
import {ZigiAvatar} from '../zigi/zigi-avatar';
import {useZigiState, zigiEvents} from '../zigi/events';
import {useAccountCleanup, useLauncherRecord} from './use-launcher-record';
import {useSensitiveScreen} from './use-sensitive-screen';
import {ASK_EVENT} from './ask';
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
 */
const loadChat = () => import('./ai-chat');
// React's own lazy loading: the launcher renders only after mount, so the chunk is never asked for on the server.
const AiChat = lazy(loadChat);
const HIDE_UNDO_MS = 10_000;
export function AiLauncher() {
  const [mounted, setMounted] = useState(false), [open, setOpen] = useState(false), [loaded, setLoaded] = useState(false), [undoUntil, setUndoUntil] = useState<number | null>(null);
  const launcher = useLauncherRecord(), sensitive = useSensitiveScreen(), phone = usePhoneActive(), pathname = usePathname() ?? '', zigi = useZigiState();
  const button = useRef<HTMLButtonElement>(null), timer = useRef<number | null>(null), warmed = useRef(false);
  useEffect(() => { setMounted(true); }, []);
  useAccountCleanup(useCallback(() => setOpen(false), []));
  const toggle = useCallback(() => setOpen(current => !current), []);
  // The chunk is warmed on hover or focus and when the browser is idle after the person has interacted once; it mounts on the first open.
  const warm = useCallback(() => { if (warmed.current) return; warmed.current = true; void loadChat().catch(() => { warmed.current = false; }); }, []);
  // The bundle loads and ZIGi greets when the panel opens; both after the render, never inside a state updater.
  useEffect(() => { if (open) { setLoaded(true); zigiEvents.emit('open'); } else if (loaded) zigiEvents.emit('close'); }, [open, loaded]);
  const close = useCallback(() => { setOpen(false); requestAnimationFrame(() => button.current?.focus({preventScroll: true})); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.defaultPrevented) return;
      if (launcher.record.launcherHidden || sensitive) return;
      event.preventDefault(); toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sensitive, launcher.record.launcherHidden, toggle]);
  useEffect(() => { if (sensitive && open) setOpen(false); }, [sensitive, open]);
  // A page's "Ask ZIGi about this" opens the panel (the composer takes the text); hidden or sensitive, nothing happens.
  useEffect(() => { const onAsk = () => { if (!launcher.record.launcherHidden && !sensitive) setOpen(true); }; window.addEventListener(ASK_EVENT, onAsk); return () => window.removeEventListener(ASK_EVENT, onAsk); }, [launcher.record.launcherHidden, sensitive]);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const hide = () => {
    setOpen(false); launcher.setLauncherHidden(true); setUndoUntil(Date.now() + HIDE_UNDO_MS);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { timer.current = null; setUndoUntil(null); }, HIDE_UNDO_MS);
  };
  const undoHide = () => { launcher.setLauncherHidden(false); setUndoUntil(null); if (timer.current) { window.clearTimeout(timer.current); timer.current = null; } requestAnimationFrame(() => button.current?.focus({preventScroll: true})); };
  if (!mounted || !pathname.startsWith('/app')) return null;
  const app = launcherApp(launcher.record);
  const visible = launcher.loaded && !launcher.record.launcherHidden && !sensitive;
  return <>
    {visible && <div className={`ai-launcher${phone ? ' ai-launcher-phone' : ''}`} data-testid="ai-launcher" data-glass-off="">
      {app && <a className="ai-launcher-pill" href={app.url} target="_blank" rel="noopener noreferrer">Open {app.name} ↗</a>}
      <button ref={button} type="button" className="ai-launcher-button" aria-label={open ? 'Close ZIGi, your AI' : 'Open ZIGi, your AI (⌘K or Ctrl+K)'} aria-haspopup="dialog" aria-expanded={open} onClick={toggle} onPointerEnter={warm} onFocus={warm} data-state={zigi}>
        <ZigiAvatar state={zigi} size={44} decorative/>
      </button>
      <button type="button" className="ai-launcher-hide" aria-label="Hide ZIGi (show it again from Settings)" onClick={hide}>×</button>
    </div>}
    {undoUntil !== null && <div className="ai-launcher-toast" role="status"><span>ZIGi is hidden. Show it again from Settings → ZIGi · your AI.</span><button type="button" className="secondary" onClick={undoHide}>Undo</button></div>}
    {loaded && <Suspense fallback={null}><AiChat open={open && visible} onClose={close} sensitive={sensitive} phone={phone}/></Suspense>}
  </>;
}
