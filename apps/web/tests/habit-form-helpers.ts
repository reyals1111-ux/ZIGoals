import {expect, type Locator, type Page} from '@playwright/test';

/**
 * Session AK D1 (FIRST_RUN_REVIEW FR-17, owner decision 5): the habit form keeps how a habit is counted (habit type,
 * measurement, unit, target value, target period) under "More options", closed for a new habit. A spec opens it the way a
 * person does, by its summary, before filling those fields. It is already open on edit, after a template and after a
 * refusal inside it; then this only checks that it is open.
 */
export function habitMoreOptions(scope: Page | Locator): Locator {
  return scope.locator('.habit-editor details.habit-more-options');
}
export async function openHabitMoreOptions(scope: Page | Locator) {
  const fold = habitMoreOptions(scope);
  await expect(fold).toHaveCount(1);
  await expect(async () => {
    if (!await fold.evaluate(details => (details as HTMLDetailsElement).open)) await fold.locator(':scope > summary').click();
    await expect(fold).toHaveAttribute('open', '', {timeout: 1500});
  }).toPass({timeout: 15000});
}
