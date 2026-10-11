#!/usr/bin/env node
/**
 * Session X-Local Part 2 (ADR-017): a studio delivery becomes a pure file swap.
 *
 *   node scripts/zigi/import-studio.mjs <studio encoded/app folder> --receipt <file> [--skin origami-nebula] [--apply] [--allow-unlisted]
 *
 * Given a studio's `encoded/app` folder (the one holding `brand/figures/zigi/`, or that folder itself) and its receipt
 * (a checkpoint table `| sha256 | bytes | file |`, or a `SHA256SUMS` with `<sha256>  <name>` lines), the script:
 * - takes only contract files: `<code>-<state>.webp`, `-2x.webp`, `-large.webp`, `.anim.webp`, `.anim.png`, codes
 *   F001–F099, T001, E001, X0nn, R0nn; refuses everything else (reviews, large animations, videos, `.blend`, unknown names);
 * - verifies every file's SHA-256 against the receipt (an unlisted file is refused unless `--allow-unlisted`, and then
 *   printed loudly), its byte budget by role (1× 40 kB, 2× 100 kB, large 200 kB, animated 400 kB), its format from the
 *   bytes and its pixel size (96×126, 192×253, 480×632; animated 96×126), and that loops loop and one-shots play once;
 * - prints the diff against the repository (new, identical, changed, orphaned in the repo);
 * - with `--apply`, copies the files to `apps/web/public/brand/figures/zigi/<skin>/` byte for byte (never re-encoded) and
 *   fills the manifest's slots: the eleven states' own files, the extras (X001 greeting in place, X010/X011 idle
 *   variants, X020–X022 gaze, R001–R013 reactions) and, when the delivery ships a `reactions.json`
 *   (`{"R001": "<semantic event>"}`), the reaction triggers. Without `--apply` nothing is written.
 * Exit 0 only when every file verified; 1 on any refusal, with each reason on its own line.
 */
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, copyFileSync} from 'node:fs';
import {basename, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const BUDGETS = {'1x': 40_000, '2x': 100_000, large: 200_000, animated: 400_000};
export const PIXELS = {'1x': [96, 126], '2x': [192, 253], large: [480, 632], animated: [96, 126]};
export const NAME = /^(?<code>F0[0-9]{2}|T001|E001|X0\d\d|R0\d\d)-(?<state>[a-z]+(?:-[a-z0-9]+)*?)(?<suffix>-2x|-large)?\.webp$|^(?<acode>F0[0-9]{2}|T001|E001|X0\d\d|R0\d\d)-(?<astate>[a-z]+(?:-[a-z0-9]+)*)\.anim\.(?<aext>webp|png)$/;
/** The app's states by code (manifest.json keys), so a delivered state file lands in the right slot. */
const STATE_BY_CODE = {F001: 'idle', F002: 'greeting', F003: 'insight', F004: 'listening', F005: 'speaking', F006: 'presenting', F007: 'attention', F008: 'sleepy', F009: 'celebrate', T001: 'thinking', E001: 'error'};
const EXTRA_SLOT = {X001: ['transitions', 'greetingInPlace'], X010: ['idleVariants', 'X010'], X011: ['idleVariants', 'X011'], X020: ['gaze', 'chatInput'], X021: ['gaze', 'viewer'], X022: ['gaze', 'target']};
/** Loop modes the studio's contract fixes per code (loops loop, one-shots play once); extras by their documented kind. */
const LOOPS = new Set(['F001', 'F004', 'F005', 'F007', 'F008', 'T001', 'X010', 'X011', 'X020', 'X021', 'X022']);

export function parseName(name) {
  const m = NAME.exec(name); if (!m) return null;
  const g = m.groups;
  if (g.acode) return {code: g.acode, state: g.astate, role: 'animated', ext: g.aext, key: g.aext === 'png' ? 'animatedFallback' : 'animated'};
  const role = g.suffix === '-2x' ? '2x' : g.suffix === '-large' ? 'large' : '1x';
  return {code: g.code, state: g.state, role, ext: 'webp', key: role};
}
export function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
/** A receipt in either shape: the checkpoint table or SHA256SUMS; names are compared by basename. */
export function parseReceipt(text) {
  const map = new Map();
  for (const line of text.split('\n')) {
    const table = /^\|\s*`?([0-9a-f]{64})`?\s*\|\s*(\d+)\s*\|\s*`?([^`|]+?)`?\s*\|/.exec(line);
    if (table) { map.set(basename(table[3].trim()), {sha: table[1], bytes: Number(table[2])}); continue; }
    const sums = /^([0-9a-f]{64})\s+\*?(.+)$/.exec(line.trim());
    if (sums) map.set(basename(sums[2].trim()), {sha: sums[1], bytes: null});
  }
  return map;
}
export function webpHeader(b) {
  if (b.length < 30 || b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WEBP') return null;
  const chunk = b.toString('latin1', 12, 16);
  if (chunk === 'VP8X') {
    const animated = (b[20] & 0x02) !== 0, width = 1 + b.readUIntLE(24, 3), height = 1 + b.readUIntLE(27, 3);
    const anim = b.indexOf('ANIM'); const loops = animated && anim >= 0 ? b.readUInt16LE(anim + 12) : null;
    let frames = 0; for (let at = b.indexOf('ANMF'); at >= 0; at = b.indexOf('ANMF', at + 4)) frames++;
    return {format: 'webp', width, height, animated, frames: animated ? frames : 1, loops};
  }
  if (chunk === 'VP8 ') return {format: 'webp', width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff, animated: false, frames: 1, loops: null};
  if (chunk === 'VP8L') { const bits = b.readUInt32LE(21); return {format: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, animated: false, frames: 1, loops: null}; }
  return null;
}
export function pngHeader(b) {
  if (b.length < 33 || !b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return null;
  const width = b.readUInt32BE(16), height = b.readUInt32BE(20);
  let at = 8, animated = false, frames = 1, loops = null;
  while (at + 8 <= b.length) {
    const length = b.readUInt32BE(at), type = b.toString('latin1', at + 4, at + 8);
    if (type === 'acTL') { animated = true; frames = b.readUInt32BE(at + 8); loops = b.readUInt32BE(at + 12); }
    if (type === 'IDAT') break;
    at += 12 + length;
  }
  return {format: 'png', width, height, animated, frames, loops};
}
/** Every problem with one delivered file, in plain words; an empty list means it verified. */
export function checkFile(name, bytes, receipt, {allowUnlisted = false} = {}) {
  const problems = [], parsed = parseName(name);
  if (!parsed) return [`${name}: not a contract file name (refused)`];
  const listed = receipt.get(name);
  if (!listed) { if (!allowUnlisted) problems.push(`${name}: not in the receipt (refused; --allow-unlisted to take it anyway)`); }
  else {
    if (listed.sha !== sha256(bytes)) problems.push(`${name}: SHA-256 differs from the receipt`);
    if (listed.bytes !== null && listed.bytes !== bytes.length) problems.push(`${name}: ${bytes.length} bytes, the receipt says ${listed.bytes}`);
  }
  if (bytes.length > BUDGETS[parsed.role]) problems.push(`${name}: ${bytes.length} bytes is over the ${parsed.role} budget of ${BUDGETS[parsed.role]}`);
  const header = parsed.ext === 'png' ? pngHeader(bytes) : webpHeader(bytes);
  if (!header) problems.push(`${name}: not a ${parsed.ext === 'png' ? 'PNG' : 'WebP'} file by its bytes`);
  else {
    const [w, h] = PIXELS[parsed.role];
    if (header.width !== w || header.height !== h) problems.push(`${name}: ${header.width}×${header.height}, expected ${w}×${h}`);
    if (header.animated !== (parsed.role === 'animated')) problems.push(`${name}: ${header.animated ? 'animated where a still was expected' : 'a still where an animation was expected'}`);
    if (parsed.role === 'animated' && header.loops !== null) { const loop = LOOPS.has(parsed.code); if (header.loops !== (loop ? 0 : 1)) problems.push(`${name}: loop count ${header.loops}, expected ${loop ? '0 (a loop)' : '1 (plays once)'}`); }
  }
  return problems;
}
/** Where a file lands in the manifest: a state's own files, or an extras slot, or a reaction slot. */
export function slotFor(parsed) {
  const state = STATE_BY_CODE[parsed.code];
  if (state) return {kind: 'state', state, key: parsed.key};
  const extra = EXTRA_SLOT[parsed.code];
  if (extra) return {kind: 'extra', path: extra, key: parsed.key};
  if (/^R0\d\d$/.test(parsed.code)) return {kind: 'reaction', code: parsed.code, key: parsed.key};
  return {kind: 'state-unknown', key: parsed.key};
}
/** The manifest with the delivered files written into their slots (a pure data change; the object is copied). */
export function fillManifest(manifest, skinName, entries, publicPrefix, reactions = {}) {
  const next = JSON.parse(JSON.stringify(manifest)), skin = next.skins[skinName];
  if (!skin) throw new Error(`The manifest has no skin "${skinName}"`);
  skin.extras ??= {reactions: {}, idleVariants: {}, transitions: {greetingInPlace: null, chain: []}, gaze: {chatInput: null, viewer: null, target: null}};
  const clip = (holder, code, state) => holder ?? {name: `${code}-${state}`, files: {}, kind: LOOPS.has(code) ? 'loop' : 'one-shot', durationMs: 0};
  for (const {name, parsed} of entries) {
    const file = `${publicPrefix}${name}`, slot = slotFor(parsed);
    if (slot.kind === 'state') {
      const own = skin.states[slot.state] ?? {}; delete own.wears; own[slot.key] = file; skin.states[slot.state] = own;
      if (slot.state === 'idle' && (slot.key === '1x' || slot.key === '2x' || slot.key === 'large')) skin.sizes[slot.key] = {...skin.sizes[slot.key], file};
    } else if (slot.kind === 'extra') {
      const [group, key] = slot.path, c = clip(skin.extras[group][key], parsed.code, parsed.state); c.files[slot.key] = file; skin.extras[group][key] = c;
    } else if (slot.kind === 'reaction') {
      const c = clip(skin.extras.reactions[slot.code], parsed.code, parsed.state); c.files[slot.key] = file; skin.extras.reactions[slot.code] = c;
      next.reactionTriggers ??= {}; if (reactions[slot.code] && !next.reactionTriggers[slot.code]) next.reactionTriggers[slot.code] = reactions[slot.code];
    }
  }
  // A state that now has its own clip no longer wears another; the mapped states keep wearing the clip they name.
  for (const files of Object.values(skin.states)) if (files.wears && skin.states[files.wears]) { for (const key of ['1x', '2x', 'large', 'animated', 'animatedFallback']) if (skin.states[files.wears][key]) files[key] = skin.states[files.wears][key]; }
  return next;
}
export function run({source, receiptPath, skin = 'origami-nebula', apply = false, allowUnlisted = false, repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url))), log = console.log}) {
  const folder = existsSync(join(source, 'brand', 'figures', 'zigi')) ? join(source, 'brand', 'figures', 'zigi') : source;
  if (!existsSync(folder) || !statSync(folder).isDirectory()) return {ok: false, problems: [`${source}: no folder`]};
  if (!receiptPath || !existsSync(receiptPath)) return {ok: false, problems: [`${receiptPath ?? '(none)'}: the receipt is required (--receipt)`]};
  const receipt = parseReceipt(readFileSync(receiptPath, 'utf8'));
  const destination = join(repoRoot, 'apps', 'web', 'public', 'brand', 'figures', 'zigi', skin), publicPrefix = `/brand/figures/zigi/${skin}/`;
  const manifestPath = join(repoRoot, 'apps', 'web', 'components', 'zigi', 'manifest.json');
  const problems = [], entries = [], refused = [], diff = {new: [], identical: [], changed: [], orphaned: []};
  for (const name of readdirSync(folder).sort()) {
    const path = join(folder, name); if (statSync(path).isDirectory()) { refused.push(`${name}/ (a folder: not part of the contract)`); continue; }
    // The delivery's own metadata beside the files is not a contract file and not a refusal either.
    if (name === 'reactions.json' || name === '.DS_Store' || name === 'SHA256SUMS' || name === basename(receiptPath)) continue;
    const parsed = parseName(name);
    if (!parsed) { refused.push(`${name} (not a contract file)`); continue; }
    const bytes = readFileSync(path), found = checkFile(name, bytes, receipt, {allowUnlisted});
    if (found.length) { problems.push(...found); continue; }
    if (!receipt.get(name)) log(`WARNING: ${name} is not in the receipt and was taken because of --allow-unlisted`);
    const target = join(destination, name);
    if (!existsSync(target)) diff.new.push(name); else if (readFileSync(target).equals(bytes)) diff.identical.push(name); else diff.changed.push(name);
    entries.push({name, parsed, bytes, target});
  }
  if (existsSync(destination)) for (const name of readdirSync(destination)) if (!entries.some(e => e.name === name)) diff.orphaned.push(name);
  for (const r of refused) log(`refused: ${r}`);
  for (const [kind, names] of Object.entries(diff)) log(`${kind}: ${names.length}${names.length ? ` (${names.join(', ')})` : ''}`);
  if (problems.length) { for (const p of problems) log(`PROBLEM: ${p}`); return {ok: false, problems, refused, diff, entries: []}; }
  const reactionsPath = join(folder, 'reactions.json'), reactions = existsSync(reactionsPath) ? JSON.parse(readFileSync(reactionsPath, 'utf8')) : {};
  for (const [code, trigger] of Object.entries(reactions)) if (!/^R0\d\d$/.test(code) || typeof trigger !== 'string' || !/^[a-z_]+$/.test(trigger)) { problems.push(`reactions.json: ${code} → ${JSON.stringify(trigger)} is not a reaction code with a semantic event name`); }
  if (problems.length) { for (const p of problems) log(`PROBLEM: ${p}`); return {ok: false, problems, refused, diff, entries: []}; }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')), filled = fillManifest(manifest, skin, entries, publicPrefix, reactions);
  if (apply) {
    mkdirSync(destination, {recursive: true});
    for (const e of entries) copyFileSync(join(folder, e.name), e.target);
    writeFileSync(manifestPath, JSON.stringify(filled, null, 2) + '\n');
    log(`applied: ${entries.length} files copied to ${destination}; manifest slots filled`);
  } else log(`dry run: ${entries.length} files verified; nothing written (add --apply)`);
  return {ok: true, problems: [], refused, diff, entries: entries.map(e => e.name), manifest: filled};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const source = args.find(a => !a.startsWith('--') && !['--receipt', '--skin'].includes(args[args.indexOf(a) - 1]));
  if (!source) { console.error('Usage: node scripts/zigi/import-studio.mjs <studio encoded/app folder> --receipt <file> [--skin <name>] [--apply] [--allow-unlisted]'); process.exit(2); }
  const result = run({source: resolve(source), receiptPath: flag('--receipt') ? resolve(flag('--receipt')) : undefined, skin: flag('--skin') ?? 'origami-nebula', apply: args.includes('--apply'), allowUnlisted: args.includes('--allow-unlisted')});
  process.exit(result.ok ? 0 : 1);
}
