import {expect, test, type Page} from '@playwright/test';
import {applyTheme, THEMES} from './p6-helpers';
import {hydrated, offlineApi} from './ah-helpers';
import {openAllSettingsGroups} from './settings-open';
import {fixtureHabits} from './checklist-fixtures';
import {HABITS_KEY} from '../lib/habits';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';

/**
 * Friend-readiness (FR-MAX-10): after Erase everything, a restore starts with every part set to come back (Merge) and says
 * so, so the backup comes back with one tick and one tap; on a device that still holds records the safe start stays:
 * every part "Leave as it is", nothing to restore until a part is chosen. Fictional records; three themes, 390 and 1440.
 */
const value = (page: Page, key: string) => page.evaluate(k => localStorage.getItem(k), key);
async function exportZip(page: Page): Promise<Buffer> {
  await page.goto('/app/settings'); await hydrated(page); await openAllSettingsGroups(page);
  const section = page.getByRole('region', {name: 'Everything you’ve saved, in one file.', exact: true});
  await section.getByLabel('I understand this file is readable and holds my personal records, including Health.').check();
  const waiting = page.waitForEvent('download');
  await section.getByRole('button', {name: 'Export everything', exact: true}).click();
  const chunks: Buffer[] = [];
  for await (const chunk of await (await waiting).createReadStream()) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
async function seed(page: Page) {
  await offlineApi(page);
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    [HABITS_KEY]: JSON.stringify(fixtureHabits()), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}),
  });
}
async function openPreview(page: Page, zip: Buffer) {
  await page.goto('/app/settings/data'); await hydrated(page); await openAllSettingsGroups(page);
  const region = page.getByRole('region', {name: 'Restore from a backup'});
  await region.getByLabel('Export everything ZIP').setInputFiles({name: 'zigoals-export.zip', mimeType: 'application/zip', buffer: zip});
  const preview = region.getByLabel('What this backup holds');
  await expect(preview.getByRole('combobox').first()).toBeVisible({timeout: 20_000});
  return {region, preview};
}
const modes = (preview: ReturnType<Page['locator']>) => preview.getByRole('combobox').evaluateAll(s => [...new Set(s.map(x => (x as HTMLSelectElement).value))]);

for (const theme of THEMES) test.describe(theme, () => {
  test.beforeEach(async ({page, isMobile}) => { await applyTheme(page, theme); if (!isMobile) await page.setViewportSize({width: 1440, height: 900}); });

  test('after Erase everything every part starts as Merge, said once; one tick and one tap bring the backup back', async ({page}) => {
    test.setTimeout(120_000);
    await seed(page);
    const habits = await value(page, HABITS_KEY), zip = await exportZip(page);
    await page.goto('/app/settings#erase-everything'); await hydrated(page); await openAllSettingsGroups(page);
    const erase = page.locator('#erase-everything');
    await erase.getByRole('button', {name: 'Erase everything…', exact: true}).click();
    await erase.getByLabel('Type ERASE to confirm').fill('ERASE');
    await erase.getByRole('button', {name: 'Erase everything', exact: true}).click();
    await expect(erase.getByRole('status')).toContainText(/^Erased \d+ records and \d+ stores from this browser\./, {timeout: 20_000});
    const {region, preview} = await openPreview(page, zip);
    await expect(preview.getByRole('note')).toHaveText('This device holds none of these records yet, so every part is set to come back (Merge). Change any part before you restore.');
    expect(await modes(preview)).toEqual(['merge']);
    const go = preview.getByRole('button', {name: 'Restore the chosen parts'});
    await expect(go).toBeDisabled();
    await preview.getByLabel(/I checked my choices/).check();
    await go.click();
    await expect(region.locator('.restore-backup').getByRole('status').filter({hasText: 'Restored:'})).toContainText('Habits', {timeout: 20_000});
    expect(JSON.parse((await value(page, HABITS_KEY))!)).toEqual(JSON.parse(habits!));
    await page.setViewportSize({width: 320, height: 720});
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });

  test('on a device that still holds records the safe start stays: Leave as it is, and no note', async ({page}) => {
    test.setTimeout(90_000);
    await seed(page);
    const zip = await exportZip(page);
    await page.evaluate(k => localStorage.removeItem(k), HABITS_KEY);
    const {preview} = await openPreview(page, zip);
    await expect(preview.getByRole('group', {name: 'Habits'})).toContainText('This device: Nothing here yet');
    await expect(preview.getByRole('note')).toHaveCount(0);
    expect(await modes(preview)).toEqual(['leave']);
    await expect(preview.getByLabel(/I checked my choices/)).toBeDisabled();
    await expect(preview.getByRole('button', {name: 'Restore the chosen parts'})).toBeDisabled();
  });
});
