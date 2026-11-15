import {expect, type Locator, type Page} from '@playwright/test';

/**
 * Session AI: the Goal wizard's name is the first thing a spec types after the page opens, and on a busy runner those
 * keystrokes can be lost (the Goal-name race, Session AH: scripts/run11/goal-name.mjs, ah-multitab). A person cannot type
 * that soon; the spec types the name, lets the page paint twice, and types again until the field holds it.
 * Session AJ (item 11): every spec that types a Goal name uses this helper (lib/testing/goal-name-guard.test.ts keeps it so);
 * `scope` is the page, or the region that holds the wizard (the onboarding flow).
 */
export async function typeGoalName(scope: Page | Locator, name: string) {
  const field = scope.getByLabel('Goal name', {exact: true});
  await expect(async () => {
    await field.fill(name);
    await field.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await field.inputValue()).toBe(name);
  }).toPass({timeout: 15_000});
}

/**
 * Session AO (T-014, deliberate): the Goal creator has three steps (Your goal · What counts · Review; the optional rhythm
 * is a closed part of the review). From step `from`, Continue to the review, each Continue once it is there, then check the
 * review is the last step: "Step 3 of 3" and no Continue. Specs that clicked Continue three times use this once.
 */
export async function continueToGoalReview(scope: Page | Locator, from: 1 | 2 = 1) {
  for (let step = from; step < 3; step++) {
    const next = scope.getByRole('button', {name: 'Continue →', exact: true});
    await expect(next).toBeVisible();
    await next.click();
  }
  await expect(scope.getByText('Step 3 of 3', {exact: true})).toBeVisible();
  await expect(scope.getByRole('button', {name: 'Continue →', exact: true})).toHaveCount(0);
}

/** Session AO (T-014): the review's optional rhythm ("A rhythm (optional)") is closed; one tap opens it. */
export async function openGoalRhythm(scope: Page | Locator) {
  const rhythm = scope.locator('details.wizard-rhythm');
  await expect(rhythm).toBeVisible();
  if (!(await rhythm.evaluate(d => (d as HTMLDetailsElement).open))) await rhythm.locator('summary').click();
  await expect(rhythm).toHaveAttribute('open', '');
}
