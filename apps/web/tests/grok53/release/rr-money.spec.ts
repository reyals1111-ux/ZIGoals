import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from '../../ah-helpers';

/**
 * Release review AL "as if 1.0" (docs/review/session-al/RELEASE_REVIEW_AL.md), the money findings (Wealth, Goals, Life
 * review): one test per finding at the review's width. Every /api request answers 503, so automatic prices are
 * unavailable, as in the review's RR-14; fictional data only.
 */
test.use({timezoneId: 'Europe/Brussels'});
/** The review's evening: Sunday 8 November 2026, 21:45 in Brussels. */
const EVENING = new Date('2026-11-08T20:45:00.000Z');
const desktopOnly = () => test.skip(({isMobile}) => isMobile, 'computer width: runs in the desktop project');
const phoneOnly = () => test.skip(({isMobile}) => !isMobile, 'phone width: runs in the mobile project');

async function fresh(page: Page) {
  await offlineApi(page);
  await page.clock.install({time: EVENING});
  await freshDevice(page);
}
async function open(page: Page, path: string) {
  await page.goto(path);
  await hydrated(page);
}

test.describe('RR-2', () => {
  desktopOnly();
  test('RR-2: a savings account is named in the wizard with the way to count it; "What you have" says what is there', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await fresh(page);
    await open(page, '/app/wealth');
    await page.getByRole('button', {name: 'Add an account or debt'}).click();
    const form = page.getByRole('form', {name: 'Add an account or debt'});
    await form.getByLabel('Kind').selectOption('savings');
    await expect(form.getByText('An account counts toward net worth, not toward a goal.')).toBeVisible();
    await form.getByLabel('Name').fill('ING Savings');
    await form.getByLabel('Currency').fill('USD');
    await form.getByLabel('Balance now (optional)').fill('2400');
    await form.getByRole('button', {name: 'Add', exact: true}).click();
    await expect(page.getByText('ING Savings added.')).toBeVisible();
    const holdings = page.locator('#holdings');
    await expect(holdings.getByRole('group', {name: 'Show'}).getByRole('button', {name: /^All 1$/})).toBeVisible();
    // The chips count one account; the list above it says so, never "No assets in this category yet".
    await expect(holdings).not.toContainText('No assets in this category yet');
    await expect(holdings.locator('.holdings-empty')).toContainText('No assets yet');
    await expect(holdings.locator('.holdings-empty')).toContainText('Your 1 account is listed below, under Accounts, debts & net worth.');

    await open(page, '/app/goals/new');
    await page.getByRole('button', {name: 'Start from the idea: Emergency fund'}).click();
    await page.getByLabel('Target amount', {exact: true}).fill('6000');
    await page.getByRole('button', {name: 'Continue →', exact: true}).click();
    await page.getByRole('radio', {name: 'Count money I already have'}).check();
    const note = page.getByRole('region', {name: 'Your accounts on Wealth'});
    await expect(note).toContainText('Your account (ING Savings) counts toward net worth, not toward a goal.');
    await note.getByRole('button', {name: 'Record ING Savings as cash · $2,400.00'}).click();
    await expect(page.getByLabel('Asset name')).toHaveValue('ING Savings');
    await expect(page.getByLabel('Cash amount')).toHaveValue('2400.00');
    await page.getByRole('button', {name: 'Save asset for this goal'}).click();
    const included = page.getByRole('region', {name: 'Wealth included in this goal'});
    await expect(included).toContainText('ING Savings');
    await expect(included.getByLabel('Units to allocate: ING Savings')).toHaveValue('2400');
  });
});

test.describe('RR-11', () => {
  phoneOnly();
  test('RR-11: at 390 a goal with no plan and no date keeps each fact in its own column ("No saving plan yet" never runs into "Your own pace")', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await fresh(page);
    await open(page, '/app/goals/new');
    await page.getByRole('button', {name: 'Start from the idea: Emergency fund'}).click();
    await page.getByLabel('Target amount', {exact: true}).fill('6000');
    await page.getByRole('button', {name: 'Continue →', exact: true}).click();
    await page.getByRole('button', {name: 'Continue →', exact: true}).click();
    await page.getByRole('button', {name: 'Continue →', exact: true}).click();
    await page.getByRole('button', {name: 'Create goal', exact: true}).click();
    await page.waitForURL(/\/app\/goals\/tracked\//);
    const facts = page.locator('.goal-detail-facts').first();
    await expect(facts).toContainText('No saving plan yet');
    await expect(facts).toContainText('Your own pace');
    const boxes = await facts.locator(':scope > div').evaluateAll(cells => cells.map(cell => {
      const dd = cell.querySelector('dd')!, range = document.createRange(); range.selectNodeContents(dd);
      const text = range.getBoundingClientRect(), own = cell.getBoundingClientRect();
      return {text: dd.textContent, textLeft: text.left, textRight: text.right, cellLeft: own.left, cellRight: own.right};
    }));
    expect(boxes.length).toBe(3);
    // Each fact's words stay inside its own column, so no two run together.
    for (const b of boxes) {
      expect(b.textRight, `${b.text} stays in its column`).toBeLessThanOrEqual(b.cellRight + 0.5);
      expect(b.textLeft).toBeGreaterThanOrEqual(b.cellLeft - 0.5);
    }
  });
});

test.describe('RR-14', () => {
  desktopOnly();
  test('RR-14: with prices offline, Today and the Life review tell the same week (no "+$16,163.50" beside "−$19,442.60")', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await offlineApi(page);
    await page.clock.install({time: EVENING});
    await page.goto('/app/settings');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await loadShowcase(page);
    const line = page.locator('[data-today-line]');
    await expect(line).toContainText('tracked wealth $501,800.00');
    // Bitcoin and Ethereum have no value without prices: the week's change is unknown on both pages, never a figure.
    await expect(line).not.toContainText('this week');
    await open(page, '/app/review');
    const usd = page.locator('section[data-pillar="wealth"] .life-list li').filter({hasText: 'USD'});
    await expect(usd).toContainText('Change not known: a holding has no value right now');
    await expect(usd).not.toContainText('−$19,442.60');
  });
});

test.describe('RR-16', () => {
  desktopOnly();
  test('RR-16: Wealth at 1440, the sections that make it long (recorded, not a limit)', async ({page}, info) => {
    await page.setViewportSize({width: 1440, height: 900});
    await offlineApi(page);
    await page.clock.install({time: EVENING});
    await page.goto('/app/settings');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await loadShowcase(page);
    await open(page, '/app/wealth');
    await expect(page.locator('#holdings')).toBeVisible();
    const sections = await page.locator('[data-layout-item^="wealth:"]').evaluateAll(els => els.map(el => ({id: el.getAttribute('data-layout-item'), height: Math.round(el.getBoundingClientRect().height)})));
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    await info.attach('wealth-1440-sections.json', {body: JSON.stringify({total, screens: +(total / 900).toFixed(1), sections: sections.sort((a, b) => b.height - a.height)}, null, 2), contentType: 'application/json'});
    // The holdings list is one of the measured sections, so the measure reads the page it means to.
    expect(sections.map(x => x.id)).toContain('wealth:holdings');
    console.log(JSON.stringify({total, sections: sections.slice(0, 8)}));
  });
});
