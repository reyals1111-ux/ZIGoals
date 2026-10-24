/**
 * Session AG Polish 3 (ADR-032 L21; owner amendment 9): the owner's rules for the phone's river, read from a layout's
 * path data and boxes alone (independent of lib/path/phone-wave.ts), so a test can show a wrong layout — amendment 8's
 * stacked one, reference 06's left stack, a strict zig-zag — failing as clearly as a good one passing. Each check
 * returns what breaks it.
 */
type Pt = {x: number; y: number};
type Box = {left: number; top: number; right: number; bottom: number};
type C = [Pt, Pt, Pt, Pt];
export type WaveDrawn = {w: number; vw: number;
  /** each orbit's whole river (path data) */ rivers: string[];
  /** the path's nodes in order, each with its orbit's index */ nodes: {id: string; x: number; y: number; r: number; orbit: number}[];
  planets: {x: number; y: number; r: number}[]; tabs: (Box & {id: string})[]; banners: Box[]; zigi?: Box | null};
export function cubics(d: string): C[] {
  const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number), out: C[] = [];
  let p = {x: n[0]!, y: n[1]!};
  for (let i = 2; i + 5 < n.length; i += 6) { const c: C = [p, {x: n[i]!, y: n[i + 1]!}, {x: n[i + 2]!, y: n[i + 3]!}, {x: n[i + 4]!, y: n[i + 5]!}]; out.push(c); p = c[3]; }
  return out;
}
const at = (c: C, t: number) => { const u = 1 - t; return {x: u ** 3 * c[0].x + 3 * u * u * t * c[1].x + 3 * u * t * t * c[2].x + t ** 3 * c[3].x, y: u ** 3 * c[0].y + 3 * u * u * t * c[1].y + 3 * u * t * t * c[2].y + t ** 3 * c[3].y}; };
const vel = (c: C, t: number) => { const u = 1 - t; return {x: 3 * u * u * (c[1].x - c[0].x) + 6 * u * t * (c[2].x - c[1].x) + 3 * t * t * (c[3].x - c[2].x), y: 3 * u * u * (c[1].y - c[0].y) + 6 * u * t * (c[2].y - c[1].y) + 3 * t * t * (c[3].y - c[2].y)}; };
const acc = (c: C, t: number) => { const u = 1 - t; return {x: 6 * u * (c[2].x - 2 * c[1].x + c[0].x) + 6 * t * (c[3].x - 2 * c[2].x + c[1].x), y: 6 * u * (c[2].y - 2 * c[1].y + c[0].y) + 6 * t * (c[3].y - 2 * c[2].y + c[1].y)}; };
export function points(d: string, per = 48): Pt[] { const out: Pt[] = []; cubics(d).forEach((c, i) => { for (let j = i ? 1 : 0; j <= per; j++) out.push(at(c, j / per)); }); return out; }
const flat = (v: Pt) => Math.abs(v.y) <= .05 * Math.abs(v.x) && Math.abs(v.x) > 1e-6;

/** The rules, per path. */
export function waveRules(d: WaveDrawn): string[] {
  const out: string[] = [], k = d.vw / 390, minR = 40 * k - .5;
  d.rivers.forEach((river, o) => {
    const cs = cubics(river);
    if (!cs.length) { out.push(`orbit ${o}: no river`); return; }
    // (Apexes: where the river runs flat — at each join, both sides level.)
    const apexes = cs.slice(1).map((c, i) => ({p: c[0], flat: flat(vel(cs[i]!, 1)) && flat(vel(c, 0))})).filter(a => a.flat).map(a => a.p);
    if (apexes.length < 1) out.push(`orbit ${o}: no flat apex`);
    apexes.forEach((a, i) => {
      const side = a.x < d.w / 2 ? 'left' : 'right', f = a.x / d.w;
      if (side === 'left' ? f < .08 - .005 || f > .22 + .005 : f < .78 - .005 || f > .92 + .005) out.push(`orbit ${o}: apex ${i} at ${(f * 100).toFixed(1)} %, outside its band`);
      if (i === 0 && side !== 'left') out.push(`orbit ${o}: the first swing goes right`);
      if (i && (apexes[i - 1]!.x < d.w / 2) === (a.x < d.w / 2)) out.push(`orbit ${o}: apexes ${i - 1} and ${i} on one side`);
    });
    const pts = points(river), xs = pts.map(p => p.x);
    if (Math.max(...xs) - Math.min(...xs) < .7 * d.w) out.push(`orbit ${o}: the river spans ${Math.round((Math.max(...xs) - Math.min(...xs)) / d.w * 100)} % of the width`);
    if (xs.some(x => x < 0 || x > d.w)) out.push(`orbit ${o}: the river leaves the column`);
    for (let i = 1; i < pts.length; i++) if (pts[i]!.y < pts[i - 1]!.y - .5) { out.push(`orbit ${o}: climbs at y ${Math.round(pts[i]!.y)}`); break; }
    let least = Infinity;
    for (const c of cs) for (let i = 0; i <= 48; i++) { const v = vel(c, i / 48), a = acc(c, i / 48), s = Math.hypot(v.x, v.y), kk = s > 1e-9 ? Math.abs(v.x * a.y - v.y * a.x) / s ** 3 : 0; if (kk > 1e-12) least = Math.min(least, 1 / kk); }
    if (least < minR) out.push(`orbit ${o}: a turn of ${least.toFixed(1)} px, under ${minR.toFixed(1)}`);
    // (Planets: out of the bottom and into the top, straight down.)
    const first = cs[0]!, last = cs.at(-1)!, pl = d.planets.find(p => Math.hypot(p.x - first[0].x, p.y + p.r - first[0].y) < 1.5);
    if (pl && Math.abs(first[1].x - first[0].x) > .5) out.push(`orbit ${o}: not straight down out of its planet`);
    if (!pl) out.push(`orbit ${o}: does not start at a planet's bottom`);
    const into = d.planets.find(p => Math.hypot(p.x - last[3].x, p.y - p.r - last[3].y) < 1.5);
    if (into && Math.abs(last[2].x - last[3].x) > .5) out.push(`orbit ${o}: not straight down into the next planet`);
  });
  // The nodes: on the river, far enough apart down the page, never near another ring; spaces that vary.
  const all = d.rivers.flatMap(r => points(r, 96));
  // (The distance from a point to the river: to the nearest piece of its sampled polyline.)
  const toRiver = (q: Pt) => { let m = Infinity; for (const r of d.rivers) { const p = points(r, 96); for (let i = 1; i < p.length; i++) { const a = p[i - 1]!, b = p[i]!, vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy, t = l ? Math.max(0, Math.min(1, ((q.x - a.x) * vx + (q.y - a.y) * vy) / l)) : 0; m = Math.min(m, Math.hypot(a.x + vx * t - q.x, a.y + vy * t - q.y)); } } return m; };
  d.nodes.forEach((n, i) => {
    if (toRiver(n) > 1) out.push(`${n.id}: not on the river`);
    const prev = d.nodes[i - 1];
    if (prev && n.y - prev.y < 2 * n.r + 46 - .5) out.push(`${prev.id} → ${n.id}: ${Math.round(n.y - prev.y)} px apart, under ${2 * n.r + 46}`);
    for (const m of d.nodes.slice(i + 1)) if (Math.hypot(m.x - n.x, m.y - n.y) < n.r + m.r + 12 - .5) out.push(`${n.id} within 12 px of ${m.id}`);
  });
  const orbits = [...new Set(d.nodes.map(n => n.orbit))];
  for (const o of orbits) {
    const ys = d.nodes.filter(n => n.orbit === o).map(n => n.y);
    if (ys.length >= 4) { const gaps = ys.slice(1).map((y, i) => y - ys[i]!); if (Math.max(...gaps) - Math.min(...gaps) < 60) out.push(`orbit ${o}: spaces ${gaps.map(Math.round).join(', ')} spread under 60 px`); }
  }
  // The tabs: on screen, over no line, ring, banner or other tab; ZIGi over none of them either.
  const over = (b: Box, p: Pt) => p.x > b.left + 1 && p.x < b.right - 1 && p.y > b.top + 1 && p.y < b.bottom - 1;
  const hitsRing = (b: Box, c: {x: number; y: number; r: number}) => Math.max(b.left - c.x, 0, c.x - b.right) ** 2 + Math.max(b.top - c.y, 0, c.y - b.bottom) ** 2 < (c.r - 1) ** 2;
  const crosses = (a: Box, b: Box) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
  d.tabs.forEach((t, i) => {
    if (t.left < 0 || t.right > d.w + .5) out.push(`${t.id}'s tab leaves the column`);
    if (all.some(p => over(t, p))) out.push(`${t.id}'s tab over the line`);
    for (const n of d.nodes) if (n.id !== t.id && hitsRing(t, n)) out.push(`${t.id}'s tab over ${n.id}'s ring`);
    for (const p of d.planets) if (hitsRing(t, p)) out.push(`${t.id}'s tab over a planet`);
    for (const b of d.banners) if (crosses(t, b)) out.push(`${t.id}'s tab over a banner`);
    for (const u of d.tabs.slice(i + 1)) if (crosses(t, u)) out.push(`${t.id}'s tab over ${u.id}'s`);
  });
  if (d.zigi) {
    const z = d.zigi;
    if (all.some(p => over(z, p))) out.push('ZIGi over the line');
    for (const n of d.nodes) if (hitsRing(z, n)) out.push(`ZIGi over ${n.id}`);
    for (const t of d.tabs) if (crosses(z, t)) out.push(`ZIGi over ${t.id}'s tab`);
  }
  return out;
}
/** Over many paths: no 20 %-wide band of the width holds more than 45 % of the nodes. */
export function waveSpread(paths: readonly WaveDrawn[]): string[] {
  const bands = [0, 0, 0, 0, 0]; let n = 0;
  for (const d of paths) for (const p of d.nodes) { bands[Math.min(4, Math.max(0, Math.floor(p.x / d.w * 5)))]!++; n++; }
  return bands.flatMap((b, i) => b > .45 * n ? [`${b} of ${n} nodes in the band ${i * 20}–${i * 20 + 20} %`] : []);
}
