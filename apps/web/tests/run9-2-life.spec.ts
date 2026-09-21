import { expect, test, type Page } from '@playwright/test';

async function showcase(page: Page) {
  await page.goto('/app/settings');
  await page.getByRole('button', { name: 'Load Showcase Demo', exact: true }).click();
  await page.waitForURL('**/app');
  await expect(page.getByRole('complementary', { name: 'Showcase data' })).toBeVisible();
}

test('Life dashboards use Showcase records and expose exact history and working diary controls', async ({ page }) => {
  await showcase(page);
  await page.goto('/app/health');
  await expect(page.getByRole('region', { name: 'Daily nutrition summary' })).toContainText('1,970');
  await expect(page.getByRole('region', { name: 'Daily nutrition summary' })).toContainText('230 kcal remaining');
  await expect(page.getByRole('region', { name: 'Nutrition patterns' })).toContainText('Showcase example history');
  await page.getByText('View nutrition history table', { exact: true }).click();
  await expect(page.getByRole('table')).toContainText('1,970 kcal');
  await page.getByRole('link', { name: 'Breakfast', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Breakfast diary' })).toBeInViewport();
  await page.getByRole('button', { name: 'Edit Berry overnight oats', exact: true }).click();
  await page.getByRole('form', { name: 'Edit diary entry' }).getByLabel('Servings').fill('2');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Daily nutrition summary' })).toContainText('2,390');
  await page.reload();
  await expect(page.getByRole('region', { name: 'Daily nutrition summary' })).toContainText('2,390');
  await page.goto('/app/habits');
  await expect(page.getByRole('region', { name: 'Habit consistency history' })).toContainText('Showcase example history');
  await page.getByText('View daily check-in history', { exact: true }).click();
  await expect(page.getByRole('table')).toContainText('Check-ins');
  await expect(page.getByRole('button', { name: '+ New habit', exact: true })).toBeVisible();
});

test('Activity categories preserve true dated events and current favourites context', async ({ page }) => {
  await showcase(page);
  await page.goto('/app/activity');
  await expect(page.locator('.activity-favourites')).toContainText('Follow dates are not recorded.');
  await expect(page.locator('.unified-activity')).toContainText('Showcase example history');
  await expect(page.locator('.activity-date-heading').first()).toBeVisible();
  await page.getByRole('button', { name: 'Wealth', exact: true }).click();
  await expect(page.locator('.unified-activity')).toContainText('Bitcoin added');
  await expect(page.locator('.unified-activity')).toContainText('Metal');
  await expect(page.locator('.unified-activity')).not.toContainText('Showcase walk');
  await page.locator('.unified-activity a').first().click();
  await expect(page).toHaveURL(/\/app\/wealth\/asset\//);
});

for (const width of [1440, 1024, 390, 320]) test(`Life pages recompose at ${width}px without overflow`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await showcase(page);
  for (const route of ['health', 'habits', 'activity', 'ecosystem', 'settings']) {
    await page.goto(`/app/${route}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (route === 'health') { await expect(page.locator('.nutrition-dashboard')).toBeVisible(); await page.locator('.nutrition-dashboard').screenshot({ path: `/tmp/zigoals-run92-nutrition-module-${width}.png` }); }
    if (route === 'habits') { await expect(page.locator('.habit-consistency')).toBeVisible(); await page.locator('.habit-consistency').screenshot({ path: `/tmp/zigoals-run92-habit-module-${width}.png` }); }
    await page.screenshot({ path: `/tmp/zigoals-run92-life-${route}-${width}.png`, fullPage: true, scale: "css" });
  }
});

test('Quick Add opens Habit creation from the Habit page and can reopen after cancel', async ({ page }) => {
  await page.goto('/app/habits');
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole('button', { name: '+ Quick add', exact: true }).click();
    await page.getByRole('navigation', { name: 'Quick add actions' }).getByRole('link').filter({ hasText: 'Habit' }).click();
    await expect(page.getByLabel('Habit title', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByLabel('Habit title', { exact: true })).toHaveCount(0);
  }
});

test('Quick Add Health entry leaves another Health view and focuses the working diary form', async ({ page }) => {
  await showcase(page);
  await page.goto('/app/health');
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole('button', { name: 'Weight', exact: true }).click();
    await page.getByRole('button', { name: '+ Quick add', exact: true }).click();
    await page.getByRole('navigation', { name: 'Quick add actions' }).getByRole('link').filter({ hasText: 'Health entry' }).click();
    await expect(page.getByRole('form', { name: 'Log a meal' })).toBeInViewport();
    await expect(page.getByRole('form', { name: 'Log a meal' }).getByLabel('Food or recipe')).toBeFocused();
  }
});

test('Life functional text stays readable at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  await showcase(page);
  const issues: unknown[] = [];
  for (const [route, root] of [['health', '.health-page'], ['habits', '.habits-workspace'], ['activity', '.activity-page'], ['ecosystem', '.ecosystem-page'], ['settings', '.settings-page']]) {
    await page.goto(`/app/${route}`);
    await expect(page.locator(root!)).toBeVisible();
    const tooSmall = await page.locator(root!).evaluate(element => [...element.querySelectorAll<HTMLElement>('p,small,span,label,input,button,select,summary,a,b,dt,dd')].filter(item => item.getClientRects().length && !item.closest('.eyebrow') && (item.innerText?.trim() || ['INPUT', 'SELECT'].includes(item.tagName)) && parseFloat(getComputedStyle(item).fontSize) < 14).map(item => ({ text: (item.innerText || item.getAttribute('aria-label') || item.tagName).slice(0, 80), size: getComputedStyle(item).fontSize })));
    if (tooSmall.length) issues.push({ route, tooSmall });
  }
  expect(issues).toEqual([]);
});
