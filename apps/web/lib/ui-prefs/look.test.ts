import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {UI_PREFS_KEY} from '../ab-design-keys';
import {uiPrefsSchema} from './schema';
import {DEFAULT_LOOK, LOOK_ATTRIBUTE, applyLook, isDefaultLook, lookAttributes, lookOf, readLook, withLook, writeLook, type Look} from './look';
import {LOOK_SHEETS} from './theme-sheets';

const memory = (initial?: unknown) => {
  const map = new Map<string, string>(initial === undefined ? [] : [[UI_PREFS_KEY, typeof initial === 'string' ? initial : JSON.stringify(initial)]]);
  return {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), stored: () => JSON.parse(map.get(UI_PREFS_KEY) ?? 'null') as Record<string, unknown> | null};
};
const ALL: Look = {font: 'inter', textSize: 'large', density: 'compact', glow: 'soft'};

describe('Session AJ (item 32, D5; TIER 3 (stored format)): the `look` group of zigoals:ui-prefs:v1', () => {
  it('accepts each known value and keeps the rest of the record', () => {
    const parsed = uiPrefsSchema.parse({version: 1, theme: 'light', look: ALL});
    expect(parsed.look).toEqual(ALL);
    expect(parsed.theme).toBe('light');
    expect(uiPrefsSchema.parse({version: 1, look: {font: 'system', textSize: 'standard', density: 'comfortable', glow: 'full'}}).look).toEqual(DEFAULT_LOOK);
  });
  it('a value it cannot read is dropped, never makes the record unreadable', () => {
    for (const look of [{font: 'comic'}, {textSize: 3}, {density: null}, {glow: ['soft']}, {font: 'INTER'}]) {
      const parsed = uiPrefsSchema.safeParse({version: 1, look, checklist: {view: 'list'}});
      expect(parsed.success, JSON.stringify(look)).toBe(true);
      expect(Object.values(parsed.data!.look ?? {}).filter(v => v !== undefined)).toEqual([]);
      expect(parsed.data!.checklist?.view).toBe('list');
    }
    for (const look of ['inter', 7, null, [1]]) expect(uiPrefsSchema.safeParse({version: 1, look}).success, String(look)).toBe(true);
    expect(lookOf(uiPrefsSchema.parse({version: 1, look: {font: 'comic', glow: 'soft'}}))).toEqual({...DEFAULT_LOOK, glow: 'soft'});
  });
  it('keeps fields a newer build adds, in the group and beside it', () => {
    const parsed = uiPrefsSchema.parse({version: 1, look: {font: 'inter', contrast: 'high'}, later: {x: 1}}) as Record<string, unknown>;
    expect(parsed.look).toEqual({font: 'inter', contrast: 'high'});
    expect(parsed.later).toEqual({x: 1});
  });
  it('an older record without the group is complete: today’s look', () => {
    expect(lookOf(uiPrefsSchema.parse({version: 1}))).toEqual(DEFAULT_LOOK);
    expect(lookOf(null)).toEqual(DEFAULT_LOOK);
  });
});

describe('Session AJ (item 32, D5): lookAttributes, the <html> attributes of a look', () => {
  it('the defaults set no attribute at all', () => {
    expect(lookAttributes({})).toEqual({});
    expect(lookAttributes({look: {font: 'system', textSize: 'standard', density: 'comfortable', glow: 'full'}})).toEqual({});
    expect(lookAttributes(null)).toEqual({});
  });
  it('each other choice is one attribute', () => {
    expect(lookAttributes({look: ALL})).toEqual({'data-font': 'inter', 'data-text': 'large', 'data-density': 'compact', 'data-glow': 'soft'});
    expect(lookAttributes({look: {density: 'compact'}})).toEqual({'data-density': 'compact'});
    expect(Object.values(LOOK_ATTRIBUTE)).toEqual(['data-font', 'data-text', 'data-density', 'data-glow']);
  });
  it('a value it cannot read sets nothing', () => {
    expect(lookAttributes({look: {font: 'comic', glow: 'SOFT'} as never})).toEqual({});
  });
});

describe('Session AJ (item 32, D5): storing a look', () => {
  it('stores only what is not the default, keeps every other field, drops the group for the defaults', () => {
    const storage = memory({version: 1, theme: 'dark', heroCollapsed: true});
    writeLook({...DEFAULT_LOOK, textSize: 'large'}, storage);
    expect(storage.stored()).toEqual({version: 1, theme: 'dark', heroCollapsed: true, look: {textSize: 'large'}});
    expect(readLook(storage)).toEqual({...DEFAULT_LOOK, textSize: 'large'});
    writeLook(ALL, storage);
    expect(storage.stored()!.look).toEqual(ALL);
    writeLook(DEFAULT_LOOK, storage);
    expect(storage.stored()).toEqual({version: 1, theme: 'dark', heroCollapsed: true});
    expect(readLook(storage)).toEqual(DEFAULT_LOOK);
  });
  it('a group field from a newer build stays; unreadable bytes are replaced only by a fresh record', () => {
    expect(withLook({version: 1, look: {contrast: 'high', font: 'inter'}}, DEFAULT_LOOK)).toEqual({version: 1, look: {contrast: 'high'}});
    const broken = memory('{x');
    expect(readLook(broken)).toEqual(DEFAULT_LOOK);
    writeLook({...DEFAULT_LOOK, glow: 'soft'}, broken);
    expect(broken.stored()).toEqual({version: 1, look: {glow: 'soft'}});
    expect(() => writeLook(ALL, null)).toThrow();
    expect(readLook(null)).toEqual(DEFAULT_LOOK);
  });
  it('isDefaultLook', () => {
    expect(isDefaultLook(DEFAULT_LOOK)).toBe(true);
    expect(isDefaultLook({...DEFAULT_LOOK, glow: 'soft'})).toBe(false);
  });
});

describe('Session AJ (item 32, D5): applying a look on the page', () => {
  const fakeDocument = () => {
    const attrs = new Map<string, string>(), byId = new Map<string, {id: string; rel: string; href: string; isConnected: boolean; remove: () => void; addEventListener: () => void}>();
    const doc = {
      documentElement: {setAttribute: (k: string, v: string) => void attrs.set(k, v), removeAttribute: (k: string) => void attrs.delete(k), getAttribute: (k: string) => attrs.get(k) ?? null},
      getElementById: (id: string) => byId.get(id) ?? null,
      createElement: () => { const link = {id: '', rel: '', href: '', isConnected: false, remove: () => { byId.delete(link.id); link.isConnected = false; }, addEventListener: () => {}}; return link; },
      head: {appendChild: (link: {id: string; isConnected: boolean}) => { link.isConnected = true; byId.set(link.id, link as never); }},
    };
    return {doc: doc as unknown as Document, attrs, byId};
  };
  it('sets each attribute and adds the Large text and Compact sheets; the defaults take them all away', () => {
    const {doc, attrs, byId} = fakeDocument();
    applyLook(ALL, doc);
    expect(Object.fromEntries(attrs)).toEqual(lookAttributes({look: ALL}));
    expect(byId.get('zigoals-text-sheet')?.href).toBe(LOOK_SHEETS.text);
    expect(byId.get('zigoals-density-sheet')?.href).toBe(LOOK_SHEETS.density);
    applyLook(ALL, doc);
    expect(byId.size).toBe(2);
    applyLook({...ALL, textSize: 'standard'}, doc);
    expect(attrs.has('data-text')).toBe(false);
    expect(byId.has('zigoals-text-sheet')).toBe(false);
    applyLook(DEFAULT_LOOK, doc);
    expect(attrs.size).toBe(0);
    expect(byId.size).toBe(0);
  });
  it('the generated sheets are same-origin files of this build', () => {
    for (const href of Object.values(LOOK_SHEETS)) {
      expect(href).toMatch(/^\/themes\/(text-large|density-compact)\.css\?v=[0-9a-f]{12}$/);
      expect(readFileSync(join(__dirname, '..', '..', 'public', href.split('?')[0]!), 'utf8').length).toBeGreaterThan(1000);
    }
  });
});

describe('Session AJ (item 32, D5): app/customize.css keys every rule on its own attributes', () => {
  const css = readFileSync(join(__dirname, '..', '..', 'app', 'customize.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  it('every selector names a Customize attribute (so the defaults are untouched), the font only when chosen', () => {
    const selectors = [...css.matchAll(/(^|})\s*([^\s@{}][^{}]*)\{/g)].map(m => m[2]!.trim());
    expect(selectors.length).toBeGreaterThan(4);
    for (const selector of selectors) for (const part of selector.split(/,(?![^(]*\))/)) expect(part, selector).toMatch(/^:root\[data-(font|glow|look-loading)(="[a-z]+")?\]/);
    expect(css.match(/"Inter"/g)).toHaveLength(3); // two @font-face rules and the one rule that uses it
    expect(css).toMatch(/:root\[data-font="inter"\] body \{\s*font-family: "Inter",/);
    expect(css).toMatch(/src: url\("\/fonts\/inter\/InterVariable\.woff2"\) format\("woff2"\)/);
    expect((css.match(/font-display: swap/g) ?? []).length).toBe(2);
  });
  it('the self-hosted Inter files are the ones the README records', () => {
    const dir = join(__dirname, '..', '..', 'public', 'fonts', 'inter'), readme = readFileSync(join(dir, 'README.md'), 'utf8');
    expect(readme).toContain('SIL Open Font License 1.1');
    for (const file of ['InterVariable.woff2', 'InterVariable-Italic.woff2', 'OFL.txt']) {
      const bytes = readFileSync(join(dir, file));
      const hash = createHash('sha256').update(bytes).digest('hex');
      expect(readme, file).toContain(hash);
    }
    expect(readFileSync(join(dir, 'InterVariable.woff2')).subarray(0, 4).toString('latin1')).toBe('wOF2');
  });
});
