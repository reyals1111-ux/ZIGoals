/**
 * Session AG Polish: the seven "orbit planets" of the Checklist path, as measured from the owner's own planet artworks.
 * Pure data, no React and no DOM. Each sphere is a cut-out WebP (public/art/checklist/planets/<id>/, made by
 * scripts/checklist/prepare-planets.py); rings, orbits, mist and the bodies on neon orbits are drawn in SVG/CSS from the
 * geometry here, and moons are small WebPs moved along their `orbit`.
 *
 * Units: the sphere's radius is 50, the origin is the sphere's centre, +x is right and +y is down (SVG). A ring's far half
 * (unrotated y < 0) is drawn before the sphere and its near half after it. A ring's `width` is its main stroke; `strands`
 * are extra concentric strokes at rx + offset (ry scaled by ry/rx). Every ellipse was fitted to the art (limb edge
 * analysis, ridge and band-profile fits), the art's slightly non-circular limb mapped onto the radius-50 circle.
 *
 * Moons and bodies: t is a fraction of a turn on the orbit, point (cx + rx·cos 2πt, cy + ry·sin 2πt) before the tilt, so
 * t = 0.25 is the nearest point and t = 0.75 the farthest (hidden behind the sphere for every moon here). The one-time
 * animation runs t linearly from `from` (the art's position) to `to`; `to` may be below 0 or above 1. Each moon's run is
 * half a turn through t = 0.75: it passes behind the sphere and comes out on the other side. Moon 1 of 08 rides the
 * drawn thin orbit; the other moons sit off their ring in the art, so their orbits pass through the art's position and
 * are tilted like the ring, sized so the moon is fully hidden at t = 0.75.
 */
export type PlanetId = '04' | '05' | '06' | '07' | '08' | '09' | '10';
/** An ellipse in sphere units (radius 50, centre 0,0): centre, radii, rotation in degrees (positive = clockwise in SVG). Its "far" half is the half whose unrotated y < 0 (the top half before rotation), which passes behind the sphere. */
export type PlanetEllipse = {cx: number; cy: number; rx: number; ry: number; tilt: number};
export type PlanetRing = PlanetEllipse & {kind: 'band' | 'thin' | 'rubble' | 'neon'; width: number; colour: string; glow: string; opacity: number; /** extra concentric strands for banded/double rings: offsets of rx/ry in sphere units */ strands?: number[]};
export type PlanetMoon = {src: string; /** diameter in sphere units */ size: number; orbit: PlanetEllipse; /** where it rests before the animation and where it rests after, as a fraction of a turn: t=0 → (cx+rx, cy) before rotation, increasing toward +y (the near side) */ from: number; to: number};
export type PlanetBody = {ring: number; size: number; colour: string; from: number; to: number};
export type PlanetDesign = {id: PlanetId; hue: 'teal' | 'cyan' | 'blue' | 'magenta' | 'purple'; sphere: {src: string; srcSm: string}; /** the sphere's own glow colour (hex) */ glow: string; mist: [string, string]; rings: PlanetRing[]; moons: PlanetMoon[]; bodies: PlanetBody[]; /** the art's bounding box around everything, in sphere units, for layout: half-width and half-height */ extent: {x: number; y: number}};

export const PLANET_DESIGNS: Readonly<Record<PlanetId, PlanetDesign>> = {
  // one wide glowing tilted band; the moon sits upper right, off the ring. Art circle: centre (403.25, 651.98), radius 203.65 px.
  '04': {
    id: '04', hue: 'teal',
    sphere: {src: '/art/checklist/planets/04/sphere.webp', srcSm: '/art/checklist/planets/04/sphere-sm.webp'},
    glow: '#5fe6e6', mist: ['#14b8b8', '#6a5cff'],
    rings: [
      {kind: 'band', cx: -3.61, cy: -3.79, rx: 85.73, ry: 14.24, tilt: -18.52, width: 7.4, colour: '#5ee8ea', glow: '#1fa7c0', opacity: 0.9, strands: [-10.8, -5.4, 5.4, 10.8]},
    ],
    moons: [
      {src: '/art/checklist/planets/04/moon-1.webp', size: 19.1, orbit: {cx: 0, cy: 0, rx: 94.03, ry: 37.94, tilt: -27.02}, from: 0.896, to: 0.396},
    ],
    bodies: [],
    extent: {x: 98.8, y: 64.1},
  },
  // a glowing sphere, no ring. Art circle: centre (390.19, 584.66), radius 162.4 px.
  '05': {
    id: '05', hue: 'cyan',
    sphere: {src: '/art/checklist/planets/05/sphere.webp', srcSm: '/art/checklist/planets/05/sphere-sm.webp'},
    glow: '#5ef0ff', mist: ['#2ec4ef', '#9a6fe0'],
    rings: [],
    moons: [],
    bodies: [],
    extent: {x: 50, y: 50},
  },
  // a double ring: the bright main strand, a fainter inner strand and an outer haze. Art circle: centre (397.24, 576.59), radius 232.54 px.
  '06': {
    id: '06', hue: 'blue',
    sphere: {src: '/art/checklist/planets/06/sphere.webp', srcSm: '/art/checklist/planets/06/sphere-sm.webp'},
    glow: '#3fa2ff', mist: ['#1e4fd8', '#6a4be0'],
    rings: [
      {kind: 'band', cx: 0.3, cy: 1.03, rx: 73.73, ry: 29.69, tilt: -25.92, width: 1.9, colour: '#9fdcff', glow: '#3a7ff2', opacity: 0.95, strands: [-5.2, 5.8]},
    ],
    moons: [],
    bodies: [],
    extent: {x: 74.1, y: 50},
  },
  // a dusty pink rubble ring; the moon sits upper right, off the ring. Art circle: centre (386.04, 575.76), radius 225.64 px.
  '07': {
    id: '07', hue: 'magenta',
    sphere: {src: '/art/checklist/planets/07/sphere.webp', srcSm: '/art/checklist/planets/07/sphere-sm.webp'},
    glow: '#e46ef2', mist: ['#b03cd8', '#e05cc8'],
    rings: [
      {kind: 'rubble', cx: 4.12, cy: -0.08, rx: 74.72, ry: 15.78, tilt: -20.23, width: 5.8, colour: '#d98ad6', glow: '#8a2f96', opacity: 0.9, strands: [-8, 7.5]},
    ],
    moons: [
      {src: '/art/checklist/planets/07/moon-1.webp', size: 15.6, orbit: {cx: 0, cy: 0, rx: 94.44, ry: 39.69, tilt: -36.23}, from: 0.915, to: 0.415},
    ],
    bodies: [],
    extent: {x: 87.6, y: 72.2},
  },
  // a thin orbit line; moon 1 sits on it, moon 2 (lower right) sits off it, on its own orbit. Art circle: centre (390.9, 581.79), radius 172.73 px.
  '08': {
    id: '08', hue: 'teal',
    sphere: {src: '/art/checklist/planets/08/sphere.webp', srcSm: '/art/checklist/planets/08/sphere-sm.webp'},
    glow: '#55dae2', mist: ['#12a8b5', '#1d6f9a'],
    rings: [
      {kind: 'thin', cx: 2.59, cy: -6.72, rx: 79.66, ry: 34.1, tilt: -20.32, width: 0.6, colour: '#8ae6ef', glow: '#22a5b5', opacity: 0.85},
    ],
    moons: [
      {src: '/art/checklist/planets/08/moon-1.webp', size: 16.5, orbit: {cx: 2.59, cy: -6.72, rx: 79.66, ry: 34.1, tilt: -20.32}, from: 0.874, to: 0.374},
      {src: '/art/checklist/planets/08/moon-2.webp', size: 13.5, orbit: {cx: 0, cy: 0, rx: 93.8, ry: 40.77, tilt: -7.82}, from: 0.123, to: -0.377},
    ],
    bodies: [],
    extent: {x: 99.9, y: 57.3},
  },
  // three crossing neon orbits (violet, pink, blue-violet) with a small glowing body on the first two. Art circle: centre (392.08, 569.06), radius 230.2 px.
  '09': {
    id: '09', hue: 'purple',
    sphere: {src: '/art/checklist/planets/09/sphere.webp', srcSm: '/art/checklist/planets/09/sphere-sm.webp'},
    glow: '#b25cf2', mist: ['#7a2fd0', '#c040d8'],
    rings: [
      {kind: 'neon', cx: 0.22, cy: -4.02, rx: 74.21, ry: 26.03, tilt: 31.73, width: 1, colour: '#ecbcff', glow: '#9a40f0', opacity: 1},
      {kind: 'neon', cx: 1.48, cy: 4.16, rx: 73.43, ry: 27.48, tilt: -14.4, width: 1, colour: '#ffb8ee', glow: '#e23fbf', opacity: 1},
      {kind: 'neon', cx: 0.43, cy: -6.45, rx: 71.53, ry: 25.83, tilt: -29.7, width: 1, colour: '#cfc6ff', glow: '#6a4cf2', opacity: 1},
    ],
    moons: [],
    bodies: [
      {ring: 0, size: 2.6, colour: '#ffe6ff', from: 0.617, to: 0.917},
      {ring: 1, size: 3.4, colour: '#fff0fb', from: 0.368, to: 0.668},
    ],
    extent: {x: 73.5, y: 50},
  },
  // a wide banded ring. Art circle: centre (400.84, 583.1), radius 171.95 px.
  '10': {
    id: '10', hue: 'teal',
    sphere: {src: '/art/checklist/planets/10/sphere.webp', srcSm: '/art/checklist/planets/10/sphere-sm.webp'},
    glow: '#5ef0e6', mist: ['#1fb5b8', '#2a8f9f'],
    rings: [
      {kind: 'band', cx: 1.58, cy: 0.08, rx: 84.2, ry: 23.05, tilt: -20.56, width: 12.2, colour: '#6ff0ee', glow: '#22b5c3', opacity: 0.9, strands: [-16.3, -8.7, 6.4, 13.4]},
    ],
    moons: [],
    bodies: [],
    extent: {x: 99.2, y: 50},
  },
};

export const PLANET_IDS: readonly PlanetId[] = ['04', '05', '06', '07', '08', '09', '10'];
