import { test, expect } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { policyWindowNote, readPolicyWindow } from "./lib/market-policy-window.mjs";
// Session U Part 2d: the market policy period end in the deploy summary and the owner's verifier. Information only.
const now = Date.UTC(2026, 9, 20, 12);
const end = "2026-10-31T16:00:00.000Z", next = "2026-11-30T16:00:00.000Z";

test("the note: days left, a warning below 7 days or after the end, and 'not reported' for anything else", () => {
  expect(policyWindowNote(end, now)).toEqual({ text: "Market policy period ends 2026-10-31T16:00:00.000Z (11 days left).", warn: false });
  expect(policyWindowNote(end, Date.UTC(2026, 9, 24, 16))).toEqual({ text: "Market policy period ends 2026-10-31T16:00:00.000Z (7 days left).", warn: false });
  expect(policyWindowNote(end, Date.UTC(2026, 9, 24, 16, 1))).toMatchObject({ text: expect.stringContaining("(6 days left): fewer than 7 days, install the next period's policy"), warn: true });
  expect(policyWindowNote(end, Date.UTC(2026, 9, 31, 10, 30))).toMatchObject({ text: expect.stringContaining("(5 h left)"), warn: true });
  expect(policyWindowNote(end, Date.UTC(2026, 9, 31, 16))).toMatchObject({ text: expect.stringContaining("ENDED at 2026-10-31T16:00:00.000Z: every price is refused, cached ones too"), warn: true });
  for (const value of [null, undefined, "", "31 Oct 2026", "2026-10-31", 1793462400000, "2026-13-40T99:99:99Z"])
    expect(policyWindowNote(value, now)).toEqual({ text: "Market policy period end: not reported (an older coordinator, or none bound).", warn: false });
});

test("follow-up F2: with the next period installed, the countdown runs to its end; the hand-over itself is no warning", () => {
  expect(policyWindowNote(end, Date.UTC(2026, 9, 30, 12), next)).toEqual({ text: "Market policy period ends 2026-10-31T16:00:00.000Z; the next period is installed and takes over by itself, ending 2026-11-30T16:00:00.000Z (31 days left).", warn: false });
  expect(policyWindowNote(end, Date.UTC(2026, 10, 25, 12), next)).toMatchObject({ text: expect.stringContaining("(5 days left): fewer than 7 days, install the period after it"), warn: true });
  expect(policyWindowNote(end, Date.UTC(2026, 10, 30, 16), next)).toMatchObject({ text: expect.stringContaining("ENDED, every price is refused"), warn: true });
  // A next end that is not later than the current one, or not a date, is ignored.
  for (const value of [end, "2026-10-01T16:00:00.000Z", "30 Nov 2026", null]) expect(policyWindowNote(end, now, value)).toEqual(policyWindowNote(end, now));
});

test("the read: one GET without credentials; only an exact well-formed answer counts; it never throws", async () => {
  const calls = [];
  const answer = response => async (url, options) => { calls.push({ url, options }); return response(); };
  expect(await readPolicyWindow({ origin: "https://alpha.zigoals.app", fetcher: answer(() => Response.json({ version: 1, policyWindowEnd: end })) })).toEqual({ httpStatus: 200, policyWindowEnd: end, nextPolicyWindowEnd: null });
  // Follow-up F2: a next window installed in advance.
  expect(await readPolicyWindow({ origin: "https://alpha.zigoals.app", fetcher: answer(() => Response.json({ version: 1, policyWindowEnd: end, nextPolicyWindowEnd: next })) })).toEqual({ httpStatus: 200, policyWindowEnd: end, nextPolicyWindowEnd: next });
  expect(await readPolicyWindow({ origin: "https://alpha.zigoals.app", fetcher: answer(() => Response.json({ version: 1, policyWindowEnd: end, nextPolicyWindowEnd: null })) })).toEqual({ httpStatus: 200, policyWindowEnd: end, nextPolicyWindowEnd: null });
  expect(calls[0].url).toBe("https://alpha.zigoals.app/api/market-status");
  expect(calls[0].options).toMatchObject({ method: "GET", redirect: "manual" });
  expect(new Headers(calls[0].options.headers).has("authorization")).toBe(false);
  for (const response of [
    () => Response.json({ version: 1, policyWindowEnd: null }),
    () => Response.json({ version: 1, policyWindowEnd: end, extra: true }),
    () => Response.json({ version: 2, policyWindowEnd: end }),
    () => Response.json({ version: 1, policyWindowEnd: end, nextPolicyWindowEnd: "30 Nov 2026" }),
    () => Response.json([end]),
    () => new Response("<html>Not found</html>", { status: 404 }),
    () => Response.json({ version: 1, policyWindowEnd: end }, { status: 503 }),
    () => new Response("{", { status: 200 }),
    () => Response.json({ version: 1, policyWindowEnd: end, pad: "x".repeat(2000) }),
  ]) expect((await readPolicyWindow({ origin: "https://alpha.zigoals.app", fetcher: answer(response) })).policyWindowEnd).toBeNull();
  expect(await readPolicyWindow({ origin: "https://alpha.zigoals.app", fetcher: async () => { throw new TypeError("fetch failed"); } })).toEqual({ httpStatus: null, policyWindowEnd: null, nextPolicyWindowEnd: null });
});

test("the deployment summary prints the period end, a warning near it, and 'not reported' without a status row", async () => {
  const summary = async smoke => {
    const dir = await mkdtemp(join(tmpdir(), "alpha-summary-")), evidence = join(dir, "zigoals-alpha-evidence");
    await mkdir(evidence);
    await writeFile(join(evidence, "deployment.json"), JSON.stringify({ status: "VERIFIED", newVersionId: "00000000-0000-4000-8000-000000000001", rollbackVersionId: "00000000-0000-4000-8000-000000000002", observedLiveVersionId: "00000000-0000-4000-8000-000000000001", smoke }));
    const run = spawnSync(process.execPath, ["scripts/alpha-deploy.mjs", "summary"], { cwd: new URL("..", import.meta.url).pathname, encoding: "utf8", env: { PATH: process.env.PATH, RUNNER_TEMP: dir, EXPECTED_COMMIT: "a".repeat(40) } });
    expect(run.status).toBe(0);
    return run.stdout;
  };
  const far = new Date(Date.now() + 20 * 86400000).toISOString(), near = new Date(Date.now() + 3 * 86400000).toISOString();
  const market = { route: "/api/market-quotes", status: 200, market: "VERIFIED", pair: "VERIFIED_FRESH", failure: null };
  expect(await summary([{ route: "/api/market-status", status: 200, policyWindowEnd: far }, market])).toMatch(new RegExp(`- Market policy period ends ${far.replace(/[.]/g, "\\.")} \\((19|20) days left\\)\\.`));
  expect(await summary([{ route: "/api/market-status", status: 200, policyWindowEnd: near }, market])).toContain(`- **Warning:** Market policy period ends ${near}`);
  expect(await summary([{ route: "/api/market-status", status: 200, policyWindowEnd: near, nextPolicyWindowEnd: far }, market])).toMatch(new RegExp(`- Market policy period ends ${near.replace(/[.]/g, "\\.")}; the next period is installed and takes over by itself, ending ${far.replace(/[.]/g, "\\.")} \\((19|20) days left\\)\\.`));
  expect(await summary([market])).toContain("- Market policy period end: not reported (an older coordinator, or none bound).");
  expect(await summary(undefined)).toContain("- Market policy period end: not reported");
}, 30000);
