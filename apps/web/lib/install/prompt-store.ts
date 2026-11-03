/**
 * Session AK Part 3: the browser's install offer (Chromium's `beforeinstallprompt`), caught once by the always-mounted
 * NotifySync and kept here for this page's life, so Settings → Install and Help can show the browser's own dialog
 * whenever the person asks (the event fires once, early, before those pages open). Nothing is stored.
 */
type InstallPromptEvent = Event & {prompt: () => Promise<void>; userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>};
let held: InstallPromptEvent | null = null, installed = false;
const listeners = new Set<() => void>();
/** One snapshot object per change, as useSyncExternalStore requires. */
let snapshot = {available: false, installed: false};
const emit = () => { snapshot = {available: held !== null, installed}; for (const l of listeners) l(); };
export function catchInstallPrompt(target: Window): () => void {
  const onPrompt = (e: Event) => { e.preventDefault(); held = e as InstallPromptEvent; emit(); };
  const onInstalled = () => { held = null; installed = true; emit(); };
  target.addEventListener('beforeinstallprompt', onPrompt); target.addEventListener('appinstalled', onInstalled);
  return () => { target.removeEventListener('beforeinstallprompt', onPrompt); target.removeEventListener('appinstalled', onInstalled); };
}
export const installState = () => snapshot;
export const subscribeInstall = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = held; if (!event) return 'unavailable';
  held = null; emit();
  try { await event.prompt(); return (await event.userChoice).outcome; } catch { return 'unavailable'; }
}
