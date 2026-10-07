'use client';
import {useCallback, useEffect, useState} from 'react';

type InstallPromptEvent = Event & {prompt: () => Promise<void>; userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>};
/**
 * The browser's own install offer, where it makes one (Chromium's `beforeinstallprompt`; MDN, read 2026-10-06): kept
 * while the welcome is open so its Install button can show the browser's dialog. Elsewhere (Safari, Firefox) there is
 * none, and the welcome shows the Share → Add to Home Screen steps instead. Nothing is stored.
 */
export function useInstallPrompt(): {available: boolean; install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>} {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallPromptEvent); };
    const onInstalled = () => setEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  const install = useCallback(async () => {
    if (!event) return 'unavailable' as const;
    setEvent(null);
    try { await event.prompt(); return (await event.userChoice).outcome; } catch { return 'unavailable' as const; }
  }, [event]);
  return {available: event !== null, install};
}
