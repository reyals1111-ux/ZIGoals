import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {ENERGY_KEY} from '../lib/energy/schema';
import {BRING_UP_KEY} from '../lib/clinician-report/bring-up';

/**
 * Session AV lane 2, round 6 (r6-body; Moodfit, LEDGER #417): a feeling word goes onto "To bring up" in one tap ("Felt
 * tense", with Undo); Settings → Your data → Report for a visit → "To bring up at your next visit" lists it, takes a typed
 * line, prints both at the top of the report ("To bring up"), ticks one off and clears the ticked ones with Undo — at 390
 * and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const lines = (page: Page) => page.evaluate(k => ((JSON.parse(localStorage.getItem(k) ?? 'null') as {items?: {text: string; doneAt?: string}[]} | null)?.items ?? []).map(x => `${x.text}${x.doneAt ? ' ✓' : ''}`), BRING_UP_KEY);
for (const theme of THEMES) test(`${theme}: things to bring up at a visit`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(k => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({version: 1, days: {'2026-11-22': {energy: 2, at: '2026-11-22T08:00:00.000Z'}}})); }, ENERGY_KEY);
  await page.goto('/app/journal'); await hydrated(page);
  await page.getByRole('button', {name: 'Add a feeling word (optional)'}).click();
  const grid = page.locator('section.mood-words');
  await grid.getByRole('button', {name: 'High energy, unpleasant'}).click();
  await grid.getByRole('group', {name: 'Words: High energy, unpleasant'}).getByRole('button', {name: 'tense', exact: true}).click();
  await grid.getByRole('button', {name: 'Bring this up at my next visit'}).click();
  await expect.poll(() => lines(page)).toEqual(['Felt tense']);

  await page.goto('/app/settings/data'); await hydrated(page);
  const launcher = page.locator('.report-launcher');
  await launcher.locator('details.report-bring-up-fold > summary').click();
  const list = launcher.locator('.r6-bring-up');
  await expect(list.getByRole('list', {name: 'To bring up'})).toContainText('Felt tense');
  await list.getByLabel(/Something to bring up/).fill('Ask about the headaches');
  await list.getByRole('button', {name: 'Add', exact: true}).click();
  await expect.poll(() => lines(page)).toEqual(['Felt tense', 'Ask about the headaches']);
  const findings = await axe(page, launcher);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);

  await launcher.getByRole('button', {name: 'Make a report'}).click();
  await expect(launcher.getByLabel(/At the top: what you want to bring up \(2 lines\)/)).toBeChecked();
  await launcher.getByRole('button', {name: 'Show the report'}).click();
  const report = page.getByRole('dialog', {name: 'Report for a visit'});
  const top = report.getByRole('region', {name: 'To bring up'});
  await expect(top.getByRole('listitem')).toHaveText(['Felt tense', 'Ask about the headaches']);
  await report.getByRole('button', {name: 'Close'}).click();

  await list.getByRole('checkbox', {name: /Felt tense/}).check();
  await expect.poll(() => lines(page)).toEqual(['Felt tense ✓', 'Ask about the headaches']);
  await list.getByRole('button', {name: 'Clear the ticked lines (1)'}).click();
  await expect.poll(() => lines(page)).toEqual(['Ask about the headaches']);
  await page.getByRole('button', {name: 'Undo'}).click();
  await expect.poll(() => lines(page)).toEqual(['Felt tense ✓', 'Ask about the headaches']);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
