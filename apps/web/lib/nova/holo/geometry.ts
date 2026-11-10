/**
 * Session AL Part 11 (lane L8): the drawing arithmetic of NOVA's holographic HUD. Pure, no DOM: angles in degrees with
 * 0 at twelve o'clock, clockwise (as a clock and every progress ring in ZIGoals read), SVG path strings rounded to two
 * decimals so the markup stays small and stable between renders.
 */
const r2 = (n: number) => Math.round(n * 100) / 100;
export const clamp01 = (n: number): number => Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;

/** A point on a circle of radius `r` around (cx, cy) at `deg` (0 = top, clockwise). */
export function polar(cx: number, cy: number, r: number, deg: number): {x: number; y: number} {
  const rad = (deg - 90) * Math.PI / 180;
  return {x: r2(cx + r * Math.cos(rad)), y: r2(cy + r * Math.sin(rad))};
}
/** An open arc from `from` to `to` degrees (clockwise); an empty span draws nothing, a full turn is two half arcs. */
export function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const span = to - from;
  if (!(span > 0.01) || !(r > 0)) return '';
  if (span >= 359.99) return `${arcPath(cx, cy, r, from, from + 180)} ${arcPath(cx, cy, r, from + 180, from + 360)}`;
  const a = polar(cx, cy, r, from), b = polar(cx, cy, r, to);
  return `M${a.x} ${a.y}A${r2(r)} ${r2(r)} 0 ${span > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
}
/** `count` radial tick lines between radii `r1` and `r2`, evenly round a whole turn (or across `sweep` degrees from `start`). */
export function tickPath(cx: number, cy: number, r1: number, rr2: number, count: number, start = 0, sweep = 360): string {
  if (!(count > 0)) return '';
  const full = sweep >= 360, step = sweep / (full ? count : Math.max(1, count - 1)), out: string[] = [];
  for (let i = 0; i < count; i++) {
    const deg = start + i * step, a = polar(cx, cy, r1, deg), b = polar(cx, cy, rr2, deg);
    out.push(`M${a.x} ${a.y}L${b.x} ${b.y}`);
  }
  return out.join('');
}
/**
 * How many of `count` segments a share lights: whole segments, and the share of the next one (0–1) so a bar can draw it
 * part-lit. A share past 1 lights them all (the text says how far past).
 */
export function segmentsLit(share: number | null, count: number): {full: number; part: number} {
  if (share === null || !(count > 0)) return {full: 0, part: 0};
  const lit = clamp01(share) * count, full = Math.floor(lit + 1e-9);
  return {full: Math.min(count, full), part: full >= count ? 0 : r2(lit - full)};
}
/** A polyline through values scaled into a w × h box (top = max). Null values break the line; one value is a dot's place. */
export function sparkPoints(values: readonly (number | null)[], w: number, h: number, pad = 2, domain?: {min: number; max: number}): {x: number; y: number; v: number}[] {
  const known = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (!known.length) return [];
  const min = domain?.min ?? Math.min(...known), max = domain?.max ?? Math.max(...known), span = max - min || 1;
  const n = values.length, out: {x: number; y: number; v: number}[] = [];
  values.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) return;
    out.push({x: r2(pad + (n === 1 ? (w - 2 * pad) / 2 : i * (w - 2 * pad) / (n - 1))), y: r2(h - pad - (v - min) / span * (h - 2 * pad)), v});
  });
  return out;
}
export const linePath = (pts: readonly {x: number; y: number}[]): string => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join('');
/** The angle of a wall-clock time on a 24-hour dial ("06:00" → 90°); null when it is not a time. */
export function clockAngle(clock: string | null): number | null {
  const m = clock ? /^([01]\d|2[0-3]):([0-5]\d)$/.exec(clock) : null;
  return m ? r2((Number(m[1]) * 60 + Number(m[2])) / 1440 * 360) : null;
}
/** A heart (unit box 0–24) as a path, for the health HUD's target hearts. */
export const HEART_PATH = 'M12 21.2 3.9 13.4A5.2 5.2 0 0 1 11.3 6l.7.7.7-.7a5.2 5.2 0 0 1 7.4 7.4Z';

/* ---- Session AL Part 11, second pass (lane L8): the reference image's instruments ---- */

/**
 * A smooth line through points sorted by x (the flowing wave), as monotone cubic segments (Fritsch–Carlson): it never
 * rises above or dips below its neighbouring points, so the curve shows no value the records do not hold. Fewer than three
 * points: straight segments.
 */
export function smoothPath(pts: readonly {x: number; y: number}[]): string {
  const n = pts.length;
  if (n < 3) return linePath(pts);
  const dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx.push(pts[i + 1]!.x - pts[i]!.x); m.push(dx[i]! ? (pts[i + 1]!.y - pts[i]!.y) / dx[i]! : 0); }
  const t = pts.map((_, i) => i === 0 ? m[0]! : i === n - 1 ? m[n - 2]! : m[i - 1]! * m[i]! <= 0 ? 0 : (m[i - 1]! + m[i]!) / 2);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i]! / m[i]!, b = t[i + 1]! / m[i]!, s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]!; t[i + 1] = k * b * m[i]!; }
  }
  let d = `M${r2(pts[0]!.x)} ${r2(pts[0]!.y)}`;
  for (let i = 0; i < n - 1; i++) {
    const p = pts[i]!, q = pts[i + 1]!, h = dx[i]! / 3;
    d += `C${r2(p.x + h)} ${r2(p.y + t[i]! * h)} ${r2(q.x - h)} ${r2(q.y - t[i + 1]! * h)} ${r2(q.x)} ${r2(q.y)}`;
  }
  return d;
}

/**
 * Points placed by time (ISO instants or YYYY-MM-DD days) across a w × h box, top = the highest value: a recorded history
 * whose gaps stay gaps in width (an index axis would squeeze a quiet month into one step). Unparseable times are left out.
 */
export function timePoints(values: readonly {at: string; value: number}[], w: number, h: number, pad = 3): {x: number; y: number; v: number; at: string}[] {
  const known = values.map(p => ({...p, t: Date.parse(p.at)})).filter(p => Number.isFinite(p.t) && Number.isFinite(p.value)).sort((a, b) => a.t - b.t);
  if (!known.length) return [];
  const t0 = known[0]!.t, t1 = known.at(-1)!.t, span = t1 - t0;
  const min = Math.min(...known.map(p => p.value)), max = Math.max(...known.map(p => p.value)), range = max - min || 1;
  return known.map(p => ({x: r2(pad + (span ? (p.t - t0) / span : 0.5) * (w - 2 * pad)), y: r2(h - pad - (max === min ? 0.5 : (p.value - min) / range) * (h - 2 * pad)), v: p.value, at: p.at}));
}

/**
 * A histogram's bars in a w × h box: one slot per value, the bar's top at the value (null: no bar, the slot stays empty),
 * against `max` (the highest of the values and any reference line, such as a target, so the line fits too).
 */
export type Bar = {x: number; y: number; width: number; height: number; v: number};
export function histogramBars(values: readonly (number | null)[], w: number, h: number, {max, gap = 0.34, headroom = 1}: {max?: number; gap?: number; headroom?: number} = {}): (Bar | null)[] {
  const n = values.length;
  if (!n) return [];
  const top = histogramTop(values, max, headroom);
  const slot = w / n, width = slot * (1 - Math.max(0, Math.min(0.9, gap)));
  return values.map((v, i) => {
    if (v === null || !Number.isFinite(v)) return null;
    const height = Math.max(0, Math.min(1, v / top)) * h;
    return {x: r2(i * slot + (slot - width) / 2), y: r2(h - height), width: r2(width), height: r2(height), v};
  });
}
/** A histogram's top: the highest of the values and `max`, with `headroom` above it (review m8: 1.12, so neither the
 *  tallest bar nor the target line touches the frame). */
export function histogramTop(values: readonly (number | null)[], max?: number, headroom = 1): number {
  return (Math.max(max ?? 0, ...values.filter((v): v is number => v !== null && Number.isFinite(v)), 0) || 1) * Math.max(1, headroom);
}
/** Where a value sits on a histogram's height (for its reference line), with the same top as histogramBars. */
export function histogramY(value: number, values: readonly (number | null)[], h: number, max?: number, headroom = 1): number {
  const top = histogramTop(values, max, headroom);
  return r2(h - Math.max(0, Math.min(1, value / top)) * h);
}

/**
 * A small flow (the purpose flow): one source bar on the left, the parts (shares 0–1 of the source, in order) stacked on
 * the right with a gap between them, and a ribbon from each part's slice of the source to its own bar. Parts that add up
 * past 1 are scaled down to fit; a zero part draws nothing.
 */
export type Ribbon = {from: [number, number]; to: [number, number]; path: string};
export function flowRibbons(shares: readonly number[], w: number, h: number, {bar = 6, gap = 4}: {bar?: number; gap?: number} = {}): Ribbon[] {
  const parts = shares.map(s => Number.isFinite(s) ? Math.max(0, s) : 0), sum = parts.reduce((a, b) => a + b, 0);
  if (!(sum > 0)) return [];
  const scale = sum > 1 ? 1 / sum : 1, shown = parts.filter(p => p > 0).length;
  const room = Math.max(0, h - gap * Math.max(0, shown - 1)), x0 = bar, x1 = w - bar, mid = (x0 + x1) / 2;
  const out: Ribbon[] = [];
  let left = 0, right = 0;
  for (const p of parts) {
    if (!(p > 0)) continue;
    const a = p * scale * h, b = p * scale * room;
    const l0 = left, l1 = left + a, q0 = right, q1 = right + b;
    out.push({from: [r2(l0), r2(l1)], to: [r2(q0), r2(q1)], path: `M${r2(x0)} ${r2(l0)}C${r2(mid)} ${r2(l0)} ${r2(mid)} ${r2(q0)} ${r2(x1)} ${r2(q0)}L${r2(x1)} ${r2(q1)}C${r2(mid)} ${r2(q1)} ${r2(mid)} ${r2(l1)} ${r2(x0)} ${r2(l1)}Z`});
    left = l1; right = q1 + gap;
  }
  return out;
}
