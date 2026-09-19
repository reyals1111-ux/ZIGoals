import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createHabit, emptyHabitData, HABITS_KEY } from "../lib/habits";
import { createEmptyHealth, HEALTH_STORAGE_KEY, saveFood } from "../lib/health";
import { applyLocal, initialLedger } from "../lib/local-ledger";
const metadataKey = "zigoals:metadata:v1:local-simulation:local-demo-user";
const ledgerKey = "zigoals:local-ledger:v1";
const at = new Date("2026-09-15T10:00:00Z");
const goalPlan = { schemaVersion: 1, chainId: "local-simulation", walletAddress: "local-demo-user", goals: { "1": { name: "My existing V1 plan", category: "Travel", currency: "ZIG", targetValue: "1200", targetDate: "2027-09-15", startingAmount: "0", monthlyContribution: "100", riskPreference: "Conservative", liquidityPreference: "Anytime", deadlineFlexible: false, notes: "Existing private note" } } };
const ledger = applyLocal(initialLedger(), { kind: "create" }, at.toISOString());
const linkedHabit = createHabit(emptyHabitData(), { title: "Weekly plan review", category: "Finance", description: "", notes: "", schedule: { kind: "daily" }, target: 1, goalLink: { chainId: "local-simulation", owner: "local-demo-user", goalId: "1" } }, at, "17cb8179-fac9-4b0d-ade8-77c72195da29");
test.use({ timezoneId: "Europe/Brussels" });
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: at });
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
});
async function openGoalModule(page: Page, id: string) {
  await page.locator(`#${id}`).evaluate((element) => {
    (element as HTMLDetailsElement).open = true;
  });
}
async function restore(page: Page, name: "Habits" | "Health", raw: string) {
  const panel = page.getByRole("region", { name: `${name} backup`, exact: true });
  await panel.getByText(`Restore ${name} from a file`, { exact: true }).click();
  await panel.getByLabel(`Choose ${name} backup`).setInputFiles({ name: "private.json", mimeType: "application/json", buffer: Buffer.from(raw) });
  await expect(panel.getByText(/Valid supported backup/)).toBeVisible();
  await expect(panel.getByRole("button", { name: `Restore ${name}`, exact: true })).toBeDisabled();
  await panel.getByLabel(`Replace my ${name.toLowerCase()} with this backup.`).check();
  await panel.getByRole("button", { name: `Restore ${name}`, exact: true }).click();
  return panel;
}
test("V1 upgrade, explicit module restore and linked Goal reload preserve all prior namespaces", async ({ page }) => {
  await page.addInitScript(({ metadataKey, ledgerKey, metadata, ledger }) => {
    if (!localStorage.getItem(ledgerKey)) {
      localStorage.setItem(metadataKey, metadata); localStorage.setItem(ledgerKey, ledger);
      sessionStorage.setItem("zigoals:wallet-reconnect-hint:v1", "owner-fixture-hint");
    }
  }, { metadataKey, ledgerKey, metadata: JSON.stringify(goalPlan), ledger: JSON.stringify(ledger) });
  await page.goto("/app/settings");
  expect(await page.evaluate(keys => keys.map(key => localStorage.getItem(key)), [HABITS_KEY, HEALTH_STORAGE_KEY])).toEqual([null, null]);
  const panel = await restore(page, "Habits", JSON.stringify(linkedHabit));
  await expect(panel.getByRole("status")).toContainText("Habits restored");
  await page.goto("/app/goals/1");
  await expect(page.getByRole("heading", { name: "My existing V1 plan", exact: true })).toBeVisible();
  await openGoalModule(page, "supporting-habits");
  await expect(page.getByRole("region", { name: "Habits supporting this Goal" })).toContainText("Weekly plan review");
  await page.reload();
  await openGoalModule(page, "supporting-habits");
  await expect(page.getByRole("region", { name: "Habits supporting this Goal" })).toContainText("Weekly plan review");
  expect(await page.evaluate(keys => keys.map(key => localStorage.getItem(key)), [metadataKey, ledgerKey])).toEqual([JSON.stringify(goalPlan), JSON.stringify(ledger)]);
  expect(await page.evaluate(() => sessionStorage.getItem("zigoals:wallet-reconnect-hint:v1"))).toBe("owner-fixture-hint");
});
test("damaged private exports retain exact bytes and explicit restore quarantines originals", async ({ page }) => {
  const damaged = "  { damaged HEALTH_PRIVATE_RESTORE\n";
  await page.goto("/app/settings");
  await page.evaluate(({ key, damaged }) => localStorage.setItem(key, damaged), { key: HEALTH_STORAGE_KEY, damaged });
  await page.reload();
  const panel = page.getByRole("region", { name: "Health backup", exact: true });
  const download = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Export Health", exact: true }).click();
  expect(await readFile((await (await download).path())!, "utf8")).toBe(damaged);
  await restore(page, "Health", JSON.stringify(createEmptyHealth()));
  await expect(panel.getByRole("status")).toContainText("Health restored");
  expect(await page.evaluate(key => Object.keys(localStorage).filter(k => k.startsWith(`${key}:recovery:`)).map(k => localStorage.getItem(k)), HEALTH_STORAGE_KEY)).toEqual([damaged]);
  const future = JSON.stringify({ ...createEmptyHealth(), schemaVersion: 2 });
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: HEALTH_STORAGE_KEY, raw: future });
  await page.reload();
  await restore(page, "Health", JSON.stringify(createEmptyHealth()));
  await expect(panel.getByRole("alert")).toContainText("A newer stored version cannot be replaced");
  expect(await page.evaluate(key => localStorage.getItem(key), HEALTH_STORAGE_KEY)).toBe(future);
});
test("private Habit and Health sentinel values stay outside requests, headers, logs and wallet calls", async ({ page }) => {
  const sentinel = "RUN7_PRIVATE_f9840d";
  const requests: Promise<string>[] = [], messages: string[] = [], errors: string[] = [], walletCalls: string[] = [];
  await page.exposeFunction("__recordPrivateWalletCall", (method: string) => walletCalls.push(method));
  page.on("request", request => requests.push(request.allHeaders().then(headers => JSON.stringify({ url: request.url(), body: request.postData(), headers }))));
  page.on("console", message => messages.push(message.text())); page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.assign(window, { keplr: Object.fromEntries(["enable", "getKey", "getOfflineSignerAuto", "signAmino", "signDirect", "sendTx"].map(name => [name, () => { Reflect.get(window, "__recordPrivateWalletCall")(name); throw Error("Unexpected wallet call"); }])) });
  });
  await page.goto("/app/settings");
  const habitData = createHabit(emptyHabitData(), { title: `${sentinel}_habit`, notes: `${sentinel}_note`, category: "Wellbeing", description: `${sentinel}_description`, schedule: { kind: "daily" }, target: 1 }, at, "baa9296b-4551-4471-84da-e2953abdc275");
  const healthData = saveFood(createEmptyHealth(), { id: "health_f9840d00-a001-4000-9000-f9840d00a001", name: `${sentinel}_food`, brand: `${sentinel}_brand`, servingGrams: 100, nutrients: { kcal: 173, proteinMg: 17003, carbsMg: 27301, fatMg: 5301 }, createdAt: at.toISOString(), updatedAt: at.toISOString() });
  await expect((await restore(page, "Habits", JSON.stringify(habitData))).getByRole("status")).toContainText("Habits restored");
  await expect((await restore(page, "Health", JSON.stringify(healthData))).getByRole("status")).toContainText("Health restored");
  await page.goto("/app/habits");
  await page.getByRole("button", { name: `Complete ${sentinel}_habit`, exact: true }).click();
  await expect(page.getByRole("button", { name: `Undo completion for ${sentinel}_habit` })).toBeVisible();
  await page.goto("/app/health");
  await page.getByRole("combobox", { name: "Food or recipe", exact: true }).selectOption(healthData.foods[0]!.id);
  await page.getByRole("button", { name: "Log to diary", exact: true }).click();
  await expect(page.getByRole("region", { name: "Breakfast diary" })).toContainText(`${sentinel}_food`);
  for (const route of ["/app", "/app/activity", "/app/goals", "/app/settings", "/app/ecosystem", "/app/health"]) {
    await page.goto(route); await expect(page.locator("main")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.reload(); await page.waitForLoadState("networkidle");
  await expect(page.getByRole("region", { name: "Breakfast diary" })).toContainText(`${sentinel}_food`);
  const records: string[] = []; let seen = 0;
  while (seen < requests.length) { const batch = requests.slice(seen); seen += batch.length; records.push(...await Promise.all(batch)); }
  expect(records.length).toBeGreaterThan(0);
  expect(records.join("\n")).not.toContain(sentinel);
  expect(messages.join("\n")).not.toContain(sentinel);
  expect(errors).toEqual([]);
  expect(walletCalls).toEqual([]);
});
