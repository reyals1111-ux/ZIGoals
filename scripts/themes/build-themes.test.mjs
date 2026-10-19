import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildAll, boostSelector, colourLonghands, mapValue, MAPS, ISLANDS, NEUTRAL_CHROMA, NIGHT_L, NIGHT_CHROMA, TEXT_CONTRAST, GRADIENT_TEXT_CONTRAST} from './build-themes.mjs';
import * as parity from '../../apps/web/tests/parity/classify.ts';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'apps', 'web');
// OKLCH of a #rrggbb colour (the generator's own maths, re-done here so the test reads the value it produced).
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
function oklch(hex) {
  const [R, G, B] = [1, 3, 5].map(i => lin(parseInt(hex.slice(i, i + 2), 16)));
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return {L, C: Math.hypot(A, Bb), h: (Math.atan2(Bb, A) * 180 / Math.PI + 360) % 360};
}
const onWhite = hex => { const [r, g, b] = [1, 3, 5].map(i => lin(parseInt(hex.slice(i, i + 2), 16))); return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05); };

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
    // Session AE (Part 3.3, ADR-027): the sidebar and the theme bar take Light's colours; the sidebar's planet foot stays night.
    expect(sheets.light).toMatch(/@scope \(:root\[data-theme=light\]\) to \(\.today-hero, \.site-footer, \.sidebar-destination/);
    expect(sheets.light).not.toMatch(/@scope \(:root\[data-theme=light\]\) to \([^)]*(\.app-sidebar|\.theme-switch-wrap)/);
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
    // Session AF (L5a, Part 10.2, ADR-028 H13): an accent stays the same fill by day — no deeper matte version any more
    // (AE asserted the opposite, `not.toBeNull()`: the matte mapping this session retires; restated at equal strength).
    expect(mapValue('#16d9ed', 'surface', 'light')).toBeNull();
    expect(MAPS.dark.text).toBeTypeOf('function');
    expect(mapValue('#f0f5ff', 'text', 'dark')).toBeNull();
  });
});

describe('Session AF (L5a, Part 10.2, ADR-028 D9, H13, H75): Light is Nebula by day', () => {
  const {sheets} = buildAll();
  it('every colour with a hue keeps Nebula’s exact value as a fill, a line, a glow, a shade and a paint', () => {
    for (const [value, role] of [['#16d9ed', 'surface'], ['#b397e6', 'surface'], ['#9273ff', 'border'], ['0 5px 14px #7547ff24', 'shadow'], ['drop-shadow(0 0 5px #25dfff70)', 'shadow'], ['#23eaff', 'graphic'], ['#ffd27a', 'surface'], ['linear-gradient(120deg, #23eaff, #3b84e1 43%, #9273ff 70%)', 'surface']]) expect(mapValue(value, role, 'light'), `${role} ${value}`).toBeNull();
    for (const [value, role] of [['#16d9ed', 'surface'], ['#9273ff', 'border'], ['#23eaff', 'graphic']]) expect(mapValue(value, role, 'dark'), `dark ${role} ${value}`).toBeNull();
  });
  it('only neutral and night colours flip: the night’s panels become near-white, white glass and white lines become ink', () => {
    const day = hex => oklch(mapValue(hex, 'surface', 'light').slice(0, 7));
    expect(day('#101b32').L).toBeGreaterThan(0.95); // a neutral navy panel
    expect(day('#26204a').L).toBeGreaterThan(0.95); // a night panel with an indigo tint (C 0.075)
    expect(oklch('#26204a').C).toBeGreaterThanOrEqual(NEUTRAL_CHROMA);
    expect(oklch(mapValue('#ffffff', 'surface', 'light')).L).toBeLessThan(0.3);
    expect(oklch(mapValue('#e8eefc', 'border', 'light').slice(0, 7)).L).toBeLessThan(0.4);
    expect(oklch(mapValue('#f0f5ff', 'graphic', 'light')).L).toBeLessThan(0.4);
    // A deep, saturated colour is not the night: it stays.
    expect(mapValue('#4a1fb0', 'surface', 'light')).toBeNull();
  });
  it('a coloured word that fails on white takes a deeper shade of its own hue (≥ 6:1); gold stays gold, no amber shift', () => {
    for (const hex of ['#23eaff', '#9273ff', '#ff74be', '#ffd27a', '#86f0d6', '#f06dff']) {
      const out = mapValue(hex, 'text', 'light'), before = oklch(hex), after = oklch(out);
      expect(onWhite(out)).toBeGreaterThanOrEqual(TEXT_CONTRAST - 0.05);
      expect(Math.abs(after.h - before.h), `${hex} → ${out}: same hue`).toBeLessThan(2.5);
      expect(after.L).toBeLessThan(before.L);
    }
    expect(mapValue('#4b3fd1', 'text', 'light')).toBeNull(); // already deep enough: unchanged
  });
  it('gradient words: their white part becomes ink and, by the owner’s decision of 19 Oct (H130), their tails take deeper shades of the same hues; Dark, the night islands and the wordmark keep Nebula’s', () => {
    const flow = 'linear-gradient(100deg, currentColor 0%, currentColor 42%, #6fe6f6 72%, #8fa6ff 84%, #c790f6 93%, #f08bd6 100%)';
    const day = mapValue(flow, 'gradientText', 'light'), stops = (v) => [...v.matchAll(/#[0-9a-f]{6}/g)].map(m => m[0]);
    expect(day).toMatch(/^linear-gradient\(100deg, currentColor 0%, currentColor 42%, #[0-9a-f]{6} 72%, #[0-9a-f]{6} 84%, #[0-9a-f]{6} 93%, #[0-9a-f]{6} 100%\)$/);
    stops(flow).forEach((hex, i) => {
      const out = stops(day)[i], before = oklch(hex), after = oklch(out);
      expect(onWhite(out), `${hex} → ${out}`).toBeGreaterThanOrEqual(GRADIENT_TEXT_CONTRAST - 0.05);
      expect(onWhite(out), `${hex} → ${out}: the owner's floor`).toBeGreaterThanOrEqual(4.5);
      expect(Math.abs(after.h - before.h), `${hex} → ${out}: same hue`).toBeLessThan(2.5);
      expect(after.L).toBeLessThan(before.L);
      expect(parity.deeperSameHue(`rgb(${[1, 3, 5].map(j => parseInt(hex.slice(j, j + 2), 16)).join(', ')})`, `rgb(${[1, 3, 5].map(j => parseInt(out.slice(j, j + 2), 16)).join(', ')})`)).toBe(true);
    });
    expect(mapValue('linear-gradient(100deg, #f6f5ff 0%, #e4f6ff 30%, #b9c6ff 78%)', 'gradientText', 'light')).toMatch(/^linear-gradient\(100deg, #[0-3][0-9a-f]{5} 0%, #[0-3][0-9a-f]{5} 30%, #[0-9a-f]{6} 78%\)$/);
    expect(mapValue(flow, 'gradientText', 'dark')).toBeNull();
    // the root flow and every pillar's flow by day are the deep ones; the night islands restore Nebula's own flow
    expect(sheets.light).toContain(`--nebula-flow-mid: ${day};`);
    expect(sheets.light).toContain(`--nebula-flow-mid: ${flow};`);
    for (const pillar of ['goals', 'habits', 'health', 'wealth']) {
      const rule = sheets.light.match(new RegExp(`main\\[data-pillar=${pillar}\\][^{]*\\{[^}]*?--nebula-flow-mid: ([^;\\n]+)`));
      expect(rule, pillar).not.toBeNull();
      for (const hex of stops(rule[1])) expect(onWhite(hex), `${pillar} ${hex}`).toBeGreaterThanOrEqual(GRADIENT_TEXT_CONTRAST - 0.05);
    }
    // the ZIGoals logo is a mark, not a gradient word: no day rule repaints its letters
    const logo = sheets.light.slice(sheets.light.indexOf('.logo-wordmark-letters:not'), sheets.light.indexOf('}', sheets.light.indexOf('.logo-wordmark-letters:not')));
    expect(logo).not.toContain('background');
    expect(sheets.dark).not.toContain(day);
    // AE's deeper day stops for the gradient headings are gone.
    expect(sheets.light).not.toMatch(/#0b6f80 68%, #3f4fc0 82%/);
  });
  it('a color-mix keeps a coloured line and flips a tinted night panel', () => {
    expect(mapValue('color-mix(in srgb, var(--violet) 40%, #25334f)', 'border', 'light')).toBeNull();
    expect(mapValue('color-mix(in srgb, var(--tone) 28%, #ffffff10)', 'border', 'light')).toBeNull();
    expect(mapValue('color-mix(in srgb, var(--tone) 12%, #0d1629)', 'surface', 'light')).not.toBeNull();
    expect(mapValue('color-mix(in srgb, #0d1330 70%, transparent)', 'surface', 'light')).not.toBeNull();
  });
  it('words have ink twins, equal to their colour in Nebula and Dark and a deeper shade by day; islands keep the night', () => {
    const nebula = readFileSync(join(WEB, 'components', 'shell', 'theme-switch.css'), 'utf8');
    for (const token of ['pillar-goals', 'pillar-habits', 'pillar-health', 'pillar-wealth', 'brand-cyan', 'cyan']) {
      expect(nebula).toContain(`--${token}-ink: var(--${token});`);
      expect(sheets.light).toMatch(new RegExp(`--${token}-ink: #[0-9a-f]{6};`));
      expect(sheets.dark).not.toMatch(new RegExp(`--${token}-ink: #`));
      expect(sheets.light).toMatch(new RegExp(`:root\\[data-theme=light\\] :is\\(\\.today-hero[^)]*\\) \\{[^}]*--${token}-ink: var\\(--${token}\\)`));
    }
    expect(sheets.light).toMatch(/color: var\(--cyan-ink\)/);
  });
  it('the reward-reserve card follows the theme: it is no island any more', () => {
    expect(ISLANDS).not.toContain('.staking-card');
    expect(sheets.light).not.toMatch(/@scope \(:root\[data-theme=light\]\) to \([^)]*\.staking-card/);
  });
  it('the cascade is Nebula’s: a rule the theme leaves alone is carried too, so Habits’ dots keep each card’s colour', () => {
    const carried = sheets.light.indexOf('.habits-workspace .habit-dot.habit-day-complete:not(#\\-)'), literal = sheets.light.indexOf('.habit-dot.habit-day-complete:not(#\\-) {');
    expect(carried).toBeGreaterThan(-1);
    expect(literal).toBeGreaterThan(-1);
    // The literal purple of habits.css is no longer a day colour of its own (it stays #b397e6), and loses to the tone rule.
    expect(sheets.light).not.toMatch(/\.habit-dot\.habit-day-complete:not\(#\\-\) \{[^}]*#967dc3/);
  });
  it('a carried rule sets colours only: shorthands become their colour longhands, so no width, size, position or clip moves', () => {
    expect(colourLonghands('background', "url('/a.svg') center / cover no-repeat, #020918")).toEqual([['background-image', "url('/a.svg'), none"], ['background-color', '#020918']]);
    expect(colourLonghands('background', 'linear-gradient(90deg, #fff, #000) padding-box, linear-gradient(#23eaff, #9273ff) border-box')).toEqual([['background-image', 'linear-gradient(90deg, #fff, #000), linear-gradient(#23eaff, #9273ff)'], ['background-color', 'transparent']]);
    expect(colourLonghands('background', 'none')).toEqual([['background-image', 'none'], ['background-color', 'transparent']]);
    expect(colourLonghands('background', 'var(--x) center')).toBeNull(); // unknown: kept whole, with its rule's own longhands
    expect(colourLonghands('background', 'var(--x) center', () => 'image')).toEqual([['background-image', 'var(--x)'], ['background-color', 'transparent']]);
    expect(colourLonghands('border', '1px solid #ffffff1a')).toEqual([['border-color', '#ffffff1a']]);
    expect(colourLonghands('border-top', '0')).toEqual([['border-top-color', 'currentcolor']]);
    expect(colourLonghands('outline', '2px solid var(--cyan, #6fd3ff)')).toEqual([['outline-color', 'var(--cyan, #6fd3ff)']]);
    for (const theme of ['light', 'dark']) {
      const generated = sheets[theme].split('/* apps/web/themes/')[0];
      expect(generated).not.toMatch(/^\s+(border(-[a-z]+)?-(width|style)|background-(size|position|repeat|origin|attachment)|mask(-image)?|-webkit-mask(-image)?|border-radius):/m);
    }
  });
  it('Light’s hand layers keep no layout rule (a theme switch never moves a box) and no matte patch', () => {
    const hand = ['extra', 'hero', 'headerart', 'sidebar'].map(part => readFileSync(join(WEB, 'themes', `light.${part}.css`), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')).join('\n');
    expect(hand).not.toMatch(/margin(-top|-block)?\s*:/);
    expect(hand).not.toMatch(/calc-milestone|exercise-medallion|habit-week-bars|goal-choice-tiles|habit-month-grid|--ha-|--nebula-flow-mid/);
    expect(hand).not.toMatch(/staking-card[^{}]*\{[^}]*color-scheme:\s*dark/); // the reserve card is no night island by day
  });
  it('Dark: the star-system background is black with a subtle mist; every coloured fill keeps Nebula’s colour', () => {
    expect(sheets.dark).toMatch(/:root\[data-theme=dark\] body:not\(#\\-\) \{ background: #000000; \}/);
    expect((sheets.dark.match(/radial-gradient\([^)]*#(1a153f|0f2238|2a1230|0e2a2a)cc 0/g) ?? []).length).toBe(4);
    expect(sheets.dark).toMatch(/var\(--cosmic-starfield\) center \/ cover no-repeat/);
  });
  it('the generator and the parity test share one rule for what may flip', () => {
    expect([parity.NEUTRAL_CHROMA, parity.NIGHT_L, parity.NIGHT_CHROMA]).toEqual([NEUTRAL_CHROMA, NIGHT_L, NIGHT_CHROMA]);
  });
});
