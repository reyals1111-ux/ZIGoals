#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

/**
 * Session Z-Local: the key sweep run before every push and after every real-Claude stage. It looks for the prefix every
 * Anthropic key carries (assembled below, so this file never contains it) and, when the test key is in the environment,
 * the first twelve characters of that key, in:
 * the working tree's diff against main, the Playwright output and trace folders, the logs and the runs worktree. The
 * key itself is never printed: a hit names the file and the line number only. Exit 1 on any hit.
 *
 *   node scripts/zigi/key-sweep.mjs [--paths <dir>...]   (ANTHROPIC_TEST_KEY may be in the environment; never an argument)
 */
const repo = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const extra = [];
for (let i = 2; i < process.argv.length; i++) if (process.argv[i] === '--paths') extra.push(...process.argv.slice(i + 1));
const key = process.env.ANTHROPIC_TEST_KEY ?? '';
// The key shape is assembled at run time so this file never carries the literal the sweep looks for.
const SHAPE = ['sk', 'ant', ''].join('-');
const needles = [SHAPE];
if (key.length >= 12) needles.push(key.slice(0, 12));
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', '.open-next', 'dist']);
const TEXT = /\.(?:md|json|jsonl|txt|log|ts|tsx|js|mjs|cjs|html|yml|yaml|zip|webm|png|jpg|jpeg|trace|network|har|csv)$/i;
const hits = [];
function scanText(label, text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) for (const n of needles) if (lines[i].includes(n)) { hits.push(`${label}:${i + 1} (${n === SHAPE ? 'key shape' : 'key prefix'})`); break; }
}
function scanFile(path) {
  let bytes; try { bytes = readFileSync(path); } catch { return; }
  if (bytes.length > 200 * 1024 * 1024) { hits.push(`${path}: too large to scan (${bytes.length} bytes)`); return; }
  // Binary files are scanned as latin1 text: a key is ASCII wherever it lands (a zip's stored members, a webm's metadata).
  scanText(path, bytes.toString('latin1'));
}
function walk(dir, depth = 0) {
  if (!existsSync(dir) || depth > 12) return;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    let st; try { st = statSync(path); } catch { continue; }
    if (st.isDirectory()) walk(path, depth + 1);
    else if (TEXT.test(name) || st.size < 4 * 1024 * 1024) scanFile(path);
  }
}
// 1. The diff of the working tree and the branch against main (tracked and staged content).
try {
  const diff = execFileSync('git', ['diff', 'origin/main...HEAD'], {cwd: repo, encoding: 'latin1', maxBuffer: 512 * 1024 * 1024});
  scanText('git diff origin/main...HEAD', diff);
  const work = execFileSync('git', ['diff', 'HEAD'], {cwd: repo, encoding: 'latin1', maxBuffer: 512 * 1024 * 1024});
  scanText('git diff HEAD (working tree)', work);
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {cwd: repo, encoding: 'utf8'}).split('\n').filter(Boolean);
  for (const f of untracked) scanFile(join(repo, f));
} catch (error) { hits.push(`git diff failed: ${error instanceof Error ? error.message : String(error)}`); }
// 2. Playwright outputs, traces, test results, logs; the runs worktree; anything passed with --paths.
const dirs = [
  join(repo, 'apps/web/test-results'), join(repo, 'apps/web/playwright-report'), join(repo, 'apps/web/blob-report'),
  '/tmp/zigoals-webkit-results', '/tmp/zigoals-web-results', '/tmp/zigoals-real-model',
  '/Users/AIUSER/Documents/ZIGoals-Claude-z-runs',
  ...extra,
];
// Owner edit 3: Playwright's temporary browser profiles (removed with each context, but swept in case one was left behind).
for (const base of [tmpdir(), '/tmp', '/private/tmp']) { try { for (const name of readdirSync(base)) if (/^playwright/i.test(name)) dirs.push(join(base, name)); } catch { /* no such folder */ } }
for (const d of dirs) walk(d);
if (hits.length) { console.error(`KEY SWEEP: ${hits.length} hit(s) (values never printed):\n${hits.join('\n')}`); process.exit(1); }
console.log(`Key sweep clean: ${needles.length} pattern(s) over the diff, ${dirs.length} folders.`);
