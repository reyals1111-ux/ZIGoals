import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';
import {JOURNAL_DISPLAY_KEY} from '../lib/on-this-day/store';

/**
 * Session AV lane 2 (r4-mind; LEDGER #309, Journey's throwbacks): "On this day" shows a year ago, a month ago and a week
 * ago side by side; Privacy's opt-in "Tell me in the morning when there is a memory" is off until switched on (stored as
 * `memoryNotify`), and goes away while "On this day" is hidden. At 390 and 1440, Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const display = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as {memoryNotify?: boolean} | null, JOURNAL_DISPLAY_KEY);
for (const theme of THEMES) test(`${theme}: a week, a month and a year back`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(k => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({version: 1, shareWithAi: false, followUps: false, entries: [
    {id: 'y', date: '2025-11-22', text: 'A fictional first day at the new job.', createdAt: '2025-11-22T20:00:00.000Z'},
    {id: 'm', date: '2026-10-22', text: 'A fictional autumn walk.', createdAt: '2026-10-22T20:00:00.000Z'},
    {id: 'w', date: '2026-11-15', text: 'A fictional Sunday with friends.', createdAt: '2026-11-15T20:00:00.000Z'},
    // Review B4D-4: a letter written a week ago to open next year stays folded away, never a memory.
    {id: 'l', date: '2026-11-15', text: 'Dear future me, a fictional letter.', createdAt: '2026-11-15T21:00:00.000Z', template: 'letter-future-you', opensOn: '2027-11-15'}]})); }, JOURNAL_KEY);
  await page.goto('/app/journal'); await hydrated(page);
  const memory = page.locator('details.on-this-day');
  await expect(memory.locator('summary')).toContainText('1 year ago and 2 more');
  const items = memory.getByRole('listitem');
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText('1 year ago');
  await expect(items.nth(1)).toContainText('A month ago');
  await expect(items.nth(2)).toContainText('A week ago');
  await expect(items.nth(2)).toContainText('A fictional Sunday with friends.');
  await expect(memory).not.toContainText('Dear future me');
  let findings = await axe(page, memory);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  const privacy = page.locator('section[aria-labelledby="journal-privacy"]');
  const morning = privacy.getByRole('checkbox', {name: /^Tell me in the morning when there is a memory/});
  await expect(morning).not.toBeChecked();
  await morning.check();
  await expect.poll(async () => (await display(page))?.memoryNotify).toBe(true);
  findings = await axe(page, privacy);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await privacy.getByRole('checkbox', {name: /^Show “On this day”/}).uncheck();
  await expect(morning).toHaveCount(0);
  await expect(page.locator('details.on-this-day')).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
