import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { compareBuilds, verifyCandidate, validateManifest } from './manifest.mjs';
const wasm = Buffer.from('test Wasm fixture');
const hash = b => createHash('sha256').update(b).digest('hex');
const commit = 'a'.repeat(40);
const build = job => ({
  schemaVersion: 1, status: 'BUILD_VERIFIED', approval: 'NOT_APPROVED',
  source: { commit, tree: 'b'.repeat(40), cargoLockSha256: 'c'.repeat(64), sourceDateEpoch: 1700000000 },
  environment: { policy: 'canonical-linux-v1', platform: 'linux', arch: 'x64', osRelease: '6.1', imageOS: 'ubuntu24', imageVersion: '20260913.1', rust: 'rustc 1.85.1 (4eb161250 2025-03-15)\nbinary: rustc\ncommit-hash: 4eb161250e340c8f48f66e2b929ef4a5bed7c181\ncommit-date: 2025-03-15\nhost: x86_64-unknown-linux-gnu\nrelease: 1.85.1\nLLVM version: 19.1.7', cargo: 'cargo 1.85.1 (d73d2caf9 2024-12-31)', node: '24.19.0', binaryen: 'wasm-opt version 123 (version_123)', validator: 'Contract checking 2.2.2', target: 'wasm32-unknown-unknown', flags: '-C target-feature=-reference-types,-multivalue; remap source=/src cargo=/cargo rustup=/rustup; optimizer=-Oz --signext-lowering', locale: 'C', timezone: 'UTC' },
  artifact: { name: 'zigoals_goal_manager.wasm', sha256: hash(wasm), sizeBytes: wasm.length },
  independentBuildCount: 1,
  builds: [{ repository: 'owner/repo', runId: '123', runAttempt: '1', job, builtAt: '2026-09-13T00:00:00.000Z', validation: { tool: 'cosmwasm-check', version: '2.2.2', passed: true } }],
});
const candidate = () => compareBuilds({ expectedCommit: commit, left: { manifest: build('build-a'), wasm }, right: { manifest: build('build-b'), wasm } });
describe('strict canonical release evidence', () => {
  it('compares actual bytes from two distinct jobs and permits only unapproved reproducibility', () => {
    const manifest = candidate();
    expect(manifest.independentBuildCount).toBe(2);
    expect(verifyCandidate({ expectedCommit: commit, manifest, wasm })).toBe(true);
    expect(manifest.approval).toBe('NOT_APPROVED');
  });
  it.each(['garbage', null, [], {}, { ...build('a'), unexpected: true }])('rejects malformed and unknown fields %#', manifest => expect(() => validateManifest(manifest)).toThrow());
  it.each(['APPROVED_FOR_TESTNET_UPLOAD', 'UNKNOWN', 'BUILD_VERIFIED'])('rejects invalid candidate status %s', status => expect(() => verifyCandidate({ expectedCommit: commit, manifest: { ...candidate(), status }, wasm })).toThrow());
  it('rejects approval even when every digest matches', () => expect(() => verifyCandidate({ expectedCommit: commit, manifest: { ...candidate(), approval: 'APPROVED_FOR_TESTNET_UPLOAD' }, wasm })).toThrow());
  it('rejects changed bytes despite matching REPRODUCIBLE metadata', () => expect(() => verifyCandidate({ expectedCommit: commit, manifest: candidate(), wasm: Buffer.from('altered') })).toThrow());
  it('rejects expected source mismatch', () => expect(() => verifyCandidate({ expectedCommit: 'd'.repeat(40), manifest: candidate(), wasm })).toThrow());
  it.each(['size', 'lock', 'tree', 'environment', 'validator', 'count', 'identity'])('rejects %s disagreement', kind => {
    const other = build('build-b');
    if (kind === 'size') other.artifact.sizeBytes++;
    if (kind === 'lock') other.source.cargoLockSha256 = 'd'.repeat(64);
    if (kind === 'tree') other.source.tree = 'd'.repeat(40);
    if (kind === 'environment') other.environment.imageVersion = '20260914.1';
    if (kind === 'validator') other.builds[0].validation.version = '2.2.1';
    if (kind === 'count') other.independentBuildCount = 2;
    if (kind === 'identity') other.builds[0].job = 'build-a';
    expect(() => compareBuilds({ expectedCommit: commit, left: { manifest: build('build-a'), wasm }, right: { manifest: other, wasm } })).toThrow();
  });
  it('rejects a single-build claim relabeled REPRODUCIBLE', () => expect(() => verifyCandidate({ expectedCommit: commit, manifest: { ...build('a'), status: 'REPRODUCIBLE' }, wasm })).toThrow());
  it('rejects absent validator', () => { const m = candidate(); delete m.builds[0].validation; expect(() => verifyCandidate({ expectedCommit: commit, manifest: m, wasm })).toThrow(); });
});

it('rejects a modified compiler identity even with matching release fields', () => { const m = candidate(); m.environment.rust = m.environment.rust.replace('rustc 1.85.1', 'untrusted compiler'); expect(() => verifyCandidate({ expectedCommit: commit, manifest: m, wasm })).toThrow(); });
