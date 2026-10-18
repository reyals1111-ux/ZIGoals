import { toBech32 } from "@cosmjs/encoding";
import { expect, test } from "vitest";
import { buildExplorerUrl, explorerHome, explorerLinksFor, explorers, isSafeReferenceUrl, mainnetExplorers } from "./links";

// Session AF (ADR-028 H53): zigchain-1 explorer routes, probed with one GET each on 2026-10-18 (links.ts).
const hash = "719C2171129235693E659F04A73882BBD7B44545F71CC38E15593BC1D8ED7E93";
const account = "zig1akyvf3rgrcd2ycg47ae3u57nygg3zj45a7lpc2";
const validator = "zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl";

test("the Ecosystem page's testnet list is unchanged: Range and ZIGScan on zig-test-2 only", () => {
  expect(explorers.map((p) => [p.id, p.chainId, p.homepage])).toEqual([
    ["range", "zig-test-2", "https://app.range.org/zigchain-testnet/general"],
    ["zigscan", "zig-test-2", "https://testnet.zigscan.org/"],
  ]);
  expect(mainnetExplorers.map((p) => [p.id, p.chainId, p.lastVerified])).toEqual([
    ["range", "zigchain-1", "2026-10-18"],
    ["zigscan", "zigchain-1", "2026-10-18"],
  ]);
  for (const p of mainnetExplorers) {
    expect(Object.isFrozen(p) && Object.isFrozen(p.routes)).toBe(true);
    expect(isSafeReferenceUrl(p.homepage)).toBe(true);
    for (const route of Object.values(p.routes)) expect(isSafeReferenceUrl(route.prefix) && isSafeReferenceUrl(route.evidence), route.prefix).toBe(true);
  }
});
test("mainnet links: zigscan tx (upper case), address, validator; Range tx and address", () => {
  expect(buildExplorerUrl("zigscan", "zigchain-1", "transaction", hash.toLowerCase())).toBe(`https://zigscan.org/tx/${hash}`);
  expect(buildExplorerUrl("zigscan", "zigchain-1", "account", account)).toBe(`https://zigscan.org/address/${account}`);
  expect(buildExplorerUrl("zigscan", "zigchain-1", "validator", validator)).toBe(`https://zigscan.org/validators/${validator}`);
  expect(buildExplorerUrl("range", "zigchain-1", "transaction", hash)).toBe(`https://app.range.org/tx/zigchain/${hash}`);
  expect(buildExplorerUrl("range", "zigchain-1", "account", account)).toBe(`https://app.range.org/address/zigchain/${account}`);
  expect(explorerHome("zigscan", "zigchain-1")).toBe("https://zigscan.org/");
  expect(explorerLinksFor("zigchain-1", "transaction", hash)).toEqual([
    { name: "Range", url: `https://app.range.org/tx/zigchain/${hash}` },
    { name: "ZIGScan", url: `https://zigscan.org/tx/${hash}` },
  ]);
  expect(explorerLinksFor("zigchain-1", "validator", validator)).toEqual([{ name: "ZIGScan", url: `https://zigscan.org/validators/${validator}` }]);
});
test("testnet: the validator route on testnet zigscan; Range testnet still has no detail routes", () => {
  expect(buildExplorerUrl("zigscan", "zig-test-2", "validator", validator)).toBe(`https://testnet.zigscan.org/validators/${validator}`);
  expect(explorerLinksFor("zig-test-2", "transaction", hash)).toEqual([{ name: "ZIGScan", url: `https://testnet.zigscan.org/tx/${hash}` }]);
});
test("no cross-network, unverified or malformed link is ever built", () => {
  expect(buildExplorerUrl("range", "zigchain-1", "validator", validator)).toBeNull();
  expect(buildExplorerUrl("zigscan", "zigchain-1", "block", "12")).toBeNull();
  expect(buildExplorerUrl("zigscan", "zigchain-1", "contract", toBech32("zig", new Uint8Array(32)))).toBeNull();
  expect(buildExplorerUrl("zigscan", "zigchain-2", "transaction", hash)).toBeNull();
  for (const bad of [account, validator.toUpperCase(), toBech32("zigvaloper", new Uint8Array(32)), toBech32("cosmosvaloper", new Uint8Array(20)), `${validator}?x=1`, "../x"])
    expect(buildExplorerUrl("zigscan", "zigchain-1", "validator", bad), bad).toBeNull();
  expect(buildExplorerUrl("zigscan", "zigchain-1", "account", validator)).toBeNull();
  expect(explorerLinksFor("zigchain-1", "transaction", "ab")).toEqual([]);
});
