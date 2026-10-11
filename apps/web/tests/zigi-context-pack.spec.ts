import {readFileSync} from 'node:fs';
import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';
import {ZIGI_REMINDERS_KEY} from '../lib/ai/store/keys';

/**
 * Session V Part 5 ([TIER 3], a new export format): Settings → ZIGi · your AI → "Context pack for my AI". Made on the
 * device from the records; nothing leaves the browser; Health only with its gate and its own box; the warning shows
 * before the buttons; Download gives the exact preview; the weekly reminder is a device-only choice.
 */
const DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
async function seed(page: Page, settings: AiSettings | null) {
  await page.addInitScript(() => {
    const w = window as unknown as {__copied: string[]};
    w.__copied = [];
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async (text: string) => { w.__copied.push(text); }}});
  });
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), ...(settings ? {[AI_SETTINGS_KEY]: JSON.stringify(settings)} : {})});
}
async function openPack(page: Page) {
  await page.goto('/app/settings#your-ai');
  const card = page.locator('details.ai-pack');
  await card.locator('summary').click();
  await expect(card.getByRole('note')).toContainText('This file isn\'t encrypted. Anyone and any AI you give it to can read it.');
  return card;
}
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('without any AI connected: choose, preview, download and copy the pack; nothing leaves the browser; Health stays out', async ({page}) => {
  const external: string[] = [];
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:3\d{3})/, route => { external.push(route.request().url()); return route.abort(); });
  await seed(page, null);
  const card = await openPack(page);
  const health = card.getByRole('checkbox', {name: /Health/});
  await expect(health).toBeDisabled(); await expect(health).not.toBeChecked();
  await expect(card).toContainText('Needs Include Health (below the page switches) and Health on Today first.');
  await expect(card.getByRole('combobox', {name: 'Period'})).toHaveValue('90');
  await card.getByText('Preview the exact text').click();
  const preview = card.locator('pre');
  await expect(preview).toContainText('# My ZIGoals context pack');
  await expect(preview).toContainText('from my own records for the last 90 days (2026-06-23 to 2026-09-20)');
  await expect(preview).toContainText('## Habits'); await expect(preview).toContainText('## Goals'); await expect(preview).toContainText('## Wealth');
  await expect(preview).not.toContainText('## Health');
  const shown = await preview.textContent();
  const [download] = await Promise.all([page.waitForEvent('download'), card.getByRole('button', {name: 'Download (.md)'}).click()]);
  expect(download.suggestedFilename()).toBe('zigoals-context-pack-2026-09-20.md');
  const saved = readFileSync((await download.path())!, 'utf8');
  expect(saved).toBe(shown);
  expect(saved).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|health_[a-z0-9-]{6,}|zig1[a-z0-9]{20,}|azig|zigchain-1/i);
  await card.getByRole('button', {name: 'Copy'}).click();
  expect(await page.evaluate(() => (window as unknown as {__copied: string[]}).__copied)).toEqual([saved]);
  // Fewer areas, a shorter period: the text follows at once.
  await card.getByRole('checkbox', {name: 'Wealth'}).uncheck();
  await card.getByRole('combobox', {name: 'Period'}).selectOption('30');
  await expect(preview).not.toContainText('## Wealth'); await expect(preview).toContainText('for the last 30 days (2026-08-22 to 2026-09-20)');
  const [json] = await Promise.all([page.waitForEvent('download'), card.getByRole('button', {name: 'Download as JSON'}).click()]);
  expect(json.suggestedFilename()).toBe('zigoals-context-pack-2026-09-20.json');
  expect(JSON.parse(readFileSync((await json.path())!, 'utf8'))).toMatchObject({format: 'zigoals-context-pack', version: 1, range: {days: 30}});
  // The weekly reminder is a choice kept on this device.
  await card.getByRole('checkbox', {name: /Remind me each week/}).check();
  expect(JSON.parse((await page.evaluate(k => localStorage.getItem(k), ZIGI_REMINDERS_KEY))!)).toMatchObject({version: 1, packRefresh: {weekday: 0, time: '18:00'}});
  expect(external).toEqual([]);
  expect(await page.evaluate(k => localStorage.getItem(k), AI_SETTINGS_KEY)).toBeNull();
});

test('with the Health gate open, Health is still off until its own box is ticked', async ({page}) => {
  const base = defaultAiSettings();
  await seed(page, {...base, enabled: true, mode: 'subscription', subscriptionApp: 'claude', includeHealth: true, pageShare: {...base.pageShare, health: true}});
  const card = await openPack(page);
  const health = card.getByRole('checkbox', {name: /Health/});
  await expect(health).toBeEnabled(); await expect(health).not.toBeChecked();
  await card.getByText('Preview the exact text').click();
  await expect(card.locator('pre')).not.toContainText('## Health');
  await health.check();
  await expect(card.locator('pre')).toContainText('## Health');
  await expect(card.locator('pre')).toContainText('### Fasts (a list; ZIGoals keeps no fasting totals or streaks)');
});
