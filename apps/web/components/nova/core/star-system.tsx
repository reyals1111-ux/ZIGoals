'use client';
import {useEffect, useRef, useState} from 'react';
import {drewSomething, GOVERNOR_GRACE_MS, governorStep, rgb, softwareRenderer, speakPulse, STAR_ACCENT, STAR_STATE, starPace, starPixels, starRender, starWhy, type StarFailure, type StarWhy} from '../../../lib/nova/core/governor';
import {STAR_DETAILS, starDebug} from '../../../lib/nova/core/star-debug';
import {STAR_FRAG, STAR_UNIFORMS, STAR_VERT, type StarUniform} from '../../../lib/nova/core/star-shader';
import type {HudMotionState} from '../../../lib/nova/holo/motion';
import {countHudFrame} from '../../../lib/nova/holo/motes';
import type {NovaOrbState} from '../../../lib/nova/orb';
import {deviceHints, type DeviceHints} from '../../../lib/nova/orb-starfield';
import './star-system.css';

/**
 * Session AM (ADR-038 D10, D11, A7; art direction §5, §9), rebuilt in Session AM-2 (ADR-038 "AM-2", E1–E5): NOVA's
 * centre node, drawn. One canvas, one shader (lib/nova/core/star-shader.ts), decoration only: the star's state is always
 * also said in words by the stage.
 *
 * - It **runs** wherever WebGL draws it (lib/nova/core/governor.ts): 30 fps while the person is active or NOVA listens,
 *   thinks or speaks; 6 fps at rest (the window not focused, or a minute without a key, tap or request); 12 fps under
 *   Calm. Software rendering, a low battery, a light device and late frames only make it slower and coarser. Activity is
 *   read from keys, taps and focus, never from pointer movement.
 * - **One still frame** per state under Motion Off, reduced motion and while the tab is hidden. The frame is kept in the
 *   canvas (`preserveDrawingBuffer`), so a display change or a tab switch cannot empty it.
 * - **Proof that something was drawn:** the first frames are read back at the core. A driver that compiles the shader
 *   and then draws nothing (what the owner's computer showed in Session AM) is a failure with its own words, not a
 *   success with an empty canvas.
 * - **The still picture** (the same galaxy, drawn before: public/nova/star) stands in only where WebGL cannot draw it:
 *   no WebGL, a shader that does not compile, an empty frame, a lost context that does not come back within a moment
 *   (if it does come back later, the star returns). If the picture cannot load either, `onReport` says 'orb' and the
 *   stage shows the SVG orb.
 * - `onReport` also carries the honest line (`starWhy`) and, in a LOCAL_DEMO build, how it is drawn right now.
 * - Time is accumulated here and handed to the shader, so a pause never makes the picture jump.
 */
export type StarBeam = {angle: number; key: number};
export type StarReport = {shows: 'star' | 'picture' | 'orb'; why: StarWhy | null;
  /** LOCAL_DEMO only: the renderer's name, the pace and the tier, for a person checking their own device. */
  details: string | null;
  /** `?star=why` (LOCAL_DEMO): show the line even while the star runs at its full pace. */
  always: boolean};
type Probe = {webgl: boolean; software: boolean; renderer: string | null};
const LOST_GRACE_MS = 2500;
export function StarSystem({state, hud, accent = 'violet', phone = false, size, beam = null, onReport}: {
  state: NovaOrbState; hud: HudMotionState; accent?: string; phone?: boolean;
  /** The canvas's box, in CSS pixels (it is square and centred on the orb by its stylesheet). */
  size: number;
  /** A widget is being made in this direction (radians, 0 = right, counter-clockwise); a new `key` fires the beam again. */
  beam?: StarBeam | null;
  onReport?: (report: StarReport) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [debug] = useState(starDebug);
  const [failure, setFailure] = useState<StarFailure | null>(null), [hints, setHints] = useState<DeviceHints | null>(null), [probe, setProbe] = useState<Probe | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false), [tier, setTier] = useState(0), [info, setInfo] = useState(''), [pictureFailed, setPictureFailed] = useState(false);
  // What the device says about itself (the battery arrives a little later, where the browser has one, and is followed).
  useEffect(() => {
    setHints(deviceHints());
    let live = true, off = () => undefined as void;
    type Battery = {level: number; charging: boolean; addEventListener?: (type: string, f: () => void) => void; removeEventListener?: (type: string, f: () => void) => void};
    const nav = navigator as Navigator & {getBattery?: () => Promise<Battery>};
    nav.getBattery?.().then(b => {
      if (!live) return;
      const read = () => setHints(h => ({...(h ?? {}), lowBattery: !b.charging && b.level <= 0.2}));
      read(); b.addEventListener?.('levelchange', read); b.addEventListener?.('chargingchange', read);
      off = () => { b.removeEventListener?.('levelchange', read); b.removeEventListener?.('chargingchange', read); };
    }).catch(() => undefined);
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)'), readMotion = () => setReducedMotion(!!media?.matches);
    readMotion(); media?.addEventListener?.('change', readMotion);
    try {
      // With graphics hardware the first ask succeeds. If only the second does, the browser draws WebGL in software.
      const hard = document.createElement('canvas').getContext('webgl', {failIfMajorPerformanceCaveat: true}), other = document.createElement('canvas');
      const any = (hard ?? other.getContext('webgl') ?? other.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      let name: string | null = null;
      try { const ext = any?.getExtension('WEBGL_debug_renderer_info'); name = any ? String(any.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : any.RENDERER) ?? '') || null : null; } catch { name = null; }
      setProbe({webgl: !!any, software: !!any && (!hard || softwareRenderer(name)), renderer: name});
      try { any?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* the probe is dropped with its canvas */ }
    } catch { setProbe({webgl: false, software: false, renderer: null}); }
    return () => { live = false; off(); media?.removeEventListener?.('change', readMotion); };
  }, []);
  const ready = hints !== null && probe !== null, software = !!probe?.software && !debug.live;
  const render = ready ? starRender({hud, webgl: probe.webgl, failure}) : null;
  const why = ready && render ? starWhy({render, webgl: probe.webgl, failure, hud, reducedMotion, software, hints, tier}) : null;
  const shows: StarReport['shows'] | null = render === null ? null : render !== 'picture' ? 'star' : pictureFailed ? 'orb' : 'picture';
  const details = STAR_DETAILS && ready && shows ? [shows === 'star' ? (render === 'still' ? 'one still frame' : info || 'starting') : shows === 'picture' ? 'the still picture' : 'the SVG orb', probe.renderer ?? (probe.webgl ? 'renderer not named' : 'no WebGL'), probe.software ? 'software rendering' : null, debug.live ? 'held live (?star=live)' : null].filter(Boolean).join(' · ') : null;
  useEffect(() => { if (shows) onReport?.({shows, why, details, always: debug.why}); }, [shows, why?.code, details, debug.why]); // eslint-disable-line react-hooks/exhaustive-deps

  // Everything the loop reads lives in refs, so a state change never rebuilds the GL program.
  const live = useRef({state, hud, phone, accent, beam, size, render, software, hints, debug});
  live.current = {state, hud, phone, accent, beam, size, render, software, hints, debug};
  const kick = useRef<() => void>(() => undefined);
  useEffect(() => { kick.current(); }, [state, hud, phone, accent, beam?.key, size, render, software, hints]);

  // The canvas stays while WebGL may still draw: also while a context is lost (it may be restored).
  const canvasOn = !!probe?.webgl && (failure === null || failure === 'lost');
  useEffect(() => {
    const el = canvas.current;
    if (!canvasOn || !el) return;
    let gl: WebGLRenderingContext | null = null, uniforms: Partial<Record<StarUniform, WebGLUniformLocation | null>> = {};
    const setup = (): boolean => {
      try {
        gl = el.getContext('webgl', {alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: 'low-power', preserveDrawingBuffer: true}) as WebGLRenderingContext | null;
        if (!gl || gl.isContextLost()) return false;
        const shader = (type: number, source: string) => { const s = gl!.createShader(type)!; gl!.shaderSource(s, source); gl!.compileShader(s); if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw Error('shader'); return s; };
        const program = gl.createProgram()!;
        gl.attachShader(program, shader(gl.VERTEX_SHADER, STAR_VERT)); gl.attachShader(program, shader(gl.FRAGMENT_SHADER, STAR_FRAG)); gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error('link');
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const at = gl.getAttribLocation(program, 'a'); gl.enableVertexAttribArray(at); gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
        gl.disable(gl.BLEND); gl.clearColor(0, 0, 0, 0);
        uniforms = Object.fromEntries(STAR_UNIFORMS.map(name => [name, gl!.getUniformLocation(program, name)]));
        return true;
      } catch { return false; }
    };
    if (!setup()) { setFailure('compile'); return; }

    // The picture's own clock and eased values.
    const v = {t: 12, spin: 0.72, rate: 0.06, listen: 0, think: 0, speak: 0, beam: 0, beamA: 0, beamKey: live.current.beam?.key ?? 0, beamAt: -1e9};
    let frame = 0, timer = 0, lostTimer = 0, last = 0, lastDraw = 0, tierNow = 0, late = 0, graceUntil = 0, losses = 0, stopped = false, activeAt = performance.now(), focused = true; // the focus is read from focus and blur events only (a page that never had it still starts active)
    let checks = 0, proven = false, said = '';
    const pixels = (scale: number) => { const want = starPixels(live.current.size, window.devicePixelRatio, scale); if (el.width !== want) { el.width = want; el.height = want; } };
    const say = (mode: string, fps: number) => { const words = `${mode} · ${fps} fps · tier ${tierNow} · ${el.width} px`; if (words !== said) { said = words; setInfo(words); } };
    /** The first two frames are read back at the core: a frame with no light in it is a failure, said as one. */
    const prove = () => {
      if (proven || !gl) return;
      checks += 1;
      try {
        const n = 4, px = new Uint8Array(n * n * 4), at = Math.max(0, Math.floor(el.width / 2) - n / 2);
        gl.readPixels(at, at, n, n, gl.RGBA, gl.UNSIGNED_BYTE, px);
        if (drewSomething(px)) { proven = true; el.dataset.starProven = ''; return; }
      } catch { /* a browser that refuses the read says nothing either way */ proven = true; return; }
      if (checks >= 2) { stopped = true; cancel(); setFailure('empty'); }
    };
    const draw = (now: number, dt: number, speed: number, detail: number) => {
      if (!gl) return;
      const {state: s, accent: a, beam: b} = live.current, target = STAR_STATE[s], ease = 1 - Math.exp(-dt * 5);
      v.rate += (target.spin - v.rate) * ease; v.t += dt * speed; v.spin += dt * speed * v.rate;
      v.listen += (target.listen - v.listen) * ease; v.think += (target.think - v.think) * ease; v.speak += (target.speak - v.speak) * ease;
      if (b && b.key !== v.beamKey) { v.beamKey = b.key; v.beamA = b.angle; v.beamAt = now; }
      const since = (now - v.beamAt) / 1000; v.beam = since < 0.9 ? Math.min(1, since / 0.12) * Math.max(0, 1 - Math.max(0, since - 0.45) / 0.45) : 0;
      const [ca, cb, cc] = STAR_ACCENT[a] ?? STAR_ACCENT.violet!;
      gl.viewport(0, 0, el.width, el.height);
      gl.uniform2f(uniforms.uRes ?? null, el.width, el.height);
      gl.uniform1f(uniforms.uT ?? null, v.t); gl.uniform1f(uniforms.uSpin ?? null, v.spin);
      gl.uniform1f(uniforms.uListen ?? null, v.listen); gl.uniform1f(uniforms.uThink ?? null, v.think); gl.uniform1f(uniforms.uSpeak ?? null, v.speak);
      gl.uniform1f(uniforms.uPulse ?? null, speakPulse(v.t)); gl.uniform1f(uniforms.uBeam ?? null, v.beam); gl.uniform1f(uniforms.uBeamA ?? null, v.beamA);
      gl.uniform1f(uniforms.uDetail ?? null, detail);
      gl.uniform3fv(uniforms.uA ?? null, rgb(ca, [0.57, 0.45, 1])); gl.uniform3fv(uniforms.uB ?? null, rgb(cb, [0.14, 0.92, 1])); gl.uniform3fv(uniforms.uC ?? null, rgb(cc, [0.94, 0.43, 1]));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      prove();
      countHudFrame();
    };
    /** One still frame for the state as it is now: the eased values jump to their targets (a composed frame, not a frozen one), at full quality. */
    const still = () => {
      const target = STAR_STATE[live.current.state];
      v.listen = target.listen; v.think = target.think; v.speak = target.speak; v.beamAt = -1e9;
      pixels(live.current.phone ? 0.7 : 1); draw(performance.now(), 0, 0, live.current.phone ? 3 : 5);
      el.dataset.star = 'still'; el.dataset.starFps = '0';
    };
    const cancel = () => { cancelAnimationFrame(frame); window.clearTimeout(timer); frame = 0; timer = 0; };
    const tick = (now: number) => {
      frame = 0;
      if (stopped || !gl) return;
      const c = live.current, held = c.debug.live;
      const pace = starPace({hud: c.hud, state: c.state, focused: focused || held, idleMs: held ? 0 : now - activeAt, phone: c.phone, software: c.software, hints: c.hints ?? {}, tier: tierNow});
      // The pace is its own frames per second, not the display's: on a 60 or 120 Hz screen the frames between are skipped.
      if (pace.fps >= 20 && lastDraw && now - lastDraw < 1000 / pace.fps - 6) { frame = requestAnimationFrame(tick); return; }
      const dt = last ? Math.min(0.25, (now - last) / 1000) : 0; last = now;
      // The governor watches the active pace only (at rest a late frame is nobody's concern), and not while the page is
      // still loading or the star has just woken.
      if (pace.mode === 'active' && !held && lastDraw && now >= graceUntil) { const g = governorStep(tierNow, late, now - lastDraw, pace.fps); late = g.late; if (g.tier !== tierNow) { tierNow = g.tier; setTier(tierNow); } }
      lastDraw = now;
      pixels(pace.scale); draw(now, dt, pace.speed, pace.detail);
      el.dataset.star = pace.mode; el.dataset.starTier = String(tierNow); el.dataset.starFps = String(pace.fps);
      say(pace.mode, pace.fps);
      schedule(pace.fps);
    };
    const schedule = (fps: number) => {
      cancel();
      if (stopped) return;
      // A slow pace waits on a timer, then takes one frame: no callback sixty times a second while nothing is drawn.
      if (fps >= 20) frame = requestAnimationFrame(tick);
      else timer = window.setTimeout(() => { frame = requestAnimationFrame(tick); }, 1000 / fps - 8);
    };
    const start = () => {
      cancel(); last = 0; lastDraw = 0; late = 0; graceUntil = performance.now() + GOVERNOR_GRACE_MS;
      if (stopped || !gl) return;
      if (live.current.render !== 'running' || document.visibilityState === 'hidden') { still(); return; }
      frame = requestAnimationFrame(tick);
    };
    kick.current = start;
    const active = () => { const resting = el.dataset.star === 'resting'; activeAt = performance.now(); if (resting) start(); };
    const focus = () => { focused = true; active(); }, blur = () => { focused = false; };
    const visible = () => { if (document.visibilityState === 'hidden') cancel(); else start(); };
    const freeze = () => cancel(), resume = () => start();
    // A lost context is waited for; the still picture stands in after a moment, and the star returns if the context does.
    const lostContext = (e: Event) => {
      e.preventDefault(); cancel(); gl = null; losses += 1; window.clearTimeout(lostTimer);
      if (losses > 3) { stopped = true; setFailure('lost'); return; }
      lostTimer = window.setTimeout(() => setFailure('lost'), LOST_GRACE_MS);
    };
    const restored = () => {
      window.clearTimeout(lostTimer);
      if (stopped) return;
      if (setup()) { checks = 0; proven = false; setFailure(null); start(); } else { stopped = true; setFailure('compile'); }
    };
    window.addEventListener('keydown', active, {passive: true}); window.addEventListener('pointerdown', active, {passive: true});
    window.addEventListener('focus', focus); window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visible); document.addEventListener('freeze', freeze); document.addEventListener('resume', resume);
    el.addEventListener('webglcontextlost', lostContext); el.addEventListener('webglcontextrestored', restored);
    start();
    return () => {
      stopped = true; cancel(); window.clearTimeout(lostTimer); kick.current = () => undefined;
      window.removeEventListener('keydown', active); window.removeEventListener('pointerdown', active);
      window.removeEventListener('focus', focus); window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visible); document.removeEventListener('freeze', freeze); document.removeEventListener('resume', resume);
      el.removeEventListener('webglcontextlost', lostContext); el.removeEventListener('webglcontextrestored', restored);
      // The context is released with the canvas; asking the browser to drop it now frees the GPU memory at once.
      try { gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* already gone */ }
      gl = null;
    };
  }, [canvasOn]);

  if (!ready) return null;
  return <>
    {canvasOn && <canvas ref={canvas} className="nova-star" aria-hidden="true" data-star="starting" data-star-software={probe.software ? '' : undefined} data-motion-essential="" hidden={render === 'picture'} style={{width: size, height: size}}/>}
    {render === 'picture' && !pictureFailed && <StarPicture accent={accent} state={state} size={size} onError={() => setPictureFailed(true)}/>}
  </>;
}
/**
 * AM-2 (E3): the star as a picture — the same shader's standby frame per accent, drawn once by
 * scripts/render-star-stills.mjs and kept in public/nova/star. The state is marked on top in the disc's own plane:
 * cyan rings for listening, a bright arc for thinking, magenta-white rings for speaking. Nothing here moves.
 */
const PICTURES = new Set(['violet', 'cyan', 'magenta', 'teal', 'gold']);
function StarPicture({accent, state, size, onError}: {accent: string; state: NovaOrbState; size: number; onError: () => void}) {
  const name = PICTURES.has(accent) ? accent : 'violet';
  return <span className="nova-star nova-star-picture" aria-hidden="true" data-state={state} style={{width: size, height: size}}>
    {/* eslint-disable-next-line @next/next/no-img-element -- a decoration of a known size, loaded only when WebGL cannot draw the star */}
    <img src={`/nova/star/${name}.webp`} alt="" width={size} height={size} decoding="async" draggable={false} onError={onError}/>
    {state !== 'idle' && <svg viewBox="-100 -100 200 200" focusable="false">
      <g transform="rotate(21.8)" fill="none" strokeLinecap="round">
        {state === 'listening' && [30, 48, 68].map(r => <ellipse key={r} rx={r} ry={r * 0.44} className="nova-star-mark-in"/>)}
        {state === 'speaking' && [26, 44, 64, 86].map(r => <ellipse key={r} rx={r} ry={r * 0.44} className="nova-star-mark-out"/>)}
        {state === 'thinking' && <><ellipse rx="58" ry={58 * 0.44} className="nova-star-mark-think" pathLength={100} strokeDasharray="34 66"/><ellipse rx="36" ry={36 * 0.44} className="nova-star-mark-think" pathLength={100} strokeDasharray="22 78" strokeDashoffset="-50"/></>}
      </g>
    </svg>}
  </span>;
}
export default StarSystem;
