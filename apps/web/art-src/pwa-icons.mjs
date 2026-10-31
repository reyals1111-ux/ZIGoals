// Session AK Part 3 (A18): the Home Screen shortcut icons for Today and Log weight (public/icons/shortcut-today-96.png,
// shortcut-weight-96.png) in the family of the other shortcut icons (art-src/shortcut-checklist.mjs: a dark disc with a
// nebula ring and one glyph), and the notification badge (public/icons/zigoals-badge-96.png): a white ring and dot on
// transparency, as Android draws badges as a silhouette. Signed distances, 4×4 supersampling, PNG via node:zlib, so the
// committed files are reproducible with nothing installed. Run: node apps/web/art-src/pwa-icons.mjs
import {writeFileSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const N = 96, SS = 4, C = N / 2;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const STOPS = [[0, hex('#63e7ff')], [0.38, hex('#826cff')], [0.7, hex('#c664ff')], [1, hex('#ff74be')]];
function nebula(x, y) {
  const t = Math.min(1, Math.max(0, (x + y) / (2 * N)));
  for (let i = 1; i < STOPS.length; i++) { const [t1, c1] = STOPS[i], [t0, c0] = STOPS[i - 1]; if (t <= t1) { const k = (t - t0) / (t1 - t0); return c0.map((v, j) => v + (c1[j] - v) * k); } }
  return STOPS.at(-1)[1];
}
const circle = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r;
const segment = (x, y, ax, ay, bx, by) => { const px = x - ax, py = y - ay, dx = bx - ax, dy = by - ay, h = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy))); return Math.hypot(px - dx * h, py - dy * h); };
const box = (x, y, cx, cy, hw, hh, r) => { const qx = Math.abs(x - cx) - hw + r, qy = Math.abs(y - cy) - hh + r; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
const disc = [[() => -1, () => hex('#020918'), 1], [(x, y) => circle(x, y, C, C, 40), () => hex('#0a1330'), 1], [(x, y) => Math.abs(circle(x, y, C, C, 40)) - 4, nebula, 1]];
const ICONS = {
  // Today: a sun with eight short rays, the day's orbit.
  'shortcut-today-96.png': [...disc,
    [(x, y) => circle(x, y, C, C, 11), nebula, 1],
    [(x, y) => Math.min(...Array.from({length: 8}, (_, i) => { const a = i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); return segment(x, y, C + c * 17, C + s * 17, C + c * 25, C + s * 25); })) - 2.6, nebula, 1]],
  // Log weight: a scale with a dial and a needle.
  'shortcut-weight-96.png': [...disc,
    [(x, y) => box(x, y, C, C + 4, 21, 17, 6), nebula, 1],
    [(x, y) => box(x, y, C, C + 4, 17, 13, 4), () => hex('#0a1330'), 1],
    [(x, y) => Math.abs(circle(x, y, C, C + 2, 8)) - 2, nebula, 1],
    [(x, y) => segment(x, y, C, C + 2, C + 5, C - 4) - 1.8, nebula, 1]],
};
function render(layers, {alpha = false} = {}) {
  const px = new Uint8Array(N * N * (alpha ? 4 : 3));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const fx = x + (sx + 0.5) / SS, fy = y + (sy + 0.5) / SS;
      let cr = 0, cg = 0, cb = 0, ca = 0;
      for (const [shape, colour, op] of layers) if (shape(fx, fy) <= 0) { const [lr, lg, lb] = colour(fx, fy); cr = cr * (1 - op) + lr * op; cg = cg * (1 - op) + lg * op; cb = cb * (1 - op) + lb * op; ca = ca * (1 - op) + op; }
      r += cr; g += cg; b += cb; a += ca;
    }
    const n = SS * SS, i = (y * N + x) * (alpha ? 4 : 3);
    px[i] = Math.round(r / n); px[i + 1] = Math.round(g / n); px[i + 2] = Math.round(b / n); if (alpha) px[i + 3] = Math.round(a / n * 255);
  }
  return px;
}
const crcTable = Array.from({length: 256}, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = 0xffffffff; for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4), body = Buffer.concat([Buffer.from(type), data]), sum = Buffer.alloc(4); len.writeUInt32BE(data.length); sum.writeUInt32BE(crc(body)); return Buffer.concat([len, body, sum]); };
function png(px, alpha) {
  const bpp = alpha ? 4 : 3, ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = alpha ? 6 : 2;
  const raw = Buffer.alloc(N * (N * bpp + 1)); for (let y = 0; y < N; y++) { raw[y * (N * bpp + 1)] = 0; Buffer.from(px.buffer, y * N * bpp, N * bpp).copy(raw, y * (N * bpp + 1) + 1); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, {level: 9})), chunk('IEND', Buffer.alloc(0))]);
}
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
for (const [name, layers] of Object.entries(ICONS)) { const file = png(render(layers), false); writeFileSync(join(dir, name), file); console.log(`${name} ${file.length} bytes`); }
// The badge: white on transparency (a ring and the orbit's dot).
const white = () => [255, 255, 255];
const badge = png(render([[(x, y) => Math.abs(circle(x, y, C, C, 30)) - 6, white, 1], [(x, y) => circle(x, y, C + 21, C - 21, 9), white, 1]], {alpha: true}), true);
writeFileSync(join(dir, 'zigoals-badge-96.png'), badge); console.log(`zigoals-badge-96.png ${badge.length} bytes`);
