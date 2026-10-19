import {expect, test} from '@playwright/test';
import {EARN_STAGE} from '../../../scripts/lib/hosted-alpha-earn.mjs';
import {earnRoutes} from './earn-fixtures';

/**
 * Session AF chunk 2 (L1; ADR-028 H57): the hosted verifier's stage 9 runs here, on this build, through the very module
 * the owner's live check uses (scripts/lib/hosted-alpha-earn.mjs), so a change to the Earn page that would break the live
 * check fails on the pull request. Desktop only (the live check runs a 1280 × 900 browser). Once with every source
 * answering (the recorded fixtures) and once with every source down (each figure must then say "unavailable" with a
 * reason); every request stays on the base and is a GET.
 */
test.beforeEach(async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'The live check runs a desktop browser');
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  await page.setViewportSize({width: 1280, height: 900});
});

test('stage 9 with every source answering: each figure with its source and as-of', async ({page, baseURL}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await earnRoutes(page);
  const report: Record<string, unknown> = {};
  await EARN_STAGE.run(page, {base: new URL(baseURL!).origin, expect, report});
  expect(report.earn).toMatchObject({links: expect.any(Number), figures: expect.any(Number)});
  expect((report.earn as {shown: number}).shown).toBeGreaterThan(20);
  expect(errors).toEqual([]);
});

test('stage 9 with every source down: each figure says "unavailable" with a reason', async ({page, baseURL}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  const report: Record<string, unknown> = {};
  await EARN_STAGE.run(page, {base: new URL(baseURL!).origin, expect, report});
  const earn = report.earn as {shown: number; unavailable: string[]};
  expect(earn.shown).toBe(0);
  expect(earn.unavailable.length).toBeGreaterThan(20);
  expect(earn.unavailable.every(u => /:[A-Z_]+$/.test(u))).toBe(true);
  expect(errors).toEqual([]);
});
