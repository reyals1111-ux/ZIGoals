'use client';
import {useUiPrefs} from '../../lib/ui-prefs/use-ui-prefs';
import {themeModeOf} from '../../lib/ui-prefs/schema';
import './theme-switch.css';

const Sun = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"/></g></svg>;
const Palette = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5c-4.7 0-8.5 3.6-8.5 8 0 4.5 3.8 8 8.5 8 1.1 0 1.8-.7 1.8-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.6 1.8-1.6h1.9c2.4 0 4-1.6 4-3.7 0-3.8-3.8-6.7-8.5-6.7z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="14.2" cy="7.5" r="1"/></g></svg>;
const Moon = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>;

/**
 * Session AB-Design (owner request 5, ADR-024 D9; owner follow-up): the theme bar, the sidebar's last thing below the
 * complete artwork — a framed glass bar with three equal icon buttons (hub.zigchain.com's pattern): Light (Soon),
 * Customize (Soon, a future premium theme) and Dark, the current nebula look and the only one that exists. The chosen one
 * is a solid nebula pill with a white icon; the others are dimmer. "Soon" is the tooltip and the accessible name of the
 * two that do not exist yet; they store nothing. Dark writes "dark" to zigoals:ui-prefs:v1. On phones the same control,
 * with its words, sits in More and in Settings → Your app.
 */
export function ThemeSwitch({compact}: {compact?: boolean}) {
  const prefs = useUiPrefs(), mode = themeModeOf(prefs.data);
  const choose = () => { try { prefs.update(p => ({...p, themeMode: 'dark'})); } catch { /* storage refused: dark anyway */ } };
  return <div className={`theme-switch${compact ? ' theme-switch-compact' : ''}`} role="radiogroup" aria-label="Theme">
    <button type="button" role="radio" aria-checked="false" aria-disabled="true" className="theme-option" data-soon="" aria-label="Light theme: soon" title="Light · Soon"><Sun/><span>Light</span>{compact && <small aria-hidden="true">Soon</small>}</button>
    <button type="button" role="radio" aria-checked="false" aria-disabled="true" className="theme-option" data-soon="" aria-label="Customize theme: soon" title="Customize · Soon"><Palette/><span>Customize</span>{compact && <small aria-hidden="true">Soon</small>}</button>
    <button type="button" role="radio" aria-checked={mode === 'dark'} className="theme-option" aria-label="Dark theme" title="Dark" onClick={choose}><Moon/><span>Dark</span></button>
  </div>;
}
