import {expect, test} from '@playwright/test';
import {health, healthRecord, openHealth} from './ap/ap-health-fixtures';
import {isPhone} from './phone-nav';

/**
 * Session AV lane 2 (review b1 #15): the evening check-in's 14-day strip shows which day each box is ("M 16" … "Today"),
 * so a sighted person can tell the days apart; the full date stays in each box's name. Fictional data; 1440 and 320 px.
 */
test('each box of the 14-day strip shows its day', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, healthRecord(health()));
  if (await isPhone(page)) await page.getByRole('button', {name: /^How (does today|did .+) feel\?/}).click();
  await page.getByText('Evening check-in (optional)', {exact: true}).click();
  const strip = page.getByRole('list', {name: /^The last 14 days: /});
  await expect(strip.getByRole('listitem')).toHaveCount(14);
  await expect(strip.getByRole('listitem').last()).toHaveText(/^Today/);
  await expect(strip.getByRole('listitem').first()).toHaveText(/^[SMTWF] \d{1,2}/);
  const labels = await strip.locator('.checkin-strip-day').allInnerTexts();
  expect(new Set(labels).size).toBe(14);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
