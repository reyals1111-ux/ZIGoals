#!/usr/bin/env node
/**
 * Session X-Local Part 2 (ADR-017): a studio delivery becomes a pure file swap.
 *
 *   node scripts/zigi/import-studio.mjs <studio encoded/app folder> --receipt <file> [--skin origami-nebula] [--apply] [--allow-unlisted] [--repo-root <dir>]
 *
 * Given a studio's `encoded/app` folder (the one holding `brand/figures/zigi/`, or that folder itself) and its receipt
 * (a checkpoint table `| sha256 | bytes | file |`, or a `SHA256SUMS` with `<sha256>  <name>` lines), the script:
 * - takes only contract files: `<code>-<state>.webp`, `-2x.webp`, `-large.webp`, `.anim.webp`, `.anim.png`, codes
 *   F001–F099, T001, E001, X0nn, R0nn; refuses everything else (reviews, large animations, videos, `.blend`, unknown names);
 * - verifies every file's SHA-256 against the receipt (an unlisted file is refused unless `--allow-unlisted`, and then
 *   printed loudly), its byte budget by role (1× 40 kB, 2× 100 kB, large 200 kB, animated 400 kB; the 2× animated WebP
 *   2.6 MB, ADR-036 D6), its format from the bytes and its pixel size (96×126, 192×253, 480×632; an animated WebP
 *   192×253 (the 2× set) or 96×126 (the app set), the APNG fallback 96×126), and that loops loop and one-shots play once;
 * - prints the diff against the repository (new, identical, changed, orphaned in the repo);
 * - with `--apply`, copies the files to `apps/web/public/brand/figures/zigi/<skin>/` byte for byte (never re-encoded) and
 *   fills the manifest's slots: the twenty-five states' own files (Session AK Part 12 adds F010–F023), the extras (X001
 *   greeting in place, X010–X012 idle variants, X020–X022 gaze, X030 the Checklist's cheer, X050–X054 the speaking/
 *   listening/thinking/celebrate-small variants, R001–R013 reactions) and, when the delivery ships a `reactions.json`
 *   (`{"R001": "<semantic event>"}`), the reaction triggers. Without `--apply` nothing is written.
 * Exit 0 only when every file verified; 1 on any refusal, with each reason on its own line.
 *
 * Session AK F11 (ADR-036, owner follow-up 1): Studio-4's delivery layout is read as well. A folder holding `app/` is
 * taken as `studio4-deliver/`:
 *   app/            the stills (1×, 2×, large), the app set's animated WebP (96×126, 400 kB) and the APNG fallbacks;
 *   app-2x-anim/    the 2× animated set only: `.anim.webp` at 192×253, at most 2.6 MB each (D6), loaded lazily;
 *   push/           the notification art: one `…icon….png` (192×192) and one `…badge….png` (96×96), 40 kB each;
 *   reactions.json, SHA256SUMS (paths relative to the delivery, e.g. `app/F001-idle.webp`), RECEIPT.md.
 * Each file is checked against the receipt by its path (then by its name), and in its folder's role: a 192×253 clip in
 * `app/`, or anything but a 2× clip in `app-2x-anim/`, is refused. When a clip comes in both sets, the 2× one fills the
 * manifest's `animated` (D6) and the app-set copy is verified and reported as superseded, never copied. A RECEIPT.md with a
 * checkpoint table must agree with SHA256SUMS. The push art is copied to `apps/web/public/icons/` under PUSH_TARGET's
 * names; the script never edits code, so it prints the PUSH_ART line to set in `public/sw.js` (and here). A
 * `reactions.json` naming an event outside the twelve reaction events is taken but announced (the app would not play it).
 * `--repo-root <dir>` writes into another checkout (a rehearsal copy); without it, this repository, as before.
 */
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, copyFileSync} from 'node:fs';
import {basename, dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const BUDGETS = {'1x': 40_000, '2x': 100_000, large: 200_000, animated: 400_000, animated2x: 2_600_000};
/** Session AK Part 12 (ADR-036 D6): Studio-4's animated WebP is the 2× set (192×253, ≤ 2.6 MB, loaded lazily one clip at a
 * time); the 96×126 app size stays the fallback (an app-set WebP, and every APNG) at its 400 kB budget. */
export const PIXELS = {'1x': [96, 126], '2x': [192, 253], large: [480, 632], animated: [192, 253], animatedFallback: [96, 126]};
/** Session AK Part 12: the notification art slot public/sw.js reads (PUSH_ART there); Studio-4's push images replace these paths. */
export const PUSH_ART = {icon: '/icons/zigoals-192.png', badge: '/icons/zigoals-badge-96.png'};
/** Session AK F11: Studio-4's delivery layout, the push art's contract (PNG stills) and where it lands (never over the app icon). */
export const LAYOUT = {app: 'app', app2xAnim: 'app-2x-anim', push: 'push'};
export const PUSH_PIXELS = {icon: [192, 192], badge: [96, 96]};
export const PUSH_BUDGET = 40_000;
export const PUSH_TARGET = {icon: '/icons/zigi-push-icon-192.png', badge: '/icons/zigi-push-badge-96.png'};
export const PUSH_NAME = /^(?:[a-z0-9]+-)*(?<role>icon|badge)(?:-\d+)?\.png$/;
/** The twelve reaction events of components/zigi/semantic.ts (REACTION_EVENTS; studio4-dry-run.test keeps them equal). */
export const REACTION_EVENTS = ['assistant_acknowledged', 'assistant_unsure', 'assistant_working', 'insight_consistent', 'checkin_low', 'checkin_milestone', 'journey_step', 'action_undone', 'wrapup_finished', 'feedback_received', 'journal_reflecting', 'companion_hidden'];
export const NAME = /^(?<code>F0[0-9]{2}|T001|E001|X0\d\d|R0\d\d)-(?<state>[a-z]+(?:-[a-z0-9]+)*?)(?<suffix>-2x|-large)?\.webp$|^(?<acode>F0[0-9]{2}|T001|E001|X0\d\d|R0\d\d)-(?<astate>[a-z]+(?:-[a-z0-9]+)*)\.anim\.(?<aext>webp|png)$/;
/** The app's states by code (manifest.json keys), so a delivered state file lands in the right slot. */
export const STATE_BY_CODE = {F001: 'idle', F002: 'greeting', F003: 'insight', F004: 'listening', F005: 'speaking', F006: 'presenting', F007: 'attention', F008: 'sleepy', F009: 'celebrate', T001: 'thinking', E001: 'error',
  // Session AK Part 12: the fourteen states that wear a delivered clip today get their own.
  F010: 'reading-your-data', F011: 'writing-proposal', F012: 'success', F013: 'proud', F014: 'curious', F015: 'surprised', F016: 'confused', F017: 'empathetic', F018: 'encouraging', F019: 'wave-goodbye', F020: 'reminder', F021: 'offline', F022: 'peek', F023: 'loading-model'};
export const EXTRA_SLOT = {X001: ['transitions', 'greetingInPlace'], X010: ['idleVariants', 'X010'], X011: ['idleVariants', 'X011'], X020: ['gaze', 'chatInput'], X021: ['gaze', 'viewer'], X022: ['gaze', 'target'],
  // Session AK Part 12: a third idle variant, the Checklist's cheer, the variant pools.
  X012: ['idleVariants', 'X012'], X030: ['celebrations', 'cheer'], X050: ['variants', 'X050'], X051: ['variants', 'X051'], X052: ['variants', 'X052'], X053: ['variants', 'X053'], X054: ['variants', 'X054']};
/** Loop modes the studio's contract fixes per code (loops loop, one-shots play once); extras by their documented kind. */
export const LOOPS = new Set(['F001', 'F004', 'F005', 'F007', 'F008', 'T001', 'X010', 'X011', 'X020', 'X021', 'X022',
  'F010', 'F011', 'F021', 'F022', 'F023', 'R003', 'R010', 'R011', 'X012', 'X050', 'X051', 'X052', 'X053']);
/** The Studio-4 extras a manifest starts with when it has none (every slot empty). */
const emptyExtras = () => ({reactions: {}, idleVariants: {}, transitions: {greetingInPlace: null, chain: []}, gaze: {chatInput: null, viewer: null, target: null}, celebrations: {cheer: null}, variants: {}});

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
  // Session AK F11: each entry is also kept by its path in the delivery (`paths`, not enumerable), so the same name in
  // `app/` and `app-2x-anim/` keeps two hashes.
  const map = new Map(), paths = new Map(), clean = (file) => file.trim().replace(/\\/g, '/').replace(/^\.\//, '');
  const add = (file, entry) => { map.set(basename(file), entry); paths.set(file, entry); };
  for (const line of text.split('\n')) {
    const table = /^\|\s*`?([0-9a-f]{64})`?\s*\|\s*(\d+)\s*\|\s*`?([^`|]+?)`?\s*\|/.exec(line);
    if (table) { add(clean(table[3]), {sha: table[1], bytes: Number(table[2])}); continue; }
    const sums = /^([0-9a-f]{64})\s+\*?(.+)$/.exec(line.trim());
    if (sums) add(clean(sums[2]), {sha: sums[1], bytes: null});
  }
  Object.defineProperty(map, 'paths', {value: paths});
  return map;
}
/** The receipt's entry for a delivered file: by its path in the delivery first, then by its name. */
const listedFor = (receipt, name, path) => (path && receipt.paths?.get(path)) || receipt.get(name);
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
/** The receipt's verdict on one file: listed, the same SHA-256, the same byte count when the receipt gives one. */
function receiptProblems(label, bytes, listed, allowUnlisted) {
  if (!listed) return allowUnlisted ? [] : [`${label}: not in the receipt (refused; --allow-unlisted to take it anyway)`];
  const out = [];
  if (listed.sha !== sha256(bytes)) out.push(`${label}: SHA-256 differs from the receipt`);
  if (listed.bytes !== null && listed.bytes !== bytes.length) out.push(`${label}: ${bytes.length} bytes, the receipt says ${listed.bytes}`);
  return out;
}
/** Session AK F11: the problems with a file in its folder of the Studio-4 layout (app/ holds the app set, app-2x-anim/ the 2× clips). */
export function folderProblems(dir, rel, parsed, bytes) {
  const header = parsed.ext === 'png' ? pngHeader(bytes) : webpHeader(bytes);
  const twoX = parsed.key === 'animated' && !!header && header.width === PIXELS.animated[0] && header.height === PIXELS.animated[1];
  if (dir === LAYOUT.app2xAnim && !twoX) return [`${rel}: ${LAYOUT.app2xAnim}/ holds only the 2× animated set (192×253 .anim.webp)`];
  if (dir === LAYOUT.app && twoX) return [`${rel}: a 192×253 clip belongs in ${LAYOUT.app2xAnim}/ (${LAYOUT.app}/ holds the 96×126 app set, ${BUDGETS.animated} bytes)`];
  return [];
}
/** Session AK F11: every problem with one push image (push/): its role by name, the receipt, a PNG still of its size, its budget. */
export function checkPushFile(name, bytes, receipt, {allowUnlisted = false, path} = {}) {
  const label = path ?? name, role = PUSH_NAME.exec(name)?.groups.role;
  if (!role) return [`${label}: not a push image name (…icon….png or …badge….png; refused)`];
  const problems = receiptProblems(label, bytes, listedFor(receipt, name, path), allowUnlisted), header = pngHeader(bytes), [w, h] = PUSH_PIXELS[role];
  if (bytes.length > PUSH_BUDGET) problems.push(`${label}: ${bytes.length} bytes is over the push ${role} budget of ${PUSH_BUDGET}`);
  if (!header) problems.push(`${label}: not a PNG file by its bytes`);
  else {
    if (header.width !== w || header.height !== h) problems.push(`${label}: ${header.width}×${header.height}, expected ${w}×${h}`);
    if (header.animated) problems.push(`${label}: animated where a still was expected`);
  }
  return problems;
}
/** Every problem with one delivered file, in plain words; an empty list means it verified. */
export function checkFile(name, bytes, receipt, {allowUnlisted = false, path} = {}) {
  const problems = [], parsed = parseName(name), label = path ?? name;
  if (!parsed) return [`${label}: not a contract file name (refused)`];
  problems.push(...receiptProblems(label, bytes, listedFor(receipt, name, path), allowUnlisted));
  const header = parsed.ext === 'png' ? pngHeader(bytes) : webpHeader(bytes);
  // An animated WebP may be the 2× set (192×253) or the app set (96×126); an APNG is the 96×126 fallback only.
  const sizes = parsed.role !== 'animated' ? [PIXELS[parsed.role]] : parsed.key === 'animated' ? [PIXELS.animated, PIXELS.animatedFallback] : [PIXELS.animatedFallback];
  const twoX = parsed.key === 'animated' && !!header && header.width === PIXELS.animated[0] && header.height === PIXELS.animated[1];
  const budget = twoX ? BUDGETS.animated2x : BUDGETS[parsed.role], budgetName = twoX ? '2× animated' : parsed.role;
  if (bytes.length > budget) problems.push(`${label}: ${bytes.length} bytes is over the ${budgetName} budget of ${budget}`);
  if (!header) problems.push(`${label}: not a ${parsed.ext === 'png' ? 'PNG' : 'WebP'} file by its bytes`);
  else {
    if (!sizes.some(([w, h]) => header.width === w && header.height === h)) problems.push(`${label}: ${header.width}×${header.height}, expected ${sizes.map(([w, h]) => `${w}×${h}`).join(' or ')}`);
    if (header.animated !== (parsed.role === 'animated')) problems.push(`${label}: ${header.animated ? 'animated where a still was expected' : 'a still where an animation was expected'}`);
    if (parsed.role === 'animated' && header.loops !== null) { const loop = LOOPS.has(parsed.code); if (header.loops !== (loop ? 0 : 1)) problems.push(`${label}: loop count ${header.loops}, expected ${loop ? '0 (a loop)' : '1 (plays once)'}`); }
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
  skin.extras ??= emptyExtras();
  const clip = (holder, code, state) => holder ?? {name: `${code}-${state}`, files: {}, kind: LOOPS.has(code) ? 'loop' : 'one-shot', durationMs: 0};
  for (const {name, parsed} of entries) {
    const file = `${publicPrefix}${name}`, slot = slotFor(parsed);
    if (slot.kind === 'state') {
      const own = skin.states[slot.state] ?? {}; delete own.wears; own[slot.key] = file; skin.states[slot.state] = own;
      if (slot.state === 'idle' && (slot.key === '1x' || slot.key === '2x' || slot.key === 'large')) skin.sizes[slot.key] = {...skin.sizes[slot.key], file};
    } else if (slot.kind === 'extra') {
      const [group, key] = slot.path; skin.extras[group] ??= {};
      const c = clip(skin.extras[group][key], parsed.code, parsed.state); c.files[slot.key] = file; skin.extras[group][key] = c;
    } else if (slot.kind === 'reaction') {
      const c = clip(skin.extras.reactions[slot.code], parsed.code, parsed.state); c.files[slot.key] = file; skin.extras.reactions[slot.code] = c;
      next.reactionTriggers ??= {}; if (reactions[slot.code] && !next.reactionTriggers[slot.code]) next.reactionTriggers[slot.code] = reactions[slot.code];
    }
  }
  // Session AK F11: a delivery with 2× clips records their budget (D6) beside the others, so the tests read it from the manifest.
  if (entries.some(e => e.twoX)) next.budgetBytes = {...next.budgetBytes, animated2x: BUDGETS.animated2x};
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
  const problems = [], entries = [], refused = [], superseded = [], push = [], diff = {new: [], identical: [], changed: [], orphaned: []};
  const isDir = (path) => existsSync(path) && statSync(path).isDirectory();
  // Session AK F11: a folder holding app/ is Studio-4's delivery layout (studio4-deliver/); anything else reads as before.
  const layout = isDir(join(folder, LAYOUT.app));
  const META = new Set(['reactions.json', '.DS_Store', 'SHA256SUMS', basename(receiptPath), ...(layout ? ['RECEIPT.md'] : [])]);
  const files = [];
  if (!layout) {
    for (const name of readdirSync(folder).sort()) {
      if (isDir(join(folder, name))) { refused.push(`${name}/ (a folder: not part of the contract)`); continue; }
      // The delivery's own metadata beside the files is not a contract file and not a refusal either.
      if (META.has(name)) continue;
      if (!parseName(name)) refused.push(`${name} (not a contract file)`); else files.push({dir: null, name, rel: name});
    }
  } else {
    for (const name of readdirSync(folder).sort()) {
      if (isDir(join(folder, name))) {
        if (!Object.values(LAYOUT).includes(name)) { refused.push(`${name}/ (a folder: not part of the contract)`); continue; }
        for (const inner of readdirSync(join(folder, name)).sort()) {
          if (inner === '.DS_Store') continue;
          if (isDir(join(folder, name, inner))) { refused.push(`${name}/${inner}/ (a folder: not part of the contract)`); continue; }
          if (name !== LAYOUT.push && !parseName(inner)) refused.push(`${name}/${inner} (not a contract file)`); else files.push({dir: name, name: inner, rel: `${name}/${inner}`});
        }
      } else if (!META.has(name)) refused.push(`${name} (at the delivery's root: art goes in ${LAYOUT.app}/, ${LAYOUT.app2xAnim}/ or ${LAYOUT.push}/)`);
    }
    // A second receipt beside the first (RECEIPT.md's checkpoint table, or SHA256SUMS) must agree with it; its byte counts are checked too.
    for (const other of ['SHA256SUMS', 'RECEIPT.md']) {
      const path = join(folder, other);
      if (!existsSync(path) || resolve(path) === resolve(receiptPath)) continue;
      for (const [file, entry] of parseReceipt(readFileSync(path, 'utf8')).paths) {
        const main = listedFor(receipt, basename(file), file);
        if (!main) problems.push(`${other} lists ${file}, ${basename(receiptPath)} does not`);
        else if (main.sha !== entry.sha) problems.push(`${other} and ${basename(receiptPath)} disagree on ${file}`);
        else if (main.bytes === null && entry.bytes !== null) main.bytes = entry.bytes;
      }
    }
  }
  const seen = new Map();
  for (const {dir, name, rel} of files) {
    const path = join(folder, rel), bytes = readFileSync(path), at = layout ? rel : undefined;
    if (dir === LAYOUT.push) {
      const found = checkPushFile(name, bytes, receipt, {allowUnlisted, path: rel});
      if (found.length) { problems.push(...found); continue; }
      const role = PUSH_NAME.exec(name).groups.role;
      if (push.some(p => p.role === role)) { problems.push(`${rel}: a second push ${role} (one each)`); continue; }
      if (!listedFor(receipt, name, rel)) log(`WARNING: ${rel} is not in the receipt and was taken because of --allow-unlisted`);
      push.push({role, name, rel, bytes, target: join(repoRoot, 'apps', 'web', 'public', ...PUSH_TARGET[role].split('/').filter(Boolean))});
      continue;
    }
    const parsed = parseName(name);
    const found = [...checkFile(name, bytes, receipt, {allowUnlisted, path: at}), ...(layout ? folderProblems(dir, rel, parsed, bytes) : [])];
    if (found.length) { problems.push(...found); continue; }
    if (!listedFor(receipt, name, at)) log(`WARNING: ${rel} is not in the receipt and was taken because of --allow-unlisted`);
    const header = parsed.ext === 'png' ? pngHeader(bytes) : webpHeader(bytes);
    const entry = {name, rel, parsed, bytes, target: join(destination, name), twoX: parsed.key === 'animated' && header.width === PIXELS.animated[0] && header.height === PIXELS.animated[1]};
    // The same clip in both sets: the 2× one fills `animated` (D6); the app-set copy is verified, reported, not copied.
    const before = seen.get(name);
    if (before) { const [keep, drop] = entry.twoX ? [entry, before] : [before, entry]; superseded.push(drop.rel); entries[entries.indexOf(before)] = keep; seen.set(name, keep); continue; }
    seen.set(name, entry); entries.push(entry);
  }
  for (const e of entries) { if (!existsSync(e.target)) diff.new.push(e.name); else if (readFileSync(e.target).equals(e.bytes)) diff.identical.push(e.name); else diff.changed.push(e.name); }
  for (const p of push) { const label = PUSH_TARGET[p.role].slice(1); if (!existsSync(p.target)) diff.new.push(label); else if (readFileSync(p.target).equals(p.bytes)) diff.identical.push(label); else diff.changed.push(label); }
  if (existsSync(destination)) for (const name of readdirSync(destination)) if (!entries.some(e => e.name === name)) diff.orphaned.push(name);
  for (const r of refused) log(`refused: ${r}`);
  for (const rel of superseded) log(`superseded: ${rel} verified; the 2× clip of the same name fills the slot`);
  for (const [kind, names] of Object.entries(diff)) log(`${kind}: ${names.length}${names.length ? ` (${names.join(', ')})` : ''}`);
  const refuse = () => { for (const p of problems) log(`PROBLEM: ${p}`); return {ok: false, problems, refused, diff, entries: [], superseded, push: []}; };
  if (problems.length) return refuse();
  const reactionsPath = join(folder, 'reactions.json'), reactions = existsSync(reactionsPath) ? JSON.parse(readFileSync(reactionsPath, 'utf8')) : {};
  for (const [code, trigger] of Object.entries(reactions)) if (!/^R0\d\d$/.test(code) || typeof trigger !== 'string' || !/^[a-z_]+$/.test(trigger)) { problems.push(`reactions.json: ${code} → ${JSON.stringify(trigger)} is not a reaction code with a semantic event name`); }
  if (problems.length) return refuse();
  for (const [code, trigger] of Object.entries(reactions)) if (!REACTION_EVENTS.includes(trigger)) log(`WARNING: reactions.json names ${code} → ${trigger}, not one of the twelve reaction events; the app will not play it`);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')), filled = fillManifest(manifest, skin, entries, publicPrefix, reactions);
  const pushArt = {...PUSH_ART, ...Object.fromEntries(push.map(p => [p.role, PUSH_TARGET[p.role]]))};
  if (apply) {
    mkdirSync(destination, {recursive: true});
    for (const e of entries) copyFileSync(join(folder, e.rel), e.target);
    for (const p of push) { mkdirSync(dirname(p.target), {recursive: true}); copyFileSync(join(folder, p.rel), p.target); }
    writeFileSync(manifestPath, JSON.stringify(filled, null, 2) + '\n');
    log(`applied: ${entries.length} files copied to ${destination}; manifest slots filled${push.length ? `; ${push.length} push images copied` : ''}`);
  } else log(`dry run: ${entries.length + push.length} files verified; nothing written (add --apply)`);
  if (push.length) log(`push art: set PUSH_ART in apps/web/public/sw.js and scripts/zigi/import-studio.mjs to ${JSON.stringify(pushArt)} (and lib/zigi-studio4/push-art.test.ts)`);
  return {ok: true, problems: [], refused, diff, entries: entries.map(e => e.name), manifest: filled, superseded, push: push.map(p => p.rel), pushArt};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const source = args.find(a => !a.startsWith('--') && !['--receipt', '--skin', '--repo-root'].includes(args[args.indexOf(a) - 1]));
  if (!source) { console.error('Usage: node scripts/zigi/import-studio.mjs <studio encoded/app folder | studio4-deliver> --receipt <file> [--skin <name>] [--apply] [--allow-unlisted] [--repo-root <dir>]'); process.exit(2); }
  // Session AK F11: --repo-root points the writes at another checkout (a rehearsal copy); without it, this repository.
  const repoRoot = flag('--repo-root') ? {repoRoot: resolve(flag('--repo-root'))} : {};
  const result = run({source: resolve(source), receiptPath: flag('--receipt') ? resolve(flag('--receipt')) : undefined, skin: flag('--skin') ?? 'origami-nebula', apply: args.includes('--apply'), allowUnlisted: args.includes('--allow-unlisted'), ...repoRoot});
  process.exit(result.ok ? 0 : 1);
}
