'use client';
import type {CSSProperties} from 'react';
import {WholeRows} from '../whole-rows';
import './day.css';

/**
 * Session AS (ADR-042 Part 2, family: lattices and heat).
 * - `AxdLattice`: rows (a habit) of cells (a day, or a weekday with its count). A day cell is done (lit), missed (a
 *   bright slash), skipped (a dashed cell: marked so, never counted as missed), part (half lit), open (today, ringed),
 *   not due (a dot) or still to come. A count cell says its number and is filled by `level` (0–3). The lattice shows the
 *   rows that fit its panel and then "+N more" (cards/whole-rows.tsx); it is never cut.
 * - `AxdHeat`: a column a week, a cell a day, lit by `level` (1–4) or by the day's state.
 * Arrives: the cells come in column by column, from the left. Alive: a small caret over today's column bobs.
 * Both are decoration: the widget's table says the figures in words.
 */
export type LatticeMark = {state: string; n?: number; level?: number; lead?: boolean; title?: string};
export function AxdLattice({columns, rows, kind = 'days', extra, more}: {
  columns: readonly {key: string; label: string; today?: boolean; lead?: boolean}[];
  rows: readonly {key: string; label: string; cells: readonly LatticeMark[]; note?: string}[];
  kind?: 'days' | 'counts'; extra?: number; more?: (hidden: number, shown: number) => string;
}) {
  return <div className="axd-inst axd-lat" data-kind={kind} style={{'--axd-cols': columns.length} as CSSProperties} aria-hidden="true">
    <WholeRows as="div" inline className="axd-lat-rows" min={1} extra={extra} more={more}
      head={<div className="axd-lat-head" data-wr-keep=""><span/>{columns.map(c => <span key={c.key} data-lead={c.lead || undefined}>{c.label}{c.today ? <i className="axd-lat-now"/> : null}</span>)}<span/></div>}>
      {rows.map(r => <div key={r.key} className="axd-lat-row">
        <span className="axd-lat-label" title={r.label}>{r.label}</span>
        {r.cells.map((c, i) => <i key={i} data-cell={c.state} data-level={c.level} data-lead={c.lead || undefined} style={{'--axd-c': i} as CSSProperties} title={c.title}>{c.n ? <b>{c.n}</b> : null}</i>)}
        <span className="axd-lat-note">{r.note ?? ''}</span>
      </div>)}
    </WholeRows>
  </div>;
}
export type HeatMark = {key: string; state?: string; level?: number; today?: boolean; title?: string};
export function AxdHeat({weeks}: {weeks: readonly {key: string; label?: string | null; cells: readonly HeatMark[]}[]}) {
  return <div className="axd-inst axd-heat" data-dense={weeks.length > 26 ? '' : undefined} style={{'--axd-cols': weeks.length} as CSSProperties} aria-hidden="true">
    <div className="axd-heat-months">{weeks.map(w => <span key={w.key}>{w.label ?? ''}{w.cells.some(c => c.today) ? <i className="axd-lat-now"/> : null}</span>)}</div>
    <div className="axd-heat-grid">{weeks.map((w, n) => <div key={w.key} className="axd-heat-week" style={{'--axd-c': n} as CSSProperties}>
      {w.cells.map(c => <i key={c.key} data-cell={c.state} data-level={c.level || undefined} data-today={c.today ? '' : undefined} title={c.title}/>)}
    </div>)}</div>
  </div>;
}
