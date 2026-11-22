import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {hydrated} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';
import {ENERGY_KEY} from '../lib/energy/schema';

/**
 * Session AV lane 2 (journal; LEDGER #177, Daylio's PDF export): Settings → Your data → Make a report has a "Private" part,
 * "Journal entries, as written", off on every open; ticked, the report holds a Journal section with each entry's day,
 * words, tags and that day's feeling word and energy. At 390 and 1440, in Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320. Fictional records.
 */
test.use({timezoneId: 'UTC'});
const journal = {version: 1, shareWithAi: false, followUps: true, entries: [{id: 'e1', date: '2026-11-10', text: 'A fictional long walk, as written.', createdAt: '2026-11-10T20:00:00.000Z', tags: ['outdoors']}]};
const energy = {version: 1, days: {'2026-11-10': {energy: 4, at: '2026-11-10T20:00:00.000Z'}}, words: {'2026-11-10': {energy: 'high', pleasantness: 'pleasant', word: 'calm', at: '2026-11-10T20:00:00.000Z'}}};
for (const theme of THEMES) test(`${theme}: the journal in the report, only when included`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-14T10:00:00Z')});
  await page.addInitScript(() => { window.print = () => undefined; });
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([a, av, b, bv]) => { localStorage.setItem(a, av); localStorage.setItem(b, bv); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [JOURNAL_KEY, JSON.stringify(journal), ENERGY_KEY, JSON.stringify(energy)] as const);
  await page.goto('/app/settings/data'); await hydrated(page);
  await page.getByRole('button', {name: 'Make a report'}).click();
  const builder = page.locator('.report-builder');
  const box = builder.getByRole('group', {name: 'Private'}).getByRole('checkbox', {name: /^Journal entries, as written/});
  await expect(box).not.toBeChecked();
  // Without it, the report has no Journal section.
  await builder.getByRole('button', {name: 'Show the report'}).click();
  let sheet = page.getByRole('article', {name: 'Report'});
  await expect(sheet.getByRole('heading', {level: 2, name: 'Journal', exact: true})).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', {name: 'Close'}).click();
  await box.check();
  const findings = await axe(page, builder);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await builder.getByRole('button', {name: 'Show the report'}).click();
  sheet = page.getByRole('article', {name: 'Report'});
  const section = sheet.getByRole('region', {name: 'Journal'});
  await expect(section).toContainText('A fictional long walk, as written.');
  await expect(section).toContainText('feeling: calm');
  await expect(section).toContainText('energy 4 of 5');
  await expect(section).toContainText('#outdoors');
  const shown = await axe(page, sheet);
  expect(shown.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(shown)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
