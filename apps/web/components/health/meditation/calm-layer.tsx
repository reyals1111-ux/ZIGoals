'use client';
import {useEffect, useRef, useState} from 'react';
import {CALM_WORDS, calmNow, PACE_WORDS, shiftPosition, type Calm} from '../../../lib/calm/visuals';
import {useMotionAllowed} from './breathing-visual';
import './calm.css';

/** A scene's drawing: layered gradients and a few shapes, all on the device; `data-motion` lets it drift or stand still. */
export function CalmScene({visual, motion, small = false}: {visual: Exclude<Calm['visual'], 'shift' | null>; motion: boolean; small?: boolean}) {
  return <div className={`calm-scene calm-${visual}${small ? ' calm-small' : ''}`} data-motion={motion ? 'on' : 'off'} aria-hidden="true">
    <span className="calm-far"/><span className="calm-near"/>
    {visual === 'night' && <span className="calm-stars"/>}
    {visual === 'dusk' && <span className="calm-sun"/>}
  </div>;
}

/**
 * Session AV lane 2 (habits pillar; LEDGER #79 Calm Shift, #80 Calm Scenes): the calm visual chosen in "Behind your
 * sitting", shown above the clock or the breathing guide while a session runs. The gliding light moves from side to side
 * only while motion is allowed (not under reduced motion or the app's Motion Off), the page is visible, the light is on
 * screen and the session is not paused; otherwise it rests in the middle. Scenes drift very slowly under the same rule
 * and stand still otherwise. Nothing flashes. "Hide the visual" hides it for this session only.
 */
export default function CalmLayer({elapsedAt, paused}: {elapsedAt: (now: number) => number; paused: boolean}) {
  const [calm, setCalm] = useState<Calm | null>(null), [hidden, setHidden] = useState(false), motion = useMotionAllowed();
  useEffect(() => { setCalm(calmNow()); }, []);
  // The button pressed goes away with what it hid or showed: the focus moves to the one that takes its place.
  const toggled = useRef(false), showButton = useRef<HTMLButtonElement>(null), hideButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (toggled.current) (hidden ? showButton : hideButton).current?.focus(); }, [hidden]);
  const toggle = (next: boolean) => { toggled.current = true; setHidden(next); };
  const light = useRef<HTMLSpanElement>(null), track = useRef<HTMLDivElement>(null);
  const moving = motion && !paused && !hidden && calm?.visual === 'shift';
  useEffect(() => {
    const el = light.current, area = track.current;
    if (!el || !area || !calm) return;
    if (!moving) { el.style.transform = ''; return; }
    let frame = 0, visible = document.visibilityState === 'visible', onScreen = true;
    const draw = () => { const reach = Math.max(0, area.clientWidth / 2 - 30); el.style.transform = `translateX(${(shiftPosition(elapsedAt(Date.now()), calm.pace) * reach).toFixed(1)}px)`; frame = requestAnimationFrame(draw); };
    const run = () => { cancelAnimationFrame(frame); frame = 0; if (visible && onScreen) frame = requestAnimationFrame(draw); };
    const onVisibility = () => { visible = document.visibilityState === 'visible'; run(); };
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => { onScreen = entries.some(e => e.isIntersecting); run(); }) : null;
    observer?.observe(area);
    document.addEventListener('visibilitychange', onVisibility);
    run();
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); document.removeEventListener('visibilitychange', onVisibility); el.style.transform = ''; };
  }, [moving, calm, elapsedAt]);
  if (!calm?.visual) return null;
  const words = CALM_WORDS[calm.visual];
  if (hidden) return <p className="calm-layer-shown"><button ref={showButton} type="button" className="text-link" onClick={() => toggle(false)}>Show the visual ({words.en})</button></p>;
  return <figure className="calm-layer" aria-label={`Calm visual: ${words.en}`}>
    {calm.visual === 'shift'
      ? <div className="calm-shift" ref={track} data-motion={moving ? 'on' : 'off'} role="img" aria-label={`${words.en}: ${words.about}`}><span className="calm-light" ref={light}/></div>
      : <div className="calm-frame" role="img" aria-label={`${words.en}: ${words.about}`}><CalmScene visual={calm.visual} motion={motion && !paused}/></div>}
    <figcaption className="fine">
      {calm.visual === 'shift' ? `${words.en} · ${PACE_WORDS[calm.pace].en}` : words.en}
      {!motion && ' · Motion is off on this device, so it stands still.'}
      {' '}<button ref={hideButton} type="button" className="text-link" onClick={() => toggle(true)}>Hide the visual</button>
    </figcaption>
  </figure>;
}
