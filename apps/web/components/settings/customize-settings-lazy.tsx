'use client';
import {lazy, Suspense} from 'react';

const CustomizeSettings = lazy(() => import('./customize-settings'));

/**
 * Session AJ (item 32, D5; weights, never a raised budget): the Customize card loads as its own chunk, like the theme bar
 * (components/shell/theme-switch-lazy.tsx). The server renders the real card and hydration keeps it.
 */
export function LazyCustomizeSettings() {
  return <Suspense fallback={null}><CustomizeSettings/></Suspense>;
}
