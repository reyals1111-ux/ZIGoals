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
