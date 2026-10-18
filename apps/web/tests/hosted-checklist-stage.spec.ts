import {expect, test} from '@playwright/test';
import {CHECKLIST_STAGE} from '../../../scripts/lib/hosted-alpha-checklist.mjs';

/**
 * Session AF (L3; ADR-028 H57): the hosted verifier's stage 10 runs here, on this build, through the very module the
 * owner's live check uses (scripts/lib/hosted-alpha-checklist.mjs), so a change to Habits, the star or the Checklist that
 * would break the live check fails on the pull request. Desktop only (the live check runs a 1280 × 900 browser);
 * browser-local data only; every request stays on the base and is a GET or the app's own same-origin page traffic.
 */
test('stage 10: a fictional favourite habit ticks its own record on the Checklist, and Undo restores it', async ({page, baseURL}, info) => {
  test.skip(info.project.name !== 'desktop', 'The live check runs a desktop browser');
  test.setTimeout(90_000);
  const errors: string[] = [], foreign: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (!r.url().startsWith(baseURL!) && !/^(data|blob):/.test(r.url())) foreign.push(r.url()); });
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  await page.setViewportSize({width: 1280, height: 900});
  const report: Record<string, unknown> = {};
  await CHECKLIST_STAGE.run(page, {base: baseURL!, expect, report});
  expect(report.checklist).toEqual({habit: 'fictional sentinel', ticked: true, undone: true});
  expect(foreign).toEqual([]);
  expect(errors).toEqual([]);
});
