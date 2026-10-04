'use client';
import dynamic from 'next/dynamic';
import {usePathname} from 'next/navigation';
import {useCallback, useEffect, useRef, useState} from 'react';
import {PROVIDERS} from '../../lib/ai/providers';
import {subscriptionApp} from '../../lib/ai/bridge';
import {currentAiScope} from '../../lib/ai/scope';
import {usePhoneActive} from '../phone/use-phone-layout';
import {ZigiAvatar} from '../zigi/zigi-avatar';
import {useZigiState, zigiEvents} from '../zigi/events';
import {useAccountCleanup, useAiSettings} from './use-ai-settings';
import {useSensitiveScreen} from './use-sensitive-screen';
import './ai.css';

/**
 * The ZIGi launcher (ADR-012, Part 6): a floating ZIGi button that opens the chat, an "Open <app>" pill without logos
 * where the person's AI has its own app, and a Hide control (undo for ten seconds, then "Show ZIGi" in Settings).
 * Client-only after mount. Hidden on sensitive screens, when the launcher is switched off, and on phones while a sheet
 * or the keyboard is open. ⌘K / Ctrl+K toggles the chat. The chat bundle loads on the first open and stays mounted
 * afterwards so the conversation survives closing the panel. Focus returns here when the chat closes.
 */
const AiChat = dynamic(() => import('./ai-chat'), {ssr: false, loading: () => null});
const HIDE_UNDO_MS = 10_000;
export function AiLauncher() {
  const [mounted, setMounted] = useState(false), [open, setOpen] = useState(false), [loaded, setLoaded] = useState(false), [undoUntil, setUndoUntil] = useState<number | null>(null);
  const settings = useAiSettings(), sensitive = useSensitiveScreen(), phone = usePhoneActive(), pathname = usePathname() ?? '', zigi = useZigiState();
  const button = useRef<HTMLButtonElement>(null), timer = useRef<number | null>(null);
  useEffect(() => { setMounted(true); }, []);
  useAccountCleanup(useCallback(() => setOpen(false), []));
  const toggle = useCallback(() => setOpen(current => { const next = !current; if (next) { setLoaded(true); zigiEvents.emit('open'); } return next; }), []);
  const close = useCallback(() => { setOpen(false); requestAnimationFrame(() => button.current?.focus({preventScroll: true})); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.defaultPrevented) return;
      if (settings.data.launcherHidden || sensitive) return;
      event.preventDefault(); toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sensitive, settings.data.launcherHidden, toggle]);
  useEffect(() => { if (sensitive && open) setOpen(false); }, [sensitive, open]);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const hide = () => {
    setOpen(false); settings.update(s => ({...s, launcherHidden: true})); setUndoUntil(Date.now() + HIDE_UNDO_MS);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { timer.current = null; setUndoUntil(null); }, HIDE_UNDO_MS);
  };
  const undoHide = () => { settings.update(s => ({...s, launcherHidden: false})); setUndoUntil(null); if (timer.current) { window.clearTimeout(timer.current); timer.current = null; } requestAnimationFrame(() => button.current?.focus({preventScroll: true})); };
  if (!mounted || !pathname.startsWith('/app')) return null;
  const scope = currentAiScope();
  const app = settings.data.mode === 'subscription' ? subscriptionApp(settings.data.subscriptionApp) : settings.data.enabled && settings.data.provider ? PROVIDERS[settings.data.provider].app : null;
  const visible = settings.loaded && !settings.data.launcherHidden && !sensitive;
  return <>
    {visible && <div className={`ai-launcher${phone ? ' ai-launcher-phone' : ''}`} data-testid="ai-launcher" data-glass-off="">
      {app && <a className="ai-launcher-pill" href={app.url} target="_blank" rel="noopener noreferrer">Open {app.name} ↗</a>}
      <button ref={button} type="button" className="ai-launcher-button" aria-label={open ? 'Close ZIGi, your AI' : 'Open ZIGi, your AI (⌘K or Ctrl+K)'} aria-haspopup="dialog" aria-expanded={open} onClick={toggle} data-state={zigi}>
        <ZigiAvatar state={zigi} size={44} decorative/>
      </button>
      <button type="button" className="ai-launcher-hide" aria-label="Hide ZIGi (show it again from Settings)" onClick={hide}>×</button>
    </div>}
    {undoUntil !== null && <div className="ai-launcher-toast" role="status"><span>ZIGi is hidden. Show it again from Settings → ZIGi · your AI.</span><button type="button" className="secondary" onClick={undoHide}>Undo</button></div>}
    {loaded && <AiChat open={open && visible} onClose={close} settings={settings} scope={scope} sensitive={sensitive} phone={phone}/>}
  </>;
}
