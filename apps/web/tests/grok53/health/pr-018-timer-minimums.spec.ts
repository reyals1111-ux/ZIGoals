import {expect, test} from '@playwright/test';
import {freshHealth, openHealth} from './al-health-helpers';

// Session AL lane L2 (P-PR-22 / P-MO-55): Professor PR-018, Moscow MO-025/MO-115/MO-132, M-136. Health's own Stop kept a
// "0.0 h" fast while the Checklist dropped fasts under ten minutes. One rule now (lib/health-timer-rules.ts), stated on
// the card: under ten minutes nothing is saved, with an Undo that resumes the fast. Desktop, fresh profile.
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});

test('PR-018/MO-025: a fast stopped at once is not stored as 0.0 h; Undo resumes it', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T10:00:00.000Z')});
  await freshHealth(page);
  await openHealth(page);
  const timer = page.getByRole('region', {name: 'Fasting timer', exact: true});
  // Session AL fifth pass (PR-018, deliberate): one minimum for every timer, a minute; the 30-second stop is still dropped.
  await expect(timer).toContainText('A timer stopped within its first minute saves nothing: sleep, fasts, meditation and focus alike.');
  await timer.getByRole('button', {name: 'Start fast', exact: true}).click();
  await page.clock.fastForward(30_000);
  await timer.getByRole('button', {name: 'Stop fast', exact: true}).click();
  await expect(timer.getByRole('status')).toContainText('Stopped after less than a minute, so nothing was saved.');
  await expect(timer).not.toContainText('0.0 h');
  await expect(timer.getByRole('heading', {name: 'Recent fasts'})).toHaveCount(0);
  await page.locator('.aa-toast').getByRole('button', {name: /^Undo/}).click();
  await expect(timer.getByRole('button', {name: 'Stop fast', exact: true})).toBeVisible();
});
