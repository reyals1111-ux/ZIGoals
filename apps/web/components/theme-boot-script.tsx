'use client';
import {THEME_BOOT_SRC} from '../lib/ui-prefs/theme-sheets';

/**
 * Session AD (Part 3, ADR-026 F5; TIER 3 security headers/CSP): the theme's early script, in the server's HTML only. In the
 * browser this renders nothing: React 19 hydration skips the server's extra <head> tag, and when Next renders the root
 * layout in the browser (an error or a not-found page) no <script> is created — React makes script elements through
 * innerHTML, a Trusted Types sink this app never allows. The script ran already, before the page painted.
 */
export function ThemeBootScript({nonce}: {nonce?: string}) {
  if (typeof window !== 'undefined') return null;
  // eslint-disable-next-line @next/next/no-sync-scripts -- it must run before the first paint; a few hundred bytes, same origin
  return <script src={THEME_BOOT_SRC} nonce={nonce}/>;
}
