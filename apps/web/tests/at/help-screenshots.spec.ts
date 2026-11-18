import {expect, test} from '@playwright/test';
import {hydrated} from '../ah-helpers';

// Session AT (ADR-043 D14; backlog #12): Help's example pictures load only when their answer opens, follow the viewer's
// theme (a phone's picture on a narrow screen), and each says it is example data.
test('D14: the example pictures open with their answer, in the theme in use, each labelled as example data', async ({page}, info) => {
  await page.goto('/app/settings');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('zigoals:ui-prefs:v1', JSON.stringify({version: 1, theme: 'light'})); });
  await page.goto('/app/help'); await hydrated(page);
  const answer = page.locator('#help-at-screens');
  const images = answer.locator('img');
  // Closed: nothing has been fetched yet.
  expect(await images.evaluateAll(list => list.filter(i => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0).length)).toBe(0);
  await answer.locator('summary').click();
  await expect(answer.locator('figure')).toHaveCount(5);
  await expect(answer.locator('figcaption')).toHaveText(Array(5).fill(/Example data$/));
  await expect(answer).toContainText('Example pictures from the Showcase (fictional data');
  const first = images.first();
  await first.scrollIntoViewIfNeeded();
  await expect.poll(() => first.evaluate(i => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const src = await first.evaluate(i => (i as HTMLImageElement).currentSrc);
  expect(src).toContain(info.project.name === 'mobile' ? '/help/today-light-phone.webp' : '/help/today-light-desktop.webp');
  await expect(first).toHaveAttribute('alt', /^Example: Today with the Showcase's fictional data, in the Light theme$/);
});
