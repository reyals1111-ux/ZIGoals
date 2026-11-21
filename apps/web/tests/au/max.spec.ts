import {expect, test} from '@playwright/test';
import {at, DAY1, DAY2, freshWeek, hydrated, novaSays, openAt, setup, ZONE} from './au-helpers';
import {quietPage} from '../quiet-page';

/**
 * Session AU (ADR-044, the friends dress rehearsal): Max at 1440 in Nebula. A night owl, his day ends at 03:00. In the
 * rehearsal NOVA could not say what day it was at 01:30 (R-4); now it answers by his own day, in English and Dutch, and
 * plainly once his day has ended.
 */
test.skip(({isMobile}) => isMobile, 'the desktop part of Max\'s week (his phone part is tests/au/webkit-au-max.spec.ts)');
test.use({timezoneId: ZONE, viewport: {width: 1440, height: 900}, actionTimeout: 15_000});

test('Max at 1440: "What day is it?" after midnight is answered by his own day end', async ({page}) => {
  test.setTimeout(150_000);
  await freshWeek(page, 'nebula', at(DAY1, '11:00'));
  await setup(page, [/^Habits/]);
  await page.goto('/app/settings#day-ends'); await hydrated(page);
  await page.locator('#day-ends').getByLabel('My day ends at').selectOption({label: '3:00'});
  await expect(page.locator('#day-ends').getByRole('status')).toHaveText('Your day now ends at 3:00.');
  await quietPage(page);

  await openAt(page, at(DAY2, '01:30'), '/app/nova');
  await page.keyboard.press('Shift');
  expect(await novaSays(page, 'What day is it?')).toContain('It\'s Monday, Nov 23 for you: your day ends at 03:00 (the calendar already says Tuesday).');
  expect(await novaSays(page, 'Welke dag is het?')).toContain('Voor jou is het maandag, Nov 23');

  await openAt(page, at(DAY2, '09:00'), '/app/nova');
  await page.keyboard.press('Shift');
  expect(await novaSays(page, 'What day is it?')).toContain('It\'s Tuesday, Nov 24.');
});
