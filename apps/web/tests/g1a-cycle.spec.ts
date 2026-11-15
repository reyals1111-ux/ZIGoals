import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from './ah-helpers';
import {CYCLE_KEY} from '../lib/cycle/store';
import {openSettings} from './settings-open';

/**
 * Session AK (BUILD list 2 #16, lane G1a): the cycle log is hidden by default; turned on in Settings → Your pages &
 * buttons (under Health), it shows in Health → Diary as a fold; a flow, a chip and a note are saved for today; the
 * estimate teaches until three cycles; "Hide the cycle log" hides it and keeps the entries. The Showcase shows its
 * labelled example with an estimate range (once the lead writes `showcaseCycle`). Offline, fixed date, UTC.
 */
const TODAY = '2026-11-04';
test.use({timezoneId: 'UTC'});
const read = async (page: Page) => JSON.parse((await page.evaluate(k => localStorage.getItem(k), CYCLE_KEY)) ?? 'null') as {on?: boolean; days: Record<string, {flow?: string; symptoms?: string[]; note?: string}>} | null;

test('hidden by default; on in Settings; log a day; hide keeps the entries', async ({page}) => {
  await page.clock.install({time: new Date(`${TODAY}T09:00:00.000Z`)});
  await offlineApi(page);
  await freshDevice(page);
  await page.goto('/app/health');
  await hydrated(page);
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.getByText('Cycle log', {exact: true})).toHaveCount(0);

  await openSettings(page);
  await hydrated(page);
  const sw = page.locator('#your-pages').getByRole('switch', {name: 'Cycle log'});
  await expect(sw).not.toBeChecked();
  await sw.check();
  await expect.poll(async () => (await read(page))?.on).toBe(true);

  await page.goto('/app/health');
  await hydrated(page);
  await page.getByText('Cycle log', {exact: true}).click();
  const log = page.locator('#cycle-log');
  await expect(log.getByText('Information for you, not a contraceptive or a diagnosis.')).toBeVisible();
  await expect(log.getByText(/An estimate of the next period shows after 3 complete cycles are logged \(0 so far\)/)).toBeVisible();
  await log.getByRole('group', {name: /^Period flow, today/}).getByRole('button', {name: 'Medium'}).click();
  await log.getByRole('checkbox', {name: 'Cramps'}).check();
  await log.getByLabel('Note (optional)').fill('Fictional: a slow morning');
  await log.getByLabel('Note (optional)').blur();
  await expect.poll(async () => (await read(page))?.days[TODAY]).toEqual({flow: 'medium', symptoms: ['cramps'], note: 'Fictional: a slow morning'});
  await expect(log.getByText('Day 1 since your last logged period began.')).toBeVisible();

  await log.getByRole('button', {name: 'Hide the cycle log'}).click();
  await expect.poll(async () => { const r = await read(page); return [r?.on, !!r?.days[TODAY]]; }).toEqual([false, true]);
  await page.reload();
  await hydrated(page);
  await expect(page.getByText('Cycle log', {exact: true})).toHaveCount(0);
});

test('the Showcase shows its labelled example with an estimate range', async ({page}) => {
  await offlineApi(page);
  await loadShowcase(page);
  await page.goto('/app/health');
  await hydrated(page);
  await page.getByText('Cycle log', {exact: true}).click();
  const log = page.locator('#cycle-log');
  await expect(log.getByText('Showcase: fictional example entries.')).toBeVisible();
  await expect(log.getByText(/^Next period: between /)).toBeVisible();
  await expect(log).toContainText('An estimate from your past cycles');
});
