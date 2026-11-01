import {describe, expect, it} from 'vitest';
import {GLYPHS} from '../../components/path/glyph-paths';
import {commandKeyLabel, commandKeyShortcut, isApplePlatform} from './command-key';
import {apiServerEnv} from './hermes-guide';
import {HERMES_PLANETS} from './hermes-model';
import {MAX_SIDE_ROWS, MIN_SIDE_ROWS, ROW_GAP, ROW_PX, SIDE_ROWS, SIZE_MAX_PX, placeOrbit, rowsFit} from './layout';
import {OPENING, SETTLE_MS, settleDelay} from './orb';
import {factTiles, notRunningLine} from './right-facts';
import {PLANETS} from './setup-guide';
import type {ScanResult} from './local-servers';
import type {NovaWidget} from './store';

/** Session AK P3 (docs/review/session-ak/NOVA_DESIGN_REVIEW.md): the pure parts of NOVA's polish. */
describe('ND-1, ND-2: the stage fits the window', () => {
  it('a side column holds as many rows as the stage height allows (bounded), and the defaults before it is measured', () => {
    expect(rowsFit(null)).toBe(SIDE_ROWS);
    expect(rowsFit(Number.NaN)).toBe(SIDE_ROWS);
    expect(rowsFit(0)).toBe(SIDE_ROWS);
    expect(rowsFit(650)).toBe(5); // 1440 × 900
    expect(rowsFit(830)).toBe(6); // 1920 × 1080
    expect(rowsFit(120)).toBe(MIN_SIDE_ROWS);
    expect(rowsFit(10_000)).toBe(MAX_SIDE_ROWS);
    for (let h = 200; h <= 1400; h += 37) {
      const rows = rowsFit(h);
      if (rows > MIN_SIDE_ROWS) expect(rows * ROW_PX + (rows - 1) * ROW_GAP, `${h}`).toBeLessThanOrEqual(h);
    }
  });
  it('a card of each size is never taller than its rows, so a full column never runs past the stage', () => {
    expect(SIZE_MAX_PX.S).toBe(ROW_PX);
    expect(SIZE_MAX_PX.M).toBe(ROW_PX * 2 + ROW_GAP);
    expect(SIZE_MAX_PX.L).toBe(ROW_PX * 3 + ROW_GAP * 2);
  });
  it('what does not fit beside the star goes to the outer band, never above it', () => {
    const widgets: NovaWidget[] = Array.from({length: 8}, (_, slot) => ({id: `w${slot}`, size: 'M', slot}));
    const fit = placeOrbit(widgets, rowsFit(650));
    for (const side of ['left', 'right'] as const) expect(fit.filter(p => p.side === side).reduce((n, p) => n + p.rows, 0)).toBeLessThanOrEqual(rowsFit(650));
    expect(fit.filter(p => p.side === 'band').length).toBeGreaterThan(0);
    expect(placeOrbit(widgets, rowsFit(10_000)).filter(p => p.side === 'band')).toHaveLength(0);
  });
});

describe('ND-11: the opening', () => {
  it('the last widget has come to rest when the sequence ends, however many there are', () => {
    for (const count of [1, 2, 4, 8, 12, 24]) expect(settleDelay(count - 1, count) + SETTLE_MS, `${count}`).toBeLessThanOrEqual(OPENING.end);
  });
});

describe('ND-21: the command key in the platform’s own words', () => {
  it('⌘ on Apple devices, Ctrl elsewhere', () => {
    for (const p of ['MacIntel', 'macOS', 'iPhone', 'iPad']) expect(isApplePlatform(p), p).toBe(true);
    for (const p of ['Win32', 'Windows', 'Linux x86_64', 'Android', '', null, undefined]) expect(isApplePlatform(p), String(p)).toBe(false);
    expect(commandKeyLabel(true, 'k')).toBe('⌘K');
    expect(commandKeyLabel(false, 'k')).toBe('Ctrl K');
    expect(commandKeyShortcut(true, 'k')).toBe('Meta+K');
    expect(commandKeyShortcut(false, 'k')).toBe('Control+K');
  });
});

describe('ND-13: Behind the intelligence at a glance', () => {
  it('four tiles; an unknown says "unknown", never an invented value', () => {
    const none = factTiles({cores: null, memoryGb: null, online: null, battery: null});
    expect(none.map(t => t.label)).toEqual(['Cores', 'Memory', 'Battery', 'Network']);
    expect(none.every(t => t.value === 'unknown')).toBe(true);
    const all = factTiles({cores: 8, memoryGb: 8, online: true, battery: {level: 0.42, charging: true}});
    expect(all.map(t => t.value)).toEqual(['8', '8 GB+', '42 %', 'Connected']);
    expect(all[2]!.title).toContain('charging');
    expect(factTiles({cores: 4, memoryGb: null, online: false, battery: null})[3]!.value).toBe('Not connected');
  });
  it('servers that did not answer share one line, grouped by program with their ports; others keep their own', () => {
    const server = (id: string, name: string, baseUrl: string) => ({id, name, baseUrl, wire: 'openai-compatible'}) as ScanResult['server'];
    const off = (s: ScanResult['server']): ScanResult => ({server: s, found: false, reason: 'unreachable', message: ''});
    const results: ScanResult[] = [
      {server: server('ollama', 'Ollama', 'http://127.0.0.1:11434'), found: true, models: []},
      off(server('lmstudio', 'LM Studio', 'http://localhost:1234')),
      off(server('llamacpp', 'llama.cpp', 'http://127.0.0.1:9931')),
      off(server('llamacpp-8080', 'llama.cpp (port 8080)', 'http://127.0.0.1:8080')),
      {server: server('x', 'Other', 'http://127.0.0.1:5000'), found: false, reason: 'origin', message: 'Does not allow this site yet.'},
    ];
    const line = notRunningLine(results)!;
    expect(line.line).toBe('Not running: LM Studio (1234) · llama.cpp (9931, 8080)');
    expect(line.detail).toContain('llama.cpp (port 8080): nothing answered at http://127.0.0.1:8080');
    expect(notRunningLine(results.slice(0, 1))).toBeNull();
    expect(notRunningLine([])).toBeNull();
  });
});

describe('ND-8, ND-24: the guides', () => {
  it('the .env alternative is its own block of three lines, with the key made here or a placeholder', () => {
    const env = apiServerEnv('mac', 'https://zigoals.app', null);
    expect(env.path).toBe('~/.hermes/.env');
    expect(env.lines.split('\n')).toEqual(['API_SERVER_ENABLED=true', 'API_SERVER_KEY=<your key>', 'API_SERVER_CORS_ORIGINS=https://zigoals.app']);
    expect(apiServerEnv('windows', 'https://zigoals.app', 'abc').path).toBe('%LOCALAPPDATA%\\hermes\\.env');
    expect(apiServerEnv('linux', 'https://zigoals.app', 'abc').lines).toContain('API_SERVER_KEY=abc');
    expect(env.note).toContain('never set the host to 0.0.0.0');
  });
  it('the first conversation and the first run wear a speech bubble, drawn by the path’s own glyph table', () => {
    expect(PLANETS['first-chat'].glyph).toBe('chat');
    expect(HERMES_PLANETS['first-run'].glyph).toBe('chat');
    expect(GLYPHS.chat).toMatch(/^M[MLHVCSQTAZmlhvcsqtaz0-9.\s,-]*$/);
  });
});
