import {expect, test} from '@playwright/test';
import {REVIEWED_TESTNET_VERSIONS} from '@zigoals/chain-config';
import {LIVE_ORIGINS, VERIFIER_STAGES, type StageContext, type StageReport} from '../../../scripts/lib/hosted-alpha-stages.mjs';

/**
 * Session AE (Part 0b, ADR-027): the owner's run of scripts/verify-hosted-alpha.mjs on Alpha #43 (2026-10-17) failed at
 * stage 3. Since Session AC stage 2 ends on Settings, and the goal steps begin with Today's "+ Quick add";
 * hosted-alpha-goal-stage.spec.ts runs those steps from its own `page.goto('/app')`, so it could not see that. This spec
 * runs the verifier's local stages, 2 → 6 and then Earn's 9 and the Checklist's 10 (Session AF), through its own exported list (scripts/lib/hosted-alpha-stages.mjs), in that
 * order, on one page, against this build: a stage that leaves the page where the next cannot start fails here. Stage 1's
 * live price and header samples, stage 7's live landing and stage 8's recipe route (Node's fetch, outside the page) are
 * not browser steps on this build. Desktop only, like the live check (1280 × 900, reduced motion). As in the goal-stage
 * spec: browser-local data only, the app's own /api routes answered 503 and the Testnet reads of "Check connection"
 * answered here with a reviewed version.
 */
test('the verifier\'s local stages run in its own order on one page: identity, goal, backup and diagnostics, reload and close, AA pages, Earn, Checklist', async ({page, baseURL}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'The live check runs a desktop browser');
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route('https://testnet-**.zigchain.com/**', async route => {
    const url = route.request().url();
    expect(route.request().method()).toBe('GET');
    const json = url.endsWith('/status') ? {result: {node_info: {network: 'zig-test-2'}, sync_info: {catching_up: false, latest_block_height: '77', latest_block_time: new Date().toISOString()}}}
      : url.includes('node_info') ? {default_node_info: {network: 'zig-test-2'}, application_version: {version: 'v5.1.0'}}
      : url.includes('staking') ? {params: {bond_denom: 'azig'}} : url.includes('balances') ? {balance: {denom: 'azig', amount: '0'}}
      : {metadata: {base: 'azig', display: 'ZIG', denom_units: [{denom: 'ZIG', exponent: 18}]}};
    await route.fulfill({json});
  });
  await page.setViewportSize({width: 1280, height: 900});
  await page.emulateMedia({reducedMotion: 'reduce'});
  const report: StageReport = {stages: [], review: [], layouts: [], responses: [], builds: []};
  const ctx: StageContext = {base: new URL(baseURL!).origin, live: false, origins: LIVE_ORIGINS, expectedCommit: null, expect, report, reviewedVersions: REVIEWED_TESTNET_VERSIONS};
  // Session AF (ADR-028 H57): every local browser stage, the appended Earn (9) and Checklist (10) stages included, after the others.
  const local = VERIFIER_STAGES.filter(stage => stage.browser && !stage.liveOnly);
  expect(local.map(stage => stage.number)).toEqual([2, 3, 4, 5, 6, 9, 10]);
  for (const stage of local) {
    expect(stage.browser && !stage.liveOnly, stage.name).toBe(true);
    await test.step(`${stage.number}. ${stage.name}`, () => stage.run(page, ctx));
    report.stages.push({name: stage.name, status: 'PASS'});
  }
  expect(report.stages.map(stage => stage.name)).toEqual(local.map(stage => stage.name));
  // What the live run would report as findings: sideways scroll at 320–1280 on any page the stages measured.
  expect(report.layouts.filter(layout => !layout.pass)).toEqual([]);
  expect(report.layouts.length).toBeGreaterThan(0);
  expect(report.review).toEqual([]);
  expect(errors).toEqual([]);
});
