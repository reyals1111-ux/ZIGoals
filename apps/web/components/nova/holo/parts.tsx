'use client';
import Link from 'next/link';
import {useId, type CSSProperties, type ReactNode} from 'react';
import {NumberTicker} from '../../motion/number-ticker';
import {HEART_PATH, arcPath, clamp01, flowRibbons, histogramBars, histogramY, linePath, polar, segmentsLit, smoothPath, sparkPoints, tickPath, timePoints} from '../../../lib/nova/holo/geometry';
import {useChangeCount} from './use-hud-motion';

/**
 * Session AL Part 11 (lane L8): the HUD's drawing parts. Every drawing is decoration over words: the figures it shows are
 * also written as text beside it (and each panel keeps a table for assistive technology), so the SVG is aria-hidden.
 * Ornaments (tick scales, the turning outer rings, the lens ring, rulers, corner brackets) are thin and dim and never vary
 * with data; data marks (arcs, lit segments, bars, lines, filled hearts, slider dots) are bright, in the panel's pillar
 * neon. Glow is decoration: every figure's own colour carries its contrast (≥ 4.5:1 on the night glass).
 *
 * Second pass: a turning ornament is its own HTML layer (`Orn`), not a group inside the data's SVG, so the browser turns it
 * on the compositor (transform only) and never repaints the instrument under it — one frame of the HUD costs no main-thread
 * paint while it turns (AL_SCOPE B, performance).
 */

/** A turning ornament: its own layer over the instrument (aria-hidden; it only ever turns, never says anything). */
export function Orn({children, reverse = false, view = '-60 -60 120 120', className = ''}: {children: ReactNode; reverse?: boolean; view?: string; className?: string}) {
  return <span className={`holo-orn ${className}`.trim()} data-motion-essential="" data-rev={reverse || undefined} aria-hidden="true">
    <svg viewBox={view} focusable="false">{children}</svg>
  </span>;
}
/** The lens ring: a thin ring in a cyan → magenta gradient (an ornament around a dial or the orb; it turns with the others). */
export function LensRing({className = ''}: {className?: string}) {
  return <span className={`holo-lens ${className}`.trim()} data-motion-essential="" aria-hidden="true"/>;
}

/** A figure that counts up once (Full motion) and pulses when it changes (Full: a glow; Calm: a fade; Off: nothing). */
export function HoloFigure({text, className = ''}: {text: string; className?: string}) {
  const changed = useChangeCount(text);
  return <span key={changed} className={`holo-num ${className}`.trim()} data-pulse={changed ? '' : undefined}><NumberTicker text={text}/></span>;
}

/** A labelled meter: the label, a row of segments lit by the share, and the value against its target in words. */
export function SegMeter({label, share, text, targetText, note, count = 12, compact = false}: {label: string; share: number | null; text: string; targetText?: string | null; note?: string | null; count?: number; compact?: boolean}) {
  const lit = segmentsLit(share, count);
  return <div className="holo-meter" data-compact={compact || undefined} data-unknown={share === null || undefined}>
    <span className="holo-meter-label">{label}</span>
    <span className="holo-segs" aria-hidden="true">{Array.from({length: count}, (_, i) => <i key={i} data-lit={i < lit.full || undefined} style={i === lit.full && lit.part ? {'--part': lit.part} as CSSProperties : undefined}/>)}</span>
    <span className="holo-meter-value"><HoloFigure text={text}/>{targetText ? <small> / {targetText}</small> : null}</span>
    {note && <small className="holo-note" title={compact ? note : undefined}>{note}</small>}
  </div>;
}

/** A ring gauge: a dim tick scale (ornament, still), a turning dashed outer ring (ornament), a track and the bright data arc. */
export function TickRing({share, size = 120, ticks = 60, children, className = '', lens = false}: {share: number | null; size?: number; ticks?: number; children?: ReactNode; className?: string; lens?: boolean}) {
  const s = share === null ? 0 : clamp01(share), end = polar(0, 0, 40, s * 360);
  return <div className={`holo-ring ${className}`.trim()} style={{'--ring': `${size}px`} as CSSProperties}>
    <svg viewBox="-60 -60 120 120" aria-hidden="true" focusable="false">
      <path className="holo-orn-ticks" d={tickPath(0, 0, 49, 52, ticks)}/>
      <path className="holo-orn-ticks holo-orn-major" d={tickPath(0, 0, 47, 53, 12)}/>
      <circle className="holo-track" r="40" data-unknown={share === null || undefined}/>
      {s > 0 && <><path className="holo-arc" d={arcPath(0, 0, 40, 0, s * 360)}/><circle className="holo-arc-end" cx={end.x} cy={end.y} r="3.2"/></>}
    </svg>
    <Orn><circle className="holo-orn-dash" r="57"/></Orn>
    {lens && <LensRing/>}
    {children && <div className="holo-ring-centre">{children}</div>}
  </div>;
}

/**
 * Concentric rings, one figure each (the habits' streaks, the core around the orb): outer first. Each track is segmented
 * like an orbit (an ornament, the same for every value); the arc over it is the figure. A tick ring turns outside them.
 */
export function RingStack({rings, size = 120, gap = 9, segments = 0}: {rings: {key: string; share: number | null; pillar?: string}[]; size?: number; gap?: number; segments?: number}) {
  return <span className="holo-stack-box" style={{'--ring': `${size}px`} as CSSProperties} aria-hidden="true">
    <svg className="holo-stack" viewBox="-60 -60 120 120" focusable="false">
      {rings.map((r, i) => {
        const rad = 50 - i * gap, s = r.share === null ? 0 : clamp01(r.share), end = polar(0, 0, rad, s * 360);
        const seg = segments > 0 ? (2 * Math.PI * rad) / segments : 0;
        return <g key={r.key} data-pillar={r.pillar}>
          <circle className="holo-track" r={rad} data-unknown={r.share === null || undefined} style={seg && r.share !== null ? {strokeDasharray: `${(seg * 0.72).toFixed(2)} ${(seg * 0.28).toFixed(2)}`} : undefined}/>
          {s > 0 && <><path className="holo-arc" d={arcPath(0, 0, rad, 0, s * 360)}/><circle className="holo-arc-end" cx={end.x} cy={end.y} r="2.6"/></>}
        </g>;
      })}
    </svg>
    <Orn reverse><path className="holo-orn-ticks" d={tickPath(0, 0, 56, 58.5, 72)}/></Orn>
  </span>;
}

/** A gauge across 240° (the consistency dial): ornament ticks, track, bright arc, the figure in its centre. */
export function Dial({share, size = 96, children}: {share: number | null; size?: number; children?: ReactNode}) {
  const s = share === null ? 0 : clamp01(share);
  return <div className="holo-ring holo-dial" style={{'--ring': `${size}px`} as CSSProperties}>
    <svg viewBox="-60 -60 120 120" aria-hidden="true" focusable="false">
      <path className="holo-orn-ticks" d={tickPath(0, 0, 49, 53, 25, -120, 240)}/>
      <path className="holo-track-path" d={arcPath(0, 0, 42, -120, 120)}/>
      {s > 0 && <path className="holo-arc" d={arcPath(0, 0, 42, -120, -120 + 240 * s)}/>}
    </svg>
    {children && <div className="holo-ring-centre">{children}</div>}
  </div>;
}

/** A glowing line through values (null breaks nothing: it is skipped) with a soft fill under it. */
export function Spark({values, width = 220, height = 56, className = '', domain}: {values: readonly (number | null)[]; width?: number; height?: number; className?: string; domain?: {min: number; max: number}}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), pts = sparkPoints(values, width, height, 3, domain);
  if (!pts.length) return null;
  const line = linePath(pts), last = pts.at(-1)!;
  return <svg className={`holo-spark ${className}`.trim()} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs><linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="holo-stop-a"/><stop offset="1" className="holo-stop-b"/></linearGradient></defs>
    <path className="holo-grid-lines" d={[0.25, 0.5, 0.75].map(f => `M0 ${height * f}H${width}`).join('')}/>
    {pts.length > 1 && <path d={`${line}L${last.x} ${height}L${pts[0]!.x} ${height}Z`} fill={`url(#${id}f)`} className="holo-spark-fill"/>}
    <path className="holo-spark-line" d={pts.length > 1 ? line : `M${last.x - 2} ${last.y}h4`}/>
    <circle className="holo-arc-end" cx={last.x} cy={last.y} r="3"/>
  </svg>;
}

/**
 * The framed wave (the reference's flowing amber line): a recorded history placed by time, drawn as a smooth monotone curve
 * (never above or below the records it joins) with a soft glow, over fine grid lines and a row of thin tick bars (an
 * ornament ruler), in a HUD frame whose corner labels say the highest and lowest values and the first and last dates.
 */
export function WaveChart({points, width = 300, height = 84, labels, className = ''}: {
  points: readonly {at: string; value: number}[]; width?: number; height?: number; className?: string;
  labels: {top: string; bottom: string; from: string; to: string};
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), pts = timePoints(points, width, height, 4);
  if (pts.length < 2) return null;
  const line = smoothPath(pts), last = pts.at(-1)!;
  return <figure className={`holo-frame holo-wave ${className}`.trim()} aria-hidden="true">
    <span className="holo-frame-label" data-at="top">{labels.top}</span>
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" focusable="false">
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="holo-stop-a"/><stop offset="1" className="holo-stop-b"/></linearGradient>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" className="holo-wave-a"/><stop offset="1" className="holo-wave-b"/></linearGradient>
      </defs>
      <path className="holo-grid-lines holo-grid-fine" d={Array.from({length: 7}, (_, i) => `M0 ${(height * (i + 1) / 8).toFixed(1)}H${width}`).join('')}/>
      <path className="holo-ruler-bars" d={Array.from({length: 48}, (_, i) => `M${(width * (i + 0.5) / 48).toFixed(1)} ${height}v${i % 6 === 0 ? -9 : -4}`).join('')}/>
      <path d={`${line}L${last.x} ${height}L${pts[0]!.x} ${height}Z`} fill={`url(#${id}f)`} className="holo-spark-fill"/>
      <path className="holo-wave-glow" d={line}/>
      <path className="holo-wave-line" d={line} stroke={`url(#${id}l)`}/>
      <circle className="holo-arc-end" cx={last.x} cy={last.y} r="3.2"/>
    </svg>
    <span className="holo-frame-label" data-at="bottom">{labels.bottom}</span>
    <span className="holo-frame-label" data-at="from">{labels.from}</span>
    <span className="holo-frame-label" data-at="to">{labels.to}</span>
  </figure>;
}

/**
 * The histogram (the reference's pink/violet bars with cyan tips and a line through them): one bar per value, a gradient
 * body and a bright tip, an empty dashed slot where the value is unknown, and an optional reference line (a target)
 * through the bars, named in words beside the chart by the caller. Day letters sit under the slots.
 */
export function Histogram({values, line, labels, width = 280, height = 64}: {values: readonly (number | null)[]; line?: number | null; labels: readonly string[]; width?: number; height?: number}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), max = line ?? undefined, bars = histogramBars(values, width, height, {max}), slot = width / Math.max(1, values.length);
  return <div className="holo-histo" aria-hidden="true">
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" focusable="false">
      <defs><linearGradient id={`${id}b`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" className="holo-bar-a"/><stop offset="1" className="holo-bar-b"/></linearGradient></defs>
      <path className="holo-grid-lines" d={[0.25, 0.5, 0.75].map(f => `M0 ${height * f}H${width}`).join('')}/>
      {bars.map((b, i) => b ? <g key={i}>
        <rect className="holo-bar" x={b.x} y={b.y} width={b.width} height={b.height} fill={`url(#${id}b)`} rx="1"/>
        {b.height > 0 && <rect className="holo-bar-tip" x={b.x} y={b.y} width={b.width} height={Math.min(3, b.height)} rx="1"/>}
      </g> : <rect key={i} className="holo-bar-empty" x={i * slot + slot * 0.17} y={height - 3} width={slot * 0.66} height="3"/>)}
      {line ? <path className="holo-ref-line" d={`M0 ${histogramY(line, values, height, max)}H${width}`}/> : null}
    </svg>
    <span className="holo-histo-days">{labels.map((l, i) => <small key={`${i}-${l}`}>{l}</small>)}</span>
  </div>;
}

/** A dot slider: a track with milestone ticks (ornaments) and a bright dot at the figure's place; unknown: a dashed track only. */
export function DotSlider({share}: {share: number | null}) {
  const s = share === null ? null : clamp01(share);
  return <span className="holo-slider" data-unknown={s === null || undefined} style={s === null ? undefined : {'--at': s} as CSSProperties} aria-hidden="true">
    <i className="holo-slider-fill"/><i className="holo-slider-dot"/>
  </span>;
}

/**
 * The purpose flow (Wealth): the known value on the left, what is set aside for each goal and what is still available on
 * the right, joined by ribbons whose widths are their shares (the flow's own figures; the words beside it carry them).
 */
export function FlowRibbons({shares, width = 260, height = 64}: {shares: readonly {key: string; share: number; free?: boolean; i?: number}[]; width?: number; height?: number}) {
  const ribbons = flowRibbons(shares.map(s => s.share), width, height), shown = shares.filter(s => s.share > 0);
  if (!ribbons.length) return null;
  return <svg className="holo-flow-ribbons" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <rect className="holo-flow-source" x="0" y="0" width="6" height={height} rx="2"/>
    {ribbons.map((r, i) => <g key={shown[i]!.key} data-free={shown[i]!.free || undefined} data-i={shown[i]!.i ?? i % 3}>
      <path className="holo-ribbon" d={r.path}/>
      <rect className="holo-flow-node" x={width - 6} y={r.to[0]} width="6" height={Math.max(1, r.to[1] - r.to[0])} rx="2"/>
    </g>)}
  </svg>;
}

/** Hearts that fill by the share of a target, each named under it (never meaning by colour alone). */
export function Hearts({hearts}: {hearts: readonly {key: string; label: string; share: number}[]}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (!hearts.length) return null;
  return <ul className="holo-hearts" aria-label="Targets as hearts: each fills by its share of your target">{hearts.map(h => {
    const s = clamp01(h.share), pct = Math.round(s * 100);
    return <li key={h.key}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <defs><clipPath id={`${id}${h.key}`}><rect x="0" y={24 - 24 * s} width="24" height={24 * s}/></clipPath></defs>
        <path className="holo-heart-shell" d={HEART_PATH}/>
        <path className="holo-heart-fill" d={HEART_PATH} clipPath={`url(#${id}${h.key})`}/>
      </svg>
      <small>{h.label}<span className="sr-only">: {pct} percent of your target</span></small>
    </li>;
  })}</ul>;
}

/** A small table for assistive technology: the panel's figures, each with its target and why one is missing. */
export function HoloTable({caption, rows}: {caption: string; rows: readonly (readonly [string, string])[]}) {
  return <table className="sr-only"><caption>{caption}</caption><tbody>{rows.map(([k, v], i) => <tr key={`${i}-${k}`}><th scope="row">{k}</th><td>{v}</td></tr>)}</tbody></table>;
}
/** A pillar switched off under Your pages & buttons: the panel says so instead of showing its records. */
export function HoloHidden({pillar}: {pillar: string}) {
  return <p className="holo-hidden" role="note">{pillar} is switched off under Your pages &amp; buttons, so it stays hidden here too. <Link className="nova-link" href="/app/settings" prefetch={false}>Settings</Link></p>;
}
/** A record that could not be read says so (never a zero). */
export const HoloUnread = ({what}: {what: string}) => <p className="nova-unread" role="status">{what} could not be read on this device right now. Nothing was changed.</p>;
export const HoloReading = () => <p className="nova-reading" role="status">Reading…</p>;
/** The small tag on Health panels while NOVA's chat may not read Health (its Permissions). */
export const NotShared = () => <span className="holo-tag" title="NOVA’s chat reads Health only when you allow it in Permissions.">On your screen only · not in NOVA’s chat</span>;
