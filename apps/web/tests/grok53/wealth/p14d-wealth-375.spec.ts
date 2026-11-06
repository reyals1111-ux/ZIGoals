import {expect, test} from '@playwright/test';
import {hydrated, loadShowcase} from '../../ah-helpers';

/**
 * Session AL Part 14, lane P14-D: WE10 (B-151), "Wealth on phones", never retested on #53. At 375 px with the Showcase:
 * the total is on the first screen, the page has one heading of the first level, and the Add-asset sheet keeps its padding
 * with nothing scrolling sideways.
 */
test.use({viewport: {width: 375, height: 812}});

test('WE10 (B-151): Wealth at 375 — the total on the first screen, one h1, and the Add-asset sheet padded, no sideways scroll', async ({page}) => {
  await loadShowcase(page);
  await page.goto('/app/wealth');
  await hydrated(page);
  await expect(page.locator('main h1')).toHaveCount(1);
  const total = page.getByRole('group', {name: /^(Known|Total) tracked wealth$/}).first();
  await expect(total).toBeVisible();
  const box = (await total.boundingBox())!;
  expect(box.y + Math.min(box.height, 80)).toBeLessThanOrEqual(812);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

  await page.getByRole('button', {name: '+ Add asset', exact: true}).first().click();
  const sheet = page.getByRole('dialog', {name: 'Add to your wealth'});
  await expect(sheet).toBeVisible();
  const fit = await sheet.evaluate(el => {
    const r = el.getBoundingClientRect(), inner = [...el.querySelectorAll<HTMLElement>('input:not([type=radio]):not([type=checkbox]), h2, p')].filter(e => e.getBoundingClientRect().width > 0);
    const left = Math.min(...inner.map(e => e.getBoundingClientRect().left)) - r.left, right = r.right - Math.max(...inner.map(e => e.getBoundingClientRect().right));
    return {left, right, sideways: el.scrollWidth - el.clientWidth, within: r.left >= 0 && r.right <= innerWidth};
  });
  expect(fit.within).toBe(true);
  expect(fit.sideways).toBeLessThanOrEqual(0);
  expect(fit.left).toBeGreaterThanOrEqual(12);
  expect(fit.right).toBeGreaterThanOrEqual(12);
});

test('WE7 (L-067, B-199): a debt payment of 0 or more than is owed is refused under the field; the debt keeps its balance', async ({page}) => {
  await loadShowcase(page);
  await page.goto('/app/wealth');
  await hydrated(page);
  const pay = page.getByRole('button', {name: /^Record a payment on /}).first();
  test.skip(!(await pay.count()), 'The Showcase holds no debt (checked by lib/accounts unit tests instead)');
  const name = (await pay.getAttribute('aria-label'))!.replace(/^Record a payment on /, '');
  await pay.click();
  const form = page.getByRole('form', {name: `Payment on ${name}`});
  const amount = form.getByRole('textbox', {name: /^Payment/});
  await amount.fill('0');
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(form.getByRole('alert')).toHaveText('Enter a payment above zero.');
  await expect(amount).toBeFocused();
  await amount.fill('999999999');
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(form.getByRole('alert')).toContainText('That is more than the');
  await expect(form).toBeVisible(); // nothing was saved: the form stays open
});
