import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { afterEach, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main, runValidator, verifySourceCheckout } from './verify.mjs';
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
