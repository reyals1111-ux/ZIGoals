import {expect, test} from '@playwright/test';

// Session X Part 12 (WCAG 2.4.2 Page titled): every page names itself in the browser tab and history, "<page> · ZIGoals
// Alpha"; client-side navigation changes the title too (Next.js announces the new title to screen readers on navigation).
// Meet ZIGi (/app/zigi) is X-LOCAL's page and keeps the default title until that lane names it.
const PAGES: [path: string, title: string][] = [
  ['/app', 'Today'], ['/app/goals', 'Goals'], ['/app/goals/new', 'Create a goal'], ['/app/habits', 'Habits'], ['/app/health', 'Health'],
  ['/app/wealth', 'Wealth'], ['/app/portfolio', 'Portfolio'], ['/app/markets', 'Markets'], ['/app/staking', 'Staking'],
  ['/app/ecosystem', 'Ecosystem'], ['/app/activity', 'Activity'], ['/app/chess', 'Chess'], ['/app/settings', 'Settings'],
  ['/app/help', 'Help'], ['/app/welcome', 'Welcome'],
];
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('every page has its own title', async ({page}) => {
  test.setTimeout(90_000);
  for (const [path, title] of PAGES) {
    await page.goto(path);
    await expect(page, path).toHaveTitle(`${title} · ZIGoals Alpha`);
  }
  await page.goto('/');
  expect(await page.title()).not.toBe('');
});

test('the title follows a client-side navigation', async ({page, isMobile}) => {
  test.skip(isMobile, 'The sidebar is the desktop layout; the phone tab bar navigates the same router.');
  await page.goto('/app');
  await expect(page).toHaveTitle('Today · ZIGoals Alpha');
  await page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'Habits', exact: true}).click();
  await expect(page).toHaveURL(/\/app\/habits$/);
  await expect(page).toHaveTitle('Habits · ZIGoals Alpha');
});
