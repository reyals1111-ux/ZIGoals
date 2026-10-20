'use client';
import type {CSSProperties} from 'react';
import {useEntrance} from '../use-entrance';
import type {Planet, UniversePillar} from '../../lib/universe/model';

/**
 * The star system (Session AF, L5b; P9.1, ADR-028 H55): inline SVG, no canvas and no dependency — a central light, four
 * orbits and one planet per pillar in its pillar colour. A planet grows and deepens with its rings, wears its rings
 * (bright) and its faint rings (dashed, the trace of misses), carries its moons and glows with today's light; a lit planet
 * gets a halo. The orbits draw and the planets arrive once, the first time the scene is seen on this mount
 * (`data-entrance=once`, 650 ms); nothing moves afterwards, and under reduced motion or Motion Off the scene is a still.
 * The SVG is a picture (aria-hidden): the planets' words and controls are HTML (UniverseSection), labels at 14 px or more.
 */
export const SCENE = {width: 640, height: 400, cx: 320, cy: 200} as const;
const ORBIT: Record<UniversePillar, {rx: number; angle: number}> = {
  habits: {rx: 96, angle: -38}, health: {rx: 158, angle: 152}, goals: {rx: 220, angle: 64}, wealth: {rx: 282, angle: 214},
};
const TILT = 0.4;
export function planetPosition(pillar: UniversePillar): {x: number; y: number} {
  const {rx, angle} = ORBIT[pillar], a = angle * Math.PI / 180;
  return {x: SCENE.cx + rx * Math.cos(a), y: SCENE.cy + rx * TILT * Math.sin(a)};
}
export const planetRadius = (p: Pick<Planet, 'rings'>) => 13 + p.rings * 1.6;
const COLOUR: Record<UniversePillar, string> = {habits: 'var(--pillar-habits, #23eaff)', health: 'var(--pillar-health, #ff74be)', goals: 'var(--pillar-goals, #9273ff)', wealth: 'var(--pillar-wealth, #ffd27a)'};

export function PlanetBody({planet, x, y, r, idPrefix}: {planet: Planet; x: number; y: number; r: number; idPrefix: string}) {
  const colour = COLOUR[planet.pillar], light = planet.light ?? 0, depth = 0.42 + planet.rings * 0.093;
  const ringRx = (k: number) => r + 7 + k * 4.2;
  return <g className="universe-planet" data-pillar={planet.pillar} data-lit={planet.lit || undefined} style={{'--planet': colour} as CSSProperties}>
    <circle className="universe-planet-glow" cx={x} cy={y} r={r * 2.1} fill={`url(#${idPrefix}-glow-${planet.pillar})`} opacity={0.18 + light * 0.62} />
    {/* Critique round 2 (L5c): a lit planet reads as lit — a soft corona and a firm halo in its own colour, and its body at
        full strength (a 1.4 px ring alone did not show). Still: no motion beyond the scene's one entrance. */}
    {planet.lit && <circle className="universe-planet-corona" cx={x} cy={y} r={r + 8} fill="none" stroke={colour} strokeWidth={7} opacity={0.3} />}
    {planet.lit && <circle className="universe-planet-halo" cx={x} cy={y} r={r + 4.5} fill="none" stroke={colour} strokeWidth={2.6} opacity={1} />}
    {Array.from({length: planet.faintRings}, (_, k) => <ellipse key={`f${k}`} className="universe-ring is-faint" cx={x} cy={y} rx={ringRx(planet.rings + k)} ry={ringRx(planet.rings + k) * 0.34} fill="none" stroke={colour} strokeWidth={1} strokeDasharray="2 4" opacity={0.3} />)}
    {Array.from({length: planet.rings}, (_, k) => <ellipse key={`r${k}`} className="universe-ring" cx={x} cy={y} rx={ringRx(k)} ry={ringRx(k) * 0.34} fill="none" stroke={colour} strokeWidth={1.6} opacity={0.82} />)}
    {/* Gate C design review (finding 8): a planet not yet deep shows less of its colour over a disc of its own colour's
        shade (mixed in OKLCH, so its hue stays), never over the page behind it: on Light's pale stage a Wealth planet stays
        a dimmer gold, not a pale beige blob, and over the night it no longer reads brown. */}
    {!planet.lit && depth < 1 && <circle className="universe-planet-shade" cx={x} cy={y} r={r} fill={`color-mix(in oklch, ${colour} 52%, #000000)`} />}
    <circle className="universe-planet-core" cx={x} cy={y} r={r} fill={`url(#${idPrefix}-core-${planet.pillar})`} opacity={planet.lit ? 1 : Math.min(1, depth)} />
    {planet.staked && <circle className="universe-staked" cx={x} cy={y} r={r + 2.5} fill="none" stroke="#ffe6a8" strokeWidth={1} strokeDasharray="1 3" />}
    {Array.from({length: planet.moons}, (_, k) => { const a = (-90 + k * 45) * Math.PI / 180, d = r + 16; return <circle key={`m${k}`} className="universe-moon" cx={x + d * Math.cos(a)} cy={y + d * 0.62 * Math.sin(a)} r={3.1} fill="#eef3ff" stroke={colour} strokeWidth={1} />; })}
  </g>;
}

export function Gradients({idPrefix, planets}: {idPrefix: string; planets: readonly Planet[]}) {
  return <defs>
    <radialGradient id={`${idPrefix}-sun`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#fff8e6" /><stop offset="35%" stopColor="#ffd9a0" /><stop offset="70%" stopColor="#c790f6" stopOpacity=".55" /><stop offset="100%" stopColor="#c790f6" stopOpacity="0" /></radialGradient>
    {planets.map(p => <radialGradient key={`c${p.pillar}`} id={`${idPrefix}-core-${p.pillar}`} cx="35%" cy="30%" r="75%"><stop offset="0%" stopColor="#ffffff" stopOpacity=".95" /><stop offset="38%" stopColor={COLOUR[p.pillar]} /><stop offset="100%" stopColor="#0b1030" /></radialGradient>)}
    {planets.map(p => <radialGradient key={`g${p.pillar}`} id={`${idPrefix}-glow-${p.pillar}`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={COLOUR[p.pillar]} stopOpacity=".9" /><stop offset="100%" stopColor={COLOUR[p.pillar]} stopOpacity="0" /></radialGradient>)}
  </defs>;
}

/**
 * Gate C design review (finding 8): on a phone the orbits left each planet ≈ 25 px wide and a name on its neighbour, so the
 * phone's scene is a 2 × 2 grid — the same four planets, half as large again, a small central light, no orbits — with each
 * name under its own planet, clear of its rings and moons (`gridPlanet().reach`, in scene units, places the name).
 */
export type SceneLayout = 'orbit' | 'grid';
export const GRID_SCENE = {width: 400, height: 340, cx: 200, cy: 170} as const;
const GRID_CELL: Record<UniversePillar, {x: number; y: number}> = {habits: {x: 100, y: 80}, health: {x: 300, y: 80}, goals: {x: 100, y: 250}, wealth: {x: 300, y: 250}};
export const sceneOf = (layout: SceneLayout) => layout === 'grid' ? GRID_SCENE : SCENE;
export const scenePosition = (pillar: UniversePillar, layout: SceneLayout) => layout === 'grid' ? GRID_CELL[pillar] : planetPosition(pillar);
/** A planet's size in the grid: half as large again, capped so its outermost ring, moon or halo stays within 62 of its
 *  cell's centre (cells are 200 wide); `reach` is how far below its centre the planet's moons, halo and rings go. */
export function gridPlanet(p: Planet): {r: number; scale: number; reach: number} {
  const r = planetRadius(p), scale = 1.5 * rowScale(p, r, 62 / 1.5), rings = p.rings + p.faintRings;
  const below = Math.max(r, p.lit ? r + 11.5 : 0, rings ? (r + 7 + (rings - 1) * 4.2) * 0.34 : 0, p.moons >= 2 ? (r + 16) * 0.62 + 3.1 : 0);
  return {r, scale, reach: below * scale};
}

export function UniverseScene({planets, idPrefix = 'universe', layout = 'orbit'}: {planets: readonly Planet[]; idPrefix?: string; layout?: SceneLayout}) {
  const ref = useEntrance<HTMLDivElement>(`universe-scene:${idPrefix}`, planets.length > 0);
  const scene = sceneOf(layout), grid = layout === 'grid';
  return <div ref={ref} className="universe-scene" data-layout={layout} aria-hidden="true">
    <svg viewBox={`0 0 ${scene.width} ${scene.height}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" focusable="false">
      <Gradients idPrefix={idPrefix} planets={planets} />
      <circle className="universe-sun-glow" cx={scene.cx} cy={scene.cy} r={grid ? 30 : 64} fill={`url(#${idPrefix}-sun)`} />
      <circle className="universe-sun" cx={scene.cx} cy={scene.cy} r={grid ? 7 : 15} fill="#fff4d8" />
      {!grid && planets.map(p => { const {rx} = ORBIT[p.pillar]; return <ellipse key={`o${p.pillar}`} className="universe-orbit" pathLength={1} cx={SCENE.cx} cy={SCENE.cy} rx={rx} ry={rx * TILT} fill="none" stroke="#b9c6ff" strokeOpacity={0.22} strokeWidth={1} />; })}
      {planets.map(p => { const {x, y} = scenePosition(p.pillar, layout); if (!grid) return <PlanetBody key={p.pillar} planet={p} x={x} y={y} r={planetRadius(p)} idPrefix={idPrefix} />;
        const {r, scale} = gridPlanet(p);
        return <g key={p.pillar} transform={`translate(${x} ${y}) scale(${scale.toFixed(3)}) translate(${-x} ${-y})`}><PlanetBody planet={p} x={x} y={y} r={r} idPrefix={idPrefix} /></g>; })}
    </svg>
  </div>;
}

/**
 * Four planets in a row for Today's compact card: the same bodies, smaller, no orbits. Critique round 2 (L5c): one small
 * picture per planet in a four-column grid — the same columns as the names under them (.today-universe-names) — so each
 * name sits under its planet at every width (one 320-wide picture, centred, drifted away from a full-width row of names).
 */
export function UniverseRow({planets, idPrefix = 'universe-row'}: {planets: readonly Planet[]; idPrefix?: string}) {
  const ref = useEntrance<HTMLDivElement>(`universe-row:${idPrefix}`, planets.length > 0);
  return <div ref={ref} className="universe-row" aria-hidden="true">
    {planets.map(p => { const r = Math.min(16, 9 + p.rings), scale = rowScale(p, r); return <svg key={p.pillar} viewBox="0 0 80 84" preserveAspectRatio="xMidYMid meet" focusable="false" data-pillar={p.pillar}>
      <Gradients idPrefix={`${idPrefix}-${p.pillar}`} planets={[p]} />
      <g transform={scale < 1 ? `translate(40 42) scale(${scale.toFixed(3)}) translate(-40 -42)` : undefined}>
        <PlanetBody planet={p} x={40} y={42} r={r} idPrefix={`${idPrefix}-${p.pillar}`} />
      </g>
    </svg>; })}
  </div>;
}
/** Gate C design review (finding 2): a planet in the compact row stays inside its own picture — its outermost ring (faint
 *  ones too), moon or halo within 36 of the picture's 40 half-width — so many rings never reach the next planet or the
 *  names; the planet is drawn smaller rather than losing a ring. */
export function rowScale(p: Pick<Planet, 'rings' | 'faintRings' | 'moons' | 'lit'>, r: number, limit = 36): number {
  const rings = p.rings + p.faintRings, outer = Math.max(r + (p.lit ? 11.5 : 0), rings ? r + 7 + (rings - 1) * 4.2 : 0, p.moons >= 3 ? r + 19.1 : 0, r);
  return Math.min(1, limit / outer);
}
