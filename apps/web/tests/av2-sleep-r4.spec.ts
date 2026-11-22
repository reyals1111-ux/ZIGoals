import {expect, test} from '@playwright/test';
import {createEmptyHealth, HEALTH_STORAGE_KEY} from '../lib/health';
import {withHealthGroup} from '../lib/vault/w-homes';
import type {Sleep} from '../lib/sleep/schema';
import {HEALTH_EXTRAS_KEY} from '../lib/health-extras';
import {addLocalDays} from '../lib/local-date';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV lane 2, round 4 (health; Pillow, LEDGER #333, #334, #335): Health → Sleep shows "Your timing" (weekend nights
 * beside weekday nights, an estimate with its source named); the Health page's Sleep card offers a sleep tip a day (off
 * until chosen, kept on the device, English or Dutch); "Start a nap" counts down, rings at the end and logs the nap with
 * Undo — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional nights.
 */
test.use({timezoneId: 'UTC'});
const TODAY = '2026-11-20', AT = '2026-11-20T08:00:00.000Z';
const weekend = (d: string) => [0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay());
const nights = Array.from({length: 30}, (_, i) => { const wake = addLocalDays(TODAY, -i - 1), prev = addLocalDays(wake, -1), free = weekend(wake);
  return {id: `health_sleep-fictional-${wake}`, kind: 'night', source: 'manual', start: free ? `${wake}T00:30:00.000Z` : `${prev}T23:00:00.000Z`, end: free ? `${wake}T09:30:00.000Z` : `${wake}T07:00:00.000Z`, timeZone: 'UTC', createdAt: AT, updatedAt: AT}; });

for (const theme of THEMES) test(`${theme}: your timing, a sleep tip and the nap timer`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date(`${TODAY}T13:00:00Z`)});
  await page.goto('/app/settings'); await hydrated(page);
  const health = withHealthGroup(createEmptyHealth(), 'sleep', {version: 1, nights} as Sleep, false);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem('zigoals:motion:v1', 'off'); }, [HEALTH_STORAGE_KEY, JSON.stringify(health)] as const);

  // A sleep tip a day on the Health page's Sleep card: off until chosen.
  await page.goto('/app/health'); await hydrated(page);
  const card = page.locator('.sleep-card');
  // On a phone the card sits in its folded row ("Sleep"); open it first.
  const fold = page.locator('.phone-fold-toggle').filter({has: page.getByText('Sleep', {exact: true})});
  if (await fold.count()) await fold.first().click();
  const tipButton = card.getByRole('button', {name: 'Show a sleep tip each day'});
  await expect(tipButton).toHaveAttribute('aria-pressed', 'false');
  await expect(card.getByRole('heading', {name: 'A sleep tip'})).toHaveCount(0);
  await tipButton.click();
  await expect(tipButton).toHaveAttribute('aria-pressed', 'true');
  await expect(card.getByRole('heading', {name: 'A sleep tip'})).toBeVisible();
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).sleepTips, HEALTH_EXTRAS_KEY)).toBe(true);
  await card.getByRole('button', {name: 'In het Nederlands'}).click();
  await expect(card.getByRole('heading', {name: 'Een slaaptip'})).toBeVisible();

  // Your timing: weekend middle 05:00, weekday middle 03:00.
  await page.goto('/app/health?view=sleep'); await hydrated(page);
  const timing = page.getByRole('region', {name: 'Your timing'});
  await expect(timing).toContainText('Middle of sleep, weekend nights');
  await expect(timing).toContainText('5:00 AM');
  await expect(timing).toContainText('3:00 AM');
  await expect(timing).toContainText('On weekends you sleep about 2 h 00 min later than on weekdays.');
  await expect(timing).toContainText('in the middle');
  await expect(timing).toContainText('an estimate from your own nights');
  await timing.getByText('How this is worked out').click();
  await expect(timing).toContainText('Munich ChronoType Questionnaire');
  await expect(timing).toContainText('not medical advice');

  // Start a nap: 20 minutes, counted down, logged at the end with Undo.
  const log = page.getByRole('region', {name: 'Log a night or a nap'});
  const nap = log.getByRole('region', {name: 'Start a nap'});
  await nap.getByRole('button', {name: 'A short nap: 20 min'}).click();
  const running = log.getByRole('region', {name: 'Napping: 20 minutes'});
  await expect(running.getByRole('heading', {name: 'Napping: 20 minutes'})).toBeFocused();
  await expect(running.getByRole('timer')).toHaveAttribute('aria-live', 'off');
  await expect(running.getByRole('timer')).toHaveText('20:00');
  await expect(running).toHaveAttribute('data-motion', 'off');
  const findings = await axe(page, log);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.clock.runFor(20 * 60_000 + 2000);
  await expect(log.getByRole('region', {name: 'Start a nap'}).getByRole('status')).toHaveText('Time to wake up. Nap logged: 1:00 PM–1:20 PM, 20 min.');
  await expect(page.getByRole('region', {name: 'Recent nights and naps'})).toContainText('Nap ending');
  await expect(page.getByRole('button', {name: 'Undo'})).toBeVisible();

  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
