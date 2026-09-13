import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { platform, arch, release } from "node:os";
import { fileURLToPath } from "node:url";
import { describeWasm } from "./lib/wasm-build-report.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const run = (command, args) =>
  execFileSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 2_000_000,
  }).trim();
const artifact = "artifacts/zigoals_goal_manager.wasm";
const check =
  process.env.COSMWASM_CHECK ?? `${root}.toolchain/check/bin/cosmwasm-check`;
const binaryen =
  process.env.BINARYEN_JS ??
  `${root}.toolchain/wasm-tools/node_modules/binaryen/bin/wasm-opt`;
const environment = {
  platform: platform(),
  arch: arch(),
  osRelease: release(),
  node: process.versions.node,
  rust: run("rustc", ["-vV"]),
  binaryen: run(process.execPath, [binaryen, "--version"]),
  cosmwasmCheck: run(check, ["--version"]),
  cargoLockSha256: describeWasm(readFileSync(`${root}Cargo.lock`), {}).sha256,
  optimizerArgs: ["-Oz", "--signext-lowering"],
  target: "wasm32-unknown-unknown",
};
const output = run(check, [artifact]); // Nonzero validation exits before any success report.
const report = {
  schemaVersion: 1,
  artifact,
  sourceCommit: run("git", ["rev-parse", "HEAD"]),
  sourceDirty: Boolean(
    run("git", ["status", "--porcelain", "--untracked-files=normal"]),
  ),
  builtAt: new Date().toISOString(),
  ...describeWasm(readFileSync(`${root}${artifact}`), environment),
  validation: { tool: "cosmwasm-check", passed: true, output },
};
writeFileSync(
  `${root}artifacts/build-report.json`,
  `${JSON.stringify(report, null, 2)}\n`,
);
writeFileSync(
  `${root}artifacts/checksums.txt`,
  `${report.sha256}  ${artifact}\n`,
);
console.log(JSON.stringify(report, null, 2));
