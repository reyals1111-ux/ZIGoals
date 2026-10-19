/**
 * Session AF (L5a, Part 10.8): the footer finale's line from Health into "= Wealth", as one organic curve drawn as a
 * filled, tapered ribbon (pure geometry; components/footer/footer-path.tsx measures the page and paints it).
 *
 * Wider screens (the steps in a row): from Health's node the curve runs on to the right, rises past the node's bubble,
 * turns at its rightmost point and sweeps back left, over and down into the right end of "= Wealth" — five anchors through
 * one Catmull-Rom spline (four cubic pieces, two bends). Phones (the steps stacked, "= Wealth" above them): from the foot
 * of the line under Health it runs right beneath the steps, up the right edge and left into the word. The ribbon is the
 * curve's two offset sides, about 1.5 px wide at Health, 6 px in the middle and 2 px at the word (narrower on phones),
 * closed into one shape; it is cut at the curve's rightmost point into the two pieces the finale reveals one after the
 * other (rightwards, then back), each sharing its first point with the previous piece's last, so no seam shows.
 */
export type Pt = {x: number; y: number};
export type Seg = [Pt, Pt, Pt, Pt];
export type Ribbon = {anchors: Pt[]; segs: Seg[]; samples: Pt[]; widths: number[]; split: number; pieces: [string, string]; boxes: [Box, Box]; end: Pt; top: number};
export type Box = {l: number; t: number; w: number; h: number};
/** The ribbon's width at its start, its widest and its end, on wider screens and on phones. */
export const RIBBON_WIDTH = {wide: [1.5, 6, 2], phone: [1.2, 4.2, 1.6]} as const;
export const SAMPLES = 72;
const f = (n: number) => n.toFixed(1);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A Catmull-Rom spline through the anchors as cubic Bézier pieces (the ends repeat their anchor). */
export function spline(points: readonly Pt[]): Seg[] {
  const segs: Seg[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!, p1 = points[i]!, p2 = points[i + 1]!, p3 = points[i + 2] ?? p2;
    segs.push([p1, {x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6}, {x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6}, p2]);
  }
  return segs;
}
export const at = (s: Seg, t: number): Pt => { const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t; return {x: a * s[0].x + b * s[1].x + c * s[2].x + d * s[3].x, y: a * s[0].y + b * s[1].y + c * s[2].y + d * s[3].y}; };

/** The anchors on wider screens: Health's node, on and below to the right, the turn, over the word, the word's end. */
export function wideAnchors(last: Pt, wealth: Pt, w: number): Pt[] {
  const reach = clamp(w - last.x - 16, 36, 150), rise = Math.max(60, last.y - wealth.y);
  return [last, {x: last.x + reach * 0.55, y: last.y + 6}, {x: last.x + reach, y: last.y - rise * 0.55}, {x: wealth.x + (last.x + reach - wealth.x) * 0.38, y: wealth.y - rise * 0.2}, wealth];
}
/** The anchors on phones: the foot of the line under Health, beneath the steps, up the right edge, into the word. */
export function phoneAnchors(foot: Pt, below: number, wealth: Pt, w: number): Pt[] {
  const edge = w - 8, y0 = Math.max(below, foot.y + 8);
  return [foot, {x: clamp(foot.x + (edge - foot.x) * 0.45, 12, edge), y: y0}, {x: edge, y: y0 - (y0 - wealth.y) * 0.35}, {x: edge - 1, y: wealth.y + (y0 - wealth.y) * 0.12}, wealth];
}

/** The ribbon's width at t (0 at the start, 1 at the end): thin, widest a little before the middle, thin again. */
export const widthAt = (t: number, [start, peak, end]: readonly [number, number, number] | readonly number[]) => { const base = start! + (end! - start!) * t; return base + (peak! - base) * Math.sin(Math.PI * t) ** 0.9; };

/** The closed outline of the samples from `from` to `to` (inclusive): one side forward, the other back. */
function outline(samples: readonly Pt[], widths: readonly number[], from: number, to: number) {
  const left: string[] = [], right: string[] = [];
  for (let i = from; i <= to; i++) {
    const a = samples[Math.max(0, i - 1)]!, b = samples[Math.min(samples.length - 1, i + 1)]!, len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len, half = widths[i]! / 2, p = samples[i]!;
    left.push(`${f(p.x + nx * half)} ${f(p.y + ny * half)}`); right.unshift(`${f(p.x - nx * half)} ${f(p.y - ny * half)}`);
  }
  return `M${left.join(' L')} L${right.join(' L')} Z`;
}
const boxOf = (samples: readonly Pt[], from: number, to: number, pad: number): Box => { const part = samples.slice(from, to + 1), xs = part.map(p => p.x), ys = part.map(p => p.y), l = Math.min(...xs) - pad, t = Math.min(...ys) - pad; return {l, t, w: Math.max(...xs) + pad - l, h: Math.max(...ys) + pad - t}; };

/** The ribbon through the anchors: its samples, widths, the two pieces (cut at the rightmost point) and their boxes. */
export function ribbon(anchors: readonly Pt[], widths: readonly number[], pad = 10, maxX = Infinity): Ribbon {
  const segs = spline(anchors), samples: Pt[] = [], ws: number[] = [];
  // (maxX: a narrow stage's edge; the curve's bulge past it is laid along it.)
  for (let i = 0; i <= SAMPLES; i++) { const g = i / SAMPLES * segs.length, k = Math.min(segs.length - 1, Math.floor(g)), p = at(segs[k]!, g - k); samples.push({x: Math.min(p.x, maxX), y: p.y}); ws.push(widthAt(i / SAMPLES, widths)); }
  let split = 0; samples.forEach((p, i) => { if (p.x > samples[split]!.x) split = i; });
  split = clamp(split, 1, SAMPLES - 1);
  return {anchors: [...anchors], segs, samples, widths: ws, split, pieces: [outline(samples, ws, 0, split), outline(samples, ws, split, SAMPLES)], boxes: [boxOf(samples, 0, split, pad), boxOf(samples, split, SAMPLES, pad)], end: samples[SAMPLES]!, top: Math.min(...samples.map(p => p.y))};
}
