import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { tmpdir, platform, arch, release } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256, schema, validateManifest } from './manifest.mjs';
import { runValidator } from './verify.mjs';

const root = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
const [expectedCommit, destination, option] = process.argv.slice(2);
const compatibility = option === '--compatibility';
if (!/^[a-f0-9]{40}$/.test(expectedCommit ?? '') || !destination || (option && !compatibility) || process.argv.length > 5) throw new Error('Usage: node scripts/release/build.mjs EXPECTED_COMMIT NEW_OUTPUT_DIR [--compatibility]');
if (process.versions.node !== '24.19.0') throw new Error('Require Node 24.19.0');
if (existsSync(destination)) throw new Error('Output directory must not exist');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
if (git(['rev-parse', 'HEAD']) !== expectedCommit) throw new Error('Checkout differs from expected source commit');
if (git(['status', '--porcelain', '--untracked-files=normal'])) throw new Error('Canonical/compatibility build requires clean source');
const source = { commit: expectedCommit, tree: git(['rev-parse', 'HEAD^{tree}']), cargoLockSha256: sha256(readFileSync(join(root, 'Cargo.lock'))), sourceDateEpoch: Number(git(['show', '-s', '--format=%ct', 'HEAD'])) };
const localCargo = join(root, '.toolchain/cargo');
const cargoHome = realpathSync(process.env.CARGO_HOME ?? (existsSync(localCargo) ? localCargo : join(process.env.HOME, '.cargo')));
const rustupHome = realpathSync(process.env.RUSTUP_HOME ?? (existsSync(join(root, '.toolchain/rustup')) ? join(root, '.toolchain/rustup') : join(process.env.HOME, '.rustup')));
for (const name of ['config', 'config.toml']) if (existsSync(join(cargoHome, name))) throw new Error('Canonical build refuses Cargo-home configuration');
const temporary = mkdtempSync(join(tmpdir(), 'zigoals-canonical-'));
const target = join(temporary, 'target');
const home = join(temporary, 'home');
mkdirSync(home);
// Explicit environment drops wrappers, encoded flags, profile overrides, injected
// NODE_OPTIONS/LD_PRELOAD and arbitrary Cargo configuration from the caller.
const env = {
  PATH: `${dirname(process.execPath)}:${join(cargoHome, 'bin')}:/usr/bin:/bin:/usr/sbin:/sbin`,
  HOME: home, CARGO_HOME: cargoHome, RUSTUP_HOME: rustupHome, RUSTUP_TOOLCHAIN: '1.85.1',
  CARGO_TARGET_DIR: target, CARGO_INCREMENTAL: '0', CARGO_BUILD_JOBS: '2',
  LC_ALL: 'C', LANG: 'C', TZ: 'UTC', SOURCE_DATE_EPOCH: String(source.sourceDateEpoch),
  CARGO_ENCODED_RUSTFLAGS: ['-C', 'target-feature=-reference-types,-multivalue', '--remap-path-prefix', `${root}=/src`, '--remap-path-prefix', `${cargoHome}=/cargo`, '--remap-path-prefix', `${rustupHome}=/rustup`, '--remap-path-prefix', 'contracts/=/src/contracts/'].join('\x1f'),
};
if (process.env.CARGO_NET_OFFLINE === 'true') env.CARGO_NET_OFFLINE = 'true';
const run = (command, args) => execFileSync(command, args, { cwd: root, env, encoding: 'utf8', timeout: 1200000, maxBuffer: 10_000_000 }).trim();
const binaryen = join(root, 'scripts/release/toolchain/node_modules/binaryen/bin/wasm-opt');
const validator = join(root, '.toolchain/check/bin/cosmwasm-check');
const environment = {
  policy: 'canonical-linux-v1', platform: platform(), arch: arch(), osRelease: release(),
  imageOS: process.env.ImageOS ?? 'not-github-hosted', imageVersion: process.env.ImageVersion ?? 'not-github-hosted',
  rust: run('rustc', ['-vV']), cargo: run('cargo', ['--version']), node: process.versions.node,
  binaryen: run(process.execPath, [binaryen, '--version']), validator: run(validator, ['--version']),
  target: 'wasm32-unknown-unknown', flags: schema.properties.environment.properties.flags.const, locale: 'C', timezone: 'UTC',
};
if (environment.binaryen !== 'wasm-opt version 123 (version_123)' || environment.validator !== 'Contract checking 2.2.2' || environment.cargo !== 'cargo 1.85.1 (d73d2caf9 2024-12-31)' || !environment.rust.includes('\ncommit-hash: 4eb161250e340c8f48f66e2b929ef4a5bed7c181\n')) throw new Error('Toolchain pin mismatch');
if (!compatibility && (process.env.GITHUB_ACTIONS !== 'true' || environment.platform !== 'linux' || environment.arch !== 'x64' || environment.imageOS !== 'ubuntu24' || environment.imageVersion === 'not-github-hosted')) throw new Error('Canonical authority requires the GitHub Ubuntu 24.04 x64 workflow; local diagnostics require --compatibility');
console.log(`Clean build target: ${target}`);
console.log(run('cargo', ['wasm', '--locked']));
mkdirSync(resolve(destination));
const wasmPath = join(resolve(destination), 'zigoals_goal_manager.wasm');
console.log(run(process.execPath, [binaryen, join(target, 'wasm32-unknown-unknown/release/zigoals_goal_manager.wasm'), '-Oz', '--signext-lowering', '-o', wasmPath]));
runValidator(validator, wasmPath);
const wasm = readFileSync(wasmPath);
const manifest = {
  schemaVersion: 1, status: 'BUILD_VERIFIED', approval: 'NOT_APPROVED', source, environment,
  artifact: { name: 'zigoals_goal_manager.wasm', sha256: sha256(wasm), sizeBytes: wasm.length }, independentBuildCount: 1,
  builds: [{ repository: process.env.GITHUB_REPOSITORY, runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT, job: process.env.RELEASE_BUILD_JOB, builtAt: new Date().toISOString(), validation: { tool: 'cosmwasm-check', version: '2.2.2', passed: true } }],
};
if (git(['status', '--porcelain', '--untracked-files=normal']) || git(['rev-parse', 'HEAD']) !== expectedCommit || sha256(readFileSync(join(root, 'Cargo.lock'))) !== source.cargoLockSha256) throw new Error('Source changed during build');
if (compatibility) {
  writeFileSync(join(resolve(destination), 'development-report.json'), `${JSON.stringify({ ...manifest, status: 'DEVELOPMENT_ONLY', independentBuildCount: 0, builds: [], authority: 'Non-authoritative local compatibility diagnostic' }, null, 2)}\n`);
  console.log(`DEVELOPMENT_ONLY ${manifest.artifact.sha256} ${wasm.length} bytes`);
} else {
  validateManifest(manifest);
  writeFileSync(join(resolve(destination), 'artifact-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest, null, 2));
}
