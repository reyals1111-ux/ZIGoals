'use client';
import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {ZigiCheer} from '../path/path-zigi';
import {useEscapeLayer} from './escape-layers';
import {pushToastLayer} from '../ui/undo-toast';
import {FlameMark} from './checklist-marks';
import {OrbitNodeFace} from '../orbit-path/orbit-node';
import {PATH_COLOURS} from '../../lib/path/colours';
import './day-celebration.css';

/**
 * Session AF (L3b): the day's full-screen celebration, the moment the last planet of the day is lit by a tick on the
 * Checklist (never when a day already complete is opened, never on a reload, once a day in this tab; the caller decides).
 * A modal dialog over the Checklist: the day's finale node rising, ZIGi celebrating, the streak, a Perfect orbit when the
 * day went in path order. Session AG (owner Part 6): no XP and no confetti — a space moment, once: a supernova ring
 * expanding from the finale, a shooting star sweeping across, a short twinkle of stars; reduced motion and Motion Off
 * show the same card, still. A night island: the same in every theme. Its own chunk, loaded when it plays.
 * Round 3: a gold-to-violet glow with soft rays behind it, the confetti a couple of seconds longer, ZIGi large and in front
 * of the trophy, and the last tick's Undo a quiet text button under Continue (the toast lends itself there) instead of a
 * toast over the moment. Round 4: a full-screen moment rather than a card — the trophy high, ZIGi (its waving greeting, the
 * cheer the figures have) large in front of it, the day's planets, big streak and XP tiles, Continue near the foot.
 */
/** The twinkle: fourteen small stars around the moment, each at its own place, size and beat (fixed, so a still is the same). */
const TWINKLE = Array.from({length: 14}, (_, i) => ({x: `${(i * 37 + 11) % 92 + 4}vw`, y: `${(i * 53 + 7) % 78 + 6}vh`, s: 8 + (i * 5) % 10, t: `${380 + (i * 131) % 900}ms`}));
export default function DayCelebration({streak, perfect, total, colours = [], onClose}: {streak: number; perfect: boolean; total: number; colours?: string[]; onClose: () => void}) {
  const ref = useRef<HTMLDialogElement>(null), button = useRef<HTMLButtonElement>(null), toastSlot = useRef<HTMLDivElement>(null);
  useEscapeLayer(true, onClose);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    try { d.showModal(); } catch { /* shown in place */ }
    button.current?.focus({preventScroll: true});
    // The last tick's Undo stays in reach over the celebration (the toast moves into it while it is open).
    const releaseToast = toastSlot.current ? pushToastLayer(toastSlot.current) : () => undefined;
    return () => { releaseToast(); try { if (d.open) d.close(); } catch { /* gone */ } };
  }, []);
  return <dialog ref={ref} className="checklist-celebration" aria-labelledby="checklist-celebration-title" aria-describedby="checklist-celebration-line" onCancel={e => e.preventDefault()}>
    <div className="checklist-celebration-burst" aria-hidden="true">
      <span className="checklist-celebration-glow"/>
      <span className="checklist-celebration-nova"/><span className="checklist-celebration-nova checklist-celebration-nova-2"/>
    </div>
    <span className="checklist-celebration-comet" aria-hidden="true"/>
    <div className="checklist-celebration-twinkle" aria-hidden="true">{TWINKLE.map((t, i) => <i key={i} style={{left: t.x, top: t.y, '--s': `${t.s}px`, '--t': t.t} as CSSProperties}/>)}</div>
    <section className="checklist-celebration-card">
      <div className="checklist-celebration-stage" aria-hidden="true">
        <span className="checklist-celebration-trophy orbit-node" data-lit="" style={{'--node': PATH_COLOURS.purple.token, '--node-size': '150px'} as CSSProperties}><OrbitNodeFace glyph="star"/></span>
        <span className="checklist-celebration-zigi"><ZigiCheer/></span>
      </div>
      {colours.length > 0 && <ol className="checklist-celebration-planets" aria-hidden="true">{colours.map((c, i) => <li key={i} style={{'--c': c, '--i': i} as CSSProperties}/>)}</ol>}
      <p className="checklist-celebration-eyebrow">Day complete</p>
      <h2 id="checklist-celebration-title"><NebulaFlow identity="checklist-celebration">All {total} {total === 1 ? 'planet' : 'planets'} lit!</NebulaFlow></h2>
      <p id="checklist-celebration-line" className="checklist-celebration-line">{perfect ? 'A Perfect orbit: every planet in path order.' : 'Every planet today, in your own order.'}</p>
      <ul className="checklist-celebration-stats">
        <li><FlameMark lit/><strong><Rise from={Math.max(0, streak - 1)} to={streak} delay={700}/></strong><span>day streak</span></li>
      </ul>
      <span className="checklist-celebration-spacer" aria-hidden="true"/>
      <button ref={button} type="button" className="checklist-celebration-go" onClick={onClose}>Continue</button>
      <div ref={toastSlot} className="checklist-toast-slot checklist-celebration-undo"/>
    </section>
  </dialog>;
}

/** A number counting up from `from` to `to` after `delay` (at once under reduced motion or Motion Off). */
function Rise({from, to, delay}: {from: number; to: number; delay: number}) {
  const [shown, setShown] = useState(from);
  useEffect(() => {
    const root = document.documentElement, still = root.getAttribute('data-app-motion') === 'off' || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (still || to <= from) { setShown(to); return; }
    let frame = 0; const start = performance.now() + delay, ms = 700;
    const step = (t: number) => { const k = Math.max(0, Math.min(1, (t - start) / ms)); setShown(Math.round(from + (to - from) * (1 - (1 - k) ** 3))); if (k < 1) frame = requestAnimationFrame(step); };
    frame = requestAnimationFrame(step); return () => cancelAnimationFrame(frame);
  }, [from, to, delay]);
  return <span data-rise={shown === to ? 'done' : 'running'}>{shown}</span>;
}
