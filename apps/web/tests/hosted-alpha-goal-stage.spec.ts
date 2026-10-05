import {expect, test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {GOAL_SENTINELS, LOCAL_SIMULATION_METADATA_KEY, closeFictionalGoal, createFictionalGoal, depositAndWithdraw, openDiagnostics, previewSafeDiagnostics} from '../../../scripts/lib/hosted-alpha-goal-stage.mjs';

/**
 * Session V Part 1a: the owner's live check (scripts/verify-hosted-alpha.mjs) creates, funds, backs up, diagnoses and
 * closes a fictional local-simulation goal. Its steps live in scripts/lib/hosted-alpha-goal-stage.mjs and this spec runs
 * exactly those steps against the local build on every pull request, so a change to the goal wizard or the goal page
 * fails here instead of silently breaking the owner's check. The live script runs a 1280 × 900 desktop browser, so this
 * runs on the desktop project only. Browser-local data only; the Testnet reads of "Check connection" are answered here.
 */
test('the verifier\'s fictional goal steps work on this build: create, fund, back up, diagnose, close', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'The live check runs a desktop browser');
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route('https://testnet-**.zigchain.com/**', async route => {
    const url = route.request().url();
    expect(route.request().method()).toBe('GET');
    const json = url.endsWith('/status') ? {result: {node_info: {network: 'zig-test-2'}, sync_info: {catching_up: false, latest_block_height: '77', latest_block_time: new Date().toISOString()}}}
      : url.includes('node_info') ? {default_node_info: {network: 'zig-test-2'}, application_version: {version: 'v5.0.0-patch-1'}}
      : url.includes('staking') ? {params: {bond_denom: 'azig'}} : url.includes('balances') ? {balance: {denom: 'azig', amount: '0'}}
      : {metadata: {base: 'azig', display: 'ZIG', denom_units: [{denom: 'ZIG', exponent: 18}]}};
    await route.fulfill({json});
  });
  await page.setViewportSize({width: 1280, height: 900});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/app');
  await createFictionalGoal(page, expect);
  await depositAndWithdraw(page);
  // The backup round trip, as the live script does it.
  await page.getByRole('link', {name: 'Settings', exact: true}).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Export Goal Data', exact: true}).click();
  const backup = JSON.parse(await readFile((await (await download).path())!, 'utf8')) as {goals: Record<string, {name: string; notes?: string; targetDate?: string}>};
  expect(backup.goals['1']?.name).toBe(GOAL_SENTINELS.name);
  backup.goals['1']!.notes = GOAL_SENTINELS.note; backup.goals['1']!.targetDate = GOAL_SENTINELS.date;
  await page.getByLabel('Or paste backup JSON').fill(JSON.stringify(backup));
  await page.getByRole('button', {name: 'Import backup', exact: true}).click();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').goals?.['1']?.notes, LOCAL_SIMULATION_METADATA_KEY)).toBe(GOAL_SENTINELS.note);
  // Diagnostics: the folded panel, the connection check and the reviewed safe summary.
  const panel = await openDiagnostics(page);
  await page.getByRole('button', {name: 'Check connection', exact: true}).click();
  await expect(panel).toContainText('Verified zig-test-2');
  const summary = await previewSafeDiagnostics(page, expect);
  for (const value of Object.values(GOAL_SENTINELS)) expect(summary).not.toContain(value);
  // Reload retention and closing the empty goal.
  await page.goto('/app/goals/1');
  await page.reload();
  await expect(page.locator('.mode-strip')).toContainText('LOCAL SIMULATION');
  await closeFictionalGoal(page, expect);
  expect(errors).toEqual([]);
});
