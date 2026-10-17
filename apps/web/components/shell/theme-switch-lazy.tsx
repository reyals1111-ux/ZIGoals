'use client';
import {lazy, Suspense} from 'react';
import './theme-switch.css';

const ThemeSwitch = lazy(() => import('./theme-switch').then(m => ({default: m.ThemeSwitch})));

/**
 * Session AD (Part 3; weights, never a raised budget): the theme bar loads as its own chunk. The server renders the real
 * bar and hydration keeps it; when a page renders it in the browser first (the More sheet, a client route change) the slot
 * holds the bar's measured height until the chunk arrives, so nothing below it moves.
 */
export function LazyThemeSwitch({compact}: {compact?: boolean}) {
  return <div className={`theme-switch-slot${compact ? ' theme-switch-slot-compact' : ''}`}>
    <Suspense fallback={null}><ThemeSwitch compact={compact}/></Suspense>
  </div>;
}
