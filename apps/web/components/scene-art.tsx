import { Suspense, lazy, useId } from "react";
import type { CardArt } from "../lib/card-art/catalog";
type Scene = CardArt;
type RefFn = (name: string) => string;
/**
 * Session AB-Design Phase 2 (critique 9, ADR-024 P8): each scene has its own light — where it falls and its colour — so the
 * cards never repeat one glow in one corner: a sunrise at the left of the track, a lamp in the library, a sunset low behind
 * the sailboat, gold under the treasure. [cx, cy, rx, ry, inner colour, outer colour].
 */
const GLOW: Record<string, readonly [number, number, number, number, string, string]> = {
  horizon: [815, 188, 350, 290, 'var(--brand-magenta)', 'var(--brand-violet)'], mountains: [230, 130, 360, 250, '#6fe6f6', '#5b7cff'],
  home: [760, 120, 300, 230, '#ffcf7a', '#c790f6'], garden: [290, 110, 330, 240, '#5effd4', '#4f8cff'], aurora: [500, 80, 560, 210, '#6fffd1', '#7d6bff'],
  skyline: [520, 60, 420, 220, '#c790f6', '#f06dff'], sailboat: [800, 300, 340, 190, '#ff9ec7', '#ffb36b'], library: [250, 170, 280, 230, '#ffd58a', '#f08bd6'],
  studio: [700, 110, 320, 240, '#f06dff', '#8fa6ff'], track: [150, 80, 330, 220, '#7fe9ff', '#ffb36b'], path: [860, 140, 330, 240, '#7dffc8', '#6fa8ff'],
  telescope: [640, 70, 360, 220, '#a9b8ff', '#c790f6'], bicycle: [260, 210, 320, 210, '#ffc56b', '#f06dff'], kitchen: [780, 170, 300, 230, '#ffcf8a', '#ff8fb8'],
  treasure: [500, 340, 330, 200, '#ffd27a', '#f0a64d'],
};
/** The default lines, drawn for an id no module knows. */
function DefaultLines({ refFn }: { refFn: RefFn }) {
  return <g fill="none" stroke={refFn("edge")}>
    <path d="M-20 392Q190 54 410 252T1030 131" strokeWidth="70" opacity=".06"/>
    <path d="M-20 392Q190 54 410 252T1030 131" strokeWidth="2" opacity=".7"/>
    <path d="M-20 412Q220 101 433 282T1030 164" strokeWidth="1" opacity=".4"/>
  </g>;
}
// Gate C weights: every scene body (the five originals and the ten extras) lives in one lazy chunk, fetched the first time a card shows one (Goals sat 4 kB over its budget with them inline; budgets are never raised). An id the chunk does not know draws the default lines.
const ExtraScene = lazy(() => import("./scene-art-extra").then(m => ({ default: ({ scene, refFn }: { scene: string; refFn: RefFn }) => <>{m.EXTRA_SCENES[scene]?.(refFn) ?? <DefaultLines refFn={refFn}/>}</> })));
/** Original, lightweight vector scenery. Decorative and independent of financial state. Session AB-Design: all fifteen scene bodies live in components/scene-art-extra.tsx. */
export function SceneArt({ scene = "horizon", className = "" }: { scene?: Scene; className?: string }) {
  const id = useId();
  const ref = (name: string) => `url(#${id}-${name})`, glow = GLOW[scene] ?? GLOW.horizon!;
  return <svg className={`scene-art scene-${scene} ${className}`} viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-sky`} x2="1" y2="1"><stop stopColor="var(--space-deep)"/><stop offset=".55" stopColor="var(--space-blue)"/><stop offset="1" stopColor="var(--space-purple)"/></linearGradient>
      <linearGradient id={`${id}-edge`} x2="1" y2=".3"><stop stopColor="var(--brand-cyan)"/><stop offset=".42" stopColor="var(--brand-blue)"/><stop offset=".72" stopColor="var(--brand-violet)"/><stop offset="1" stopColor="var(--brand-magenta)"/></linearGradient>
      <radialGradient id={`${id}-light`}><stop stopColor={glow[4]} stopOpacity=".8"/><stop offset=".25" stopColor={glow[5]} stopOpacity=".35"/><stop offset="1" stopColor="var(--brand-blue)" stopOpacity="0"/></radialGradient>
      <radialGradient id={`${id}-planet`} cx=".8" cy=".2" r=".85"><stop stopColor="var(--planet-edge)"/><stop offset=".22" stopColor="var(--space-blue)"/><stop offset=".68" stopColor="var(--space-deep)"/><stop offset="1" stopColor="var(--surface-0)"/></radialGradient>
      <radialGradient id={`${id}-sun`}><stop stopColor="var(--text)"/><stop offset=".035" stopColor="var(--window-light)"/><stop offset=".09" stopColor="var(--brand-magenta)" stopOpacity=".85"/><stop offset=".28" stopColor="var(--brand-violet)" stopOpacity=".3"/><stop offset="1" stopColor="var(--brand-magenta)" stopOpacity="0"/></radialGradient>
      <linearGradient id={`${id}-ice`} x2=".5" y2="1"><stop stopColor="var(--mountain-snow)"/><stop offset="1" stopColor="var(--space-blue)"/></linearGradient>
      <linearGradient id={`${id}-water`} x2=".3" y2="1"><stop stopColor="var(--brand-violet)" stopOpacity=".5"/><stop offset=".4" stopColor="var(--space-blue)"/><stop offset="1" stopColor="var(--space-deep)"/></linearGradient>
      <clipPath id={`${id}-globe`}><path d="M-100 100C250-65 710 87 1040 495L-100 570Z"/></clipPath>
    </defs>
    <path fill={ref("sky")} d="M0 0h1000v500H0z"/>
    <g fill="var(--star)" opacity=".6">{Array.from({length: 78}, (_, i) => <circle key={i} cx={(i * 137 + 31) % 1000} cy={(i * 73 + 17) % 480} r={i % 9 === 0 ? 1.6 : .7}/>)}</g>
    <ellipse className="ambient-light" cx={glow[0]} cy={glow[1]} rx={glow[2]} ry={glow[3]} fill={ref("light")}/>
    <Suspense fallback={<DefaultLines refFn={ref}/>}><ExtraScene scene={scene} refFn={ref}/></Suspense>
  </svg>;
}
