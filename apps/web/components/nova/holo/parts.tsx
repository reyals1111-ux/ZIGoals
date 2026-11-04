'use client';
import Link from 'next/link';
import {useId, type CSSProperties, type ReactNode} from 'react';
import {NumberTicker} from '../../motion/number-ticker';
import {HEART_PATH, arcPath, clamp01, linePath, polar, segmentsLit, sparkPoints, tickPath} from '../../../lib/nova/holo/geometry';
import {useChangeCount} from './use-hud-motion';

/**
 * Session AL Part 11 (lane L8): the HUD's drawing parts. Every drawing is decoration over words: the figures it shows are
 * also written as text beside it (and each panel keeps a table for assistive technology), so the SVG is aria-hidden.
 * Ornaments (tick scales, the turning outer rings, corner brackets) are thin and dim and never vary with data; data marks
 * (arcs, lit segments, lines, filled hearts) are bright, in the panel's pillar neon. Glow is decoration: every figure's
 * own colour carries its contrast (≥ 4.5:1 on the night glass).
 */

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

/** A ring gauge: a dim tick scale (ornament), a turning dashed outer ring (ornament), a track and the bright data arc. */
export function TickRing({share, size = 120, ticks = 60, children, className = ''}: {share: number | null; size?: number; ticks?: number; children?: ReactNode; className?: string}) {
  const s = share === null ? 0 : clamp01(share), end = polar(0, 0, 40, s * 360);
  return <div className={`holo-ring ${className}`.trim()} style={{'--ring': `${size}px`} as CSSProperties}>
    <svg viewBox="-60 -60 120 120" aria-hidden="true" focusable="false">
      <g data-motion-essential="" className="holo-spin"><circle className="holo-orn-dash" r="57"/></g>
      <path className="holo-orn-ticks" d={tickPath(0, 0, 49, 52, ticks)}/>
      <path className="holo-orn-ticks holo-orn-major" d={tickPath(0, 0, 47, 53, 12)}/>
      <circle className="holo-track" r="40" data-unknown={share === null || undefined}/>
      {s > 0 && <><path className="holo-arc" d={arcPath(0, 0, 40, 0, s * 360)}/><circle className="holo-arc-end" cx={end.x} cy={end.y} r="3.2"/></>}
    </svg>
    {children && <div className="holo-ring-centre">{children}</div>}
  </div>;
}

/** Concentric rings, one figure each (the habits' streaks, the core around the orb): outer first. */
export function RingStack({rings, size = 120, gap = 9}: {rings: {key: string; share: number | null; pillar?: string}[]; size?: number; gap?: number}) {
  return <svg className="holo-stack" viewBox="-60 -60 120 120" width={size} height={size} aria-hidden="true" focusable="false">
    <g data-motion-essential="" className="holo-spin holo-spin-rev"><path className="holo-orn-ticks" d={tickPath(0, 0, 56, 58.5, 72)}/></g>
    {rings.map((r, i) => {
      const rad = 50 - i * gap, s = r.share === null ? 0 : clamp01(r.share), end = polar(0, 0, rad, s * 360);
      return <g key={r.key} data-pillar={r.pillar}>
        <circle className="holo-track" r={rad} data-unknown={r.share === null || undefined}/>
        {s > 0 && <><path className="holo-arc" d={arcPath(0, 0, rad, 0, s * 360)}/><circle className="holo-arc-end" cx={end.x} cy={end.y} r="2.6"/></>}
      </g>;
    })}
  </svg>;
}

/** A gauge across 240° (the consistency dial): ornament ticks, track, bright arc. */
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
