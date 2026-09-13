import { describe, expect, it } from "vitest";
import { toBech32 } from "@cosmjs/encoding";
import {
  buildExplorerUrl,
  explorerHome,
  hubLinks,
  parseProvider,
  canExecuteProvider,
} from "./index";
const address = toBech32("zig", new Uint8Array(20).fill(7));
const provider = {
  id: "example",
  name: "Example",
  roles: ["VAULT"],
  website: "https://example.org/",
  documentation: [],
  networks: [
    {
      chainId: "zig-test-2",
      status: "UNCONFIRMED",
      note: "No deployment proof",
    },
  ],
  contracts: [],
  capabilities: [],
  status: "RESEARCHED",
  verification: "UNCONFIRMED",
  lastVerified: "2026-09-13",
  risks: ["Unknown code"],
  audits: [],
  eligibility: {
    kyc: "UNKNOWN",
    jurisdiction: "Unconfirmed",
    note: "No eligibility evidence",
  },
  notes: "Research only",
  sources: [],
  phase: "RESEARCH",
};
describe("registry separates research from authority", () => {
  it.each(["DISCOVERED", "RESEARCHED", "VERIFIED", "INTEGRATED", "DISABLED"])(
    "cannot execute from lifecycle %s",
    (status) => {
      const p = parseProvider({ ...provider, status });
      expect(canExecuteProvider(p)).toBe(false);
    },
  );
  it("rejects executable capability claims and extra injection fields", () => {
    expect(() =>
      parseProvider({ ...provider, capabilities: ["DEPOSIT"] }),
    ).toThrow();
    expect(() =>
      parseProvider({ ...provider, html: "<script>alert(1)</script>" }),
    ).toThrow();
  });
  it.each([
    "javascript:alert(1)",
    "http://example.org",
    "https://user:pass@example.org/",
    "//evil.org",
    "https://example.org/\n",
  ])("rejects unsafe reference URL %s", (website) =>
    expect(() => parseProvider({ ...provider, website })).toThrow(),
  );
  it("rejects inconsistent dates and oversized metadata", () => {
    expect(() =>
      parseProvider({ ...provider, lastVerified: "2026-02-31" }),
    ).toThrow();
    expect(() =>
      parseProvider({ ...provider, notes: "a".repeat(5001) }),
    ).toThrow();
  });
});
describe("evidenced explorer links", () => {
  it("selects known testnet routes only", () => {
    expect(buildExplorerUrl("zigscan", "zig-test-2", "account", address)).toBe(
      `https://testnet.zigscan.org/address/${address}`,
    );
    expect(buildExplorerUrl("zigscan", "zig-test-2", "block", "2617855")).toBe(
      "https://testnet.zigscan.org/block/2617855",
    );
    expect(explorerHome("range", "zig-test-2")).toBe(
      "https://app.range.org/zigchain-testnet/general",
    );
  });
  it("normalizes only valid hashes and distinguishes contract addresses", () => {
    expect(
      buildExplorerUrl("zigscan", "zig-test-2", "transaction", "ab".repeat(32)),
    ).toBe("https://testnet.zigscan.org/tx/" + "AB".repeat(32));
    for (const bad of [
      "ab",
      "x".repeat(64),
      "A".repeat(64) + "?x",
      "../" + "A".repeat(64),
    ])
      expect(
        buildExplorerUrl("zigscan", "zig-test-2", "transaction", bad),
      ).toBeNull();
    expect(
      buildExplorerUrl("zigscan", "zig-test-2", "contract", address),
    ).toBeNull();
    const contract = toBech32("zig", new Uint8Array(32).fill(8));
    expect(
      buildExplorerUrl("zigscan", "zig-test-2", "contract", contract),
    ).toBe(`https://testnet.zigscan.org/smart-contracts/contract/${contract}`);
  });
  it("cannot create unverified routes or cross-network links", () => {
    expect(
      buildExplorerUrl("range", "zig-test-2", "transaction", "A".repeat(64)),
    ).toBeNull();
    expect(buildExplorerUrl("zigscan", "unknown", "block", "12")).toBeNull();
    expect(
      buildExplorerUrl("zigscan", "zig-test-2", "asset", "azig"),
    ).toBeNull();
    expect(buildExplorerUrl("evil", "zig-test-2", "block", "12")).toBeNull();
  });
  it.each([
    "../evil",
    "12?redirect=evil",
    "0",
    "1e3",
    "9007199254740992",
    "12/",
    " 12",
  ])("rejects hostile or invalid block %s", (value) =>
    expect(
      buildExplorerUrl("zigscan", "zig-test-2", "block", value),
    ).toBeNull(),
  );
  it.each([
    "zig1invalid",
    "https://evil.org",
    address + "?x=1",
    toBech32("cosmos", new Uint8Array(20)),
    toBech32("zig", new Uint8Array(3)),
  ])("rejects malformed account %s", (value) =>
    expect(
      buildExplorerUrl("zigscan", "zig-test-2", "account", value),
    ).toBeNull(),
  );
  it("exposes only named static Hub destinations without passing wallet data", () => {
    expect(hubLinks.map((l) => l.id)).toEqual([
      "overview",
      "validators",
      "governance",
      "staking",
      "bridge",
    ]);
    expect(
      hubLinks.every(
        (l) =>
          new URL(l.url).origin === "https://hub.zigchain.com" &&
          !new URL(l.url).search,
      ),
    ).toBe(true);
  });
});

describe("current evidence snapshot", () => {
  it("validates each required participant without granting execution", async () => {
    const { ecosystemProviders } = await import("./providers");
    const required = [
      "valdora",
      "oroswap",
      "permapod",
      "nawa",
      "zig-markets",
      "zignaly",
      "zamanat",
      "defa-invoicemate",
      "beehive",
      "ondo",
      "taurus",
      "apex-group",
      "range",
      "zigscan",
      "noble",
      "axelar",
      "zigchain-hub",
      "wme",
    ];
    expect(ecosystemProviders.map((p) => p.id).sort()).toEqual(required.sort());
    expect(
      ecosystemProviders.every(
        (p) => !canExecuteProvider(p) && p.sources.length > 0,
      ),
    ).toBe(true);
  });
});
