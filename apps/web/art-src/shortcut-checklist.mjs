// Session AF (L3; P7.20): the Home Screen shortcut icon for the Checklist (public/icons/shortcut-checklist-96.png), in
// the family of the other shortcut icons (a dark disc with a ring and one glyph): a nebula ring, three dots on a path
// and a check, in the Checklist mark's gradient. Drawn here with signed distances and 4×4 supersampling, encoded as PNG
// with node:zlib, so the committed file is reproducible with nothing installed. Run: node apps/web/art-src/shortcut-checklist.mjs
import {writeFileSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const N = 96, SS = 4;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const STOPS = [[0, hex('#63e7ff')], [0.38, hex('#826cff')], [0.7, hex('#c664ff')], [1, hex('#ff74be')]];
/** The nebula gradient along the diagonal (top-left → bottom-right). */
function nebula(x, y) {
  const t = Math.min(1, Math.max(0, (x + y) / (2 * N)));
  for (let i = 1; i < STOPS.length; i++) { const [t1, c1] = STOPS[i], [t0, c0] = STOPS[i - 1]; if (t <= t1) { const k = (t - t0) / (t1 - t0); return c0.map((v, j) => v + (c1[j] - v) * k); } }
  return STOPS.at(-1)[1];
}
const circle = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r;
const segment = (x, y, ax, ay, bx, by) => { const px = x - ax, py = y - ay, dx = bx - ax, dy = by - ay, h = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy))); return Math.hypot(px - dx * h, py - dy * h); };
/** Layers from back to front: [coverage(x, y) ≤ 0 inside, colour(x, y), alpha]. */
const C = N / 2;
const layers = [
  [() => -1, () => hex('#020918'), 1],
  [(x, y) => circle(x, y, C, C, 40), () => hex('#0a1330'), 1],
  [(x, y) => Math.abs(circle(x, y, C, C, 40)) - 4, nebula, 1],
  [(x, y) => segment(x, y, 33, 34, 33, 62) - 1.4, nebula, 0.55],
  [(x, y) => circle(x, y, 33, 34, 6), nebula, 1],
  [(x, y) => circle(x, y, 33, 62, 6), nebula, 0.75],
  [(x, y) => Math.min(segment(x, y, 46, 50, 54, 58), segment(x, y, 54, 58, 68, 40)) - 3.6, nebula, 1],
];
const px = new Uint8Array(N * N * 3);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  let r = 0, g = 0, b = 0, a = 0;
  for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
    const fx = x + (sx + 0.5) / SS, fy = y + (sy + 0.5) / SS;
    let cr = 0, cg = 0, cb = 0, ca = 0;
    for (const [shape, colour, alpha] of layers) if (shape(fx, fy) <= 0) { const [lr, lg, lb] = colour(fx, fy); cr = cr * (1 - alpha) + lr * alpha; cg = cg * (1 - alpha) + lg * alpha; cb = cb * (1 - alpha) + lb * alpha; ca = ca + alpha * (1 - ca); }
    r += cr; g += cg; b += cb; a += ca;
  }
  // The square is opaque (the first layer covers it), as every Home Screen icon must be: plain RGB, no alpha.
  const n = SS * SS, i = (y * N + x) * 3;
  px[i] = Math.round(r / n); px[i + 1] = Math.round(g / n); px[i + 2] = Math.round(b / n); void a;
}
// PNG (8-bit RGB): signature, IHDR, IDAT (filter 0 per row), IEND.
const crcTable = Array.from({length: 256}, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = 0xffffffff; for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4), body = Buffer.concat([Buffer.from(type), data]), sum = Buffer.alloc(4); len.writeUInt32BE(data.length); sum.writeUInt32BE(crc(body)); return Buffer.concat([len, body, sum]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 2;
const raw = Buffer.alloc(N * (N * 3 + 1)); for (let y = 0; y < N; y++) { raw[y * (N * 3 + 1)] = 0; Buffer.from(px.buffer, y * N * 3, N * 3).copy(raw, y * (N * 3 + 1) + 1); }
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, {level: 9})), chunk('IEND', Buffer.alloc(0))]);
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons', 'shortcut-checklist-96.png');
writeFileSync(out, png);
console.log(`${out} ${png.length} bytes`);
