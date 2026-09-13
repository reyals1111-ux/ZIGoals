import { expect, test } from "@playwright/test";
import { toBech32 } from "@cosmjs/encoding";

const reconnectHintKey = "zigoals:wallet-reconnect-hint:v1";
const mockOwner = toBech32("zig", new Uint8Array(20).fill(9));
const connectedLabel = `${mockOwner.slice(0, 8)}…${mockOwner.slice(-4)}`;

test("mock Keplr reconnect stays explicit and tab scoped across reload", async ({
  context,
  page,
}) => {
  const mockCalls: string[] = [];
  await context.exposeFunction("__recordMockKeplrCall", (method: string) => {
    mockCalls.push(method);
  });
  await context.addInitScript(({ owner }) => {
    const record = (method: string) =>
      Reflect.get(window, "__recordMockKeplrCall")(method);
    Object.assign(window, {
      // Injected test double only. This is not real-extension or owner-hosted proof.
      keplr: {
        experimentalSuggestChain: async () => record("suggest"),
        enable: async () => record("enable"),
        getKey: async () => {
          await record("getKey");
          return { bech32Address: owner };
        },
        getOfflineSignerAuto: async () => {
          await record("getOfflineSignerAuto");
          throw Error("Mock signer must not be requested");
        },
        signAmino: async () => record("signAmino"),
        signDirect: async () => record("signDirect"),
        sendTx: async () => record("sendTx"),
      },
    });
  }, { owner: mockOwner });
  await context.route("https://testnet-**.zigchain.com/**", async (route) => {
    const url = route.request().url();
    const json = url.includes("node_info")
      ? {
          default_node_info: { network: "zig-test-2" },
          application_version: { version: "v5.0.0-patch-1" },
        }
      : url.includes("staking")
        ? { params: { bond_denom: "azig" } }
        : url.includes("denoms_metadata")
          ? {
              metadata: {
                base: "azig",
                display: "ZIG",
                denom_units: [{ denom: "ZIG", exponent: 18 }],
              },
            }
          : { balance: { denom: "azig", amount: "0" } };
    await route.fulfill({ json });
  });

  await page.goto("/app");
  await expect(page.locator(".mode-strip")).toContainText("LOCAL SIMULATION");
  await expect(
    page.getByRole("button", { name: "Connect Keplr", exact: true }),
  ).toBeVisible();
  expect(mockCalls).toEqual([]);

  await page.getByRole("button", { name: "Connect Keplr" }).click();
  await expect(page.locator(".mode-strip")).toContainText("CONNECTION ONLY");
  await expect.poll(() => mockCalls).toEqual(["suggest", "enable", "getKey"]);
  await expect(
    page.getByRole("button", { name: connectedLabel, exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), reconnectHintKey),
  ).toBe("true");

  const otherTab = await context.newPage();
  await otherTab.goto("/app");
  await expect(otherTab.locator(".mode-strip")).toContainText(
    "LOCAL SIMULATION",
  );
  await expect(
    otherTab.getByRole("button", { name: "Connect Keplr", exact: true }),
  ).toBeVisible();
  expect(mockCalls).toEqual(["suggest", "enable", "getKey"]);
  await otherTab.close();

  await page.reload();
  await expect(page.locator(".mode-strip")).toContainText("LOCAL SIMULATION");
  await expect(
    page.getByRole("button", { name: "Reconnect Keplr", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "Reloads intentionally start in Local demo",
  );
  expect(mockCalls).toEqual(["suggest", "enable", "getKey"]);

  await page.getByRole("button", { name: "Reconnect Keplr" }).click();
  await expect(page.locator(".mode-strip")).toContainText("CONNECTION ONLY");
  await expect.poll(() => mockCalls).toEqual([
    "suggest",
    "enable",
    "getKey",
    "suggest",
    "enable",
    "getKey",
  ]);
  await expect(
    page.getByRole("button", { name: connectedLabel, exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Local demo" }).click();
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), reconnectHintKey),
  ).toBeNull();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Connect Keplr", exact: true }),
  ).toBeVisible();
  expect(mockCalls).toEqual([
    "suggest",
    "enable",
    "getKey",
    "suggest",
    "enable",
    "getKey",
  ]);
});
