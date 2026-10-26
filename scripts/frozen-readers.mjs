#!/usr/bin/env node
// Session AB-Cloud (ADR-023): runs the frozen-reader proof against older releases.
//   node scripts/frozen-readers.mjs [--out docs/verification/ab-cloud/frozen-readers.txt] [sha …]
// 1. Writes this build's fixture records (apps/web/lib/vault/frozen-fixtures.test.ts with FROZEN_OUT set).
// 2. For each release (default #37 32cb9c5, #38 e3fa408, #39 6c1052b, and since Session AF #40 985720e, #41 9e41f0d,
//    #42 61204c3, #43 11d8408, #44 4f92495, and since Session AH #45 8778497 … #49 f13abb0): a throwaway `git worktree` at that commit, this
//    checkout's node_modules linked in (the lockfile's packages; nothing installed), scripts/frozen-readers/reader.frozen.ts
//    copied in as apps/web/lib/frozen-reader.test.ts, run with that release's vitest config, the worktree removed.
// Exit 0 only when every release passes. Nothing in this checkout changes.
import {execFileSync, spawnSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdtempSync, rmSync, symlinkSync, writeFileSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2), outAt = args.indexOf('--out');
const out = outAt >= 0 ? resolve(args[outAt + 1]) : null;
const shas = args.filter((a, i) => !a.startsWith('--') && (outAt < 0 || i !== outAt + 1)); // without --out every argument is a SHA
const releases = shas.length ? shas.map(s => [s, s]) : [['#37', '32cb9c5addedf6dfcd2c68887c7ded6ecf81b730'], ['#38', 'e3fa408db9dee4fc6c255d574c52e2baa7b5458e'], ['#39', '6c1052b291812982f65875b86ea65001026125b5'], ['#40', '985720ee2fef2d2868fc0ef87a43d95d52dd0242'], ['#41', '9e41f0d14284657819e53a78c2515cf58a94db40'], ['#42', '61204c3fb1e959763ecbe81ef402c76990ad1f14'], ['#43', '11d8408280f4f7d5b32f12d17eeeaedd62b43b1f'], ['#44', '4f9249561736fbe19305b426de82f5c91a24763d'], ['#45', '8778497abc105d798b6d6c237698616a0b5eedc5'], ['#46', '98a29b43c025c9e8916a76f88bc1a013d1cd60e0'], ['#47', 'b0fe24244a52fe352f11dd4c86a802dd8d9e7707'], ['#48', '261f32afc01244bf09208d8882b1b6b73141009e'], ['#49', 'f13abb0b3b3af447e5a122af8a1ad1a76ab1530e']];
const work = mkdtempSync(join(tmpdir(), 'zigoals-frozen-')), fixture = join(work, 'fixture.json'), log = [];
const say = line => { log.push(line); console.log(line); };

const gen = spawnSync(process.execPath, [join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'apps/web/lib/vault/frozen-fixtures.test.ts'], {cwd: root, env: {...process.env, FROZEN_OUT: fixture}, encoding: 'utf8'});
if (gen.status !== 0 || !existsSync(fixture)) { console.error(gen.stdout, gen.stderr); throw Error('The fixture records could not be written.'); }
say(`Fixture written by ${execFileSync('git', ['rev-parse', '--short', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim()} (with working-tree changes if any).`);
let failed = 0;
for (const [label, sha] of releases) {
  const tree = join(work, `tree-${sha.slice(0, 7)}`);
  execFileSync('git', ['worktree', 'add', '--detach', tree, sha], {cwd: root, stdio: 'ignore'});
  try {
    symlinkSync(join(root, 'node_modules'), join(tree, 'node_modules'));
    if (existsSync(join(root, 'apps/web/node_modules'))) symlinkSync(join(root, 'apps/web/node_modules'), join(tree, 'apps/web/node_modules'));
    for (const pkg of ['packages']) if (existsSync(join(root, pkg))) for (const name of execFileSync('ls', [join(root, pkg)], {encoding: 'utf8'}).split('\n').filter(Boolean)) {
      const nm = join(root, pkg, name, 'node_modules');
      if (existsSync(nm) && !existsSync(join(tree, pkg, name, 'node_modules'))) { mkdirSync(join(tree, pkg, name), {recursive: true}); symlinkSync(nm, join(tree, pkg, name, 'node_modules')); }
    }
    copyFileSync(join(root, 'scripts/frozen-readers/reader.frozen.ts'), join(tree, 'apps/web/lib/frozen-reader.test.ts'));
    const run = spawnSync(process.execPath, [join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'apps/web/lib/frozen-reader.test.ts', '--reporter=verbose'], {cwd: tree, env: {...process.env, FROZEN_IN: fixture, FROZEN_COMMIT: `${label} ${sha.slice(0, 7)}`}, encoding: 'utf8'});
    const lines = (run.stdout + run.stderr).split('\n').filter(l => /^(READ|ABSENT) |✓|×|FAIL|Tests /.test(l.trim()));
    say(`${label} ${sha.slice(0, 7)}: ${run.status === 0 ? 'PASS' : 'FAIL'}`);
    for (const l of lines) say(`  ${l.trim()}`);
    if (run.status !== 0) { failed++; console.error(run.stdout.slice(-4000)); }
  } finally {
    execFileSync('git', ['worktree', 'remove', '--force', tree], {cwd: root, stdio: 'ignore'});
  }
}
rmSync(work, {recursive: true, force: true});
if (out) { mkdirSync(dirname(out), {recursive: true}); writeFileSync(out, `${log.join('\n')}\n`); }
process.exit(failed ? 1 : 0);
