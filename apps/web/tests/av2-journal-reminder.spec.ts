import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (journal; LEDGER #40, Day One's journaling reminders and streaks): Journal → Entries → "Reminder to
 * write" keeps a time and weekdays in the journal record; the card says plainly that notifications are off on this
 * device; the streak line says what a few lines today do; (Settings → Notifications' own switch is pinned in lib/notify/av2-journal-notify.test.ts.) At 390 and
 * 1440, in Nebula, Light and Dark, axe-clean, focus kept, no sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const read = (page: Page) => page.evaluate(k => (JSON.parse(localStorage.getItem(k) ?? 'null') as {reminder?: unknown} | null)?.reminder, JOURNAL_KEY);
for (const theme of THEMES) test(`${theme}: a reminder to write, and the streak line`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(k => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({version: 1, shareWithAi: false, followUps: true, entries: [
    {id: 'e1', date: '2026-11-21', text: 'A fictional walk.', createdAt: '2026-11-21T20:00:00.000Z'},
    {id: 'e2', date: '2026-11-22', text: 'A fictional quiet day.', createdAt: '2026-11-22T20:00:00.000Z'}]})); }, JOURNAL_KEY);
  await page.goto('/app/journal'); await hydrated(page);
  const entries = page.getByRole('region', {name: 'Entries'});
  await expect(entries.getByText('Write today to make it 3 days in a row.')).toBeVisible();
  const fold = entries.locator('details.journal-reminder-fold');
  await expect(fold.locator('summary')).toContainText('Reminder to write · off');
  await fold.locator('summary').click();
  const on = fold.getByRole('checkbox', {name: 'Remind me to write'});
  await expect(on).not.toBeChecked();
  await on.check();
  await expect.poll(() => read(page)).toEqual({on: true, time: '21:00', days: 127});
  await fold.getByLabel('At').fill('20:30');
  const days = fold.getByRole('group', {name: 'On these days'});
  await days.getByRole('button', {name: 'Saturday'}).click();
  await expect(days.getByRole('button', {name: 'Saturday'})).toHaveAttribute('aria-pressed', 'false');
  await expect(days.getByRole('button', {name: 'Saturday'})).toBeFocused();
  await days.getByRole('button', {name: 'Sunday'}).click();
  await expect.poll(() => read(page)).toEqual({on: true, time: '20:30', days: 31});
  await expect(fold.getByText('A reminder to write at 20:30, on weekdays, unless you already wrote that day.')).toBeVisible();
  await expect(fold.getByText(/Notifications are off on this device/)).toBeVisible();
  await expect(fold.locator('summary')).toContainText('20:30, on weekdays');
  const findings = await axe(page, fold);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
