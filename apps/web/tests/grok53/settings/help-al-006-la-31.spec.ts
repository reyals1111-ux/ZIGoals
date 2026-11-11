import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL third pass (lane L6): Professor PR-032 / PR-034 / X3-27 (AL-HELP-006, P-PR-30), Lisbon N-LA-07 (P-LA-31) and
// the Help part of Denver C-DVG-87 (GAP-165). Fresh profile (the notice shows), desktop 1280. Fails on main, passes on the branch.
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });

test('X3-27: Help quotes the notice the top of the page shows', async ({page}) => {
  await page.goto('/app/help'); await hydrated(page);
  const notice = page.getByRole('complementary', {name: 'Alpha notice'});
  await expect(notice).toContainText('PUBLIC ALPHA');
  await expect(notice).toContainText('Your records stay in this browser and are not a backup.');
  await page.goto('/app/help#help-z-alpha');
  const answer = page.locator('#help-z-alpha');
  await expect(answer).toHaveAttribute('open', '');
  await expect(answer).toContainText('The notice reads PUBLIC ALPHA “Your records stay in this browser and are not a backup.”');
});

test('PR-032: Known limitations says the Lichess limit is about starting a game, and blitz ratings still show', async ({page}) => {
  await page.goto('/app/help'); await hydrated(page);
  const limits = page.locator('#known-limitations');
  await expect(limits).not.toContainText('Lichess games found from ZIGoals are rapid or classical only');
  await expect(limits).toContainText('A new Lichess game started from ZIGoals is rapid or classical only');
  await expect(limits).toContainText('Your blitz and bullet ratings and finished games are still read and shown in Chess');
});

test('PR-034: What\'s new opens with this version — NOVA, Notes, Tasks, the Checklist — and each link opens its answer', async ({page}) => {
  await page.goto('/app/help'); await hydrated(page);
  const list = page.locator('#whats-new-alpha .help-whats-new-now');
  // Session AM (ADR-038, deliberate): NOVA's stage leads this version's list, so it holds thirteen links (it held twelve).
  await expect(list.getByRole('link')).toHaveCount(13);
  await expect(list.getByRole('link', {name: /^NOVA makes a widget for what you ask/})).toHaveAttribute('href', '#help-nova-stage');
  for (const name of [/^NOVA: your private command center/, /^Notes that link/, /^Tasks with a calendar import/, /^The Checklist: your day as one path/]) await expect(list.getByRole('link', {name})).toBeVisible();
  for (const link of await list.getByRole('link').all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await list.getByRole('link', {name: /^Tasks with a calendar import/}).click();
  await expect(page).toHaveURL(/#help-tasks-what$/);
  await expect(page.locator('#help-tasks-what')).toHaveAttribute('open', '');
});

test('N-LA-07: Help lists the private screens that pause ZIGi, and why', async ({page}) => {
  await page.goto('/app/help#help-your-ai-private'); await hydrated(page);
  const answer = page.locator('#help-your-ai-private');
  await expect(answer).toHaveAttribute('open', '');
  for (const words of ['the Checklist', 'the screen cover', 'your recovery secret', 'a one-time code', 'Why:', 'Show my checklist']) await expect(answer).toContainText(words);
});

test('C-DVG-87: every Help topic says when it was last updated', async ({page}) => {
  await page.goto('/app/help'); await hydrated(page);
  const topics = page.locator('section.help-section');
  const count = await topics.count();
  expect(count).toBeGreaterThan(15);
  await expect(page.locator('section.help-section .help-updated')).toHaveCount(count);
  await expect(page.locator('#known-limitations .help-updated')).toHaveText(/^Last updated (Nov|Oct|Dec) \d{1,2}, 2026( or earlier)?$/);
});
