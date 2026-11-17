'use client';
import type {CSSProperties} from 'react';
import {axIndex} from './kit';

/**
 * Session AS (ADR-042 Part 2, family 2): ranked bars — the rows of an answer by size, the largest first, each bar in up to
 * two parts said apart (missed solid, skipped hatched). The rank is a small lit numeral; the figure stands at the bar's
 * end in words. Arrives: the bars grow from the left, one after another. Alive: the lead bar's cap glints.
 */
export type RankBar = {key: string; label: string; parts: readonly {mark: string; value: number}[]; text: string};
export function AxRanks({rows, max, more}: {rows: readonly RankBar[]; max: number; more?: string | null}) {
  return <ol className="ax-ranks" aria-hidden="true">
    {rows.map((row, i) => <li key={row.key} className="ax-rank" style={axIndex(i)}>
      <span className="ax-rank-n">{i + 1}</span>
      <span className="ax-rank-label" title={row.label}>{row.label}</span>
      <span className="ax-rank-text">{row.text}</span>
      <span className="ax-rank-track">{row.parts.filter(p => p.value > 0).map(p => <i key={p.mark} data-mark={p.mark} style={{'--ax-w': `${Math.max(4, Math.round(p.value / max * 100))}%`} as CSSProperties}/>)}</span>
    </li>)}
    {more ? <li className="ax-rank-more">{more}</li> : null}
  </ol>;
}
