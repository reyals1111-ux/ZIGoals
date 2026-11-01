'use client';
/**
 * Session AK M1: mount once inside something that has just been finished (the "Goal reached" card) and the completion
 * moment plays once around its parent when it first shows. Renders nothing visible.
 */
import {useEffect, useRef} from 'react';
import {celebrateCompletion} from './completion';

export function CompletionMoment({identity}: {identity: string}) {
  const marker = useRef<HTMLSpanElement>(null), played = useRef<string | null>(null);
  useEffect(() => {
    if (played.current === identity) return;
    const parent = marker.current?.parentElement;
    // Let the card settle into place first; no vibration without a tap.
    const timer = window.setTimeout(() => { played.current = identity; celebrateCompletion(parent, {haptic: false}); }, 240);
    return () => window.clearTimeout(timer);
  }, [identity]);
  return <span ref={marker} hidden/>;
}
