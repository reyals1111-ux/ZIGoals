#!/usr/bin/env node
// Session AD item 12 (ADR-026, FIX_PLAN B7, owner amendment 3): the encoder-history fixture, written by each release's
// own encoder. The reverse of scripts/frozen-readers.mjs (old readers, this build's data): here old writers, this build's
// reader.
//   node scripts/frozen-writers.mjs [sha …]
// For each release (default #32–#42): a throwaway `git worktree` at that commit, this checkout's node_modules linked in
// (nothing installed), scripts/frozen-writers/writer.frozen.ts copied in as apps/web/lib/frozen-writer.test.ts and run
// with that release's vitest config, the worktree removed. The outputs are collected into
// apps/web/lib/vault/fixtures/encoder-history.json, which apps/web/lib/vault/encoder-history.test.ts reads with this
// build's reader. Offline: it needs only the commits in this clone. Exit 0 only when every release wrote its records.
import {execFileSync, spawnSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const shas = process.argv.slice(2);
const RELEASES = [
  ['#32', '72ad872a'], ['#33', '757b3b1b'], ['#34', 'e30b7c6c'], ['#35', '12a3ef9c'], ['#36', 'a6e8bb9e'], ['#37', '32cb9c5a'],
  ['#38', 'e3fa408d'], ['#39', '6c1052b2'], ['#40', '985720ee'], ['#41', '9e41f0d1'], ['#42', '61204c3f'],
];
const releases = shas.length ? shas.map(s => [s, s]) : RELEASES;
const work = mkdtempSync(join(tmpdir(), 'zigoals-writers-')), builds = [];
let failed = 0;
for (const [label, sha] of releases) {
  const tree = join(work, `tree-${sha.slice(0, 8)}`), out = join(work, `${sha.slice(0, 8)}.json`);
  execFileSync('git', ['worktree', 'add', '--detach', tree, sha], {cwd: root, stdio: 'ignore'});
  try {
    symlinkSync(join(root, 'node_modules'), join(tree, 'node_modules'));
    if (existsSync(join(root, 'apps/web/node_modules'))) symlinkSync(join(root, 'apps/web/node_modules'), join(tree, 'apps/web/node_modules'));
    for (const name of execFileSync('ls', [join(root, 'packages')], {encoding: 'utf8'}).split('\n').filter(Boolean)) {
      const nm = join(root, 'packages', name, 'node_modules');
      if (existsSync(nm) && !existsSync(join(tree, 'packages', name, 'node_modules'))) { mkdirSync(join(tree, 'packages', name), {recursive: true}); symlinkSync(nm, join(tree, 'packages', name, 'node_modules')); }
    }
    copyFileSync(join(root, 'scripts/frozen-writers/writer.frozen.ts'), join(tree, 'apps/web/lib/frozen-writer.test.ts'));
    const full = execFileSync('git', ['rev-parse', sha], {cwd: root, encoding: 'utf8'}).trim();
    const run = spawnSync(process.execPath, [join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'apps/web/lib/frozen-writer.test.ts'], {cwd: tree, env: {...process.env, FROZEN_OUT: out, FROZEN_COMMIT: `${label} ${full}`}, encoding: 'utf8'});
    if (run.status !== 0 || !existsSync(out)) { failed++; console.error(`${label} ${sha}: FAIL\n${(run.stdout + run.stderr).slice(-3000)}`); continue; }
    builds.push({label, ...JSON.parse(readFileSync(out, 'utf8'))});
    console.log(`${label} ${sha}: wrote ${builds.at(-1).vaults.reduce((n, v) => n + v.records.length, 0)} records, 2 manifests, 2 device seals, 1 backup`);
  } finally {
    execFileSync('git', ['worktree', 'remove', '--force', tree], {cwd: root, stdio: 'ignore'});
  }
}
rmSync(work, {recursive: true, force: true});
if (!failed) {
  const target = join(root, 'apps/web/lib/vault/fixtures/encoder-history.json');
  mkdirSync(dirname(target), {recursive: true});
  writeFileSync(target, `${JSON.stringify({about: 'Session AD item 12 (FIX_PLAN B7, owner amendment 3): encrypted strings written by each release\'s own encoder (scripts/frozen-writers.mjs). Fictional data; these vaults and their recovery secrets exist only in this fixture.', builds}, null, 1)}\n`);
  console.log(`Wrote ${target}`);
}
process.exit(failed ? 1 : 0);
