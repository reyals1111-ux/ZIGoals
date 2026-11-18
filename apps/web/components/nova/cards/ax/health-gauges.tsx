'use client';
import type {GaugesView} from '../../../../lib/nova/cards/ax/health-gauges';
import {Gauge, RingFigure} from '../kit';
import {axIndex} from './kit';
import './health.css';

/**
 * Session AS (ADR-042 Part 2, family: gauges): today's calories, protein, carbohydrates and fat, each an open arc that
 * fills toward the person's own target (the kit's `Gauge`), its amount inside and "of <target>" under it. A nutrient
 * without a target is its amount alone in a plain ring of ticks; one that today's entries do not state is an unlit arc.
 * Over a target is said in words, never coloured as wrong. Decoration: the table says each one.
 * Arrives: the dials turn into place, one after another, and the kit's arcs draw themselves.
 * Alive: one small pip circles the first dial (an ornament; no arc moves).
 */
export function AxhGauges({view}: {view: GaugesView}) {
  return <div className="axh-gauges" aria-hidden="true">
    {view.gauges.map((g, i) => <div key={g.key} className="axh-gauge" data-over={g.over ? '' : undefined} data-none={g.amount === null ? '' : undefined} style={axIndex(i)} title={`${g.label}: ${g.words}`}>
      <span className="axh-gauge-dial">
        {g.target !== null || g.amount === null
          ? <Gauge share={g.share} size={72} sweep={270} start={225} decor><RingFigure figure={g.figure} unit={g.unit}/></Gauge>
          : <span className="axh-gauge-plain"><RingFigure figure={g.figure} unit={g.unit}/></span>}
        {i === 0 && <i className="axh-gauge-orbit"/>}
      </span>
      <span className="axh-gauge-label">{g.label}</span>
      <span className="axh-gauge-of">{g.amount === null ? 'not stated' : g.targetText ? (g.over ? `${g.amount - g.target!} ${g.unit} over ${g.targetText}` : `of ${g.targetText}`) : 'no target'}</span>
    </div>)}
  </div>;
}
