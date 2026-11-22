import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {seedDevice} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #230, #231, Reflectly): off by default, Today's journal card shows no challenge
 * (no extra Tab stop); switched on in Journal → Privacy, the card shows today's small challenge with Done (kept as today's
 * own mark, never a count) and Another one, in Dutch with the daily question. Journal → Write → "Write it out": typed
 * words are never stored; Let it go clears them with a calm line and focus stays on the page; Keep as an entry makes one
 * ordinary entry. At 390 and 1440, three themes, axe-clean, no sideways scroll at 320.
 */
const words = 'Fictional: the train was late again and I am fed up.';
const stored = (page: import('@playwright/test').Page) => page.evaluate(() => Object.keys(localStorage).map(k => localStorage.getItem(k) ?? '').join('\n') + Object.keys(sessionStorage).map(k => sessionStorage.getItem(k) ?? '').join('\n'));

for (const theme of THEMES) test(`${theme}: a small daily challenge on Today; a page to write and let go`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[JOURNAL_KEY]: {version: 1, shareWithAi: false, followUps: true, entries: []}});
  await page.goto('/app#for-you-journal'); await hydrated(page);
  const card = page.locator('.today-journal-card');
  await expect(card.getByRole('heading', {name: 'How was today?'})).toBeVisible();
  await expect(card.getByRole('group', {name: 'Today’s small challenge'})).toHaveCount(0);

  // Switch it on in Journal → Privacy.
  await page.goto('/app/journal'); await hydrated(page);
  await page.getByRole('region', {name: 'Privacy'}).getByRole('checkbox', {name: /^Show a small daily challenge on Today/}).check();
  await expect.poll(() => page.evaluate(k => (JSON.parse(localStorage.getItem(k) ?? '{}') as {challenges?: boolean}).challenges, JOURNAL_KEY)).toBe(true);

  // Write it out: never stored; Let it go clears it.
  const write = page.getByRole('region', {name: 'Write'});
  await write.locator('.write-it-out-fold > summary').click();
  const pageBox = write.getByRole('textbox', {name: 'Write it out'});
  await pageBox.fill(words);
  expect(await stored(page)).not.toContain('train was late');
  const findings = await axe(page, write);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await write.getByRole('button', {name: 'Let it go'}).click();
  await expect(pageBox).toHaveValue('');
  await expect(write.locator('.write-it-out-closing')).toHaveText(/Nothing was (?:kept|saved)|gone/);
  await expect(pageBox).toBeFocused();
  expect(await stored(page)).not.toContain('train was late');
  // Keep as an entry: one ordinary entry.
  await pageBox.fill('Fictional: kept on purpose.');
  await write.getByRole('button', {name: 'Keep as an entry'}).click();
  await expect(write.locator('.write-it-out-closing')).toHaveText('Kept as an ordinary journal entry for today.');
  const entries = await page.evaluate(k => (JSON.parse(localStorage.getItem(k)!) as {entries: {text: string; template?: string}[]}).entries, JOURNAL_KEY);
  expect(entries.map(e => [e.text, e.template])).toEqual([['Fictional: kept on purpose.', 'write-it-out']]);
  expect(await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.write-it-out p, .write-it-out label span')].filter(e => e.offsetParent && (e.textContent ?? '').trim() && parseFloat(getComputedStyle(e).fontSize) < 14).length)).toBe(0);

  // Today: the challenge with Done and Another one.
  await page.goto('/app#for-you-journal'); await hydrated(page);
  const line = page.locator('.today-journal-card').getByRole('group', {name: 'Today’s small challenge'});
  await expect(line).toBeVisible();
  const first = await line.locator('.today-affirmation-text').innerText();
  expect(first).toMatch(/\.$/);
  await line.getByRole('button', {name: 'Another one'}).click();
  await expect(line.locator('.today-affirmation-text')).not.toHaveText(first);
  await expect(line.getByRole('button', {name: 'Another one'})).toBeFocused();
  await line.getByRole('button', {name: 'Done'}).click();
  await expect(line.getByRole('button', {name: 'Done ✓'})).toHaveAttribute('aria-pressed', 'true');
  await expect(line.getByRole('status')).toHaveText('Done. Nicely done.');
  const journal = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!) as Record<string, unknown>, JOURNAL_KEY);
  expect(Object.keys(journal).filter(k => /streak|count|score/i.test(k))).toEqual([]);
  expect(journal.challengeDone).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const cardFindings = await axe(page, page.locator('.today-journal-card'));
  expect(cardFindings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(cardFindings)).toEqual([]);
  // In Dutch with the daily question.
  await page.evaluate(() => localStorage.setItem('zigoals:journal-question-lang', 'nl'));
  await page.reload(); await hydrated(page);
  const nl = page.locator('.today-journal-card').getByRole('group', {name: 'Kleine uitdaging van vandaag'});
  await expect(nl.getByRole('button', {name: 'Een andere'})).toBeVisible();
  await expect(nl.locator('[lang="nl"]')).toBeVisible();
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
