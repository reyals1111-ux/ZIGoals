import {expect, test} from '@playwright/test';
import {hydrated, loadShowcase, offlineApi} from './ah-helpers';

// Session AH Part 4 (TR7, owner amendment 6; N-030, B-040, D-214, L-085, B-034, B-150, D-057, D-201, L-078, M-121): the app
// has no exchange-rate source, so no switch offers totals "in" another currency. A euro-area device, or an older stored
// EUR choice, never turns the headline into the small euro total or Today's ring into 0 %.
test.describe('one currency at a time, never converted', () => {
  // en-IE: a euro-area device (lib/default-currency) with English number formatting (dollars read "US$").
  test.use({locale: 'en-IE', timezoneId: 'Europe/Dublin'});
  test.beforeEach(async ({page}) => { await offlineApi(page); });

  for (const stored of [false, true]) test(`Wealth and Today lead with the largest total${stored ? ' (an older stored EUR choice)' : ''}; no currency switch; "coming later"`, async ({page}) => {
    if (stored) await page.addInitScript(() => localStorage.setItem('zigoals:ui-prefs:v1', JSON.stringify({version: 1, baseCurrency: 'EUR'})));
    await loadShowcase(page);
    await page.goto('/app/wealth'); await hydrated(page);
    const total = page.locator('.wealth-hero-total');
    await expect(total.locator('.wealth-total-headline')).toHaveText(/^(US)?\$501,800\.00$/);
    await expect(total.locator('.wealth-other-chip-button')).toHaveText('+ €8,000.00 held in EUR');
    await expect(total).toContainText('Currency totals stay separate. No FX assumed. One total in a single currency is coming later.');
    await expect(page.getByRole('group', {name: 'Show totals in'})).toHaveCount(0);
    await expect(page.locator('.wealth-hero').getByRole('button', {name: 'EUR', exact: true})).toHaveCount(0);
    await expect(page.locator('.wealth-hero')).not.toContainText('Nothing tracked in');
    // Allocated and Available lead with the headline's currency too.
    for (const row of ['Allocated to Goals', 'Available for Goals']) await expect(page.locator('.wealth-split div').filter({hasText: row}).locator('.split-figure')).toContainText('$');
    await page.goto('/app'); await hydrated(page);
    await expect(page.locator('.life-orbit-wealth .wealth-total-headline')).toHaveText(/^(US)?\$501,800\.00$/);
    const ring = page.locator('.life-ring[data-pillar="wealth"]');
    await expect(ring.locator('.life-long')).toContainText(/\$[\d,.]+ of (US)?\$501,800\.00 for Goals/);
    await expect(ring).not.toContainText('€');
  });
});

// Session AH Part 4 (TR6/B5; BUG-031, BUG-041, BUG-062, M-085, D-238, D-246): one count per thing — the same Showcase reads
// the same numbers on Today, Goals, Habits, Wealth and Markets.
test('Today, Goals, Habits, Wealth and Markets agree on their counts', async ({page}) => {
  await offlineApi(page);
  await loadShowcase(page);
  const life = page.locator('.life-rings');
  const goalsLine = (await life.locator('[data-pillar="goals"] .life-long').innerText()).trim();
  const habitsLine = (await life.locator('[data-pillar="habits"] .life-long').innerText()).trim();
  const todayActive = Number(goalsLine.match(/^(\d+) active/)![1]);
  const [, todayDone, todayDue] = habitsLine.match(/^(\d+) of (\d+) Habits complete$/)!;
  await page.goto('/app/goals'); await hydrated(page);
  await expect(page.getByRole('list', {name: 'Your goals at a glance'}).or(page.locator('.goals-figures')).first().locator('div').filter({hasText: 'Active'}).locator('strong')).toHaveText(String(todayActive));
  await page.goto('/app/habits'); await hydrated(page);
  await expect(page.getByRole('region', {name: 'Today’s habit progress'}).locator('strong').first()).toHaveText(`${todayDone} / ${todayDue}`);
  await page.goto('/app/wealth'); await hydrated(page);
  const manual = Number((await page.locator('.wealth-hero-total small').first().innerText()).match(/(\d+) manual/)![1]);
  await page.goto('/app/markets'); await hydrated(page);
  const sources = page.getByRole('region', {name: 'What’s tracked, and how.'});
  await sources.scrollIntoViewIfNeeded();
  await expect(sources.locator('.bottom-counts div').filter({hasText: 'Manual assets'}).locator('dd')).toHaveText(String(manual));
});
