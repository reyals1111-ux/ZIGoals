import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';

/**
 * Session AV lane 2 (r5-body; Clue, LEDGER #379–#383): in Health's cycle log, "Your cycles" lists each cycle with its
 * length and period length and the averages with their spread, as a list and a table; "Leave out" takes one cycle out of
 * the averages; "A cycle at a glance" shows a cycle as a row of its days with earlier cycles below; "What you track"
 * adds an own word (it then shows as a chip), hides a built-in one, and offers "No period" (the flow buttons and the
 * next-period line hidden) and the perimenopause words. A look back only: never a phase, a fertile window or a forecast.
 * 320 / 390 / 1440 in Nebula, Light and Dark, axe-clean, keyboard. Fictional data; fixed date; offline.
 */
test.use({timezoneId: 'UTC'});
const TODAY = '2026-11-20';
const day = (start: string, i: number) => new Date(Date.parse(`${start}T12:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10);
const record = () => {
  const days: Record<string, unknown> = {};
  for (const [start, n] of [['2026-07-01', 5], ['2026-07-29', 4], ['2026-08-30', 6], ['2026-09-27', 5], ['2026-10-25', 5]] as const) for (let i = 0; i < n; i++) days[day(start, i)] = {flow: i === 0 ? 'heavy' : 'light', ...(i === 0 ? {symptoms: ['cramps']} : {})};
  return JSON.stringify({version: 1, on: true, days});
};
const read = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:cycle:v1') ?? 'null') as {own?: {id: string; word: string}[]; hidden?: string[]; leftOut?: string[]; noPeriod?: true; peri?: true; days: Record<string, {symptoms?: string[]}>});
const clean = async (page: Page) => { const f = await axe(page, page.locator('#cycle-log')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };
async function open(page: Page) {
  await page.goto('/app/health?view=diary'); await settle(page);
  await page.locator('#cycle-log > summary').click();
  return page.locator('#cycle-log');
}

for (const theme of THEMES) for (const width of [320, 390, 1440]) test(`${theme} ${width}: your cycles, a cycle at a glance, your own words, No period`, async ({page}) => {
  await applyTheme(page, theme);
  await offline(page);
  await page.setViewportSize({width, height: 900});
  await page.clock.install({time: new Date(`${TODAY}T09:00:00.000Z`)});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:cycle:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, record());
  const log = await open(page);

  // Your cycles: the list, the averages and their spread; then the table.
  await log.locator('#cycle-history > summary').click();
  const history = log.locator('#cycle-history');
  await expect(history).toContainText('Average cycle');
  await expect(history).toContainText('29 days');
  await expect(history).toContainText('28 days to 32 days, so they vary by 4 days; from 4 cycles');
  await expect(history).toContainText('Average period');
  await expect(history.getByRole('listitem').first()).toContainText('27 days so far (still going)');
  await expect(history).not.toContainText(/fertile|ovulat|phase|predict/i);
  const leave = history.getByRole('button', {name: /^Leave out the cycle from Jul 29\b/});
  await expect(leave).toHaveAttribute('aria-pressed', 'false');
  await leave.click();
  await expect(leave).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await read(page)).leftOut).toEqual(['2026-07-29']);
  await expect(history).toContainText('1 cycle is left out of the averages and the estimate');
  await expect(history).toContainText('from 3 cycles');
  await history.getByRole('button', {name: 'Table'}).click();
  await expect(history.getByRole('table')).toBeVisible();
  await expect(history.getByRole('row', {name: /Jul 29/})).toContainText('32 days');
  await clean(page);

  // A cycle at a glance: the latest cycle first, earlier ones below; marks with letters as well as colour.
  await log.locator('#cycle-glance > summary').click();
  const glance = log.locator('#cycle-glance');
  await expect(glance.getByRole('table')).toBeVisible();
  await expect(glance.getByRole('row')).toHaveCount(1 + 5);
  await expect(glance).toContainText('Key: L light, M medium, H heavy flow');
  await glance.getByText(/day by day$/).click();
  await expect(glance).toContainText('Day 1');
  await expect(glance).toContainText('Heavy flow, Cramps');
  await clean(page);

  // What you track: an own word, a hidden word, No period.
  await log.locator('#cycle-words > summary').click();
  const words = log.locator('#cycle-words');
  await words.getByLabel(/^Add your own word/).fill('Migraine');
  await words.getByLabel(/^Add your own word/).press('Enter');
  await expect.poll(async () => (await read(page)).own).toEqual([{id: 'migraine', word: 'Migraine'}]);
  await expect(log.getByRole('checkbox', {name: 'Migraine'})).toBeVisible();
  await words.getByRole('button', {name: 'Hide Skin changes'}).click();
  await expect.poll(async () => (await read(page)).hidden).toEqual(['acne']);
  await expect(log.getByRole('checkbox', {name: 'Skin changes'})).toHaveCount(0);
  await words.getByRole('button', {name: 'Move Migraine up'}).focus();
  await page.keyboard.press('Enter');
  await expect(words.getByRole('button', {name: 'Move Migraine up'})).toBeFocused();
  // Session AV lane 2 (review B5H-3): at the bottom, focus moves to the word's other button; at the top, the same.
  await words.getByRole('button', {name: 'Move Migraine down'}).focus();
  await page.keyboard.press('Enter');
  await expect(words.getByRole('button', {name: 'Move Migraine down'})).toBeDisabled();
  await expect(words.getByRole('button', {name: 'Move Migraine up'})).toBeFocused();
  await words.getByRole('button', {name: 'Move Headache up'}).focus();
  await page.keyboard.press('Enter');
  await expect(words.getByRole('button', {name: 'Move Headache up'})).toBeDisabled();
  await expect(words.getByRole('button', {name: 'Move Headache down'})).toBeFocused();
  await expect(words.getByRole('listitem').first()).toContainText('Headache');
  await words.getByRole('checkbox', {name: 'Perimenopause words'}).check();
  await expect(log.getByRole('checkbox', {name: 'Hot flushes'})).toBeVisible();
  await words.getByRole('checkbox', {name: 'No period'}).check();
  await expect.poll(async () => (await read(page)).noPeriod).toBe(true);
  await expect(log.getByRole('group', {name: /^Period flow/})).toHaveCount(0);
  await expect(log.getByText(/^Next period:/)).toHaveCount(0);
  await expect(log).toContainText('No period is chosen, so there is no next-period line.');
  await log.getByRole('checkbox', {name: 'Migraine'}).check();
  await expect.poll(async () => (await read(page)).days[TODAY]?.symptoms).toEqual(['migraine']);
  await clean(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
