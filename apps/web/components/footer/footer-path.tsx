'use client';
import {useEffect, useId, useLayoutEffect, useRef, useState, type RefObject} from 'react';
import {entranceAllowed} from '../use-entrance';

/**
 * Session AB-Design Phase 2 → Session AD (ADR-026 Part 1): the footer's constellation line and its opening moment, loaded
 * with the footer. The line is measured from the page itself — a short lead-in, through the three step nodes (Goals →
 * Habits → Health), a short lead-out — so it fits every width; on phones, where the steps stack, it runs down through them.
 *
 * The first time the banner is seen in a visit (≥ 35 % in view; the session flag below), one sequence of about 3.7 s:
 * the line is revealed from its start, and each word of the slogan appears together with its step's bubble as the line
 * reaches it (Goals with 01, Habits with 02, Health with 03); then "= Wealth" arrives, the wordmark shines once in the
 * brand colours, and the bright flare on the planet's right rim rises along the rim and blooms, as the Today header's
 * star does (hero-star.tsx: the same rise, bloom and veil), but in pink and magenta. Only transform and opacity move: the
 * reveal is a clipped box sliding over a counter-sliding line, timed by CSS; nothing runs per frame in script. Reduced
 * motion, Motion Off, already seen in this visit, or no script: the final, resting state, still.
 */
type Pt = {x: number; y: number};
type Seg = [Pt, Pt, Pt, Pt];
const SEEN = 'zigoals-footer-intro-seen';
/** The sequence's clock, in seconds: the line starts at T0 and takes REVEAL to cross; "= Wealth" follows the last word. */
export const FOOTER_TIMING = {T0: .15, REVEAL: 1.5, WEALTH_AFTER: .45, SETTLE: 1.9} as const;

const f = (n: number) => n.toFixed(1);
/** The footer's moment state, on its root ("ready" before it plays, "play" while it runs, "done" after). */
const intro = (el: HTMLElement, value?: 'ready' | 'play' | 'done') => { if (value) el.dataset.intro = value; else delete el.dataset.intro; };

/** The line: a lead-in, node to node, a lead-out; across on wider screens, down through the stacked steps on phones. */
function segments(nodes: Pt[], stacked: boolean, w: number): Seg[] {
  const segs: Seg[] = [];
  if (stacked) {
    const first = nodes[0]!, last = nodes[nodes.length - 1]!, lead = {x: first.x, y: first.y - 56}, tail = {x: last.x, y: last.y + 56};
    segs.push([lead, {x: lead.x + 10, y: lead.y + 20}, {x: first.x - 10, y: first.y - 20}, first]);
    for (let i = 0; i < nodes.length - 1; i++) { const a = nodes[i]!, b = nodes[i + 1]!, dy = b.y - a.y; segs.push([a, {x: a.x + 22, y: a.y + dy * .4}, {x: b.x - 22, y: b.y - dy * .4}, b]); }
    segs.push([last, {x: last.x + 10, y: last.y + 20}, {x: tail.x - 10, y: tail.y - 20}, tail]);
    return segs;
  }
  const first = nodes[0]!, last = nodes[nodes.length - 1]!, reach = Math.min(150, Math.max(40, first.x - 8)), lead = {x: first.x - reach, y: first.y + 14}, tail = {x: Math.min(w - 8, last.x + reach), y: last.y + 14};
  segs.push([lead, {x: lead.x + reach * .47, y: lead.y + 4}, {x: first.x - reach * .47, y: first.y}, first]);
  for (let i = 0; i < nodes.length - 1; i++) { const a = nodes[i]!, b = nodes[i + 1]!, dx = b.x - a.x; segs.push([a, {x: a.x + dx * .38, y: a.y - 30}, {x: b.x - dx * .38, y: b.y + 30}, b]); }
  segs.push([last, {x: last.x + reach * .47, y: last.y}, {x: tail.x - reach * .47, y: tail.y + 4}, tail]);
  return segs;
}
const at = (s: Seg, t: number): Pt => {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return {x: a * s[0].x + b * s[1].x + c * s[2].x + d * s[3].x, y: a * s[0].y + b * s[1].y + c * s[2].y + d * s[3].y};
};

/**
 * The flare on the planet's right rim, in the footer artwork's own pixels (public/art/v21/destination.webp, 1000 × 689),
 * measured from the file: the flare's bright centre and the rim circle [cx, cy, r] fitted to the planet's lit edge.
 */
export const FOOTER_ART = {w: 1000, h: 689, star: [862, 155] as const, rim: [485, 738, 700] as const};
/** Maps artwork pixels into the art layer's box through its computed background size and position (cover, `100% auto`, `auto Npx`). */
export function footerArtFrame(art: HTMLElement, within: HTMLElement) {
  const style = getComputedStyle(art), box = art.getBoundingClientRect(), base = within.getBoundingClientRect();
  const [sw, sh] = style.backgroundSize.split(' ');
  // A position is a share of the free space ("50%") or an offset ("0px"); both map to the image's top-left corner.
  const offset = (v: string, free: number) => { const t = v.trim(); return t.endsWith('%') ? free * parseFloat(t) / 100 : t.endsWith('px') ? parseFloat(t) : Number.NaN; };
  let scale: number;
  if (sw === 'cover') scale = Math.max(box.width / FOOTER_ART.w, box.height / FOOTER_ART.h);
  else if (sw?.endsWith('%')) scale = box.width * parseFloat(sw) / 100 / FOOTER_ART.w;
  else if (sw === 'auto' && sh?.endsWith('px')) scale = parseFloat(sh) / FOOTER_ART.h;
  else return null;
  const ox = offset(style.backgroundPositionX, box.width - FOOTER_ART.w * scale), oy = offset(style.backgroundPositionY, box.height - FOOTER_ART.h * scale);
  if (![scale, ox, oy].every(Number.isFinite)) return null;
  const x0 = box.left - base.left + ox, y0 = box.top - base.top + oy;
  return {scale, map: (x: number, y: number) => [x0 + x * scale, y0 + y * scale] as const};
}

/** The flare's rise and bloom: the Today header star's motion exactly (hero-star.tsx), in pink and magenta. */
function playFlare(layer: HTMLElement, frame: NonNullable<ReturnType<typeof footerArtFrame>>, done: () => void) {
  const core = layer.querySelector<HTMLElement>('.site-footer-star-core'), veil = layer.querySelector<HTMLElement>('.site-footer-star-veil');
  if (!core || !veil || typeof core.animate !== 'function') { done(); return () => {}; }
  const {scale, map} = frame, [cx, cy] = map(FOOTER_ART.rim[0], FOOTER_ART.rim[1]), radius = FOOTER_ART.rim[2] * scale, [sx, sy] = map(FOOTER_ART.star[0], FOOTER_ART.star[1]);
  const end = Math.atan2(sy - cy, sx - cx), start = end + 14 * Math.PI / 180, size = 150 * scale, shade = 420 * scale;
  core.style.width = core.style.height = `${size}px`;
  Object.assign(veil.style, {width: `${shade}px`, height: `${shade}px`, left: `${sx - shade / 2}px`, top: `${sy - shade / 2}px`});
  const place = (angle: number, grow: number) => `translate(${cx + radius * Math.cos(angle) - size / 2}px,${cy + radius * Math.sin(angle) - size / 2}px) scale(${grow})`;
  const steps = 24, rise = core.animate(Array.from({length: steps + 1}, (_, i) => ({transform: place(start + (end - start) * i / steps, .55 + .45 * i / steps), opacity: Math.min(1, i / 4)})), {duration: 1150, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards'});
  const bloom = core.animate([{transform: place(end, 1), opacity: 1}, {transform: place(end, 2.3), opacity: 0}], {duration: 650, delay: 1080, easing: 'ease-out', fill: 'forwards'});
  const lift = veil.animate([{opacity: 0}, {opacity: 1, offset: .08}, {opacity: 1, offset: .55}, {opacity: 0}], {duration: 1800, easing: 'ease-in-out', fill: 'forwards'});
  let active = true;
  Promise.all([rise.finished, bloom.finished, lift.finished]).then(() => { if (active) done(); }, () => {});
  return () => { active = false; for (const a of [rise, bloom, lift]) a.cancel(); };
}

export default function FooterPath({stage, footer}: {stage: RefObject<HTMLDivElement | null>; footer: RefObject<HTMLElement | null>}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), starLayer = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<{w: number; h: number; d: string; stars: Pt[]; stacked: boolean} | null>(null), [flare, setFlare] = useState(false);
  // Measure from the page: the nodes' centres relative to the stage; time each word and bubble to the moment the line reaches it.
  useLayoutEffect(() => {
    const el = stage.current, root = footer.current; if (!el || !root) return;
    const measure = () => {
      const base = el.getBoundingClientRect();
      const nodes = [...el.querySelectorAll<HTMLElement>('[data-footer-node]')].map(n => { const r = n.getBoundingClientRect(); return {x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top}; });
      if (nodes.length < 3) return;
      const stacked = Math.abs(nodes[0]!.x - nodes[2]!.x) < 60, segs = segments(nodes, stacked, base.width);
      const {T0, REVEAL, WEALTH_AFTER} = FOOTER_TIMING, extent = stacked ? base.height : base.width;
      const arrive = nodes.map(n => T0 + REVEAL * Math.min(1, Math.max(0, (stacked ? n.y : n.x) / extent)));
      arrive.forEach((t, i) => root.style.setProperty(`--sf-at${i}`, `${t.toFixed(2)}s`));
      root.style.setProperty('--sf-t0', `${T0}s`);
      root.style.setProperty('--sf-reveal', `${REVEAL}s`);
      root.style.setProperty('--sf-wealth', `${(arrive[2]! + WEALTH_AFTER).toFixed(2)}s`);
      const d = `M${f(segs[0]![0].x)} ${f(segs[0]![0].y)}` + segs.map(s => ` C${f(s[1].x)} ${f(s[1].y)} ${f(s[2].x)} ${f(s[2].y)} ${f(s[3].x)} ${f(s[3].y)}`).join('');
      // Constellation stars: small points beside the line, between the nodes.
      const stars = segs.flatMap((s, i) => i === 0 || i === segs.length - 1 ? [] : [.33, .66].map(t => { const p = at(s, t); return {x: p.x + (i % 2 ? 7 : -7), y: p.y + (t < .5 ? -8 : 9)}; }));
      // Same geometry → same state object (no re-render, so nothing resizes inside a ResizeObserver delivery).
      setGeo(g => g && g.w === base.width && g.h === base.height && g.d === d ? g : {w: base.width, h: base.height, d, stars, stacked});
    };
    measure();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure); ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, [stage, footer]);
  // The opening moment, once per visit, when the banner is well in view. It depends only on the line having been measured
  // once (a later re-measure must not cancel a moment that is playing).
  const measured = geo !== null;
  useEffect(() => {
    const root = footer.current, el = stage.current; if (!root || !el || !measured) return;
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
      const wealth = parseFloat(root.style.getPropertyValue('--sf-wealth')) || 1.9;
      timers.push(window.setTimeout(() => setFlare(true), wealth * 1000));
      timers.push(window.setTimeout(() => intro(root, 'done'), (wealth + FOOTER_TIMING.SETTLE) * 1000));
    }, {threshold: .35});
    io.observe(el);
    return () => { io.disconnect(); timers.forEach(t => window.clearTimeout(t)); if (root.dataset.intro === 'play') intro(root, 'done'); else intro(root); };
  }, [measured, footer, stage]);
  // The flare plays once, then its layer leaves the page (the settled banner is the untouched artwork).
  useLayoutEffect(() => {
    if (!flare) return;
    const layer = starLayer.current, root = footer.current, art = root?.querySelector<HTMLElement>('.site-footer-art'), box = stage.current;
    // The layer is placed in the stage (its positioned ancestor), so the artwork is mapped into the stage's coordinates.
    const frame = layer && box && art ? footerArtFrame(art, box) : null;
    if (!layer || !frame) { setFlare(false); return; }
    return playFlare(layer, frame, () => setFlare(false));
  }, [flare, footer, stage]);
  if (!geo) return null;
  const grad = `sf-g-${id}`;
  return <>
    {flare && <div ref={starLayer} className="site-footer-star-layer" aria-hidden="true"><span className="site-footer-star-veil"/><span className="site-footer-star-core"/></div>}
    <div className="site-footer-reveal" data-stacked={geo.stacked || undefined} aria-hidden="true"><div className="site-footer-reveal-in">
      <svg className="site-footer-line" width={geo.w} height={geo.h} viewBox={`0 0 ${f(geo.w)} ${f(geo.h)}`} focusable="false">
        <defs>
          <linearGradient id={grad} gradientUnits="userSpaceOnUse" x1="0" x2={f(geo.w)} y1="0" y2="0"><stop offset="0" stopColor="#9273ff"/><stop offset=".45" stopColor="#23eaff"/><stop offset=".8" stopColor="#ff74be"/><stop offset="1" stopColor="#f06dff"/></linearGradient>
          <filter id={`sf-glow-${id}`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
        </defs>
        <path className="site-footer-path site-footer-path-glow" d={geo.d} fill="none" stroke={`url(#${grad})`} strokeWidth="7" strokeLinecap="round" filter={`url(#sf-glow-${id})`}/>
        <path className="site-footer-path" d={geo.d} fill="none" stroke={`url(#${grad})`} strokeWidth="2" strokeLinecap="round"/>
        {geo.stars.map((s, i) => <circle key={i} className="site-footer-star" cx={f(s.x)} cy={f(s.y)} r={i % 3 ? 1.3 : 1.9}/>)}
      </svg>
    </div></div>
  </>;
}
