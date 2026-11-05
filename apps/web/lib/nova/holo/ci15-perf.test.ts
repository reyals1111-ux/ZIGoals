import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {MOTES_FPS} from './motes';

/**
 * CI15 (hud-perf at CPU 4×, 30 fps on CI): in software compositing every frame an ornament, the orb's breath or a shimmer
 * changed, the compositor redrew it, and inside a glass panel that re-ran the panel's backdrop blur. The slow motions now
 * change only as often as the eye needs (sub-pixel steps), the motes redraw 12 times a second, and the frames between
 * draw nothing. These guards keep the cadence; tests/grok53/hud/hud-perf.spec.ts measures the frames.
 */
const read = (path: string) => readFileSync(join(__dirname, path), 'utf8');
const parts = read('../../../components/nova/holo/holo-parts.css'), holo = read('../../../components/nova/holo/holo.css'), orb = read('../../../components/nova/orb.css');
const canvas = read('../../../components/nova/holo/motes-canvas.tsx');

describe('the HUD redraws only as often as its slow motions need (CI15)', () => {
  it('turning ornaments step: under half a pixel a step, at most 16 a second, the same 90 s and 270 s turns', () => {
    for (const [scope, full, calm] of [['.nova-widget', 720, 2160], ['.holo-core', 1440, 4320]] as const) {
      expect(parts).toContain(`.nova-frame[data-hud-motion=full] ${scope} :is(.holo-orn, .holo-lens) { animation-timing-function: steps(${full}); }`);
      expect(parts).toContain(`.nova-frame[data-hud-motion=calm] ${scope} :is(.holo-orn, .holo-lens) { animation-timing-function: steps(${calm}); }`);
      expect(full / 90).toBeLessThanOrEqual(16); expect(calm / 270).toBe(full / 90);
    }
    expect(parts).toMatch(/\.nova-frame\[data-hud-motion=full\] :is\(\.holo-orn, \.holo-lens\) \{ animation: holo-spin 90s linear infinite;/);
    expect(parts).toMatch(/\.nova-frame\[data-hud-motion=calm\] :is\(\.holo-orn, \.holo-lens\) \{ animation: holo-spin 270s linear infinite;/);
  });
  it('the shimmer crosses in 30 steps a second on the same path (the 2% keyframe is where the linear pass was)', () => {
    const kf = holo.match(/@keyframes holo-sheen \{[^\n]*\}/)?.[0] ?? '';
    expect(kf).toContain('0% { transform: translateX(-140%) skewX(-18deg); opacity: 0; animation-timing-function: steps(8); }');
    expect(kf).toContain('2% { transform: translateX(-53.333%) skewX(-18deg); opacity: 1; animation-timing-function: steps(42); }');
    expect(kf).toContain('12% { transform: translateX(380%) skewX(-18deg); opacity: 0; }');
    expect((14 * 0.02) / 8).toBeCloseTo(1 / 30, 2); expect((14 * 0.1) / 42).toBeCloseTo(1 / 30, 2);
    expect(-140 + 520 * (2 / 12)).toBeCloseTo(-53.333, 3);
  });
  it('the orb breathes the same eased curve in steps of 1/15 s', () => {
    const kf = orb.match(/@keyframes nova-orb-breathe-whole \{[^\n]*\}/)?.[0] ?? '';
    const stops = [...kf.matchAll(/([\d.]+)% \{ transform: scale\(([\d.]+)\); opacity: ([\d.]+);/g)].map(m => ({at: Number(m[1]) / 100, scale: Number(m[2]), opacity: Number(m[3])}));
    expect(stops).toHaveLength(17);
    // ease-in-out (cubic-bezier(.42, 0, .58, 1)) from scale 1 / opacity .94 at 0% to 1.025 / 1 at 50%, and back.
    const ease = (x: number) => { let lo = 0, hi = 1; for (let i = 0; i < 60; i++) { const t = (lo + hi) / 2, bx = 3 * (1 - t) ** 2 * t * 0.42 + 3 * (1 - t) * t * t * 0.58 + t ** 3; if (bx < x) lo = t; else hi = t; } const t = (lo + hi) / 2; return 3 * (1 - t) * t * t + t ** 3; };
    for (const s of stops) { const p = ease(s.at <= 0.5 ? s.at * 2 : (1 - s.at) * 2); expect(s.scale).toBeCloseTo(1 + 0.025 * p, 3); expect(s.opacity).toBeCloseTo(0.94 + 0.06 * p, 3); }
    expect(kf.match(/steps\(6\)/g)).toHaveLength(16);
    expect(orb).toContain('.nova-orb[data-state=idle] { animation: nova-orb-breathe-whole 6.4s ease-in-out infinite; }');
  });
  it('the motes redraw 12 times a second from a timer, with no animation-frame loop in between', () => {
    expect(MOTES_FPS).toBe(12);
    expect(canvas).toMatch(/window\.setTimeout\(\(\) => \{ if \(!stopped\) frame = requestAnimationFrame\(loop\); \}, 1000 \/ MOTES_FPS\)/);
    expect(canvas).toMatch(/window\.clearTimeout\(wait\)/);
    expect(canvas).not.toMatch(/SKY_FPS/);
  });
});
