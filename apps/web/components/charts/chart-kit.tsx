import type {ReactNode} from 'react';
import type {Pillar} from '../../lib/pillar-route';
import './charts.css';

/**
 * Session AB-Design Phase 2, Part 4 (owner request 30): one chart language. Every chart in the app draws its frame with
 * these pieces, so weight, sleep, measurements, meditation, pace forecasts, the calculator, wealth over time, the
 * Portfolio and the markets read the same way: faint horizontal guides with their values on the left, dates under the
 * plot, the one nebula ink (cyan → violet → the pillar's accent) for the main line and its soft area, a glass tooltip,
 * and a legend of small swatches under the chart. The pieces only draw; each chart keeps its own data, scales and table.
 */
export const PILLAR_ACCENT: Record<Pillar, string> = {goals: '#c790f6', habits: '#5effd4', health: '#ff74be', wealth: '#ffd27a'};
export const INK = ['#23eaff', '#9273ff'] as const;

/** The gradients a chart refers to: `${id}-ink` (left to right) for lines, `${id}-area` (top to bottom) for areas. */
export function ChartDefs({id, pillar, area}: {id: string; pillar?: Pillar; area?: string}) {
  const end = pillar ? PILLAR_ACCENT[pillar] : '#f06dff';
  return <defs>
    <linearGradient id={`${id}-ink`} x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor={INK[0]}/><stop offset=".55" stopColor={INK[1]}/><stop offset="1" stopColor={end}/></linearGradient>
    <linearGradient id={`${id}-area`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={area ?? INK[1]} stopOpacity=".42"/><stop offset="1" stopColor={area ?? INK[1]} stopOpacity=".03"/></linearGradient>
  </defs>;
}

/** Horizontal guides at the given heights, each with its value right-aligned left of the plot. */
export function ChartGrid({ticks, left, right, labels = true}: {ticks: readonly {y: number; label?: ReactNode}[]; left: number; right: number; labels?: boolean}) {
  return <g className="chart-grid" aria-hidden="true">{ticks.map((t, i) => <g key={i}>
    <line x1={left} x2={right} y1={t.y} y2={t.y}/>
    {labels && t.label !== undefined && <text x={left - 8} y={t.y + 4} textAnchor="end">{t.label}</text>}
  </g>)}</g>;
}

/** Labels under the plot; the first starts at its point, the last ends at it, the rest are centred. A label closer than
 * `gap` px to the one before it (or to the last, which always stays) is left out, so labels never run into each other. */
export function ChartXAxis({ticks, y, edge = true, gap = 56}: {ticks: readonly {x: number; label: ReactNode}[]; y: number; edge?: boolean; gap?: number}) {
  const last = ticks.length - 1, kept: {x: number; label: ReactNode; i: number}[] = [];
  ticks.forEach((t, i) => { const prev = kept.at(-1); if (i === last) { if (prev && t.x - prev.x < gap && prev.i !== 0) kept.pop(); kept.push({...t, i}); } else if (!prev || t.x - prev.x >= gap) { if (last > 0 && i > 0 && ticks[last]!.x - t.x < gap) return; kept.push({...t, i}); } });
  return <g className="chart-axis" aria-hidden="true">{kept.map(t => <text key={t.i} x={t.x} y={y} textAnchor={edge && t.i === 0 && last > 0 ? 'start' : edge && t.i === last && last > 0 ? 'end' : 'middle'}>{t.label}</text>)}</g>;
}

/** The glass tooltip, above the plot's top right; decorative (each chart's table or labels carry the same facts). */
export function ChartTip({children}: {children: ReactNode}) {
  return <p className="chart-tip" aria-hidden="true">{children}</p>;
}

export type LegendItem = {label: ReactNode; kind?: 'line' | 'dot' | 'dash' | 'area' | 'bar'; color?: string; swatch?: ReactNode};
/** Small swatches under a chart: the ink line, a dot, a dashed guide, an area or a bar, each with its words. */
export function ChartLegend({items, className = ''}: {items: readonly LegendItem[]; className?: string}) {
  return <ul className={`chart-legend ${className}`.trim()}>{items.map((it, i) => <li key={i}>{it.swatch ?? <i className={`chart-key chart-key-${it.kind ?? 'line'}`} style={it.color ? {['--key' as string]: it.color} : undefined} aria-hidden="true"/>}{it.label}</li>)}</ul>;
}
