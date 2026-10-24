'use client';
import {useEffect, useId, useLayoutEffect, useRef, useState, type RefObject} from 'react';
import {entranceAllowed} from '../use-entrance';
import {RIBBON_WIDTH, phoneArc, ribbon, wideArc, type Paint} from '../../lib/footer-ribbon';

/**
 * Session AB-Design Phase 2 → Session AD (ADR-026 Part 1) → Session AE (Part 2, ADR-027): the footer's constellation line
 * and its finale, loaded with the footer. The line is measured from the page itself — a short lead-in, through the three
 * step nodes (Goals → Habits → Health); on phones, where the steps stack, it runs down through them. Session AF (L5a,
 * Part 10.8): from Health one organic ribbon (lib/footer-ribbon.ts) — tapered, magenta to pink to the gold of "= Wealth",
 * with a soft glow — runs on past Health, turns and sweeps back into "= Wealth"; on phones it runs beneath the steps, up
 * the right edge and into the word (it supersedes ADR-027 G22's "phones keep the banner without the arc"). Session AG
 * Polish 3 (ADR-032 L17, owner Part 6): one smooth river with no corners, on the line's own tangent out of Health, its
 * colour along the way — magenta and pink up to just before the crest, then warm gold into the word.
 *
 * The first time the banner is seen in a visit (≥ 35 % in view; the session flag below), one sequence of about 6–7 s:
 * the line draws Goals → Habits → Health, each word appearing with its bubble; the arc rises and returns to "= Wealth"; as
 * it touches, "= Wealth" emerges from a soft burst of nebula mist; the wordmark shines; the planet's rim stars twinkle;
 * the pink star on the rim rises, flares and pulses once (the Today header star's motion, in pink and magenta); the blue
 * mist and the horizon glow drift a little and settle. Only transform, opacity and filter move, timed by CSS; script
 * only measures (on resize, never per frame) and starts the flare. Reduced motion, Motion Off, already seen in this
 * visit, or no script: the final, resting state, still.
 */
type Pt = {x: number; y: number};
type Seg = [Pt, Pt, Pt, Pt];
const SEEN = 'zigoals-footer-intro-seen';
/** The sequence's clock, in seconds: the line starts at T0 and takes REVEAL to cross; the arc rises and returns after
 *  Health (wider screens) or "= Wealth" follows the last word (phones, where the arc is drawn in that same WEALTH_AFTER:
 *  PHONE_ARC); the flare starts FLARE_AFTER the touch. */
export const FOOTER_TIMING = {T0: .3, REVEAL: 2.2, ARC_RISE: .6, ARC_RETURN: .8, WEALTH_AFTER: .45, FLARE_AFTER: .9, SETTLE: 3.2, PHONE_ARC: [.04, .2, .21]} as const;
/** The rim stars of the footer artwork that twinkle in the finale, in its own pixels (the brightest points on its rim). */
export const FOOTER_RIM_STARS = [[19, 235], [116, 157], [272, 83], [386, 31], [558, 31]] as const;

const f = (n: number) => n.toFixed(1);
/** The footer's moment state, on its root ("ready" before it plays, "play" while it runs, "done" after). */
const intro = (el: HTMLElement, value?: 'ready' | 'play' | 'done') => { if (value) el.dataset.intro = value; else delete el.dataset.intro; };

/** The line: a lead-in, node to node, a lead-out; across on wider screens, down through the stacked steps on phones. */
function segments(nodes: Pt[], stacked: boolean): Seg[] {
  const segs: Seg[] = [];
  if (stacked) {
    const first = nodes[0]!, last = nodes[nodes.length - 1]!, lead = {x: first.x, y: first.y - 56}, tail = {x: last.x, y: last.y + 56};
    segs.push([lead, {x: lead.x + 10, y: lead.y + 20}, {x: first.x - 10, y: first.y - 20}, first]);
    for (let i = 0; i < nodes.length - 1; i++) { const a = nodes[i]!, b = nodes[i + 1]!, dy = b.y - a.y; segs.push([a, {x: a.x + 22, y: a.y + dy * .4}, {x: b.x - 22, y: b.y - dy * .4}, b]); }
    segs.push([last, {x: last.x + 10, y: last.y + 20}, {x: tail.x - 10, y: tail.y - 20}, tail]);
    return segs;
  }
  const first = nodes[0]!, reach = Math.min(150, Math.max(40, first.x - 8)), lead = {x: first.x - reach, y: first.y + 14};
  segs.push([lead, {x: lead.x + reach * .47, y: lead.y + 4}, {x: first.x - reach * .47, y: first.y}, first]);
  for (let i = 0; i < nodes.length - 1; i++) { const a = nodes[i]!, b = nodes[i + 1]!, dx = b.x - a.x; segs.push([a, {x: a.x + dx * .38, y: a.y - 30}, {x: b.x - dx * .38, y: b.y + 30}, b]); }
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

/** The flare's rise and bloom: the Today header star's motion (hero-star.tsx), in pink and magenta, a little slower; then
 *  one pulse at the flare (Session AE: the owner found the flare too short). */
function playFlare(layer: HTMLElement, frame: NonNullable<ReturnType<typeof footerArtFrame>>, done: () => void) {
  const core = layer.querySelector<HTMLElement>('.site-footer-star-core'), veil = layer.querySelector<HTMLElement>('.site-footer-star-veil'), pulse = layer.querySelector<HTMLElement>('.site-footer-star-pulse');
  if (!core || !veil || !pulse || typeof core.animate !== 'function') { done(); return () => {}; }
  const {scale, map} = frame, [cx, cy] = map(FOOTER_ART.rim[0], FOOTER_ART.rim[1]), radius = FOOTER_ART.rim[2] * scale, [sx, sy] = map(FOOTER_ART.star[0], FOOTER_ART.star[1]);
  const end = Math.atan2(sy - cy, sx - cx), start = end + 14 * Math.PI / 180, size = 150 * scale, shade = 420 * scale, glow = 260 * scale;
  core.style.width = core.style.height = `${size}px`;
  Object.assign(veil.style, {width: `${shade}px`, height: `${shade}px`, left: `${sx - shade / 2}px`, top: `${sy - shade / 2}px`});
  Object.assign(pulse.style, {width: `${glow}px`, height: `${glow}px`, left: `${sx - glow / 2}px`, top: `${sy - glow / 2}px`});
  const place = (angle: number, grow: number) => `translate(${cx + radius * Math.cos(angle) - size / 2}px,${cy + radius * Math.sin(angle) - size / 2}px) scale(${grow})`;
  const steps = 24, rise = core.animate(Array.from({length: steps + 1}, (_, i) => ({transform: place(start + (end - start) * i / steps, .55 + .45 * i / steps), opacity: Math.min(1, i / 4)})), {duration: 1500, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards'});
  const bloom = core.animate([{transform: place(end, 1), opacity: 1}, {transform: place(end, 2.4), opacity: 0}], {duration: 900, delay: 1400, easing: 'ease-out', fill: 'forwards'});
  const lift = veil.animate([{opacity: 0}, {opacity: 1, offset: .08}, {opacity: 1, offset: .6}, {opacity: 0}], {duration: 2400, easing: 'ease-in-out', fill: 'forwards'});
  const beat = pulse.animate([{opacity: 0, transform: 'scale(.7)'}, {opacity: .95, transform: 'scale(1.18)', offset: .38}, {opacity: 0, transform: 'scale(1)'}], {duration: 1100, delay: 2000, easing: 'ease-in-out', fill: 'forwards'});
  let active = true;
  Promise.all([rise.finished, bloom.finished, lift.finished, beat.finished]).then(() => { if (active) done(); }, () => {});
  return () => { active = false; for (const a of [rise, bloom, lift, beat]) a.cancel(); };
}

type Box = {l: number; t: number; w: number; h: number};
type Geo = {w: number; h: number; d: string; stars: Pt[]; stacked: boolean; arcs: {d: string; box: Box; end?: Pt; paint: Paint}[]; burst: Pt | null; twinkles: Pt[]};
/** The room a piece's box keeps around the ribbon, so its glow is never cut. */
const ARC_PAD = 22;
const pathOf = (segs: Seg[]) => `M${f(segs[0]![0].x)} ${f(segs[0]![0].y)}` + segs.map(s => ` C${f(s[1].x)} ${f(s[1].y)} ${f(s[2].x)} ${f(s[2].y)} ${f(s[3].x)} ${f(s[3].y)}`).join('');
const sameGeo = (a: Geo, b: Geo) => a.w === b.w && a.h === b.h && a.d === b.d && a.arcs.map(x => x.d + JSON.stringify(x.paint)).join() === b.arcs.map(x => x.d + JSON.stringify(x.paint)).join() && a.twinkles.length === b.twinkles.length;

export default function FooterPath({stage, footer}: {stage: RefObject<HTMLDivElement | null>; footer: RefObject<HTMLElement | null>}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), starLayer = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null), [flare, setFlare] = useState(false);
  // Measure from the page: the nodes' centres and "= Wealth" relative to the stage; time each word and bubble to the
  // moment the line reaches it, then the arc and the touch.
  useLayoutEffect(() => {
    const el = stage.current, root = footer.current; if (!el || !root) return;
    const measure = () => {
      const base = el.getBoundingClientRect();
      const nodes = [...el.querySelectorAll<HTMLElement>('[data-footer-node]')].map(n => { const r = n.getBoundingClientRect(); return {x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top}; });
      if (nodes.length < 3) return;
      const stacked = Math.abs(nodes[0]!.x - nodes[2]!.x) < 60, segs = segments(nodes, stacked);
      const wr = root.querySelector<HTMLElement>('[data-footer-wealth]')?.getBoundingClientRect();
      const wealth = wr && wr.width > 0 ? {x: wr.right - base.left + (stacked ? 6 : 8), y: wr.top - base.top + wr.height * .56} : null;
      // The ribbon: from Health's node (wider screens) or from the foot of the line under it, beneath the steps (phones).
      const steps = el.querySelector<HTMLElement>('.site-footer-steps')?.getBoundingClientRect(), last = nodes[2]!, tail = segs.at(-1)!, foot = tail[3];
      // (Out of Health on the line's own tangent: the way the last piece of the line arrives.)
      const dir = {x: tail[3].x - tail[2].x, y: tail[3].y - tail[2].y};
      const arc = !wealth ? null : stacked ? phoneArc(foot, dir, (steps ? steps.bottom - base.top : foot.y) + 12, wealth, base.width) : wideArc(last, dir, wealth, base.width);
      const rb = !wealth || !arc ? null : ribbon(arc.segs, stacked ? RIBBON_WIDTH.phone : RIBBON_WIDTH.wide, ARC_PAD, arc.crest, arc.r);
      const {T0, REVEAL, ARC_RISE, ARC_RETURN, WEALTH_AFTER, FLARE_AFTER, PHONE_ARC} = FOOTER_TIMING, extent = stacked ? base.height : base.width;
      const arrive = nodes.map(n => T0 + REVEAL * Math.min(1, Math.max(0, (stacked ? n.y : n.x) / extent)));
      const touch = rb && !stacked ? arrive[2]! + ARC_RISE + ARC_RETURN : arrive[2]! + WEALTH_AFTER;
      arrive.forEach((t, i) => root.style.setProperty(`--sf-at${i}`, `${t.toFixed(2)}s`));
      root.style.setProperty('--sf-t0', `${T0}s`);
      root.style.setProperty('--sf-reveal', `${REVEAL}s`);
      root.style.setProperty('--sf-arc-rise', `${(arrive[2]! + (stacked ? PHONE_ARC[0] : 0)).toFixed(2)}s`);
      root.style.setProperty('--sf-arc-return', `${(arrive[2]! + (stacked ? PHONE_ARC[0] + PHONE_ARC[1] : ARC_RISE)).toFixed(2)}s`);
      root.style.setProperty('--sf-wealth', `${touch.toFixed(2)}s`);
      root.style.setProperty('--sf-flare', `${(touch + FLARE_AFTER).toFixed(2)}s`);
      // Constellation stars: small points beside the line, between the nodes.
      const stars = segs.flatMap((s, i) => i === 0 ? [] : [.33, .66].map(t => { const p = at(s, t); return {x: p.x + (i % 2 ? 7 : -7), y: p.y + (t < .5 ? -8 : 9)}; }));
      // The rim stars that twinkle, mapped from the artwork into the stage.
      const art = root.querySelector<HTMLElement>('.site-footer-art'), frame = art ? footerArtFrame(art, el) : null;
      const twinkles = frame ? FOOTER_RIM_STARS.map(([x, y]) => { const [px, py] = frame.map(x, y); return {x: px, y: py}; }).filter(p => p.x > 4 && p.x < base.width - 4 && p.y > -200) : [];
      const next: Geo = {w: base.width, h: base.height, d: pathOf(segs), stars, stacked, arcs: rb ? rb.pieces.map((d, i) => ({d, box: rb.boxes[i]!, end: i === 1 ? rb.end : undefined, paint: rb.paint[i]!})) : [], burst: wealth ? {x: wealth.x - 16 - (wr!.width / 2), y: wealth.y} : null, twinkles};
      // Same geometry → same state object (no re-render, so nothing resizes inside a ResizeObserver delivery).
      setGeo(g => g && sameGeo(g, next) ? g : next);
    };
    measure();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure); ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, [stage, footer]);
  // The finale, once per visit, when the banner is well in view. It depends only on the line having been measured once
  // (a later re-measure must not cancel a finale that is playing).
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
      try { sessionStorage.setItem(SEEN, '1'); } catch { /* the finale simply plays again next time */ }
      intro(root, 'play');
      const touch = parseFloat(root.style.getPropertyValue('--sf-wealth')) || 4;
      timers.push(window.setTimeout(() => setFlare(true), (touch + FOOTER_TIMING.FLARE_AFTER) * 1000));
      timers.push(window.setTimeout(() => intro(root, 'done'), (touch + FOOTER_TIMING.SETTLE) * 1000));
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
  const grad = `sf-g-${id}`, arcGrad = `sf-a-${id}`, glow = `sf-glow-${id}`;
  // Session AG Polish 3 (owner Part 6): the ribbon's colour follows its way — Health's magenta into pink up to the turn,
  // pink on up to just before the crest, then the warm gold of "= Wealth" for the last stretch into the word.
  const arcSvg = (d: string, box: Box, i: number, paint: Paint, end?: Pt) => <svg className="site-footer-line" width={geo.w} height={geo.h} viewBox={`0 0 ${f(geo.w)} ${f(geo.h)}`} focusable="false" style={{left: `${f(-box.l)}px`, top: `${f(-box.t)}px`}}>
    <defs>
      <linearGradient id={`${arcGrad}-${i}`} gradientUnits="userSpaceOnUse" x1={f(paint.x1)} y1={f(paint.y1)} x2={f(paint.x2)} y2={f(paint.y2)}>{paint.stops.map(([o, c], k) => <stop key={k} offset={o.toFixed(3)} stopColor={c}/>)}</linearGradient>
      <filter id={`${glow}-${i}`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation={geo.stacked ? 3.5 : 6}/></filter>
      <filter id={`${glow}-${i}-dot`} x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="4"/></filter>
    </defs>
    <path className="site-footer-path site-footer-path-glow site-footer-ribbon" d={d} fill={`url(#${arcGrad}-${i})`} filter={`url(#${glow}-${i})`}/>
    <path className="site-footer-path site-footer-ribbon" d={d} fill={`url(#${arcGrad}-${i})`}/>
    {end && <><circle cx={f(end.x)} cy={f(end.y)} r="5.5" fill="#ffd27a" opacity=".75" filter={`url(#${glow}-${i}-dot)`}/><circle cx={f(end.x)} cy={f(end.y)} r="2.4" fill="#fff2cc"/></>}
  </svg>;
  return <>
    {flare && <div ref={starLayer} className="site-footer-star-layer" aria-hidden="true"><span className="site-footer-star-veil"/><span className="site-footer-star-pulse"/><span className="site-footer-star-core"/></div>}
    <div className="site-footer-reveal" data-stacked={geo.stacked || undefined} aria-hidden="true"><div className="site-footer-reveal-in">
      <svg className="site-footer-line" width={geo.w} height={geo.h} viewBox={`0 0 ${f(geo.w)} ${f(geo.h)}`} focusable="false">
        <defs>
          <linearGradient id={grad} gradientUnits="userSpaceOnUse" x1="0" x2={f(geo.w)} y1="0" y2="0"><stop offset="0" stopColor="#9273ff"/><stop offset=".45" stopColor="#23eaff"/><stop offset=".8" stopColor="#ff74be"/><stop offset="1" stopColor="#f06dff"/></linearGradient>
          <filter id={glow} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
        </defs>
        <path className="site-footer-path site-footer-path-glow" d={geo.d} fill="none" stroke={`url(#${grad})`} strokeWidth="7" strokeLinecap="round" filter={`url(#${glow})`}/>
        <path className="site-footer-path" d={geo.d} fill="none" stroke={`url(#${grad})`} strokeWidth="2" strokeLinecap="round"/>
        {geo.stars.map((s, i) => <circle key={i} className="site-footer-star" cx={f(s.x)} cy={f(s.y)} r={i % 3 ? 1.3 : 1.9}/>)}
      </svg>
    </div></div>
    {geo.arcs.map((a, i) => <div key={i} className="site-footer-arc" data-part={i ? 'return' : 'rise'} data-phone={geo.stacked || undefined} aria-hidden="true" style={{left: `${f(a.box.l)}px`, top: `${f(a.box.t)}px`, width: `${f(a.box.w)}px`, height: `${f(a.box.h)}px`}}><div className="site-footer-arc-in">{arcSvg(a.d, a.box, i, a.paint, a.end)}</div></div>)}
    {geo.burst && <div className="site-footer-burst" aria-hidden="true" style={{left: `${f(geo.burst.x)}px`, top: `${f(geo.burst.y)}px`}}><i/><i/><i/><i/><i/></div>}
    {geo.twinkles.map((t, i) => <span key={i} className="site-footer-twinkle" data-twinkle={i} aria-hidden="true" style={{left: `${f(t.x)}px`, top: `${f(t.y)}px`}}/>)}
  </>;
}
