import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from './ah-helpers';
import {SCALES_KEY} from '../lib/scales/store';

/**
 * Session AK (BUILD list 2 #12, lane G1a): your own 1–5 scales. Fresh start on the Journal: the empty state teaches, a
 * suggested scale is added and rated (skippable: Clear leaves the day unknown), it is a factor and an outcome in Health →
 * Insights → Compare, and removing it keeps its ratings. The Showcase shows its labelled example (once the lead writes
 * `showcaseScales`). Offline, fixed date, UTC.
 */
const TODAY = '2026-11-04';
test.use({timezoneId: 'UTC'});
type Stored = {scales: {id: string; name: string}[]; days: Record<string, Record<string, number>>; retired?: {id: string}[]};
const read = async (page: Page) => JSON.parse((await page.evaluate(k => localStorage.getItem(k), SCALES_KEY)) ?? 'null') as Stored | null;

test('fresh start: add, rate, clear, compare, remove with the history kept', async ({page}) => {
  await page.clock.install({time: new Date(`${TODAY}T09:00:00.000Z`)});
  await offlineApi(page);
  await freshDevice(page);
  await page.goto('/app/journal');
  await hydrated(page);
  const section = page.locator('#your-scales');
  await expect(section.getByText(/Add a 1–5 scale for something you want to follow/)).toBeVisible();
  await section.getByRole('group', {name: 'Ideas'}).getByRole('button', {name: 'Stress'}).click();
  await expect(section.getByLabel('Word for 5')).toHaveValue('very tense');
  await section.getByRole('button', {name: 'Add scale'}).click();
  await expect(section.getByRole('status')).toContainText('Added “Stress”.');
  const row = section.getByRole('group', {name: 'Stress'});
  await row.getByText('4', {exact: true}).click();
  await expect(section.getByRole('status')).toContainText('Stress: 4 of 5');
  await expect.poll(async () => (await read(page))?.days[TODAY]).toEqual({stress: 4});
  await row.getByRole('button', {name: 'Clear'}).click();
  await expect.poll(async () => (await read(page))?.days[TODAY]).toBeUndefined();
  await row.getByText('2', {exact: true}).click();
  await expect.poll(async () => (await read(page))?.days[TODAY]).toEqual({stress: 2});

  await page.goto('/app/health?tab=insights');
  await hydrated(page);
  await page.getByText('Compare: does one thing go with another?').click();
  await expect(page.getByRole('combobox', {name: 'On days with…'}).locator('optgroup[label="Your scales"] option')).toHaveText('Rated “Stress” 4 or 5 (toward “very tense”)');

  await page.goto('/app/journal');
  await hydrated(page);
  await section.getByRole('button', {name: 'Remove Stress'}).click();
  await expect(section.getByRole('status')).toContainText('Its ratings stay');
  await expect.poll(async () => { const r = await read(page); return [r?.scales.length, r?.days[TODAY], r?.retired?.[0]?.id]; }).toEqual([0, {stress: 2}, 'stress']);
});

test('the Showcase shows its labelled example scales', async ({page}) => {
  await offlineApi(page);
  await loadShowcase(page);
  await page.goto('/app/journal');
  await hydrated(page);
  await expect(page.locator('#your-scales').getByText('Showcase: fictional example scales.')).toBeVisible();
  await expect(page.locator('#your-scales').getByRole('group', {name: 'Stress (Showcase)'})).toBeVisible();
});
