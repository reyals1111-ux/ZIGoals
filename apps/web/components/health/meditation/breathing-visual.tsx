'use client';
import {useEffect, useRef, useState} from 'react';
import {phaseAt, phaseAnnouncement, PATTERNS, type BreathingPattern} from '../../../lib/meditation/breathing';
import {entranceAllowed, MOTION_PREFERENCE_KEY} from '../../use-entrance';

/** Whether motion is allowed now: not under the device's reduced motion, the app's Motion Off, or unreadable storage. */
function useMotionAllowed(): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const check = () => setAllowed(entranceAllowed());
    check();
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key === MOTION_PREFERENCE_KEY) check(); };
    query?.addEventListener?.('change', check); window.addEventListener('storage', onStorage);
    return () => { query?.removeEventListener?.('change', check); window.removeEventListener('storage', onStorage); };
  }, []);
  return allowed;
}

/**
 * The breathing guide (Session W Part 5, owner decision W5). The circle grows as you breathe in and shrinks as you
 * breathe out; it moves only while motion is allowed, the page is visible and the circle is on screen, and stands still
 * otherwise (paused, reduced motion, Motion Off), where the words and the count carry the guide alone. A screen reader
 * hears each phase once, politely ("Breathe in, 4 seconds"), never the count.
 */
export function BreathingVisual({pattern, elapsedAt, paused}: {pattern: BreathingPattern; elapsedAt: (now: number) => number; paused: boolean}) {
  const motion = useMotionAllowed(), circle = useRef<HTMLDivElement>(null), box = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());
  // The words and the count follow a 250 ms tick (cheap, and exact enough for whole seconds).
  useEffect(() => { if (paused) return; const timer = window.setInterval(() => setNow(Date.now()), 250); return () => window.clearInterval(timer); }, [paused]);
  const phase = phaseAt(pattern, elapsedAt(now));
  const [announced, setAnnounced] = useState('');
  useEffect(() => { if (!paused) setAnnounced(phaseAnnouncement(pattern, phase.index)); }, [pattern, phase.index, phase.cycle, paused]);
  useEffect(() => {
    const el = circle.current, area = box.current;
    if (!el || !area) return;
    if (!motion || paused) { el.style.transform = ''; return; }
    let frame = 0, visible = document.visibilityState === 'visible', onScreen = true;
    const draw = () => { el.style.transform = `scale(${phaseAt(pattern, elapsedAt(Date.now())).scale.toFixed(4)})`; frame = requestAnimationFrame(draw); };
    const run = () => { cancelAnimationFrame(frame); frame = 0; if (visible && onScreen) frame = requestAnimationFrame(draw); };
    const onVisibility = () => { visible = document.visibilityState === 'visible'; run(); };
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => { onScreen = entries.some(e => e.isIntersecting); run(); }) : null;
    observer?.observe(area);
    document.addEventListener('visibilitychange', onVisibility);
    run();
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); document.removeEventListener('visibilitychange', onVisibility); el.style.transform = ''; };
  }, [motion, paused, pattern, elapsedAt]);
  return <div className="breathing" ref={box} data-motion={motion && !paused ? 'on' : 'off'}>
    <div className="breathing-stage" aria-hidden="true"><div className="breathing-circle" ref={circle} data-phase={phase.kind}/></div>
    <p className="breathing-words"><strong>{paused ? 'Paused' : phase.words}</strong>{!paused && <span className="breathing-count"> · {phase.secondsLeft}</span>}</p>
    <p className="fine breathing-pattern">{PATTERNS[pattern].label}: {PATTERNS[pattern].summary}</p>
    <p className="sr-only" aria-live="polite">{announced}</p>
  </div>;
}
