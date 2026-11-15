import {describe, expect, it} from 'vitest';
import {BATTERY_FPS, drewSomething, GOVERNOR_GRACE_MS, governorStep, LIGHT_PACE, lightDevice, REST_AFTER_MS, rgb, SLOW_FRAMES, SOFTWARE_PACE, softwareRenderer, speakPulse, STAR_ACCENT, STAR_STATE, STAR_TIERS, STAR_WHY, starPace, starPixels, starRender, starWhy, VERY_LATE_WEIGHT} from './governor';

/**
 * Session AM (ADR-038 D10, D11, A7): the centre node's rules. Session AM-2 (ADR-038 "AM-2", E1–E4, deliberate): D39 and
 * D11's fallbacks are replaced. The star runs wherever WebGL draws it; software rendering, a low battery, a light device
 * and late frames only slow it; it is one still frame only for Motion Off, reduced motion and a hidden tab; it is the
 * still picture only where WebGL cannot draw it; Save-Data no longer changes it. Each earlier assertion has its
 * replacement here, as strict.
 */
describe('starRender: running, one still frame, or the still picture', () => {
  it('AM-2 (E1, deliberate): the still picture only where WebGL cannot draw the star', () => {
    expect(starRender({hud: 'full', webgl: false, failure: null})).toBe('picture');
    for (const failure of ['no-webgl', 'compile', 'empty', 'lost'] as const) expect(starRender({hud: 'full', webgl: true, failure}), failure).toBe('picture');
    // A failure leads in every motion state (a picture has no frames to stop).
    for (const hud of ['full', 'calm', 'still', 'paused'] as const) expect(starRender({hud, webgl: true, failure: 'empty'}), hud).toBe('picture');
  });
  it('is one still frame under Motion Off / reduced motion and while hidden, and for nothing else', () => {
    expect(starRender({hud: 'still', webgl: true, failure: null})).toBe('still');
    expect(starRender({hud: 'paused', webgl: true, failure: null})).toBe('still');
    expect(starRender({hud: 'full', webgl: true, failure: null})).toBe('running');
    expect(starRender({hud: 'calm', webgl: true, failure: null})).toBe('running');
  });
  it('the renderer’s own name is the second witness of software rendering', () => {
    for (const name of ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)', 'llvmpipe (LLVM 15.0.7, 256 bits)', 'softpipe', 'Microsoft Basic Render Driver', 'Software Rasterizer']) expect(softwareRenderer(name), name).toBe(true);
    for (const name of ['ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Max, Unspecified Version)', 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)', 'Apple GPU', 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)', 'Mali-G78', 'Adreno (TM) 740', '', null, undefined]) expect(softwareRenderer(name), String(name)).toBe(false);
  });
  it('a light device is two cores or 2 GB; a browser that says nothing counts as able', () => {
    expect(lightDevice({hardwareConcurrency: 2})).toBe(true); expect(lightDevice({deviceMemory: 2})).toBe(true);
    expect(lightDevice({hardwareConcurrency: 4, deviceMemory: 4})).toBe(false); expect(lightDevice({})).toBe(false);
    expect(lightDevice({saveData: true, lowBattery: true})).toBe(false);
  });
});
describe('starPace: active, resting, calm; and what only slows the star', () => {
  it('rests when the window is not focused or after a minute without a key, tap or request', () => {
    expect(starPace({hud: 'full', state: 'idle', focused: true, idleMs: 0, phone: false})).toEqual({mode: 'active', fps: 30, scale: 1, speed: 1, detail: 5});
    expect(starPace({hud: 'full', state: 'idle', focused: false, idleMs: 0, phone: false})).toMatchObject({mode: 'resting', fps: 6, scale: 1}); // Session AM (design review AM-D16, deliberate): rest slows the frames, never the sharpness (was scale 0.5)
    expect(starPace({hud: 'full', state: 'idle', focused: true, idleMs: REST_AFTER_MS, phone: false}).mode).toBe('resting');
  });
  it('never rests while NOVA listens, thinks or speaks', () => {
    for (const state of ['listening', 'thinking', 'speaking'] as const) expect(starPace({hud: 'full', state, focused: false, idleMs: 9e9, phone: false}).mode).toBe('active');
  });
  it('Calm is slower and fewer; a phone is lighter', () => {
    expect(starPace({hud: 'calm', state: 'thinking', focused: true, idleMs: 0, phone: false})).toEqual({mode: 'calm', fps: 12, scale: 1, speed: 1 / 3, detail: 5}); // AM-D16, deliberate: Calm keeps the resolution (was 0.8)
    expect(starPace({hud: 'full', state: 'idle', focused: true, idleMs: 0, phone: true})).toMatchObject({fps: 24, scale: 0.7, detail: 3});
  });
  it('AM-2 (E2, deliberate; was "software → one still frame", "a low battery → the orb", "two cores → still"): each only lowers the pace', () => {
    const base = {hud: 'full', state: 'idle', focused: true, idleMs: 0, phone: false} as const;
    const soft = starPace({...base, software: true});
    expect(soft).toEqual({mode: 'active', fps: SOFTWARE_PACE.fps, scale: SOFTWARE_PACE.scale, speed: 1, detail: SOFTWARE_PACE.detail});
    expect(starPace({...base, focused: false, software: true})).toMatchObject({mode: 'resting', fps: SOFTWARE_PACE.restFps});
    expect(starPace({...base, hints: {lowBattery: true}})).toMatchObject({mode: 'active', fps: BATTERY_FPS, scale: 1, detail: 5});
    expect(starPace({...base, hints: {hardwareConcurrency: 2}})).toMatchObject({mode: 'active', fps: LIGHT_PACE.fps, scale: LIGHT_PACE.scale, detail: LIGHT_PACE.detail});
    // Save-Data is about the network: it no longer changes the star.
    expect(starPace({...base, hints: {saveData: true}})).toEqual(starPace(base));
    // Every limit keeps a running star: frames every second, never zero.
    for (const p of [soft, starPace({...base, software: true, hints: {lowBattery: true, hardwareConcurrency: 1}, tier: STAR_TIERS.length - 1}), starPace({...base, hud: 'calm', software: true})]) { expect(p.fps).toBeGreaterThanOrEqual(4); expect(p.scale).toBeGreaterThanOrEqual(0.35); expect(p.detail).toBeGreaterThanOrEqual(3); }
    // A limit never raises a slower pace (Calm under software stays within both).
    expect(starPace({...base, hud: 'calm', software: true}).fps).toBe(Math.min(12, SOFTWARE_PACE.fps));
  });
  it('the governor’s tier lowers the octaves, then the resolution, then the frames', () => {
    const base = {hud: 'full', state: 'thinking', focused: true, idleMs: 0, phone: false} as const;
    expect(STAR_TIERS.map(t => starPace({...base, tier: STAR_TIERS.indexOf(t)})).map(p => [p.fps, p.scale, p.detail])).toEqual([[30, 1, 5], [30, 1, 4], [30, 0.75, 3], [12, 0.5, 3]]);
  });
});
describe('the governor', () => {
  it('steps down one tier after a run of late frames, and never past the last tier; AM-2 (E2, deliberate): the last tier still runs', () => {
    let g = {tier: 0, late: 0};
    for (let i = 0; i < SLOW_FRAMES - 1; i++) { g = governorStep(g.tier, g.late, 80, 30); expect(g.tier).toBe(0); }
    g = governorStep(g.tier, g.late, 80, 30);
    expect(g).toEqual({tier: 1, late: 0});
    for (let i = 0; i < SLOW_FRAMES * 9; i++) g = governorStep(g.tier, g.late, 400, 30);
    expect(g.tier).toBe(STAR_TIERS.length - 1);
    // Was `{still: true}`: the governor froze the star for the rest of the visit. Now it is slow and coarse, and alive.
    expect(STAR_TIERS.at(-1)).toEqual({scale: 0.5, detail: 3, fps: 12});
    for (const t of STAR_TIERS) expect(t).not.toHaveProperty('still');
  });
  it('a device that cannot keep up at all reaches the last tier within nine frames', () => {
    // 167 ms a frame at 30 fps is five slots late: each such frame counts as four, three of them step a tier down.
    let g = {tier: 0, late: 0}, frames = 0;
    while (g.tier < STAR_TIERS.length - 1) { g = governorStep(g.tier, g.late, 167, 30); frames += 1; }
    expect(frames).toBe(Math.ceil(SLOW_FRAMES / VERY_LATE_WEIGHT) * (STAR_TIERS.length - 1));
    expect(frames * 167).toBeLessThanOrEqual(1600);
    // One very late frame (a pause, a collected heap) between frames on time changes nothing.
    expect(governorStep(0, 0, 400, 30)).toEqual({tier: 0, late: VERY_LATE_WEIGHT});
    expect(governorStep(0, VERY_LATE_WEIGHT, 30, 30)).toEqual({tier: 0, late: 0});
    expect(GOVERNOR_GRACE_MS).toBeGreaterThanOrEqual(1500);
  });
  it('a frame on time starts the count again', () => {
    expect(governorStep(0, 7, 30, 30)).toEqual({tier: 0, late: 0});
    expect(governorStep(0, 0, 51, 30)).toEqual({tier: 0, late: 1});
  });
  it('the backing size is bounded: ratio capped at 1.5, never under 96 or over 1024 px', () => {
    expect(starPixels(400, 3, 1)).toBe(600);
    expect(starPixels(400, 1, 0.375)).toBe(150);
    expect(starPixels(400, 1, 1)).toBe(400);
    expect(starPixels(400, 2, 0.5)).toBe(300);
    expect(STAR_TIERS.map(t => t.detail)).toEqual([5, 4, 3, 3]);
    expect(starPixels(50, 1, 0.5)).toBe(96);
    expect(starPixels(2000, 2, 1)).toBe(1024);
  });
});
describe('AM-2 (E4): the honest line', () => {
  const able = {hardwareConcurrency: 10, deviceMemory: 8}, on = {webgl: true, failure: null, reducedMotion: false, software: false, hints: able, tier: 0} as const;
  it('says nothing while the star runs at its full pace, and nothing for a hidden tab', () => {
    expect(starWhy({...on, render: 'running', hud: 'full'})).toBeNull();
    expect(starWhy({...on, render: 'still', hud: 'paused'})).toBeNull();
  });
  it('names the one rule at work, the cause after the colon', () => {
    const line = (o: Partial<Parameters<typeof starWhy>[0]> & Pick<Parameters<typeof starWhy>[0], 'render' | 'hud'>) => starWhy({...on, ...o});
    expect(line({render: 'still', hud: 'still'})).toEqual({kind: 'still', code: 'motion-off', text: 'Still star: Motion is Off in ZIGoals'});
    expect(line({render: 'still', hud: 'still', reducedMotion: true})).toMatchObject({kind: 'still', code: 'reduced-motion', text: 'Still star: your device asks for reduced motion'});
    expect(line({render: 'running', hud: 'calm'})).toMatchObject({kind: 'slow', code: 'calm'});
    expect(line({render: 'running', hud: 'full', software: true})).toMatchObject({kind: 'slow', code: 'software'});
    expect(line({render: 'running', hud: 'full', hints: {...able, lowBattery: true}})).toMatchObject({kind: 'slow', code: 'battery', text: 'Slow star: battery below 20 %'});
    expect(line({render: 'running', hud: 'full', hints: {hardwareConcurrency: 2}})).toMatchObject({kind: 'slow', code: 'device'});
    expect(line({render: 'running', hud: 'full', tier: STAR_TIERS.length - 1})).toMatchObject({kind: 'slow', code: 'late'});
    expect(line({render: 'running', hud: 'full', tier: STAR_TIERS.length - 2})).toBeNull();
    expect(line({render: 'picture', hud: 'full', webgl: false})).toMatchObject({kind: 'picture', code: 'no-webgl'});
    for (const failure of ['compile', 'empty', 'lost'] as const) expect(line({render: 'picture', hud: 'full', failure})).toMatchObject({kind: 'picture', code: failure});
  });
  it('every line is one sentence that starts with what is shown, and none names a film or follows the pointer', () => {
    for (const [code, text] of Object.entries(STAR_WHY)) { expect(text, code).toMatch(/^(Still star|Slow star|Still picture): \S/); expect(text.length, code).toBeLessThanOrEqual(64); expect(text).not.toMatch(/Jarvis|Iron Man|Stark|pointer|mouse/i); }
  });
  it('a frame read back from the core counts as drawn only with light in it', () => {
    expect(drewSomething(new Uint8Array(64))).toBe(false);                       // transparent black: what an undefined ramp gave
    expect(drewSomething(new Uint8Array([0, 0, 0, 255, 2, 2, 2, 255]))).toBe(false); // opaque black is not a star either
    expect(drewSomething(new Uint8Array([0, 0, 0, 0, 251, 251, 255, 255]))).toBe(true);
    expect(drewSomething([])).toBe(false);
  });
});
describe('states, colours and the shader', () => {
  it('each state asks for exactly its own effect', () => {
    expect(STAR_STATE.idle).toMatchObject({listen: 0, think: 0, speak: 0});
    expect(STAR_STATE.listening.listen).toBe(1); expect(STAR_STATE.thinking.think).toBe(1); expect(STAR_STATE.speaking.speak).toBe(1);
    expect(STAR_STATE.thinking.spin).toBeGreaterThan(STAR_STATE.idle.spin);
  });
  it('the speaking pulse stays within 0–1', () => { for (let t = 0; t < 30; t += 0.07) { const p = speakPulse(t); expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThanOrEqual(1); } });
  it('colours parse, an unreadable one reads as the fallback; every accent has three', () => {
    expect(rgb('#ff0080', [0, 0, 0])).toEqual([1, 0, 128 / 255]);
    expect(rgb('nope', [0.1, 0.2, 0.3])).toEqual([0.1, 0.2, 0.3]);
    for (const a of ['violet', 'cyan', 'magenta', 'teal', 'gold']) expect(STAR_ACCENT[a]?.length).toBe(3);
  });
});
