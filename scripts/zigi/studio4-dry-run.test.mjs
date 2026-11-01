import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {crc32, deflateSync} from 'node:zlib';
import {afterAll, expect, test} from 'vitest';
import {BUDGETS, HOST_FACT_REACTIONS, PIXELS, PUSH_ART, PUSH_BUDGET, PUSH_TARGET, REACTION_EVENTS, run, webpHeader} from './import-studio.mjs';
import {cheerOf, filesFor, reactionArtOf, readManifest, skinOf} from '../../apps/web/components/zigi/manifest.ts';
import {HOST_FACT_REACTIONS as APP_HOST_FACT_REACTIONS, isSemanticEvent, REACTION_EVENTS as APP_REACTION_EVENTS} from '../../apps/web/components/zigi/semantic.ts';
import {checklistCelebrationArt, studio4SlotProblems} from '../../apps/web/components/zigi/studio4.ts';
import {variantPools} from '../../apps/web/components/zigi/variants.ts';

/**
 * Session AK F11 (ADR-036, owner follow-up 1): the Studio-4 swap rehearsed end to end before the art exists. A synthetic
 * delivery in the exact layout the studio ships (studio4-deliver/ with app/, app-2x-anim/, push/, reactions.json,
 * SHA256SUMS, RECEIPT.md) is built in the system's temp folder from the contract fixture (scripts/zigi/fixtures/studio4),
 * then goes through import-studio.mjs, by its function and by its command line (--repo-root), into a scratch copy of the
 * repository's targets: the SHA check, the folder roles, every byte budget at and over its limit (1× 40 kB, 2× 100 kB,
 * large 200 kB, animated 400 kB, the 2× animated set 2.6 MB, push 40 kB), the manifest update read back through the app's
 * own readers. Then everything is thrown away, and the last test proves the repository was never written.
 * Session AK Part 13 (the art arrived): the scratch repository starts from the manifest as it stood before the import
 * (fixtures/manifest-before-studio4.json: every Studio-4 slot empty), since the live one is now filled; push is 80 kB
 * (Studio-4's icon is 75,138 B) and the manifest carries the 2× budget the import wrote.
 */
const here = fileURLToPath(new URL('.', import.meta.url)), repo = join(here, '..', '..');
const importer = join(here, 'import-studio.mjs'), contract = join(here, 'fixtures', 'studio4');
const WEB = join(repo, 'apps', 'web'), SKIN = 'origami-nebula', PREFIX = `/brand/figures/zigi/${SKIN}/`;
const quiet = () => undefined;
const sha = (b) => createHash('sha256').update(b).digest('hex');

/** What the repository holds before the suite: the last test compares, so a write into the repo would be caught. */
const repoState = () => {
  const list = (dir) => existsSync(dir) ? readdirSync(dir).sort() : null;
  return {
    manifest: sha(readFileSync(join(WEB, 'components', 'zigi', 'manifest.json'))), sw: sha(readFileSync(join(WEB, 'public', 'sw.js'))),
    skin: list(join(WEB, 'public', 'brand', 'figures', 'zigi', SKIN)), icons: list(join(WEB, 'public', 'icons')), fixture: list(contract).map(n => [n, sha(readFileSync(join(contract, n)))]),
  };
};
const before = repoState();
const temps = [];
const temp = (label) => { const dir = mkdtempSync(join(tmpdir(), `zigi-studio4-${label}-`)); temps.push(dir); return dir; };
afterAll(() => { for (const dir of temps.splice(0)) rmSync(dir, {recursive: true, force: true}); });

/** A PNG still (IHDR, one IDAT, IEND, real CRCs): the push art's shape. */
function pngStill(w, h) {
  const chunk = (type, body) => { const len = Buffer.alloc(4), crc = Buffer.alloc(4), t = Buffer.from(type, 'latin1'); len.writeUInt32BE(body.length); crc.writeUInt32BE(crc32(Buffer.concat([t, body]))); return Buffer.concat([len, t, body, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.alloc((1 + w * 4) * h))), chunk('IEND', Buffer.alloc(0))]);
}
/** Every file of a delivery, relative to its root, sorted (the receipts' lines). */
const artFiles = (root) => ['app', 'app-2x-anim', 'push'].filter(d => existsSync(join(root, d))).flatMap(d => readdirSync(join(root, d)).sort().map(n => `${d}/${n}`));
/** The studio's two receipts for a delivery as it stands: SHA256SUMS (paths) and RECEIPT.md (a checkpoint table with bytes). */
function sign(root) {
  const rows = artFiles(root).map(rel => { const b = readFileSync(join(root, rel)); return {rel, sha: sha(b), bytes: b.length}; });
  writeFileSync(join(root, 'SHA256SUMS'), rows.map(r => `${r.sha}  ${r.rel}`).join('\n') + '\n');
  writeFileSync(join(root, 'RECEIPT.md'), ['# Studio-4 delivery receipt (synthetic, F11 dry run)', '', 'Every file below, by its path in the delivery.', '',
    '| SHA-256 | Bytes | File |', '|---|---:|---|', ...rows.map(r => `| \`${r.sha}\` | ${r.bytes} | \`${r.rel}\` |`), ''].join('\n'));
}
/**
 * The synthetic delivery: the contract fixture's 255 files sorted into the studio's folders (the 192×253 clips into
 * app-2x-anim/, everything else into app/), plus F001 in the 2× set and F010 in the app set (the same clip in both sets),
 * the push icon and badge, the reaction triggers (four of the twelve reaction events, and one that is not), both receipts.
 */
function buildDelivery() {
  const root = join(temp('deliver'), 'studio4-deliver');
  for (const d of ['app', 'app-2x-anim', 'push']) mkdirSync(join(root, d), {recursive: true});
  for (const name of readdirSync(contract)) {
    if (name === 'SHA256SUMS' || name === 'reactions.json') continue;
    const bytes = readFileSync(join(contract, name)), h = name.endsWith('.anim.webp') ? webpHeader(bytes) : null;
    writeFileSync(join(root, h && h.width === PIXELS.animated[0] ? 'app-2x-anim' : 'app', name), bytes);
  }
  cpSync(join(contract, 'F010-reading-your-data.anim.webp'), join(root, 'app-2x-anim', 'F001-idle.anim.webp')); // a 2× loop
  cpSync(join(contract, 'F001-idle.anim.webp'), join(root, 'app', 'F010-reading-your-data.anim.webp')); // a 96×126 loop
  writeFileSync(join(root, 'push', 'zigi-push-icon-192.png'), pngStill(192, 192));
  writeFileSync(join(root, 'push', 'zigi-push-badge-96.png'), pngStill(96, 96));
  writeFileSync(join(root, 'reactions.json'), JSON.stringify({R001: 'assistant_acknowledged', R003: 'assistant_working', R004: 'checkin_milestone', R005: 'action_undone', R012: 'card_accepted'}, null, 2) + '\n');
  sign(root);
  return root;
}
/** A scratch copy of the importer's targets: the manifest before the import, the public folders, nothing else of the repository. */
function scratchRepo() {
  const root = temp('repo');
  mkdirSync(join(root, 'apps', 'web', 'components', 'zigi'), {recursive: true});
  mkdirSync(join(root, 'apps', 'web', 'public', 'brand', 'figures', 'zigi'), {recursive: true});
  cpSync(join(here, 'fixtures', 'manifest-before-studio4.json'), join(root, 'apps', 'web', 'components', 'zigi', 'manifest.json'));
  return root;
}
const copyOf = (delivery) => { const root = join(temp('variant'), 'studio4-deliver'); cpSync(delivery, root, {recursive: true}); return root; };
const pad = (path, size) => { const b = readFileSync(path); writeFileSync(path, Buffer.concat([b, Buffer.alloc(size - b.length)])); };
const manifestOf = (root) => readFileSync(join(root, 'apps', 'web', 'components', 'zigi', 'manifest.json'), 'utf8');
const nothingWritten = (root, manifestBefore) => {
  expect(existsSync(join(root, 'apps', 'web', 'public', 'brand', 'figures', 'zigi', SKIN))).toBe(false);
  expect(existsSync(join(root, 'apps', 'web', 'public', 'icons'))).toBe(false);
  expect(manifestOf(root)).toBe(manifestBefore);
};
const importInto = (delivery, root, extra = {}) => run({source: delivery, receiptPath: join(delivery, 'SHA256SUMS'), apply: true, repoRoot: root, log: quiet, ...extra});

const delivery = buildDelivery();

test('the synthetic delivery has the exact Studio-4 layout and both receipts list every file by its path', () => {
  expect(readdirSync(delivery).sort()).toEqual(['RECEIPT.md', 'SHA256SUMS', 'app', 'app-2x-anim', 'push', 'reactions.json']);
  const files = artFiles(delivery);
  expect(files.filter(f => f.startsWith('app-2x-anim/')).length).toBe(15); // F010–F023 and F001
  expect(files.every(f => !f.startsWith('app-2x-anim/') || f.endsWith('.anim.webp'))).toBe(true);
  expect(files.filter(f => f.startsWith('push/'))).toEqual(['push/zigi-push-badge-96.png', 'push/zigi-push-icon-192.png']);
  expect(readFileSync(join(delivery, 'SHA256SUMS'), 'utf8').trim().split('\n').length).toBe(files.length);
  expect(readFileSync(join(delivery, 'RECEIPT.md'), 'utf8')).toContain('| `' + sha(readFileSync(join(delivery, 'app', 'F001-idle.webp'))) + '` | ');
});

test('the importer takes the whole delivery into a scratch repository: the files byte for byte, the 2× set in the slot, the push art beside the app icon', () => {
  const root = scratchRepo(), said = [];
  const result = importInto(delivery, root, {log: (line) => said.push(line)});
  expect(result.problems).toEqual([]); expect(result.ok).toBe(true); expect(result.refused).toEqual([]);
  expect(result.entries.length).toBe(255); expect(result.diff.new.length).toBe(257);
  // The same clip in both sets: the 2× one fills the slot, the app-set copy is verified and left out.
  expect(result.superseded).toEqual(['app/F001-idle.anim.webp', 'app/F010-reading-your-data.anim.webp']);
  const skinDir = join(root, 'apps', 'web', 'public', 'brand', 'figures', 'zigi', SKIN);
  for (const name of result.entries) {
    const from = existsSync(join(delivery, 'app-2x-anim', name)) ? join(delivery, 'app-2x-anim', name) : join(delivery, 'app', name);
    expect(readFileSync(join(skinDir, name)).equals(readFileSync(from)), name).toBe(true);
  }
  expect(webpHeader(readFileSync(join(skinDir, 'F001-idle.anim.webp')))).toMatchObject({width: 192, height: 253, animated: true, loops: 0});
  expect(webpHeader(readFileSync(join(skinDir, 'F010-reading-your-data.anim.webp')))).toMatchObject({width: 192, height: 253});
  // The push art lands under its own names, never over the app icon; the worker's slot is a code change the script prints.
  expect(result.push).toEqual(['push/zigi-push-badge-96.png', 'push/zigi-push-icon-192.png']);
  expect(result.pushArt).toEqual(PUSH_TARGET); expect(PUSH_ART).toEqual(PUSH_TARGET); expect(PUSH_TARGET.icon).not.toBe('/icons/zigoals-192.png');
  for (const [role, file] of Object.entries(PUSH_TARGET)) expect(readFileSync(join(root, 'apps', 'web', 'public', file)).equals(readFileSync(join(delivery, 'push', role === 'icon' ? 'zigi-push-icon-192.png' : 'zigi-push-badge-96.png'))), role).toBe(true);
  expect(said.some(l => l.startsWith('push art: set PUSH_ART in apps/web/public/sw.js') && l.includes(PUSH_TARGET.icon))).toBe(true);
  // A trigger outside the twelve reaction events (and the three host facts) is taken but said out loud.
  expect(said).toContain('WARNING: reactions.json names R012 → card_accepted, not one of the twelve reaction events or the three host facts; the app will not play it');
  // A second run finds everything identical.
  const again = run({source: delivery, receiptPath: join(delivery, 'SHA256SUMS'), repoRoot: root, log: quiet});
  expect(again.ok).toBe(true); expect(again.diff.new).toEqual([]); expect(again.diff.changed).toEqual([]); expect(again.diff.identical.length).toBe(257);
});

test('the manifest update, read back through the app\'s own readers: every slot filled, the states and the optical offset untouched', () => {
  const root = scratchRepo(), original = JSON.parse(manifestOf(root));
  expect(importInto(delivery, root).ok).toBe(true);
  const raw = JSON.parse(manifestOf(root)), manifest = readManifest(raw), skin = skinOf(SKIN, manifest);
  // Data only: the state specs and every other top-level field stay; the budgets gain the 2× set's (D6).
  expect(raw.states).toEqual(original.states);
  expect(raw.budgetBytes).toEqual({...original.budgetBytes, animated2x: BUDGETS.animated2x});
  expect(Object.keys(raw)).toEqual(Object.keys(original));
  // The optical offset is measured from the idle art, so the swap keeps the old one until it is re-measured (the runbook).
  expect(skin.opticalOffset).toEqual(original.skins[SKIN].opticalOffset);
  expect(studio4SlotProblems(raw)).toEqual([]);
  // Twenty-five states, each with its own five files; the 2× clip is the animated one; nothing wears another any more.
  for (const [state, spec] of Object.entries(raw.states)) {
    const own = `${PREFIX}${spec.code}-${state}`;
    expect(skin.states[state], state).toEqual({'1x': `${own}.webp`, '2x': `${own}-2x.webp`, large: `${own}-large.webp`, animated: `${own}.anim.webp`, animatedFallback: `${own}.anim.png`});
    expect(filesFor(skin, state, manifest).from, state).toBe(state);
  }
  expect(skin.sizes['1x'].file).toBe(`${PREFIX}F001-idle.webp`);
  // The X030 cheer reaches the Checklist's slot (the switch itself is the swap session's, with the owner's review).
  expect(cheerOf(skin)).toMatchObject({name: 'X030-cheer', kind: 'one-shot'});
  expect(checklistCelebrationArt(skin)).toMatchObject({source: 'studio4-x030', clip: {name: 'X030-cheer'}});
  // The variant rotation's pools fill from the names; the idle variants grow by X012.
  expect(Object.fromEntries(Object.entries(variantPools(skin)).map(([pool, list]) => [pool, list.map(v => v.id)]))).toEqual({speaking: ['X050-speaking-nod'], listening: ['X051-listening-tilt', 'X053-listening-lean'], thinking: ['X052-thinking-hum'], 'celebrate-small': ['X054-celebrate-small-hop']});
  expect(Object.keys(skin.extras.idleVariants)).toEqual(['X010', 'X011', 'X012']);
  expect(skin.extras.gaze.chatInput.name).toBe('X020-gaze-chat-input'); expect(skin.extras.transitions.greetingInPlace.name).toBe('X001-greeting-in-place');
  // The reactions the controller will play: those named by reactions.json with one of the twelve events (alive.ts's filter).
  const playable = reactionArtOf(skin, manifest).map(r => r.event).filter(e => isSemanticEvent(e) && APP_REACTION_EVENTS.has(e));
  expect(playable).toEqual(['assistant_acknowledged', 'assistant_working', 'checkin_milestone', 'action_undone']);
  expect(reactionArtOf(skin, manifest).map(r => r.event)).toContain('card_accepted');
  expect(raw.reactionTriggers.R002).toBeNull(); expect(skin.extras.reactions.R003.kind).toBe('loop');
});

test('the command line, as the runbook runs it: a dry run writes nothing, --apply writes into --repo-root only, a tampered delivery exits 1', () => {
  const root = scratchRepo(), manifestBefore = manifestOf(root);
  const cli = (...args) => spawnSync(process.execPath, [importer, delivery, '--receipt', join(delivery, 'SHA256SUMS'), '--repo-root', root, ...args], {encoding: 'utf8'});
  const dry = cli();
  expect(dry.status, dry.stdout + dry.stderr).toBe(0); expect(dry.stdout).toContain('dry run: 257 files verified; nothing written (add --apply)');
  nothingWritten(root, manifestBefore);
  const applied = cli('--apply');
  expect(applied.status, applied.stdout + applied.stderr).toBe(0); expect(applied.stdout).toContain('applied: 255 files copied to');
  expect(existsSync(join(root, 'apps', 'web', 'public', 'brand', 'figures', 'zigi', SKIN, 'X030-cheer.anim.webp'))).toBe(true);
  expect(JSON.parse(manifestOf(root)).skins[SKIN].extras.celebrations.cheer.name).toBe('X030-cheer');
  const tampered = copyOf(delivery), file = join(tampered, 'app-2x-anim', 'F012-success.anim.webp'), b = readFileSync(file); b[b.length - 1] ^= 0xff; writeFileSync(file, b);
  const fresh = scratchRepo(), freshBefore = manifestOf(fresh);
  const bad = spawnSync(process.execPath, [importer, tampered, '--receipt', join(tampered, 'SHA256SUMS'), '--repo-root', fresh, '--apply'], {encoding: 'utf8'});
  expect(bad.status).toBe(1); expect(bad.stdout).toContain('PROBLEM: app-2x-anim/F012-success.anim.webp: SHA-256 differs from the receipt');
  nothingWritten(fresh, freshBefore);
});

test('the SHA check refuses a tampered file, a file the receipt does not list and a RECEIPT.md that disagrees, and nothing is written', () => {
  const tampered = copyOf(delivery), file = join(tampered, 'app', 'F003-insight-2x.webp'), b = readFileSync(file); b[b.length - 1] ^= 0x01; writeFileSync(file, b);
  let root = scratchRepo(), manifestBefore = manifestOf(root);
  const result = importInto(tampered, root);
  expect(result.ok).toBe(false);
  // The byte count still agrees (RECEIPT.md's table is checked too); only the hash does not.
  expect(result.problems).toEqual(['app/F003-insight-2x.webp: SHA-256 differs from the receipt']);
  nothingWritten(root, manifestBefore);
  // Grown by a byte and re-hashed in SHA256SUMS only: RECEIPT.md disagrees.
  const grown = copyOf(delivery), at = join(grown, 'app', 'F003-insight.webp'), longer = Buffer.concat([readFileSync(at), Buffer.from([0])]); writeFileSync(at, longer);
  writeFileSync(join(grown, 'SHA256SUMS'), readFileSync(join(grown, 'SHA256SUMS'), 'utf8').replace(/^[0-9a-f]{64}(?= {2}app\/F003-insight\.webp$)/m, sha(longer)));
  root = scratchRepo(); manifestBefore = manifestOf(root);
  expect(importInto(grown, root).problems).toEqual(['RECEIPT.md and SHA256SUMS disagree on app/F003-insight.webp']);
  nothingWritten(root, manifestBefore);
  // A file the studio did not list is refused (and taken, announced, only with --allow-unlisted).
  const extra = copyOf(delivery); cpSync(join(extra, 'app', 'F001-idle.webp'), join(extra, 'app', 'F099-unlisted.webp'));
  root = scratchRepo(); manifestBefore = manifestOf(root);
  expect(importInto(extra, root).problems).toEqual(['app/F099-unlisted.webp: not in the receipt (refused; --allow-unlisted to take it anyway)']);
  nothingWritten(root, manifestBefore);
});

/** The budgets the owner fixed, one file per role: [file in the delivery, its limit, the words of the refusal]. */
const ROLES = [
  ['app/F001-idle.webp', 40_000, 'over the 1x budget of 40000'],
  ['app/F001-idle-2x.webp', 100_000, 'over the 2x budget of 100000'],
  ['app/F001-idle-large.webp', 200_000, 'over the large budget of 200000'],
  ['app/F002-greeting.anim.webp', 400_000, 'over the animated budget of 400000'],
  ['app/F002-greeting.anim.png', 400_000, 'over the animated budget of 400000'],
  ['app-2x-anim/F012-success.anim.webp', 2_600_000, 'over the 2× animated budget of 2600000'],
  ['push/zigi-push-icon-192.png', 80_000, 'over the push icon budget of 80000'],
];
test('the budgets the owner fixed match the importer and the manifest (1× 40 kB, 2× 100 kB, large 200 kB, animated 400 kB, 2× animated 2.6 MB)', () => {
  expect(BUDGETS).toEqual({'1x': 40_000, '2x': 100_000, large: 200_000, animated: 400_000, animated2x: 2_600_000});
  // Session AK Part 13: the import wrote the 2× set's budget into the manifest; push is 80 kB (Studio-4's icon, 75,138 B).
  expect(JSON.parse(readFileSync(join(WEB, 'components', 'zigi', 'manifest.json'), 'utf8')).budgetBytes).toEqual({'1x': 40_000, '2x': 100_000, large: 200_000, animated: 400_000, animated2x: 2_600_000});
  expect(PUSH_BUDGET).toBe(80_000);
});
test('every role at exactly its budget is taken (the 2× clips lazily, one file each up to 2.6 MB)', () => {
  const full = copyOf(delivery);
  for (const [rel, limit] of ROLES) pad(join(full, rel), limit);
  sign(full);
  const root = scratchRepo(), result = importInto(full, root);
  expect(result.problems).toEqual([]); expect(result.ok).toBe(true);
  for (const [rel, limit] of ROLES) if (!rel.startsWith('push/')) expect(statSync(join(root, 'apps', 'web', 'public', 'brand', 'figures', 'zigi', SKIN, rel.split('/')[1])).size, rel).toBe(limit);
});
test.each(ROLES)('one byte over: %s is refused, the whole delivery with it, and nothing is written', (rel, limit, words) => {
  const over = copyOf(delivery);
  pad(join(over, rel), limit + 1);
  sign(over); // the studio signed the heavy file: only the budget refuses it
  const root = scratchRepo(), manifestBefore = manifestOf(root), result = importInto(over, root);
  expect(result.ok).toBe(false);
  expect(result.problems).toEqual([`${rel}: ${limit + 1} bytes is ${words}`]);
  nothingWritten(root, manifestBefore);
});

test('each folder keeps its role: a 2× clip in app/, a still or an app-set clip in app-2x-anim/, a push image of the wrong size or a second icon are refused', () => {
  const cases = [
    ['a 2× clip in app/', (d) => renameSync(join(d, 'app-2x-anim', 'F012-success.anim.webp'), join(d, 'app', 'F012-success.anim.webp')), 'app/F012-success.anim.webp: a 192×253 clip belongs in app-2x-anim/ (app/ holds the 96×126 app set, 400000 bytes)'],
    ['a still in app-2x-anim/', (d) => cpSync(join(d, 'app', 'F002-greeting-2x.webp'), join(d, 'app-2x-anim', 'F002-greeting-2x.webp')), 'app-2x-anim/F002-greeting-2x.webp: app-2x-anim/ holds only the 2× animated set (192×253 .anim.webp)'],
    ['an app-set clip in app-2x-anim/', (d) => renameSync(join(d, 'app', 'F002-greeting.anim.webp'), join(d, 'app-2x-anim', 'F002-greeting.anim.webp')), 'app-2x-anim/F002-greeting.anim.webp: app-2x-anim/ holds only the 2× animated set (192×253 .anim.webp)'],
    ['a badge at 192×192', (d) => writeFileSync(join(d, 'push', 'zigi-push-badge-96.png'), pngStill(192, 192)), 'push/zigi-push-badge-96.png: 192×192, expected 96×96'],
    ['a second icon', (d) => writeFileSync(join(d, 'push', 'zz-icon.png'), pngStill(192, 192)), 'push/zz-icon.png: a second push icon (one each)'],
    ['an unknown push image', (d) => writeFileSync(join(d, 'push', 'hero.png'), pngStill(192, 192)), 'push/hero.png: not a push image name (…icon….png or …badge….png; refused)'],
  ];
  for (const [what, change, problem] of cases) {
    const d = copyOf(delivery); change(d); sign(d);
    const root = scratchRepo(), manifestBefore = manifestOf(root), result = importInto(d, root);
    expect(result.ok, what).toBe(false); expect(result.problems, what).toEqual([problem]);
    nothingWritten(root, manifestBefore);
  }
  // Loose files at the root and unknown folders are refused by name and never copied.
  const d = copyOf(delivery); writeFileSync(join(d, 'notes.txt'), 'x'); mkdirSync(join(d, 'review')); writeFileSync(join(d, 'review', 'F001-idle.webp'), 'x');
  const result = importInto(d, scratchRepo());
  expect(result.refused).toEqual(['notes.txt (at the delivery\'s root: art goes in app/, app-2x-anim/ or push/)', 'review/ (a folder: not part of the contract)']);
});

test('the importer\'s reaction events are the app\'s twelve, and its host facts the app\'s three', () => {
  expect(new Set(REACTION_EVENTS)).toEqual(APP_REACTION_EVENTS);
  expect(REACTION_EVENTS.length).toBe(12);
  expect(new Set(HOST_FACT_REACTIONS)).toEqual(APP_HOST_FACT_REACTIONS); expect(HOST_FACT_REACTIONS).toEqual(['connection_lost', 'connection_restored', 'user_dismissed']);
  // The push targets are plain /icons/ PNG paths, the shape lib/zigi-studio4/push-art.test.ts accepts.
  for (const file of Object.values(PUSH_TARGET)) expect(file).toMatch(/^\/icons\/[a-z0-9-]+\.png$/);
});

test('then thrown away: every temp folder is deleted and the repository was never written', () => {
  const made = temps.splice(0);
  expect(made.length).toBeGreaterThan(10);
  for (const dir of made) { expect(relative(repo, dir).startsWith('..'), dir).toBe(true); rmSync(dir, {recursive: true, force: true}); expect(existsSync(dir), dir).toBe(false); }
  expect(repoState()).toEqual(before);
});
