import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
export function probeCommand(
  command,
  args,
  { runner = spawnSync, cwd, env = process.env } = {},
) {
  try {
    const result = runner(command, args, {
      cwd,
      shell: false,
      encoding: "utf8",
      timeout: 4000,
      maxBuffer: 131072,
      env: {
        ...env,
        GIT_OPTIONAL_LOCKS: "0",
        COREPACK_ENABLE_NETWORK: "0",
        COREPACK_ENABLE_AUTO_PIN: "0",
        RUSTUP_AUTO_INSTALL: "0",
        RUSTUP_NO_UPDATE_CHECK: "1",
      },
    });
    return result.status === 0
      ? { ok: true, output: (result.stdout ?? "").trim() }
      : { ok: false, output: "" };
  } catch {
    return { ok: false, output: "" };
  }
}
export function evaluateDoctor(facts) {
  const checks = [];
  const add = (id, level, detail, extra = {}) =>
    checks.push({ id, level, detail, ...extra });
  for (const tool of ["node", "pnpm", "rust"]) {
    const expected = facts.expected[tool],
      actual = facts.actual[tool];
    add(
      tool,
      expected && actual === expected
        ? "PASS"
        : expected && tool === "rust"
          ? "WARNING"
          : "ERROR",
      `${tool}: expected ${expected ?? "missing pin"}; actual ${actual ?? "unavailable"}${tool === "rust" && actual !== expected ? "; contract work requires the pinned Rust toolchain" : ""}`,
      { expected, actual },
    );
  }
  add(
    "wasm",
    facts.wasmTarget ? "PASS" : "WARNING",
    `wasm32-unknown-unknown: ${facts.wasmTarget ? "installed for pinned Rust" : "unavailable; needed for contract builds only"}`,
  );
  add(
    "git",
    !facts.git
      ? "WARNING"
      : facts.git.dirty || !facts.git.branch
        ? "WARNING"
        : "PASS",
    facts.git
      ? `Git: ${facts.git.branch || "detached HEAD"} ${facts.git.commit.slice(0, 12)}; ${facts.git.dirty ? "uncommitted changes" : "clean"}`
      : "Git state unavailable",
  );
  const n = facts.network;
  const validNetwork =
    n?.network === "testnet" &&
    n.chainId === "zig-test-2" &&
    n.nativeAsset?.baseDenom === "azig" &&
    n.nativeAsset.decimals === 18 &&
    n.nativeAsset.symbol === "ZIG" &&
    n.nativeAsset.displayDenom === "ZIG" &&
    n.addressPrefix === "zig" &&
    n.grpcUrl === "grpc-t.zigchain.nodestake.org:443" &&
    n.gasPrice === "2500000000" &&
    n.rpcUrl === "https://testnet-rpc.zigchain.com" &&
    n.restUrl === "https://testnet-api.zigchain.com";
  add(
    "network",
    validNetwork ? "PASS" : "ERROR",
    validNetwork
      ? "Configured testnet: zig-test-2 / azig / 18 decimals; live health not queried"
      : "Missing, obsolete or unsupported testnet configuration",
  );
  add(
    "docker",
    facts.docker ? "PASS" : "WARNING",
    facts.docker
      ? "Optional Docker daemon reachable"
      : "Optional Docker daemon unavailable; pinned non-container Wasm build remains available",
  );
  add(
    "files",
    facts.filesMissing.length ? "ERROR" : "PASS",
    facts.filesMissing.length
      ? `Missing required files: ${facts.filesMissing.join(", ")}`
      : "Required source, lockfile and toolchain pins present",
  );
  add(
    "pins",
    facts.pinsAgree ? "PASS" : "ERROR",
    facts.pinsAgree
      ? "Node pin files agree"
      : "Node pin files are missing or disagree; use the repository's exact pinned version",
  );
  return {
    readOnly: true,
    checks,
    exitCode: checks.some((c) => c.level === "ERROR") ? 1 : 0,
  };
}
export function collectDoctor(root) {
  const read = (name) => {
    try {
      return readFileSync(join(root, name), "utf8");
    } catch {
      return null;
    }
  };
  const json = (name) => {
    try {
      return JSON.parse(read(name));
    } catch {
      return null;
    }
  };
  const pkg = json("package.json");
  const node = read(".node-version")?.trim() ?? null;
  const rust =
    read("rust-toolchain.toml")?.match(/channel\s*=\s*"([^"]+)"/)?.[1] ?? null;
  const pnpm =
    pkg?.packageManager?.match(/^pnpm@(\d+\.\d+\.\d+)$/)?.[1] ?? null;
  const run = (command, args, env = process.env) =>
    probeCommand(command, args, { cwd: root, env });
  const semver = (output) => output.match(/\b(\d+\.\d+\.\d+)\b/)?.[1] ?? null;
  const localRustup = join(root, ".toolchain/cargo/bin/rustup");
  const rustup = existsSync(localRustup) ? localRustup : "rustup";
  const rustEnv = existsSync(localRustup)
    ? {
        ...process.env,
        CARGO_HOME: join(root, ".toolchain/cargo"),
        RUSTUP_HOME: join(root, ".toolchain/rustup"),
      }
    : process.env;
  const rustVersion = rust
    ? run(rustup, ["run", rust, "rustc", "--version"], rustEnv)
    : { output: "" };
  const targets = rust
    ? run(
        rustup,
        ["target", "list", "--installed", "--toolchain", rust],
        rustEnv,
      )
    : { output: "" };
  const commit = run("git", ["rev-parse", "HEAD"]);
  const status = run("git", [
    "status",
    "--porcelain",
    "--untracked-files=normal",
  ]);
  const branch = run("git", ["branch", "--show-current"]);
  return evaluateDoctor({
    expected: { node, pnpm, rust },
    actual: {
      node: process.versions.node,
      pnpm: semver(run("pnpm", ["--version"]).output),
      rust: semver(rustVersion.output),
    },
    wasmTarget: targets.output.split(/\s+/).includes("wasm32-unknown-unknown"),
    docker: run("docker", [
      "--host",
      "unix:///var/run/docker.sock",
      "version",
      "--format",
      "{{.Server.Version}}",
    ]).ok,
    git:
      commit.ok && status.ok
        ? {
            branch: branch.output,
            commit: commit.output,
            dirty: Boolean(status.output),
          }
        : null,
    network: json("packages/chain-config/src/testnet.json"),
    filesMissing: [
      "package.json",
      "pnpm-lock.yaml",
      ".node-version",
      ".nvmrc",
      "rust-toolchain.toml",
      "Cargo.toml",
      "apps/web/package.json",
      "contracts/goal-manager/src/lib.rs",
      "packages/chain-config/src/testnet.json",
    ].filter((name) => !existsSync(join(root, name))),
    pinsAgree: Boolean(
      node && node === pkg?.engines?.node && node === read(".nvmrc")?.trim(),
    ),
  });
}
