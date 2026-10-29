import {expect, test, type Page} from '@playwright/test';
import {typeGoalName} from './goal-name';

/**
 * Session AB-Cloud Part 8 (ADR-023 C25, owner items): an amount typed with grouping that reads one way only is read and
 * shown plainly before saving; an ambiguous one is refused with its reason; a value Goal starts in the device's currency
 * (euro in the euro area). The Goal preview is the echo; fictional data, no request leaves the page.
 */
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'unavailable'}})); });
const goals = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:platform:v1') ?? 'null') as {goals: {name: string; target: string; asset: string}[]} | null)?.goals ?? []);
async function valueGoal(page: Page, target: string) {
  await page.goto('/app/goals/new');
  await typeGoalName(page, 'Grouped target');
  await page.getByRole('radio', {name: 'Value', exact: true}).check();
  await page.getByLabel('Target amount', {exact: true}).fill(target);
}
const preview = (page: Page) => page.getByRole('region', {name: 'Goal preview'}).locator('strong');

test.describe('a device in the United States', () => {
  test.use({locale: 'en-US'});
  test('"3,250.50" is previewed as 3250.50 USD and saved exactly', async ({page}) => {
    await valueGoal(page, '3,250.50');
    await expect(preview(page)).toHaveText('3250.50 USD');
    await page.getByRole('button', {name: 'Create goal', exact: true}).click();
    await page.waitForURL('**/app/goals/tracked/**');
    expect((await goals(page)).map(g => [g.target, g.asset])).toEqual([['325050', 'USD']]);
  });
});
test.describe('a device in the Netherlands', () => {
  test.use({locale: 'nl-NL'});
  test('"1.234" is refused with its reason instead of read as 1.234; "3.250,50" is previewed as 3250.50 EUR and saved exactly', async ({page}) => {
    await valueGoal(page, '1.234');
    await expect(preview(page)).toHaveText('Unreadable amount · “1.234” could mean 1234 or 1.234. Type it without a thousands separator. EUR');
    await page.getByRole('button', {name: 'Create goal', exact: true}).click();
    await expect(page.getByRole('alert').filter({hasText: '“1.234” could mean 1234 or 1.234'})).toBeVisible();
    expect(await goals(page)).toEqual([]);
    // Gate C test audit: the Dutch reading is also what is saved.
    await page.getByLabel('Target amount', {exact: true}).fill('3.250,50');
    await expect(preview(page)).toHaveText('3250.50 EUR');
    await page.getByRole('button', {name: 'Create goal', exact: true}).click();
    await page.waitForURL('**/app/goals/tracked/**');
    expect((await goals(page)).map(g => [g.target, g.asset])).toEqual([['325050', 'EUR']]);
  });
});
