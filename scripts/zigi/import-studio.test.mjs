import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {afterEach, expect, test} from 'vitest';
import {checkFile, fillManifest, parseName, parseReceipt, run, sha256} from './import-studio.mjs';
import {extrasOf, filesFor, idleVariantsOf, reactionOf, readManifest, skinOf} from '../../apps/web/components/zigi/manifest.ts';

/**
 * Session X-Local Part 2: a Studio-4 delivery is a pure file swap. The "studio4" fixture (scripts/zigi/fixtures/studio4,
 * built by make-studio4.mjs: the contract's names and formats, solid-colour frames, a SHA256SUMS, a reactions.json) is
 * dropped into a scratch copy of the repository and the importer fills every slot with no code change: the app's own
 * manifest reader then finds the idle variants, the gaze set, the in-place greeting and the named reactions. A bad hash,
 * an over-budget file, a non-contract file, an unlisted file and a missing receipt are each refused.
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
  expect(parseReceipt(readFileSync(receipt, 'utf8')).size).toBe(150);
});
test('dropping the studio4 files in fills every slot, and the app\'s own reader finds them with no code change', () => {
  const root = scratchRepo();
  const result = run({source: fixture, receiptPath: receipt, apply: true, repoRoot: root, log: quiet});
  expect(result.problems).toEqual([]); expect(result.ok).toBe(true); expect(result.entries.length).toBe(150); expect(result.refused).toEqual([]);
  expect(result.diff.new.length).toBe(150);
  const skinDir = join(root, 'apps', 'web', 'public', 'brand', 'figures', 'zigi', 'origami-nebula');
  for (const name of result.entries) expect(readFileSync(join(skinDir, name)).equals(readFileSync(join(fixture, name))), name).toBe(true);
  const manifest = readManifest(JSON.parse(readFileSync(join(root, 'apps', 'web', 'components', 'zigi', 'manifest.json'), 'utf8')));
  const skin = skinOf('origami-nebula', manifest), extras = extrasOf(skin);
  // The eleven states' own files point at the delivered names; the base frame follows idle.
  for (const [state, code] of Object.entries({idle: 'F001', greeting: 'F002', insight: 'F003', listening: 'F004', speaking: 'F005', presenting: 'F006', attention: 'F007', sleepy: 'F008', celebrate: 'F009', thinking: 'T001', error: 'E001'})) {
    expect(skin.states[state]).toEqual({'1x': `/brand/figures/zigi/origami-nebula/${code}-${state}.webp`, '2x': `/brand/figures/zigi/origami-nebula/${code}-${state}-2x.webp`, large: `/brand/figures/zigi/origami-nebula/${code}-${state}-large.webp`, animated: `/brand/figures/zigi/origami-nebula/${code}-${state}.anim.webp`, animatedFallback: `/brand/figures/zigi/origami-nebula/${code}-${state}.anim.png`});
  }
  expect(skin.sizes['1x'].file).toBe(skin.states.idle['1x']);
  // The worn states still wear a delivered clip and resolve to files.
  expect(skin.states['reading-your-data'].wears).toBe('thinking'); expect(filesFor(skin, 'reading-your-data', manifest).files.animated).toBe(skin.states.thinking.animated);
  // The slots: idle variants, the gaze set, the in-place greeting, the reactions; the app's readers see them.
  expect(idleVariantsOf(skin).map(c => c.name)).toEqual(['X010-idle-glance', 'X011-idle-settle']);
  expect(idleVariantsOf(skin)[0]).toMatchObject({kind: 'loop', files: {animated: '/brand/figures/zigi/origami-nebula/X010-idle-glance.anim.webp', animatedFallback: '/brand/figures/zigi/origami-nebula/X010-idle-glance.anim.png', '1x': '/brand/figures/zigi/origami-nebula/X010-idle-glance.webp'}});
  expect(extras.gaze.chatInput.name).toBe('X020-gaze-chat-input'); expect(extras.gaze.viewer.name).toBe('X021-gaze-viewer'); expect(extras.gaze.target.name).toBe('X022-gaze-pointed-target');
  expect(extras.transitions.greetingInPlace).toMatchObject({name: 'X001-greeting-in-place', kind: 'one-shot'});
  expect(Object.values(extras.reactions).every(r => r !== null)).toBe(true);
  // Triggers come only from the delivery's reactions.json; the rest stay unnamed, so no reaction plays without a name.
  expect(reactionOf(skin, 'R001', manifest)).toMatchObject({trigger: 'card_accepted', clip: {name: 'R001-reaction-1'}});
  expect(reactionOf(skin, 'R002', manifest).trigger).toBe('goal_milestone');
  expect(reactionOf(skin, 'R003', manifest)).toBeNull(); expect(manifest.reactionTriggers.R003).toBeNull();
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
});
