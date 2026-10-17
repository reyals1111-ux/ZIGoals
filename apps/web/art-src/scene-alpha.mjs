// Session AE (Parts 1 and 2, ADR-027): the cosmic artwork made ready to be painted straight onto the app's starfield.
// Run: node apps/web/art-src/scene-alpha.mjs   (writes public/art/v27/*-scene.{avif,webp}; uses only Next's own sharp;
//      SCENE_ONLY=<regex> regenerates only the matching scenes)
//
// The originals stay untouched and at their full resolution; only an alpha channel is added, the colours are the
// originals'. Outside the planets, "colour to alpha" against the page's own ground (#020918): every pixel keeps exactly
// its look over that ground, and darker-than-ground space becomes see-through, so the starfield shows through the dark
// space while the rims, their glow, the mist and the stars stay. Inside each planet (below its lit rim, found column by
// column in the picture itself and extended along a fitted circle where the rim is dark), the original pixels stay fully
// opaque, so no star of the page shows through a lit planet. Where a planet's night side is as dark as space (`depth`:
// opaque for that many pixels below the rim, then fading over as many again), it dissolves like space, so the picture's
// dark rectangle never shows against the starfield. Nothing is blurred, smeared or stretched; the scene's own edges are
// feathered by CSS where it is placed.
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(WEB, 'package.json'));
const sharp = require(require.resolve('sharp', {paths: [require.resolve('next')]}));
const GROUND = [2, 9, 24];
const OUT = join(WEB, 'public', 'art', 'v27');

/** The rim of a planet, one y per column: the brightest row near the fitted circle where the rim is lit (above `lit`),
 *  the circle itself elsewhere; smoothed by a running median so stars on the rim do not dent it. */
function rimLine(lum, W, H, {cx, cy, r, band, lit, from = 0, to = W, fixed = false}) {
  const circle = x => { const d = r * r - (x - cx) ** 2; return d > 0 ? cy - Math.sqrt(d) : Number.POSITIVE_INFINITY; };
  // Gate C design review (ADR-027 G22): a planet whose rim the fitted circle follows closely enough uses the circle itself,
  // so its opaque disc has one smooth edge (column-read rims can step where the brightest row jumps between the rim and
  // its glow; invisible over the night, the steps showed on Light's dusk).
  if (fixed) return Float64Array.from({length: W}, (_, x) => circle(x));
  const raw = new Float64Array(W);
  for (let x = 0; x < W; x++) {
    const yc = circle(x);
    raw[x] = yc;
    if (x < from || x >= to || !Number.isFinite(yc)) continue;
    let best = -1, by = yc;
    for (let y = Math.max(0, Math.round(yc - band)); y < Math.min(H, Math.round(yc + band)); y++) { const v = lum[y * W + x]; if (v > best) { best = v; by = y; } }
    if (best >= lit) raw[x] = by;
  }
  // Where the rim is dark, the circle carries on from the last lit column without a step: the offset at the join tapers
  // to nothing over 300 columns.
  let xs = -1, xe = -1;
  for (let x = from; x < to; x++) if (raw[x] !== circle(x)) { if (xs < 0) xs = x; xe = x; }
  if (xs >= 0) {
    const ds = raw[xs] - circle(xs), de = raw[xe] - circle(xe);
    for (let x = 0; x < xs; x++) if (Number.isFinite(raw[x])) raw[x] += ds * Math.max(0, 1 - (xs - x) / 300);
    for (let x = xe + 1; x < W; x++) if (Number.isFinite(raw[x])) raw[x] += de * Math.max(0, 1 - (x - xe) / 300);
  }
  const out = new Float64Array(W), k = 9;
  for (let x = 0; x < W; x++) { const win = []; for (let j = Math.max(0, x - k); j <= Math.min(W - 1, x + k); j++) if (Number.isFinite(raw[j])) win.push(raw[j]); win.sort((a, b) => a - b); out[x] = win.length ? win[win.length >> 1] : Number.POSITIVE_INFINITY; }
  return out;
}

async function scene({src, name, planets, soft = 6, inset = 4}) {
  if (process.env.SCENE_ONLY && !new RegExp(process.env.SCENE_ONLY).test(name)) return;
  const {data, info} = await sharp(join(WEB, src)).removeAlpha().raw().toBuffer({resolveWithObject: true});
  const W = info.width, H = info.height, lum = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) lum[i] = (data[i * 3] + data[i * 3 + 1] + data[i * 3 + 2]) / 3;
  const rims = planets.map(p => rimLine(lum, W, H, p));
  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, c = [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
    let a = 0;
    for (let k = 0; k < 3; k++) a = Math.max(a, Math.max(c[k] - GROUND[k], 0) / (255 - GROUND[k]));
    let inside = 0;
    rims.forEach((rim, k) => {
      const {depth, from = 0, to = W} = planets[k], d = y - rim[x] - inset;
      // Only where the rim is lit (its columns, fading out over 160 px beyond them) does the planet stay solid.
      const lit = depth ? Math.min(1, Math.max(0, 1 - Math.max(from - x, x - to + 1, 0) / 160)) : 1;
      inside = Math.max(inside, Math.min(1, Math.max(0, d / soft)) * (depth ? Math.min(1, Math.max(0, 1 - (d - depth) / depth)) : 1) * lit);
    });
    const alpha = Math.max(a, inside);
    // Un-mixed from the ground by this alpha, the pixel shows exactly its original colour over the ground (inside a planet,
    // where alpha is 1, that is the original pixel itself).
    for (let k = 0; k < 3; k++) out[i * 4 + k] = Math.round(alpha > 1 / 255 ? Math.min(255, Math.max(0, GROUND[k] + (c[k] - GROUND[k]) / alpha)) : GROUND[k]);
    out[i * 4 + 3] = Math.round(alpha * 255);
  }
  let worst = 0, total = 0;
  for (let i = 0; i < W * H; i++) for (let k = 0; k < 3; k++) { const a = out[i * 4 + 3] / 255, shown = GROUND[k] + a * (out[i * 4 + k] - GROUND[k]), want = Math.max(data[i * 3 + k], GROUND[k]), e = Math.abs(shown - want); total += e; if (e > worst) worst = e; }
  mkdirSync(OUT, {recursive: true});
  const img = () => sharp(out, {raw: {width: W, height: H, channels: 4}});
  if (process.env.SCENE_RAW_DIR) await img().png().toFile(join(process.env.SCENE_RAW_DIR, `${name}.png`)); // lossless copy for encoder checks
  await img().webp({quality: 72, alphaQuality: 80, effort: 6, smartSubsample: true}).toFile(join(OUT, `${name}.webp`));
  await img().avif({quality: 56, effort: 7, chromaSubsampling: '4:4:4'}).toFile(join(OUT, `${name}.avif`));
  console.log(`public/art/v27/${name}.{webp,avif} ${W}×${H}; over the ground: mean ${(total / (W * H * 3)).toFixed(2)}, worst ${worst.toFixed(1)} levels from the original`);
}

// Circles fitted to each lit rim (x, y, r in the picture's own pixels); `lit` is the brightness from which a column's rim
// is read from the picture, `from`/`to` the columns where the rim is visible at all.
await scene({src: 'public/art/v21/hero.webp', name: 'hero-scene', planets: [
  {cx: 363.5, cy: 2052.3, r: 2038, band: 70, lit: 60, from: 500, to: 1745, depth: 70},
  {cx: 2307.1, cy: 8362.1, r: 7725.1, band: 40, lit: 110, from: 1040, to: 1774, depth: 60}]});
await scene({src: 'public/art/v21/hero-mobile.webp', name: 'hero-scene-mobile', planets: [
  {cx: 209.6, cy: 1084.8, r: 1074.5, band: 40, lit: 60, from: 260, to: 945, depth: 38},
  {cx: 833.5, cy: 1018.2, r: 656.7, band: 24, lit: 110, from: 560, to: 960, depth: 32}]});
await scene({src: 'public/art/v21/destination.webp', name: 'destination-scene', soft: 16, inset: 6, planets: [
  {cx: 485, cy: 738, r: 700, band: 40, lit: 60, from: 0, to: 1000, fixed: true}]});
