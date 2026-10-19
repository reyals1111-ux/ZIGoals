'use client';
import {useEffect, useRef, type CSSProperties} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {ZigiFigure} from '../zigi/zigi-figure';
import {useEscapeLayer} from './escape-layers';
import {FlameMark} from './checklist-marks';
import './day-celebration.css';

/**
 * Session AF (L3b): the day's full-screen celebration, the moment the last planet of the day is lit by a tick on the
 * Checklist (never when a day already complete is opened, never on a reload, once a day in this tab; the caller decides).
 * A modal dialog over the Checklist: the trophy planet rising in a burst of colour, ZIGi celebrating, the streak and today's
 * XP (with the game layer on), a Perfect orbit when the day went in path order. Confetti plays once; reduced motion and
 * Motion Off show the same card, still. A night island: the same in every theme. Its own chunk, loaded when it plays.
 */
const CONFETTI = 36, COLOURS = ['#23eaff', '#9273ff', '#ff74be', '#ffd27a', '#459dff', '#f06dff', '#26e8bd'];
export default function DayCelebration({streak, xp, perfect, total, onClose}: {streak: number; xp: number | null; perfect: boolean; total: number; onClose: () => void}) {
  const ref = useRef<HTMLDialogElement>(null), button = useRef<HTMLButtonElement>(null);
  useEscapeLayer(true, onClose);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    try { d.showModal(); } catch { /* shown in place */ }
    button.current?.focus({preventScroll: true});
    return () => { try { if (d.open) d.close(); } catch { /* gone */ } };
  }, []);
  return <dialog ref={ref} className="checklist-celebration" aria-labelledby="checklist-celebration-title" aria-describedby="checklist-celebration-line" onCancel={e => e.preventDefault()}>
    <div className="checklist-celebration-burst" aria-hidden="true">
      <span className="checklist-celebration-rays"/>
      {Array.from({length: CONFETTI}, (_, i) => <i key={i} style={{'--a': `${(i * 137.5) % 360}deg`, '--d': `${34 + (i * 53) % 30}vmin`, '--c': COLOURS[i % COLOURS.length], '--t': `${1100 + (i * 97) % 700}ms`, '--r': `${(i * 71) % 360}deg`} as CSSProperties} data-shape={i % 3}/>)}
    </div>
    <section className="checklist-celebration-card">
      <div className="checklist-celebration-stage" aria-hidden="true">
        <svg className="checklist-celebration-trophy" viewBox="0 0 120 120" focusable="false">
          <defs><radialGradient id="checklist-celebration-gold" cx=".36" cy=".3" r=".75"><stop offset="0" stopColor="#fff4d1"/><stop offset=".35" stopColor="#ffd27a"/><stop offset=".78" stopColor="#f0a24b"/><stop offset="1" stopColor="#b8681f"/></radialGradient></defs>
          <ellipse cx="60" cy="64" rx="56" ry="15" fill="none" stroke="#f0a24b" strokeWidth="4" opacity=".55"/>
          <circle cx="60" cy="60" r="40" fill="url(#checklist-celebration-gold)" stroke="#fff2c7" strokeWidth="1.5"/>
          <path d="M46 42h28v8c0 9-6 15-14 15s-14-6-14-15zM46 46h-6c0 7 3 11 8 12M74 46h6c0 7-3 11-8 12M60 65v8M50 79h20M53 73h14v6H53z" fill="#fff6dc" stroke="#8a5a1c" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/>
          <path d="M4 64c0 8 25 15 56 15s56-7 56-15" fill="none" stroke="#ffe6a8" strokeWidth="4" strokeLinecap="round"/>
        </svg>
        <span className="checklist-celebration-zigi"><ZigiFigure state="celebrate"/></span>
      </div>
      <p className="checklist-celebration-eyebrow">Day complete</p>
      <h2 id="checklist-celebration-title"><NebulaFlow identity="checklist-celebration">All {total} {total === 1 ? 'planet' : 'planets'} lit!</NebulaFlow></h2>
      <p id="checklist-celebration-line" className="checklist-celebration-line">{perfect ? 'A Perfect orbit: every planet in path order.' : 'Every planet today, in your own order.'}</p>
      <ul className="checklist-celebration-stats">
        <li><FlameMark lit/><strong>{streak}</strong><span>day streak</span></li>
        {xp !== null && <li><svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false"><path d="M13.2 2.5 5 13.4h6l-1.2 8.1L19 10.4h-6.1z" fill="#ffd27a" stroke="#f0a24b" strokeWidth="1.3" strokeLinejoin="round"/></svg><strong>{xp}</strong><span>XP today</span></li>}
      </ul>
      <button ref={button} type="button" className="checklist-celebration-go" onClick={onClose}>Lovely</button>
    </section>
  </dialog>;
}
