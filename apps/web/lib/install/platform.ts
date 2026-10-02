/**
 * How ZIGoals is running right now, by feature detection only (Session L). Nothing is guessed from the user agent.
 *
 * - 'installed': opened as an installed app. Apple's iPhone and iPad browsers expose `navigator.standalone`, true in a
 *   Home Screen web app; other browsers report `(display-mode: standalone)`. An installed iPhone app with
 *   `display: standalone` reports `(display-mode: fullscreen)` instead (MDN browser-compat-data, WebKit bug 264218), so
 *   that query counts too, but only where `navigator.standalone` exists.
 * - 'apple-browser': `navigator.standalone` exists and is false: an Apple browser that offers "Add to Home Screen" from
 *   its Share menu.
 * - 'other': everything else. The guide then shows general steps.
 */
export type InstallContext = 'installed' | 'apple-browser' | 'other';
export type InstallEnvironment = {
  navigator?: object | null;
  matchMedia?: ((query: string) => {matches: boolean}) | null;
};

export function installContext(env: InstallEnvironment): InstallContext {
  const nav = env.navigator ?? null;
  const media = (query: string) => { try { return !!env.matchMedia?.(query).matches; } catch { return false; } };
  const apple = !!nav && 'standalone' in nav;
  const standalone = apple && (nav as {standalone?: unknown}).standalone === true;
  if (standalone || media('(display-mode: standalone)') || (apple && media('(display-mode: fullscreen)'))) return 'installed';
  return apple ? 'apple-browser' : 'other';
}

/** The context in this browser; 'other' on the server. Reads only, never writes. */
export function currentInstallContext(): InstallContext {
  if (typeof window === 'undefined') return 'other';
  return installContext({navigator: window.navigator, matchMedia: typeof window.matchMedia === 'function' ? q => window.matchMedia(q) : null});
}
