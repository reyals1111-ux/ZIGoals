import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { afterEach, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main, runValidator, verifySourceCheckout } from './verify.mjs';
import { schema, sha256 } from './manifest.mjs';
const directories = [];
afterEach(() => { for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true }); });
function temp() { const dir = mkdtempSync(join(tmpdir(), 'zigoals-verifier-test-')); directories.push(dir); return dir; }
it('requires an explicit trusted validator executable', () => expect(() => runValidator(undefined, '/missing.wasm')).toThrow());
it('fails closed when the specified validator is missing', () => expect(() => runValidator('/nonexistent/zigoals-validator', '/missing.wasm')).toThrow());
it('rejects a different validator version before attempting validation', () => {
  const path = join(temp(), 'wrong-validator');
  writeFileSync(path, '#!/bin/sh\necho "Contract checking 2.2.1"\n', { mode: 0o700 });
  expect(() => runValidator(path, '/missing.wasm')).toThrow('Wrong validator version');
});
it('propagates actual validator failure instead of trusting a claimed pass', () => {
  const path = join(temp(), 'rejecting-validator');
  writeFileSync(path, '#!/bin/sh\nif [ "$1" = "--version" ]; then echo "Contract checking 2.2.2"; else exit 1; fi\n', { mode: 0o700 });
  expect(() => runValidator(path, '/missing.wasm')).toThrow();
});
it('rejects oversized downloaded manifests before parsing', () => {
  const dir = temp(); writeFileSync(join(dir, 'artifact-manifest.json'), ' '.repeat(32769));
  expect(() => main(['verify', 'a'.repeat(40), '/missing-validator', dir])).toThrow('32 KiB');
});
it('rejects ambiguous extra CLI arguments', () => expect(() => main(['verify', 'a'.repeat(40), '/validator', '/left', '/right'])).toThrow('Usage:'));

it('cross-checks the claimed tree and lock against the actual trusted source commit', () => { expect(() => verifySourceCheckout('a'.repeat(40), { tree: 'b'.repeat(40), cargoLockSha256: 'c'.repeat(64) })).toThrow(); });

it('accepts only the tree and Cargo.lock of the trusted source checkout', () => { const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); const tree = execFileSync('git', ['rev-parse', `${commit}^{tree}`], { encoding: 'utf8' }).trim(); const lock = execFileSync('git', ['show', `${commit}:Cargo.lock`]); const source = { tree, sourceDateEpoch: Number(execFileSync('git', ['show', '-s', '--format=%ct', commit], { encoding: 'utf8' }).trim()), cargoLockSha256: createHash('sha256').update(lock).digest('hex') }; expect(() => verifySourceCheckout(commit, source)).not.toThrow(); expect(() => verifySourceCheckout(commit, { ...source, tree: 'f'.repeat(40) })).toThrow(); expect(() => verifySourceCheckout(commit, { ...source, sourceDateEpoch: source.sourceDateEpoch + 1 })).toThrow(); expect(() => verifySourceCheckout(commit, { ...source, cargoLockSha256: 'f'.repeat(64) })).toThrow(); });

function comparisonFixture() {
  const dir = temp(); const left = join(dir, 'left'); const right = join(dir, 'right');
  const output = join(dir, 'reproducible'); const calls = join(dir, 'validator-calls');
  const validator = join(dir, 'validator'); const wasm = Buffer.from('controlled synthetic Wasm');
  const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const commit = git(['rev-parse', 'HEAD']);
  const source = { commit, tree: git(['rev-parse', `${commit}^{tree}`]), cargoLockSha256: sha256(execFileSync('git', ['show', `${commit}:Cargo.lock`])), sourceDateEpoch: Number(git(['show', '-s', '--format=%ct', commit])) };
  const manifest = job => ({
    schemaVersion: 2, status: 'BUILD_VERIFIED', approval: 'NOT_APPROVED', source,
    environment: { ...Object.fromEntries(Object.entries(schema.properties.environment.properties).filter(([, rule]) => 'const' in rule).map(([key, rule]) => [key, rule.const])), osRelease: '6.17.0-1022-azure' },
    artifact: { name: 'zigoals_goal_manager.wasm', sha256: sha256(wasm), sizeBytes: wasm.length }, independentBuildCount: 1,
    builds: [{ repository: 'owner/repo', runId: '123', runAttempt: '1', job, runner: { imageVersion: job === 'a' ? '20260920.314.1' : '20260907.300.1' }, builtAt: '2026-09-22T20:14:47.593Z', validation: { tool: 'cosmwasm-check', version: '2.2.2', passed: true } }],
  });
  for (const [path, job] of [[left, 'a'], [right, 'b']]) {
    mkdirSync(path); writeFileSync(join(path, 'artifact-manifest.json'), JSON.stringify(manifest(job)));
    writeFileSync(join(path, 'zigoals_goal_manager.wasm'), wasm);
  }
  // External validator process double: exercise the actual CLI, filesystem,
  // source checkout and subprocess boundary without compiling Rust in unit tests.
  writeFileSync(validator, `#!${process.execPath}
import { appendFileSync } from 'node:fs';
if (process.argv[2] === '--version') console.log('Contract checking 2.2.2');
else appendFileSync(${JSON.stringify(calls)}, process.argv[2] + '\\n');
`, { mode: 0o700 });
  return { commit, left, right, output, calls, validator, wasm };
}
it('CLI comparison retains both images, reruns both validators and revalidates the downloaded candidate', () => {
  const f = comparisonFixture();
  main(['compare', f.commit, f.validator, f.left, f.right, f.output]);
  const manifest = JSON.parse(readFileSync(join(f.output, 'artifact-manifest.json'), 'utf8'));
  expect(manifest.builds.map(b => b.runner.imageVersion)).toEqual(['20260920.314.1', '20260907.300.1']);
  expect(readFileSync(join(f.output, 'zigoals_goal_manager.wasm'))).toEqual(f.wasm);
  main(['verify', f.commit, f.validator, f.output]);
  expect(readFileSync(f.calls, 'utf8').trim().split('\n')).toEqual([f.left, f.right, f.output].map(path => join(path, 'zigoals_goal_manager.wasm')));
});
it.each(['source-tree', 'source-lock', 'source-epoch', 'first-validator', 'second-validator'])('CLI comparison cannot publish evidence after %s failure despite allowed host drift', kind => {
  const f = comparisonFixture();
  if (kind.startsWith('source-')) for (const directory of [f.left, f.right]) {
    const path = join(directory, 'artifact-manifest.json'); const manifest = JSON.parse(readFileSync(path, 'utf8'));
    if (kind === 'source-tree') manifest.source.tree = 'f'.repeat(40);
    if (kind === 'source-lock') manifest.source.cargoLockSha256 = 'f'.repeat(64);
    if (kind === 'source-epoch') manifest.source.sourceDateEpoch++;
    writeFileSync(path, JSON.stringify(manifest));
  }
  else {
    const reject = join(kind === 'first-validator' ? f.left : f.right, 'zigoals_goal_manager.wasm');
    writeFileSync(f.validator, `#!${process.execPath}
if (process.argv[2] === '--version') console.log('Contract checking 2.2.2');
else if (process.argv[2] === ${JSON.stringify(reject)}) process.exit(1);
`, { mode: 0o700 });
  }
  expect(() => main(['compare', f.commit, f.validator, f.left, f.right, f.output])).toThrow();
  expect(existsSync(f.output)).toBe(false);
  if (kind.startsWith('source-')) expect(existsSync(f.calls)).toBe(false);
});
