import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (journal; LEDGER #38, Day One's Prompt Packs): Journal → Write → "Prompt packs" switches a pack on
 * (kept in the journal record), its questions take turns with the everyday ones as today's question ("Another question"
 * reaches one, labelled with its pack), and any of its questions goes into the entry with one press; in Dutch with "In
 * het Nederlands". At 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. The API offline.
 */
test.use({timezoneId: 'UTC'});
const packs = (page: Page) => page.evaluate(k => (JSON.parse(localStorage.getItem(k) ?? 'null') as {packs?: string[]} | null)?.packs, JOURNAL_KEY);
for (const theme of THEMES) test(`${theme}: prompt packs to switch on`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.goto('/app/journal'); await hydrated(page);
  const form = page.getByRole('form', {name: 'Write in your journal'});
  await form.locator('details.prompt-packs-fold > summary').click();
  const list = form.getByRole('list', {name: 'Prompt packs'});
  await list.getByRole('checkbox', {name: /^Sleep/}).check();
  await expect.poll(() => packs(page)).toEqual(['sleep']);
  await expect(form.locator('details.prompt-packs-fold > summary')).toContainText('1 on');
  const findings = await axe(page, form.locator('details.prompt-packs-fold'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // Today's question: the everyday one and the Sleep pack take turns; one of two steps names the pack.
  const question = form.getByRole('group', {name: 'Today’s question'});
  const labels: string[] = [];
  for (let i = 0; i < 2; i++) { labels.push(await question.locator('.fine').first().innerText()); await question.getByRole('button', {name: 'Another question'}).click(); }
  expect(labels.some(l => l.includes('Sleep pack'))).toBe(true);
  // One of the pack's questions, straight into the entry.
  const sleep = list.locator('li.prompt-pack').filter({hasText: 'Sleep'});
  await sleep.locator('details.prompt-pack-questions > summary').click();
  await sleep.getByRole('button', {name: 'Use this question: How did you sleep last night, in a few words?'}).click();
  await expect(form.getByLabel('Today’s entry')).toHaveValue('How did you sleep last night, in a few words?\n');
  await form.getByLabel('Today’s entry').fill('');
  // In Dutch: the packs follow the question's language.
  await form.getByRole('group', {name: 'Today’s question'}).getByRole('button', {name: 'In het Nederlands'}).click();
  await expect(list.getByRole('checkbox', {name: /^Slaap/})).toBeChecked();
  await list.getByRole('checkbox', {name: /^Slaap/}).uncheck();
  await expect.poll(() => packs(page)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
