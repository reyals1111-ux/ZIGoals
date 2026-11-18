'use client';
import type {Jar} from '../../../../lib/nova/cards/ax/goals-views';
import {axmVar} from './money-kit';
import './money.css';

/**
 * Session AS (ADR-042 Part 2, family: vessels): each value goal a glass jar, filled to its progress, with its percent
 * under it and its number as in the list. A goal whose value is unknown is an unlit dashed jar with a dash under it,
 * never an empty one. Six jars at most.
 * Arrives: each jar fills from the bottom, one after another. Alive: one small bubble rises in each jar.
 */
export function AxmJars({jars}: {jars: readonly Jar[]}) {
  return <div className="axm-jars axm-inst" aria-hidden="true" style={axmVar('--axm-n', jars.length)}>
    {jars.map((jar, i) => <div key={jar.key} className="axm-jar" data-none={jar.level === null ? '' : undefined} style={{...axmVar('--ax-i', i), ...axmVar('--axm-level', (jar.level ?? 0).toFixed(4))}} title={`${jar.name}: ${jar.text}`}>
      <span className="axm-jar-glass"><i className="axm-jar-lid"/>{jar.level !== null && jar.level > 0 ? <i className="axm-jar-fill"><i className="axm-jar-bubble"/></i> : null}<b className="axm-jar-n">{i + 1}</b></span>
      <span className="axm-jar-figure">{jar.level === null ? '—' : jar.text}</span>
    </div>)}
  </div>;
}
