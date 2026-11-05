import {expect, test} from '@playwright/test';
import {emptyDevice, hydrated, open} from '../l3-helpers';

/**
 * NB-011 / C-NB-08 (fourth pass): a reload at Step 3 of setup keeps the step and the picks in every locale. In en-GB the
 * Shell remounts the page once after hydration (components/display-locale.ts), and the wizard's first instance had saved
 * its empty first state over the draft before the remount read it. The bots ran in Brussels before 07:00.
 */
for (const locale of ['en-GB', 'en-US'] as const) {
  test.describe(`setup draft in ${locale}`, () => {
    test.use({viewport: {width: 1280, height: 800}, locale, timezoneId: 'Europe/Brussels'});
    test(`NB-011/C-NB-08 (${locale}): a reload at Step 3 returns to Step 3 with Habits and Read more still picked`, async ({page}) => {
      await page.clock.install({time: new Date('2026-11-04T02:00:00Z')}); // 03:00 in Brussels
      await emptyDevice(page, {welcomeSeen: false});
      await open(page, '/app/welcome');
      const flow = page.locator('main');
      await flow.getByRole('button', {name: 'Let’s begin', exact: true}).click();
      await flow.getByRole('checkbox', {name: /^Habits/}).check();
      await flow.getByRole('button', {name: 'Continue', exact: true}).click();
      await expect(flow.getByRole('heading', {level: 1, name: 'Two or three things to focus on.'})).toBeVisible();
      await flow.getByRole('checkbox', {name: /^Read more/}).check();
      await expect(flow.getByText('1 of 3 chosen')).toBeVisible();

      await page.reload(); await hydrated(page);
      await expect(flow.getByRole('heading', {level: 1, name: 'Two or three things to focus on.'})).toBeVisible();
      await expect(flow.getByRole('heading', {level: 1, name: 'Welcome to ZIGoals.'})).toHaveCount(0);
      await expect(flow.getByRole('checkbox', {name: /^Read more/})).toBeChecked();
      await expect(flow.getByText('1 of 3 chosen')).toBeVisible();
      const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('zigoals:welcome-draft:v1') ?? 'null'));
      expect(stored).toMatchObject({step: 'focuses', pillars: ['habits']});
      expect(stored.focuses).toHaveLength(1);

      // A second reload keeps it too (the remounted instance's own write is the restored draft).
      await page.reload(); await hydrated(page);
      await expect(flow.getByRole('checkbox', {name: /^Read more/})).toBeChecked();
      await flow.getByRole('button', {name: 'Back', exact: true}).click();
      await expect(flow.getByRole('checkbox', {name: /^Habits/})).toBeChecked();
    });
  });
}
