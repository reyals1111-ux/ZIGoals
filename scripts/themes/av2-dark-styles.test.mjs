import {describe, expect, it} from 'vitest';
import {buildAll, buildDarkStyle, bootScript, contrastOnBlack, CONTRAST_FILL_ON_WHITE, CONTRAST_LINE_ON_BLACK, CONTRAST_TEXT_ON_BLACK, DARK_STYLES, lighten, styleSelector, styleValue} from './build-themes.mjs';

// Session AV lane 2 (sync and appearance; LEDGER #34 Notion's high contrast, N6 #191 Loop's pure black): Dark's two
// styles, built from the Dark sheet. The contrast figures are WCAG 2 ratios on the sRGB colours the sheet writes.
const lum = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const SAMPLES = ['#f0f5ff', '#a4b2cd', '#7d8aa6', '#5b6478', '#23eaff', '#8b5cf6', '#ff4fd8', '#ffb547', '#3ddc97', '#ff5c7a', '#1b2a4a', '#0b1327', '#ffffff', '#000000'];
const one = (value, role, prop = 'color') => styleValue('contrast', prop, value, role);

describe('High contrast: the rule by role', () => {
  it('every word reaches 15:1 on black (AAA asks 7:1), opaque, whatever colour it was', () => {
    expect(CONTRAST_TEXT_ON_BLACK).toBe(15);
    for (const c of SAMPLES) { const out = one(c, 'text'); expect(ratio(out, '#000000'), `${c} → ${out}`).toBeGreaterThanOrEqual(15); expect(out).toMatch(/^#[0-9a-f]{6}$/); }
    expect(one('#ffffff80', 'text')).toBe('#ffffff');
  });
  it('a coloured fill is deepened until white reaches 10:1 on it, so every word above still reaches 7:1 on it; a neutral or night panel is black; a tint keeps at most a quarter', () => {
    expect(CONTRAST_FILL_ON_WHITE).toBe(10);
    for (const c of ['#23eaff', '#8b5cf6', '#ff4fd8', '#ffb547', '#3ddc97']) {
      const fill = one(c, 'surface', 'background-color');
      expect(ratio('#ffffff', fill), `${c} → ${fill}`).toBeGreaterThanOrEqual(10);
      for (const word of SAMPLES) expect(ratio(one(word, 'text'), fill), `${word} on ${fill}`).toBeGreaterThanOrEqual(7);
    }
    for (const c of ['#0b1327', '#11141b', '#ffffff', '#f0f5ff']) expect(one(c, 'surface', 'background-color')).toBe('#000000');
    expect(one('#ffffff14', 'surface', 'background-color')).toBe('#ffffff14');
    const tint = one('#ff4fd866', 'surface', 'background-color');
    expect(parseInt(tint.slice(7, 9), 16) / 255).toBeLessThanOrEqual(0.25 + 1 / 255);
  });
  it('lines and icons reach 7:1 on black and are opaque; a transparent line stays transparent; glows are halved', () => {
    expect(CONTRAST_LINE_ON_BLACK).toBe(7);
    for (const c of ['#8ab9ff1f', '#5b6478', '#8b5cf6', '#1b2a4a']) { const out = one(c, 'border', 'border-color'); expect(ratio(out, '#000000'), out).toBeGreaterThanOrEqual(7); expect(out).toMatch(/^#[0-9a-f]{6}$/); }
    expect(one('#00000000', 'border', 'border-color')).toBe('#00000000');
    for (const c of ['#23eaff', '#5b6478']) expect(ratio(one(c, 'graphic', 'fill').slice(0, 7), '#000000')).toBeGreaterThanOrEqual(7);
    expect(one('0 0 24px #8b5cf680', 'shadow', 'box-shadow')).toBe('0 0 24px #8b5cf640');
  });
  it('a colour set at run time is mixed with white for a word, a line or an icon, with black for a fill; tokens and lists stay', () => {
    expect(one('var(--area)', 'text')).toBe('color-mix(in srgb, var(--area) 25%, #fff)');
    expect(one('var(--area)', 'border', 'border-color')).toBe('color-mix(in srgb, var(--area) 40%, #fff)');
    expect(one('var(--area)', 'surface', 'background-color')).toBe('color-mix(in srgb, var(--area) 30%, #000)');
    expect(one('var(--area)', 'surface', 'background-image')).toBe('var(--area)');
    expect(one('var(--a), var(--b)', 'text')).toBe('var(--a), var(--b)');
    expect(styleValue('contrast', '--text', 'var(--white)', 'text')).toBe('var(--white)');
    // The worst case of a mixed word: a black run-time colour still reads ≥ 7:1 on black (25 % of black, 75 % white).
    expect(ratio('#bfbfbf', '#000000')).toBeGreaterThanOrEqual(7);
  });
  it('gradient words become plain words: no flow, the letters in their own colour', () => {
    expect(one('linear-gradient(90deg, #23eaff, #ff4fd8)', 'gradientText', 'background-image')).toBe('none');
    expect(one('#23eaff', 'gradientText', 'background-color')).toBe('transparent');
    expect(one('transparent', 'text', '-webkit-text-fill-color')).toBe('currentcolor');
  });
  it('lighten keeps the hue and reaches its target', () => {
    const c = {L: 0.5, C: 0.15, h: 2, a: 1};
    expect(contrastOnBlack(lighten(c, 9))).toBeGreaterThanOrEqual(9);
    expect(lighten(c, 9).h).toBe(2);
  });
});

describe('Pure black: only the night\'s neutral panels change', () => {
  it('the ground goes to black, a card to a near-black that still tells it from the page; colours, words and lines stay', () => {
    expect([...DARK_STYLES.black.roles]).toEqual(['surface']);
    expect(styleValue('black', 'background-color', '#08090c', 'surface')).toBe('#000000');
    const card = styleValue('black', 'background-color', '#2a2d33', 'surface');
    expect(card).not.toBe('#000000'); expect(ratio(card, '#000000')).toBeLessThan(ratio('#2a2d33', '#000000'));
    expect(styleValue('black', 'background-color', '#8b5cf6', 'surface')).toBe('#8b5cf6');
    expect(styleValue('black', 'color', '#a4b2cd', 'text')).toBe('#a4b2cd');
  });
});

describe('the sheets: built from the Dark sheet, never reaching another theme or Dark itself', () => {
  const DARK = `/* x */
@scope (:root[data-theme=dark]) {
  .card:not(#\\-) { background-color: #0b1327; color: #a4b2cd; padding: 4px; }
  .chip.on:not(#\\-)::before { border-color: #8b5cf6; }
  @media (min-width: 700px) { .row:not(#\\-) { color: var(--muted); } }
}
@keyframes pulse { from { color: #23eaff; } }
:root[data-theme=dark] body:not(#\\-):not(#\\-) { background: #06090e; opacity: 1; }
.not-dark { color: #fff; }`;
  it('every rule keeps its place with the style\'s attribute and one more id; only colour declarations of the style\'s roles; no keyframes; nothing outside Dark', () => {
    const built = buildDarkStyle('contrast', DARK), css = built.slice(0, built.indexOf('/* apps/web/themes/'));
    expect(built).toContain('/* apps/web/themes/dark-contrast.extra.css */');
    expect(css).toContain('@scope (:root[data-theme=dark][data-dark-style=contrast])');
    expect(css).toMatch(/\.card:not\(#\\-\):not\(#\\-\) \{ background-color: #000000; color: #[0-9a-f]{6}; \}/);
    expect(css).not.toContain('padding'); expect(css).not.toContain('opacity: 1'); expect(css).not.toContain('@keyframes'); expect(css).not.toContain('.not-dark');
    expect(css).toContain('.chip.on:not(#\\-):not(#\\-)::before');
    expect(css).toMatch(/@media \(min-width: 700px\) \{\s*\.row:not\(#\\-\):not\(#\\-\) \{ color: color-mix\(in srgb, var\(--muted\) 25%, #fff\); \}/);
    expect(css).toContain(':root[data-theme=dark][data-dark-style=contrast] body:not(#\\-):not(#\\-):not(#\\-) { background: #000000');
    const black = buildDarkStyle('black', DARK).split('/* apps/web/themes/')[0];
    expect(black).toContain(`.card:not(#\\-):not(#\\-) { background-color: ${styleValue('black', 'background-color', '#0b1327', 'surface')}; }`);
    expect(black).toContain('body:not(#\\-):not(#\\-):not(#\\-) { background: #000000; }');
    expect(black).not.toMatch(/color: #a4b2cd|border-color/);
    expect(styleSelector('.a, .b::after', 'black', true)).toBe('.a:not(#\\-), .b:not(#\\-)::after');
    expect(styleSelector(':root[data-theme=dark] .a, .b', 'black', false)).toBe(':root[data-theme=dark][data-dark-style=black] .a:not(#\\-)');
  });
  it('the early script adds the style\'s sheet with Dark only, from its own record, and nothing for another word', () => {
    const boot = bootScript({light: '/l.css', dark: '/d.css'}, {text: '/t.css', density: '/c.css'}, {black: '/themes/dark-black.css', contrast: '/themes/dark-contrast.css'});
    const run = stored => { const attrs = new Map(), links = []; const doc = {documentElement: {setAttribute: (k, v) => attrs.set(k, v), removeAttribute: k => attrs.delete(k)}, head: {appendChild: l => links.push(l)}, createElement: () => { const a = new Map(); return {attrs: a, setAttribute: (k, v) => a.set(k, v), remove() {}}; }}; new Function('document', 'localStorage', 'setTimeout', boot)(doc, {getItem: () => stored}, () => 0); return {attrs, links}; };
    const hc = run(JSON.stringify({version: 1, theme: 'dark', look: {darkStyle: 'contrast'}}));
    expect(hc.attrs.get('data-dark-style')).toBe('contrast');
    expect(hc.links.map(l => [l.id, l.href])).toEqual([['zigoals-theme-sheet', '/d.css'], ['zigoals-dark-style-sheet', '/themes/dark-contrast.css']]);
    for (const stored of [{version: 1, theme: 'light', look: {darkStyle: 'contrast'}}, {version: 1, look: {darkStyle: 'black'}}, {version: 1, theme: 'dark', look: {darkStyle: 'constructor'}}, {version: 1, theme: 'dark', look: {darkStyle: 'neon'}}]) expect(run(JSON.stringify(stored)).attrs.has('data-dark-style'), JSON.stringify(stored)).toBe(false);
    const serif = run(JSON.stringify({version: 1, look: {font: 'serif'}}));
    expect(serif.attrs.get('data-font')).toBe('serif');
    expect(run(JSON.stringify({version: 1, look: {font: 'comic'}})).attrs.has('data-font')).toBe(false);
    expect(boot).not.toMatch(/innerHTML|outerHTML|document\.write|eval\(|new Function|\.src\s*=|https?:/);
  });
});

describe('the real sheets (built in memory from today\'s CSS)', () => {
  const {darkStyles, module: sheetModule} = buildAll();
  const top = text => { const out = []; let depth = 0, start = 0; const t = text.replace(/\/\*[\s\S]*?\*\//g, ''); for (let i = 0; i < t.length; i++) { if (t[i] === '{') { if (!depth) out.push(t.slice(start, i).trim()); depth++; } else if (t[i] === '}') { depth--; if (!depth) start = i + 1; } } return out; };
  it('every rule names its style on <html> (so Nebula, Light and Dark are untouched)', () => {
    for (const style of ['black', 'contrast']) for (const head of top(darkStyles[style])) expect(head.startsWith(`@scope (:root[data-theme=dark][data-dark-style=${style}])`) || head.split(/,(?![^(]*\))/).every(part => part.includes(`[data-dark-style=${style}]`)), head.slice(0, 160)).toBe(true);
    expect(sheetModule).toMatch(/export const DARK_STYLE_SHEETS = \{black: '\/themes\/dark-black\.css\?v=[0-9a-f]{12}', contrast: '\/themes\/dark-contrast\.css\?v=[0-9a-f]{12}'\} as const;/);
  });
  it('High contrast: every literal word colour it writes reaches 7:1 on black (AAA)', () => {
    const decls = [...darkStyles.contrast.matchAll(/(?:^|[;{\s])(color|-webkit-text-fill-color|caret-color):\s*([^;}]+)/g)];
    expect(decls.length).toBeGreaterThan(500);
    for (const [, prop, value] of decls) for (const hex of value.match(/#[0-9a-f]{6}(?:[0-9a-f]{2})?\b/g) ?? []) {
      if (hex.length === 9 && hex.endsWith('00')) continue;
      expect(ratio(hex.slice(0, 7), '#000000'), `${prop}: ${value}`).toBeGreaterThanOrEqual(7);
    }
  });
});
