import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareBuilds, verifyCandidate, sha256 } from './manifest.mjs';

export function verifySourceCheckout(expectedCommit, source) {
  if (!/^[a-f0-9]{40}$/.test(expectedCommit ?? '')) throw new Error('Expected source must be a full SHA');
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const git = args => execFileSync('git', args, { cwd: root, timeout: 30000, maxBuffer: 2_000_000, stdio: ['ignore', 'pipe', 'pipe'] });
  if (git(['rev-parse', `${expectedCommit}^{tree}`]).toString().trim() !== source.tree || sha256(git(['show', `${expectedCommit}:Cargo.lock`])) !== source.cargoLockSha256 || Number(git(['show', '-s', '--format=%ct', expectedCommit]).toString().trim()) !== source.sourceDateEpoch) throw new Error('Source tree, Cargo.lock or source-date epoch differs from the trusted commit');
}

export function runValidator(validator, wasmPath) {
  // The executable is a mandatory caller-supplied trust decision, never metadata.
  if (typeof validator !== 'string' || !validator.length) throw new Error('Provide a trusted validator path');
  const execute = args => execFileSync(resolve(validator), args, { encoding: 'utf8', timeout: 30000, maxBuffer: 2_000_000 }).trim();
  if (execute(['--version']) !== 'Contract checking 2.2.2') throw new Error('Wrong validator version; require cosmwasm-check 2.2.2');
  execute([resolve(wasmPath)]);
}
function readEvidence(directory) {
  const manifestPath = join(directory, 'artifact-manifest.json');
  const wasmPath = join(directory, 'zigoals_goal_manager.wasm');
  if (!statSync(manifestPath).isFile() || statSync(manifestPath).size > 32768) throw new Error('Manifest must be a file <= 32 KiB');
  if (!statSync(wasmPath).isFile() || statSync(wasmPath).size > 10_000_000) throw new Error('Wasm must be a file <= 10 MB');
  return { manifest: JSON.parse(readFileSync(manifestPath, 'utf8')), wasm: readFileSync(wasmPath), wasmPath };
}
// Shared read-only entry point for downloaded candidate consumers. No logging,
// network access or executable path is selected from the downloaded manifest.
export function verifyCandidateDirectory({ expectedCommit, directory, validator }) {
  const input = readEvidence(directory);
  verifyCandidate({ expectedCommit, ...input });
  verifySourceCheckout(expectedCommit, input.manifest.source);
  runValidator(validator, input.wasmPath);
  return input;
}
export function main(args) {
  const [command, expectedCommit, validator, ...directories] = args;
  if (command === 'verify' && directories.length === 1) {
    const input = verifyCandidateDirectory({ expectedCommit, directory: directories[0], validator });
    console.log(`Verified REPRODUCIBLE, NOT_APPROVED: ${input.manifest.artifact.sha256} (${input.wasm.length} bytes), source ${expectedCommit}`);
  } else if (command === 'compare' && directories.length === 3) {
    const left = readEvidence(directories[0]);
    const right = readEvidence(directories[1]);
    const result = compareBuilds({ expectedCommit, left, right });
    verifySourceCheckout(expectedCommit, result.source);
    runValidator(validator, left.wasmPath);
    runValidator(validator, right.wasmPath);
    // No output directory or success manifest exists until every check passes.
    mkdirSync(directories[2]);
    writeFileSync(join(directories[2], 'zigoals_goal_manager.wasm'), left.wasm, { flag: 'wx' });
    writeFileSync(join(directories[2], 'artifact-manifest.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
    writeFileSync(join(directories[2], 'checksums.txt'), `${result.artifact.sha256}  zigoals_goal_manager.wasm\n`, { flag: 'wx' });
    console.log(`Two independent builds match: ${result.artifact.sha256}`);
  } else throw new Error('Usage: node scripts/release/verify.mjs verify COMMIT TRUSTED_VALIDATOR DIR | compare COMMIT TRUSTED_VALIDATOR LEFT_DIR RIGHT_DIR NEW_OUTPUT_DIR');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
