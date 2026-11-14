import {expect, test} from '@playwright/test';
import {freshDevice, hydrated} from '../../ah-helpers';
import {openSettings} from '../../settings-open';

// Session AL (TK-184, P-TK-56): Tokyo at 768 px found Settings' sticky index wrapped to several rows (~110–134 px) and
// covering the page. It is now one row of 44 px links that scrolls sideways inside itself; the page never does.
test.use({viewport: {width: 768, height: 1024}});

test('TK-184: at 768 px the Settings index is one row and the page does not scroll sideways', async ({page}) => {
  await freshDevice(page);
  await openSettings(page);
  await hydrated(page);
  const index = page.locator('.settings-sections');
  await expect(index).toBeVisible();
  const box = (await index.boundingBox())!;
  const links = index.locator('a');
  // CI 1539 (the bound corrected, as strict): a link is 49.25 px tall (14 px words, 12 px padding above and below, never
  // under 44 px), so one row is that plus the bar's 12 px padding above and below and its 1 px rule: 74.25 px measured. Two
  // rows would be over 120 px. The 72 had been written from the 44 px minimum before the spec first ran. The tallest item
  // in the row counts ("Fold all" included).
  const tallest = Math.max(...await index.locator(':scope > *').evaluateAll(els => els.map(el => el.getBoundingClientRect().height)));
  expect(box.height).toBeLessThanOrEqual(tallest + 24 + 1 + .5);
  expect(box.height).toBeLessThanOrEqual(80);
  // Session AL fifth pass (TK-184, replay round 2: "74 px, still a two-line-high band"): each item is the 44 px target
  // with 6 px of bar around it, 57 px measured; one row of 44 px targets plus at most 20 px.
  expect(box.height).toBeLessThanOrEqual(64);
  expect(tallest).toBeLessThanOrEqual(46);
  const tops = await links.evaluateAll(els => [...new Set(els.map(el => Math.round(el.getBoundingClientRect().top)))]);
  expect(tops).toHaveLength(1);
  for (const height of await links.evaluateAll(els => els.map(el => el.getBoundingClientRect().height))) expect(height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  // The last link is reachable: it scrolls into view inside the row and opens its section.
  await links.last().click();
  await expect(page).toHaveURL(/#settings-/);
});
