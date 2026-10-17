import {useId, type CSSProperties, type ReactElement, type ReactNode} from 'react';
import './header-art.css';

/**
 * Session AE (Part 4, ADR-027 G5): the page-header art family, cut from Habits' orbit — a faint nebula disc, three thin
 * gradient rings, a few planets with tiny glows riding them, and the page's own glyph in the middle with a soft bloom.
 * Static SVG with no client hooks (useId also runs in server components), so a server page stays a server page and each
 * page ships only its own glyph. Colours come only from the CSS custom properties in header-art.css (`--ha-*`), so the
 * themes restyle it; ids are unique per instance. The one-time entrance is CSS on mount, none under reduced motion or
 * Motion Off.
 */
export type ArtTone = 'goals' | 'habits' | 'health' | 'wealth' | 'journey' | 'neutral';
/** What a glyph paints with: `line` the pale→accent stroke, `accent` the accent→second-accent stroke, `fill` a soft wash. */
export type GlyphPaint = {line: string; accent: string; fill: string};
/** A glyph: one `<g>` drawn in the 220 box around (110, 110) within r ≈ 46; strokes 1.4–2.2, round caps and joins. */
export type Glyph = (paint: GlyphPaint) => ReactElement;

const C = 110;
// The rings in their own (tilted) frames; the whole system then turns by `spin`, so each page gets its own sky.
const RINGS = [{rx: 94, ry: 92, tilt: 0}, {rx: 110, ry: 70, tilt: 32}, {rx: 64, ry: 92, tilt: -25}] as const;
// Planets: ring, angle on it (degrees), radius, colour (a cyan, b pink, c pale); each arrives along its ring over `sweep`°.
const PLANETS = [
  {ring: 0, at: 222, r: 4.2, hue: 'a', sweep: 34}, {ring: 1, at: -40, r: 3.9, hue: 'b', sweep: 42}, {ring: 2, at: 95, r: 3.8, hue: 'a', sweep: 46},
  {ring: 1, at: 130, r: 3.4, hue: 'b', sweep: 40}, {ring: 2, at: -100, r: 2.1, hue: 'c', sweep: 44}, {ring: 0, at: 40, r: 1.6, hue: 'c', sweep: 30},
] as const;
const TWINKLES = [[52, 44, 3.6], [182, 70, 2.6], [160, 186, 3.2], [34, 150, 2.4]] as const;
const point = (rx: number, ry: number, deg: number) => { const t = deg * Math.PI / 180; return [C + rx * Math.cos(t), C + ry * Math.sin(t)] as const; };
const fixed = (n: number) => Math.round(n * 10) / 10;
// Each planet's arc as five offsets from its resting place (an ease-out along the ellipse); the keyframes read them.
const ARCS = PLANETS.map(({ring, at, sweep}) => {
  const {rx, ry} = RINGS[ring], [x, y] = point(rx, ry, at), style: Record<string, string> = {};
  [0, .2, .4, .6, .8].forEach((progress, k) => { const left = (1 - progress) ** 2, [px, py] = point(rx, ry, at - sweep * left); style[`--ha-p${k}`] = `translate(${fixed(px - x)}px, ${fixed(py - y)}px)`; });
  return {x: fixed(x), y: fixed(y), style: style as CSSProperties};
});
const sparkle = (x: number, y: number, s: number) => `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`;

export function OrbitArt({glyph: GlyphMark, tone = 'neutral', spin = -18, className = ''}: {glyph: Glyph; tone?: ArtTone; spin?: number; className?: string}) {
  const id = `ha${useId().replace(/[^a-zA-Z0-9]/g, '')}`, url = (name: string) => `url(#${id}-${name})`;
  return <svg className={`orbit-art ${className}`.trim()} data-tone={tone} viewBox="0 0 220 220" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id={`${id}-neb`}><stop offset="0" className="ha-neb-0"/><stop offset=".72" className="ha-neb-1"/><stop offset="1" className="ha-neb-2"/></radialGradient>
      <linearGradient id={`${id}-ring1`} gradientUnits="userSpaceOnUse" x1="16" y1="40" x2="204" y2="180"><stop offset="0" className="ha-rs-a"/><stop offset="1" className="ha-rs-b"/></linearGradient>
      <linearGradient id={`${id}-ring2`} gradientUnits="userSpaceOnUse" x1="0" y1="110" x2="220" y2="110"><stop offset="0" className="ha-rs-a"/><stop offset=".6" className="ha-rs-ab"/><stop offset="1" className="ha-rs-a"/></linearGradient>
      <linearGradient id={`${id}-ring3`} gradientUnits="userSpaceOnUse" x1="110" y1="18" x2="110" y2="202"><stop offset="0" className="ha-rs-c"/><stop offset=".7" className="ha-rs-b"/><stop offset="1" className="ha-rs-c"/></linearGradient>
      <radialGradient id={`${id}-dot-a`}><stop offset="0" className="ha-dg-a"/><stop offset="1" className="ha-dg-a ha-clear"/></radialGradient>
      <radialGradient id={`${id}-dot-b`}><stop offset="0" className="ha-dg-b"/><stop offset="1" className="ha-dg-b ha-clear"/></radialGradient>
      <radialGradient id={`${id}-halo`}><stop offset="0" className="ha-halo-0"/><stop offset=".55" className="ha-halo-1"/><stop offset="1" className="ha-halo-2"/></radialGradient>
      <linearGradient id={`${id}-line`} gradientUnits="userSpaceOnUse" x1="70" y1="62" x2="152" y2="160"><stop offset="0" className="ha-gs-a"/><stop offset=".5" className="ha-gs-ab"/><stop offset="1" className="ha-gs-b"/></linearGradient>
      <linearGradient id={`${id}-accent`} gradientUnits="userSpaceOnUse" x1="64" y1="150" x2="156" y2="66"><stop offset="0" className="ha-gs-b"/><stop offset="1" className="ha-gs-c"/></linearGradient>
      <linearGradient id={`${id}-fill`} gradientUnits="userSpaceOnUse" x1="110" y1="60" x2="110" y2="160"><stop offset="0" className="ha-fill-0"/><stop offset="1" className="ha-fill-1"/></linearGradient>
      <filter id={`${id}-bloom`} filterUnits="userSpaceOnUse" x="30" y="30" width="160" height="160" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3.4" result="blur"/><feFlood className="ha-flood"/><feComposite in2="blur" operator="in" result="glow"/>
        <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <circle className="ha-nebula" cx={C} cy={C} r="106" fill={url('neb')}/>
    <g transform={`rotate(${spin} ${C} ${C})`}>
      {RINGS.map((ring, index) => <g key={index} className={`ha-ring ha-ring-${index + 1}`}><g transform={ring.tilt ? `rotate(${ring.tilt} ${C} ${C})` : undefined}>
        <ellipse className="ha-orbit" cx={C} cy={C} rx={ring.rx} ry={ring.ry} fill="none" stroke={url(`ring${index + 1}`)}/>
        {PLANETS.map((planet, n) => planet.ring === index && <g key={n} className="ha-dot" style={ARCS[n]!.style}>
          {planet.hue !== 'c' && <circle cx={ARCS[n]!.x} cy={ARCS[n]!.y} r={planet.r * 3.2} fill={url(`dot-${planet.hue}`)}/>}
          <circle className={`ha-planet ha-planet-${planet.hue}`} cx={ARCS[n]!.x} cy={ARCS[n]!.y} r={planet.r}/>
        </g>)}
      </g></g>)}
      <path className="ha-twinkle" d={TWINKLES.map(([x, y, s]) => sparkle(x, y, s)).join('')}/>
    </g>
    <circle className="ha-halo" cx={C} cy={C} r="66" fill={url('halo')}/>
    <g className="ha-glyph" filter={url('bloom')} fill="none" stroke={url('line')} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <GlyphMark line={url('line')} accent={url('accent')} fill={url('fill')}/>
    </g>
  </svg>;
}

/**
 * The top-right slot for a hand-written header: give the header `header-art-host` and put this inside it. `phone`: 'faint'
 * keeps a small, faint copy behind the words on phones; 'hide' removes it where the header's own buttons sit up there.
 */
export function HeaderArtCorner({children, phone = 'faint'}: {children: ReactNode; phone?: 'faint' | 'hide'}) {
  return <div className="header-art-slot" data-phone={phone} aria-hidden="true">{children}</div>;
}
