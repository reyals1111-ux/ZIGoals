'use client';
import {useEffect, useRef, useState} from 'react';
import {CALM_WORDS, calmNow, PACE_SECONDS, PACE_WORDS, shiftPosition, type Calm} from '../../../lib/calm/visuals';
import {audioContext, audioReady} from '../../../lib/audio/context';
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
 * Session AV lane 2 (rest, LEDGER #79; Calm's Shift): the slow left-right sound, when the person turned it on (it is off
 * unless chosen): it plays only while the session runs and the page's audio is allowed (the Begin tap, or "Turn on the
 * sound"), fades out on a pause, at the end and on "Sound off for this session", and comes back on resume. Its pan
 * follows the light's glide (lib/audio/shift-sound.ts), also when the light is hidden or Motion is off: sound is not motion.
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
  // The sound: started (in step with the light) while it may play, faded out otherwise.
  const [quiet, setQuiet] = useState(false), [blocked, setBlocked] = useState(false), ready = audioReady(), volume = calm?.sound ?? 0;
  const playing = volume > 0 && !quiet && !paused && ready && !blocked;
  // As with Hide/Show: the focus moves to the button that takes the pressed one's place.
  const quietToggled = useRef(false), soundOnButton = useRef<HTMLButtonElement>(null), soundOffButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (quietToggled.current) (quiet ? soundOnButton : soundOffButton).current?.focus(); }, [quiet]);
  const hush = (next: boolean) => { quietToggled.current = true; setQuiet(next); };
  const [woke, setWoke] = useState(0);
  useEffect(() => { if (woke) soundOffButton.current?.focus(); }, [woke]);
  const wake = async () => { try { await audioContext()?.resume?.(); } catch { /* stays quiet */ } setWoke(n => n + 1); };
  useEffect(() => {
    if (!playing || !calm) return;
    let live = true, sound: {stop: () => void} | null = null;
    void import('../../../lib/audio/shift-sound').then(m => {
      const ctx = audioContext();
      if (!live || !ctx) return;
      sound = m.startShiftSound(ctx, {volume, glideSeconds: PACE_SECONDS[calm.pace], elapsedMs: elapsedAt(Date.now())});
      if (!sound) setBlocked(true);
    }).catch(() => setBlocked(true));
    return () => { live = false; sound?.stop(); };
  }, [playing, volume, calm, elapsedAt]);
  if (!calm || (!calm.visual && !volume)) return null;
  const soundLine = volume > 0 && <p className="fine calm-sound-line">
    {blocked ? 'This browser cannot move a sound from left to right, so the slow left-right sound stays off here.'
      : quiet ? <>The slow left-right sound is off for this session. <button ref={soundOnButton} type="button" className="text-link" onClick={() => hush(false)}>Sound on</button></>
      : !ready ? <>The slow left-right sound waits for a tap (browsers allow sound only after one). <button type="button" className="text-link" onClick={() => void wake()}>Turn on the sound</button></>
      : <>Slow left-right sound{paused ? ', quiet while paused' : ''} · volume {volume}. <button ref={soundOffButton} type="button" className="text-link" onClick={() => hush(true)}>Sound off for this session</button></>}
  </p>;
  if (!calm.visual) return soundLine || null;
  const words = CALM_WORDS[calm.visual];
  if (hidden) return <><p className="calm-layer-shown"><button ref={showButton} type="button" className="text-link" onClick={() => toggle(false)}>Show the visual ({words.en})</button></p>{soundLine}</>;
  return <><figure className="calm-layer" aria-label={`Calm visual: ${words.en}`}>
    {calm.visual === 'shift'
      ? <div className="calm-shift" ref={track} data-motion={moving ? 'on' : 'off'} role="img" aria-label={`${words.en}: ${words.about}`}><span className="calm-light" ref={light}/></div>
      : <div className="calm-frame" role="img" aria-label={`${words.en}: ${words.about}`}><CalmScene visual={calm.visual} motion={motion && !paused}/></div>}
    <figcaption className="fine">
      {calm.visual === 'shift' ? `${words.en} · ${PACE_WORDS[calm.pace].en}` : words.en}
      {!motion && ' · Motion is off on this device, so it stands still.'}
      {' '}<button ref={hideButton} type="button" className="text-link" onClick={() => toggle(true)}>Hide the visual</button>
    </figcaption>
  </figure>{soundLine}</>;
}
