'use client';
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {OPENING} from '../../lib/nova/orb';

export type OpeningPhase = 'waiting' | 'play' | 'done';
/**
 * Session AK (owner follow-up 2 N2, follow-up 3 N12; lane NA): the one-time "system online" sequence. It plays once on this
 * device (the store's `openingSeen`, marked as it starts), about two seconds: the star ignites, the rings expand, the side
 * panels slide in, the widgets settle one by one, the greeting types in. Any key or tap finishes it at once; under reduced
 * motion or Motion Off it never plays and the finished dashboard shows. Customize can replay it.
 */
export function useOpening({ready, seen, motion, markSeen}: {ready: boolean; seen: boolean; motion: boolean; markSeen: () => void}) {
  // Session AK P8 (lane M7): the hook no longer ticks a clock of its own. It ticked `elapsed` every 32 ms for the typed
  // greeting, and the dashboard that holds it re-rendered whole with each tick — at CPU 4× on a computer the opening ran at
  // about 8 frames a second (13 long tasks, TBT 0.8 s; docs/performance/SESSION_AK_MOTION.md). It now says when the play
  // started (`startedAt`) and ends it with one timer; the greeting types itself in its own small component (nova-stage.tsx).
  const [phase, setPhase] = useState<OpeningPhase>('waiting'), [startedAt, setStartedAt] = useState(0);
  const started = useRef(false), timer = useRef(0), mark = useRef(markSeen);
  mark.current = markSeen;
  const finish = useCallback(() => { window.clearTimeout(timer.current); setPhase('done'); }, []);
  const play = useCallback(() => {
    window.clearTimeout(timer.current);
    setStartedAt(performance.now()); setPhase('play');
    timer.current = window.setTimeout(finish, OPENING.end);
  }, [finish]);
  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    if (!seen) mark.current();
    if (!seen && motion) play(); else setPhase('done');
  }, [ready, seen, motion, play]);
  // Any key or tap finishes it (the key still does its own job afterwards, except a shortcut letter). A layout effect
  // (Session AK lane EXF, EX-6): the listener is in place when `data-opening="play"` is, so a key pressed at once is caught.
  useLayoutEffect(() => {
    if (phase !== 'play') return;
    // Session AL (DV-070): a letter typed into a field (the command field, the composer) is a word and stays there; only a
    // letter pressed on the page itself is swallowed (it would otherwise be a shortcut).
    const skip = (event: Event) => {
      const t = event.target as HTMLElement | null, field = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName ?? ''));
      if (event instanceof KeyboardEvent && event.key.length === 1 && !field) event.preventDefault();
      finish();
    };
    window.addEventListener('keydown', skip, true); window.addEventListener('pointerdown', skip, true);
    return () => { window.removeEventListener('keydown', skip, true); window.removeEventListener('pointerdown', skip, true); };
  }, [phase, finish]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  /** Replays it from Customize; under reduced motion or Motion Off it says so instead (returns false). */
  const replay = useCallback(() => { if (!motion) return false; play(); return true; }, [motion, play]);
  return {phase, startedAt, finish, replay};
}
