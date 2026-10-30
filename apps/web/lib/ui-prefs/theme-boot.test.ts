import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {LOOK_SHEETS, THEME_BOOT_SRC, THEME_SHEETS} from './theme-sheets';
import {lookAttributes} from './look';

const THEME_BOOT = readFileSync(join(__dirname, '..', '..', 'public', 'theme-boot.js'), 'utf8');

describe('Session AD Part 3: the bootstrap script (ADR-026 F5)', () => {
  const run = (stored: string | null) => {
    const attrs = new Map<string, string>(), links: {href: string; rel: string; id: string; attrs: Map<string, string>}[] = [];
    const doc = {documentElement: {setAttribute: (k: string, v: string) => attrs.set(k, v), removeAttribute: (k: string) => attrs.delete(k)}, head: {appendChild: (l: never) => links.push(l)}, createElement: () => { const a = new Map<string, string>(); return {href: '', rel: '', id: '', attrs: a, setAttribute: (k: string, v: string) => a.set(k, v), remove() {}}; }};
    new Function('document', 'localStorage', 'setTimeout', THEME_BOOT)(doc, {getItem: () => stored}, () => 0);
    return {attrs, links};
  };
  it('does nothing for Nebula, no record, bad bytes or an unknown theme', () => {
    for (const stored of [null, '{x', JSON.stringify({version: 1}), JSON.stringify({version: 1, theme: 'nebula'}), JSON.stringify({version: 1, theme: '__proto__'}), JSON.stringify({version: 1, theme: 'constructor'}), JSON.stringify({version: 2, theme: 'light'})]) {
      const {attrs, links} = run(stored); expect(attrs.size, String(stored)).toBe(0); expect(links).toHaveLength(0);
    }
  });
  it('for Light or Dark: the attribute, the loading hold, and that theme’s own same-origin sheet', () => {
    for (const theme of ['light', 'dark'] as const) {
      const {attrs, links} = run(JSON.stringify({version: 1, theme}));
      expect(attrs.get('data-theme')).toBe(theme);
      expect(attrs.has('data-theme-loading')).toBe(true);
      expect(links).toHaveLength(1);
      expect(links[0]!.href).toBe(THEME_SHEETS[theme]);
      expect(links[0]!.href.startsWith('/themes/')).toBe(true);
    }
  });
  it('is the file the root layout names, by its content hash', () => {
    expect(THEME_BOOT_SRC).toMatch(/^\/theme-boot\.js\?v=[0-9a-f]{12}$/);
  });
  it('touches no Trusted Types sink and names no other origin', () => {
    expect(THEME_BOOT).not.toMatch(/innerHTML|outerHTML|document\.write|eval\(|new Function|\.src\s*=|https?:/);
  });
});

describe('Session AJ (item 32, D5): the bootstrap script applies the look before the first paint', () => {
  type Link = {href: string; rel: string; id: string; attrs: Map<string, string>; onload?: () => void; onerror?: () => void; removed?: boolean};
  const run = (stored: string | null) => {
    const attrs = new Map<string, string>(), links: Link[] = [], timers: (() => void)[] = [];
    const doc = {documentElement: {setAttribute: (k: string, v: string) => attrs.set(k, v), removeAttribute: (k: string) => attrs.delete(k)}, head: {appendChild: (l: Link) => links.push(l)}, createElement: () => { const a = new Map<string, string>(); const l: Link & {setAttribute: (k: string, v: string) => void; remove: () => void} = {href: '', rel: '', id: '', attrs: a, setAttribute: (k, v) => a.set(k, v), remove() { l.removed = true; }}; return l; }};
    new Function('document', 'localStorage', 'setTimeout', THEME_BOOT)(doc, {getItem: () => stored}, (f: () => void) => timers.push(f));
    return {attrs, links, timers};
  };
  const ALL = {font: 'inter', textSize: 'large', density: 'compact', glow: 'soft'};
  it('sets the same attributes lookAttributes names, and holds the paint for the two generated sheets', () => {
    const {attrs, links} = run(JSON.stringify({version: 1, look: ALL}));
    for (const [name, value] of Object.entries(lookAttributes({look: ALL as never}))) expect(attrs.get(name), name).toBe(value);
    expect(attrs.has('data-look-loading')).toBe(true);
    expect(attrs.has('data-theme')).toBe(false);
    expect(links.map(l => [l.id, l.href, l.rel, l.attrs.get('blocking')])).toEqual([['zigoals-text-sheet', LOOK_SHEETS.text, 'stylesheet', 'render'], ['zigoals-density-sheet', LOOK_SHEETS.density, 'stylesheet', 'render']]);
    links[0]!.onload!();
    expect(attrs.has('data-look-loading')).toBe(true);
    links[1]!.onload!();
    expect(attrs.has('data-look-loading')).toBe(false);
  });
  it('the font and the glow need no sheet; the defaults and unreadable values set nothing', () => {
    const soft = run(JSON.stringify({version: 1, look: {font: 'inter', glow: 'soft'}}));
    expect(Object.fromEntries(soft.attrs)).toEqual({'data-font': 'inter', 'data-glow': 'soft'});
    expect(soft.links).toHaveLength(0);
    for (const look of [{font: 'system', textSize: 'standard', density: 'comfortable', glow: 'full'}, {font: 'comic', textSize: 9, density: null}, 'inter', null, []]) {
      const {attrs, links} = run(JSON.stringify({version: 1, look}));
      expect(attrs.size, JSON.stringify(look)).toBe(0); expect(links).toHaveLength(0);
    }
    expect(run(JSON.stringify({version: 2, look: ALL})).attrs.size).toBe(0);
  });
  it('a sheet that fails takes its attribute away; the hold ends after 1.5 s at the latest', () => {
    const {attrs, links, timers} = run(JSON.stringify({version: 1, look: {textSize: 'large', density: 'compact'}}));
    links[0]!.onerror!();
    expect(attrs.has('data-text')).toBe(false);
    expect(links[0]!.removed).toBe(true);
    expect(attrs.get('data-density')).toBe('compact');
    expect(attrs.has('data-look-loading')).toBe(true);
    timers.forEach(f => f());
    expect(attrs.has('data-look-loading')).toBe(false);
  });
  it('the look and the theme together: both apply, each with its own sheet', () => {
    const {attrs, links} = run(JSON.stringify({version: 1, theme: 'light', look: {textSize: 'large'}}));
    expect(attrs.get('data-theme')).toBe('light');
    expect(attrs.get('data-text')).toBe('large');
    expect(links.map(l => l.href)).toEqual([LOOK_SHEETS.text, THEME_SHEETS.light]);
  });
  it('a look the script cannot read never stops the theme', () => {
    const {attrs, links} = run(JSON.stringify({version: 1, theme: 'dark', look: {font: {x: 1}, textSize: ['large'], density: 'COMPACT'}}));
    expect(attrs.get('data-theme')).toBe('dark');
    expect(links.map(l => l.href)).toEqual([THEME_SHEETS.dark]);
  });
});
