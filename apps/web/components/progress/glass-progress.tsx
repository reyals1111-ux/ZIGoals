'use client';
import {useId, type CSSProperties, type HTMLAttributes, type ReactNode} from 'react';
import {useEntrance} from '../use-entrance';
import './glass-progress.css';

/**
 * Liquid-glass progress (Session I, Part 3): the one bar and the one ring every progress indicator uses. A glass track
 * with a rim, a nebula fill (or the indicator's own colours, where colour means something) and a soft glow at the
 * leading edge. The first time a track is seen it fills once from empty; later values glide from the old value to the
 * new one. Only transform (bars) and stroke-dashoffset (rings) move, so nothing reflows. Values, roles and ARIA are the
 * caller's and final from the first render; reduced motion and Motion Off show the final state at once.
 */

/** A share of a whole, held to 0–1. Anything that is not a finite number draws as empty: callers say "unknown" in words. */
export function glassShare(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}
const join = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ') || undefined;
type TrackProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** Names the track for its one-time fill (see useEntrance). */
  identity: string;
  /** False holds the fill back until the value is known. */
  ready?: boolean;
  children?: ReactNode;
};

/**
 * A bar with one fill. The fill slides in from the start while its colour stays spread over the filled part only, so a
 * short bar still shows the whole nebula; its leading end stays round at every value.
 */
export function GlassBar({identity, value, ready = true, vertical = false, fillClassName, className, style, children, ...props}: TrackProps & {
  /** The filled share, 0–1. */
  value: number;
  /** Fills from the bottom instead of the start. */
  vertical?: boolean;
  /** Extra class for the fill (its colour comes from --glass-ink). */
  fillClassName?: string;
}) {
  const share = glassShare(value), ref = useEntrance<HTMLDivElement>(identity, ready);
  return <div ref={ref} {...props} className={join('glass-track', className)} data-axis={vertical ? 'y' : undefined} data-empty={share === 0 || undefined} style={{...style, '--glass-value': share} as CSSProperties}>
    <span className="glass-fill-clip" aria-hidden="true"><span className={join('glass-fill', fillClassName)} /></span>
    <span className="glass-fill-glow" aria-hidden="true" />
    {children}
  </div>;
}

export type GlassSegment = {key: string; share: number; className?: string; color?: string};
/**
 * A composition bar: segments side by side in their own colours, with a thin divider between them. On first view the
 * whole composition grows from the start; a changed composition glides to its new proportions.
 */
export function GlassSegments({identity, segments, ready = true, className, style, children, ...props}: TrackProps & {segments: GlassSegment[]}) {
  const ref = useEntrance<HTMLDivElement>(identity, ready);
  const placed = segments.reduce<(GlassSegment & {start: number; size: number})[]>((list, segment) => {
    const last = list[list.length - 1], start = last ? last.start + last.size : 0;
    return [...list, {...segment, start, size: Math.min(glassShare(segment.share), 1 - start)}];
  }, []);
  return <div ref={ref} {...props} className={join('glass-track', 'glass-segmented', className)} style={style}>
    <span className="glass-fill-clip" aria-hidden="true">
      {placed.map(segment => <span key={segment.key} className={join('glass-segment', segment.className)} style={{'--glass-start': segment.start, '--glass-size': segment.size, ...(segment.color ? {'--glass-ink': segment.color} : {})} as CSSProperties} />)}
      {placed.slice(1).filter(segment => segment.size > 0 && segment.start > 0).map(segment => <span key={`${segment.key}:divider`} className="glass-divider" style={{'--glass-at': segment.start} as CSSProperties} />)}
    </span>
    {children}
  </div>;
}

/** One arc of a ring, drawn from the top clockwise to `end` (0–100). Arcs share the start, so later ones sit under earlier ones. */
export type GlassArc = {key: string; end: number; color?: string};
const NEBULA = [['0', '#1adbe8'], ['.3', '#499cff'], ['.58', '#9e78ff'], ['.83', '#ed75df'], ['1', '#ffa69c']] as const;
const point = (turn: number) => [50 + 50 * Math.cos(turn * 2 * Math.PI), 50 + 50 * Math.sin(turn * 2 * Math.PI)].map(n => `${Math.round(n * 100) / 100}%`);
/**
 * Where the nebula runs: from the arc's start to its end for arcs up to half the ring, so every arc shows the whole
 * nebula; longer arcs run it across the ring, cyan at the top to pink at the bottom. (The SVG is turned a quarter, so
 * the arc starts at the right here and at the top on screen.)
 */
export function nebulaVector(end: number) {
  const [x1, y1] = point(0), [x2, y2] = point(Math.min(Math.max(end, 0.5), 50) / 100);
  return {x1: x1!, y1: y1!, x2: x2!, y2: y2!};
}

/**
 * A ring: a glass track with a rim and the arcs in front, each drawn by stroke-dashoffset. A single arc carries the
 * nebula; composition arcs carry their legend colours. Sized and thickened by the caller's CSS (--ring-width).
 */
export function GlassRing({identity, arcs, ready = true, className, children, ...props}: TrackProps & {arcs: GlassArc[]}) {
  const ref = useEntrance<HTMLDivElement>(identity, ready), id = `glass${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const drawn = arcs.map(arc => ({...arc, end: Math.min(100, Math.max(0, Number.isFinite(arc.end) ? arc.end : 0))})).filter(arc => arc.end > 0).sort((a, b) => b.end - a.end);
  const vector = nebulaVector(drawn[0]?.end ?? 0);
  return <div ref={ref} {...props} className={join('glass-ring', className)} data-empty={drawn.length ? undefined : true}>
    <svg className="glass-ring-art" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-ink`} gradientUnits="userSpaceOnUse" {...vector}>{NEBULA.map(([offset, color]) => <stop key={offset} offset={offset} stopColor={color} />)}</linearGradient>
        <filter id={`${id}-glow`} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" /><feComponentTransfer in="blur" result="glow"><feFuncA type="linear" slope=".55" /></feComponentTransfer><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <circle className="glass-ring-track" cx="50%" cy="50%" r="45%" />
      <g className="glass-ring-arcs" filter={`url(#${id}-glow)`}>
        {drawn.map(arc => <circle key={arc.key} className="glass-ring-arc" cx="50%" cy="50%" r="45%" pathLength={100} stroke={arc.color ?? `url(#${id}-ink)`} style={{strokeDashoffset: 100 - arc.end}} />)}
      </g>
      <circle className="glass-ring-rim" cx="50%" cy="50%" r="49%" />
      <circle className="glass-ring-rim glass-ring-rim-inner" cx="50%" cy="50%" r="41%" />
    </svg>
    {children}
  </div>;
}
