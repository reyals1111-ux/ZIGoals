import {describe, expect, it} from 'vitest';
import {STAR_FRAG, STAR_UNIFORMS, STAR_VERT} from './star-shader';

/**
 * Session AM-2 (ADR-038 "AM-2", E1): the star's shader must mean the same on every graphics driver. In Session AM it
 * drew on software rendering and not on the owner's Apple graphics hardware: it leaned on behaviour the GLSL
 * specification leaves undefined. These rules keep such code out.
 */
const code = STAR_FRAG.replace(/\/\/[^\n]*/g, '');
describe('the star shader is portable', () => {
  it('every ramp goes through `up` or `dn`: `smoothstep` is called only there, with its edges in order', () => {
    const calls = [...code.matchAll(/smoothstep\(([^)]*)\)/g)].map(m => m[1]!.replace(/\s+/g, ''));
    expect(calls).toEqual(['lo,hi,x', 'lo,hi,x']);
    expect(code).toMatch(/float up\(float lo, float hi, float x\)\{ return smoothstep\(lo, hi, x\); \}/);
    expect(code).toMatch(/float dn\(float lo, float hi, float x\)\{ return 1\. - smoothstep\(lo, hi, x\); \}/);
  });
  it('every `up` and `dn` with number edges has the lower edge first (undefined otherwise)', () => {
    const ramps = [...code.matchAll(/\b(up|dn)\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,/g)];
    expect(ramps.length).toBeGreaterThan(30);
    for (const [call, , lo, hi] of ramps) expect(Number(lo), call).toBeLessThan(Number(hi));
  });
  it('has no `pow` (undefined for a negative base), no early loop exit, no `discard`', () => {
    expect(code).not.toMatch(/\bpow\s*\(/);
    expect(code).not.toMatch(/\bbreak\b|\bcontinue\b|\bdiscard\b/);
  });
  it('`atan` never sees (0, 0) and every `sqrt` and `log` has a guarded argument', () => {
    for (const [call, args] of [...code.matchAll(/\batan\(([^)]*)\)/g)]) expect(args, call).toMatch(/\+ 1e-5/);
    for (const [call, args] of [...code.matchAll(/\bsqrt\(([^;]*?)\)[;,* ]/g)]) expect(args, call).toMatch(/^(max\(|arm$)/);
    for (const [call, args] of [...code.matchAll(/\blog\(([^)]*)\)/g)]) expect(args, call).toMatch(/\+\s*\.\d+/);
  });
  it('asks for high precision only where the device has it, and writes premultiplied colour (never brighter than its alpha)', () => {
    expect(STAR_FRAG.startsWith('#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n')).toBe(true);
    expect(code).toMatch(/gl_FragColor = vec4\(min\(col, vec3\(alpha\)\), alpha\);/);
  });
  it('declares every uniform the component sets, and nothing follows the pointer', () => {
    for (const u of STAR_UNIFORMS) expect(STAR_FRAG, u).toMatch(new RegExp(`uniform (?:float|vec2|vec3) ${u};`));
    expect(STAR_FRAG).not.toMatch(/mouse|pointer|cursor/i);
    expect(STAR_VERT).toContain('gl_Position');
  });
});
