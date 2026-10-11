import {existsSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test} from 'vitest';
import manifest from '../../components/zigi/manifest.json';
import {stateForEvent, type ZigiEvent} from '../../components/zigi/events';
import {filesFor, oneShotMs, readManifest, skinOf, ZIGI_MANIFEST, type SizeName} from '../../components/zigi/manifest';
import {frameFor} from '../../components/zigi/zigi-avatar';
import {SHELL_FRAME} from './zigi-look';

// ADR-012, version 2 since Session V Part 12: ZIGi is a static manifest of states and skins; every file a skin names
// exists on disk within the documented size budget, and a version 1 manifest still reads.
const PUBLIC = join(__dirname, '..', '..', 'public');
const SIZE_NAMES: SizeName[] = ['1x', '2x', 'large'];
test('every size file of every skin exists, is a WebP under its budget, and keeps the 96:126 proportion', () => {
  expect(Object.keys(manifest.skins)).toContain(manifest.defaultSkin);
  for (const [skinName, skin] of Object.entries(ZIGI_MANIFEST.skins)) {
    for (const name of SIZE_NAMES) {
      const size = skin.sizes[name], file = join(PUBLIC, size.file);
      expect(existsSync(file), `${skinName} ${name}: ${size.file}`).toBe(true);
      expect(size.file.endsWith('.webp'), name).toBe(true);
      expect(statSync(file).size, `${skinName} ${name} size`).toBeLessThanOrEqual(manifest.budgetBytes[name]);
      expect(Math.abs(size.width / size.height - 96 / 126), `${name} proportion`).toBeLessThan(0.01);
    }
    // Per-state drawings: still WebP files under the size budgets, an animated WebP and its APNG fallback under theirs
    // (Session X-Local Part 1: the names follow the studio, `<code>-<state>.anim.webp` and `.anim.png`).
    for (const [state, files] of Object.entries(skin.states)) {
      expect(Object.keys(manifest.states), `${skinName}: ${state}`).toContain(state);
      for (const name of SIZE_NAMES) { const f = files?.[name]; if (f) { expect(f.endsWith('.webp')).toBe(true); expect(statSync(join(PUBLIC, f)).size).toBeLessThanOrEqual(manifest.budgetBytes[name]); } }
      if (files?.animated) { expect(files.animated.endsWith('.anim.webp')).toBe(true); expect(statSync(join(PUBLIC, files.animated)).size).toBeLessThanOrEqual(manifest.budgetBytes.animated); }
      if (files?.animatedFallback) { expect(files.animatedFallback.endsWith('.anim.png')).toBe(true); expect(statSync(join(PUBLIC, files.animatedFallback)).size).toBeLessThanOrEqual(manifest.budgetBytes.animated); }
    }
    expect(Math.abs(skin.opticalOffset.x), `${skinName} offset x`).toBeLessThan(0.25); expect(Math.abs(skin.opticalOffset.y), `${skinName} offset y`).toBeLessThan(0.25);
  }
  expect(manifest.budgetBytes.animated).toBeGreaterThan(manifest.budgetBytes.large);
});
test('the twenty-five states: Session T\'s eleven keep their codes, F010 to F023 follow, each a loop or a timed one-shot', () => {
  const states = Object.keys(manifest.states);
  expect(states).toEqual(['idle', 'greeting', 'insight', 'listening', 'speaking', 'presenting', 'attention', 'sleepy', 'celebrate', 'thinking', 'error',
    'reading-your-data', 'writing-proposal', 'success', 'proud', 'curious', 'surprised', 'confused', 'empathetic', 'encouraging', 'wave-goodbye', 'reminder', 'offline', 'peek', 'loading-model']);
  expect(Object.values(manifest.states).slice(0, 9).map(s => s.code)).toEqual(['F001', 'F002', 'F003', 'F004', 'F005', 'F006', 'F007', 'F008', 'F009']);
  expect([manifest.states.thinking.code, manifest.states.error.code]).toEqual(['T001', 'E001']);
  expect(Object.values(manifest.states).slice(11).map(s => s.code)).toEqual(Array.from({length: 14}, (_, i) => `F0${10 + i}`));
  for (const [name, state] of Object.entries(ZIGI_MANIFEST.states)) {
    expect(['loop', 'one-shot'], name).toContain(state.kind);
    expect(state.durationMs, name).toBeGreaterThan(0); expect(state.durationMs, name).toBeLessThanOrEqual(6000);
    expect(oneShotMs(name), name).toBe(state.kind === 'one-shot' ? state.durationMs : 0);
  }
});
test('every fallback names a known state and every chain ends at idle, without a loop', () => {
  expect(manifest.states.idle.fallback).toBeNull();
  for (const name of Object.keys(manifest.states)) {
    const seen = new Set<string>();
    let at: string | null = name;
    while (at && at !== 'idle') { expect(seen.has(at), `cycle at ${name}`).toBe(false); seen.add(at); at = ZIGI_MANIFEST.states[at]!.fallback; expect(at === null || at in manifest.states, `${name} → ${at}`).toBe(true); }
    expect(at, name).toBe('idle');
  }
});
test('a state without its own drawing shows its fallback\'s, down to the skin\'s base frame; animated files only with motion', () => {
  const skin = {...skinOf(null), states: {celebrate: {'1x': '/c.webp', '2x': '/c2.webp', large: '/cl.webp', animated: '/ca.webp', animatedFallback: '/ca.png'}}};
  const custom = {...ZIGI_MANIFEST, skins: {...ZIGI_MANIFEST.skins, test: skin}};
  expect(filesFor(skin, 'success', custom)).toEqual({files: skin.states.celebrate, from: 'celebrate'});
  expect(filesFor(skin, 'thinking', custom)).toEqual({files: null, from: null});
  // Session X-Local Part 1: the poster shows first and the animated file rides beside it; the APNG only where asked for.
  expect(frameFor('test', 'success', 44, true, custom)).toMatchObject({src: '/c.webp', animated: '/ca.webp'});
  expect(frameFor('test', 'success', 44, true, custom, true).animated).toBe('/ca.png');
  expect(frameFor('test', 'success', 44, false, custom)).toMatchObject({src: '/c.webp', srcSet: '/c.webp 1x, /c2.webp 2x', width: 44, height: 58, animated: null});
  expect(frameFor('test', 'idle', 240, false, custom)).toMatchObject({src: manifest.skins['origami-nebula'].sizes.large.file, width: 240, height: 316, animated: null});
  // An unknown skin (from a later build) shows the default one.
  expect(frameFor('a-later-skin', 'idle', 44, true).src).toBe(manifest.skins['origami-nebula'].sizes['1x'].file);
});
test('a version 1 manifest (Session T) reads as the original skin with its eleven states', () => {
  const v1 = {version: 1, name: 'ZIGi', alt: 'ZIGi', sizes: manifest.skins['origami-nebula'].sizes, budgetBytes: manifest.budgetBytes,
    states: Object.fromEntries(Object.entries(manifest.states).slice(0, 11).map(([name, s]) => [name, {code: s.code, label: s.label, animated: null}]))};
  const read = readManifest(v1);
  expect(read.version).toBe(2); expect(read.defaultSkin).toBe('origami-nebula');
  expect(read.skins['origami-nebula']!.sizes).toEqual(v1.sizes);
  expect(Object.keys(read.states)).toEqual(Object.keys(v1.states));
  expect(read.states.idle).toMatchObject({code: 'F001', kind: 'loop', fallback: null});
  expect(read.states.celebrate).toMatchObject({code: 'F009', kind: 'one-shot', durationMs: 2500, fallback: 'idle'});
  expect(() => readManifest({version: 3})).toThrow();
});
test('the launcher shell\'s one frame and optical offset are the default skin\'s', () => {
  const skin = manifest.skins['origami-nebula'];
  expect(SHELL_FRAME).toEqual({x1: skin.sizes['1x'].file, x2: skin.sizes['2x'].file, width: skin.sizes['1x'].width, height: skin.sizes['1x'].height});
  const css = readFileSync(join(__dirname, '..', '..', 'components', 'ai', 'ai-launcher.css'), 'utf8');
  expect(Number(/--zigi-ox:(-?[\d.]+)/.exec(css)?.[1])).toBe(skin.opticalOffset.x);
  expect(Number(/--zigi-oy:(-?[\d.]+)/.exec(css)?.[1])).toBe(skin.opticalOffset.y);
});
test('chat events map onto states the manifest knows', () => {
  const events: ZigiEvent[] = ['open', 'reply-pending', 'reply-streaming', 'reply-done', 'reply-with-proposals', 'action-applied', 'error', 'listening', 'speaking', 'idle',
    'tool-call', 'writing-proposal', 'local-answer', 'ambiguity', 'not-understood', 'streak-milestone', 'careful', 'encourage', 'offline', 'reminder-due', 'model-loading', 'close'];
  for (const event of events) expect(Object.keys(manifest.states), event).toContain(stateForEvent(event));
  expect(stateForEvent('reply-pending')).toBe('thinking'); expect(stateForEvent('action-applied')).toBe('celebrate'); expect(stateForEvent('reply-with-proposals')).toBe('presenting');
});
