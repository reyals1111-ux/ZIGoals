'use client';
import Link from 'next/link';
import {useId, type CSSProperties, type ReactNode} from 'react';
import {clamp01, linePath, smoothPath} from '../../../lib/nova/holo/geometry';
import type {WidgetParams} from '../../../lib/nova/stage/record';
import type {WidgetSize} from '../../../lib/nova/store';
import {Glint, HoloFigure} from '../holo/parts';
import '../holo/holo-parts.css';
import './cards.css';

/**
 * Session AM (ADR-038 D1–D5; art direction §4): the kit of the widgets NOVA makes on request. A widget's body is one
 * hero instrument and up to two supports, then a foot that names the source and the time of its figures. Everything
 * drawn is decoration over words: each figure is also text, and each widget keeps a table for assistive technology
 * (`HoloTable` in ../holo/parts). Drawings are SVG and CSS only; nothing here runs a script per frame.
 *
 * A body receives its size and the request's small parameters. Whether a *made* widget may read its records at all is
 * the frame's question (components/nova/widget-grid.tsx: the locked state), so a body only handles its own states:
 * reading, unreadable, the page switched off, nothing logged yet (teaching), and live.
 */
export type CardProps = {size: WidgetSize; params: WidgetParams};

/** The foot: where the figures come from and when they are from ("Your Health records · today 14:20"). */
export function CardFoot({source, asOf, children}: {source: string; asOf?: string | null; children?: ReactNode}) {
  return <p className="nc-foot"><span className="nc-foot-source">{source}</span>{asOf ? <span className="nc-foot-asof"> · {asOf}</span> : null}{children}</p>;
}
/** A state that shows no figure: one line of words and at most one action (locked, off, nothing yet). */
export function CardNotice({kind, title, children, href, action, onAction}: {kind: 'locked' | 'off' | 'empty'; title: string; children: ReactNode; href?: string; action?: string; onAction?: () => void}) {
  return <div className="nc-notice" data-kind={kind}>
    <svg className="nc-notice-glyph" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="20" className="nc-notice-ring"/>
      {kind === 'locked' ? <path d="M17 22v-4a7 7 0 0 1 14 0v4M15 22h18v12H15z" className="nc-notice-mark"/>
        : kind === 'off' ? <path d="M24 12v12M16.5 16.5a11 11 0 1 0 15 0" className="nc-notice-mark"/>
        : <path d="M24 15v18M15 24h18" className="nc-notice-mark"/>}
    </svg>
    <div className="nc-notice-words">
      <p className="nc-notice-title">{title}</p>
      <p className="nc-notice-text">{children}</p>
      {action && (href ? <Link className="nc-action" href={href} prefetch={false}>{action}<span aria-hidden="true"> →</span></Link>
        : onAction ? <button type="button" className="nc-action" onClick={onAction}>{action}</button> : null)}
    </div>
  </div>;
}

/** The hero figure: a large tabular number with its unit, and what it is in words under it. */
export function Hero({value, unit, label, children}: {value: string; unit?: string; label: string; children?: ReactNode}) {
  return <div className="nc-hero">
    <p className="nc-hero-figure"><HoloFigure text={value} className="nc-hero-num"/>{unit ? <span className="nc-hero-unit"> {unit}</span> : null}</p>
    <p className="nc-hero-label">{label}</p>
    {children}
  </div>;
}
/** A change over a range, in words, with its direction as a glyph (never colour alone; `good` picks the tone). */
export function Delta({text, direction, good}: {text: string; direction: 'up' | 'down' | 'flat'; good?: boolean | null}) {
  return <span className="nc-delta" data-tone={good === true ? 'good' : good === false ? 'watch' : undefined}>
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d={direction === 'up' ? 'M6 2 10.5 9h-9Z' : direction === 'down' ? 'M6 10 1.5 3h9Z' : 'M1.5 6h9'} /></svg>{text}
  </span>;
}
/** One support line: a small label and its value. */
export function Fact({label, value}: {label: string; value: ReactNode}) {
  return <p className="nc-fact"><span className="nc-fact-label">{label}</span><span className="nc-fact-value">{value}</span></p>;
}

/**
 * A trend: values in time order drawn as one smooth glowing line with a soft fill, the last value marked, the lowest and
 * highest named at the left edge, the first and last dates under it. A gap (null) is skipped, never drawn as zero; with
 * fewer than two values only the marker shows. `marker`: 'heart' draws the last point as a heart (Health).
 */
export function TrendArea({values, labels, minLabel, maxLabel, height = 96, marker = 'dot', target, targetLabel}: {
  values: readonly (number | null)[]; labels?: readonly [string, string]; minLabel?: string; maxLabel?: string; height?: number; marker?: 'dot' | 'heart';
  /** A line the person set themselves (a target weight, a step goal); drawn dashed, named beside it. */
  target?: number | null; targetLabel?: string | null;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), w = 320, pad = 8;
  const known = values.map((v, i) => ({v, i})).filter((p): p is {v: number; i: number} => typeof p.v === 'number' && Number.isFinite(p.v));
  if (!known.length) return null;
  const all = [...known.map(p => p.v), ...(typeof target === 'number' ? [target] : [])], lo = Math.min(...all), hi = Math.max(...all), span = hi - lo || 1;
  const x = (i: number) => values.length > 1 ? pad + (i / (values.length - 1)) * (w - pad * 2) : w / 2, y = (v: number) => pad + (1 - (v - lo) / span) * (height - pad * 2);
  const pts = known.map(p => ({x: +x(p.i).toFixed(2), y: +y(p.v).toFixed(2)})), last = pts.at(-1)!;
  const line = pts.length > 2 ? smoothPath(pts) : linePath(pts);
  return <div className="nc-trend">
    <div className="nc-trend-plot" style={{'--nc-h': `${height}px`} as CSSProperties}>
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs><linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="holo-stop-a"/><stop offset="1" className="holo-stop-b"/></linearGradient></defs>
        <path className="holo-grid-lines" d={[0.25, 0.5, 0.75].map(f => `M0 ${height * f}H${w}`).join('')}/>
        {typeof target === 'number' && <path className="nc-trend-target" d={`M0 ${y(target).toFixed(2)}H${w}`}/>}
        {pts.length > 1 && <path className="holo-spark-fill" fill={`url(#${id}f)`} d={`${line}L${last.x} ${height}L${pts[0]!.x} ${height}Z`}/>}
        {pts.length > 1 && <><path className="holo-spark-line nc-draw" pathLength={1} d={line}/><Glint d={line}/></>}
      </svg>
      {/* The marker is HTML over the stretched drawing, so it stays round (or heart-shaped) at any width. */}
      <span className="nc-trend-mark" data-marker={marker} style={{left: `${(last.x / w) * 100}%`, top: `${(last.y / height) * 100}%`}} aria-hidden="true">
        {marker === 'heart' && <svg viewBox="0 0 24 24" focusable="false"><path d="M12 21.2 3.9 13.4A5.2 5.2 0 0 1 11.3 6l.7.7.7-.7a5.2 5.2 0 0 1 7.4 7.4Z"/></svg>}
      </span>
      {maxLabel && <span className="nc-trend-edge nc-trend-max" aria-hidden="true">{maxLabel}</span>}
      {minLabel && <span className="nc-trend-edge nc-trend-min" aria-hidden="true">{minLabel}</span>}
      {typeof target === 'number' && targetLabel && <span className="nc-trend-edge nc-trend-goal" style={{top: `${(y(target) / height) * 100}%`}} aria-hidden="true">{targetLabel}</span>}
    </div>
    {labels && <p className="nc-trend-dates" aria-hidden="true"><span>{labels[0]}</span><span>{labels[1]}</span></p>}
  </div>;
}

/**
 * A lattice: rows (a habit, a week) of cells (days). A cell is done, missed, not due or still to come; the row's name is
 * text beside it and the whole is described by the widget's table, so the cells are decoration.
 */
export type LatticeCell = 'done' | 'missed' | 'rest' | 'ahead' | 'part';
export function Lattice({rows, columns}: {rows: readonly {key: string; label: string; cells: readonly LatticeCell[]; note?: string}[]; columns: readonly string[]}) {
  return <div className="nc-lattice" style={{'--nc-cols': columns.length} as CSSProperties}>
    <div className="nc-lattice-head" aria-hidden="true"><span/>{columns.map((c, i) => <span key={i}>{c}</span>)}<span/></div>
    {rows.map(r => <div key={r.key} className="nc-lattice-row">
      <span className="nc-lattice-label" title={r.label}>{r.label}</span>
      {r.cells.map((c, i) => <i key={i} data-cell={c} aria-hidden="true"/>)}
      <span className="nc-lattice-note">{r.note ?? ''}</span>
    </div>)}
  </div>;
}

/** Vertical capsules for a range per column (a day's lowest to highest), on one shared scale; labels above and below. */
export function Capsules({items, lo, hi}: {items: readonly {key: string; top: string; min: number; max: number; bottom: string; mark?: ReactNode}[]; lo: number; hi: number}) {
  const span = hi - lo || 1;
  return <div className="nc-capsules">{items.map(it => <div key={it.key} className="nc-capsule">
    <span className="nc-capsule-top">{it.top}</span>
    {it.mark}
    <span className="nc-capsule-track" aria-hidden="true"><i style={{bottom: `${clamp01((it.min - lo) / span) * 100}%`, top: `${(1 - clamp01((it.max - lo) / span)) * 100}%`}}/></span>
    <span className="nc-capsule-bottom">{it.bottom}</span>
  </div>)}</div>;
}

/** Horizontal meters (a budget, a category): a label, the lit share, the value in words; over 100 % reads as over, in words too. */
export function Bars({rows}: {rows: readonly {key: string; label: string; share: number | null; value: string; over?: boolean; note?: string}[]}) {
  return <div className="nc-bars">{rows.map(r => <div key={r.key} className="nc-bar" data-over={r.over || undefined} data-unknown={r.share === null || undefined}>
    <span className="nc-bar-label" title={r.label}>{r.label}</span>
    <span className="nc-bar-value">{r.value}</span>
    <span className="nc-bar-track" aria-hidden="true"><i style={{'--nc-share': r.share === null ? 0 : clamp01(r.share)} as CSSProperties}/></span>
    {r.note && <small className="nc-bar-note">{r.note}</small>}
  </div>)}</div>;
}

/** A column field: one thin glowing column per value on a shared scale (a week of steps), labels under; null is an empty slot. */
export function Columns({values, labels, line, lineLabel, height = 84}: {values: readonly (number | null)[]; labels: readonly string[]; line?: number | null; lineLabel?: string | null; height?: number}) {
  const top = Math.max(1, ...values.map(v => v ?? 0), line ?? 0) * 1.08;
  return <div className="nc-columns" style={{'--nc-h': `${height}px`, '--nc-cols': values.length} as CSSProperties}>
    <div className="nc-columns-plot" aria-hidden="true">
      {values.map((v, i) => <span key={i} className="nc-column" data-empty={v === null || undefined}><i style={{'--nc-share': v === null ? 0 : clamp01(v / top)} as CSSProperties}/></span>)}
      {typeof line === 'number' && <span className="nc-columns-line" style={{bottom: `${clamp01(line / top) * 100}%`}}>{lineLabel ? <b>{lineLabel}</b> : null}</span>}
    </div>
    <div className="nc-columns-labels" aria-hidden="true">{labels.map((l, i) => <span key={i}>{l}</span>)}</div>
  </div>;
}

/** A row of small rings (a share each) with a figure inside and a name under: goals, rings of time. */
export function Rings({items, size = 64}: {items: readonly {key: string; share: number | null; figure: string; label: string; pillar?: string}[]; size?: number}) {
  return <div className="nc-rings" style={{'--nc-ring': `${size}px`} as CSSProperties}>{items.map(it => <div key={it.key} className="nc-ring" data-pillar={it.pillar} data-unknown={it.share === null || undefined}>
    <span className="nc-ring-dial">
      <svg viewBox="-32 -32 64 64" aria-hidden="true" focusable="false">
        <circle r="26" className="nc-ring-track"/>
        {it.share !== null && <circle r="26" className="nc-ring-arc nc-draw" pathLength={1} transform="rotate(-90)" style={{'--nc-len': clamp01(it.share).toFixed(4)} as CSSProperties}/>}
      </svg>
      <b className="nc-ring-figure">{it.figure}</b>
    </span>
    <span className="nc-ring-label" title={it.label}>{it.label}</span>
  </div>)}</div>;
}
