import {expect, test} from '@playwright/test';
import {health, healthRecord, openHealth, stored} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {LOW_DAY_KEY} from '../lib/calm/low-day';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2, round 6 (r6-body; Moodfit, LEDGER #414, #416): Health → Meditation. "Five, four, three, two, one"
 * walks the five senses one at a time (focus on each step's heading), a step can be skipped, Dutch on request, and the
 * words are kept only when saved as a journal line. /app/health?view=meditation#low-day opens "On a low day": the
 * person's own lines in three parts and a line of their own, kept as `zigoals:low-day:v1`, removed with Undo, with the
 * help lines under it — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'UTC'});
for (const theme of THEMES) test(`${theme}: grounding and the low-day page`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, healthRecord(health()), '/app/health?view=meditation#low-day');

  // On a low day: opened by its address.
  const low = page.locator('details#low-day');
  await expect(low).toHaveAttribute('open', '');
  await expect(low).toContainText('Nothing written yet.');
  await low.getByLabel(/Add something that helps/).fill('A shower');
  await low.getByRole('button', {name: 'Add to “Small things that help me”'}).click();
  await low.getByLabel(/Add a person/).fill('Sam: “Can we talk for ten minutes?”');
  await low.getByLabel(/Add a person/).press('Enter');
  await low.getByLabel(/Add something that can wait/).fill('The inbox');
  await low.getByRole('button', {name: 'Add to “Things that can wait for another day”'}).click();
  await low.getByRole('button', {name: 'Write a line for yourself'}).click();
  await low.getByRole('textbox', {name: /A line for yourself/}).fill('This passes.');
  await low.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(() => stored(page, LOW_DAY_KEY)).toMatchObject({version: 1, helps: ['A shower'], people: ['Sam: “Can we talk for ten minutes?”'], later: ['The inbox'], note: 'This passes.'});
  await expect(low).toContainText('113');
  await expect(low).toContainText('findahelpline.com');
  await expect(low).toContainText('never sent to ZIGi’s AI');
  let findings = await axe(page, low);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await low.getByRole('button', {name: 'Remove “The inbox”'}).click();
  await expect.poll(async () => (await stored<{later?: string[]}>(page, LOW_DAY_KEY))?.later).toBeUndefined();
  await page.getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => (await stored<{later?: string[]}>(page, LOW_DAY_KEY))?.later).toEqual(['The inbox']);

  // Grounding: five senses, one at a time.
  const fold = page.locator('details.r6-grounding-fold');
  await fold.locator('summary').click();
  await expect(fold.getByRole('heading', {name: /Five things you can see/})).toBeVisible();
  await fold.getByLabel('A word 1 / 5').fill('lamp');
  await fold.getByRole('button', {name: 'Next'}).click();
  await expect(fold.getByRole('heading', {name: /Four things you can touch/})).toBeFocused();
  await fold.getByRole('button', {name: 'Skip this one'}).click();
  await fold.getByLabel('A word 1 / 3').fill('rain');
  await fold.getByRole('button', {name: 'Next'}).click();
  await fold.getByRole('button', {name: 'Next'}).click();
  await fold.getByLabel('A word 1').fill('tea');
  await fold.getByRole('button', {name: 'Next'}).click();
  await expect(fold).toContainText('See: lamp · Hear: rain · Taste: tea');
  expect(await stored(page, JOURNAL_KEY)).toBeNull();
  await fold.getByRole('button', {name: 'Save these words as a journal line'}).click();
  await expect.poll(async () => (await stored<{entries?: {text: string}[]}>(page, JOURNAL_KEY))?.entries?.map(e => e.text)).toEqual(['Five, four, three, two, one — See: lamp · Hear: rain · Taste: tea']);
  await fold.getByRole('button', {name: 'Start again'}).click();
  await fold.getByRole('button', {name: 'In het Nederlands'}).click();
  await expect(fold.getByRole('heading', {name: /Vijf dingen die je ziet/})).toBeVisible();
  findings = await axe(page, fold);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
