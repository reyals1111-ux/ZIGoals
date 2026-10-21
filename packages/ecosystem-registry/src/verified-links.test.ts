import {describe, expect, it} from "vitest";
import {officialLinkSchema, parseProvider} from "./index";
import {LINK_REGISTRY_ONLY, ecosystemProviders, registryRecords} from "./records";
import {VERIFIED_LINKS, VERIFIED_URLS, isVerifiedUrl, verifiedLink} from "./verified-links";
import {directoryEntries} from "./directory";

/**
 * Session AF (ADR-028 H25, H94; `TIER 3 (public-safety labels)`): the verified link registry. providers.json holds each
 * provider's `officialLinks` under the strict schema; verified-links.ts is the same list for pages that only link out.
 * Every host is named here, so a new destination is a reviewed change to this test.
 */
const HOSTS = [
  "zig.finance", "docs.zigchain.com", "hub.zigchain.com", "faucet.zigchain.com", "www.keplr.app", "wallet.keplr.app", "zigscan.org",
  "valdora.finance", "docs.valdora.finance", "app.oroswap.org", "docs.oroswap.org", "www.nawa.finance", "www.permapod.xyz",
  "docs.permapod.xyz", "imdefa.com", "intercom.help", "defillama.com", "github.com",
  // Session AF chunk 2 (L1): Skip Go's public bridge page and Circle's own notice about USDC on Noble.
  "go.skip.build", "www.circle.com",
  // Session AF (L2b's rows, moved by the lead): wallets' sites and phone links, Ramp and Banxa, the stablecoins' issuers, two swaps.
  "metamask.io", "rabby.io", "www.coinbase.com", "trustwallet.com", "web3.okx.com", "phantom.com", "link.metamask.io", "link.trustwallet.com",
  "rampnetwork.com", "app.rampnetwork.com", "banxa.com", "tether.to", "app.uniswap.org", "jup.ag",
];
const trackingKey = /^(?:ref|refid|ref_id|referral|referrer|affiliate|aff|aff_id|affid|invite|promo|promocode|campaign|partner|click_?id|gclid|fbclid|utm_\w+)$/i;
const all = Object.entries(VERIFIED_LINKS).flatMap(([provider, links]) => links.map((link) => ({provider, ...link})));

describe("verified link registry", () => {
  it("the schema-free list is exactly every record's officialLinks", () => {
    const fromJson = Object.fromEntries(registryRecords.filter((record) => record.officialLinks?.length).map((record) => [record.id, record.officialLinks]));
    expect(JSON.parse(JSON.stringify(VERIFIED_LINKS))).toEqual(JSON.parse(JSON.stringify(fromJson)));
  });
  it("every link is literal, HTTPS, on a named host, dated, and carries no tracking or fragment", () => {
    expect(all.length).toBeGreaterThanOrEqual(39);
    for (const link of all) {
      const {provider: _provider, ...record} = link; void _provider;
      expect(() => officialLinkSchema.parse(record), `${link.provider}:${link.kind}`).not.toThrow();
      const url = new URL(link.url);
      expect(url.protocol).toBe("https:");
      expect(HOSTS, link.url).toContain(url.hostname);
      expect(url.hash).toBe("");
      expect([...url.searchParams.keys()].filter((key) => trackingKey.test(key)), link.url).toEqual([]);
      expect(/\/(?:ref|referral|affiliate|aff|invite)(?:\/|$)/i.test(url.pathname), link.url).toBe(false);
      expect(link.url, "a URL is written as the site serves it").toBe(url.href);
      expect(link.checkedAt).toMatch(/^2026-\d{2}-\d{2}$/);
    }
  });
  it("only Keplr's documented staking deep link has a query string", () => {
    expect(all.filter((link) => new URL(link.url).search).map((link) => `${link.provider}:${link.kind}`)).toEqual(["zig-finance:keplr-staking"]);
    expect(verifiedLink("zig-finance", "keplr-staking").url).toBe("https://wallet.keplr.app/chains/zigchain?modal=staking&chain=zigchain-1&step_id=2");
  });
  it("a bot wall is recorded as unreadable by automation, never as ok", () => {
    for (const link of all) expect(link.check === "ok", `${link.provider}:${link.kind}`).toBe(link.httpStatus >= 200 && link.httpStatus < 300);
    expect(all.filter((link) => link.check === "unreadable-by-automation").every((link) => [401, 403, 429].includes(link.httpStatus))).toBe(true);
    expect(verifiedLink("zig-finance", "hub-staking").check).toBe("unreadable-by-automation");
  });
  it("the schema refuses a query, a fragment, a mismatched check and a repeated kind", () => {
    const good = {kind: "site", url: "https://example.org/", checkedAt: "2026-10-18", check: "ok", httpStatus: 200, source: "https://example.org/"};
    expect(() => officialLinkSchema.parse(good)).not.toThrow();
    expect(() => officialLinkSchema.parse({...good, url: "https://example.org/?a=1"})).toThrow();
    expect(() => officialLinkSchema.parse({...good, url: "https://example.org/#x"})).toThrow();
    expect(() => officialLinkSchema.parse({...good, httpStatus: 403})).toThrow();
    expect(() => officialLinkSchema.parse({...good, check: "unreadable-by-automation"})).toThrow();
    expect(() => officialLinkSchema.parse({...good, extra: 1})).toThrow();
    expect(() => officialLinkSchema.parse({...good, url: "http://example.org/"})).toThrow();
    const record = registryRecords.find((r) => r.id === "valdora")!;
    expect(() => parseProvider({...record, officialLinks: [good, good]})).toThrow();
  });
  it("lookups are exact", () => {
    expect(isVerifiedUrl("https://valdora.finance/stake")).toBe(true);
    expect(isVerifiedUrl("https://valdora.finance/stake/")).toBe(false);
    expect(isVerifiedUrl("https://valdora.finance/stake?ref=x")).toBe(false);
    expect(VERIFIED_URLS.size).toBe(all.length);
    expect(() => verifiedLink("valdora", "nope" as "stake")).toThrow();
  });
  it("the link-only records are never ecosystem providers or directory entries", () => {
    // Session AF: the wallet lane's links joined as a second link-only record (one registry, ADR-028 H25).
    expect(LINK_REGISTRY_ONLY).toEqual(["zig-finance", "wallets-and-money"]);
    for (const id of LINK_REGISTRY_ONLY) {
      expect(registryRecords.map((r) => r.id)).toContain(id);
      expect(ecosystemProviders.map((r) => r.id)).not.toContain(id);
      expect(directoryEntries.map((r) => r.id)).not.toContain(id);
    }
    expect(registryRecords.length).toBe(ecosystemProviders.length + 2);
  });
  it("no rendered registry text calls anyone a partner", () => {
    for (const record of registryRecords.filter((r) => r.officialLinks?.length)) expect(JSON.stringify(record.officialLinks)).not.toMatch(/partner/i);
    for (const id of LINK_REGISTRY_ONLY) {
      const only = registryRecords.find((r) => r.id === id)!;
      expect([only.notes, ...only.risks, only.eligibility.note, only.eligibility.jurisdiction].join(" "), id).not.toMatch(/\bpartner/i);
    }
  });
});
