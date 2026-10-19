'use client';
import {useSyncExternalStore} from 'react';
import {THEME_EVENT, chooseTheme, readTheme} from '../../lib/ui-prefs/theme';
import type {Theme} from '../../lib/ui-prefs/theme';
import {SidebarSky} from './sidebar-sky';
/** The line under the bar on phones and in Settings. Session AF (L5a, Part 10.7, ADR-028 H31): the sidebar's bar has no
 *  line under it any more; that the choice stays on this device is said in Settings → Appearance, Settings → Your data
 *  ("How pages look on this device") and Help ("What are Light, Nebula and Dark?"). */
const THEME_NOTE = 'Nebula is the look you know, for everyone. Customize — coming later. Light and Dark are the same app by day and by night.';

const Sun = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"/></g></svg>;
/** Session AE (Part 3.1, ADR-027): Nebula's mark is the ZIGoals logo drawn as one plain line in the sun's and moon's style
 *  (24 grid, 1.8 stroke, round ends): the origami Z with both left ends folded and the G's hook rising from its foot. */
const ZgMark = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" data-icon="zg"><path d="M4 7.2 6.2 4H19.5L4.6 17.4 6.6 20H15.2Q19.8 20 19.8 15.4V12.6H14.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const Moon = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>;

const OPTIONS: readonly {theme: Theme; word: string; label: string; tip: string; icon: () => React.ReactElement}[] = [
  {theme: 'light', word: 'Light', label: 'Light theme', tip: 'Light · by day', icon: Sun},
  {theme: 'nebula', word: 'Nebula', label: 'Nebula theme', tip: 'Nebula · Customize — coming later', icon: ZgMark},
  {theme: 'dark', word: 'Dark', label: 'Dark theme', tip: 'Dark · by night', icon: Moon},
];
const subscribe = (change: () => void) => { window.addEventListener(THEME_EVENT, change); window.addEventListener('storage', change); return () => { window.removeEventListener(THEME_EVENT, change); window.removeEventListener('storage', change); }; };

/**
 * Session AB-Design (owner request 5) → Session AD (Part 3, ADR-026 F4/F5) → Session AE (Part 3, ADR-027 G7): the theme
 * bar. Light (white-family surfaces, the same nebula colours deeper), Nebula (today's look, the default for everyone;
 * "Customize — coming later": a later premium theme starts from it) and Dark (the nebula, deeper); all three final. The
 * choice is a device setting (lib/ui-prefs/theme.ts), applied at once and before the first paint on every later page. The
 * chosen one is a solid nebula pill. On phones and in Settings the same control shows its words and one line about Nebula.
 */
export function ThemeSwitch({compact}: {compact?: boolean}) {
  const theme = useSyncExternalStore(subscribe, () => readTheme(), () => 'nebula' as Theme);
  const choose = (next: Theme) => { if (next === theme) return; try { chooseTheme(next); } catch { /* storage refused: the page keeps its theme */ } };
  return <div className={`theme-switch-wrap${compact ? ' theme-switch-wrap-compact' : ''}`}>
    <div className={`theme-switch${compact ? ' theme-switch-compact' : ''}`} role="radiogroup" aria-label="Theme">
      {OPTIONS.map(o => <button key={o.theme} type="button" role="radio" aria-checked={theme === o.theme} className="theme-option" data-theme-option={o.theme} aria-label={o.label} title={o.tip} onClick={() => choose(o.theme)}><o.icon/><span>{o.word}</span></button>)}
    </div>
    {compact && <p className="theme-switch-note">{THEME_NOTE}</p>}
    {/* Session AF (L5a, Part 10.1): the sidebar's bar also drives the sidebar sky's parallax (renders nothing). */}
    {!compact && <SidebarSky/>}
  </div>;
}
