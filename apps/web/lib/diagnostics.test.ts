import { expect, test, vi } from "vitest";
import { readDiagnostics, shortAccount } from "./diagnostics";
const json = (x: unknown) => new Response(JSON.stringify(x));
const good = (url: string) =>
  json(
    url.endsWith("/status")
      ? {
          result: {
            node_info: { network: "zig-test-2" },
            sync_info: {
              catching_up: false,
              latest_block_height: "7",
              latest_block_time: new Date().toISOString(),
            },
          },
        }
      : url.includes("node_info")
        ? {
            default_node_info: { network: "zig-test-2" },
            application_version: { version: "v5.1.0" },
          }
        : url.includes("base_fee")
          ? { base_fee: "2500000000.000000000000000000" }
        : url.includes("staking")
          ? { params: { bond_denom: "azig" } }
          : {
              metadata: {
                base: "azig",
                display: "ZIG",
                denom_units: [{ denom: "ZIG", exponent: 18 }],
              },
            },
  );
test("diagnostics separately verify RPC and REST with an actual check timestamp", async () => {
  const fetcher = vi.fn(async (url) =>
    good(String(url)),
  ) as unknown as typeof fetch;
  const r = await readDiagnostics(fetcher);
  expect(r.rpc.ok).toBe(true);
  expect(r.rest.ok).toBe(true);
  expect(r.checkedAt).toMatch(/^\d{4}-/);
});
test.each([
  {},
  { result: { node_info: { network: "wrong" } } },
  {
    result: {
      node_info: { network: "zig-test-2" },
      sync_info: { catching_up: true },
    },
  },
])(
  "incomplete or wrong RPC evidence cannot report healthy %j",
  async (response) => {
    const r = await readDiagnostics((async (url) =>
      String(url).endsWith("/status")
        ? json(response)
        : good(String(url))) as typeof fetch);
    expect(r.rpc.ok).toBe(false);
    expect(r.rest.ok).toBe(true);
  },
);
test("REST failure does not hide healthy RPC or expose arbitrary transport error text", async () => {
  const r = await readDiagnostics((async (url) => {
    if (!String(url).endsWith("/status")) throw Error("private fixture");
    return good(String(url));
  }) as typeof fetch);
  expect(r.rpc.ok).toBe(true);
  expect(r.rest.ok).toBe(false);
  expect(JSON.stringify(r)).not.toContain("private fixture");
});
test("short account text avoids full address and handles disconnected/local mode", () => {
  expect(shortAccount("")).toBe("Disconnected");
  expect(shortAccount("local-demo")).toBe("Local demo");
  expect(shortAccount("zig1" + "a".repeat(38))).toBe("zig1aaaa…aaaaaa");
});
// Session X Part 1: zig-test-2 runs zigchaind v5.1 (read 2026-10-07). The reviewed versions pass and are named; every
// other version, older or newer, still fails closed with the same generic text.
const withVersion = (version: unknown) =>
  (async (url: string | URL) =>
    String(url).includes("node_info")
      ? json({
          default_node_info: { network: "zig-test-2" },
          application_version: { version },
        })
      : good(String(url))) as typeof fetch;
test.each(["v5.1.0", "v5.1.1", "v5.1.2", "v5.1.3", "v5.1.10"])(
  "the reviewed version %s verifies and is named",
  async (version) => {
    const r = await readDiagnostics(withVersion(version));
    expect(r.rest).toEqual({
      ok: true,
      detail: `Verified zig-test-2 · azig · 18 decimals · ${version}`,
    });
  },
);
// Session AJ (D1): any patch of a reviewed minor passes (v5.1.3, v5.1.10 moved to the list above); these still fail.
test.each(["v5.0.0-patch-1", "v5.2.0", "v5.0.9", "v6.0.0-rc1", "6.0.0", "v5.1.0 ", "", null, 5])(
  "an unreviewed version %j fails closed",
  async (version) => {
    const r = await readDiagnostics(withVersion(version));
    expect(r.rest).toEqual({
      ok: false,
      detail:
        "Unavailable or changed REST network/denomination/version. Try again later.",
    });
  },
);

// Session AJ (ADR-035 D1, P3, A3): v6.0 verifies and names the network's base fee, read at the same check.
test.each(["v6.0.0", "v6.0.3"])("the v6 line %s verifies and names the base fee", async (version) => {
  const r = await readDiagnostics(withVersion(version));
  expect(r.rest).toEqual({ ok: true, detail: `Verified zig-test-2 · azig · 18 decimals · ${version} · base fee 2.5 Gazig per gas` });
});
test("a v6 node that cannot give its base fee is not healthy for signing", async () => {
  const r = await readDiagnostics((async (url: string | URL) =>
    String(url).includes("base_fee") ? new Response("{}", { status: 501 }) : withVersion("v6.0.0")(url)) as typeof fetch);
  expect(r.rest).toEqual({ ok: false, detail: "Verified zig-test-2 · azig · 18 decimals · v6.0.0 · the network fee could not be read. Try again later." });
});
test.each(["v6.1.0", "v7.0.0"])("a newer line %s says the network was upgraded and names the version", async (version) => {
  const r = await readDiagnostics(withVersion(version));
  expect(r.rest).toEqual({ ok: false, detail: `The network was upgraded; checks are pending. zig-test-2 reports ${version}.` });
});
