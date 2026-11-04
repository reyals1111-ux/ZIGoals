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
