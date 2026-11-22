import {expect, test} from '@playwright/test';
import {ENERGY_KEY} from '../lib/energy/schema';
import {health, healthRecord, openHealth, TODAY} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #232, Moodnotes' feelings with a strength): in the Journal's Write, after today's
 * energy, the feeling word fold: "calm" chosen, its strength "quite", then "Add another word" adds "tired" at "a little";
 * the fold's line says "Feeling: calm (quite) · tired (a little)"; the day keeps `word: 'calm'` for older readers. At 390
 * and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
const AT = `${TODAY}T09:00:00.000Z`;
const records = {...healthRecord(health()), [ENERGY_KEY]: {version: 1, days: {[TODAY]: {energy: 3, at: AT}}}};
for (const theme of THEMES) test(`${theme}: several feeling words, each with a strength`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, records, '/app/journal');
  const write = page.getByRole('region', {name: 'Write'});
  await write.getByRole('button', {name: 'Add a feeling word (optional)'}).click();
  const grid = write.getByRole('region', {name: 'A word for how it feels'});
  await grid.getByRole('button', {name: 'Low energy, pleasant'}).click();
  await grid.getByRole('button', {name: 'calm', exact: true}).click();
  await expect(grid.getByRole('status')).toHaveText('Feeling today: calm. Kept on this device.');
  const strengths = grid.getByRole('group', {name: 'Today’s words and how strong each feels'});
  await strengths.getByRole('group', {name: 'How strong: calm'}).getByRole('button', {name: 'quite'}).click();
  await expect(strengths.getByRole('group', {name: 'How strong: calm'}).getByRole('button', {name: 'quite'})).toHaveAttribute('aria-pressed', 'true');
  await strengths.getByRole('button', {name: 'Add another word'}).click();
  await expect(strengths).toContainText('Tap a word above to add it as another feeling.');
  await grid.getByRole('button', {name: 'Low energy, unpleasant'}).click();
  await grid.getByRole('button', {name: 'tired', exact: true}).click();
  await expect(grid.getByRole('status')).toHaveText('Also feeling: tired. Kept on this device.');
  await strengths.getByRole('group', {name: 'How strong: tired'}).getByRole('button', {name: 'a little'}).click();
  const day = await page.evaluate(([k, d]) => JSON.parse(localStorage.getItem(k)!).words[d], [ENERGY_KEY, TODAY] as const);
  expect(day).toMatchObject({word: 'calm', strength: 'quite', more: [{word: 'tired', strength: 'little', energy: 'low', pleasantness: 'unpleasant'}]});
  const findings = await axe(page, grid);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  expect(await grid.evaluate(el => [...el.querySelectorAll<HTMLElement>('.mood-words-strengths button, .mood-words-strengths span, .mood-words-strengths p')].filter(e => e.offsetParent && (e.textContent ?? '').trim() && parseFloat(getComputedStyle(e).fontSize) < 14).length)).toBe(0);
  expect(await grid.evaluate(el => [...el.querySelectorAll<HTMLElement>('.mood-words-strength')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 44).length)).toBe(0);
  await grid.getByRole('button', {name: 'Done', exact: true}).click();
  await expect(write.locator('.mood-words-trigger')).toContainText('Feeling: calm (quite) · tired (a little)');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
