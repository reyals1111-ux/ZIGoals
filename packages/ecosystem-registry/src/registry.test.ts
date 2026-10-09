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

describe("public evidence attribution", () => {
  it("omits private owner outreach while preserving the Valdora integration gate", async () => {
    const { ecosystemProviders } = await import("./providers");
    for (const record of ecosystemProviders)
      expect(record.notes).not.toMatch(
        /\b(?:emailed|outreach|owner-requested)\b/i,
      );
    const valdora = ecosystemProviders.find(
      (record) => record.id === "valdora",
    )!;
    // Session Y Part 9: the same gate in consumer wording (ADR-018, "Assertions changed").
    expect(valdora.notes).toContain(
      "Before ZIGoals could ever act in a Valdora vault, Valdora would need to publish exactly how a deposit, a fee, a delayed withdrawal and a receipt work.",
    );
    expect(canExecuteProvider(valdora)).toBe(false);
  });
  it.each([
    [
      "oroswap",
      "mainnetFactory",
      "zigchain-1",
      "https://github.com/oroswap/oroswap-deployments/blob/main/zigchain/mainnet.json",
    ],
    [
      "oroswap",
      "mainnetRouter",
      "zigchain-1",
      "https://github.com/oroswap/oroswap-deployments/blob/main/zigchain/mainnet.json",
    ],
    [
      "oroswap",
      "testnetFactory",
      "zig-test-2",
      "https://github.com/oroswap/oroswap-deployments/blob/main/zigchain/testnet.json",
    ],
    [
      "oroswap",
      "testnetRouter",
      "zig-test-2",
      "https://github.com/oroswap/oroswap-deployments/blob/main/zigchain/testnet.json",
    ],
    [
      "permapod",
      "mainnetRedBank",
      "zigchain-1",
      "https://raw.githubusercontent.com/permapod-zigchain/permapod-skills/main/src/config.ts",
    ],
    [
      "permapod",
      "mainnetOracle",
      "zigchain-1",
      "https://raw.githubusercontent.com/permapod-zigchain/permapod-skills/main/src/config.ts",
    ],
  ])(
    "%s %s cites the correct deployment evidence",
    async (providerId, purpose, chainId, url) => {
      const { ecosystemProviders } = await import("./providers");
      const provider = ecosystemProviders.find(
        (record) => record.id === providerId,
      )!;
      const contract = provider.contracts.find(
        (record) => record.purpose === purpose,
      )!;
      expect(contract.chainId).toBe(chainId);
      expect(contract.evidence).toEqual(
        provider.sources.find((source) => source.url === url),
      );
      expect(contract.evidence.url).toBe(url);
    },
  );
});

describe("no rates of return and no referral or tracking links", () => {
  // Session N (2026-10-02). Records describe providers; they never state a rate of return as a fact, and no link
  // carries a referral, affiliate or tracking parameter. A provider's fee may be described, never a yield.
  const rate =
    /\b(?:APR|APY|TVL)\b|\bper\s+(?:year|annum)\b|\bp\.a\.|\bannual(?:i[sz]ed)?\s+(?:return|rate|yield)|\d+(?:\.\d+)?\s*%\s*(?:APR|APY|yield|returns?|interest|a\s+year|per\s+(?:year|annum|month))\b|(?<!\b(?:not|never|no)\s)\b(?:guaranteed?|risk[- ]free)\b/i;
  const trackingKey =
    /^(?:ref|refid|ref_id|referral|referrer|affiliate|aff|aff_id|affid|invite|promo|promocode|campaign|partner|click_?id|gclid|fbclid|utm_\w+)$/i;
  const tracked = (url: string) => {
    const parsed = new URL(url);
    return (
      [...parsed.searchParams.keys()].some((key) => trackingKey.test(key)) ||
      /\/(?:ref|referral|affiliate|aff)\//i.test(parsed.pathname)
    );
  };
  const strings = (value: unknown): string[] =>
    typeof value === "string"
      ? [value]
      : Array.isArray(value)
        ? value.flatMap(strings)
        : value && typeof value === "object"
          ? Object.values(value).flatMap(strings)
          : [];

  it("the patterns catch what they are meant to", () => {
    for (const text of [
      "Up to 12% APY",
      "Earn 5 % a year",
      "8% per year on deposits",
      "Guaranteed income",
      "Risk-free staking",
      "TVL $3M",
    ])
      expect(text).toMatch(rate);
    for (const text of [
      "a 10% performance fee on rewards",
      "Do not treat stock exposure as cash yield.",
      "Stablecoin Yield Vault",
      "0% performance fee and redemption up to 120 days",
      "transfer/sale of financing is not guaranteed.",
    ])
      expect(text).not.toMatch(rate);
    for (const url of [
      "https://example.org/?ref=abc",
      "https://example.org/buy?utm_source=x",
      "https://example.org/r?affiliate=1",
      "https://example.org/ref/abc",
    ])
      expect(tracked(url)).toBe(true);
    expect(tracked("https://example.org/docs?denom=uusdc")).toBe(false);
  });

  it("holds for every registry record and every directory entry", async () => {
    const { ecosystemProviders, directoryEntries } = await import("./providers");
    const all = strings([ecosystemProviders, directoryEntries]);
    const urls = all.filter((value) => /^https:\/\//.test(value));
    const texts = all.filter((value) => !/^https:\/\//.test(value));
    expect(urls.length).toBeGreaterThan(100);
    expect(texts.filter((text) => rate.test(text))).toEqual([]);
    expect(urls.filter(tracked)).toEqual([]);
  });
});

// Session X Part 5a: the provider records are parsed once (records.ts), and the links module needs no zod, so pages that
// only link out (Ecosystem, explorer links, Connection diagnostics) never build the provider schemas.
it("the snapshot is parsed in one place and the links module needs no schema library", async () => {
  const { readFileSync, readdirSync } = await import("node:fs");
  const dir = new URL("./", import.meta.url);
  const importers = readdirSync(dir).filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts") && /from ["']\.\/providers\.json["']/.test(readFileSync(new URL(name, dir), "utf8")));
  expect(importers).toEqual(["records.ts"]);
  const links = readFileSync(new URL("./links.ts", dir), "utf8");
  expect(links).not.toMatch(/from ["']zod["']|from ["']\.\/index["']|providers\.json/);
  const linksModule = await import("./links");
  const root = await import("./index");
  for (const name of ["explorers", "hubLinks", "buildExplorerUrl", "explorerHome", "explorerEvidence", "isSafeReferenceUrl"] as const) expect(root[name]).toBe(linksModule[name]);
  const { ecosystemProviders, directoryEntries } = await import("./providers");
  expect(directoryEntries.map((entry) => entry.id)).toEqual(ecosystemProviders.map((provider) => provider.id));
});

// Session Y Part 9 (persona notes): what a person reads in the Ecosystem directory is consumer wording. The capability
// note carries no developer terms, and no rendered field calls anyone a "partner".
describe("consumer wording", () => {
  it("notes carry no developer terms; no rendered field says partner", async () => {
    const { ecosystemProviders } = await import("./providers");
    const developer = /\b(?:integration surface|api|abi|adapters?|schemas?|rpc|cosmwasm|sdk|protobuf|execute\/query|denom-trace|config key)\b/i;
    for (const record of ecosystemProviders) {
      expect(record.notes, record.id).not.toMatch(developer);
      const rendered = [record.notes, record.eligibility.jurisdiction, record.eligibility.note, ...record.risks, ...record.networks.map((n) => n.note), ...record.sources.flatMap((s) => [s.title, s.supports]), ...record.audits.flatMap((a) => [a.title, a.supports])];
      for (const text of rendered) expect(text, record.id).not.toMatch(/\bpartner(?:s|ship)?\b/i);
    }
  });
});
