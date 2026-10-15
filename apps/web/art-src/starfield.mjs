// Session AB-Design (ADR-024 D5): the app's background starfield as one vector file, generated here with a fixed seed so
// the committed SVG is reproducible. Run: node apps/web/art-src/starfield.mjs  (writes public/art/v24/starfield.svg).
// Deep navy/purple at the top and bottom, fine sharp stars and faint nebula towards the middle; static by construction.
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const W = 1920, H = 1080, STARS = 1150;
let seed = 20261014;
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const gauss = () => { const u = 1 - rand(), v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const f = n => Math.round(n * 10) / 10;
const TINTS = ['#ffffff', '#ffffff', '#e6f7ff', '#dff3ff', '#ebe4ff', '#fff2e4'];

const stars = [], glows = [];
for (let i = 0; i < STARS; i++) {
  const x = f(rand() * W);
  // Most stars live in the middle band (a bell around the centre line); a few reach the edges.
  let y = H / 2 + gauss() * H * 0.19; if (rand() < 0.14) y = rand() * H;
  if (y < 0 || y > H) continue;
  y = f(y);
  const k = rand();
  const r = k < 0.68 ? 0.45 + rand() * 0.45 : k < 0.94 ? 0.9 + rand() * 0.5 : 1.4 + rand() * 0.8;
  const o = k < 0.68 ? 0.32 + rand() * 0.38 : k < 0.94 ? 0.6 + rand() * 0.3 : 0.85 + rand() * 0.15;
  const tint = TINTS[Math.floor(rand() * TINTS.length)];
  stars.push(`<circle cx="${x}" cy="${y}" r="${f(r)}" fill="${tint}" opacity="${f(o)}"/>`);
  if (k >= 0.94) glows.push(`<circle cx="${x}" cy="${y}" r="${f(r * 4.5)}" fill="url(#g)" opacity="${f(0.35 + rand() * 0.3)}"/>`);
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05040f"/><stop offset=".28" stop-color="#090b22"/><stop offset=".5" stop-color="#0c0f2c"/><stop offset=".74" stop-color="#090a20"/><stop offset="1" stop-color="#04030d"/></linearGradient>
<radialGradient id="n1" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#7b5cff" stop-opacity=".30"/><stop offset=".45" stop-color="#5b3fd6" stop-opacity=".13"/><stop offset="1" stop-color="#2a1f70" stop-opacity="0"/></radialGradient>
<radialGradient id="n2" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#23cfff" stop-opacity=".22"/><stop offset=".5" stop-color="#1f7fd6" stop-opacity=".09"/><stop offset="1" stop-color="#0c2a60" stop-opacity="0"/></radialGradient>
<radialGradient id="n3" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#f06dff" stop-opacity=".20"/><stop offset=".5" stop-color="#a84fd6" stop-opacity=".08"/><stop offset="1" stop-color="#3c1a5c" stop-opacity="0"/></radialGradient>
<radialGradient id="n4" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff9ad0" stop-opacity=".12"/><stop offset="1" stop-color="#5a2a7a" stop-opacity="0"/></radialGradient>
<radialGradient id="g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".4" stop-color="#bfe9ff" stop-opacity=".18"/><stop offset="1" stop-color="#8fb8ff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<g>
<ellipse cx="1310" cy="500" rx="760" ry="330" fill="url(#n1)" transform="rotate(-14 1310 500)"/>
<ellipse cx="560" cy="610" rx="640" ry="260" fill="url(#n2)" transform="rotate(9 560 610)"/>
<ellipse cx="1060" cy="640" rx="520" ry="210" fill="url(#n3)" transform="rotate(-22 1060 640)"/>
<ellipse cx="1620" cy="420" rx="360" ry="150" fill="url(#n4)" transform="rotate(18 1620 420)"/>
<ellipse cx="300" cy="460" rx="300" ry="120" fill="url(#n4)" transform="rotate(-8 300 460)"/>
</g>
<g>${glows.join('')}</g>
<g>${stars.join('')}</g>
</svg>
`;
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'art', 'v24', 'starfield.svg');
writeFileSync(out, svg);
console.log(`${out}: ${svg.length} bytes, ${stars.length} stars`);
