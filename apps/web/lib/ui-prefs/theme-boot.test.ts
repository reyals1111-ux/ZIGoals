import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {THEME_BOOT_SRC, THEME_SHEETS} from './theme-sheets';

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
