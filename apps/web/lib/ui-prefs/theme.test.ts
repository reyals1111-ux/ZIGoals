import {describe, expect, it} from 'vitest';
import {UI_PREFS_KEY} from '../ab-design-keys';
import {readTheme, writeTheme} from './theme';
import {themeModeOf, themeOf, uiPrefsSchema} from './schema';

const memory = (initial: Record<string, string> = {}) => { const m = new Map(Object.entries(initial)); return {m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}; };

describe('Session AD Part 3: the theme field (ADR-026 F4)', () => {
  it('reads nebula by default, for a missing, unreadable or unknown value, and for the old themeMode alone', () => {
    expect(readTheme(memory())).toBe('nebula');
    expect(readTheme(memory({[UI_PREFS_KEY]: '{not json'}))).toBe('nebula');
    expect(readTheme(memory({[UI_PREFS_KEY]: JSON.stringify({version: 1, theme: 'aurora'})}))).toBe('nebula');
    // A device that pressed the old Dark button stored themeMode "dark": that meant today's look, so it stays Nebula.
    expect(readTheme(memory({[UI_PREFS_KEY]: JSON.stringify({version: 1, themeMode: 'dark'})}))).toBe('nebula');
    expect(themeOf({theme: 'light'})).toBe('light');
    expect(themeOf({theme: 'dark'})).toBe('dark');
  });
  it('writes only its own field: every other field, a later build’s too, is kept; Nebula removes the field', () => {
    const stored = {version: 1, heroCollapsed: true, themeMode: 'dark', baseCurrency: 'EUR', dismissed: {alphaNotice: true}, later: {x: 1}};
    const s = memory({[UI_PREFS_KEY]: JSON.stringify(stored)});
    writeTheme('light', s);
    expect(JSON.parse(s.m.get(UI_PREFS_KEY)!)).toEqual({...stored, theme: 'light'});
    expect(readTheme(s)).toBe('light');
    writeTheme('nebula', s);
    expect(JSON.parse(s.m.get(UI_PREFS_KEY)!)).toEqual(stored);
  });
  it('an older build reads the record with the new field as before (loose schema, themeMode unchanged)', () => {
    const parsed = uiPrefsSchema.parse({version: 1, themeMode: 'dark', theme: 'light'});
    expect(themeModeOf(parsed)).toBe('dark');
    expect(parsed.theme).toBe('light');
  });
});
