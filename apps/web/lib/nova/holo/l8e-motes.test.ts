import {afterEach, describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {countHudFrame, motesPlan} from './motes';

/**
 * Session AL lane L8e (hud-perf at CPU 4×): the motes draw on their own canvas in the star's column, never on the sky canvas
 * under the glass panels (a frame there made every panel's backdrop blur run again: 20 fps), and only while they may move.
 */
const read = (path: string) => readFileSync(join(__dirname, path), 'utf8');

describe('motes plan (lane L8e)', () => {
  it('runs only in Full motion, on a device that allows them, in a tab in front; otherwise the canvas is blank', () => {
    expect(motesPlan({on: true, allowed: true, hidden: false})).toBe('run');
    expect(motesPlan({on: false, allowed: true, hidden: false})).toBe('blank');
    expect(motesPlan({on: true, allowed: false, hidden: false})).toBe('blank');
    expect(motesPlan({on: true, allowed: true, hidden: true})).toBe('blank');
  });
});

describe('the HUD frame counter the motion specs read', () => {
  afterEach(() => { delete (globalThis as {window?: unknown}).window; });
  it('counts each drawn frame on the window, and does nothing without one', () => {
    expect(() => countHudFrame()).not.toThrow();
    const w: {__zgHudFrames?: number} = {};
    (globalThis as {window?: unknown}).window = w;
    countHudFrame(); countHudFrame();
    expect(w.__zgHudFrames).toBe(2);
  });
});

describe('where the motes ride (lane L8e)', () => {
  it('the sky canvas under the glass draws no mote; the motes canvas sits in the star\'s column, behind the star', () => {
    const sky = read('../../../components/nova/starfield.tsx'), grid = read('../../../components/nova/widget-grid.tsx'), css = read('../../../components/nova/holo/holo.css');
    expect(sky).not.toMatch(/makeMotes|moteAt|drawMotes/);
    expect(grid).toMatch(/<div className="nova-orbit-centre">[^\n]*\{dust\}\{stage\}/);
    expect(grid).toMatch(/<div className="nova-bento-hero">\{dust\}\{stage\}/);
    expect(grid).toMatch(/<div className="nova-focus-hero">\{dust\}\{stage\}/);
    expect(css).toMatch(/\.holo-motes \{[^}]*position: absolute;[^}]*z-index: 0;[^}]*pointer-events: none;/);
    expect(css).toMatch(/\.nova-orbit-centre > \.nova-stage \{ z-index: 1; \}/);
  });
});
