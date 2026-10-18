// Session AE (Part 4, ADR-027): the sidebar's own starfield, a narrow vector column generated the way starfield.mjs makes
// the pages' sky (fixed seed, so the committed SVGs are reproducible). Run: node apps/web/art-src/sidebar-sky.mjs
// (writes public/art/v24/sidebar-stars.svg and sidebar-stars-dawn.svg).
// The column is drawn bottom-up, in CSS pixels from the end of the sidebar's content (the CSS pins it there): nothing in
// the top part (the logo and the first buttons sit on one clean colour), stars easing in from the middle down, a calm foot
// behind the page mark, the planet and the theme bar. Transparent: the CSS draws the sky colour under it. The dawn file
// holds the same stars in deeper ink for Light's pale sky; its foot keeps night stars, because Light's foot is dusk.
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const W = 240, H = 1100;
/** Heights from the bottom: the calm foot ends at FOOT, the full band at BAND, the stars fade in up to TOP. */
const FOOT = 470, BAND = 760, TOP = 930;
let seed = 20261017;
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const f = n => Math.round(n * 10) / 10;
const NIGHT = ['#ffffff', '#ffffff', '#e6f7ff', '#dff3ff', '#ebe4ff', '#fff2e4'];
const DAWN = ['#3f37a8', '#4b3fd1', '#5b4fc8', '#6a45b8', '#8a3f9e', '#2f4aa0'];

/** How many stars live at a height (from the bottom): none at the top, a smooth ramp, the band, a sparse foot. */
const density = up => up > TOP ? 0 : up > BAND ? ((TOP - up) / (TOP - BAND)) ** 1.6 : up > FOOT ? 1 : up > FOOT - 40 ? 0.35 : up > 130 ? 0.12 : 0;
const stars = [];
for (let i = 0; i < 2400 && stars.length < 170; i++) {
  const up = rand() * TOP, x = rand() * W;
  if (rand() > density(up)) continue;
  const k = rand(), calm = up <= FOOT;
  const r = k < 0.74 ? 0.4 + rand() * 0.4 : k < 0.95 ? 0.8 + rand() * 0.4 : 1.2 + rand() * 0.5;
  const o = (k < 0.74 ? 0.3 + rand() * 0.35 : k < 0.95 ? 0.55 + rand() * 0.3 : 0.85 + rand() * 0.15) * (calm ? 0.6 : 1);
  stars.push({x: f(x), y: f(H - up), r: f(r), o: f(o), t: Math.floor(rand() * 6), glow: k >= 0.95 && !calm, g: f(0.3 + rand() * 0.3), calm});
}
/** Faint clouds in the band, as on the pages (violet, cyan, a touch of magenta). */
const CLOUDS = `<ellipse cx="70" cy="${H - 640}" rx="150" ry="70" fill="url(#c1)" transform="rotate(-18 70 ${H - 640})"/><ellipse cx="190" cy="${H - 560}" rx="130" ry="56" fill="url(#c2)" transform="rotate(12 190 ${H - 560})"/><ellipse cx="120" cy="${H - 700}" rx="110" ry="40" fill="url(#c3)" transform="rotate(-6 120 ${H - 700})"/>`;
const grad = (id, stops) => `<radialGradient id="${id}" cx=".5" cy=".5" r=".5">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;
function svg(theme) {
  const dawn = theme === 'dawn';
  const defs = dawn
    ? grad('c1', [[0, '#b7a4ff', .34], [.5, '#c9bbff', .14], [1, '#e9e3ff', 0]]) + grad('c2', [[0, '#9fd8ff', .28], [.5, '#bfe4ff', .1], [1, '#e6f4ff', 0]]) + grad('c3', [[0, '#ffb6dc', .22], [1, '#ffe3f1', 0]]) + grad('g', [[0, '#6a5ae0', .32], [.45, '#8f7cf0', .1], [1, '#b9a8ff', 0]])
    : grad('c1', [[0, '#7b5cff', .2], [.45, '#5b3fd6', .08], [1, '#2a1f70', 0]]) + grad('c2', [[0, '#23cfff', .13], [.5, '#1f7fd6', .05], [1, '#0c2a60', 0]]) + grad('c3', [[0, '#f06dff', .1], [1, '#3c1a5c', 0]]) + grad('g', [[0, '#ffffff', .55], [.4, '#bfe9ff', .18], [1, '#8fb8ff', 0]]);
  // By day the band's stars are ink on the pale sky; the foot is dusk, so its few stars stay light (Light's CSS draws it).
  const tint = s => dawn && !s.calm ? DAWN[s.t] : NIGHT[s.t];
  const glows = stars.filter(s => s.glow).map(s => `<circle cx="${s.x}" cy="${s.y}" r="${f(s.r * 4.5)}" fill="url(#g)" opacity="${s.g}"/>`).join('');
  const dots = stars.map(s => `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${tint(s)}" opacity="${dawn && !s.calm ? f(Math.min(1, s.o * 0.85)) : s.o}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>${defs}</defs>
<g>${CLOUDS}</g>
<g>${glows}</g>
<g>${dots}</g>
</svg>
`;
}
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'art', 'v24');
for (const [name, theme] of [['sidebar-stars.svg', 'night'], ['sidebar-stars-dawn.svg', 'dawn']]) {
  const text = svg(theme); writeFileSync(join(dir, name), text);
  console.log(`${name}: ${text.length} bytes, ${stars.length} stars`);
}
