import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-GOOD-THINGS; Day One, Finch): "Three good things" on the Journal page — two lines
 * saved as one journal entry from the template, the month's count in the fold's title — at 390 and 1440, in Nebula, Light
 * and Dark, axe-clean, no sideways scroll at 320. Fictional data; every /api call answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: two good things saved as one entry and counted for the month`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T20:00:00+01:00')});
  await page.goto('/app/journal'); await settle(page);
  const fold = page.locator('details.good-things-fold');
  await expect(fold.locator('summary')).toContainText('Three good things · None this month yet');
  // Session AV (1c, q4 #4, deliberate): the fold is open at the top of Write (it was closed below "Save entry").
  await expect(fold).toHaveAttribute('open', '');
  expect(await page.evaluate(() => { const f = document.querySelector('details.good-things-fold'), w = document.querySelector('form[aria-label="Write in your journal"]'); return !!f && !!w && !!(f.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING); })).toBe(true);
  const form = page.getByRole('form', {name: 'Three good things'});
  await form.getByLabel('A good thing today').fill('Fictional coffee with Sam');
  await form.getByLabel('One more').fill('A walk in the fictional park');
  const findings = await axe(page, fold);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await form.getByRole('button', {name: 'Save good things'}).click();
  await expect(fold.getByRole('status')).toHaveText('Saved 2 good things in your journal, on this device.');
  await expect(fold.locator('summary')).toContainText('2 good things this month, on 1 day');
  await expect(form.getByLabel('A good thing today')).toHaveValue('');
  const saved = await page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:journal:v1') ?? '{"entries":[]}').entries as {text: string; template?: string; date: string}[]));
  expect(saved).toEqual([expect.objectContaining({date: '2026-11-23', template: 'three-good-things', text: 'A good thing today: Fictional coffee with Sam\nAnother good thing: A walk in the fictional park'})]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

/** Session AV (1c, q4 #4): Today's journal card links to Three good things, and the first line takes the cursor. */
test('Today’s link to Three good things puts the cursor in the first line', async ({page}) => {
  await offline(page);
  await page.clock.install({time: new Date('2026-11-23T20:00:00+01:00')});
  await page.goto('/app/journal#good-things'); await settle(page);
  await expect(page.getByRole('form', {name: 'Three good things'}).getByLabel('A good thing today')).toBeFocused();
});
