import {describe, expect, it} from 'vitest';
import {GOVERNOR_GRACE_MS, governorStep, REST_AFTER_MS, rgb, SLOW_FRAMES, softwareRenderer, speakPulse, STAR_ACCENT, STAR_STATE, STAR_TIERS, starPace, starPixels, starRender, VERY_LATE_WEIGHT} from './governor';
import {STAR_FRAG, STAR_UNIFORMS, STAR_VERT} from './star-shader';

/** Session AM (ADR-038 D10, D11, A7): the centre node's rules. */
describe('starRender: running, one still frame, or the SVG orb', () => {
  const able = {hardwareConcurrency: 8, deviceMemory: 8};
  it('falls back to the SVG orb without WebGL, after a failure, with Save-Data or a low battery', () => {
    expect(starRender({hud: 'full', webgl: false, hints: able, failed: false})).toBe('orb');
    expect(starRender({hud: 'full', webgl: true, hints: able, failed: true})).toBe('orb');
    // A7: a browser that draws WebGL in software gets one still frame per state (never a running star), in Calm too;
    // the orb's own reasons still lead.
    expect(starRender({hud: 'full', webgl: true, hints: able, failed: false, software: true})).toBe('still');
    expect(starRender({hud: 'calm', webgl: true, hints: able, failed: false, software: true})).toBe('still');
    expect(starRender({hud: 'full', webgl: true, hints: able, failed: false, software: false})).toBe('running');
    expect(starRender({hud: 'full', webgl: true, hints: {...able, saveData: true}, failed: false, software: true})).toBe('orb');
    // The renderer's own name is the second witness (headless Chromium grants a context on SwiftShader without a caveat).
    for (const name of ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)', 'llvmpipe (LLVM 15.0.7, 256 bits)', 'softpipe', 'Microsoft Basic Render Driver', 'Software Rasterizer']) expect(softwareRenderer(name), name).toBe(true);
    for (const name of ['ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)', 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)', 'Mali-G78', 'Adreno (TM) 740', '', null, undefined]) expect(softwareRenderer(name), String(name)).toBe(false);
    expect(starRender({hud: 'full', webgl: true, hints: {...able, saveData: true}, failed: false})).toBe('orb');
    expect(starRender({hud: 'full', webgl: true, hints: {...able, lowBattery: true}, failed: false})).toBe('orb');
  });
  it('is one still frame under Motion Off / reduced motion, while hidden, and on a very small device', () => {
    expect(starRender({hud: 'still', webgl: true, hints: able, failed: false})).toBe('still');
    expect(starRender({hud: 'paused', webgl: true, hints: able, failed: false})).toBe('still');
    expect(starRender({hud: 'full', webgl: true, hints: {hardwareConcurrency: 2}, failed: false})).toBe('still');
    expect(starRender({hud: 'full', webgl: true, hints: {deviceMemory: 2}, failed: false})).toBe('still');
  });
  it('runs under Full and Calm on an able device (a browser that says nothing counts as able)', () => {
    expect(starRender({hud: 'full', webgl: true, hints: able, failed: false})).toBe('running');
    expect(starRender({hud: 'calm', webgl: true, hints: {}, failed: false})).toBe('running');
    expect(starRender({hud: 'full', webgl: true, hints: {hardwareConcurrency: 4}, failed: false})).toBe('running');
  });
});
describe('starPace: active, resting, calm', () => {
  it('rests when the window is not focused or after a minute without a key, tap or request', () => {
    expect(starPace({hud: 'full', state: 'idle', focused: true, idleMs: 0, phone: false})).toEqual({mode: 'active', fps: 30, scale: 1, speed: 1});
    expect(starPace({hud: 'full', state: 'idle', focused: false, idleMs: 0, phone: false})).toMatchObject({mode: 'resting', fps: 6, scale: 1}); // Session AM (design review AM-D16, deliberate): rest slows the frames, never the sharpness (was scale 0.5)
    expect(starPace({hud: 'full', state: 'idle', focused: true, idleMs: REST_AFTER_MS, phone: false}).mode).toBe('resting');
  });
  it('never rests while NOVA listens, thinks or speaks', () => {
    for (const state of ['listening', 'thinking', 'speaking'] as const) expect(starPace({hud: 'full', state, focused: false, idleMs: 9e9, phone: false}).mode).toBe('active');
  });
  it('Calm is slower and fewer; a phone is lighter', () => {
    expect(starPace({hud: 'calm', state: 'thinking', focused: true, idleMs: 0, phone: false})).toEqual({mode: 'calm', fps: 12, scale: 1, speed: 1 / 3}); // AM-D16, deliberate: Calm keeps the resolution (was 0.8)
    expect(starPace({hud: 'full', state: 'idle', focused: true, idleMs: 0, phone: true})).toMatchObject({fps: 24, scale: 0.7});
  });
});
describe('the governor', () => {
  it('steps down one tier after a run of late frames, and never past the still frame', () => {
    let g = {tier: 0, late: 0};
    for (let i = 0; i < SLOW_FRAMES - 1; i++) { g = governorStep(g.tier, g.late, 80, 30); expect(g.tier).toBe(0); }
    g = governorStep(g.tier, g.late, 80, 30);
    expect(g).toEqual({tier: 1, late: 0});
    for (let i = 0; i < SLOW_FRAMES * 9; i++) g = governorStep(g.tier, g.late, 400, 30);
    expect(g.tier).toBe(STAR_TIERS.length - 1);
    expect(STAR_TIERS.at(-1)).toMatchObject({still: true});
  });
  it('a device that cannot keep up at all reaches the still frame within nine frames (CPU 4× on software rendering)', () => {
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
    expect(starPixels(400, 3, 1, 0)).toBe(600);
    // AM-D16, deliberate: the third tier is three quarters of the resolution (was half); the still frame is drawn at full quality.
    expect(starPixels(400, 1, 0.5, 2)).toBe(150);
    expect(starPixels(400, 1, 1, 1)).toBe(400);
    expect(starPixels(400, 2, 1, STAR_TIERS.length - 1)).toBe(600);
    expect(STAR_TIERS.map(t => t.detail)).toEqual([5, 4, 3, 5]);
    expect(starPixels(50, 1, 0.5, 2)).toBe(96);
    expect(starPixels(2000, 2, 1, 0)).toBe(1024);
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
  it('the shader declares every uniform the component sets, and nothing follows the pointer', () => {
    for (const u of STAR_UNIFORMS) expect(STAR_FRAG, u).toMatch(new RegExp(`uniform (?:float|vec2|vec3) ${u};|uniform [a-z0-9]+ [^;]*\\b${u}\\b`));
    expect(STAR_FRAG).not.toMatch(/mouse|pointer|cursor/i);
    expect(STAR_VERT).toContain('gl_Position');
  });
});
