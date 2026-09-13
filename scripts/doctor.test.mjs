import { describe, expect, test } from "vitest";
import { evaluateDoctor, probeCommand } from "./lib/doctor.mjs";
const facts = () => ({
  expected: { node: "24.19.0", pnpm: "11.19.0", rust: "1.85.1" },
  actual: { node: "24.19.0", pnpm: "11.19.0", rust: "1.85.1" },
  wasmTarget: true, docker: false, git: { branch: "feat/m3-readiness", commit: "a".repeat(40), dirty: false },
  filesMissing: [], pinsAgree: true,
  network: { network: "testnet", chainId: "zig-test-2", rpcUrl: "https://testnet-rpc.zigchain.com", restUrl: "https://testnet-api.zigchain.com", nativeAsset: { baseDenom: "azig", decimals: 18 } },
});
describe("developer environment diagnosis", () => {
  test("web prerequisites pass with optional Docker warning", () => {
    const report = evaluateDoctor(facts());
    expect(report.exitCode).toBe(0);
    expect(report.checks.find(c => c.id === "docker").level).toBe("WARNING");
  });
  test.each([["node", "22.23.1"], ["pnpm", "10.0.0"]])("%s mismatch is actionable ERROR", (key, value) => {
    const f = facts(); f.actual[key] = value;
    const r = evaluateDoctor(f); expect(r.exitCode).toBe(1);
    expect(r.checks.find(c => c.id === key)).toMatchObject({ level: "ERROR", expected: f.expected[key], actual: value });
  });
  test("optional Rust and wasm absence does not block web setup", () => {
    const f = facts(); f.actual.rust = null; f.wasmTarget = false;
    const r = evaluateDoctor(f); expect(r.exitCode).toBe(0);
    expect(r.checks.filter(c => ["rust", "wasm"].includes(c.id)).every(c => c.level === "WARNING")).toBe(true);
  });
  test("conflicting pins and missing required source fail clearly", () => {
    const f = facts(); f.pinsAgree = false; f.filesMissing = ["pnpm-lock.yaml"];
    const r = evaluateDoctor(f); expect(r.exitCode).toBe(1);
    expect(r.checks.find(c => c.id === "files").detail).toContain("pnpm-lock.yaml");
    expect(r.checks.find(c => c.id === "pins").level).toBe("ERROR");
  });
  test("dirty Git state is a warning without exposing file contents", () => {
    const f = facts(); f.git.dirty = true;
    expect(evaluateDoctor(f).checks.find(c => c.id === "git").level).toBe("WARNING");
  });
  test.each([null, {network:"mainnet"}, { ...facts().network, nativeAsset:{baseDenom:"uzig",decimals:6} }])("invalid or obsolete network configuration is an ERROR", network => {
    const f = facts(); f.network = network;
    expect(evaluateDoctor(f).checks.find(c => c.id === "network").level).toBe("ERROR");
  });
  test("failed command diagnostics suppress arbitrary stderr and use no shell", () => {
    let options;
    const result=probeCommand("not-a-tool", [], { runner:(_cmd,_args,opts)=>{options=opts;return {status:1,stdout:"",stderr:"private fixture value"};} });
    expect(result).toEqual({ ok:false, output:"" });
    expect(options.shell).toBe(false);
    expect(options.timeout).toBeLessThanOrEqual(5000);
    expect(options.env.COREPACK_ENABLE_NETWORK).toBe("0");
    expect(options.env.RUSTUP_AUTO_INSTALL).toBe("0");
  });
});
