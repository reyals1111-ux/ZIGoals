import {existsSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test} from 'vitest';
import manifest from '../../components/zigi/manifest.json';
import {filesFor, skinOf, ZIGI_MANIFEST, ZIGI_STATES, type SizeName} from '../../components/zigi/manifest';

/**
 * Session X-Local Part 1 (ADR-017): the Studio-2 art, checked mechanically against the contract in ZIGI_ASSET_SPEC.md.
 * Names, formats (the bytes, not the extension), pixel sizes, byte budgets, every state resolvable to files on disk,
 * every fallback chain ending in an existing file, posters for every state, loops and one-shots flagged as the contract
 * says. Nothing here fetches or decodes an image: the headers are read by hand.
 */
const PUBLIC = join(__dirname, '..', '..', 'public');
const SKIN_DIR = '/brand/figures/zigi/origami-nebula/';
const NAME = /^(F00[1-9]|F0[1-9]\d|T001|E001|X0\d\d|R0\d\d)-[a-z-]+(?:-2x|-large)?\.webp$|^(F00[1-9]|T001|E001|X0\d\d|R0\d\d)-[a-z-]+\.anim\.(?:webp|png)$/;
const PIXELS: Record<SizeName | 'animated', [number, number]> = {'1x': [96, 126], '2x': [192, 253], large: [480, 632], animated: [96, 126]};
type Header = {format: 'webp' | 'png'; width: number; height: number; animated: boolean; frames: number; loops: number | null};
/** RIFF/WEBP: VP8X carries the canvas size and the animation flag; ANIM carries the loop count; ANMF chunks are frames. */
function webpHeader(b: Buffer): Header {
  expect(b.subarray(0, 4).toString('latin1')).toBe('RIFF'); expect(b.subarray(8, 12).toString('latin1')).toBe('WEBP');
  const chunk = b.subarray(12, 16).toString('latin1');
  if (chunk === 'VP8X') {
    const width = 1 + b.readUIntLE(24, 3), height = 1 + b.readUIntLE(27, 3), animated = (b[20]! & 0x02) !== 0;
    const anim = b.indexOf(Buffer.from('ANIM', 'latin1'));
    const loops = animated && anim >= 0 ? b.readUInt16LE(anim + 8 + 4) : null;
    let frames = 0; for (let at = b.indexOf(Buffer.from('ANMF', 'latin1')); at >= 0; at = b.indexOf(Buffer.from('ANMF', 'latin1'), at + 4)) frames++;
    return {format: 'webp', width, height, animated, frames: animated ? frames : 1, loops};
  }
  if (chunk === 'VP8 ') return {format: 'webp', width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff, animated: false, frames: 1, loops: null};
  if (chunk === 'VP8L') { const bits = b.readUInt32LE(21); return {format: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, animated: false, frames: 1, loops: null}; }
  throw new Error(`unknown WebP chunk ${chunk}`);
}
/** PNG: IHDR gives the size; an acTL chunk before the first IDAT makes it an APNG (num_frames, num_plays). */
function pngHeader(b: Buffer): Header {
  expect(b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
  const width = b.readUInt32BE(16), height = b.readUInt32BE(20);
  let at = 8, animated = false, frames = 1, loops: number | null = null;
  while (at + 8 <= b.length) {
    const length = b.readUInt32BE(at), type = b.subarray(at + 4, at + 8).toString('latin1');
    if (type === 'acTL') { animated = true; frames = b.readUInt32BE(at + 8); loops = b.readUInt32BE(at + 12); }
    if (type === 'IDAT') break;
    at += 12 + length;
  }
  return {format: 'png', width, height, animated, frames, loops};
}
const header = (file: string): Header => { const b = readFileSync(join(PUBLIC, file)); return file.endsWith('.png') ? pngHeader(b) : webpHeader(b); };
const DELIVERED = ['idle', 'greeting', 'insight', 'listening', 'speaking', 'presenting', 'attention', 'sleepy', 'celebrate', 'thinking', 'error'];
const skin = skinOf('origami-nebula');

test('the eleven delivered states have their own five files, correctly named, under the per-skin folder', () => {
  expect(skin.placeholder).toBe(false);
  for (const state of DELIVERED) {
    const files = skin.states[state]!, code = manifest.states[state as keyof typeof manifest.states].code;
    expect(files.wears, state).toBeUndefined();
    for (const key of ['1x', '2x', 'large', 'animated', 'animatedFallback'] as const) {
      const file = files[key]!; expect(file, `${state} ${key}`).toBeTruthy();
      expect(file.startsWith(SKIN_DIR), file).toBe(true);
      const name = file.slice(SKIN_DIR.length); expect(name, file).toMatch(NAME); expect(name.startsWith(`${code}-${state}`), name).toBe(true);
      expect(existsSync(join(PUBLIC, file)), file).toBe(true);
    }
    expect(files['1x']).toBe(`${SKIN_DIR}${code}-${state}.webp`); expect(files['2x']).toBe(`${SKIN_DIR}${code}-${state}-2x.webp`); expect(files.large).toBe(`${SKIN_DIR}${code}-${state}-large.webp`);
    expect(files.animated).toBe(`${SKIN_DIR}${code}-${state}.anim.webp`); expect(files.animatedFallback).toBe(`${SKIN_DIR}${code}-${state}.anim.png`);
  }
});
test('every file is what its name says: the format from its bytes, the documented pixel size, inside its byte budget', () => {
  const seen = new Set<string>();
  for (const state of ZIGI_STATES) {
    const files = skin.states[state]; if (!files) continue;
    for (const key of ['1x', '2x', 'large', 'animated', 'animatedFallback'] as const) {
      const file = files[key]; if (!file || seen.has(file)) continue; seen.add(file);
      const h = header(file), size = statSync(join(PUBLIC, file)).size, role = key === 'animatedFallback' ? 'animated' : key;
      expect(h.format, file).toBe(file.endsWith('.png') ? 'png' : 'webp');
      expect([h.width, h.height], file).toEqual(PIXELS[role]);
      expect(size, `${file} bytes`).toBeLessThanOrEqual(manifest.budgetBytes[role]);
      expect(h.animated, file).toBe(role === 'animated');
      if (role === 'animated') expect(h.frames, `${file} frames`).toBeGreaterThanOrEqual(24);
    }
  }
  expect(seen.size).toBe(DELIVERED.length * 5);
});
test('loops loop and one-shots play once (the loop count in the animated file follows the state\'s kind)', () => {
  for (const state of DELIVERED) {
    const kind = ZIGI_MANIFEST.states[state]!.kind, webp = header(skin.states[state]!.animated!), apng = header(skin.states[state]!.animatedFallback!);
    expect(webp.loops, `${state} webp`).toBe(kind === 'loop' ? 0 : 1);
    expect(apng.loops, `${state} apng`).toBe(kind === 'loop' ? 0 : 1);
  }
});
test('every state resolves to files on disk: its own clip, or a delivered one it wears; every fallback chain ends in an existing file', () => {
  for (const state of ZIGI_STATES) {
    const {files, from} = filesFor(skin, state);
    expect(files, state).not.toBeNull(); expect(from, state).toBe(state);
    for (const key of ['1x', '2x', 'large', 'animated', 'animatedFallback'] as const) expect(existsSync(join(PUBLIC, files![key]!)), `${state} ${key}`).toBe(true);
    if (!DELIVERED.includes(state)) {
      const wears = files!.wears!; expect(DELIVERED, `${state} wears ${wears}`).toContain(wears);
      expect(files!.animated).toBe(skin.states[wears]!.animated);
    }
    // The chain itself, state by state down to idle, names only states with files.
    for (let at: string | null = state; at; at = ZIGI_MANIFEST.states[at]!.fallback) expect(skin.states[at], `${state} → ${at}`).toBeDefined();
  }
  // The base frame is the idle art, so a state a later skin lacks still shows a real figure.
  expect(skin.sizes['1x'].file).toBe(skin.states.idle!['1x']); expect(skin.sizes['2x'].file).toBe(skin.states.idle!['2x']); expect(skin.sizes.large.file).toBe(skin.states.idle!.large);
});
test('the Studio-4 slots exist as data and are empty until the files land', () => {
  const extras = skin.extras!;
  expect(Object.keys(extras.reactions)).toEqual(Array.from({length: 13}, (_, i) => `R${String(i + 1).padStart(3, '0')}`));
  expect(Object.values(extras.reactions).every(v => v === null)).toBe(true);
  expect(Object.keys(extras.idleVariants)).toEqual(['X010', 'X011']);
  expect(extras.transitions).toEqual({greetingInPlace: null, chain: []});
  expect(extras.gaze).toEqual({chatInput: null, viewer: null, target: null});
  expect(Object.keys(manifest.reactionTriggers)).toEqual(Object.keys(extras.reactions));
  expect(Object.values(manifest.reactionTriggers).every(v => v === null)).toBe(true);
});
test('the old placeholder frames are gone and nothing in the manifest names them', () => {
  for (const name of ['zigi-placeholder.webp', 'zigi-placeholder-2x.webp', 'zigi-placeholder-large.webp']) expect(existsSync(join(PUBLIC, 'brand', 'figures', name)), name).toBe(false);
  expect(JSON.stringify(manifest)).not.toContain('placeholder.webp');
});
