'use client';
import {useEffect, useId, useLayoutEffect, useRef, useState, type RefObject} from 'react';
import {entranceAllowed} from '../use-entrance';

/**
 * Session AB-Design Phase 2 (owner correction to request 2, ADR-024 P6): the footer's constellation path and its opening
 * moment, loaded with the footer the first time it comes near the screen. The path is measured from the page itself —
 * through the three step nodes (Goals → Habits → Health) and, on wider screens, up into the slogan's "Wealth" — so it
 * fits every width. The first time the banner is seen in a session (≥ 35 % in view): the path draws itself, small lights
 * travel along it, each node ignites as the light reaches it, "Wealth" lights up, and a sweep of light runs along the
 * planet's rim; then everything rests. Reduced motion, Motion Off, or already seen in this session: the resting state at
 * once. Nothing is stored but a session flag; only transform, opacity, filter and stroke offsets move.
 */
type Pt = {x: number; y: number};
type Seg = [Pt, Pt, Pt, Pt];
const SEEN = 'zigoals-footer-intro-seen';
const DRAW = 2.2, SWEEP = 1.1;

const at = (s: Seg, t: number): Pt => {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return {x: a * s[0].x + b * s[1].x + c * s[2].x + d * s[3].x, y: a * s[0].y + b * s[1].y + c * s[2].y + d * s[3].y};
};
const length = (s: Seg) => { let total = 0, prev = s[0]; for (let i = 1; i <= 40; i++) { const p = at(s, i / 40); total += Math.hypot(p.x - prev.x, p.y - prev.y); prev = p; } return total; };
const f = (n: number) => n.toFixed(1);
/** The footer's moment state, on its root ("ready" before it plays, "play" while it runs, "done" after). */
const intro = (el: HTMLElement, value?: 'ready' | 'play' | 'done') => { if (value) el.dataset.intro = value; else delete el.dataset.intro; };

/** The path's segments: a short lead-in, node to node, then (wide) up into "Wealth" or (stacked) a short tail. */
function segments(nodes: Pt[], wealth: Pt, stacked: boolean): {segs: Seg[]; nodeAt: number[]} {
  const segs: Seg[] = [];
  if (stacked) {
    const lead = {x: nodes[0]!.x, y: nodes[0]!.y - 56};
    segs.push([lead, {x: lead.x + 10, y: lead.y + 20}, {x: nodes[0]!.x - 10, y: nodes[0]!.y - 20}, nodes[0]!]);
    for (let i = 0; i < nodes.length - 1; i++) { const a = nodes[i]!, b = nodes[i + 1]!, dy = b.y - a.y; segs.push([a, {x: a.x + 22, y: a.y + dy * .4}, {x: b.x - 22, y: b.y - dy * .4}, b]); }
    const last = nodes[nodes.length - 1]!; segs.push([last, {x: last.x + 12, y: last.y + 22}, {x: last.x - 4, y: last.y + 40}, {x: last.x, y: last.y + 58}]);
    return {segs, nodeAt: [1, 2, 3]};
  }
  const first = nodes[0]!, lead = {x: first.x - 150, y: first.y + 14};
  segs.push([lead, {x: lead.x + 70, y: lead.y + 4}, {x: first.x - 70, y: first.y}, first]);
  for (let i = 0; i < nodes.length - 1; i++) { const a = nodes[i]!, b = nodes[i + 1]!, dx = b.x - a.x; segs.push([a, {x: a.x + dx * .38, y: a.y - 30}, {x: b.x - dx * .38, y: b.y + 30}, b]); }
  const last = nodes[nodes.length - 1]!, rise = last.y - wealth.y;
  // From Health the light rises into the slogan: straight up out of the node, then bending over to the word "Wealth".
  segs.push([last, {x: last.x, y: last.y - rise * .62}, {x: wealth.x + Math.max(60, (last.x - wealth.x) * .5), y: wealth.y + rise * .12}, wealth]);
  return {segs, nodeAt: [1, 2, 3]};
}

export default function FooterPath({stage, footer}: {stage: RefObject<HTMLDivElement | null>; footer: RefObject<HTMLElement | null>}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), motions = useRef<SVGAnimationElement[]>([]);
  const [geo, setGeo] = useState<{w: number; h: number; d: string; stars: Pt[]} | null>(null);
  // Measure from the page: the nodes' centres and the bottom of the word "Wealth", relative to the stage.
  useLayoutEffect(() => {
    const el = stage.current, root = footer.current; if (!el || !root) return;
    const measure = () => {
      const base = el.getBoundingClientRect();
      const nodes = [...el.querySelectorAll<HTMLElement>('[data-footer-node]')].map(n => { const r = n.getBoundingClientRect(); return {x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top}; });
      const word = el.querySelector<HTMLElement>('[data-footer-wealth]'); if (nodes.length < 3 || !word) return;
      const wr = word.getBoundingClientRect(), wealth = {x: wr.left + wr.width * .5 - base.left, y: wr.bottom - base.top + 4};
      const stacked = Math.abs(nodes[0]!.x - nodes[2]!.x) < 60;
      const {segs, nodeAt} = segments(nodes, wealth, stacked);
      const lengths = segs.map(length), total = lengths.reduce((a, b) => a + b, 0);
      let run = 0; const ends = lengths.map(l => (run += l));
      // Each node ignites when the light reaches it; "Wealth" when it arrives (wide) or when the path ends (stacked).
      nodeAt.forEach((segIndex, i) => root.style.setProperty(`--sf-at${i}`, `${(DRAW * ends[segIndex - 1]! / total).toFixed(2)}s`));
      root.style.setProperty('--sf-wealth', `${DRAW.toFixed(2)}s`);
      root.style.setProperty('--sf-sweep', `${(DRAW + .15).toFixed(2)}s`);
      root.style.setProperty('--sf-draw', `${DRAW}s`);
      const d = `M${f(segs[0]![0].x)} ${f(segs[0]![0].y)}` + segs.map(s => ` C${f(s[1].x)} ${f(s[1].y)} ${f(s[2].x)} ${f(s[2].y)} ${f(s[3].x)} ${f(s[3].y)}`).join('');
      // Constellation stars: small points beside the path, between the nodes.
      const stars = segs.flatMap((s, i) => i === 0 ? [] : [.33, .66].map(t => { const p = at(s, t); return {x: p.x + (i % 2 ? 7 : -7), y: p.y + (t < .5 ? -8 : 9)}; }));
      // Same geometry → same state object (no re-render, so nothing resizes inside a ResizeObserver delivery).
      setGeo(g => g && g.w === base.width && g.h === base.height && g.d === d ? g : {w: base.width, h: base.height, d, stars});
    };
    measure();
    // Session AB-Design Phase 2 closing pass (WebKit smoke: "ResizeObserver loop completed with undelivered notifications"):
    // a resize is measured on the next frame, never inside the observer's own delivery.
    let frame = 0; const later = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(later); ro?.observe(el);
    window.addEventListener('resize', later);
    return () => { cancelAnimationFrame(frame); ro?.disconnect(); window.removeEventListener('resize', later); };
  }, [stage, footer]);
  // The opening moment, once per session, when the banner is well in view.
  useEffect(() => {
    const root = footer.current, el = stage.current; if (!root || !el || !geo) return;
    if (root.dataset.intro) return; // already decided for this page view
    let seen = false; try { seen = sessionStorage.getItem(SEEN) === '1'; } catch { seen = true; }
    if (seen || !entranceAllowed() || typeof IntersectionObserver === 'undefined') { intro(root, 'done'); return; }
    intro(root, 'ready');
    const timers: number[] = [];
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      io.disconnect();
      try { sessionStorage.setItem(SEEN, '1'); } catch { /* the moment simply plays again next time */ }
      intro(root, 'play');
      motions.current.forEach((m, i) => timers.push(window.setTimeout(() => { try { m.beginElement(); } catch { /* no SMIL: the CSS draw still plays */ } }, i * 170)));
      timers.push(window.setTimeout(() => intro(root, 'done'), (DRAW + .15 + SWEEP) * 1000 + 200));
    }, {threshold: .35});
    io.observe(el);
    return () => { io.disconnect(); timers.forEach(t => window.clearTimeout(t)); if (root.dataset.intro !== 'play') intro(root); };
  }, [geo, footer, stage]);
  if (!geo) return null;
  const pathId = `sf-path-${id}`;
  return <svg className="site-footer-line" width={geo.w} height={geo.h} viewBox={`0 0 ${f(geo.w)} ${f(geo.h)}`} aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`sf-g-${id}`} gradientUnits="userSpaceOnUse" x1="0" x2={f(geo.w)} y1="0" y2="0"><stop offset="0" stopColor="#9273ff"/><stop offset=".45" stopColor="#23eaff"/><stop offset=".72" stopColor="#ff74be"/><stop offset="1" stopColor="#ffd27a"/></linearGradient>
      <filter id={`sf-glow-${id}`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
    </defs>
    <path className="site-footer-path site-footer-path-glow" d={geo.d} pathLength={1} fill="none" stroke={`url(#sf-g-${id})`} strokeWidth="7" strokeLinecap="round" filter={`url(#sf-glow-${id})`}/>
    <path id={pathId} className="site-footer-path" d={geo.d} pathLength={1} fill="none" stroke={`url(#sf-g-${id})`} strokeWidth="2" strokeLinecap="round"/>
    {geo.stars.map((s, i) => <circle key={i} className="site-footer-star" cx={f(s.x)} cy={f(s.y)} r={i % 3 ? 1.3 : 1.9} style={{['--i' as string]: i}}/>)}
    {[0, 1, 2].map(i => <circle key={i} className="site-footer-particle" r={i ? 2.2 : 3.2} style={{['--i' as string]: i}}>
      <animateMotion ref={el => { if (el) motions.current[i] = el as unknown as SVGAnimationElement; }} dur={`${DRAW}s`} begin="indefinite" fill="freeze" calcMode="paced"><mpath href={`#${pathId}`}/></animateMotion>
    </circle>)}
  </svg>;
}
