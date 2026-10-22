import type {PlanetEllipse} from './planet-designs';

/**
 * Session AG Polish (owner Part 4): a point on a planet's tilted orbit at `t` turns (sphere units: radius 50, centre 0,0),
 * and how near it is — 1 on the near side (in front of the sphere), −1 on the far side (behind it). Pure.
 */
export function orbitPoint(e: PlanetEllipse, t: number): {x: number; y: number; near: number} {
  const a = t * Math.PI * 2, x0 = e.rx * Math.cos(a), y0 = e.ry * Math.sin(a), k = e.tilt * Math.PI / 180;
  return {x: e.cx + x0 * Math.cos(k) - y0 * Math.sin(k), y: e.cy + x0 * Math.sin(k) + y0 * Math.cos(k), near: Math.sin(a)};
}
