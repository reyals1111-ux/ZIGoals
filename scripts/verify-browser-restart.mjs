/** Run against a locally served app: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 node scripts/verify-browser-restart.mjs */
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const base = new URL(
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100",
);
if (
  !["http:", "https:"].includes(base.protocol) ||
  !["127.0.0.1", "localhost", "[::1]"].includes(base.hostname) ||
  base.username ||
  base.password ||
  base.pathname !== "/" ||
  base.search ||
  base.hash
) {
  throw Error(
    "PLAYWRIGHT_BASE_URL must be a local-only HTTP(S) origin without credentials or a path.",
  );
}
const request = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const { chromium, expect } = request("@playwright/test");
const { toBech32 } = request("@cosmjs/encoding");
const outputDirectory = mkdtempSync(join(tmpdir(), "zigoals-browser-restart-"));
const profile = join(outputDirectory, "isolated-profile");
const alice = toBech32("zig", new Uint8Array(20).fill(1));
const bob = toBech32("zig", new Uint8Array(20).fill(2));
const hash = "A".repeat(64);
const errors = [],
  broadcastRequests = [];
const activityUrl = new URL("/app/activity", base).href;

async function open() {
  const context = await chromium.launchPersistentContext(profile, {
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 900 },
    serviceWorkers: "block",
  });
  try {
    await context.route("**/*", async (route) => {
      const req = route.request();
      const url = req.url();
      if (
        /broadcast[_-]?tx|BroadcastTx|\/cosmos\/tx\/v1beta1\/txs/i.test(
          `${url} ${req.postData() ?? ""}`,
        )
      ) {
        broadcastRequests.push(url);
        return route.abort();
      }
      if (new URL(url).origin === base.origin) return route.continue();
      // All remote traffic is fulfilled locally or aborted; none reaches a chain.
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
          json: { balance: { denom: "azig", amount: "0" } },
        });
      return route.abort();
    });
    await context.addInitScript(
      ({ alice }) => {
        window.testSignerCalls = 0;
        window.keplr = {
          experimentalSuggestChain: async () => {},
          enable: async () => {},
          getKey: async () => ({
            bech32Address: localStorage.getItem("test-wallet") ?? alice,
          }),
          getOfflineSignerAuto: async () => {
            window.testSignerCalls++;
            throw Error("Recovery must not request a signer");
          },
        };
      },
      { alice },
    );
    const page = context.pages()[0] ?? (await context.newPage());
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(activityUrl);
    return { context, page };
  } catch (error) {
    await context.close();
    throw error;
  }
}
async function records(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("zigoals:transaction-journal", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise((resolve, reject) => {
        const request = db
          .transaction("operations")
          .objectStore("operations")
          .getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  });
}
async function expectBothWarnings(page) {
  // Wait for the network error first so the assertion cannot pass before the
  // reconciliation catch has had the opportunity to replace the corruption warning.
  await expect(
    page.getByRole("alert").filter({ hasText: "Failed to fetch" }),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "Unreadable or unsupported" }),
  ).toBeVisible();
}
function assertRetained(rows) {
  assert.equal(rows.length, 4);
  assert.deepEqual(
    rows.find((row) => row.operationId === "damaged"),
    {
      operationId: "damaged",
      version: 999,
      original: "retain these exact bytes",
    },
  );
  assert.equal(
    rows.find((row) => row.hash === hash).state,
    "UNKNOWN_AFTER_BROADCAST",
  );
}
async function verify() {
  let { context, page } = await open();
  try {
    await page.evaluate(
      async ({ alice, bob, hash }) => {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open("zigoals:transaction-journal", 1);
          request.onupgradeneeded = () =>
            request.result.createObjectStore("operations", {
              keyPath: "operationId",
            });
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        try {
          await new Promise((resolve, reject) => {
            const transaction = db.transaction("operations", "readwrite", {
              durability: "strict",
            });
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
            const store = transaction.objectStore("operations");
            store.put({
              ...base,
              operationId: "1c24a834-76f3-4b56-a152-77bce8f57fc6",
              wallet: alice,
            });
            store.put({
              ...base,
              operationId: "2c24a834-76f3-4b56-a152-77bce8f57fc6",
              wallet: bob,
            });
            store.put({
              ...base,
              operationId: "3c24a834-76f3-4b56-a152-77bce8f57fc6",
              wallet: alice,
              state: "UNKNOWN_AFTER_BROADCAST",
              hash,
            });
            store.put({
              operationId: "damaged",
              version: 999,
              original: "retain these exact bytes",
            });
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
          });
        } finally {
          db.close();
        }
      },
      { alice, bob, hash },
    );
    await page.getByRole("button", { name: "Connect Keplr" }).click();
    await expect(page.getByLabel("Testnet transaction outcomes")).toContainText(
      alice,
    );
    await expectBothWarnings(page);
    assert.equal(await page.evaluate(() => window.testSignerCalls), 0);
  } finally {
    await context.close();
  }

  // A persistent-context close terminates this Chrome process. Relaunch the
  // same dedicated profile to exercise durable storage beyond a page reload.
  ({ context, page } = await open());
  try {
    await page.getByRole("button", { name: "Connect Keplr" }).click();
    await expect(page.getByLabel("Testnet transaction outcomes")).toContainText(
      alice,
    );
    await expect(
      page.getByLabel("Testnet transaction outcomes"),
    ).not.toContainText(bob);
    await expect(
      page.getByLabel("Saved testnet transaction history"),
    ).toContainText(hash);
    await expectBothWarnings(page);
    assertRetained(await records(page));
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
    await expect(
      page.getByRole("alert").filter({ hasText: "Failed to fetch" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("alert").filter({ hasText: "Unreadable or unsupported" }),
    ).toBeVisible();
    assertRetained(await records(page));
    assert.equal(await page.evaluate(() => window.testSignerCalls), 0);
    assert.deepEqual(broadcastRequests, []);
    assert.deepEqual(errors, []);
    return {
      recordedAt: new Date().toISOString(),
      status: "passed",
      method:
        "Close entire persistent Chrome context, relaunch Chrome with same isolated profile, reconnect and switch wallet",
      appUrl: activityUrl,
      recordsRetained: 4,
      unknownHashRetained: true,
      corruptRecordPreserved: true,
      corruptionAndNetworkWarningsVisible: true,
      accountScopeVerified: true,
      signerCalls: 0,
      broadcastRequests: 0,
      pageErrors: errors,
      realKeplr: false,
      networkAndWallet: "mocked external boundaries; no live transaction",
    };
  } finally {
    await context.close();
  }
}
try {
  const result = await verify();
  const resultPath = join(outputDirectory, "result.json");
  writeFileSync(resultPath, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify({ ...result, resultPath }, null, 2));
} finally {
  // This directory was created above solely for this test; never a user profile.
  rmSync(profile, { recursive: true, force: true });
}
