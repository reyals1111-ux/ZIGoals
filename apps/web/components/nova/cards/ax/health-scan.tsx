'use client';
import type {CSSProperties} from 'react';
import type {BodyView, Vital} from '../../../../lib/nova/cards/ax/health-scan';
import {HEART_PATH} from '../../../../lib/nova/holo/geometry';
import {axIndex} from './kit';
import './health.css';

/**
 * Session AS (ADR-042 Part 2, family: scanners). The scan: a neon heart beside the vitals, each vital a small card with
 * its value, its own day and the person's own target. The heart is decoration and says so to assistive technology: it
 * beats by scale only and a scanner line crosses it; it shows no reading and is never driven by one. A measure with
 * nothing recorded is an unlit dashed card that says so (never a zero). No score, no grade, no judgement.
 * Arrives: the heart's outline draws itself once and the cards tilt up into place, one after another.
 * Alive: the heart beats and the scanner line crosses it (Calm: a slower beat, no line).
 */
export function AxhHeart() {
  return <div className="axh-heart" role="img" aria-label="Decorative heart, not a live measurement">
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path className="axh-heart-glow" d={HEART_PATH}/>
      <path className="axh-heart-fill" d={HEART_PATH}/>
      <path className="axh-heart-line" pathLength={1} d={HEART_PATH}/>
    </svg>
    <span className="axh-sweep" aria-hidden="true"/>
  </div>;
}
export function AxhVitals({vitals}: {vitals: readonly Vital[]}) {
  return <ul className="axh-vitals" aria-hidden="true">
    {vitals.map((v, i) => <li key={v.key} className="axh-vital" data-key={v.key} data-none={v.value === null ? '' : undefined} style={axIndex(i)} title={`${v.label}: ${v.words}`}>
      <span className="axh-vital-label">{v.label}</span>
      <b className="axh-vital-value">{v.value ?? 'nothing recorded'}</b>
      {v.asOf ? <span className="axh-vital-asof">{v.asOf}</span> : null}
      {v.target ? <span className="axh-vital-target">{v.target}</span> : null}
      {v.share !== null && <span className="axh-vital-meter"><i style={{'--axh-w': `${Math.max(3, Math.round(v.share * 100))}%`} as CSSProperties}/></span>}
    </li>)}
  </ul>;
}
export function AxhScan({vitals}: {vitals: readonly Vital[]}) {
  return <div className="axh-scan"><AxhHeart/><AxhVitals vitals={vitals}/></div>;
}

/* ---- Body scan ---- */
const OUTLINE = 'M22 24H38Q46 25 47 34L50 62Q50 65 47.5 65Q45 65 44.5 62L42 40L41 64L43 110Q43 114 39.5 114Q36 114 35.5 110L32 72H28L24.5 110Q24 114 20.5 114Q17 114 17 110L19 64L18 40L15.5 62Q15 65 12.5 65Q10 65 10 62L13 34Q14 25 22 24Z';
/** Where each measurement is taken on the outline: a tape line across (or a mark on) that place. */
const PLACE: Readonly<Record<string, string>> = {chest: 'M19 35H41', arm: 'M9.5 48H17.5', waist: 'M19.5 52H40.5', hips: 'M19 63H41', thigh: 'M17.5 82H27.5', weight: 'M14 118.5H46'};
/**
 * The latest body measurements on a simple figure outline: a lit tape line where a place was measured, a dim dashed one
 * where it never was, and beside the figure each place with its value and its day. Decoration: the table says the same.
 * Arrives: the outline draws itself once and the rows tilt up. Alive: one scanner line crosses the figure.
 */
export function AxhBody({view}: {view: BodyView}) {
  return <div className="axh-bodyscan" aria-hidden="true">
    <div className="axh-figure">
      <svg viewBox="0 0 60 122" focusable="false">
        <circle className="axh-figure-line" cx="30" cy="12" r="8" pathLength={1}/>
        <path className="axh-figure-line" pathLength={1} d={OUTLINE}/>
        {view.parts.map(p => <path key={p.kind} className="axh-figure-tape" data-on={p.value !== null ? '' : undefined} d={PLACE[p.kind]}/>)}
      </svg>
      <span className="axh-sweep"/>
    </div>
    <ul className="axh-places">
      {view.parts.map((p, i) => <li key={p.kind} className="axh-place" data-none={p.value === null ? '' : undefined} style={axIndex(i)}>
        <span className="axh-place-label">{p.label}</span>
        <b className="axh-place-value">{p.value ?? 'not measured'}</b>
        {p.asOf ? <span className="axh-place-asof">{p.asOf}</span> : null}
      </li>)}
    </ul>
  </div>;
}
