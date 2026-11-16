'use client';
import Link from 'next/link';
import {useId, useRef, type CSSProperties, type ReactNode} from 'react';
import {HEART_PATH, arcPath, clamp01, flowRibbons, histogramBars, histogramY, linePath, polar, segmentsLit, smoothPath, sparkPoints, tickPath, timePoints} from '../../../lib/nova/holo/geometry';
import {formatPercent} from '../../../lib/visual-format';
import {useChangeCount, useCountOnce} from './use-hud-motion';

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
 *
 * Session AM-2 ("NOVA, stunning", art direction D): the instruments are holograms. A data arc is a gradient along its
 * length (`GradArc`: the realm's neon into its lighter second colour, brightest at its leading end) with a white core, a
 * lit dot at its end (`Lead`, its own HTML layer: a static bloom and, under Full motion, a slow ping) and a tick bezel
 * round it; bars are gradient columns with white-hot caps in outlined slots; meters are segmented with a lit leading
 * segment; lines carry a bloom, an area fading to nothing and a fine grid. Every glow is static (owner addition B2).
 */

/**
 * Review "what still feels flat" 5 (lane L8d): the bloom. Every data arc and line carries a thin white core over its neon
 * (a glint, as a lit tube shows), with a wide soft halo in the CSS — crisp lines with real glow, still only decoration.
 * AM-2: the core has a path length of 1, so it can draw itself once when its widget is made (holo-parts.css "Made").
 */
export const Glint = ({d}: {d: string}) => <path className="holo-glint" d={d} pathLength={1}/>;

/**
 * AM-2: a data arc as a gradient along its length — short steps from the neon (its start) to its lighter second colour
 * (its leading end); `--t` is each step's place (0–1), the colour is mixed in the CSS. Round caps hide the steps.
 */
export function GradArc({r, from, to, cx = 0, cy = 0}: {r: number; from: number; to: number; cx?: number; cy?: number}) {
  const sweep = to - from, n = Math.max(1, Math.ceil(sweep / 10));
  if (!(sweep > 0.01)) return null;
  return <>{Array.from({length: n}, (_, i) => <path key={i} className="holo-arc" style={{'--t': n > 1 ? Math.round(i / (n - 1) * 100) / 100 : 1} as CSSProperties} d={arcPath(cx, cy, r, from + sweep * i / n, from + sweep * (i + 1) / n)}/>)}</>;
}
/** The lit dot at a data mark's leading end: an HTML layer over the drawing (it stays round; its ping is transform and opacity only). `x`, `y` in the drawing's units, `box` its view box side. */
export function Lead({x, y, box = 120, pillar}: {x: number; y: number; box?: number; pillar?: string}) {
  return <i className="holo-lead" data-pillar={pillar} style={{left: `${(50 + x / box * 100).toFixed(2)}%`, top: `${(50 + y / box * 100).toFixed(2)}%`}} aria-hidden="true"/>;
}

/** A turning ornament: its own layer over the instrument (aria-hidden; it only ever turns, never says anything). */
export function Orn({children, reverse = false, view = '-60 -60 120 120', className = ''}: {children: ReactNode; reverse?: boolean; view?: string; className?: string}) {
  return <span className={`holo-orn ${className}`.trim()} data-motion-essential="" data-rev={reverse || undefined} aria-hidden="true">
    <svg viewBox={view} focusable="false">{children}</svg>
  </span>;
}
/** AM-2: what an outer ornament ring holds — a fine dashed circle and three short bright sectors (a scanner's marks), the same for every value. */
export const OrnMarks = ({r = 57.5}: {r?: number}) => <>
  <circle className="holo-orn-dash" r={r}/>
  {[24, 144, 264].map(a => <path key={a} className="holo-orn-seg" d={arcPath(0, 0, r, a, a + 26)}/>)}
  {[84, 204, 324].map(a => { const p = polar(0, 0, r, a); return <circle key={a} className="holo-orn-pip" cx={p.x} cy={p.y} r="1.1"/>; })}
</>;
/** The lens ring: a thin ring in a cyan → magenta gradient (an ornament around a dial or the orb; it turns with the others). */
export function LensRing({className = ''}: {className?: string}) {
  return <span className={`holo-lens ${className}`.trim()} data-motion-essential="" aria-hidden="true"/>;
}

/**
 * A figure. Design review AM-D10: it counts up at most once, when its widget is first made (Full motion; never on a
 * re-mount, a re-flow, Pin, Hide and Show or a scroll into view), for at most 420 ms, and always ends on the exact text;
 * money never counts (use-hud-motion.ts). It pulses when its value changes (Full: a glow; Calm: a fade; Off: nothing).
 * The final text is what assistive technology reads at every moment; the counting digits are decoration over a copy
 * that holds the figure's width. AM-2: `--chars` is the figure's length, so a hero figure can size itself to its room.
 */
export function HoloFigure({text, className = ''}: {text: string; className?: string}) {
  const changed = useChangeCount(text), host = useRef<HTMLSpanElement>(null), {start, run} = useCountOnce(host, text);
  return <span ref={host} key={changed} className={`holo-num ${className}`.trim()} style={{'--chars': Math.max(1, text.length)} as CSSProperties} data-pulse={changed ? '' : undefined} data-counting={start !== null ? '' : undefined}>
    {start === null ? text : <><span className="sr-only">{text}</span><span className="holo-num-size" aria-hidden="true">{text}</span><span ref={run} className="holo-num-run" aria-hidden="true">{start}</span></>}
  </span>;
}

/**
 * A labelled meter: the label, a row of segments lit by the share, and the value against its target in words.
 * AM-2: the lit segments run from the neon to its lighter second colour and the leading one is white-hot (`data-lead`).
 */
export function SegMeter({label, share, text, targetText, note, count = 12, compact = false}: {label: string; share: number | null; text: string; targetText?: string | null; note?: string | null; count?: number; compact?: boolean}) {
  const lit = segmentsLit(share, count), lead = lit.part > 0 ? lit.full : lit.full - 1;
  return <div className="holo-meter" data-compact={compact || undefined} data-unknown={share === null || undefined}>
    <span className="holo-meter-label">{label}</span>
    <span className="holo-segs" aria-hidden="true">{Array.from({length: count}, (_, i) => <i key={i} data-lit={i < lit.full || undefined} data-lead={i === lead || undefined}
      style={{'--k': Math.round(i / Math.max(1, count - 1) * 100) / 100, ...(i === lit.full && lit.part ? {'--part': lit.part} : {})} as CSSProperties}/>)}</span>
    <span className="holo-meter-value"><HoloFigure text={text}/>{targetText ? <small> / {targetText}</small> : null}</span>
    {note && <small className="holo-note" title={compact ? note : undefined}>{note}</small>}
  </div>;
}
/** AM-2: a solid meter (a lit track with a white-hot leading end and quarter ticks): for a share that is one figure, not a count. Unknown: a dashed, unlit trace. */
export function GlowBar({share, className = ''}: {share: number | null; className?: string}) {
  const s = share === null ? null : clamp01(share);
  return <span className={`holo-gauge ${className}`.trim()} data-unknown={s === null || undefined} data-zero={s === 0 || undefined} style={s === null ? undefined : {'--at': s} as CSSProperties} aria-hidden="true"><i className="holo-gauge-fill"/></span>;
}

/** A ring gauge: a tick bezel (ornament, still), a turning outer ring (ornament), a track and the bright gradient arc with its lit end. */
export function TickRing({share, size, ticks = 60, children, className = '', lens = false, small = size !== undefined && size < 80}: {share: number | null; size?: number; ticks?: number; children?: ReactNode; className?: string; lens?: boolean; small?: boolean}) {
  const s = share === null ? 0 : clamp01(share), end = polar(0, 0, 42, s * 360);
  return <div className={`holo-ring ${className}`.trim()} data-small={small || undefined} style={size ? {'--ring': `${size}px`} as CSSProperties : undefined}>
    <svg viewBox="-60 -60 120 120" aria-hidden="true" focusable="false">
      <circle className="holo-well" r="37"/>
      <path className="holo-orn-ticks" d={tickPath(0, 0, 50.5, 53, small ? 24 : ticks)}/>
      <path className="holo-orn-ticks holo-orn-major" d={tickPath(0, 0, 49.5, 54.6, 12)}/>
      <circle className="holo-orn-hair" r="34.6"/>
      <circle className="holo-track" r="42" data-unknown={share === null || undefined}/>
      {s > 0 && <g className="holo-arc-g"><GradArc r={42} from={0} to={s * 360}/><Glint d={arcPath(0, 0, 42, 0, s * 360)}/></g>}
    </svg>
    {s > 0 && <Lead x={end.x} y={end.y}/>}
    <Orn><OrnMarks/></Orn>
    {lens && <LensRing/>}
    {children && <div className="holo-ring-centre">{children}</div>}
  </div>;
}

/**
 * Concentric rings, one figure each (the habits' streaks, the core around the orb): outer first. Each track is segmented
 * like an orbit (an ornament, the same for every value); the arc over it is the figure. A tick ring turns outside them.
 * Review M3, M4 (lane L8d): rings may leave a gap (`start`, `sweep`: the core leaves 40° open at the top, under NOVA's
 * name), and an unknown figure is one faint hairline with a short dash at the gap — never segmented or dashed like data.
 * AM-2: each arc is a gradient with a white core and a lit end; `first` is the outer ring's radius (the habits' streak
 * rings sit inside today's own ring), and end stops mark a gap's two ends.
 */
export function RingStack({rings, size = 120, gap = 9, segments = 0, start = 0, sweep = 360, first = 50, bezel = true, scale = 55.6}: {rings: {key: string; share: number | null; pillar?: string; r?: number; lead?: boolean}[]; size?: number; gap?: number; segments?: number; start?: number; sweep?: number; first?: number; bezel?: boolean; /** The inner radius of the turning tick scale (outside the rings by default; the core keeps it inside them). */ scale?: number}) {
  const full = sweep >= 360;
  return <span className="holo-stack-box" style={{'--ring': `${size}px`} as CSSProperties} aria-hidden="true">
    <svg className="holo-stack" viewBox="-60 -60 120 120" focusable="false">
      {rings.map((r, i) => {
        const rad = r.r ?? first - i * gap, s = r.share === null ? 0 : clamp01(r.share), from = full ? 0 : start, end = polar(0, 0, rad, from + s * sweep);
        const seg = segments > 0 && !r.lead ? (2 * Math.PI * rad) / segments : 0, arc = arcPath(0, 0, rad, from, from + s * sweep);
        const trackStyle = seg && r.share !== null ? {strokeDasharray: `${(seg * 0.72).toFixed(2)} ${(seg * 0.28).toFixed(2)}`} : undefined;
        return <g key={r.key} data-pillar={r.pillar} data-lead={r.lead || undefined}>
          {full ? <circle className="holo-track" r={rad} data-unknown={r.share === null || undefined} style={trackStyle}/>
            : <path className="holo-track-path" d={arcPath(0, 0, rad, start, start + sweep)} data-unknown={r.share === null || undefined}/>}
          {r.share === null && !full && <path className="holo-unknown-mark" d={`M${(-2.6).toFixed(1)} ${(-rad).toFixed(2)}H2.6`}/>}
          {s > 0 && <g className="holo-arc-g"><GradArc r={rad} from={from} to={from + s * sweep}/><Glint d={arc}/><circle className="holo-arc-end" cx={end.x} cy={end.y} r={r.lead ? 3 : 2.4}/></g>}
        </g>;
      })}
    </svg>
    {bezel && <Orn reverse><path className="holo-orn-ticks" d={tickPath(0, 0, scale, scale + 2.8, 72)}/><path className="holo-orn-ticks holo-orn-major" d={tickPath(0, 0, scale - 1, scale + 3.6, 12)}/></Orn>}
  </span>;
}

/** A gauge across 240° (the consistency dial): ornament ticks, track, bright gradient arc with its lit end, the figure in its centre. */
export function Dial({share, size, children}: {share: number | null; size?: number; children?: ReactNode}) {
  const s = share === null ? 0 : clamp01(share), end = polar(0, 0, 42, -120 + 240 * s);
  return <div className="holo-ring holo-dial" style={size ? {'--ring': `${size}px`} as CSSProperties : undefined}>
    <svg viewBox="-60 -60 120 120" aria-hidden="true" focusable="false">
      <circle className="holo-well" r="36"/>
      <path className="holo-orn-ticks" d={tickPath(0, 0, 49.5, 52.5, 31, -120, 240)}/>
      <path className="holo-orn-ticks holo-orn-major" d={tickPath(0, 0, 48.6, 54.6, 7, -120, 240)}/>
      <path className="holo-orn-hair" d={arcPath(0, 0, 34.6, -120, 120)}/>
      <path className="holo-track-path" d={arcPath(0, 0, 42, -120, 120)}/>
      {s > 0 && <g className="holo-arc-g"><GradArc r={42} from={-120} to={-120 + 240 * s}/><Glint d={arcPath(0, 0, 42, -120, -120 + 240 * s)}/></g>}
    </svg>
    {s > 0 && <Lead x={end.x} y={end.y}/>}
    {children && <div className="holo-ring-centre">{children}</div>}
  </div>;
}

/** The fine grid behind a chart: horizontal hairlines and fainter vertical ones (an ornament: the same for every value). */
const gridPath = (w: number, h: number, rows: number, cols: number) => [
  Array.from({length: rows - 1}, (_, i) => `M0 ${(h * (i + 1) / rows).toFixed(1)}H${w}`).join(''),
  Array.from({length: cols - 1}, (_, i) => `M${(w * (i + 1) / cols).toFixed(1)} 0V${h}`).join('')] as const;
const pctOf = (p: {x: number; y: number}, w: number, h: number) => ({left: `${(p.x / w * 100).toFixed(2)}%`, top: `${(p.y / h * 100).toFixed(2)}%`});

/** A glowing line through values (null breaks nothing: it is skipped) with a soft fill under it, a fine grid and a lit lead point. */
export function Spark({values, width = 220, height = 56, className = '', domain}: {values: readonly (number | null)[]; width?: number; height?: number; className?: string; domain?: {min: number; max: number}}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), pts = sparkPoints(values, width, height, 5, domain);
  if (!pts.length) return null;
  const line = linePath(pts), last = pts.at(-1)!, [rows, cols] = gridPath(width, height, 4, 12);
  return <span className={`holo-spark-box ${className}`.trim()} aria-hidden="true">
    <span className="holo-wipe"><svg className="holo-spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" focusable="false">
      <defs><linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="holo-stop-a"/><stop offset="1" className="holo-stop-b"/></linearGradient></defs>
      <path className="holo-grid-lines" d={rows}/><path className="holo-grid-lines holo-grid-fine" d={cols}/>
      {pts.length > 1 && <path d={`${line}L${last.x} ${height}L${pts[0]!.x} ${height}Z`} fill={`url(#${id}f)`} className="holo-spark-fill"/>}
      <path className="holo-spark-line" d={pts.length > 1 ? line : `M${last.x - 2} ${last.y}h4`}/>
      {pts.length > 1 && <Glint d={line}/>}
    </svg></span>
    <i className="holo-lead" style={pctOf(last, width, height)}/>
  </span>;
}

/**
 * The framed wave (the reference's flowing amber line): a recorded history placed by time, drawn as a smooth monotone curve
 * (never above or below the records it joins) with a soft glow, over fine grid lines and a row of thin tick bars (an
 * ornament ruler), in a HUD frame. Review M6, p8 (lane L8d): the frame says what the line is (its `title`: "Recorded
 * valuations"), its highest and lowest records ("max", "min") and the dates it spans; the last record's value sits at the
 * line's end; and where today's figure differs from the last record (a total known only in part, say), `now` adds it as a
 * hollow, dashed point at today's place, named in words — the headline and the line never disagree without a word.
 * The dots are HTML over the stretched drawing, so they stay round.
 * AM-2: a lit terminal line — a grid of rows and columns, the highest and lowest records marked on the line itself (a
 * small diamond at each, with a faint dashed level across the plot; the frame's labels say their values), a gradient
 * area and a wide bloom. Round 2: nothing lies over the line's end — the last record's value and "now" are a small key in
 * the plot's free corner (the upper one when the line starts low, the lower one when it starts high), each with its
 * point's own mark before it.
 */
export function WaveChart({points, width = 300, height = 64, title, labels, endLabel, now, className = ''}: {
  points: readonly {at: string; value: number}[]; width?: number; height?: number; className?: string; title: string;
  labels: {max: string; min: string; span: string}; endLabel?: string; now?: {at: string; value: number; label: string} | null;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), all = timePoints(now ? [...points, {at: now.at, value: now.value}] : points, width, height, 7);
  const pts = now ? all.slice(0, -1) : all, here = now ? all.at(-1)! : null;
  if (pts.length < 2) return null;
  const line = smoothPath(pts), last = pts.at(-1)!, at = (p: {x: number; y: number}) => pctOf(p, width, height), [rows, cols] = gridPath(width, height, 4, 12);
  const hi = pts.reduce((a, b) => b.v > a.v ? b : a), lo = pts.reduce((a, b) => b.v < a.v ? b : a);
  // The key's corner: where the first stretch of the line (its left 45 %) is not.
  const left = pts.filter(p => p.x <= width * 0.45), leftY = left.length ? left.reduce((n, p) => n + p.y, 0) / left.length : pts[0]!.y;
  return <figure className={`holo-frame holo-wave ${className}`.trim()} aria-hidden="true">
    <span className="holo-frame-label" data-at="title">{title}</span>
    <span className="holo-frame-label" data-at="top"><span className="holo-frame-key">max</span> {labels.max}</span>
    <div className="holo-wave-plot">
      <span className="holo-wipe"><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="holo-stop-a"/><stop offset="1" className="holo-stop-b"/></linearGradient>
          <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" className="holo-wave-a"/><stop offset="1" className="holo-wave-b"/></linearGradient>
        </defs>
        <path className="holo-grid-lines" d={rows}/><path className="holo-grid-lines holo-grid-fine" d={cols}/>
        <path className="holo-ruler-bars" d={Array.from({length: 48}, (_, i) => `M${(width * (i + 0.5) / 48).toFixed(1)} ${height}v${i % 6 === 0 ? -7 : -3}`).join('')}/>
        {hi !== lo && <path className="holo-wave-guide" d={`M0 ${hi.y}H${width}M0 ${lo.y}H${width}`}/>}
        <path d={`${line}L${last.x} ${height}L${pts[0]!.x} ${height}Z`} fill={`url(#${id}f)`} className="holo-spark-fill"/>
        <path className="holo-wave-glow" d={line}/>
        <path className="holo-wave-line" d={line} stroke={`url(#${id}l)`}/>
        <Glint d={line}/>
        {here && <path className="holo-now-link" d={`M${last.x} ${last.y}L${here.x} ${here.y}`}/>}
      </svg></span>
      {hi !== lo && <><i className="holo-wave-mark" data-at="max" style={at(hi)}/><i className="holo-wave-mark" data-at="min" style={at(lo)}/></>}
      <i className="holo-wave-dot" style={at(last)}/>
      {here && now && <i className="holo-wave-dot" data-now="" style={at(here)}/>}
      {(endLabel || (here && now)) && <span className="holo-wave-legend" data-corner={leftY > height / 2 ? 'top' : 'bottom'}>
        {endLabel && <span className="holo-wave-tag" data-at="end">{endLabel}</span>}
        {here && now && <span className="holo-wave-tag" data-at="now">{now.label}</span>}
      </span>}
    </div>
    <span className="holo-frame-label" data-at="from">{labels.span}</span>
    <span className="holo-frame-label" data-at="bottom"><span className="holo-frame-key">min</span> {labels.min}</span>
  </figure>;
}

/**
 * The histogram (the reference's pink/violet bars with cyan tips and a line through them): one bar per value, a gradient
 * body and a bright tip, an empty dashed slot where the value is unknown, and an optional reference line (a target)
 * through the bars, named in words beside the chart by the caller. Day letters sit under the slots. Review m8, p7 (lane
 * L8d): 12 % headroom above the tallest of the bars and the line, the line's value at its right end, crisper 2 px tips.
 * AM-2: each bar is a glowing column in its own outlined slot (a faint full-height frame, an ornament), the realm's neon
 * from 35 % at its foot to full at its top, with a white-hot cap.
 */
export function Histogram({values, line, lineLabel, labels, width = 280, height = 64}: {values: readonly (number | null)[]; line?: number | null; lineLabel?: string | null; labels: readonly string[]; width?: number; height?: number}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), max = line ?? undefined, bars = histogramBars(values, width, height, {max, headroom: 1.12, gap: 0.46}), slot = width / Math.max(1, values.length);
  const ly = line ? histogramY(line, values, height, max, 1.12) : null, sw = slot * 0.54, sx = (i: number) => i * slot + (slot - sw) / 2;
  return <div className="holo-histo" aria-hidden="true">
    <div className="holo-histo-plot">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" focusable="false">
        <defs><linearGradient id={`${id}b`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" className="holo-bar-a"/><stop offset="1" className="holo-bar-b"/></linearGradient></defs>
        <path className="holo-grid-lines" d={[0.25, 0.5, 0.75].map(f => `M0 ${height * f}H${width}`).join('')}/>
        {values.map((_, i) => <rect key={i} className="holo-bar-slot" x={sx(i) - 2} y="1" width={sw + 4} height={height - 1} rx="1.5"/>)}
        <g className="holo-rise">{bars.map((b, i) => b ? <g key={i}>
          <rect className="holo-bar" x={sx(i)} y={b.y} width={sw} height={b.height} fill={`url(#${id}b)`} rx="1"/>
          {b.height > 0 && <rect className="holo-bar-tip" x={sx(i)} y={b.y} width={sw} height={Math.min(2.4, b.height)} rx="1"/>}
        </g> : <rect key={i} className="holo-bar-empty" x={sx(i)} y={height - 3} width={sw} height="3"/>)}</g>
        {ly !== null ? <path className="holo-ref-line" d={`M0 ${ly}H${width}`}/> : null}
      </svg>
      {ly !== null && lineLabel && <span className="holo-histo-line-tag" style={{top: `${(ly / height * 100).toFixed(2)}%`}}>{lineLabel}</span>}
    </div>
    <span className="holo-histo-days">{labels.map((l, i) => <small key={`${i}-${l}`}>{l}</small>)}</span>
  </div>;
}
/**
 * AM-2: small glowing columns (a week of check-ins, a week of focus): one column per share (0–1) in its outlined slot, a
 * gradient body and a white-hot cap; an unknown or empty value leaves its slot unlit; `today` outlines one slot. HTML, so
 * each column rises once when its widget is made (transform only). Decoration: the caller's table says the figures.
 */
export function Columns({shares, labels, today}: {shares: readonly (number | null)[]; labels?: readonly string[]; today?: number}) {
  return <span className="holo-cols" aria-hidden="true">{shares.map((s, i) => <span key={i} className="holo-cols-day" data-today={i === today || undefined}>
    <span className="holo-cols-slot">{s !== null && s > 0 ? <i style={{'--v': Math.round(clamp01(s) * 100) / 100, '--n': i} as CSSProperties}/> : null}</span>
    {/* Round 7: a label's letters after the first may be dropped where the columns are narrow (the sheets decide), so two labels never touch. */}
    {labels ? <small>{(labels[i] ?? '').slice(0, 1)}<span className="holo-cols-l2">{(labels[i] ?? '').slice(1)}</span></small> : null}
  </span>)}</span>;
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

/**
 * Hearts that fill by the share of a target, each named beside it (never meaning by colour alone). Review m6 (lane L8d): each
 * says its share in figures too ("90%", "110%"; second review p7: NOVA's one percent style, the format layer's half-up rounding: a heart is full at its target, the words say how far past), and the
 * unfilled part of the shell is a faint pink, so 90 % and 100 % read apart.
 * Session AM-3 (round 6): each heart is a drawn instrument, not a pictogram — a small ring gauge (a dark track, a gradient
 * arc for the share with a lit end, four quarter ticks) around a heart in outline whose level rises with the share.
 */
export function Hearts({hearts}: {hearts: readonly {key: string; label: string; share: number}[]}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (!hearts.length) return null;
  return <div className="holo-heartrow">
    <ul className="holo-hearts" aria-label="Targets as hearts: each fills by its share of your target">{hearts.map(h => {
      const s = clamp01(h.share), pct = Math.max(0, h.share) * 100, end = polar(0, 0, 13, s * 360);
      return <li key={h.key} data-full={s >= 1 || undefined}>
        <svg viewBox="-17 -17 34 34" aria-hidden="true" focusable="false">
          <defs><clipPath id={`${id}${h.key}`}><rect x="0" y={24 - 24 * s} width="24" height={24 * s}/></clipPath></defs>
          <path className="holo-heart-ticks" d={tickPath(0, 0, 15.6, 16.8, 4)}/>
          <circle className="holo-heart-track" r="13"/>
          {s > 0 && <g className="holo-arc-g"><GradArc r={13} from={0} to={s * 360}/></g>}
          {s > 0 && s < 1 && <circle className="holo-heart-end" cx={end.x} cy={end.y} r="1.7"/>}
          <g transform="translate(-7.2 -7.7) scale(.6)">
            <path className="holo-heart-shell" d={HEART_PATH}/>
            <path className="holo-heart-fill" d={HEART_PATH} clipPath={`url(#${id}${h.key})`}/>
          </g>
        </svg>
        <small>{h.label}</small>
        <small className="holo-heart-pct">{formatPercent(pct)}<span className="sr-only"> of your target</span></small>
      </li>;
    })}</ul>
  </div>;
}

/**
 * Session AM-3 (round 7): a powered-down instrument, at the size the live one is drawn. A dark glass tube between two
 * hairline rims with dead ticks (a ring, a dial, a stack of rings, a clock), or an empty bezel that holds unlit slots
 * (columns, meters, a lattice, a plot, rows, a segmented meter, the sky, the sun's arc). A FIXED drawing chosen by `kind`
 * alone: it reads nothing and shows no value, so it may stand behind a lock. Decoration, hidden from assistive technology.
 */
export type UnlitKind = 'ring' | 'arcs' | 'stack' | 'clock' | 'columns' | 'bars' | 'lattice' | 'trend' | 'rows' | 'meter' | 'sky' | 'arc';
const UNLIT_ROUND: ReadonlySet<UnlitKind> = new Set(['ring', 'arcs', 'stack', 'clock']);
const UNLIT_BEZEL = 'M7 .5H193L199.5 7V103L193 109.5H7L.5 103V7Z';
function unlitRound(kind: UnlitKind) {
  if (kind === 'arcs') return <>
    <path className="un-tick" d={tickPath(0, 0, 50, 53.5, 46, -135, 270)}/><path className="un-tick un-tick-major" d={tickPath(0, 0, 49, 56, 10, -135, 270)}/>
    <path className="un-tube" d={arcPath(0, 0, 40, -135, 135)}/><path className="un-rim" d={arcPath(0, 0, 45.5, -135, 135)}/><path className="un-rim" d={arcPath(0, 0, 34.5, -135, 135)}/>
    <path className="un-hair" d="M-22 34H22"/><path className="un-notch" d="M0 -47.5l-3.2 -5.5h6.4z"/>
  </>;
  if (kind === 'stack') return <>
    <path className="un-tick" d={tickPath(0, 0, 53, 56, 60)}/><path className="un-tick un-tick-major" d={tickPath(0, 0, 52, 58, 12)}/>
    {[46, 35.5, 25].map(r => <circle key={r} className="un-tube un-tube-thin" r={r}/>)}
    {[49.6, 42.4, 39.1, 31.9, 28.6, 21.4].map(r => <circle key={r} className="un-rim" r={r}/>)}
    <circle className="un-well" r="21"/>
  </>;
  if (kind === 'clock') return <>
    <path className="un-tick" d={tickPath(0, 0, 50, 53.5, 60)}/><path className="un-tick un-tick-major" d={tickPath(0, 0, 49, 56, 12)}/>
    <circle className="un-tube un-tube-thin" r="43"/><circle className="un-rim" r="46.6"/><circle className="un-rim" r="39.4"/><circle className="un-well" r="39"/>
    <path className="un-tick un-tick-major" d={tickPath(0, 0, 30, 35, 12)}/><path className="un-dash" d="M0 0V-24M0 0L15 9"/><circle className="un-node" r="3"/>
  </>;
  return <>
    <path className="un-tick" d={tickPath(0, 0, 50, 53.5, 60)}/><path className="un-tick un-tick-major" d={tickPath(0, 0, 49, 56, 12)}/>
    <circle className="un-tube" r="40"/><circle className="un-rim" r="45.5"/><circle className="un-rim" r="34.5"/><circle className="un-well" r="34"/>
    <path className="un-notch" d="M0 -47.5l-3.2 -5.5h6.4z"/><path className="un-hair" d="M-58 0H-51M51 0H58"/>
  </>;
}
function unlitWide(kind: UnlitKind) {
  switch (kind) {
    case 'columns': return <>
      <path className="un-hair" d="M12 30H188M12 52H188M12 74H188"/>
      {Array.from({length: 7}, (_, i) => <g key={i}><rect className="un-slot" x={17 + i * 25} y="13" width="15" height="77" rx="3.5"/><path className="un-tick" d={`M${19 + i * 25} 99H${30 + i * 25}`}/></g>)}
      <path className="un-rim" d="M10 93.5H190"/>
    </>;
    case 'bars': return <>{[0, 1, 2].map(i => <g key={i}>
      <path className="un-stub" d={`M14 ${17 + i * 31}H${[62, 48, 70][i]}M${[164, 170, 158][i]} ${17 + i * 31}H186`}/>
      <rect className="un-slot" x="14" y={23 + i * 31} width="172" height="10" rx="2.5"/><path className="un-tick" d={`M57 ${23 + i * 31}v10M100 ${23 + i * 31}v10M143 ${23 + i * 31}v10`}/>
    </g>)}</>;
    case 'lattice': return <>
      {[0, 1, 2, 3].map(r => <g key={r}><path className="un-stub" d={`M13 ${23 + r * 22}H${[44, 36, 46, 40][r]}`}/>{Array.from({length: 7}, (_, c) => <rect key={c} className="un-slot" x={56 + c * 19.5} y={15 + r * 22} width="15" height="15" rx="3.5"/>)}</g>)}
    </>;
    case 'rows': return <>
      <path className="un-rim" d="M22 26V84"/>
      {[0, 1, 2].map(i => <g key={i}><rect className="un-slot" x="38" y={15 + i * 29} width="148" height="22" rx="3"/><path className="un-stub" d={`M48 ${26 + i * 29}H${[118, 96, 128][i]}M${[160, 164, 156][i]} ${26 + i * 29}H176`}/><circle className="un-node" cx="22" cy={26 + i * 29} r="5"/></g>)}
    </>;
    case 'meter': return <>
      {[0, 1, 2].map(i => <rect key={i} className="un-slot" x={14 + i * 27} y="14" width="21" height="34" rx="3"/>)}
      <path className="un-stub" d="M100 41H142M14 62H52M168 62H186"/>
      <g transform="skewX(-16)">{Array.from({length: 15}, (_, i) => <rect key={i} className="un-slot" x={38 + i * 11.6} y="72" width="9" height="20" rx="1.5"/>)}</g>
    </>;
    case 'sky': return <>
      <circle className="un-rim" cx="38" cy="38" r="11"/><path className="un-tick un-tick-major" d={tickPath(38, 38, 16, 21, 8)}/>
      <path className="un-rim un-fill" d="M40 78a12 12 0 0 1 1.6-23.9A16.5 16.5 0 0 1 73 50.5a13.8 13.8 0 0 1 9.5 27.5Z"/>
      {[0, 1, 2, 3].map(i => <g key={i}><rect className="un-slot" x={104 + i * 22.5} y="26" width="11" height="52" rx="5.5"/><path className="un-stub" d={`M${102 + i * 22.5} 16h15M${102 + i * 22.5} 90h15`}/></g>)}
    </>;
    case 'arc': return <>
      <path className="un-tick" d={tickPath(100, 90, 80, 84, 24, -90, 180)}/>
      <path className="un-tube un-tube-thin" d="M30 90A70 70 0 0 1 170 90"/><path className="un-rim" d="M26.4 90A73.6 73.6 0 0 1 173.6 90"/><path className="un-rim" d="M33.6 90A66.4 66.4 0 0 1 166.4 90"/>
      <path className="un-rim" d="M10 90.5H190"/><circle className="un-node" cx="50.5" cy="40.5" r="6"/><path className="un-tick un-tick-major" d="M30 86v9M170 86v9M100 86v9"/>
    </>;
    default: return <>
      <path className="un-hair" d="M12 28H188M12 50H188M12 72H188M56 12V94M100 12V94M144 12V94"/>
      <path className="un-dash" d="M14 76H60L78 64H122L140 52H184"/><circle className="un-node" cx="186" cy="52" r="4.5"/>
      <path className="un-rim" d="M10 94.5H190"/><path className="un-tick" d="M12 94v5M56 94v5M100 94v5M144 94v5M188 94v5"/>
    </>;
  }
}
export function Unlit({kind, className = ''}: {kind: UnlitKind; className?: string}) {
  const round = UNLIT_ROUND.has(kind);
  return <svg className={`holo-unlit ${className}`.trim()} data-kind={kind} data-round={round || undefined} viewBox={round ? '-60 -60 120 120' : '0 0 200 110'} aria-hidden="true" focusable="false">
    {round ? unlitRound(kind) : <><path className="un-bezel" d={UNLIT_BEZEL}/><path className="un-corner" d="M.5 16V7L7 .5H16M184 .5H193L199.5 7V16M199.5 94V103L193 109.5H184M16 109.5H7L.5 103V94"/>{unlitWide(kind)}</>}
  </svg>;
}
/**
 * Review M8 (lane L8d): an instrument with nothing to show yet is still an instrument — its shape drawn unlit (a hairline
 * track, faint empty slots, "—"), never a zero, with the reason in words and where to start. `kind` picks the shape.
 * AM-2: the unlit shape is the instrument's ghost in a tick bezel, with "—" where its figure will be.
 */
export function HoloEmpty({kind, children, href, action}: {kind: 'ring' | 'arcs' | 'wave' | 'stack' | 'meter'; children: ReactNode; href?: string; action?: string}) {
  // Round 7: the mark is the instrument itself, powered down (`Unlit`), with "—" where its figure will be.
  return <div className="holo-empty" data-kind={kind} data-wide={kind === 'wave' || kind === 'meter' ? '' : undefined}>
    <span className="holo-empty-shape" aria-hidden="true">
      <span className={kind === 'arcs' ? 'holo-empty-arc' : kind === 'wave' || kind === 'meter' ? 'holo-empty-frame' : 'holo-empty-ring'}><Unlit kind={kind === 'wave' ? 'trend' : kind}/><b>—</b></span>
    </span>
    <p className="holo-empty-words">{children}</p>
    {href && action && <Link className="nova-link holo-empty-action" href={href} prefetch={false}>{action} <span aria-hidden="true">→</span></Link>}
  </div>;
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
