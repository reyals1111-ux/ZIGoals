import { expect, test } from "@playwright/test";
import { toBech32 } from "@cosmjs/encoding";
const alice = toBech32("zig", new Uint8Array(20).fill(1));
const bob = toBech32("zig", new Uint8Array(20).fill(2));
const operationId = "1c24a834-76f3-4b56-a152-77bce8f57fc6";
test("restart preserves scoped journal and damaged rows without replay", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://**/*", async (route) => {
    const url = route.request().url();
    if (url.includes("node_info"))
      return route.fulfill({
        json: { default_node_info: { network: "zig-test-2" } },
      });
    if (url.includes("staking"))
      return route.fulfill({ json: { params: { bond_denom: "azig" } } });
    if (url.includes("denoms_metadata"))
      return route.fulfill({
        json: {
          metadata: {
            base: "azig",
            display: "ZIG",
            denom_units: [{ denom: "ZIG", exponent: 18 }],
          },
        },
      });
    if (url.includes("balances"))
      return route.fulfill({
        json: { balance: { denom: "azig", amount: "1230000000000000000" } },
      });
    return route.abort();
  });
  await page.addInitScript(
    ({ alice }) => {
      Object.assign(window, {
        keplr: {
          experimentalSuggestChain: async () => {},
          enable: async () => {},
          getKey: async () => ({
            bech32Address: localStorage.getItem("test-wallet") ?? alice,
          }),
          getOfflineSignerAuto: async () => {
            throw Error("Recovery must never request a signer");
          },
        },
      });
    },
    { alice },
  );
  await page.goto("/app/activity");
  await page.evaluate(
    async ({ alice, bob, operationId }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("zigoals:transaction-journal", 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("operations", {
            keyPath: "operationId",
          });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("operations", "readwrite");
        const base = {
          version: 1,
          chainId: "zig-test-2",
          contract: "zig1contract",
          action: "create",
          amount: "0",
          denom: "azig",
          state: "AWAITING_SIGNATURE",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        tx.objectStore("operations").put({
          ...base,
          operationId,
          wallet: alice,
        });
        tx.objectStore("operations").put({
          ...base,
          operationId: "2c24a834-76f3-4b56-a152-77bce8f57fc6",
          wallet: bob,
        });
        tx.objectStore("operations").put({
          operationId: "damaged",
          version: 999,
          original: "retain these exact bytes",
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { alice, bob, operationId },
  );
  await page.getByRole("button", { name: "Connect Keplr" }).click();
  await expect(page.getByLabel("Testnet transaction outcomes")).toContainText(
    alice,
  );
  await expect(
    page.getByLabel("Testnet transaction outcomes"),
  ).not.toContainText(bob);
  await expect(
    page.getByRole("alert").filter({ hasText: "Unreadable or unsupported" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Saved testnet transaction history"),
  ).toContainText("No broadcast is recorded");
  await expect(
    page.getByText("TESTNET_CHAIN · Known local receipts only · Incomplete"),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Connect Keplr" }).click();
  await expect(page.getByLabel("Testnet transaction outcomes")).toContainText(
    alice,
  );
  await page.evaluate((bob) => {
    localStorage.setItem("test-wallet", bob);
    window.dispatchEvent(new Event("keplr_keystorechange"));
  }, bob);
  await page.getByRole("button", { name: "Connect Keplr" }).click();
  await expect(page.getByLabel("Testnet transaction outcomes")).toContainText(
    bob,
  );
  await expect(
    page.getByLabel("Testnet transaction outcomes"),
  ).not.toContainText(alice);
  const damaged = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open("zigoals:transaction-journal", 1);
      request.onsuccess = () => resolve(request.result);
    });
    const value = await new Promise<unknown>((resolve) => {
      const request = db
        .transaction("operations")
        .objectStore("operations")
        .get("damaged");
      request.onsuccess = () => resolve(request.result);
    });
    db.close();
    return value;
  });
  expect(damaged).toEqual({
    operationId: "damaged",
    version: 999,
    original: "retain these exact bytes",
  });
  expect(errors).toEqual([]);
});
