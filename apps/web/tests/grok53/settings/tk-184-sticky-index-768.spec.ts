import {expect, test} from '@playwright/test';
import {freshDevice, hydrated} from '../../ah-helpers';

// Session AL (TK-184, P-TK-56): Tokyo at 768 px found Settings' sticky index wrapped to several rows (~110–134 px) and
// covering the page. It is now one row of 44 px links that scrolls sideways inside itself; the page never does.
test.use({viewport: {width: 768, height: 1024}});

test('TK-184: at 768 px the Settings index is one row and the page does not scroll sideways', async ({page}) => {
  await freshDevice(page);
  await page.goto('/app/settings');
  await hydrated(page);
  const index = page.locator('.settings-sections');
  await expect(index).toBeVisible();
  const box = (await index.boundingBox())!;
  expect(box.height).toBeLessThanOrEqual(72); // one 44 px row plus its padding
  const links = index.locator('a');
  const tops = await links.evaluateAll(els => [...new Set(els.map(el => Math.round(el.getBoundingClientRect().top)))]);
  expect(tops).toHaveLength(1);
  for (const height of await links.evaluateAll(els => els.map(el => el.getBoundingClientRect().height))) expect(height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  // The last link is reachable: it scrolls into view inside the row and opens its section.
  await links.last().click();
  await expect(page).toHaveURL(/#settings-/);
});
