'use client';
import {useEffect, useRef, useState} from 'react';
import {GOVERNOR_GRACE_MS, governorStep, rgb, speakPulse, STAR_ACCENT, STAR_STATE, STAR_TIERS, starPace, starPixels, starRender, type StarRender} from '../../../lib/nova/core/governor';
import {STAR_FRAG, STAR_UNIFORMS, STAR_VERT, type StarUniform} from '../../../lib/nova/core/star-shader';
import type {HudMotionState} from '../../../lib/nova/holo/motion';
import {countHudFrame} from '../../../lib/nova/holo/motes';
import type {NovaOrbState} from '../../../lib/nova/orb';
import {deviceHints, type DeviceHints} from '../../../lib/nova/orb-starfield';
import './star-system.css';

/**
 * Session AM (ADR-038 D10, D11, A7; art direction §5, §9): NOVA's centre node, drawn. One canvas, one shader
 * (lib/nova/core/star-shader.ts), decoration only: the star's state is always also said in words by the stage.
 *
 * - It runs only while it may (lib/nova/core/governor.ts): 30 fps while the person is active or NOVA listens, thinks or
 *   speaks; 6 fps at half resolution at rest (the window not focused, or a minute without a key, tap or request); 12 fps
 *   under Calm; one still frame per state under Motion Off, reduced motion and while the tab is hidden. Activity is read
 *   from keys, taps and focus, never from pointer movement.
 * - A governor steps quality down when frames arrive late (resolution, then noise octaves, then one still frame).
 * - No WebGL, a lost context that does not come back, Save-Data or a low battery: nothing is drawn here and `onRender`
 *   says 'orb', so the stage shows the SVG orb (components/nova/orb.tsx), which is its own complete picture.
 * - Time is accumulated here and handed to the shader, so a pause never makes the picture jump.
 */
export type StarBeam = {angle: number; key: number};
export function StarSystem({state, hud, accent = 'violet', phone = false, size, beam = null, onRender}: {
  state: NovaOrbState; hud: HudMotionState; accent?: string; phone?: boolean;
  /** The canvas's box, in CSS pixels (it is square and centred on the orb by its stylesheet). */
  size: number;
  /** A widget is being made in this direction (radians, 0 = right, counter-clockwise); a new `key` fires the beam again. */
  beam?: StarBeam | null;
  onRender?: (render: StarRender) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false), [hints, setHints] = useState<DeviceHints | null>(null), [webgl, setWebgl] = useState<boolean | null>(null), [software, setSoftware] = useState(false);
  // What the device says about itself (the battery arrives a little later, where the browser has one).
  useEffect(() => {
    setHints(deviceHints());
    let live = true;
    const nav = navigator as Navigator & {getBattery?: () => Promise<{level: number; charging: boolean}>};
    nav.getBattery?.().then(b => { if (live && !b.charging && b.level <= 0.2) setHints(h => ({...(h ?? {}), lowBattery: true})); }).catch(() => undefined);
    try {
      // With graphics hardware the first ask succeeds. If only the second does, the browser draws WebGL in software.
      const hard = document.createElement('canvas').getContext('webgl', {failIfMajorPerformanceCaveat: true}), probe = document.createElement('canvas');
      const any = hard ?? probe.getContext('webgl') ?? probe.getContext('experimental-webgl');
      setWebgl(!!any); setSoftware(!hard && !!any);
      try { (hard ?? (any as WebGLRenderingContext | null))?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* the probe is dropped with its canvas */ }
    } catch { setWebgl(false); }
    return () => { live = false; };
  }, []);
  const render: StarRender | null = hints === null || webgl === null ? null : starRender({hud, webgl, hints, failed, software});
  useEffect(() => { if (render) onRender?.(render); }, [render, onRender]);

  // Everything the loop reads lives in refs, so a state change never rebuilds the GL program.
  const live = useRef({state, hud, phone, accent, beam, size, render});
  live.current = {state, hud, phone, accent, beam, size, render};
  const kick = useRef<() => void>(() => undefined);
  useEffect(() => { kick.current(); }, [state, hud, phone, accent, beam?.key, size, render]);

  const drawn = render === 'running' || render === 'still';
  useEffect(() => {
    const el = canvas.current;
    if (!drawn || !el) return;
    let gl: WebGLRenderingContext | null = null, uniforms: Partial<Record<StarUniform, WebGLUniformLocation | null>> = {};
    const setup = (): boolean => {
      try {
        gl = el.getContext('webgl', {alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false}) as WebGLRenderingContext | null;
        if (!gl) return false;
        const shader = (type: number, source: string) => { const s = gl!.createShader(type)!; gl!.shaderSource(s, source); gl!.compileShader(s); if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw Error('shader'); return s; };
        const program = gl.createProgram()!;
        gl.attachShader(program, shader(gl.VERTEX_SHADER, STAR_VERT)); gl.attachShader(program, shader(gl.FRAGMENT_SHADER, STAR_FRAG)); gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error('link');
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const at = gl.getAttribLocation(program, 'a'); gl.enableVertexAttribArray(at); gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
        uniforms = Object.fromEntries(STAR_UNIFORMS.map(name => [name, gl!.getUniformLocation(program, name)]));
        return true;
      } catch { return false; }
    };
    if (!setup()) { setFailed(true); return; }

    // The picture's own clock and eased values.
    const v = {t: 12, spin: 0.72, rate: 0.06, listen: 0, think: 0, speak: 0, beam: 0, beamA: 0, beamKey: live.current.beam?.key ?? 0, beamAt: -1e9};
    let frame = 0, timer = 0, last = 0, lastDraw = 0, tier = 0, late = 0, graceUntil = 0, lost = 0, stopped = false, activeAt = performance.now(), focused = true; // the focus is read from focus and blur events only (a page that never had it still starts active)
    const pixels = (scale: number) => { const want = starPixels(live.current.size, window.devicePixelRatio, scale, tier); if (el.width !== want) { el.width = want; el.height = want; } };
    const draw = (now: number, dt: number, speed: number) => {
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
      gl.uniform1f(uniforms.uDetail ?? null, live.current.phone ? Math.min(3, STAR_TIERS[tier]!.detail) : STAR_TIERS[tier]!.detail);
      gl.uniform3fv(uniforms.uA ?? null, rgb(ca, [0.57, 0.45, 1])); gl.uniform3fv(uniforms.uB ?? null, rgb(cb, [0.14, 0.92, 1])); gl.uniform3fv(uniforms.uC ?? null, rgb(cc, [0.94, 0.43, 1]));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      countHudFrame();
    };
    /** One still frame for the state as it is now: the eased values jump to their targets (a composed frame, not a frozen one). */
    const still = () => {
      const target = STAR_STATE[live.current.state];
      v.listen = target.listen; v.think = target.think; v.speak = target.speak; v.beamAt = -1e9;
      pixels(live.current.phone ? 0.7 : 1); draw(performance.now(), 0, 0);
      el.dataset.star = 'still';
    };
    const cancel = () => { cancelAnimationFrame(frame); window.clearTimeout(timer); frame = 0; timer = 0; };
    const tick = (now: number) => {
      frame = 0;
      if (stopped || !gl) return;
      const pace = starPace({hud: live.current.hud, state: live.current.state, focused, idleMs: now - activeAt, phone: live.current.phone});
      // The active pace is its own frames per second, not the display's: on a 60 or 120 Hz screen the frames between are skipped.
      if (pace.fps >= 30 && lastDraw && now - lastDraw < 1000 / pace.fps - 6) { frame = requestAnimationFrame(tick); return; }
      const dt = last ? Math.min(0.25, (now - last) / 1000) : 0; last = now;
      // The governor watches the active pace only (at rest a late frame is nobody's concern), and not while the page is
      // still loading or the star has just woken.
      if (pace.mode === 'active' && lastDraw && now >= graceUntil) { const g = governorStep(tier, late, now - lastDraw, pace.fps); tier = g.tier; late = g.late; }
      lastDraw = now;
      if (STAR_TIERS[tier]!.still) { still(); el.dataset.star = 'still'; el.dataset.starTier = String(tier); return; }
      pixels(pace.scale); draw(now, dt, pace.speed);
      el.dataset.star = pace.mode; el.dataset.starTier = String(tier);
      schedule(pace.fps);
    };
    const schedule = (fps: number) => {
      cancel();
      // A slow pace waits on a timer, then takes one frame: no callback sixty times a second while nothing is drawn.
      if (fps >= 30) frame = requestAnimationFrame(tick);
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
    const lostContext = (e: Event) => { e.preventDefault(); cancel(); gl = null; lost += 1; if (lost > 2) { stopped = true; setFailed(true); } };
    const restored = () => { if (setup()) start(); else { stopped = true; setFailed(true); } };
    window.addEventListener('keydown', active, {passive: true}); window.addEventListener('pointerdown', active, {passive: true});
    window.addEventListener('focus', focus); window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visible); document.addEventListener('freeze', freeze); document.addEventListener('resume', resume);
    el.addEventListener('webglcontextlost', lostContext); el.addEventListener('webglcontextrestored', restored);
    start();
    return () => {
      stopped = true; cancel(); kick.current = () => undefined;
      window.removeEventListener('keydown', active); window.removeEventListener('pointerdown', active);
      window.removeEventListener('focus', focus); window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visible); document.removeEventListener('freeze', freeze); document.removeEventListener('resume', resume);
      el.removeEventListener('webglcontextlost', lostContext); el.removeEventListener('webglcontextrestored', restored);
      // The context is released with the canvas; asking the browser to drop it now frees the GPU memory at once.
      try { gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* already gone */ }
      gl = null;
    };
  }, [drawn]);

  if (!drawn) return null;
  return <canvas ref={canvas} className="nova-star" aria-hidden="true" data-star="starting" data-star-software={software ? '' : undefined} data-motion-essential="" style={{width: size, height: size}}/>;
}
export default StarSystem;
