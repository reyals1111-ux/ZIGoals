// The fictional local-simulation goal steps of scripts/verify-hosted-alpha.mjs (Session V Part 1a), in their own module so
// a browser spec (apps/web/tests/hosted-alpha-goal-stage.spec.ts) runs the very same selectors against a local production
// build on every pull request: when the goal wizard or the goal page changes, that spec fails instead of the owner's live
// check going stale unnoticed. Browser-local only: a local simulation goal named by fictional sentinels; no wallet, no
// signature, nothing written to a server. `expect` is Playwright's, passed in by the caller.

export const GOAL_SENTINELS = Object.freeze({
  name: 'M5_FICTIONAL_GOAL_81f3c7',
  target: '7319.2468',
  targetUnits: '7319246800000000000000',
  date: '2033-11-27',
  note: 'M5_FICTIONAL_NOTE_29a6f4',
});
/** Where the Local Demo keeps the local simulation goals' private metadata (the backup round trip reads it). */
export const LOCAL_SIMULATION_METADATA_KEY = 'zigoals:metadata:v1:local-simulation:local-demo-user';

/** The goal page's simulation controls sit in a folded module; open it when its amount field is not shown. */
async function openLocalSimulation(page) {
  if (!await page.getByLabel('Amount in ZIG').isVisible()) await page.locator('#local-simulation > summary').click();
}

/**
 * Today → Quick add → Goal → the current goal wizard (`UnifiedGoalWizard`, /app/goals/new): the category is a radio
 * inside "Personalize artwork and notes (optional)", the funding source is the "ZIGoals funding / Local simulation"
 * choice on the second step, then two more steps and "Create goal" with the simulation's own confirmation.
 */
export async function createFictionalGoal(page, expect, {name = GOAL_SENTINELS.name, target = GOAL_SENTINELS.target} = {}) {
  await page.locator('.today-hero').getByRole('button', {name: '+ Quick add', exact: true}).click();
  await page.getByRole('navigation', {name: 'Quick add actions'}).getByRole('link').filter({hasText: 'Goal'}).click();
  await page.getByText('Personalize artwork and notes (optional)', {exact: true}).click();
  await page.getByRole('group', {name: 'Category / artwork'}).getByRole('radio', {name: 'Travel', exact: true}).check();
  await page.getByLabel('Goal name', {exact: true}).fill(name);
  await page.getByLabel('Target amount').fill(target);
  await page.getByRole('button', {name: 'Continue →', exact: true}).click();
  await page.getByLabel('ZIGoals funding / Local simulation', {exact: true}).check();
  for (let step = 0; step < 2; step++) await page.getByRole('button', {name: 'Continue →', exact: true}).click();
  await page.getByRole('button', {name: 'Create goal', exact: true}).click();
  await page.getByRole('button', {name: 'Confirm simulation', exact: true}).click();
  await expect(page.getByRole('heading', {name, exact: true})).toBeVisible();
  await expect(page.locator('.goal-detail-heading .eyebrow')).toHaveText('Travel · Local simulation');
}

/** Ten simulated ZIG in and out again, each with the simulation's confirmation. */
export async function depositAndWithdraw(page) {
  for (const name of ['Add funds', 'Withdraw']) {
    await openLocalSimulation(page);
    await page.getByLabel('Amount in ZIG').fill('10');
    await page.getByRole('button', {name, exact: true}).click();
    await page.getByRole('button', {name: 'Confirm simulation', exact: true}).click();
  }
}

/** Opens Settings → Advanced Diagnostics (a folded `details`) and returns its panel; the live check runs from there. */
export async function openDiagnostics(page) {
  const advanced = page.locator('details#diagnostics');
  if (!await advanced.evaluate(element => element.open)) await advanced.locator('summary').first().click();
  return page.getByRole('region', {name: 'Connection diagnostics'});
}

/** The reviewed copy of the safe summary: preview first, then copy (the old single "Copy safe diagnostics" button is gone). */
export async function previewSafeDiagnostics(page, expect) {
  await page.getByRole('button', {name: 'Preview safe diagnostics', exact: true}).click();
  const summary = page.getByLabel('Safe diagnostic summary');
  await expect(summary).toBeVisible();
  const text = await summary.inputValue();
  await page.getByRole('button', {name: 'Copy reviewed diagnostics', exact: true}).click();
  return text;
}

/** Reopens the goal after a reload, closes it while empty and checks the page says so. */
export async function closeFictionalGoal(page, expect, {name = GOAL_SENTINELS.name} = {}) {
  await expect(page.getByRole('heading', {name, exact: true})).toBeVisible();
  await openLocalSimulation(page);
  await page.getByRole('button', {name: 'Close empty goal', exact: true}).click();
  await page.getByRole('button', {name: 'Confirm simulation', exact: true}).click();
  await expect(page.locator('.goal-detail-heading .eyebrow')).toHaveText('Travel · Local simulation');
  await expect(page.locator('.goal-detail-heading .badge')).toHaveText(/^closed$/i);
}
