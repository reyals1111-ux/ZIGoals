'use client';
import {useSyncExternalStore} from 'react';
import {THEME_EVENT, chooseTheme, readTheme} from '../../lib/ui-prefs/theme';
import type {Theme} from '../../lib/ui-prefs/schema';
import './theme-switch.css';

const Sun = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"/></g></svg>;
const Palette = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5c-4.7 0-8.5 3.6-8.5 8 0 4.5 3.8 8 8.5 8 1.1 0 1.8-.7 1.8-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.6 1.8-1.6h1.9c2.4 0 4-1.6 4-3.7 0-3.8-3.8-6.7-8.5-6.7z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="14.2" cy="7.5" r="1"/></g></svg>;
const Moon = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>;

const OPTIONS: readonly {theme: Theme; word: string; label: string; tip: string; icon: () => React.ReactElement; preview?: boolean}[] = [
  {theme: 'light', word: 'Light', label: 'Light theme (preview)', tip: 'Light · Preview', icon: Sun, preview: true},
  {theme: 'nebula', word: 'Nebula', label: 'Nebula theme', tip: 'Nebula · Customize — coming later', icon: Palette},
  {theme: 'dark', word: 'Dark', label: 'Dark theme (preview)', tip: 'Dark · Preview', icon: Moon, preview: true},
];
const subscribe = (change: () => void) => { window.addEventListener(THEME_EVENT, change); window.addEventListener('storage', change); return () => { window.removeEventListener(THEME_EVENT, change); window.removeEventListener('storage', change); }; };

/**
 * Session AB-Design (owner request 5) → Session AD (Part 3, ADR-026 F4/F5): the theme bar, now real. Light (a preview),
 * Nebula (today's look, the default for everyone; "Customize — coming later": a later premium theme starts from it) and
 * Dark (a preview, deeper surfaces with the same nebula accents). The choice is a device setting (lib/ui-prefs/theme.ts),
 * applied at once and before the first paint on every later page. The chosen one is a solid nebula pill. On phones and in
 * Settings the same control shows its words, the "Preview" tags and one line about Nebula.
 */
export function ThemeSwitch({compact}: {compact?: boolean}) {
  const theme = useSyncExternalStore(subscribe, () => readTheme(), () => 'nebula' as Theme);
  const choose = (next: Theme) => { if (next === theme) return; try { chooseTheme(next); } catch { /* storage refused: the page keeps its theme */ } };
  return <div className={`theme-switch-wrap${compact ? ' theme-switch-wrap-compact' : ''}`}>
    <div className={`theme-switch${compact ? ' theme-switch-compact' : ''}`} role="radiogroup" aria-label="Theme">
      {OPTIONS.map(o => <button key={o.theme} type="button" role="radio" aria-checked={theme === o.theme} className="theme-option" data-theme-option={o.theme} aria-label={o.label} title={o.tip} onClick={() => choose(o.theme)}><o.icon/><span>{o.word}</span>{compact && o.preview && <small aria-hidden="true">Preview</small>}</button>)}
    </div>
    {compact ? <p className="theme-switch-note">Nebula is the look you know, for everyone. Customize — coming later. Light and Dark are previews.</p> : <p className="theme-switch-note">Light and Dark: preview</p>}
  </div>;
}
