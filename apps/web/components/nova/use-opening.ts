'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {OPENING} from '../../lib/nova/orb';

export type OpeningPhase = 'waiting' | 'play' | 'done';
/**
 * Session AK (owner follow-up 2 N2, follow-up 3 N12; lane NA): the one-time "system online" sequence. It plays once on this
 * device (the store's `openingSeen`, marked as it starts), about two seconds: the star ignites, the rings expand, the side
 * panels slide in, the widgets settle one by one, the greeting types in. Any key or tap finishes it at once; under reduced
 * motion or Motion Off it never plays and the finished dashboard shows. Customize can replay it.
 */
export function useOpening({ready, seen, motion, markSeen}: {ready: boolean; seen: boolean; motion: boolean; markSeen: () => void}) {
  const [phase, setPhase] = useState<OpeningPhase>('waiting'), [elapsed, setElapsed] = useState(0);
  const started = useRef(false), timer = useRef(0), mark = useRef(markSeen);
  mark.current = markSeen;
  const finish = useCallback(() => { window.clearInterval(timer.current); setElapsed(OPENING.end); setPhase('done'); }, []);
  const play = useCallback(() => {
    window.clearInterval(timer.current);
    const start = performance.now();
    setElapsed(0); setPhase('play');
    timer.current = window.setInterval(() => {
      const t = performance.now() - start;
      if (t >= OPENING.end) finish(); else setElapsed(t);
    }, 32);
  }, [finish]);
  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    if (!seen) mark.current();
    if (!seen && motion) play(); else setPhase('done');
  }, [ready, seen, motion, play]);
  // Any key or tap finishes it (the key still does its own job afterwards, except a shortcut letter).
  useEffect(() => {
    if (phase !== 'play') return;
    const skip = (event: Event) => { if (event instanceof KeyboardEvent && event.key.length === 1) event.preventDefault(); finish(); };
    window.addEventListener('keydown', skip, true); window.addEventListener('pointerdown', skip, true);
    return () => { window.removeEventListener('keydown', skip, true); window.removeEventListener('pointerdown', skip, true); };
  }, [phase, finish]);
  useEffect(() => () => window.clearInterval(timer.current), []);
  /** Replays it from Customize; under reduced motion or Motion Off it says so instead (returns false). */
  const replay = useCallback(() => { if (!motion) return false; play(); return true; }, [motion, play]);
  return {phase, elapsed, finish, replay};
}
