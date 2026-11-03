import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test} from 'vitest';
import manifest from '../../components/zigi/manifest.json';
import {filesFor, skinOf, ZIGI_MANIFEST, ZIGI_STATES, type ExtraClip, type SizeName} from '../../components/zigi/manifest';
import {HOST_FACT_REACTIONS, REACTION_EVENTS, type SemanticEventType} from '../../components/zigi/semantic';

/**
 * Session X-Local Part 1 (ADR-017): the Studio-2 art, checked mechanically against the contract in ZIGI_ASSET_SPEC.md.
 * Names, formats (the bytes, not the extension), pixel sizes, byte budgets, every state resolvable to files on disk,
 * every fallback chain ending in an existing file, posters for every state, loops and one-shots flagged as the contract
 * says. Nothing here fetches or decodes an image: the headers are read by hand.
 */
const PUBLIC = join(__dirname, '..', '..', 'public');
const SKIN_DIR = '/brand/figures/zigi/origami-nebula/';
const NAME = /^(F00[1-9]|F0[1-9]\d|T001|E001|X0\d\d|R0\d\d)-[a-z-]+(?:-2x|-large)?\.webp$|^(F00[1-9]|F0[1-9]\d|T001|E001|X0\d\d|R0\d\d)-[a-z-]+\.anim\.(?:webp|png)$/;
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
/** An animated WebP's length: the ANMF frames' durations, summed (Session AK Part 13: the duration contract). */
function webpMs(file: string): number {
  const b = readFileSync(join(PUBLIC, file)); let ms = 0;
  for (let at = 12; at + 8 <= b.length;) { const type = b.subarray(at, at + 4).toString('latin1'), length = b.readUInt32LE(at + 4); if (type === 'ANMF') ms += b.readUIntLE(at + 8 + 12, 3); at += 8 + length + (length & 1); }
  return ms;
}
/** An APNG's length: its fcTL frame delays, summed (delay_num / delay_den seconds; a zero den is 1/100 s). */
function apngMs(file: string): number {
  const b = readFileSync(join(PUBLIC, file)); let ms = 0;
  for (let at = 8; at + 8 <= b.length;) { const length = b.readUInt32BE(at), type = b.subarray(at + 4, at + 8).toString('latin1'); if (type === 'fcTL') ms += b.readUInt16BE(at + 28) * 1000 / (b.readUInt16BE(at + 30) || 100); at += 12 + length; }
  return Math.round(ms);
}
/**
 * Session AK Part 13 (the Studio-4 art arrived; restated at equal strength, ZIGI_ASSET_SPEC.md): every one of the 25 states
 * is delivered with its own five files. An animated WebP is the 2× set (192×253, within budgetBytes.animated2x, ADR-036 D6)
 * or the app set (96×126, within budgetBytes.animated), told by its header, never its name; the APNG fallback is 96×126
 * within budgetBytes.animated.
 */
const DELIVERED: readonly string[] = ZIGI_STATES;
const BUDGET = manifest.budgetBytes as Record<SizeName | 'animated' | 'animated2x', number>;
const skin = skinOf('origami-nebula');
/** Every problem-free check of one clip's five files (a state's or a Studio-4 slot's), by role; returns the files it read. */
function checkFiles(label: string, files: Partial<Record<'1x' | '2x' | 'large' | 'animated' | 'animatedFallback', string | null>>, kind: 'loop' | 'one-shot', durationMs: number): string[] {
  const read: string[] = [];
  for (const key of ['1x', '2x', 'large', 'animated', 'animatedFallback'] as const) {
    const file = files[key]!; expect(file, `${label} ${key}`).toBeTruthy(); read.push(file);
    expect(file.startsWith(SKIN_DIR), file).toBe(true); expect(file.slice(SKIN_DIR.length), file).toMatch(NAME);
    expect(existsSync(join(PUBLIC, file)), file).toBe(true);
    const h = header(file), size = statSync(join(PUBLIC, file)).size;
    expect(h.format, file).toBe(file.endsWith('.png') ? 'png' : 'webp');
    if (key === 'animated') {
      const twoX = h.width === PIXELS['2x'][0] && h.height === PIXELS['2x'][1];
      expect(twoX || (h.width === PIXELS.animated[0] && h.height === PIXELS.animated[1]), `${file} ${h.width}×${h.height}`).toBe(true);
      expect(size, `${file} bytes`).toBeLessThanOrEqual(twoX ? BUDGET.animated2x : BUDGET.animated);
      expect(webpMs(file), `${file} length`).toBe(durationMs);
    } else {
      const role = key === 'animatedFallback' ? 'animated' : key;
      expect([h.width, h.height], file).toEqual(PIXELS[role]);
      expect(size, `${file} bytes`).toBeLessThanOrEqual(BUDGET[role]);
    }
    const clip = key === 'animated' || key === 'animatedFallback';
    expect(h.animated, file).toBe(clip);
    // Session AK Part 13: the frames follow the duration contract (INTEGRATION-HANDOFF.md §3): the animated WebP at 24 fps
    // (and never under 24 frames), the APNG fallback at 12 fps (was: at least 24 frames each; Studio-4's short APNGs hold
    // 17–22), each lasting exactly the clip's milliseconds.
    if (key === 'animated') { expect(h.frames, `${file} frames`).toBeGreaterThanOrEqual(Math.max(24, Math.floor(durationMs * 24 / 1000))); }
    if (key === 'animatedFallback') { expect(h.frames, `${file} frames`).toBeGreaterThanOrEqual(Math.floor(durationMs * 12 / 1000)); expect(apngMs(file), `${file} length`).toBe(durationMs); }
    if (clip) expect(h.loops, `${file} loops`).toBe(kind === 'loop' ? 0 : 1);
  }
  return read;
}

test('every state has its own five files, correctly named, under the per-skin folder', () => {
  expect(skin.placeholder).toBe(false);
  expect(DELIVERED).toHaveLength(25);
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
    const spec = ZIGI_MANIFEST.states[state]!;
    for (const file of checkFiles(state, skin.states[state]!, spec.kind, spec.durationMs)) { expect(seen.has(file), file).toBe(false); seen.add(file); }
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
test('every state resolves to its own files on disk; every fallback chain ends in an existing file', () => {
  for (const state of ZIGI_STATES) {
    const {files, from} = filesFor(skin, state);
    expect(files, state).not.toBeNull(); expect(from, state).toBe(state);
    for (const key of ['1x', '2x', 'large', 'animated', 'animatedFallback'] as const) expect(existsSync(join(PUBLIC, files![key]!)), `${state} ${key}`).toBe(true);
    expect(files!.wears, state).toBeUndefined();
    // The chain itself, state by state down to idle, names only states with files.
    let last: string = state;
    for (let at: string | null = state; at; at = ZIGI_MANIFEST.states[at]!.fallback) { expect(skin.states[at], `${state} → ${at}`).toBeDefined(); last = at; }
    expect(last, state).toBe('idle');
  }
  // The base frame is the idle art, so a state a later skin lacks still shows a real figure.
  expect(skin.sizes['1x'].file).toBe(skin.states.idle!['1x']); expect(skin.sizes['2x'].file).toBe(skin.states.idle!['2x']); expect(skin.sizes.large.file).toBe(skin.states.idle!.large);
});
/** The Studio-4 delivery (reactions.json, the importer's EXTRA_SLOT with IMPORTER-PATCH.md's names): what fills each slot. */
const FILLED = {
  reactions: {R001: 'R001-acknowledge', R002: 'R002-unsure', R003: 'R003-working', R004: 'R004-surprised', R005: 'R005-supportive', R006: 'R006-encourage', R007: 'R007-oops', R008: 'R008-goodbye', R009: 'R009-thanks', R010: 'R010-reading', R011: 'R011-offline-wait', R012: 'R012-back-online', R013: 'R013-hide'},
  idleVariants: {X010: 'X010-idle-glance', X011: 'X011-idle-settle', X012: 'X012-idle-logo'},
  gaze: {chatInput: 'X020-gaze-chat-input', viewer: 'X021-gaze-viewer', target: 'X022-gaze-target'},
  celebrations: {cheer: 'X030-cheer'},
  variants: {speakingB: 'X050-speaking-b', speakingC: 'X051-speaking-c', listeningB: 'X052-listening-b', thinkingB: 'X053-thinking-b', celebrateSmall: 'X054-celebrate-small'},
} as const;
const TRIGGERS = {R001: 'assistant_acknowledged', R002: 'assistant_unsure', R003: 'assistant_working', R004: 'insight_consistent', R005: 'checkin_low', R006: 'checkin_milestone', R007: 'action_undone', R008: 'wrapup_finished', R009: 'feedback_received', R010: 'journal_reflecting', R011: 'connection_lost', R012: 'connection_restored', R013: 'user_dismissed'};
const LOOPING = new Set(['R003', 'R010', 'R011', 'X010', 'X011', 'X012', 'X020', 'X021', 'X022', 'X050', 'X051', 'X052', 'X053']);
test('every Studio-4 slot the delivery filled is a clip whose files exist and pass the same header checks; the one it did not fill is still empty', () => {
  const extras = skin.extras!, seen = new Set<string>();
  const check = (where: string, clip: ExtraClip | null | undefined, name: string) => {
    expect(clip, where).toBeTruthy();
    expect(clip!.name, where).toBe(name); expect(clip!.kind, where).toBe(LOOPING.has(name.slice(0, 4)) ? 'loop' : 'one-shot');
    expect(clip!.durationMs, where).toBeGreaterThan(0);
    for (const file of checkFiles(where, clip!.files, clip!.kind, clip!.durationMs)) { expect(file.slice(SKIN_DIR.length).startsWith(`${name}`), file).toBe(true); seen.add(file); }
  };
  for (const [group, slots] of Object.entries(FILLED)) {
    const holder = (extras as unknown as Record<string, Record<string, ExtraClip | null>>)[group]!;
    expect(Object.keys(holder), group).toEqual(Object.keys(slots));
    for (const [key, name] of Object.entries(slots)) check(`${group}.${key}`, holder[key], name);
  }
  check('transitions.greetingInPlace', extras.transitions.greetingInPlace, 'X001-greeting-in-place');
  // Not delivered: the in-place chain (the conversation's order is the machine's own); still empty.
  expect(extras.transitions.chain).toEqual([]);
  expect(seen.size).toBe(26 * 5);
  // Each trigger is reactions.json's: one of the twelve reaction events or the three host facts (semantic.ts), never another.
  expect(manifest.reactionTriggers).toEqual(TRIGGERS);
  for (const event of Object.values(manifest.reactionTriggers)) expect(REACTION_EVENTS.has(event as SemanticEventType) || HOST_FACT_REACTIONS.has(event as SemanticEventType), String(event)).toBe(true);
  // Every file in the skin's folder is one the manifest names (nothing orphaned, nothing missing).
  const named = new Set([...ZIGI_STATES.flatMap(s => Object.values(skin.states[s]!).filter((v): v is string => typeof v === 'string')), ...seen]);
  expect(readdirSync(join(PUBLIC, SKIN_DIR)).map(n => `${SKIN_DIR}${n}`).sort()).toEqual([...named].sort());
});
test('the old placeholder frames are gone and nothing in the manifest names them', () => {
  for (const name of ['zigi-placeholder.webp', 'zigi-placeholder-2x.webp', 'zigi-placeholder-large.webp']) expect(existsSync(join(PUBLIC, 'brand', 'figures', name)), name).toBe(false);
  expect(JSON.stringify(manifest)).not.toContain('placeholder.webp');
});
