import {expect, test} from '@playwright/test';

// Session W Part 24: Settings in six labelled groups, Data & privacy first; every section keeps its id and sits in its
// group; the chips (computers and tablets) jump to the groups, as the phone's grouped list does on phones.
const GROUPS: [id: string, title: string, sections: string[]][] = [
  ['settings-data', 'Data & privacy', ['privacy', 'private-vault', 'export-everything', 'switch-import']],
  ['settings-app', 'Your app', ['showcase', 'your-pages', 'time-zone', 'wrap-up', 'appearance', 'music', 'links']],
  ['settings-areas', 'Your areas', ['habits-settings', 'health-settings', 'chess', 'guide', 'reminders', 'market-data']],
  ['settings-account', 'Account & devices', ['encrypted-sync', 'account', 'network', 'contract']],
  ['settings-zigi', 'ZIGi', ['your-ai']],
  ['settings-help', 'Help & diagnostics', ['diagnostics', 'send-feedback']], // Session X Part 11: Send feedback
];
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('Settings: six labelled groups in order, each holding its sections; the chips jump to them', async ({page, isMobile}) => {
  await page.goto('/app/settings');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  const groups = page.locator('.settings-group');
  await expect(groups).toHaveCount(GROUPS.length);
  expect(await groups.evaluateAll(list => list.map(g => g.id))).toEqual(GROUPS.map(g => g[0]));
  for (const [id, title, sections] of GROUPS) {
    const group = page.getByRole('group', {name: title, exact: true});
    await expect(group).toHaveAttribute('id', id);
    await expect(group.locator('.settings-group-title')).toHaveText(title);
    for (const section of sections) await expect(group.locator(`#${section}`), `${title} holds #${section}`).toHaveCount(1);
  }
  if (isMobile) return;
  const chips = page.locator('.settings-sections a');
  await expect(chips).toHaveText(GROUPS.map(g => g[1]));
  await chips.filter({hasText: 'ZIGi'}).click();
  await expect(page).toHaveURL(/#settings-zigi$/);
  await expect(page.locator('#settings-zigi-title')).toBeInViewport();
});
