import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';

/**
 * Session AM-2 (the critic's Goals HUD; tests/grok53/hud/hud-fit.spec.ts): the pace box shows whenever the arcs and the
 * pace box truly fit, and is hidden only when they cannot. The sheet's own thresholds are read here and checked against
 * the arithmetic written beside them (holo-parts.css, "Goals"), so a threshold cannot drift from its sum.
 */
const css = readFileSync(fileURLToPath(new URL('../../../components/nova/holo/holo-parts.css', import.meta.url)), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
type Box = {w: number; h: number};
/** Does a `holo-body` condition ("(max-height: 198.98px) and (max-width: 399.98px)") hold for a body of this size? */
function holds(condition: string, {w, h}: Box): boolean {
  return [...condition.matchAll(/\((min|max)-(width|height):\s*([\d.]+)px\)/g)].every(([, bound, axis, px]) => {
    const size = axis === 'width' ? w : h;
    return bound === 'min' ? size >= Number(px) : size <= Number(px);
  });
}
/** The container rules that hide the medium Goals panel's pace box. */
const HIDES = [...css.matchAll(/@container holo-body ([^{]+)\{([^@]*?\.holo-goals\[data-size=M\] \.holo-pace-box \{ display: none; \}[^@]*?)\}\s*(?=\n|$)/g)].map(m => m[1]!.trim());
const paceShown = (box: Box) => !HIDES.some(c => holds(c, box));
const clamp = (lo: number, v: number, hi: number) => Math.max(lo, Math.min(v, hi));

describe('Goals HUD, medium: the pace box shows whenever it fits (Session AM-2)', () => {
  it('finds the sheet\'s hide rules: two for a stacked panel, one for a wide one', () => {
    expect(HIDES).toEqual(['(max-height: 198.98px) and (max-width: 399.98px)', '(max-height: 175.98px) and (min-width: 400px) and (max-width: 559.98px)', '(max-height: 110.98px) and (min-width: 560px)']);
  });
  it('hud-fit: at 1440 × 900 the medium body is 316 × 238 px and the pace line is in view (the old rule hid it under 256 px)', () => {
    expect(paceShown({w: 316, h: 238})).toBe(true);
    expect(css).not.toContain('(max-width: 319.98px) and (max-height: 255px)');
  });
  it('the thresholds are where the sums put them', () => {
    expect([paceShown({w: 316, h: 199}), paceShown({w: 316, h: 198})]).toEqual([true, false]);
    expect([paceShown({w: 420, h: 176}), paceShown({w: 420, h: 175})]).toEqual([true, false]);
    expect([paceShown({w: 730, h: 111}), paceShown({w: 730, h: 110})]).toEqual([true, false]);
  });
  it('stacked, under 400 px wide: with every line that can wrap wrapped, the arcs and the pace box fit in the body', () => {
    expect(css).toContain('.holo-goals[data-size=M] { --arc: clamp(44px, min(100cqh - 155px, calc((100cqi - 16px) / 3)), 132px); --pace-h: 36px; }');
    for (let w = 240; w < 400; w += 4) for (let h = 199; h <= 420; h++) {
      const arc = clamp(44, Math.min(h - 155, (w - 16) / 3), 132);
      // the arcs' row (a name of two lines, status words of two) + the gap + the pace box at its smallest (a plot of 18, an estimate of two lines)
      const tallest = (arc + 28 + 32 + 2) + 6 + (18 + 3 + 18 + 3 + 45);
      expect(tallest, `${w} × ${h}`).toBeLessThanOrEqual(h);
    }
  });
  it('stacked, from 400 px wide: one-line words with 16 px in hand', () => {
    expect(css).toContain('@container holo-body (min-width: 400px) { .holo-goals[data-size=M] { --arc: clamp(44px, min(100cqh - 132px, calc((100cqi - 16px) / 3)), 132px); } }');
    for (let w = 400; w < 560; w += 4) for (let h = 176; h <= 420; h++) {
      const arc = clamp(44, Math.min(h - 132, (w - 16) / 3), 132);
      expect((arc + 28 + 16 + 2) + 6 + (18 + 3 + 18 + 3 + 22) + 16, `${w} × ${h}`).toBeLessThanOrEqual(h);
    }
  });
  it('at 316 × 238 the arcs are 83 px and the plot gets what is left: 57 px (41 when a status wraps)', () => {
    const arc = clamp(44, Math.min(238 - 155, (316 - 16) / 3), 132);
    expect(arc).toBe(83);
    expect(238 - (arc + 28 + 16 + 2) - 6 - (18 + 3 + 3 + 22)).toBe(57);
    expect(238 - (arc + 28 + 32 + 2) - 6 - (18 + 3 + 3 + 22)).toBe(41);
  });
  it('below the thresholds the arcs stand alone and still fit (their tallest: a name and a status of two lines each)', () => {
    for (const [w, top] of [[316, 198], [420, 175]] as const) for (let h = 119; h <= top; h++) {
      const arc = clamp(40, Math.min(h - 64, (w - 16) / 3), 132);
      expect(arc + 28 + 32 + 2, `${w} × ${h}`).toBeLessThanOrEqual(Math.max(h, 40 + 62));
    }
  });
  it('wide: the pace column is 45 % of the body, its title one line, its plot the elastic row', () => {
    expect(css).toContain('.holo-goals[data-size=M] { grid-template-columns: minmax(0, 11fr) minmax(0, 9fr);');
    expect(css).toContain('.holo-goals:is([data-size=M], [data-size=L]) .holo-pace-chart { flex: 1 1 0; height: auto; min-height: 24px; max-height: 420px; margin-bottom: 18px; }');
    // The title is no longer allowed two lines.
    expect(css).not.toMatch(/\.holo-pace-name \{[^}]*white-space: normal/);
    // A wide body of 730 × 195 (2560 × 1440): the column is 317 px, the plot 253 × 108 with an estimate of two lines.
    expect(Math.round((730 - 26) * 9 / 20)).toBe(317);
    expect(195 - 18 - 3 - 18 - 3 - 45).toBe(108);
    // The arcs' three columns fit their 55 %: 18.3cqi − 13 px each.
    for (let w = 560; w <= 1200; w += 20) expect(3 * (18.3 * w / 100 - 13 + 4) + 12).toBeLessThanOrEqual((w - 26) * 11 / 20 + 0.5);
  });
});
