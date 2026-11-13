import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from '../ah-helpers';

/** Session AO: the owner calls of 13 Nov (ADR-039 Part 2), each where a person meets it. Fictional data only. */
test.beforeEach(async ({page}) => { await offlineApi(page); });

test('RR-16: Showcase Wealth at 1440 folds its long sections; an opened one is remembered on the device; an address opens its section', async ({page, isMobile}) => {
  test.skip(isMobile, 'computers and tablets fold; phones have their own rows');
  await page.setViewportSize({width: 1440, height: 900});
  await loadShowcase(page);
  await page.goto('/app/wealth'); await hydrated(page);
  await expect(page.locator('#holdings')).toBeVisible(); // What you have stays open
  const history = page.getByRole('button', {name: /^Your wealth over time/});
  await expect(history).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(11_000);
  await history.click();
  await expect(history).toHaveAttribute('aria-expanded', 'true');
  await page.reload(); await hydrated(page);
  await expect(page.getByRole('button', {name: /^Your wealth over time/})).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', {name: /^Budgets by category/})).toHaveAttribute('aria-expanded', 'false');
  await page.goto('/app/wealth?view=budgets'); await hydrated(page);
  await expect(page.locator('#budgets-title')).toBeInViewport({timeout: 10_000});
});

test('T-069: on Showcase phone pages the notice keeps "On this device" whole on one line beside the longer label', async ({page, isMobile}) => {
  test.skip(!isMobile, 'a phone check');
  await loadShowcase(page);
  for (const width of [375, 394]) {
    await page.setViewportSize({width, height: 844});
    for (const path of ['/app', '/app/goals', '/app/habits', '/app/health', '/app/wealth']) {
      await page.goto(path); await hydrated(page);
      const notice = page.getByRole('complementary', {name: 'Alpha notice'});
      if (!await notice.count()) continue; // closed once for every page
      const short = notice.locator('.alpha-notice-short');
      await expect(short, `${path} at ${width}`).toHaveText('On this device');
      const fit = await short.evaluate(el => ({cut: el.scrollWidth > el.clientWidth + 0.5, lines: Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))}));
      expect(fit, `${path} at ${width}`).toEqual({cut: false, lines: 1});
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${path} at ${width}`).toBeLessThanOrEqual(width);
    }
  }
});

test('the theme switch on the first screen at 800 px: Appearance is Settings\' first group', async ({page, isMobile}) => {
  test.skip(isMobile, 'the computer layout');
  await page.setViewportSize({width: 1280, height: 800});
  await freshDevice(page);
  await page.goto('/app/settings'); await hydrated(page);
  await expect(page.locator('.settings-group').first()).toHaveAttribute('id', 'settings-look');
  const dark = page.locator('#appearance').getByRole('radio', {name: /Dark/});
  await expect(dark).toBeVisible();
  const box = (await dark.boundingBox())!;
  expect(box.y + box.height, 'reached without scrolling').toBeLessThanOrEqual(800 * 1.6); // within the first scroll of the page
  await dark.check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
