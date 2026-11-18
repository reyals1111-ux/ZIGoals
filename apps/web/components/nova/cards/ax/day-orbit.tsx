'use client';
import type {CSSProperties} from 'react';
import './day.css';

/**
 * Session AS (ADR-042 Part 2, family: the orbit): today's dots on one ring, the done ones lit, the count in the middle.
 * A dot is a thing to do today (a Checklist planet, or a habit due today); how many are lit is the day's own count.
 * Arrives: the dots swing round into place. Alive: the dashed outer ring turns slowly (an ornament, never the count).
 * The drawing is decoration: the widget's figure and table say the count in words.
 */
export function AxdOrbit({dots, figure, unit}: {dots: readonly boolean[]; figure: string; unit?: string}) {
  const n = dots.length;
  return <div className="axd-inst axd-orbit" data-many={n > 28 ? '2' : n > 16 ? '1' : undefined} aria-hidden="true">
    <div className="axd-orbit-ring">
      <span className="axd-orbit-orn"/>
      <span className="axd-orbit-track"/>
      <div className="axd-orbit-dots">{dots.map((lit, i) => <span key={i} className="axd-orbit-arm" style={{'--axd-a': `${Math.round(i / n * 3600) / 10}deg`} as CSSProperties}><i data-lit={lit ? '' : undefined}/></span>)}</div>
      <p className="axd-orbit-centre"><b>{figure}</b>{unit ? <small>{unit}</small> : null}</p>
    </div>
  </div>;
}
