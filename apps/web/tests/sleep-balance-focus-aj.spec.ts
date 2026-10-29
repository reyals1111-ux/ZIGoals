import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema, type HealthData} from '../lib/health';
import {emptySleep, type Sleep} from '../lib/sleep/schema';
import {saveNight, setSleepGoal} from '../lib/sleep/engine';
import {addDays, instantAt} from '../lib/zone-time';
import {withHealthGroup} from '../lib/vault/w-homes';

// Session AJ (items 26 and 28): the 14-night sleep balance in kind words (never "debt"), and "your best focus window
// today" from the night that ended today, with its Why?, a link to Focus Sessions and an off switch. Fictional nights;
// every request to the server is answered offline.
const BXL = 'Europe/Brussels';
test.use({timezoneId: BXL});
const MORNING = new Date('2026-10-29T08:30:00.000Z'); // 09:30 in Brussels
const SAVED = new Date('2026-10-29T08:00:00.000Z');
const night = (s: Sleep, wake: string, bed: string, up: string) => saveNight(s, {kind: 'night', start: instantAt(bed > up ? addDays(wake, -1) : wake, bed, BXL), end: instantAt(wake, up, BXL), timeZone: BXL, latencyMin: 0, awakeMin: 0}, SAVED);
async function seed(page: Page, sleep: Sleep) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  const health: HealthData = withHealthGroup(createEmptyHealth(), 'sleep', sleep, false);
  await page.evaluate(entries => { for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value); }, {[DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [HEALTH_STORAGE_KEY]: JSON.stringify(healthSchema.parse(health))});
}

test('the sleep balance over 14 nights, and the focus window on Today with Why?, Focus Sessions and an off switch', async ({page, isMobile}) => {
  await page.clock.install({time: MORNING});
  // Goal 8 h; five nights of 7 h 30 min (30 min under) and last night 7 h, ending 07:00 today.
  let s = setSleepGoal(emptySleep(), {minutes: 480}, new Date('2026-10-01T08:00:00Z'));
  for (const d of ['2026-10-20', '2026-10-22', '2026-10-24', '2026-10-26', '2026-10-28']) s = night(s, d, '23:00', '06:30');
  s = night(s, '2026-10-29', '00:00', '07:00');
  await seed(page, s);
  await page.goto('/app/health?view=sleep');
  const week = page.getByRole('region', {name: 'Your last 7 days'});
  await expect(week).toContainText('Sleep balance, last 14 days');
  await expect(week).toContainText('About 35 min under your goal a night'); // (5 × −30 − 60) / 6 = −35
  await expect(week).toContainText('on average over the 6 nights you logged. Every night is a fresh start.');
  const balance = week.locator('.sleep-stat-wide').filter({hasText: 'Sleep balance'});
  await expect(balance).not.toContainText(/debt/i);

  await page.goto('/app');
  if (isMobile) await page.getByRole('region', {name: 'For you'}).getByRole('button', {name: /^Show more/}).click();
  else { const more = page.getByRole('region', {name: 'For you'}).getByRole('button', {name: /^Show more/}); if (await more.count()) await more.click(); }
  // Last night was 7 h, under the 8 h goal by an hour: the shorter window, 2½ to 3½ hours after 07:00.
  const card = page.getByRole('article', {name: /Your best focus window today/});
  await expect(card).toContainText('9:30 AM–10:30 AM');
  await card.getByText('Why?').click();
  await expect(card).toContainText('You woke at 7:00 AM.');
  await expect(card).toContainText('After a shorter night the window is an hour shorter.');
  await expect(card).toContainText('not medical advice');
  await expect(card.getByRole('link', {name: 'Start a focus session'})).toHaveAttribute('href', '/app/journey#focus');
  await card.getByRole('button', {name: 'Turn off'}).click();
  await expect(card).toHaveCount(0);
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:ui-prefs:v1') ?? 'null'));
  expect(prefs.focusWindow).toBe(false);
  await page.goto('/app/health?view=sleep');
  const toggle = page.getByLabel('Show my best focus window on Today (an estimate from my sleep)');
  await expect(toggle).not.toBeChecked();
  await toggle.click();
  await expect(toggle).toBeChecked();
});
