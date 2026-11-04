import {expect, test} from '@playwright/test';
import {freshHealth, openHealth} from './al-health-helpers';
import {FASTING_KEY} from '../../../lib/fasting/schema';

// Session AL lane L2 (P-MO-55): Moscow MO-025/MO-115 (no backdate, no past fast). A fast can start from an earlier time,
// and a past fast is logged with its times; a wrong one says why under the form. Desktop, fresh profile, 10:00 Brussels.
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB', viewport: {width: 1280, height: 900}});
const fasts = (page: import('@playwright/test').Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{"sessions":[]}').sessions, FASTING_KEY) as Promise<{startedAt: string; endedAt: string | null}[]>;

test('MO-025: "Started earlier?" starts the fast at that time; a past fast is kept with its own times', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T09:00:00.000Z')});
  await freshHealth(page);
  await openHealth(page, '?view=diary');
  const timer = page.getByRole('region', {name: 'Fasting timer'});
  await timer.getByLabel('Started earlier? (optional)').fill('20:00');
  await timer.getByRole('button', {name: 'Start fast from 20:00'}).click();
  await expect.poll(async () => (await fasts(page))[0]?.startedAt).toBe('2026-11-03T19:00:00.000Z');
  await timer.getByRole('button', {name: 'Stop fast'}).click();
  await timer.locator('summary', {hasText: 'Log a past fast'}).click();
  const past = timer.getByRole('form', {name: 'Log a past fast'});
  await past.getByLabel('Started (date)').fill('2026-11-01');
  await past.getByLabel('Started (time)').fill('20:00');
  await past.getByLabel('Ended (date)').fill('2026-11-01');
  await past.getByLabel('Ended (time)').fill('20:05');
  await past.getByRole('button', {name: 'Save past fast'}).click();
  await expect(past.locator('.field-error')).toHaveText('A fast lasts at least ten minutes: check the times.');
  await past.getByLabel('Ended (date)').fill('2026-11-02');
  await past.getByLabel('Ended (time)').fill('12:00');
  await past.getByRole('button', {name: 'Save past fast'}).click();
  await expect(timer.getByText('Past fast saved: 16 h 00 min.')).toBeVisible();
  expect((await fasts(page)).some(f => f.startedAt === '2026-11-01T19:00:00.000Z' && f.endedAt === '2026-11-02T11:00:00.000Z')).toBe(true);
});
