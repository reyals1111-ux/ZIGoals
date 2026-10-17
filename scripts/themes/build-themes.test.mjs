import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildAll, boostSelector, mapValue, MAPS} from './build-themes.mjs';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'apps', 'web');

describe('Session AD Part 3: the generated theme sheets (ADR-026 F13)', () => {
  const {sheets, module: sheetModule, boot} = buildAll();
  it('are what the generator builds from today’s CSS (run node scripts/themes/build-themes.mjs after a CSS change)', () => {
    expect(readFileSync(join(WEB, 'public', 'themes', 'light.css'), 'utf8')).toBe(sheets.light);
    expect(readFileSync(join(WEB, 'public', 'themes', 'dark.css'), 'utf8')).toBe(sheets.dark);
    expect(readFileSync(join(WEB, 'lib', 'ui-prefs', 'theme-sheets.ts'), 'utf8')).toBe(sheetModule);
    expect(readFileSync(join(WEB, 'public', 'theme-boot.js'), 'utf8')).toBe(boot);
  });
  it('never touch Nebula: every generated rule is inside its theme’s scope, or names the theme on <html>', () => {
    for (const theme of ['light', 'dark']) {
      const text = sheets[theme].replace(/\/\*[\s\S]*?\*\//g, '');
      const top = []; let depth = 0, start = 0;
      for (let i = 0; i < text.length; i++) { if (text[i] === '{') { if (!depth) top.push(text.slice(start, i).trim()); depth++; } else if (text[i] === '}') { depth--; if (!depth) start = i + 1; } }
      for (const head of top) expect(head.startsWith(`@scope (:root[data-theme=${theme}])`) || head.includes(`[data-theme=${theme}]`), head.slice(0, 120)).toBe(true);
    }
  });
  it('Light keeps the cosmic islands dark: the scope stops at them and they keep the nebula tokens', () => {
    expect(sheets.light).toMatch(/@scope \(:root\[data-theme=light\]\) to \(\.today-hero, \.site-footer, \.app-sidebar/);
    expect(sheets.light).toMatch(/:root\[data-theme=light\] :is\(\.today-hero[^)]*\) \{[^}]*--text: #f/);
  });
  it('one weight for every override, before any pseudo-element', () => {
    expect(boostSelector('.a .b::before, :root .c')).toBe('.a .b:not(#\\-)::before, :scope .c:not(#\\-)');
    expect(boostSelector('html[data-x] .d:hover')).toBe(':scope[data-x] .d:hover:not(#\\-)');
  });
  it('maps by role: light words become dark ink, dark surfaces become light, accents stay as fills', () => {
    const lum = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const ink = mapValue('#f0f5ff', 'text', 'light'), muted = mapValue('#a4b2cd', 'text', 'light'), cyan = mapValue('#23eaff', 'text', 'light'), panel = mapValue('#0d1629', 'surface', 'light');
    for (const text of [ink, muted, cyan]) expect(contrast(text, panel)).toBeGreaterThanOrEqual(4.5);
    expect(mapValue('#16d9ed', 'surface', 'light')).not.toBeNull();
    expect(MAPS.dark.text).toBeTypeOf('function');
    expect(mapValue('#f0f5ff', 'text', 'dark')).toBeNull();
  });
});
