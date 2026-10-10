#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

/**
 * Session Z-Local: the key sweep run before every push and after every real-Claude stage. It looks for the prefix every
 * Anthropic key carries (assembled below, so this file never contains it) and, when the test key is in the environment,
 * the first 24 characters of that key, each also in its base64 (three alignments) and UTF-16LE forms, in:
 * the branch's diff and its whole history against main, the working tree, untracked files, the Playwright output and
 * trace folders (zip members inflated), the logs, the runs worktree and its history, and the temporary browser profiles.
 * The key itself is never printed: a hit names the file and the line number only. Exit 1 on any hit. (Hardened after
 * the independent security read of 2026-10-10: findings 2, 3, 5 and 6.)
 *
 *   node scripts/zigi/key-sweep.mjs [--paths <dir>...]   (ANTHROPIC_TEST_KEY may be in the environment; never an argument)
 */
const repo = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
// Run from a git hook, the environment names the hook's own repository (GIT_DIR of a worktree): every git call here is
// about the checkout and the runs worktree by path, so those variables are dropped.
const gitEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^GIT_/.test(k)));
const extra = [];
for (let i = 2; i < process.argv.length; i++) if (process.argv[i] === '--paths') extra.push(...process.argv.slice(i + 1));
const key = process.env.ANTHROPIC_TEST_KEY ?? '';
// The key shape is assembled at run time so this file never carries the literal the sweep looks for.
const SHAPE = ['sk', 'ant', ''].join('-');
const plain = [SHAPE];
if (key.length >= 24) plain.push(key.slice(0, 24));
// The base64 of any text holding the needle at byte offset k contains the needle's base64 at alignment k mod 3, minus the
// first group the padding touches ([0, 2, 3] characters) and the last group (4 characters, which mix with the next byte).
const b64 = text => [0, 1, 2].map(shift => Buffer.from(' '.repeat(shift) + text, 'utf8').toString('base64').slice([0, 2, 3][shift], -4));
const utf16 = text => Buffer.from(text, 'utf16le').toString('latin1');
const needles = [...plain, ...plain.flatMap(b64), ...plain.map(utf16)];
const kindOf = n => plain.includes(n) ? (n === SHAPE ? 'key shape' : 'key prefix') : 'encoded key';
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', '.open-next', 'dist']);
const hits = [];
function scanText(label, text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) for (const n of needles) if (lines[i].includes(n)) { hits.push(`${label}:${i + 1} (${kindOf(n)})`); break; }
}
function scanFile(path) {
  let bytes; try { bytes = readFileSync(path); } catch { return; }
  if (bytes.length > 200 * 1024 * 1024) { hits.push(`${path}: too large to scan (${bytes.length} bytes)`); return; }
  // Binary files are scanned as latin1 text: a key is ASCII wherever it lands (a webm's metadata, a LevelDB page).
  scanText(path, bytes.toString('latin1'));
  if (/\.zip$/i.test(path)) for (const member of zipMembers(path, bytes)) scanText(`${path}!${member.name}`, member.text);
}
/** A zip's members, inflated (Playwright's traces are DEFLATE-compressed, so the raw bytes never show a key). Unreadable zips are a hit. */
function zipMembers(path, bytes) {
  const members = [];
  try {
    let eocd = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (eocd < 0) throw new Error('no end-of-central-directory record');
    const count = bytes.readUInt16LE(eocd + 10); let offset = bytes.readUInt32LE(eocd + 16);
    for (let i = 0; i < count; i++) {
      if (bytes.readUInt32LE(offset) !== 0x02014b50) throw new Error('bad central directory entry');
      const method = bytes.readUInt16LE(offset + 10), size = bytes.readUInt32LE(offset + 20), nameLength = bytes.readUInt16LE(offset + 28), extraLength = bytes.readUInt16LE(offset + 30), commentLength = bytes.readUInt16LE(offset + 32), local = bytes.readUInt32LE(offset + 42);
      const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
      const localNameLength = bytes.readUInt16LE(local + 26), localExtraLength = bytes.readUInt16LE(local + 28), start = local + 30 + localNameLength + localExtraLength;
      const data = bytes.subarray(start, start + size);
      const text = method === 0 ? data.toString('latin1') : method === 8 ? inflateRawSync(data).toString('latin1') : null;
      if (text === null) throw new Error(`member ${name} uses compression method ${method}`);
      members.push({name, text});
      offset += 46 + nameLength + extraLength + commentLength;
    }
  } catch (error) { hits.push(`${path}: zip could not be read (${error instanceof Error ? error.message : String(error)})`); }
  return members;
}
function walk(dir, depth = 0) {
  if (!existsSync(dir) || depth > 12) return;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    let st; try { st = statSync(path); } catch { continue; }
    if (st.isDirectory()) walk(path, depth + 1);
    else scanFile(path); // every file, whatever its name or size (the 200 MB ceiling above is itself a hit)
  }
}
// 1. The diff of the working tree and the branch against main (tracked and staged content).
try {
  const diff = execFileSync('git', ['diff', 'origin/main...HEAD'], {cwd: repo, encoding: 'latin1', maxBuffer: 512 * 1024 * 1024, env: gitEnv});
  scanText('git diff origin/main...HEAD', diff);
  const work = execFileSync('git', ['diff', 'HEAD'], {cwd: repo, encoding: 'latin1', maxBuffer: 512 * 1024 * 1024, env: gitEnv});
  scanText('git diff HEAD (working tree)', work);
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {cwd: repo, encoding: 'utf8', env: gitEnv}).split('\n').filter(Boolean);
  for (const f of untracked) scanFile(join(repo, f));
  // Finding 2: the branch's whole history (a key committed then removed would still be pushed), and the runs branch's.
  const history = execFileSync('git', ['log', '-p', '--no-color', 'origin/main..HEAD'], {cwd: repo, encoding: 'latin1', maxBuffer: 1024 * 1024 * 1024, env: gitEnv});
  scanText('git log -p origin/main..HEAD', history);
  const runs = '/Users/AIUSER/Documents/ZIGoals-Claude-z-runs';
  if (existsSync(runs)) {
    // The orphan branch only: the worktree shares the repository's objects, and main's history holds allowlisted fake keys in test fixtures.
    const runsHistory = execFileSync('git', ['log', '-p', '--no-color', 'review/session-z-local-runs'], {cwd: runs, encoding: 'latin1', maxBuffer: 1024 * 1024 * 1024, env: gitEnv});
    scanText('runs worktree: git log -p review/session-z-local-runs', runsHistory);
  }
} catch (error) { hits.push(`git diff failed: ${error instanceof Error ? error.message : String(error)}`); }
// 2. Playwright outputs, traces, test results, logs; the runs worktree; anything passed with --paths.
const dirs = [
  join(repo, 'apps/web/test-results'), join(repo, 'apps/web/playwright-report'), join(repo, 'apps/web/blob-report'),
  '/tmp/zigoals-webkit-results', '/tmp/zigoals-web-results', '/tmp/zigoals-real-model',
  '/Users/AIUSER/Documents/ZIGoals-Claude-z-runs',
  ...extra,
];
// Owner edit 3: Playwright's temporary browser profiles (removed with each context, but swept in case one was left behind).
// Finding 5: a profile left behind by a killed run holds the sealed key as ciphertext the scan cannot see, so a recent one is a hit by itself.
// A profile a running browser names in its own `--user-data-dir` is a live context of a stage still running, not one left behind:
// it is walked for the patterns like every other folder, and the push goes on; the moment no process owns it, it is a hit again.
const recent = Date.now() - 6 * 3600 * 1000;
let inUse = new Set(), webkitSince = Infinity;
try {
  const ps = execFileSync('ps', ['-axo', 'etime=,command='], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
  inUse = new Set([...ps.matchAll(/--user-data-dir=(\S+)/g)].map(m => m[1]));
  // WebKit takes no --user-data-dir: its profile is in use while Playwright's WebKit binary runs and the folder is newer than that process.
  const secs = e => { const p = e.trim().split(/[-:]/).map(Number); return p.length === 4 ? p[0] * 86400 + p[1] * 3600 + p[2] * 60 + p[3] : p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] ?? 0); };
  for (const line of ps.split('\n')) { const m = /^\s*(\S+)\s+(.*)$/.exec(line); if (m && /ms-playwright\/webkit-[^/]+\/Playwright\.app\/Contents\/MacOS\/Playwright\b/.test(m[2])) webkitSince = Math.min(webkitSince, Date.now() - secs(m[1]) * 1000); }
} catch { /* no ps: every recent profile counts as left behind */ }
let live = 0;
for (const base of [tmpdir(), '/tmp', '/private/tmp']) {
  try {
    for (const name of readdirSync(base)) if (/^playwright/i.test(name)) {
      const path = join(base, name); dirs.push(path);
      try {
        if (/profile/i.test(name) && statSync(path).mtimeMs > recent) {
          const st = statSync(path);
          if ([...inUse].some(d => d === path || d.startsWith(path + '/'))) live++;
          else if (/webkit/i.test(name) && st.mtimeMs >= webkitSince - 5000) live++;
          else hits.push(`${path}: a browser profile left behind in the last six hours (remove it after the stage)`);
        }
      } catch { /* gone */ }
    }
  } catch { /* no such folder */ }
}
if (live) console.log(`${live} browser profile(s) in use by a running stage (walked, not counted as left behind).`);
for (const d of dirs) walk(d);
if (hits.length) { console.error(`KEY SWEEP: ${hits.length} hit(s) (values never printed):\n${hits.join('\n')}`); process.exit(1); }
console.log(`Key sweep clean: ${needles.length} pattern(s) over the diff, both histories and ${dirs.length} folders.`);
