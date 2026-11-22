import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Session AV lane 2 (fixb3): a ==highlight== keeps AA contrast in every theme. Its background mixes the colour into the
 * page; inheriting the muted colour around it, Dark's yellow read 3.97:1 (#a4b2cd on #584c25), so the words take the
 * theme's own text colour (--text: #f0f5ff in Dark, 7.7:1 there; #0c0f16 in Light).
 */
const css = readFileSync(join(__dirname, '..', '..', 'components', 'notes', 'notes.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const channel = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255); };
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number]; return (x + 0.05) / (y + 0.05); };
describe('note highlights', () => {
  it('take the theme’s own text colour, not the muted colour around them', () => {
    expect(css).toMatch(/\.note-hl \{[^}]*color: var\(--text, currentColor\)/);
    expect(css).not.toMatch(/\.note-hl \{[^}]*color: inherit/);
  });
  it('read at AA on Dark’s yellow mix with that colour, where the muted one did not', () => {
    expect(ratio('#a4b2cd', '#584c25')).toBeLessThan(4.5);
    expect(ratio('#f0f5ff', '#584c25')).toBeGreaterThanOrEqual(4.5);
  });
});
