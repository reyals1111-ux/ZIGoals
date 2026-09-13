import { expect, test } from "vitest";
import { describeWasm } from "./lib/wasm-build-report.mjs";
test("build metadata uses the actual artifact bytes and measured environment", () => {
  const r = describeWasm(Buffer.from("abc"), {
    platform: "linux",
    arch: "x64",
    rust: "rustc 1.85.1",
    binaryen: "wasm-opt version 123",
    cosmwasmCheck: "cosmwasm-check 2.2.2",
  });
  expect(r.bytes).toBe(3);
  expect(r.sha256).toBe(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  expect(r.environment.platform).toBe("linux");
  expect(r.referenceMatch).toBe(false);
});
test("checksum differences remain observations without an invented validity claim", () => {
  const r = describeWasm(Buffer.from("different"), {
    platform: "darwin",
    arch: "arm64",
  });
  expect(r.referenceMatch).toBe(false);
  expect(r).not.toHaveProperty("validation");
});
