'use client';
import Link from 'next/link';
import {useId, type CSSProperties, type ReactNode} from 'react';
import {HEART_PATH, arcPath, clamp01, linePath, polar, smoothPath, tickPath} from '../../../lib/nova/holo/geometry';
import type {WidgetParams} from '../../../lib/nova/stage/record';
import type {WidgetSize} from '../../../lib/nova/store';
import {HoloFigure, Orn} from '../holo/parts';
import '../holo/holo-parts.css';
import './cards.css';

/**
 * Session AM (ADR-038 D1–D5; art direction §4) and AM-2 (the design language, sections B–E): the kit of the widgets NOVA
 * makes on request. A widget's body is one hero instrument and up to two supports, then a foot that names the source and
 * the time of its figures. Everything drawn is decoration over words: each figure is also text, and each widget keeps a
 * table for assistive technology (`HoloTable` in ../holo/parts). Drawings are SVG and CSS only; nothing here runs a script
 * per frame.
 *
 * AM-2: light has weight. A data mark is three static layers — a soft bloom (`nc-glow`: a blurred copy that never moves),
 * the mark itself in a gradient from the realm's neon into its lighter second colour, and a lit dot at its leading end.
 * Only transform and opacity move, and a line or an arc may draw itself once (stroke-dashoffset) when its widget is made;
 * the one thing that turns is an ornament (`Orn`, the HUD's own `holo-spin`).
 *
 * A body receives its size and the request's small parameters. Whether a *made* widget may read its records at all is
 * the frame's question (components/nova/widget-grid.tsx: the locked state), so a body only handles its own states:
 * reading, unreadable, the page switched off, nothing logged yet (teaching), and live.
 */
export type CardProps = {size: WidgetSize; params: WidgetParams};
const useUid = () => useId().replace(/[^a-zA-Z0-9]/g, '');
const f2 = (n: number) => +n.toFixed(2);

/**
 * The foot, an instrument strip: a small live dot, where the figures come from and when they are from ("Your Health
 * records · today 14:20"), on a hairline. Design review AM-D38: every foot is the last line of its widget, on the same
 * baseline as its neighbours' (the body fills its frame and the foot takes the space above it), and it is one line, cut
 * with an ellipsis (its whole text is its tooltip). `wrap`: a credit that must stay whole (the weather's service and
 * licence links) may take a second line.
 */
export function CardFoot({source, asOf, children, wrap}: {source: string; asOf?: string | null; children?: ReactNode; wrap?: boolean}) {
  return <p className="nc-foot" data-wrap={wrap || undefined} title={wrap ? undefined : `${source}${asOf ? ` · ${asOf}` : ''}`}><i className="nc-foot-dot" aria-hidden="true"/><span className="nc-foot-source">{source}</span>{asOf ? <span className="nc-foot-asof"> · {asOf}</span> : null}{children}</p>;
}

/** The unlit shape of an instrument, for a state that has no figure to draw yet: hairlines and dashes only. */
export type Ghost = 'ring' | 'trend' | 'columns' | 'bars' | 'lattice' | 'rows' | 'sky' | 'arc';
function GhostShape({kind}: {kind: Ghost}) {
  const body = kind === 'trend' ? <><path className="nc-ghost-grid" d="M0 16H160M0 32H160M0 48H160M40 0V64M80 0V64M120 0V64"/><path className="nc-ghost-line" d="M4 50C24 46 34 30 52 34S84 52 100 36s30-24 54-22"/><circle className="nc-ghost-dot" cx="154" cy="14" r="4"/></>
    : kind === 'columns' ? <><path className="nc-ghost-grid" d="M0 16H160M0 32H160M0 48H160"/>{[30, 44, 22, 52, 36, 48, 26].map((h, i) => <rect key={i} className="nc-ghost-line" x={8 + i * 22} y={63 - h} width="12" height={h} rx="2"/>)}<path className="nc-ghost-base" d="M0 63.5H160"/></>
    : kind === 'bars' ? <>{[0, 1, 2].map(i => <g key={i}><rect className="nc-ghost-line" x="4" y={8 + i * 20} width="152" height="8" rx="2"/><path className="nc-ghost-base" d={`M6 ${12 + i * 20}H${[96, 58, 124][i]}`}/></g>)}</>
    : kind === 'lattice' ? <>{Array.from({length: 21}, (_, i) => <rect key={i} className="nc-ghost-line" x={22 + (i % 7) * 18} y={6 + Math.floor(i / 7) * 18} width="13" height="13" rx="3"/>)}</>
    : kind === 'rows' ? <>{[0, 1, 2].map(i => <g key={i}><circle className="nc-ghost-dot" cx="10" cy={12 + i * 20} r="3.5"/><path className="nc-ghost-base" d={`M24 ${12 + i * 20}H${[120, 96, 132][i]}`}/><path className="nc-ghost-grid" d={`M0 ${22 + i * 20}H160`}/></g>)}<path className="nc-ghost-line" d="M10 16V48"/></>
    : kind === 'sky' ? <><circle className="nc-ghost-line" cx="52" cy="26" r="13"/><path className="nc-ghost-base" d={tickPath(52, 26, 18, 23, 12)}/><path className="nc-ghost-line" d="M70 54a11 11 0 0 1 2-21.8A15 15 0 0 1 100 30a12 12 0 0 1 11 24Z"/></>
    : kind === 'arc' ? <><path className="nc-ghost-line" d="M20 56A60 50 0 0 1 140 56"/><path className="nc-ghost-base" d="M6 56H154"/><circle className="nc-ghost-dot" cx="52" cy="19" r="4.5"/></>
    : <><circle className="nc-ghost-line" cx="80" cy="32" r="24"/><path className="nc-ghost-base" d={tickPath(80, 32, 28, 31, 40)}/><path className="nc-ghost-grid" d="M0 32H44M116 32H160"/></>;
  return <svg className="nc-notice-ghost" viewBox="0 0 160 64" aria-hidden="true" focusable="false">{body}</svg>;
}
/**
 * A state that shows no figure (locked, off, nothing yet): never a plain paragraph — a small unlit dial with the state's
 * mark, the dim ghost of the instrument that would be here, one line of words and at most one action, as a key.
 */
export function CardNotice({kind, title, children, href, action, onAction, ghost = kind === 'locked' ? 'ring' : kind === 'off' ? 'sky' : 'trend'}: {kind: 'locked' | 'off' | 'empty'; title: string; children: ReactNode; href?: string; action?: string; onAction?: () => void; ghost?: Ghost}) {
  return <div className="nc-notice" data-kind={kind}>
    <GhostShape kind={ghost}/>
    <svg className="nc-notice-glyph" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path className="nc-notice-ticks" d={tickPath(24, 24, 20.5, 23.5, 36)}/>
      <circle cx="24" cy="24" r="17.5" className="nc-notice-ring"/>
      <path className="nc-notice-arc" d={arcPath(24, 24, 17.5, 300, 420)}/>
      {kind === 'locked' ? <path d="M19.5 23v-3.2a4.5 4.5 0 0 1 9 0V23M17.5 23h13v8.5h-13z" className="nc-notice-mark"/>
        : kind === 'off' ? <path d="M24 15.5v8M18.8 18.6a7.4 7.4 0 1 0 10.4 0" className="nc-notice-mark"/>
        : <path d="M24 17.5v13M17.5 24h13" className="nc-notice-mark"/>}
    </svg>
    <div className="nc-notice-words">
      <p className="nc-notice-title">{title}</p>
      <p className="nc-notice-text">{children}</p>
      {action && (href ? <Link className="nc-action" href={href} prefetch={false}>{action}<span aria-hidden="true"> →</span></Link>
        : onAction ? <button type="button" className="nc-action" onClick={onAction}>{action}</button> : null)}
    </div>
  </div>;
}

/** The hero figure: a large tabular number with its unit, and what it is in words (a tracked label). */
export function Hero({value, unit, label, children}: {value: string; unit?: string; label: string; children?: ReactNode}) {
  return <div className="nc-hero" data-len={value.length > 11 ? 'xl' : value.length > 8 ? 'l' : undefined}>
    <p className="nc-hero-figure"><HoloFigure text={value} className="nc-hero-num"/>{unit ? <span className="nc-hero-unit"> {unit}</span> : null}</p>
    <div className="nc-hero-words"><p className="nc-hero-label">{label}</p>{children}</div>
  </div>;
}
/** A change over a range, in words, with its direction as a glyph in a small lit key (never colour alone; `good` picks the tone). */
export function Delta({text, direction, good}: {text: string; direction: 'up' | 'down' | 'flat'; good?: boolean | null}) {
  return <span className="nc-delta" data-tone={good === true ? 'good' : good === false ? 'watch' : undefined}>
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d={direction === 'up' ? 'M6 2.5 10 9H2Z' : direction === 'down' ? 'M6 9.5 2 3h8Z' : 'M2 6h8'} /></svg>{text}
  </span>;
}
/** One support line, as a row: a lit node, a small label and its value. */
export function Fact({label, value}: {label: string; value: ReactNode}) {
  return <p className="nc-fact"><span className="nc-fact-label">{label}</span><span className="nc-fact-value">{value}</span></p>;
}

/**
 * One lit arc of a gauge, inside an SVG whose box is −50…50: a dim track, the value as a thick arc in a gradient that is
 * brightest at its leading end, a lit dot there and a soft bloom behind it. Unknown (null) is an unlit dashed track,
 * never 0. `w` is the arc's width in the box's units at the gauge's design size: it only places the radius. The stroke
 * itself is set in the sheet from the gauge's own `--nc-w` (px) and `--nc-d` (its diameter in px), so a gauge that a
 * container query makes larger keeps a 5–6 px line instead of a thick band; `k` thins one arc of several (inner rings).
 */
export function ArcMark({share, r, w, start = 0, sweep = 360, k}: {share: number | null; r: number; w: number; start?: number; sweep?: number; k?: number}) {
  const id = useUid(), s = share === null ? 0 : clamp01(share);
  const a1 = start + sweep * s, span = a1 - start, lit = span > 0.5 ? arcPath(0, 0, r, start, a1) : '', end = polar(0, 0, r, a1);
  // The gradient runs along the last half-turn of the arc, so its leading end is always the brightest part.
  const half = Math.min(span, 180) / 2, phi = (a1 - half) * Math.PI / 180, ext = Math.max(1, r * Math.sin(half * Math.PI / 180)), gx = f2(Math.cos(phi) * ext), gy = f2(Math.sin(phi) * ext);
  return <g className="nc-arcmark" data-unknown={share === null || undefined} style={k ? {'--nc-wk': k} as CSSProperties : undefined}>
    <defs><linearGradient id={`${id}g`} gradientUnits="userSpaceOnUse" x1={-gx} y1={-gy} x2={gx} y2={gy}><stop offset="0" className="nc-g-a"/><stop offset="1" className="nc-g-b"/></linearGradient></defs>
    <path className="nc-gauge-track" d={arcPath(0, 0, r, start, start + sweep)}/>
    {lit && <>
      <path className="nc-gauge-glow nc-glow" d={lit}/>
      <path className="nc-gauge-arc nc-draw" pathLength={1} stroke={`url(#${id}g)`} d={lit}/>
      <path className="nc-glint nc-gauge-glint" d={lit}/>
      <circle className="nc-gauge-end" cx={end.x} cy={end.y} r={f2(w * .78)}/>
    </>}
  </g>;
}
/**
 * A ring gauge (AM-2 D): the lit arc (`ArcMark`) inside a tick bezel (every fifth tick longer), the figure, if any, in the
 * middle (its children). `sweep` under 360 opens the ring (a dial); `spin` adds one slowly turning ornament ring (never
 * the data). Decoration: the words beside it carry the value. `size` is its diameter in px where nothing else decides:
 * the sheets make a hero gauge larger in a larger panel (container queries set `--nc-d`), and its line stays `thick` px.
 */
export function Gauge({share, size = 64, sweep = 360, start = 0, bezel, spin = false, thick, ticks, children, className = '', tone, extra, decor}: {
  share: number | null; size?: number; sweep?: number; start?: number; bezel?: boolean; spin?: boolean; thick?: number; ticks?: number; children?: ReactNode; className?: string; tone?: 'over';
  /** The whole gauge, its figure too, is decoration over words beside it (hidden from assistive technology). */
  decor?: boolean;
  /** More drawing inside the gauge's own box (viewBox −50…50), under its arc: inner ornament rings, milestone marks. */
  extra?: ReactNode;
}) {
  const k = 100 / size, rim = bezel ?? size >= 60, px = thick ?? (size >= 100 ? 6 : size >= 60 ? 5.5 : 4.2), w = px * k, r = (rim ? 41 : 46.5) - w / 2;
  const n = ticks ?? Math.max(2, Math.round(60 * sweep / 360)), full = sweep >= 360;
  return <span className={`nc-gauge ${className}`.trim()} data-tone={tone} data-rim={rim || undefined} aria-hidden={decor || undefined} style={{'--nc-d0': size, '--nc-w': px} as CSSProperties}>
    <svg viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">
      {rim && <><path className="nc-bezel" d={tickPath(0, 0, 45, 47.5, full ? n : n + 1, start, sweep)}/><path className="nc-bezel nc-bezel-major" d={tickPath(0, 0, 44, 49, full ? Math.round(n / 5) : Math.round(n / 5) + 1, start, sweep)}/></>}
      {extra}
      <ArcMark share={share} r={r} w={w} start={start} sweep={sweep}/>
    </svg>
    {spin && rim && <Orn view="-50 -50 100 100"><circle className="nc-gauge-orbit" r="49.4"/></Orn>}
    {children !== undefined && children !== null && <span className="nc-gauge-centre">{children}</span>}
  </span>;
}

/**
 * A trend: values in time order drawn as one smooth glowing line (a gradient that brightens toward the newest value) over a
 * soft fill and a fine grid, the last value marked with a lit point and a drop line, the lowest and highest named at the
 * left edge, the first and last dates under it. A gap (null) is skipped, never drawn as zero; with fewer than two values
 * only the marker shows. `marker`: 'heart' draws the last point as a heart (Health).
 */
export function TrendArea({values, labels, minLabel, maxLabel, height = 96, marker = 'dot', target, targetLabel}: {
  values: readonly (number | null)[]; labels?: readonly [string, string]; minLabel?: string; maxLabel?: string; height?: number; marker?: 'dot' | 'heart';
  /** A line the person set themselves (a target weight, a step goal); drawn dashed, named beside it. */
  target?: number | null; targetLabel?: string | null;
}) {
  const id = useUid(), w = 320, pad = 9;
  const known = values.map((v, i) => ({v, i})).filter((p): p is {v: number; i: number} => typeof p.v === 'number' && Number.isFinite(p.v));
  if (!known.length) return null;
  const all = [...known.map(p => p.v), ...(typeof target === 'number' ? [target] : [])], lo = Math.min(...all), hi = Math.max(...all), span = hi - lo || 1;
  const x = (i: number) => values.length > 1 ? pad + (i / (values.length - 1)) * (w - pad * 2) : w / 2, y = (v: number) => pad + (1 - (v - lo) / span) * (height - pad * 2);
  const pts = known.map(p => ({x: +x(p.i).toFixed(2), y: +y(p.v).toFixed(2)})), last = pts.at(-1)!;
  const line = pts.length > 2 ? smoothPath(pts) : linePath(pts);
  return <div className="nc-trend">
    <div className="nc-trend-plot" style={{'--nc-h': `${height}px`} as CSSProperties}>
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="nc-fill-a"/><stop offset=".55" className="nc-fill-m"/><stop offset="1" className="nc-fill-b"/></linearGradient>
          <linearGradient id={`${id}s`} gradientUnits="userSpaceOnUse" x1={pts[0]!.x} y1="0" x2={Math.max(last.x, pts[0]!.x + 1)} y2="0"><stop offset="0" className="nc-g-a"/><stop offset="1" className="nc-g-b"/></linearGradient>
        </defs>
        {typeof target === 'number' && <path className="nc-trend-target" d={`M0 ${y(target).toFixed(2)}H${w}`}/>}
        {pts.length > 1 && <path className="nc-trend-fill" fill={`url(#${id}f)`} d={`${line}L${last.x} ${height}L${pts[0]!.x} ${height}Z`}/>}
        {pts.length > 1 && <><path className="nc-trend-glow nc-glow" d={line}/><path className="nc-trend-line nc-draw" pathLength={1} stroke={`url(#${id}s)`} d={line}/><path className="nc-glint nc-trend-glint" d={line}/></>}
        <path className="nc-trend-drop" d={`M${last.x} ${last.y}V${height}`}/>
      </svg>
      {/* The marker is HTML over the stretched drawing, so it stays round (or heart-shaped) at any width. */}
      <span className="nc-trend-mark nc-lead" data-marker={marker} style={{left: `${(last.x / w) * 100}%`, top: `${(last.y / height) * 100}%`}} aria-hidden="true">
        {marker === 'heart' && <svg viewBox="0 0 24 24" focusable="false"><path d={HEART_PATH}/></svg>}
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
export function Lattice({rows, columns}: {rows: readonly {key: string; label: string; cells: readonly LatticeCell[]; note?: string; /** The cell that is today (a ring around it), if it is in this row. */ today?: number}[]; columns: readonly string[]}) {
  return <div className="nc-lattice" style={{'--nc-cols': columns.length} as CSSProperties}>
    <div className="nc-lattice-head" aria-hidden="true"><span/>{columns.map((c, i) => <span key={i}>{c}</span>)}<span/></div>
    {rows.map((r, n) => <div key={r.key} className="nc-lattice-row">
      <span className="nc-lattice-label" title={r.label}>{r.label}</span>
      {r.cells.map((c, i) => <i key={i} data-cell={c} data-today={r.today === i || undefined} style={{'--nc-i': n * 2 + i} as CSSProperties} aria-hidden="true"/>)}
      <span className="nc-lattice-note">{r.note ?? ''}</span>
    </div>)}
  </div>;
}

/** Vertical capsules for a range per column (a day's lowest to highest), on one shared scale; labels above and below. */
export function Capsules({items, lo, hi}: {items: readonly {key: string; top: ReactNode; min: number; max: number; bottom: ReactNode; mark?: ReactNode; name?: ReactNode}[]; lo: number; hi: number}) {
  const span = hi - lo || 1;
  return <ol className="nc-capsules">{items.map(it => <li key={it.key} className="nc-capsule">
    {it.name}
    {it.mark}
    <span className="nc-capsule-top">{it.top}</span>
    <span className="nc-capsule-track" aria-hidden="true"><i style={{bottom: `${clamp01((it.min - lo) / span) * 100}%`, top: `${(1 - clamp01((it.max - lo) / span)) * 100}%`}}/></span>
    <span className="nc-capsule-bottom">{it.bottom}</span>
  </li>)}</ol>;
}

/**
 * Horizontal meters (a budget, a category): a lit node and a label, the value in words, and under them a ticked track
 * with the lit share and a white-hot leading end; over 100 % reads as over, in words too. Unknown is a dashed, unlit track.
 */
export function Bars({rows, keyed}: {rows: readonly {key: string; label: string; share: number | null; value: string; over?: boolean; note?: string}[]; /** The rows are the parts of a `StackBar` above them: each node wears its part's shade. */ keyed?: boolean}) {
  return <div className="nc-bars" data-keyed={keyed || undefined}>{rows.map((r, i) => <div key={r.key} className="nc-bar" data-i={i % 4} data-over={r.over || undefined} data-unknown={r.share === null || undefined}>
    <span className="nc-bar-label" title={r.label}>{r.label}</span>
    <span className="nc-bar-value">{r.value}</span>
    <span className="nc-bar-track" aria-hidden="true"><i style={{'--nc-share': r.share === null ? 0 : clamp01(r.share), '--nc-i': i} as CSSProperties}/></span>
    {r.note && <small className="nc-bar-note">{r.note}</small>}
  </div>)}</div>;
}
/** One stacked bar: the parts of a whole side by side (each a share 0–1, in order), what is left of the whole unlit. Decoration over the rows that name each part. */
export function StackBar({parts}: {parts: readonly {key: string; share: number}[]}) {
  const lit = parts.map(p => ({key: p.key, share: clamp01(p.share)})).filter(p => p.share > 0), rest = Math.max(0, 1 - lit.reduce((a, p) => a + p.share, 0));
  if (!lit.length) return null;
  return <span className="nc-stack" aria-hidden="true">{lit.map((p, i) => <i key={p.key} data-i={i % 4} style={{flexGrow: Math.max(.012, p.share)}}/>)}{rest > 0.004 && <i data-rest="" style={{flexGrow: rest}}/>}</span>;
}

/**
 * A column field: one glowing column per value on a shared scale (a week of steps), each in its own faint glass tube, with
 * a white-hot cap, on a fine grid; labels under; null is an empty tube, never a zero. `mark` lights one column's tube
 * (the newest day).
 */
export function Columns({values, labels, line, lineLabel, height = 84, mark}: {values: readonly (number | null)[]; labels: readonly string[]; line?: number | null; lineLabel?: string | null; height?: number; mark?: number}) {
  const top = Math.max(1, ...values.map(v => v ?? 0), line ?? 0) * 1.08;
  return <div className="nc-columns" style={{'--nc-h': `${height}px`, '--nc-cols': values.length} as CSSProperties}>
    <div className="nc-columns-plot" aria-hidden="true">
      {values.map((v, i) => <span key={i} className="nc-column" data-empty={v === null || undefined} data-mark={mark === i || undefined}><i style={{'--nc-share': v === null ? 0 : clamp01(v / top), '--nc-i': i} as CSSProperties}/></span>)}
      {typeof line === 'number' && <span className="nc-columns-line" style={{bottom: `${clamp01(line / top) * 100}%`}}>{lineLabel ? <b>{lineLabel}</b> : null}</span>}
    </div>
    <div className="nc-columns-labels" aria-hidden="true">{labels.map((l, i) => <span key={i}>{l}</span>)}</div>
  </div>;
}

/** A row of ring gauges (a share each) with a figure inside and a name under: goals, rings of time. */
export function Rings({items, size = 64}: {items: readonly {key: string; share: number | null; figure: string; label: string; pillar?: string}[]; size?: number}) {
  return <div className="nc-rings" style={{'--nc-ring': `${size}px`} as CSSProperties}>{items.map(it => <div key={it.key} className="nc-ring" data-pillar={it.pillar} data-unknown={it.share === null || undefined}>
    <Gauge share={it.share} size={size} className="nc-ring-dial"><b className="nc-ring-figure">{it.figure}</b></Gauge>
    <span className="nc-ring-label" title={it.label}>{it.label}</span>
  </div>)}</div>;
}

/* ---- Health's motif: the heartbeat ---- */
const BEAT = 'M0 14H26l4-5 4 5h7l4 9 6-21 6 17 4-5h9l4-4 4 4H120';
/** A heartbeat trace (ornament, never a reading): one thin lit line that draws itself once when the widget is made. */
export function HeartTrace({className = ''}: {className?: string}) {
  return <svg className={`nc-pulse ${className}`.trim()} viewBox="0 0 120 28" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path className="nc-pulse-glow nc-glow" d={BEAT}/><path className="nc-pulse-line nc-draw" pathLength={1} d={BEAT}/>
  </svg>;
}
/** A glass heart with the heartbeat across it (ornament): Health's mark beside a hero figure or inside a ring. */
export function HeartMark({size = 44}: {size?: number}) {
  const id = useUid();
  return <svg className="nc-heart" viewBox="0 0 48 44" width={size} height={size * 44 / 48} aria-hidden="true" focusable="false">
    <defs><linearGradient id={`${id}h`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" className="nc-g-b"/><stop offset="1" className="nc-g-a"/></linearGradient></defs>
    <path className="nc-heart-glow nc-glow" transform="scale(2) translate(0 -1.6)" d={HEART_PATH}/>
    <path className="nc-heart-shell" transform="scale(2) translate(0 -1.6)" stroke={`url(#${id}h)`} d={HEART_PATH}/>
    <path className="nc-heart-beat" d="M9 22h8l2.6-4.6 4 11.6 4.2-15 3.4 8H39"/>
  </svg>;
}
