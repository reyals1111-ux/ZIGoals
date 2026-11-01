/// <reference types="react/canary" />
'use client';
/**
 * Session AK M1 (owner follow-up 2; reverses ADR-036 Q26's "designed, not switched on"): page transitions.
 * A template is remounted on every navigation between /app pages, so its <ViewTransition> enters and exits with the page
 * (a layout persists and never would). The page leaves with a 120 ms fade and arrives with a 180 ms fade and a 6 px rise
 * (components/motion/motion-2026.css); Calm keeps a 150 ms crossfade without movement; Motion Off and reduced motion
 * start no transition at all (the motion runtime's gate). The app chrome — sidebar, tablet rail, phone bars — sits outside
 * this template in the layout's Shell and is pinned during a transition with a fixed name and no animation.
 * The runtime (components/motion/motion-runtime.ts) is its own chunk, loaded after the page mounts.
 */
import {useEffect, ViewTransition, type ReactNode} from 'react';
import '../../components/motion/motion-2026.css';

export default function AppTemplate({children}: {children: ReactNode}) {
  useEffect(() => {
    let live = true, stop: (() => void) | undefined;
    void import('../../components/motion/motion-runtime').then(m => { if (live) stop = m.startMotionRuntime(); }, () => { /* motion is a nicety */ });
    return () => { live = false; stop?.(); };
  }, []);
  return <ViewTransition enter="zg-page-in" exit="zg-page-out" default="none">{children}</ViewTransition>;
}
