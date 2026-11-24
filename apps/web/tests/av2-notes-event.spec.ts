import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r5-notes; LEDGER #364, Craft's notes for a calendar event): an imported event on the Agenda has
 * "Notes for this event"; the first tap makes a note named after the event and its day, linked to that day's daily note,
 * and opens it; back on the Agenda the row names the note and opens the same one. Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320.
 */
test.use({timezoneId: 'UTC'});
const ICS = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fictional//EN', 'X-WR-CALNAME:Fictional family',
  'BEGIN:VEVENT', 'UID:swim-1@example.invalid', 'SUMMARY:Fictional swim', 'DTSTART:20261104T173000', 'DURATION:PT45M', 'END:VEVENT',
  'END:VCALENDAR', ''].join('\r\n');
const stored = (page: import('@playwright/test').Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{"notes":[]}'), NOTES_KEY);
for (const theme of THEMES) test(`${theme}: a note for a calendar event`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-04T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.goto('/app/agenda?view=week'); await hydrated(page);
  const panel = page.getByRole('region', {name: 'Import a calendar'});
  await panel.getByRole('button', {name: 'Choose a calendar file'}).click();
  await panel.getByLabel('Choose an .ics file').setInputFiles({name: 'family.ics', mimeType: 'text/calendar', buffer: Buffer.from(ICS)});
  await panel.getByRole('button', {name: 'Add to agenda'}).click();
  const swim = page.locator('.agenda-event').filter({hasText: 'Fictional swim'});
  await expect(swim.getByRole('button', {name: 'Notes for this event: Fictional swim'})).toBeVisible();
  const findings = await axe(page, swim);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await swim.getByRole('button', {name: 'Notes for this event: Fictional swim'}).click();
  await expect(page).toHaveURL(/\/app\/notes\?note=/);
  await expect(page.getByRole('region', {name: 'Open note'}).getByRole('heading', {name: 'Fictional swim · 2026-11-04'})).toBeVisible();
  await expect.poll(async () => (await stored(page)).notes.map((n: {title: string; body: string}) => [n.title, n.body])).toEqual([['Fictional swim · 2026-11-04', '[[2026-11-04]]\n\n']]);
  // A second tap opens the same note.
  await page.goto('/app/agenda?view=week'); await hydrated(page);
  await swim.getByRole('button', {name: 'Open the note “Fictional swim · 2026-11-04”'}).click();
  await expect(page).toHaveURL(/\/app\/notes\?note=/);
  await expect.poll(async () => (await stored(page)).notes.length).toBe(1);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
