import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL fifth pass (lane L6): D-005 (the open Data & privacy group held about 8,100 characters). Each backup card's
// "what is in this file" and Export everything's file contents fold under "More about this file"; nothing is removed
// (the words are in the page, one tap away) and each file's name stays in view. Desktop 1440, a fresh empty profile.
test.use({viewport: {width: 1440, height: 900}});
test.skip(({isMobile}) => isMobile, 'The computer\'s Settings page; phones have their own list.');
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });

test('D-005: the Data & privacy group is shorter open; each file’s contents are one tap away, word for word', async ({page}) => {
  await page.goto('/app/settings'); await hydrated(page);
  const group = page.locator('#settings-data');
  const habits = page.getByRole('region', {name: 'Habits backup', exact: true});
  await expect(habits.locator('code')).toBeVisible();
  await expect(habits.locator('code')).toContainText(/^zigoals-habits-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const coverage = habits.locator('.backup-coverage');
  await expect(coverage).toBeHidden();
  await expect(habits).toContainText('In this file:');
  await habits.getByText('More about this file', {exact: true}).click();
  await expect(coverage).toBeVisible();
  await expect(coverage).toContainText('Not in it:');
  await expect(habits).toContainText('Export all habits records, including history. These files contain personal information and no wallet credentials.');
  await expect(page.locator('#export-everything')).toContainText('this makes one ZIP with a JSON file of everything and a CSV per area');
  await expect(page.locator('#settings-data details.backup-more')).toHaveCount(4);
  // What a person reads with the group open (words not under a closed fold), against the replay's 8,094 characters.
  await habits.getByText('More about this file', {exact: true}).click();
  const shown = await group.evaluate(g => { let n = 0; const w = document.createTreeWalker(g, NodeFilter.SHOW_TEXT); while (w.nextNode()) { const p = w.currentNode.parentElement; if (p && p.checkVisibility()) n += (w.currentNode.textContent ?? '').trim().length; } return n; });
  test.info().annotations.push({type: 'visible characters', description: String(shown)});
  expect(shown).toBeLessThan(4_000);
});
