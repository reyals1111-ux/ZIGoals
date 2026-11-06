import {expect, test} from '@playwright/test';
import {freshHealth, healthView, openHealth, storedHealth} from './al-health-helpers';

// Session AL lane L2 (P-MO-53): Moscow MO-010. Copy meal/day and the Planner's "Log" wrote diary entries to Nov 5/6, days
// the diary cannot open, yet they counted in the week. Copy dates now end today, and a plan for a later day is not logged
// as eaten ahead. Desktop, fresh profile, today Nov 4.
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});

test('MO-010: a copy to a later day is refused at its date; nothing reaches the diary', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T10:00:00.000Z')});
  await freshHealth(page);
  await openHealth(page);
  await healthView(page, 'Meals & planning').click();
  const copy = page.getByRole('form', {name: 'Copy a meal'});
  const first = copy.getByLabel('Copy date 1');
  await expect(first).toHaveAttribute('max', '2026-11-04');
  // The first copy date no longer defaults to tomorrow.
  await expect(first).toHaveValue('2026-11-04');
  await first.fill('2026-11-06');
  await copy.getByRole('button', {name: 'Preview copy'}).click();
  // FIELD-ERROR rule: the refusal is said under its own date field, which is marked invalid and takes the focus.
  await expect(copy.locator('.field-error')).toContainText('Choose today or an earlier day');
  await expect(copy.locator('.field-error')).toHaveAttribute('role', 'alert');
  await expect(first).toHaveAttribute('aria-invalid', 'true');
  await expect(first).toBeFocused();
  await expect(page.getByRole('region', {name: 'Copy preview'})).toHaveCount(0);
  expect((await storedHealth(page))?.diary.filter(e => e.date > '2026-11-04') ?? []).toEqual([]);
});
