/**
 * Session AF (L5a, Part 10.13, ADR-028 H75): what may differ between Nebula and Light or Dark, and what may not. Pure
 * (node side): tests/parity/collect.ts reads the computed styles and boxes in the page; this file decides, per element and
 * property, whether a difference is one a light or dark mode normally makes. Allowed, each tagged:
 *   text           — a word's colour (color, -webkit-text-fill-color, caret), a paint or line that is the element's own
 *                    text colour (currentColor icons and borders, svg words), and the currentColor stops of a gradient word;
 *   neutral        — a surface, line, shade or paint whose Nebula colour is neutral (OKLCH chroma < 0.07) or a night
 *                    colour (L < 0.40, chroma < 0.14: the night's tinted panels; the H75 refinement proposed in
 *                    docs/handoff/af-lanes/L5a.md, the same rule as scripts/themes/build-themes.mjs `flips`);
 *                    The page's own ground (body, the content's sky, the ground under the footer banner) is neutral too.
 *   art-calm       — opacity or filter on a named art layer (the heavy backgrounds calmed by day), and the sidebar sky's
 *                    dawn stars and night veil;
 *   theme-bar      — the theme bar itself (it shows which theme is chosen);
 *   gradient-word  — by day only, a coloured stop of a gradient word (a background clipped to its text) in a deeper shade of
 *                    the same hue (within 12°, lower lightness) that reaches 4.5:1 on white (the owner's decision of 19 Oct,
 *                    ADR-028 H130: "their tails use deeper shades of the same colours on white").
 * Everything else — any coloured fill, chart paint, ring, glow, gradient, pillar colour, image — must be equal, and every
 * box must be equal within half a pixel.
 */
export const NEUTRAL_CHROMA = 0.07, NIGHT_L = 0.4, NIGHT_CHROMA = 0.14;
export const BOX_TOLERANCE = 0.5;
export type Klass = 'text' | 'neutral' | 'art-calm' | 'theme-bar' | 'gradient-word' | 'DISALLOWED';
export type Item = {path: string; desc: string; text: boolean; clip: boolean; art: boolean; ground: boolean; bar: boolean; svgText: boolean; props: Record<string, string>; box: [number, number, number, number]};
export type Diff = {path: string; desc: string; prop: string; nebula: string; other: string; klass: Klass};

const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export function oklch([r, g, b]: number[]) {
  const R = lin(r!), G = lin(g!), B = lin(b!);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return {L, C: Math.hypot(A, Bb), h: (Math.atan2(Bb, A) * 180 / Math.PI + 360) % 360};
}
/** The computed colours in a value (rgb()/rgba(), color(srgb …) from a color-mix(), oklch()/oklab() from a relative
 *  colour), in order. */
const COLOUR = /rgba?\([^)]*\)|color\(srgb [^)]*\)|okl(ch|ab)\([^)]*\)/g;
const numbers = (c: string) => c.match(/-?[\d.]+(e-?\d+)?/g)!.map(Number);
/** OKLCH lightness, chroma and alpha of a computed colour. */
export function lca(c: string) {
  const n = numbers(c);
  if (c.startsWith('oklch(')) return {L: n[0]!, C: n[1]!, h: n[2]!, a: n[3] ?? 1};
  if (c.startsWith('oklab(')) return {L: n[0]!, C: Math.hypot(n[1]!, n[2]!), h: (Math.atan2(n[2]!, n[1]!) * 180 / Math.PI + 360) % 360, a: n[3] ?? 1};
  const rgb = c.startsWith('color(') ? [n[0]! * 255, n[1]! * 255, n[2]! * 255] : [n[0]!, n[1]!, n[2]!];
  return {...oklch(rgb), a: n[3] ?? 1};
}
export const colours = (value: string) => [...value.matchAll(COLOUR)].map(m => m[0]);
/** The value without its colours; a zero offset is one zero whatever its unit (`0px`, `0%`: the same position). */
export const skeleton = (value: string) => value.replace(COLOUR, '¤').replace(/(^|[\s(,])0(px|%)(?=[\s),]|$)/g, '$10').replace(/url\("#[^"]*"\)/g, 'url(#id)');
/** May this Nebula colour take another value by day or by night? (neutral or night; fully transparent counts as neutral) */
export function flips(colour: string) { const {L, C, a} = lca(colour); if (a === 0) return true; return C < NEUTRAL_CHROMA || (L < NIGHT_L && C < NIGHT_CHROMA); }

/** A value's top-level layers (commas inside parentheses kept). */
const layers = (v: string) => { const out: string[] = []; let depth = 0, from = 0; for (let i = 0; i < v.length; i++) { const ch = v[i]; if (ch === '(') depth++; else if (ch === ')') depth--; else if (ch === ',' && !depth) { out.push(v.slice(from, i).trim()); from = i + 1; } } out.push(v.slice(from).trim()); return out; };
/** The sidebar sky with its calm removed: a leading veil (one colour, twice) and the dawn twin of the stars file. */
const uncalm = (v: string) => v.replace(/^linear-gradient\((rgba\([^)]*\)), \1\), /, '').replace('sidebar-stars-dawn.svg', 'sidebar-stars.svg');
/** The sidebar's sky (a named art layer): do two values differ only by that calm and by a ground drawn only in neutral or
 *  night colours in Nebula? Its image layers (the stars: file, place, size) must be Nebula's. */
export function skyCalm(a: string, b: string) {
  const x = layers(uncalm(a)), y = layers(uncalm(b));
  if (x.length !== y.length || (x.join() === layers(a).join() && y.join() === layers(b).join())) return false;
  return x.every((layer, i) => /^url\(/.test(layer) ? layer === y[i] : colours(layer).every(flips) && !/^url\(/.test(y[i]!));
}
/** Same red, green and blue (any alpha): a colour drawn from the element's own word colour (currentColor, or a
 *  color-mix of it with transparent). */
const gam = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
function rgbOf(c: string) {
  const n = numbers(c);
  if (c.startsWith('color(')) return n.slice(0, 3).map(v => Math.round(Math.min(255, Math.max(0, v * 255)))).join();
  if (!c.startsWith('okl')) return n.slice(0, 3).map(v => Math.round(v)).join();
  const [L, A, B] = c.startsWith('oklch(') ? [n[0]!, n[1]! * Math.cos(n[2]! * Math.PI / 180), n[1]! * Math.sin(n[2]! * Math.PI / 180)] : [n[0]!, n[1]!, n[2]!];
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(v => Math.round(Math.min(255, Math.max(0, gam(Math.min(1, Math.max(0, v))))))).join();
}
/** Within one step per channel: color-mix() and relative colours round differently from the colour they came from. */
const sameRgb = (x: string, y: string) => { if (!x || !y) return false; const p = rgbOf(x).split(',').map(Number), q = rgbOf(y).split(',').map(Number); return p.every((v, i) => Math.abs(v - q[i]!) <= 1); };
/** H130: a gradient word's coloured stop by day: the same hue (within 12°), deeper, and at least 4.5:1 on white. */
export const GRADIENT_WORD_HUE = 12, GRADIENT_WORD_CONTRAST = 4.5;
const onWhite = (c: string) => { const [r, g, b] = rgbOf(c).split(',').map(Number); return 1.05 / (0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!) + 0.05); };
export function deeperSameHue(nebula: string, day: string) {
  const x = lca(nebula), y = lca(day), turn = Math.abs(x.h - y.h) % 360;
  return x.C >= NEUTRAL_CHROMA && y.C >= NEUTRAL_CHROMA && Math.min(turn, 360 - turn) <= GRADIENT_WORD_HUE && y.L < x.L && onWhite(day) >= GRADIENT_WORD_CONTRAST;
}
const TEXT_PROPS = new Set(['color', '-webkit-text-fill-color', 'caret-color']);
const CALM_PROPS = new Set(['opacity', 'filter']);
/** A filter whose only change is the colour of its drop shadows is a shade, not a calm. */
const shadeOnly = (a: string, b: string) => skeleton(a) === skeleton(b) && /drop-shadow/.test(a);

/** Classifies one property's difference on one element. */
/** `theme` is the theme compared with Nebula; the gradient-word class exists by day only (H130; Gate C test audit). */
export function classify(prop: string, nebula: Item, other: Item, theme: 'light' | 'dark' = 'light'): Klass {
  const a = nebula.props[prop] ?? '', b = other.props[prop] ?? '';
  if (nebula.bar) return 'theme-bar';
  if (TEXT_PROPS.has(prop)) return 'text';
  // The page's own ground (the body, the content's sky, the ground under the footer banner): by day white with a light
  // mist that deepens into the banner's night, by night black with a dark mist (H13, D9: "only the background").
  if (nebula.ground && (prop === 'background-color' || prop === 'background-image')) return 'neutral';
  if (CALM_PROPS.has(prop) && !(prop === 'filter' && shadeOnly(a, b))) return nebula.art ? 'art-calm' : 'DISALLOWED';
  // The sidebar's sky is a named art layer too: by day its stars are AE's dawn file (the same stars in deeper ink, for
  // the day's ground) and by night a veil of the ground dims them; the stars, their place, size and any coloured stop
  // stay Nebula's.
  if (prop === 'background-image' && nebula.art && skyCalm(a, b)) return 'art-calm';
  const ca = colours(a), cb = colours(b), ownA = nebula.props.color ?? '', ownB = other.props.color ?? '';
  // A shade made only of neutral or night colours may be softened, added or left out by day (the cards' separation shade).
  if ((prop === 'box-shadow' || prop === 'text-shadow') && [...ca, ...cb].every(flips)) return 'neutral';
  if (skeleton(a) !== skeleton(b)) return 'DISALLOWED';
  let klass: Klass = 'neutral';
  for (let i = 0; i < ca.length; i++) {
    if (ca[i] === cb[i]) continue;
    // A paint or a gradient stop that is the element's own word colour (currentColor) follows the word.
    const fromText = (prop !== 'background-image' || nebula.clip) && (ca[i] === ownA && cb[i] === ownB || sameRgb(ca[i]!, ownA) && sameRgb(cb[i]!, ownB));
    if (fromText || (nebula.svgText && prop === 'fill')) { klass = klass === 'neutral' ? 'text' : klass; continue; }
    if (theme === 'light' && prop === 'background-image' && nebula.clip && deeperSameHue(ca[i]!, cb[i]!)) { klass = 'gradient-word'; continue; }
    if (!flips(ca[i]!)) return 'DISALLOWED';
  }
  return klass;
}

/** A reference to an element by its generated id (an svg gradient, filter or clip: React's useId differs per page view)
 *  names the same paint; what it paints is compared on its own stops. */
const sameIds = (v: string) => v.replace(/url\("#[^"]*"\)/g, 'url(#id)');
/** Every difference between two snapshots of the same page (same DOM), classified; boxes beyond half a pixel are DISALLOWED. */
export function compare(nebula: readonly Item[], other: readonly Item[], theme: 'light' | 'dark' = 'light'): {diffs: Diff[]; mismatch: string | null} {
  const byPath = new Map(other.map(i => [i.path, i])), diffs: Diff[] = [];
  let missing = 0;
  for (const n of nebula) {
    const o = byPath.get(n.path); if (!o) { missing++; continue; }
    for (const prop of Object.keys(n.props)) if (sameIds(n.props[prop]!) !== sameIds(o.props[prop] ?? '')) diffs.push({path: n.path, desc: n.desc, prop, nebula: n.props[prop]!, other: o.props[prop] ?? '', klass: classify(prop, n, o, theme)});
    if (n.box.some((v, i) => Math.abs(v - o.box[i]!) > BOX_TOLERANCE)) diffs.push({path: n.path, desc: n.desc, prop: 'box', nebula: n.box.join(' '), other: o.box.join(' '), klass: 'DISALLOWED'});
  }
  const mismatch = missing || nebula.length !== other.length ? `${nebula.length} elements in Nebula, ${other.length} in the other theme, ${missing} unmatched` : null;
  return {diffs, mismatch};
}
