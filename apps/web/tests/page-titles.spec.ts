import {readdirSync} from 'node:fs';
import {join} from 'node:path';
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

// Session AC (the owner's hosted check on Alpha #41 failed at stage 6 on "Reminders"): every route under /app, the
// dynamic ones with a sample id and the redirect at its destination, has "<title> · ZIGoals Alpha". A new route without
// a row here fails the count check, so it gets one; lib/route-titles.test.ts guards the layouts behind the template.
const EVERY_ROUTE: [path: string, title: string][] = [
  ...PAGES,
  ['/app/goals/1', 'Goal'], ['/app/goals/average/new', 'Keep an average'], ['/app/goals/average/sample', 'Goal'],
  ['/app/goals/templates', 'Goal templates'], ['/app/goals/tracked', 'Goals'], ['/app/goals/tracked/sample', 'Goal'],
  ['/app/goals/positions', 'Staking'], ['/app/journey', 'Journey'], ['/app/music/spotify', 'Spotify'],
  ['/app/portfolio/coin/bitcoin', 'Coin'], ['/app/review', 'Life review'], ['/app/settings/data', 'Your data'],
  ['/app/settings/reminders', 'Reminders'], ['/app/share?text=Hello', 'Shared with ZIGoals'], ['/app/wealth/asset/sample', 'Asset'],
  ['/app/wealth/calculator', 'Compound interest calculator'], ['/app/zigi', 'Meet ZIGi'], ['/app/no-such-page', 'Page not found'],
  // Session AF (ADR-028): the new pages, each with its own title.
  ['/app/earn', 'Earn'], ['/app/checklist', 'Checklist'], ['/app/governance', 'Governance'], ['/app/wealth/add-money', 'Add money'],
  ['/app/wealth/add-money/back', 'Add money: what happens next'],
];
test('every route under /app carries the " · ZIGoals Alpha" title', async ({page}) => {
  test.setTimeout(180_000);
  // One row per page file under app/app: a new route without a row fails here.
  const pageFiles = (readdirSync(join(__dirname, '..', 'app', 'app'), {recursive: true}) as string[]).filter(f => /(^|\/)page\.tsx$/.test(f));
  expect(new Set(EVERY_ROUTE.map(([path]) => path.split('?')[0])).size).toBe(pageFiles.length);
  for (const [path, title] of EVERY_ROUTE) {
    await page.goto(path);
    await expect(page, path).toHaveTitle(`${title} · ZIGoals Alpha`);
  }
});

test('the title follows a client-side navigation', async ({page, isMobile}) => {
  test.skip(isMobile, 'The sidebar is the desktop layout; the phone tab bar navigates the same router.');
  await page.goto('/app');
  await expect(page).toHaveTitle('Today · ZIGoals Alpha');
  await page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'Habits', exact: true}).click();
  await expect(page).toHaveURL(/\/app\/habits$/);
  await expect(page).toHaveTitle('Habits · ZIGoals Alpha');
});
