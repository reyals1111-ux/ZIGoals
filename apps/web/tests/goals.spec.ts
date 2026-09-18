import { test, expect } from "@playwright/test";
import { applyLocal, initialLedger } from "../lib/local-ledger";
const metadataKey = "zigoals:metadata:v1:local-simulation:local-demo-user";
const ledgerKey = "zigoals:local-ledger:v1";
const recoveryPlan = {
  schemaVersion: 1,
  chainId: "local-simulation",
  walletAddress: "local-demo-user",
  goals: {
    "1": {
      name: "Recovered trip",
      category: "Travel",
      targetValue: "1200",
      currency: "ZIG",
      targetDate: "2027-09-13",
      startingAmount: "0",
      monthlyContribution: "10",
      riskPreference: "Conservative",
      liquidityPreference: "Anytime",
      deadlineFlexible: false,
      notes: "",
    },
  },
};
const recoveryLedger = applyLocal(
  initialLedger(),
  { kind: "create" },
  "2026-09-13T01:00:00.000Z",
);

test("corrupt metadata recovery preserves the original bytes and restores the plan", async ({
  page,
}) => {
  const damaged = "  { damaged private plans\n";
  await page.addInitScript(
    ({ metadataKey, ledgerKey, ledger, damaged }) => {
      if (!localStorage.getItem(ledgerKey)) {
        localStorage.setItem(ledgerKey, ledger);
        localStorage.setItem(metadataKey, damaged);
      }
    },
    { metadataKey, ledgerKey, ledger: JSON.stringify(recoveryLedger), damaged },
  );
  await page.goto("/app/goals/1");
  await expect(
    page.getByRole("heading", { name: "Goal #1", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page
    .getByLabel("Or paste backup JSON")
    .fill(JSON.stringify(recoveryPlan));
  await page.getByRole("button", { name: "Import backup" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "preserved" }),
  ).toBeVisible();
  const saved = await page.evaluate((key) => {
    const quarantine = Object.keys(localStorage).find((candidate) =>
      candidate.startsWith(`${key}:quarantine:`),
    );
    return {
      active: localStorage.getItem(key),
      previous: quarantine ? localStorage.getItem(quarantine) : null,
    };
  }, metadataKey);
  expect(saved.previous).toBe(damaged);
  expect(JSON.parse(saved.active!)).toEqual(recoveryPlan);
  await page.goto("/app/goals/1");
  await expect(
    page.getByRole("heading", { name: "Recovered trip", exact: true }),
  ).toBeVisible();
});

test("damaged local funds keep the shell usable and block simulation instead of resetting funds", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const damaged = JSON.stringify({
    ...recoveryLedger,
    goals: [{ ...recoveryLedger.goals[0], position_units: "broken" }],
  });
  await page.addInitScript(
    ({ metadataKey, ledgerKey, ledger, metadata }) => {
      localStorage.setItem(ledgerKey, ledger);
      localStorage.setItem(metadataKey, metadata);
    },
    {
      metadataKey,
      ledgerKey,
      ledger: damaged,
      metadata: JSON.stringify(recoveryPlan),
    },
  );
  await page.goto("/app");
  await expect(
    page.getByRole("alert").filter({ hasText: "Local demo data is damaged" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Connect Keplr" }),
  ).toBeEnabled();
  await expect(page.locator(".wallet-balance")).toContainText("0 ZIG");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your data. Your control." }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Goal Data" }).click();
  expect((await download).suggestedFilename()).toContain("local-simulation");
  await page.goto("/app/goals/new");
  await page.getByLabel("Category / artwork").selectOption("Travel");
  await page.getByLabel("Goal name", {exact:true}).fill("Blocked demo creation");
  await page.getByLabel("Target amount").fill("1200");
  await page.getByRole("button", {name:"Continue"}).click();
  await page.getByLabel("ZIGoals funding / Local simulation", {exact:true}).check();
  for (let step = 0; step < 2; step++)
    await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("button", { name: "Create goal", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), ledgerKey),
  ).toBe(damaged);
  expect(errors).toEqual([]);
});

test("invalid custom scenario preserves baseline funding health and progress", async ({
  page,
}) => {
  await page.addInitScript(
    ({ metadataKey, ledgerKey, ledger, metadata }) => {
      localStorage.setItem(ledgerKey, ledger);
      localStorage.setItem(metadataKey, metadata);
    },
    {
      metadataKey,
      ledgerKey,
      ledger: JSON.stringify(recoveryLedger),
      metadata: JSON.stringify(recoveryPlan),
    },
  );
  await page.goto("/app/goals/1");
  const health = page.getByRole("heading", {
    name: "Funding health · 0% future return",
  });
  await expect(health).toBeVisible();
  await page.getByRole("combobox").selectOption("custom");
  await page.getByLabel("Custom annual return (%)").fill("");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Choose a valid illustrative annual return" }),
  ).toBeVisible();
  await expect(health).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Recovered trip progress" }),
  ).toBeVisible();
  await expect(
    page.getByText("Required monthly at 0%", { exact: true }),
  ).toBeVisible();
});
test("unsupported saved planning date reports a calculation error without crashing the goal", async ({
  page,
}) => {
  const metadata = {
    ...recoveryPlan,
    goals: { "1": { ...recoveryPlan.goals["1"], targetDate: "2200-01-01" } },
  };
  await page.addInitScript(
    ({ metadataKey, ledgerKey, ledger, metadata }) => {
      localStorage.setItem(ledgerKey, ledger);
      localStorage.setItem(metadataKey, metadata);
    },
    {
      metadataKey,
      ledgerKey,
      ledger: JSON.stringify(recoveryLedger),
      metadata: JSON.stringify(metadata),
    },
  );
  await page.goto("/app/goals/1");
  await expect(
    page.getByRole("heading", { name: "Recovered trip", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "supported planning limits" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add funds", exact: true }),
  ).toBeEnabled();
});
test("near-limit Unicode plans export a valid importable backup", async ({
  page,
}) => {
  const goal = { ...recoveryPlan.goals["1"], notes: "旅".repeat(500) };
  const goals: Record<string, typeof goal> = {};
  for (let index = 1; index <= 550; index++) goals[String(index)] = goal;
  const raw = JSON.stringify({ ...recoveryPlan, goals });
  expect(Buffer.byteLength(raw, "utf8")).toBeLessThan(1000000);
  expect(
    Buffer.byteLength(JSON.stringify(JSON.parse(raw), null, 2), "utf8"),
  ).toBeGreaterThan(1000000);
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
    key: metadataKey,
    raw,
  });
  await page.goto("/app/settings");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Goal Data" }).click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const exported = Buffer.concat(chunks);
  expect(exported.length).toBeLessThanOrEqual(1000000);
  expect(JSON.parse(exported.toString("utf8"))).toEqual(JSON.parse(raw));
});
test("local goal lifecycle, metadata recovery, exports and mobile layout", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Turn today’s ZIG into tomorrow’s you." }),
  ).toBeVisible();
  await expect(page.locator(".mode-strip")).toContainText("LOCAL SIMULATION");
  await page.getByRole("link", { name: "Plan my first goal" }).click();
  await page.getByLabel("Category / artwork").selectOption("Travel");
  await page.getByLabel("Goal name", {exact:true}).fill("Kyoto in spring");
  await page.getByLabel("Target amount").fill("1200");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("ZIGoals funding / Local simulation", {exact:true}).check();
  await page.getByLabel("Planned starting amount").fill("100");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create goal", exact: true }).click();
  await page.getByRole("button", { name: "Confirm simulation" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Confirm simulation" }).click();
  await expect(
    page.getByRole("heading", { name: "Kyoto in spring" }),
  ).toBeVisible();
  await expect(
    page.getByText("No starting funds have been deposited.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Amount in ZIG").fill("100");
  await page.getByRole("button", { name: "Add funds", exact: true }).click();
  await page.getByRole("button", { name: "Confirm simulation" }).click();
  await expect(
    page.getByText("100 ZIG", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "All goals" }).click();
  await expect(
    page.getByRole("heading", { name: "Kyoto in spring" }),
  ).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Kyoto in spring progress" })).toHaveAttribute("aria-valuenow", /^8\.333/);
  await page.screenshot({
    path: `/tmp/zigoals-${testInfo.project.name}-dashboard.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Goal Data" }).click();
  expect((await download).suggestedFilename()).toContain("local-simulation");
  const backup = await page.evaluate(() =>
    localStorage.getItem(
      "zigoals:metadata:v1:local-simulation:local-demo-user",
    )!,
  );
  await page.evaluate(() =>
    localStorage.removeItem(
      "zigoals:metadata:v1:local-simulation:local-demo-user",
    ),
  );
  await page.goto("/app/goals/1");
  await expect(
    page.getByRole("heading", { name: "Goal #1", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Amount in ZIG").fill("100");
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  await page.getByRole("button", { name: "Confirm simulation" }).click();
  await expect(
    page.getByRole("button", { name: "Close empty goal" }),
  ).toBeEnabled();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Or paste backup JSON").fill(backup);
  await page.getByRole("button", { name: "Import backup" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Goal plans imported" }),
  ).toBeVisible();
  await page.goto("/app/goals/1");
  await expect(
    page.getByRole("heading", { name: "Kyoto in spring" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close empty goal" }).click();
  await page.getByRole("button", { name: "Confirm simulation" }).click();
  await expect(
    page.getByRole("button", { name: "Add funds", exact: true }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});
test("missing wallet is explicit and local mode remains available", async ({
  page,
}) => {
  await page.goto("/app");
  await page.getByRole("button", { name: "Connect Keplr" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Install the Keplr" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Local demo" }).click();
  await expect(page.locator(".mode-strip")).toContainText("LOCAL SIMULATION");
});
