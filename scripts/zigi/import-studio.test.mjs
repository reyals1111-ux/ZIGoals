import {cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {afterEach, expect, test} from 'vitest';
import {BUDGETS, checkFile, EXTRA_SLOT, fillManifest, LOOPS, parseName, parseReceipt, PIXELS, run, sha256, STATE_BY_CODE} from './import-studio.mjs';
import {cheerOf, extrasOf, filesFor, idleVariantsOf, reactionArtOf, reactionOf, readManifest, skinOf, variantsOf} from '../../apps/web/components/zigi/manifest.ts';
import {studio4SlotProblems} from '../../apps/web/components/zigi/studio4.ts';
import {variantPools} from '../../apps/web/components/zigi/variants.ts';

/**
 * Session X-Local Part 2: a Studio-4 delivery is a pure file swap. The "studio4" fixture (scripts/zigi/fixtures/studio4,
 * built by make-studio4.mjs: the contract's names and formats, solid-colour frames, a SHA256SUMS, a reactions.json) is
 * dropped into a scratch copy of the repository and the importer fills every slot with no code change: the app's own
 * manifest reader then finds the idle variants, the gaze set, the in-place greeting and the named reactions. A bad hash,
 * an over-budget file, a non-contract file, an unlisted file and a missing receipt are each refused. Session AK Part 12:
 * the fixture carries the Studio-4 contract's additions (F010–F023 with their 2× animated WebP, X012, X030, X050–X054,
 * the looping reactions R003/R010/R011) and the importer's constants follow the manifest.
 */
const here = fileURLToPath(new URL('.', import.meta.url)), repo = join(here, '..', '..');
const fixture = join(here, 'fixtures', 'studio4'), receipt = join(fixture, 'SHA256SUMS');
const scratch = [];
afterEach(() => { for (const dir of scratch.splice(0)) rmSync(dir, {recursive: true, force: true}); });
/** A scratch repository: the real manifest, an empty skin folder. */
function scratchRepo() {
  const root = mkdtempSync(join(tmpdir(), 'zigi-import-'));
  scratch.push(root);
  mkdirSync(join(root, 'apps', 'web', 'components', 'zigi'), {recursive: true});
  mkdirSync(join(root, 'apps', 'web', 'public', 'brand', 'figures', 'zigi'), {recursive: true});
  cpSync(join(repo, 'apps', 'web', 'components', 'zigi', 'manifest.json'), join(root, 'apps', 'web', 'components', 'zigi', 'manifest.json'));
  return root;
}
const quiet = () => undefined;

test('contract names parse; anything else is refused by name', () => {
  expect(parseName('F001-idle.webp')).toEqual({code: 'F001', state: 'idle', role: '1x', ext: 'webp', key: '1x'});
  expect(parseName('F007-attention-large.webp')).toMatchObject({code: 'F007', state: 'attention', role: 'large'});
  expect(parseName('X020-gaze-chat-input-2x.webp')).toMatchObject({code: 'X020', state: 'gaze-chat-input', role: '2x'});
  expect(parseName('R013-reaction-13.anim.png')).toMatchObject({code: 'R013', role: 'animated', ext: 'png', key: 'animatedFallback'});
  expect(parseName('T001-thinking.anim.webp')).toMatchObject({code: 'T001', key: 'animated'});
  for (const bad of ['ZIGI_F001_quiet_idle.mp4', 'F001-idle.anim.gif', 'F001_idle.webp', 'f001-idle.webp', 'F001-idle.jpg', 'notes.txt', 'F001-Idle.webp', 'F001-idle.anim.192x253-24fps-q90.webp']) expect(parseName(bad), bad).toBeNull();
});
test('the receipt reads both shapes: the checkpoint table and SHA256SUMS', () => {
  const table = parseReceipt('| SHA-256 | Bytes | File | Pixels |\n|---|---:|---|---|\n| `' + 'a'.repeat(64) + '` | 12 | `F001-idle.webp` | 96×126 |\n');
  expect(table.get('F001-idle.webp')).toEqual({sha: 'a'.repeat(64), bytes: 12});
  const sums = parseReceipt('b'.repeat(64) + '  F002-greeting.webp\n' + 'c'.repeat(64) + ' *sub/F003-insight.webp\n');
  expect(sums.get('F002-greeting.webp')).toEqual({sha: 'b'.repeat(64), bytes: null}); expect(sums.get('F003-insight.webp')).toEqual({sha: 'c'.repeat(64), bytes: null});
  expect(parseReceipt(readFileSync(receipt, 'utf8')).size).toBe(255);
});
test('dropping the studio4 files in fills every slot, and the app\'s own reader finds them with no code change', () => {
  const root = scratchRepo();
  const result = run({source: fixture, receiptPath: receipt, apply: true, repoRoot: root, log: quiet});
  expect(result.problems).toEqual([]); expect(result.ok).toBe(true); expect(result.entries.length).toBe(255); expect(result.refused).toEqual([]);
  expect(result.diff.new.length).toBe(255);
  const skinDir = join(root, 'apps', 'web', 'public', 'brand', 'figures', 'zigi', 'origami-nebula');
  for (const name of result.entries) expect(readFileSync(join(skinDir, name)).equals(readFileSync(join(fixture, name))), name).toBe(true);
  const manifest = readManifest(JSON.parse(readFileSync(join(root, 'apps', 'web', 'components', 'zigi', 'manifest.json'), 'utf8')));
  const skin = skinOf('origami-nebula', manifest), extras = extrasOf(skin);
  // The eleven states' own files point at the delivered names; the base frame follows idle.
  for (const [state, code] of Object.entries({idle: 'F001', greeting: 'F002', insight: 'F003', listening: 'F004', speaking: 'F005', presenting: 'F006', attention: 'F007', sleepy: 'F008', celebrate: 'F009', thinking: 'T001', error: 'E001'})) {
    expect(skin.states[state]).toEqual({'1x': `/brand/figures/zigi/origami-nebula/${code}-${state}.webp`, '2x': `/brand/figures/zigi/origami-nebula/${code}-${state}-2x.webp`, large: `/brand/figures/zigi/origami-nebula/${code}-${state}-large.webp`, animated: `/brand/figures/zigi/origami-nebula/${code}-${state}.anim.webp`, animatedFallback: `/brand/figures/zigi/origami-nebula/${code}-${state}.anim.png`});
  }
  expect(skin.sizes['1x'].file).toBe(skin.states.idle['1x']);
  // Session AK Part 12: the fourteen states that wore a clip now carry their own five files and wear nothing.
  const fourteen = {'reading-your-data': 'F010', 'writing-proposal': 'F011', success: 'F012', proud: 'F013', curious: 'F014', surprised: 'F015', confused: 'F016', empathetic: 'F017', encouraging: 'F018', 'wave-goodbye': 'F019', reminder: 'F020', offline: 'F021', peek: 'F022', 'loading-model': 'F023'};
  for (const [state, code] of Object.entries(fourteen)) {
    expect(skin.states[state], state).toEqual({'1x': `/brand/figures/zigi/origami-nebula/${code}-${state}.webp`, '2x': `/brand/figures/zigi/origami-nebula/${code}-${state}-2x.webp`, large: `/brand/figures/zigi/origami-nebula/${code}-${state}-large.webp`, animated: `/brand/figures/zigi/origami-nebula/${code}-${state}.anim.webp`, animatedFallback: `/brand/figures/zigi/origami-nebula/${code}-${state}.anim.png`});
    expect(filesFor(skin, state, manifest), state).toMatchObject({from: state, files: {animated: `/brand/figures/zigi/origami-nebula/${code}-${state}.anim.webp`}});
  }
  // The slots: idle variants, the gaze set, the in-place greeting, the reactions; the app's readers see them.
  expect(idleVariantsOf(skin).map(c => c.name)).toEqual(['X010-idle-glance', 'X011-idle-settle', 'X012-idle-look']);
  expect(idleVariantsOf(skin)[2]).toMatchObject({kind: 'loop'});
  // Session AK Part 12: the Checklist's cheer, the variant pools (by the word after the code), the slots still read.
  expect(cheerOf(skin)).toMatchObject({name: 'X030-cheer', kind: 'one-shot', files: {animated: '/brand/figures/zigi/origami-nebula/X030-cheer.anim.webp'}});
  expect(variantsOf(skin).map(c => [c.name, c.kind])).toEqual([['X050-speaking-nod', 'loop'], ['X051-listening-tilt', 'loop'], ['X052-thinking-hum', 'loop'], ['X053-listening-lean', 'loop'], ['X054-celebrate-small-hop', 'one-shot']]);
  expect(Object.fromEntries(Object.entries(variantPools(skin)).map(([pool, list]) => [pool, list.map(v => v.id)]))).toEqual({speaking: ['X050-speaking-nod'], listening: ['X051-listening-tilt', 'X053-listening-lean'], thinking: ['X052-thinking-hum'], 'celebrate-small': ['X054-celebrate-small-hop']});
  expect(studio4SlotProblems(manifest)).toEqual([]);
  expect(idleVariantsOf(skin)[0]).toMatchObject({kind: 'loop', files: {animated: '/brand/figures/zigi/origami-nebula/X010-idle-glance.anim.webp', animatedFallback: '/brand/figures/zigi/origami-nebula/X010-idle-glance.anim.png', '1x': '/brand/figures/zigi/origami-nebula/X010-idle-glance.webp'}});
  expect(extras.gaze.chatInput.name).toBe('X020-gaze-chat-input'); expect(extras.gaze.viewer.name).toBe('X021-gaze-viewer'); expect(extras.gaze.target.name).toBe('X022-gaze-pointed-target');
  expect(extras.transitions.greetingInPlace).toMatchObject({name: 'X001-greeting-in-place', kind: 'one-shot'});
  expect(Object.values(extras.reactions).every(r => r !== null)).toBe(true);
  // Triggers come only from the delivery's reactions.json; the rest stay unnamed, so no reaction plays without a name.
  expect(reactionOf(skin, 'R001', manifest)).toMatchObject({trigger: 'card_accepted', clip: {name: 'R001-reaction-1'}});
  expect(reactionOf(skin, 'R002', manifest).trigger).toBe('goal_milestone');
  expect(reactionOf(skin, 'R003', manifest)).toBeNull(); expect(manifest.reactionTriggers.R003).toBeNull();
  // Session AK Part 12: a reaction named after one of the new events is art the controller can play; a looping reaction loops.
  expect(reactionOf(skin, 'R004', manifest).trigger).toBe('checkin_milestone');
  expect(reactionArtOf(skin, manifest).map(r => r.event)).toEqual(['card_accepted', 'goal_milestone', 'checkin_milestone']);
  expect(extras.reactions.R003.kind).toBe('loop'); expect(extras.reactions.R004.kind).toBe('one-shot');
  // A second run is a no-op: everything identical, nothing new.
  const again = run({source: fixture, receiptPath: receipt, apply: false, repoRoot: root, log: quiet});
  expect(again.diff).toEqual({new: [], identical: result.entries, changed: [], orphaned: []});
});
test('a dry run writes nothing', () => {
  const root = scratchRepo(), before = readFileSync(join(root, 'apps', 'web', 'components', 'zigi', 'manifest.json'), 'utf8');
  const result = run({source: fixture, receiptPath: receipt, apply: false, repoRoot: root, log: quiet});
  expect(result.ok).toBe(true);
  expect(existsSync(join(root, 'apps', 'web', 'public', 'brand', 'figures', 'zigi', 'origami-nebula'))).toBe(false);
  expect(readFileSync(join(root, 'apps', 'web', 'components', 'zigi', 'manifest.json'), 'utf8')).toBe(before);
});
test('a bad hash, an over-budget file, a wrong size, a still where a clip belongs, and an unlisted file are each refused; a non-contract file is refused by name', () => {
  const sums = parseReceipt(readFileSync(receipt, 'utf8')), still = readFileSync(join(fixture, 'F001-idle.webp')), clip = readFileSync(join(fixture, 'F001-idle.anim.webp'));
  expect(checkFile('F001-idle.webp', still, sums)).toEqual([]);
  expect(checkFile('F001-idle.webp', Buffer.concat([still, Buffer.from([0])]), sums).join('\n')).toMatch(/SHA-256 differs/);
  const big = new Map(sums); big.set('F001-idle.webp', {sha: sha256(Buffer.alloc(50_000)), bytes: null});
  expect(checkFile('F001-idle.webp', Buffer.alloc(50_000), big).join('\n')).toMatch(/over the 1x budget/);
  const wrong = new Map([['F001-idle-2x.webp', {sha: sha256(still), bytes: null}]]);
  expect(checkFile('F001-idle-2x.webp', still, wrong).join('\n')).toMatch(/96×126, expected 192×253/);
  const stillAsClip = new Map([['F001-idle.anim.webp', {sha: sha256(still), bytes: null}]]);
  expect(checkFile('F001-idle.anim.webp', still, stillAsClip).join('\n')).toMatch(/a still where an animation was expected/);
  expect(checkFile('F001-idle.anim.webp', clip, new Map()).join('\n')).toMatch(/not in the receipt/);
  expect(checkFile('F001-idle.anim.webp', clip, new Map(), {allowUnlisted: true})).toEqual([]);
  expect(checkFile('notes.txt', Buffer.from('x'), sums)).toEqual(['notes.txt: not a contract file name (refused)']);
  // The loop count follows the contract: idle loops, greeting plays once.
  const greeting = readFileSync(join(fixture, 'F002-greeting.anim.webp')), swapped = new Map([['F001-idle.anim.webp', {sha: sha256(greeting), bytes: null}]]);
  expect(checkFile('F001-idle.anim.webp', greeting, swapped).join('\n')).toMatch(/loop count 1, expected 0/);
});
test('a delivery with a tampered file, an extra file or no receipt is refused as a whole and nothing is written', () => {
  const copy = mkdtempSync(join(tmpdir(), 'zigi-delivery-')); scratch.push(copy);
  cpSync(fixture, copy, {recursive: true});
  writeFileSync(join(copy, 'F003-insight.webp'), Buffer.concat([readFileSync(join(copy, 'F003-insight.webp')), Buffer.from([0])]));
  writeFileSync(join(copy, 'ZIGI_F001_quiet_idle.mp4'), 'not a contract file');
  mkdirSync(join(copy, 'variants')); writeFileSync(join(copy, 'variants', 'F001-idle.anim.webp'), 'x');
  const root = scratchRepo(), lines = [];
  const result = run({source: copy, receiptPath: join(copy, 'SHA256SUMS'), apply: true, repoRoot: root, log: l => lines.push(l)});
  expect(result.ok).toBe(false); expect(result.problems.join('\n')).toMatch(/F003-insight\.webp: SHA-256 differs/);
  expect(result.refused).toEqual(['ZIGI_F001_quiet_idle.mp4 (not a contract file)', 'variants/ (a folder: not part of the contract)']);
  expect(existsSync(join(root, 'apps', 'web', 'public', 'brand', 'figures', 'zigi', 'origami-nebula'))).toBe(false);
  expect(run({source: copy, receiptPath: join(copy, 'missing'), repoRoot: root, log: quiet})).toMatchObject({ok: false});
  // An unlisted file: refused by default, taken with --allow-unlisted and announced.
  const unlisted = mkdtempSync(join(tmpdir(), 'zigi-unlisted-')); scratch.push(unlisted);
  cpSync(fixture, unlisted, {recursive: true}); cpSync(join(fixture, 'F001-idle.webp'), join(unlisted, 'F099-newstate.webp'));
  expect(run({source: unlisted, receiptPath: join(unlisted, 'SHA256SUMS'), repoRoot: scratchRepo(), log: quiet}).problems.join('\n')).toMatch(/F099-newstate\.webp: not in the receipt/);
  const said = [];
  expect(run({source: unlisted, receiptPath: join(unlisted, 'SHA256SUMS'), repoRoot: scratchRepo(), allowUnlisted: true, log: l => said.push(l)}).ok).toBe(true);
  expect(said.some(l => /WARNING: F099-newstate\.webp is not in the receipt/.test(l))).toBe(true);
});
test('filling the manifest is a pure data change: the input is not touched and unknown states are left alone', () => {
  const manifest = JSON.parse(readFileSync(join(repo, 'apps', 'web', 'components', 'zigi', 'manifest.json'), 'utf8')), frozen = JSON.stringify(manifest);
  const filled = fillManifest(manifest, 'origami-nebula', [{name: 'X010-idle-glance.anim.webp', parsed: parseName('X010-idle-glance.anim.webp')}], '/brand/figures/zigi/origami-nebula/');
  expect(JSON.stringify(manifest)).toBe(frozen);
  expect(filled.skins['origami-nebula'].extras.idleVariants.X010).toEqual({name: 'X010-idle-glance', files: {animated: '/brand/figures/zigi/origami-nebula/X010-idle-glance.anim.webp'}, kind: 'loop', durationMs: 0});
  expect(() => fillManifest(manifest, 'no-such-skin', [], '/x/')).toThrow(/no skin/);
  // Session AK Part 12: a manifest from before the new slots still takes X030 and the variants (the groups are made).
  const older = JSON.parse(frozen); delete older.skins['origami-nebula'].extras.celebrations; delete older.skins['origami-nebula'].extras.variants;
  const grown = fillManifest(older, 'origami-nebula', ['X030-cheer.anim.webp', 'X054-celebrate-small-hop.anim.png'].map(name => ({name, parsed: parseName(name)})), '/brand/figures/zigi/origami-nebula/');
  expect(grown.skins['origami-nebula'].extras.celebrations.cheer).toEqual({name: 'X030-cheer', files: {animated: '/brand/figures/zigi/origami-nebula/X030-cheer.anim.webp'}, kind: 'one-shot', durationMs: 0});
  expect(grown.skins['origami-nebula'].extras.variants.X054).toEqual({name: 'X054-celebrate-small-hop', files: {animatedFallback: '/brand/figures/zigi/origami-nebula/X054-celebrate-small-hop.anim.png'}, kind: 'one-shot', durationMs: 0});
  // With no extras at all, every group starts empty.
  const bare = JSON.parse(frozen); delete bare.skins['origami-nebula'].extras;
  expect(fillManifest(bare, 'origami-nebula', [], '/x/').skins['origami-nebula'].extras).toEqual({reactions: {}, idleVariants: {}, transitions: {greetingInPlace: null, chain: []}, gaze: {chatInput: null, viewer: null, target: null}, celebrations: {cheer: null}, variants: {}});
});
test('a delivery without the fourteen states\' own clips leaves them wearing a delivered one (the Studio-2 shape still imports)', () => {
  const partial = mkdtempSync(join(tmpdir(), 'zigi-partial-')); scratch.push(partial);
  cpSync(fixture, partial, {recursive: true});
  for (const code of Object.keys(STATE_BY_CODE).filter(c => /^F0(1\d|2[0-3])$/.test(c))) for (const name of readdirSync(partial).filter(n => n.startsWith(`${code}-`))) rmSync(join(partial, name));
  const root = scratchRepo(), result = run({source: partial, receiptPath: join(partial, 'SHA256SUMS'), apply: true, repoRoot: root, log: quiet});
  expect(result.ok).toBe(true); expect(result.entries.length).toBe(255 - 14 * 5);
  const manifest = readManifest(JSON.parse(readFileSync(join(root, 'apps', 'web', 'components', 'zigi', 'manifest.json'), 'utf8'))), skin = skinOf('origami-nebula', manifest);
  // The worn states still wear a delivered clip and resolve to files.
  expect(skin.states['reading-your-data'].wears).toBe('thinking'); expect(filesFor(skin, 'reading-your-data', manifest).files.animated).toBe(skin.states.thinking.animated);
  expect(skin.states.success.wears).toBe('insight'); expect(filesFor(skin, 'success', manifest).files.animated).toBe(skin.states.insight.animated);
});
test('Session AK Part 12 (ADR-036 D6): an animated WebP is the 2× set (192×253, 2.6 MB) or the app set (96×126, 400 kB); an APNG is 96×126 only', () => {
  expect(PIXELS.animated).toEqual([192, 253]); expect(PIXELS.animatedFallback).toEqual([96, 126]);
  expect(BUDGETS.animated2x).toBe(2_600_000); expect(BUDGETS.animated).toBe(400_000);
  const sums = parseReceipt(readFileSync(receipt, 'utf8')), twoX = readFileSync(join(fixture, 'F010-reading-your-data.anim.webp')), oneX = readFileSync(join(fixture, 'F001-idle.anim.webp'));
  expect(checkFile('F010-reading-your-data.anim.webp', twoX, sums)).toEqual([]);
  expect(checkFile('F001-idle.anim.webp', oneX, sums)).toEqual([]);
  // Padding past the end of the RIFF keeps the header readable: a 2× clip between 400 kB and 2.6 MB passes, one over 2.6 MB does not.
  const pad = (b, n) => Buffer.concat([b, Buffer.alloc(n - b.length)]);
  const listed = (name, bytes) => new Map([[name, {sha: sha256(bytes), bytes: null}]]);
  const big2x = pad(twoX, 1_000_000), huge2x = pad(twoX, 2_600_001), big1x = pad(oneX, 400_001);
  expect(checkFile('F010-reading-your-data.anim.webp', big2x, listed('F010-reading-your-data.anim.webp', big2x))).toEqual([]);
  expect(checkFile('F010-reading-your-data.anim.webp', huge2x, listed('F010-reading-your-data.anim.webp', huge2x)).join('\n')).toMatch(/over the 2× animated budget of 2600000/);
  expect(checkFile('F001-idle.anim.webp', big1x, listed('F001-idle.anim.webp', big1x)).join('\n')).toMatch(/over the animated budget of 400000/);
  // A 2× clip as the APNG fallback, or a 2× still where a clip belongs, is refused by size.
  const still2x = readFileSync(join(fixture, 'F001-idle-2x.webp'));
  expect(checkFile('F001-idle.anim.webp', still2x, listed('F001-idle.anim.webp', still2x)).join('\n')).toMatch(/a still where an animation was expected/);
  const large = readFileSync(join(fixture, 'F001-idle-large.webp'));
  expect(checkFile('F001-idle.anim.webp', large, listed('F001-idle.anim.webp', large)).join('\n')).toMatch(/480×632, expected 192×253 or 96×126/);
  const apng2x = Buffer.from(readFileSync(join(fixture, 'F001-idle.anim.png'))); apng2x.writeUInt32BE(192, 16); apng2x.writeUInt32BE(253, 20);
  expect(checkFile('F001-idle.anim.png', apng2x, listed('F001-idle.anim.png', apng2x)).join('\n')).toMatch(/192×253, expected 96×126/);
  // The looping reactions loop: a one-shot clip delivered as R003 is refused.
  const once = readFileSync(join(fixture, 'R001-reaction-1.anim.webp'));
  expect(checkFile('R003-reaction-3.anim.webp', once, listed('R003-reaction-3.anim.webp', once)).join('\n')).toMatch(/loop count 1, expected 0/);
});
test('Session AK Part 12: the importer\'s constants follow the manifest: every state code lands in its state, loops match the kinds, the new slots are named', () => {
  const manifest = JSON.parse(readFileSync(join(repo, 'apps', 'web', 'components', 'zigi', 'manifest.json'), 'utf8'));
  expect(Object.fromEntries(Object.entries(manifest.states).map(([state, spec]) => [spec.code, state]))).toEqual(STATE_BY_CODE);
  for (const [code, state] of Object.entries(STATE_BY_CODE)) expect(LOOPS.has(code), code).toBe(manifest.states[state].kind === 'loop');
  for (const code of ['F010', 'F011', 'F021', 'F022', 'F023', 'R003', 'R010', 'R011', 'X012', 'X050', 'X051', 'X052', 'X053']) expect(LOOPS.has(code), code).toBe(true);
  for (const code of ['F012', 'F020', 'R001', 'R004', 'X030', 'X054']) expect(LOOPS.has(code), code).toBe(false);
  expect(EXTRA_SLOT).toMatchObject({X012: ['idleVariants', 'X012'], X030: ['celebrations', 'cheer'], X050: ['variants', 'X050'], X051: ['variants', 'X051'], X052: ['variants', 'X052'], X053: ['variants', 'X053'], X054: ['variants', 'X054']});
  // The manifest the app ships names every slot the importer can fill except X012, which the importer adds (zigi-assets.test pins X010/X011).
  const extras = manifest.skins['origami-nebula'].extras;
  for (const [code, [group, key]] of Object.entries(EXTRA_SLOT)) if (code !== 'X012') expect(Object.hasOwn(extras[group], key), code).toBe(true);
});
