'use client';
import {lazy, Suspense} from 'react';
import './theme-switch.css';

/** The line under the bar (the bar itself shows it too, from here). */
export const THEME_NOTE = {compact: 'Nebula is the look you know, for everyone. Customize — coming later. Light and Dark are previews.', sidebar: 'Light and Dark: preview'} as const;
const ThemeSwitch = lazy(() => import('./theme-switch').then(m => ({default: m.ThemeSwitch})));

/**
 * Session AD (Part 3; weights, never a raised budget): the theme bar loads as its own chunk. The server renders the real bar;
 * until its chunk arrives in the browser the same box holds its place (three option slots and the note), so nothing moves.
 */
export function LazyThemeSwitch({compact}: {compact?: boolean}) {
  const wrap = `theme-switch-wrap${compact ? ' theme-switch-wrap-compact' : ''}`;
  return <Suspense fallback={<div className={wrap} aria-hidden="true"><div className={`theme-switch${compact ? ' theme-switch-compact' : ''}`}><span className="theme-option"/><span className="theme-option"/><span className="theme-option"/></div><p className="theme-switch-note">{compact ? THEME_NOTE.compact : THEME_NOTE.sidebar}</p></div>}>
    <ThemeSwitch compact={compact}/>
  </Suspense>;
}
