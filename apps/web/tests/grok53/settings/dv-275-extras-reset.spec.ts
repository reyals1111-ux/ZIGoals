import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL third pass (lane L6, P-DV-111 rest): Denver DV-275. Settings → My universe / Day timeline / Stories: the resets
// acted on one press, and the line said "erased with your account" to a person with no account. Fresh profile with one
// celebrated milestone, the bot's 768 px. Fails on main (no confirm, old words), passes on the branch.
test.use({viewport: {width: 768, height: 1024}});
test.beforeEach(async ({page}) => {
  await offlineApi(page); await freshDevice(page);
  await page.evaluate(() => localStorage.setItem('zigoals:universe:v1', JSON.stringify({version: 1, celebrated: {'goal-first': '2026-11-03'}})));
});
const stored = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:universe:v1') ?? 'null'));

test('DV-275: a reset asks once in place; Keep it changes nothing; Yes forgets, with Undo; the words need no account', async ({page}) => {
  await page.goto('/app/settings'); await hydrated(page);
  const section = page.locator('.af-extras-setting');
  await expect(section).toContainText('All three stay on this device only: never synced, and included in Export everything.');
  await expect(section).not.toContainText('erased with your account');
  await section.getByRole('button', {name: 'Forget celebrated milestones', exact: true}).click();
  const ask = section.getByRole('group', {name: 'Forget celebrated milestones?'});
  await expect(ask).toBeVisible();
  await ask.getByRole('button', {name: 'Keep it'}).click();
  expect((await stored(page)).celebrated).toEqual({'goal-first': '2026-11-03'});
  await section.getByRole('button', {name: 'Forget celebrated milestones', exact: true}).click();
  await section.getByRole('button', {name: 'Yes, forget celebrated milestones'}).click();
  await expect.poll(async () => (await stored(page))?.celebrated ?? {}).toEqual({});
  await page.getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => (await stored(page))?.celebrated).toEqual({'goal-first': '2026-11-03'});
});
