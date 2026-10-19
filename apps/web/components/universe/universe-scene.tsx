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
    {planet.lit && <circle className="universe-planet-halo" cx={x} cy={y} r={r + 5} fill="none" stroke={colour} strokeWidth={1.4} opacity={0.9} />}
    {Array.from({length: planet.faintRings}, (_, k) => <ellipse key={`f${k}`} className="universe-ring is-faint" cx={x} cy={y} rx={ringRx(planet.rings + k)} ry={ringRx(planet.rings + k) * 0.34} fill="none" stroke={colour} strokeWidth={1} strokeDasharray="2 4" opacity={0.3} />)}
    {Array.from({length: planet.rings}, (_, k) => <ellipse key={`r${k}`} className="universe-ring" cx={x} cy={y} rx={ringRx(k)} ry={ringRx(k) * 0.34} fill="none" stroke={colour} strokeWidth={1.6} opacity={0.82} />)}
    <circle className="universe-planet-core" cx={x} cy={y} r={r} fill={`url(#${idPrefix}-core-${planet.pillar})`} opacity={Math.min(1, depth)} />
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

export function UniverseScene({planets, idPrefix = 'universe'}: {planets: readonly Planet[]; idPrefix?: string}) {
  const ref = useEntrance<HTMLDivElement>(`universe-scene:${idPrefix}`, planets.length > 0);
  return <div ref={ref} className="universe-scene" aria-hidden="true">
    <svg viewBox={`0 0 ${SCENE.width} ${SCENE.height}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" focusable="false">
      <Gradients idPrefix={idPrefix} planets={planets} />
      <circle className="universe-sun-glow" cx={SCENE.cx} cy={SCENE.cy} r={64} fill={`url(#${idPrefix}-sun)`} />
      <circle className="universe-sun" cx={SCENE.cx} cy={SCENE.cy} r={15} fill="#fff4d8" />
      {planets.map(p => { const {rx} = ORBIT[p.pillar]; return <ellipse key={`o${p.pillar}`} className="universe-orbit" pathLength={1} cx={SCENE.cx} cy={SCENE.cy} rx={rx} ry={rx * TILT} fill="none" stroke="#b9c6ff" strokeOpacity={0.22} strokeWidth={1} />; })}
      {planets.map(p => { const {x, y} = planetPosition(p.pillar); return <PlanetBody key={p.pillar} planet={p} x={x} y={y} r={planetRadius(p)} idPrefix={idPrefix} />; })}
    </svg>
  </div>;
}

/** Four planets in a row for Today's compact card: the same bodies, smaller, no orbits. */
export function UniverseRow({planets, idPrefix = 'universe-row'}: {planets: readonly Planet[]; idPrefix?: string}) {
  const ref = useEntrance<HTMLDivElement>(`universe-row:${idPrefix}`, planets.length > 0);
  return <div ref={ref} className="universe-row" aria-hidden="true">
    <svg viewBox="0 0 320 84" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" focusable="false">
      <Gradients idPrefix={idPrefix} planets={planets} />
      {planets.map((p, i) => <PlanetBody key={p.pillar} planet={p} x={40 + i * 80} y={42} r={Math.min(16, 9 + p.rings)} idPrefix={idPrefix} />)}
    </svg>
  </div>;
}
