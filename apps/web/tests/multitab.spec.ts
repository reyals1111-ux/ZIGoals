import { toBech32 } from "@cosmjs/encoding";
import { test, expect, type Page } from "@playwright/test";
import { applyLocal, initialLedger } from "../lib/local-ledger";
const ledgerKey = "zigoals:local-ledger:v1";
const metadataKey = "zigoals:metadata:v1:local-simulation:local-demo-user";
async function seed(page: Page) {
  await page.goto("/app");
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), {
    key: ledgerKey,
    raw: JSON.stringify(
      applyLocal(initialLedger(), { kind: "create" }, new Date().toISOString()),
    ),
  });
  await page.goto("/app/goals/1");
}
async function openGoalModule(page: Page, id: string) {
  await page.locator(`#${id}`).evaluate((element) => {
    (element as HTMLDetailsElement).open = true;
  });
}
async function prepareFunds(page: Page, amount: string) {
  await openGoalModule(page, "local-simulation");
  await page.getByLabel("Amount in ZIG").fill(amount);
  await page.getByRole("button", { name: "Add funds", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Confirm simulation" }),
  ).toBeVisible();
}
async function recovery(page: Page, name: string) {
  await openGoalModule(page, "edit-goal");
  await page.getByRole("button", { name: "Edit private plan" }).click();
  await page.getByRole("button", { name: "Travel", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Private goal name").fill(name);
  await page.getByLabel("Target amount").fill("1200");
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("button", { name: "Save private plan" }),
  ).toBeVisible();
}
test("two tabs cancel stale funds review and retain both sequential deposits", async ({
  page,
  context,
}) => {
  await seed(page);
  const other = await context.newPage();
  await other.goto("/app/goals/1");
  await prepareFunds(page, "100");
  await prepareFunds(other, "50");
  await page.getByRole("button", { name: "Confirm simulation" }).click();
  await expect(
    other.getByRole("button", { name: "Confirm simulation" }),
  ).toHaveCount(0);
  await expect(other.locator("#local-simulation .goal-module-body > strong")).toHaveText("100 ZIG");
  await prepareFunds(other, "50");
  await other.getByRole("button", { name: "Confirm simulation" }).click();
  await expect(page.locator("#local-simulation .goal-module-body > strong")).toHaveText("150 ZIG");
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    ledgerKey,
  );
  expect(saved.goals[0].position_units).toBe("150000000000000000000");
  expect(
    saved.activity.map((event: { action: string }) => event.action),
  ).toEqual(["Added funds", "Added funds", "Goal created"]);
});
test("another tab's recovered plan rejects a stale recovery save", async ({
  page,
  context,
}) => {
  await seed(page);
  const other = await context.newPage();
  await other.goto("/app/goals/1");
  await recovery(page, "Tab A plan");
  await recovery(other, "Tab B stale plan");
  await page.getByRole("button", { name: "Save private plan" }).click();
  await expect(
    other.getByRole("heading", { name: "Tab A plan", exact: true }),
  ).toBeVisible();

  // Tab B was opened against older metadata.
  // It may remain visible, but its stale write must be rejected.
  await other.getByRole("button", { name: "Save private plan" }).click();

  // Safety invariant: the stale tab must never overwrite Tab A's newer plan.
  await expect
    .poll(async () =>
      other.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).goals["1"].name,
        metadataKey,
      ),
    )
    .toBe("Tab A plan");

  const saved = await other.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    metadataKey,
  );
  expect(saved.goals["1"].name).toBe("Tab A plan");
});
test("mode selection stays in its own tab while local reviews stay local", async ({
  page,
  context,
}) => {
  await seed(page);
  const other = await context.newPage();
  await other.goto("/app/goals/1");
  await prepareFunds(other, "50");
  await page.getByRole("button", { name: "Connect Keplr" }).click();
  await expect(page.locator(".mode-strip")).toContainText("KEPLR TESTNET");
  await expect(other.locator(".mode-strip")).toContainText("LOCAL SIMULATION");
  await expect(
    other.getByRole("button", { name: "Confirm simulation" }),
  ).toBeVisible();
  await expect(page.locator(".mode-strip")).toContainText("Mode: this tab");
  await expect(other.locator(".mode-strip")).toContainText("Mode: this tab");
});
test("two tabs share only the active wallet's journal notifications and retain future rows", async ({
  page,
  context,
}) => {
  const alice = toBech32("zig", new Uint8Array(20).fill(1));
  // Inject an inert wallet adapter: no signer or chain mutation is available.
  await context.route("https://**/*", async (route) => {
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
        json: { balance: { denom: "azig", amount: "1000000000000000000" } },
      });
    return route.abort();
  });
  await context.addInitScript(
    ({ alice }) => {
      Object.assign(window, {
        keplr: {
          experimentalSuggestChain: async () => {},
          enable: async () => {},
          getKey: async () => ({ bech32Address: alice }),
          getOfflineSignerAuto: async () => {
            throw Error("No signing in journal recovery test");
          },
        },
      });
    },
    { alice },
  );
  await page.goto("/app/activity");
  const other = await context.newPage();
  await other.goto("/app/activity");
  await page.getByRole("button", { name: "Connect Keplr" }).click();
  await expect(page.locator(".mode-strip")).toContainText("connected");
  await other.evaluate(
    async ({ alice }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open("zigoals:transaction-journal", 1);
        r.onupgradeneeded = () =>
          r.result.createObjectStore("operations", { keyPath: "operationId" });
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
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
      tx.objectStore("operations").add({
        ...base,
        operationId: crypto.randomUUID(),
        wallet: alice,
      });
      tx.objectStore("operations").add({
        ...base,
        operationId: crypto.randomUUID(),
        wallet: "unrelated-wallet",
      });
      tx.objectStore("operations").add({
        operationId: "future",
        version: 999,
        original: "keep these bytes",
      });
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
      const channel = new BroadcastChannel("zigoals:transaction-journal");
      channel.postMessage({
        chainId: "zig-test-2",
        wallet: alice,
        contract: "zig1contract",
        source: "other-tab",
      });
      channel.close();
    },
    { alice },
  );
  await expect(
    page.getByLabel("Saved testnet transaction history"),
  ).toContainText("No broadcast is recorded");
  await expect(page.getByLabel("Testnet transaction outcomes")).toContainText(
    alice,
  );
  await expect(
    page.getByLabel("Testnet transaction outcomes"),
  ).not.toContainText("unrelated-wallet");
  await expect(
    page.getByRole("alert").filter({ hasText: "Unreadable or unsupported" }),
  ).toBeVisible();
  await expect(other.locator(".mode-strip")).toContainText("LOCAL SIMULATION");
  await expect(other.getByLabel("Testnet transaction outcomes")).toHaveCount(0);
  expect(
    await other.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const r = indexedDB.open("zigoals:transaction-journal", 1);
        r.onsuccess = () => resolve(r.result);
      });
      const value = await new Promise((resolve) => {
        const r = db
          .transaction("operations")
          .objectStore("operations")
          .get("future");
        r.onsuccess = () => resolve(r.result);
      });
      db.close();
      return value;
    }),
  ).toEqual({
    operationId: "future",
    version: 999,
    original: "keep these bytes",
  });
});
test("simultaneous confirmations serialize and the losing tab must review again", async ({
  page,
  context,
}) => {
  await seed(page);
  const other = await context.newPage();
  await other.goto("/app/goals/1");
  await prepareFunds(page, "100");
  await prepareFunds(other, "50");
  // Dispatch both clicks in page tasks, before either UI receives the other's event.
  const buttons = await Promise.all(
    [page, other].map((tab) =>
      tab.getByRole("button", { name: "Confirm simulation" }).elementHandle(),
    ),
  );
  await Promise.all(
    buttons.map((button) =>
      button!.evaluate((element) => (element as HTMLButtonElement).click()),
    ),
  );
  await expect
    .poll(async () =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).activity.length,
        ledgerKey,
      ),
    )
    .toBe(2);
  const amount = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).goals[0].position_units,
    ledgerKey,
  );
  expect(["100000000000000000000", "50000000000000000000"]).toContain(amount);
  await expect(
    page.getByRole("button", { name: "Confirm simulation" }),
  ).toHaveCount(0);
  await expect(
    other.getByRole("button", { name: "Confirm simulation" }),
  ).toHaveCount(0);
  await prepareFunds(other, amount === "100000000000000000000" ? "50" : "100");
  await other.getByRole("button", { name: "Confirm simulation" }).click();
  await expect(page.locator("#local-simulation .goal-module-body > strong")).toHaveText("150 ZIG");
});
