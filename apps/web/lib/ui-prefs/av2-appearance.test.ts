// @vitest-environment jsdom
import {afterEach, describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {UI_PREFS_KEY} from '../ab-design-keys';
import {uiPrefsSchema} from './schema';
import {DEFAULT_LOOK, LOOK_CHOICES, lookAttributes, lookOf, withLook} from './look';
import {DARK_STYLES, applyDarkStyle, darkStyleOf, darkStyleSheet, readDarkStyle, writeDarkStyle} from './dark-style';
import {applyTheme} from './theme';

/**
 * Session AV lane 2 (sync and appearance; LEDGER #34 high contrast, N6 #191 pure black, N6 #192 more fonts; TIER 3 (stored
 * format), additive): Dark's style and three more system fonts in this device's own display record.
 */
function memory(initial?: unknown) { const m = new Map<string, string>(); if (initial !== undefined) m.set(UI_PREFS_KEY, JSON.stringify(initial)); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, read: () => JSON.parse(m.get(UI_PREFS_KEY) ?? 'null'), m}; }
afterEach(() => { localStorage.clear(); document.documentElement.removeAttribute('data-theme'); document.documentElement.removeAttribute('data-dark-style'); document.head.innerHTML = ''; });

describe('Dark style, stored', () => {
  it('Standard is never stored; Pure black and High contrast are kept in the look group beside the other choices', () => {
    expect(DARK_STYLES).toEqual(['standard', 'black', 'contrast']);
    const s = memory({version: 1, theme: 'dark', look: {font: 'inter'}, later: {x: 1}});
    writeDarkStyle('contrast', s);
    expect(s.read()).toEqual({version: 1, theme: 'dark', look: {font: 'inter', darkStyle: 'contrast'}, later: {x: 1}});
    expect(readDarkStyle(s)).toBe('contrast');
    writeDarkStyle('black', s); expect(readDarkStyle(s)).toBe('black');
    writeDarkStyle('standard', s);
    expect(s.read()).toEqual({version: 1, theme: 'dark', look: {font: 'inter'}, later: {x: 1}});
    const alone = memory({version: 1, look: {darkStyle: 'black'}}); writeDarkStyle('standard', alone);
    expect(alone.read()).toEqual({version: 1});
  });
  it('a value this build cannot read is Standard and never fails the record; the Customize choices keep the style', () => {
    for (const look of [{darkStyle: 'neon'}, {darkStyle: 1}, {darkStyle: null}]) {
      const parsed = uiPrefsSchema.parse({version: 1, look});
      expect(darkStyleOf(parsed)).toBe('standard');
    }
    expect(readDarkStyle(memory('{x' as never))).toBe('standard');
    expect(readDarkStyle({getItem: () => '{x'})).toBe('standard');
    // Choosing a font, or Back to the defaults, keeps the style (withLook keeps the group's other fields).
    expect(withLook({version: 1, look: {darkStyle: 'contrast'}}, {...DEFAULT_LOOK, font: 'serif'})).toEqual({version: 1, look: {darkStyle: 'contrast', font: 'serif'}});
    expect(lookOf(uiPrefsSchema.parse({version: 1, look: {darkStyle: 'contrast', glow: 'soft'}}))).toEqual({...DEFAULT_LOOK, glow: 'soft'});
  });
  it('an older build\'s reading of the record (its look group, with the enum it had) drops nothing it does not know', () => {
    const parsed = uiPrefsSchema.parse({version: 1, look: {font: 'rounded', darkStyle: 'black', laterChoice: 'x'}}) as {look: Record<string, unknown>};
    expect(parsed.look).toEqual({font: 'rounded', darkStyle: 'black', laterChoice: 'x'});
  });
});

describe('Dark style, on the page', () => {
  it('only while Dark is on: the attribute and the style\'s own same-origin sheet; another theme or Standard: neither', async () => {
    document.documentElement.dataset.theme = 'dark';
    applyDarkStyle('contrast');
    expect(document.documentElement.getAttribute('data-dark-style')).toBe('contrast');
    const link = document.getElementById('zigoals-dark-style-sheet') as HTMLLinkElement;
    expect(link.getAttribute('href')).toBe(darkStyleSheet('contrast'));
    expect(darkStyleSheet('contrast')).toMatch(/^\/themes\/dark-contrast\.css(\?v=[0-9a-f]{12})?$/);
    expect(darkStyleSheet('black')).toMatch(/^\/themes\/dark-black\.css(\?v=[0-9a-f]{12})?$/);
    applyDarkStyle('standard');
    expect(document.documentElement.hasAttribute('data-dark-style')).toBe(false);
    expect(document.getElementById('zigoals-dark-style-sheet')).toBeNull();
    document.documentElement.dataset.theme = 'light';
    applyDarkStyle('black');
    expect(document.documentElement.hasAttribute('data-dark-style')).toBe(false);
  });
  it('a sheet that fails takes the attribute away; the page stays Dark', () => {
    document.documentElement.dataset.theme = 'dark';
    applyDarkStyle('black');
    document.getElementById('zigoals-dark-style-sheet')!.dispatchEvent(new Event('error'));
    expect(document.documentElement.hasAttribute('data-dark-style')).toBe(false);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
  it('the style comes and goes with Dark when the theme changes', () => {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify({version: 1, theme: 'dark', look: {darkStyle: 'contrast'}}));
    void applyTheme('dark');
    expect(document.documentElement.getAttribute('data-dark-style')).toBe('contrast');
    void applyTheme('light');
    expect(document.documentElement.hasAttribute('data-dark-style')).toBe(false);
    void applyTheme('nebula');
    expect(document.getElementById('zigoals-dark-style-sheet')).toBeNull();
  });
});

describe('more fonts (N6 #192): the device\'s own, nothing fetched', () => {
  // Session AV lane 2 (r3-plan, LEDGER #263: a sixth choice, Reading-friendly, deliberate): the list now ends with 'reading',
  // and 'reading' is checked as one attribute value exactly like the other three.
  it('six choices; each but System is one attribute value; anything else reads as System', () => {
    expect(LOOK_CHOICES.font).toEqual(['system', 'inter', 'serif', 'rounded', 'mono', 'reading']);
    for (const font of ['serif', 'rounded', 'mono', 'reading'] as const) expect(lookAttributes({look: {...DEFAULT_LOOK, font}})).toEqual({'data-font': font});
    expect(lookOf(uiPrefsSchema.parse({version: 1, look: {font: 'comic'}})).font).toBe('system');
  });
  it('app/customize.css names a system font stack for each, ending at its generic family, and no new file', () => {
    const css = readFileSync(join(__dirname, '..', '..', 'app', 'customize.css'), 'utf8');
    // Session AV lane 2 (r3-plan, LEDGER #263, deliberate): Reading-friendly is a system stack too, ending at sans-serif.
    for (const [font, generic] of [['serif', 'serif'], ['rounded', 'sans-serif'], ['mono', 'monospace'], ['reading', 'sans-serif']] as const) {
      const rule = new RegExp(`:root\\[data-font="${font}"\\] body \\{\\s*font-family: ([^;]+);`).exec(css);
      expect(rule, font).not.toBeNull();
      expect(rule![1]!.trim().endsWith(generic), font).toBe(true);
    }
    expect((css.match(/@font-face/g) ?? []).length).toBe(2);
    expect((css.match(/url\(/g) ?? []).length).toBe(2);
  });
});
