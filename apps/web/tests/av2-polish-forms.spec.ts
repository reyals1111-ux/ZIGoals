import {expect, test} from '@playwright/test';
import {boxBesideWords, go, noSideways, start} from './av2-polish-helpers';
import {THEMES} from './p6-helpers';

/**
 * Session AV lane 2 (polish P-2): a checkbox and its words share one row. The page-wide `label` rule stacks a label's
 * parts (a field's name over its input); these labels hold a box first and had it on a line of its own above the step,
 * the time and the words. Measured: the box's middle falls on the first line of the words, which start to its right —
 * Sleep's evening plan and morning steps and "Show my best focus window", Budgets' "On Today" switch and a Journal switch,
 * at 390 and 1440, in Nebula, Light and Dark; nothing scrolls sideways at 320.
 */
test.use({timezoneId: 'Europe/Amsterdam'});

for (const theme of THEMES) for (const width of [390, 1440]) test(`${theme} ${width}: checkbox labels keep the box beside its words`, async ({page}) => {
  test.setTimeout(90_000);
  await start(page, {theme, width});
  await go(page, '/app/health?view=sleep');
  const evening = page.locator('.evening-steps label');
  await expect(evening.first()).toBeVisible({timeout: 15_000});
  for (const label of (await evening.all()).slice(0, 3)) await boxBesideWords(label);
  const morning = page.locator('.morning-steps label').first();
  await expect(morning).toBeAttached();
  await boxBesideWords(morning);
  const focus = page.locator('label.check-row').filter({hasText: /focus window/i}).first();
  await expect(focus).toBeAttached();
  await boxBesideWords(focus);
  await noSideways(page);

  await go(page, '/app/wealth?view=budgets');
  const onToday = page.locator('label.budgets-today-switch');
  await expect(onToday).toBeAttached({timeout: 15_000});
  await onToday.scrollIntoViewIfNeeded();
  await boxBesideWords(onToday);
  await noSideways(page);

  // The sweep's other stacked labels: Journal's switches and thought traps, the money search's "Only marked …".
  await go(page, '/app/journal');
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => { (d as HTMLDetailsElement).open = true; }));
  const journalSwitch = page.locator('label.switch-row').first();
  await expect(journalSwitch).toBeAttached({timeout: 15_000});
  await journalSwitch.scrollIntoViewIfNeeded();
  await boxBesideWords(journalSwitch);
});
