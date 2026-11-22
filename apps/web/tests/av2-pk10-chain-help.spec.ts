import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {openSettings} from './settings-open';
import {CHAIN_HELP, CHAIN_HELP_IDS, CHAIN_HELP_NOTE} from '../lib/help/chain-help';

/**
 * Session AV lane 2 (PK-10, owner decision 21 Nov, follow-up 3): "the chain Help topics are hidden while no chain is
 * chosen, and they still turn up in Help search with a note on how to choose one." A fresh profile on an installation
 * without accounts (the API answers 503). Needs the help-page.tsx patch in docs/review/session-av/lane2/pk10.md.
 */
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });

const palette = (page: Page) => page.getByRole('dialog', {name: 'Search'});
async function settled(page: Page, path: string) {
  await page.goto(path); await hydrated(page);
  // The shell shows the workspace once the stores are read, and with them the chain choice.
  await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy', 'true');
}
async function search(page: Page, words: string) {
  await settled(page, '/app');
  await page.locator('body').press('/');
  await expect(palette(page)).toBeVisible();
  await palette(page).getByRole('combobox').fill(words);
}

test('a fresh profile: no chain answer in Help, plain headings, and every other answer as before', async ({page}) => {
  await settled(page, '/app/help');
  await expect(page.locator('#help-al-chess > summary')).toBeVisible();
  for (const id of CHAIN_HELP_IDS) await expect(page.locator(`#help-${id}`), id).toHaveCount(0);
  await expect(page.getByText('Are my Goals on the blockchain?', {exact: true})).toHaveCount(0);
  // The general answers that mention a wallet in passing stay.
  for (const id of ['z-alpha', 'z-about', 'your-ai-what', 'nova-privacy', 'aj-alerts', 'ah-freshness']) await expect(page.locator(`#help-${id} > summary`), id).toBeVisible();
  for (const question of ['Is any of this real money?', 'Where do prices come from?']) await expect(page.getByText(question, {exact: true})).toBeVisible();
  // The headings that named the chain say the plain words; the topic keeps its place and link.
  const nav = page.getByRole('navigation', {name: 'Help topics'});
  if ((page.viewportSize()?.width ?? 1280) < 768) await nav.getByRole('button', {name: 'All topics', exact: true}).click();
  await expect(nav.getByRole('link', {name: 'More pages and Chess', exact: true})).toHaveAttribute('href', '#more-pages');
  await expect(nav).not.toContainText(/Earn|Staking/);
  await expect(page.getByRole('region', {name: 'More pages and Chess', exact: true})).toBeVisible();
  await expect(page.getByRole('region', {name: 'ZIGi, and your day as one path', exact: true})).toBeVisible();
  await expect(page.locator('#af > .eyebrow')).toHaveText('ZIGI AND THE CHECKLIST');
  await expect(page.locator('#ae > .eyebrow')).toHaveText('TODAY’S SCENE AND THE SIDEBAR');
  await expect(page.locator('.help-chain-note')).toHaveCount(0);
});

test('Search finds a chain answer with the note, and opens it in Help with the note on top', async ({page}) => {
  await search(page, 'stake zig');
  const option = palette(page).getByRole('option').filter({hasText: 'Can I stake ZIG from ZIGoals?'});
  await expect(option).toHaveCount(1);
  await expect(option).toContainText(CHAIN_HELP_NOTE);
  await option.click();
  await expect(page).toHaveURL(/\/app\/help#help-af-staking$/);
  const answer = page.locator('#help-af-staking');
  await expect(answer).toHaveAttribute('open', '');
  const note = answer.locator('.help-chain-note');
  await expect(note).toHaveText(CHAIN_HELP_NOTE);
  await expect(note.getByRole('link', {name: 'Settings → Your pages & buttons', exact: true})).toHaveAttribute('href', '/app/settings#your-pages');
  await expect(answer).toContainText('you sign it in Keplr. ZIGoals never sees your keys and sends nothing on its own');
  // Only the answer the link named shows; the other chain answers still wait.
  for (const id of CHAIN_HELP_IDS.filter(id => id !== 'af-staking')) await expect(page.locator(`#help-${id}`), id).toHaveCount(0);
  // It stays while the reader follows another link on the page.
  await page.locator('#af').getByRole('link', {name: '↑ Back to the topics'}).click();
  await expect(answer).toHaveCount(1);
});

test('Help’s own search lists the matching chain answers with the note, and each opens in place', async ({page}) => {
  await settled(page, '/app/help');
  await page.getByRole('searchbox', {name: 'Search Help'}).fill('validator');
  await expect(page.locator('.help-search [role="status"]')).toContainText('1 answer about the money and chain pages matches, listed under the search.');
  const list = page.getByRole('list', {name: 'Answers about the money and chain pages'});
  await expect(page.locator('.help-search-chain > p')).toHaveText(CHAIN_HELP_NOTE);
  const link = list.getByRole('link', {name: 'What are validator alerts?', exact: true});
  await expect(link).toHaveAttribute('href', '#help-af-validator-alerts');
  expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await link.click();
  const answer = page.locator('#help-af-validator-alerts');
  await expect(answer).toHaveAttribute('open', '');
  await expect(answer.locator('summary')).toBeFocused();
  await expect(answer.locator('.help-chain-note')).toHaveText(CHAIN_HELP_NOTE);
  await expect(answer).toContainText('ZIGoals sends no notifications');
  // Now on the page, it is found the usual way and no longer listed.
  await expect(list).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test('after switching Staking on, every chain answer shows in Help, without the note, and Search drops the note', async ({page}) => {
  await openSettings(page);
  const staking = page.getByRole('region', {name: 'Your pages & buttons', exact: true}).getByRole('switch', {name: 'Staking', exact: true});
  await expect(staking).not.toBeChecked();
  await staking.click();
  await expect(staking).toBeChecked();
  await settled(page, '/app/help');
  for (const [id, question] of CHAIN_HELP) await expect(page.locator(`#help-${id} > summary`), id).toHaveText(question);
  await expect(page.getByText('Are my Goals on the blockchain?', {exact: true})).toBeVisible();
  await expect(page.locator('.help-chain-note')).toHaveCount(0);
  await expect(page.getByRole('region', {name: 'Earn, Staking, Governance, Ecosystem and Chess', exact: true})).toBeVisible();
  await expect(page.getByRole('region', {name: 'Earn, stake in your own wallet, and your day as one path', exact: true})).toBeVisible();
  await page.getByRole('searchbox', {name: 'Search Help'}).fill('validator');
  await expect(page.locator('#help-af-validator-alerts')).toHaveAttribute('open', '');
  await expect(page.locator('.help-search-chain')).toHaveCount(0);
  await search(page, 'stake zig');
  const option = palette(page).getByRole('option').filter({hasText: 'Can I stake ZIG from ZIGoals?'});
  await expect(option).toHaveCount(1);
  await expect(option).not.toContainText('money and chain pages');
});
