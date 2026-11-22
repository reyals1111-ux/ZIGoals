import {expect, test, type Page} from '@playwright/test';
import {createVault} from '../lib/vault/crypto';
import {openSettings} from './settings-open';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (sync; LEDGER #41 Day One, #134 YNAB, #209 Strong; TIER 3 (sync)): Settings → Account & sync offers
 * the journal, the money records and the workout log in the encrypted extras sync, each unticked until the person ticks
 * it on this device. Account requests are answered by fixtures (as in remember-device.spec.ts); the sync itself is proven
 * in lib/vault/av2-extras-choice.test.ts and against the real Worker in scripts/run11/av2-extras-choice.test.mjs.
 */
const account = '10000000-0000-4000-8000-000000000001', session = '20000000-0000-4000-8000-000000000002';
const panel = (page: Page) => page.getByRole('region', {name: 'Encrypted account sync', exact: true});
const head = {revision: 0, generation: 0, epoch: null, parts: 0};

async function unlocked(page: Page) {
  const vault = await createVault();
  await page.route('**/api/private-account*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET') {
      if (url.searchParams.get('action') === 'status') return route.fulfill({json: {signedIn: true, accountId: account}});
      if (url.searchParams.get('action') === 'sessions') return route.fulfill({json: {sessions: [{id: session, label: 'Fixture browser', createdAt: '2026-11-20T10:00:00.000Z', current: true}]}});
      // The sync service as deployed today: it lists the six sections and none of the three chosen ones (what a sync then
      // says is proven in the unit and Worker tests; here the account's own sync is refused, so it may not get that far).
      if (url.searchParams.get('action') === 'extras') {
        const section = url.searchParams.get('section');
        if (section) return route.fulfill({json: {protocol: 1, section, revision: 0, generation: 0, epoch: null, parts: []}});
        return route.fulfill({json: {protocol: 1, sections: {goals: head, life: head, habits: head, health: head, checklist: head, nova: head}}});
      }
      return route.fulfill({json: {protocol: 1, revision: 1, manifest: vault.manifest, records: [], cursor: null}});
    }
    return route.fulfill({status: 503, json: {error: 'FIXTURE_ONLY'}});
  });
  await openSettings(page);
  await panel(page).getByLabel('Vault recovery secret', {exact: true}).fill(vault.recovery);
  await panel(page).getByRole('button', {name: 'Unlock account vault', exact: true}).click();
  await expect(panel(page).getByRole('button', {name: 'Lock account vault', exact: true})).toBeVisible();
}
const stored = (page: Page) => page.evaluate(() => {
  for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i)!; if (key.endsWith('zigoals:extras-sync-choice:v1')) return JSON.parse(localStorage.getItem(key)!); }
  return null;
});

for (const theme of THEMES) test(`${theme}: the journal, money records and workout log are each unticked until chosen, said in plain words, keyboard and axe clean`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await unlocked(page);
  const extras = page.locator('[data-region="extras-sync"]');
  const group = extras.getByRole('group', {name: /Also, if you choose/});
  await expect(group).toBeVisible();
  const journal = group.getByRole('checkbox', {name: 'Also sync my journal', exact: true});
  const money = group.getByRole('checkbox', {name: 'Also sync my money records', exact: true});
  const workouts = group.getByRole('checkbox', {name: 'Also sync my workout log', exact: true});
  for (const box of [journal, money, workouts]) await expect(box).not.toBeChecked();
  await expect(journal).toHaveAccessibleDescription(/Photos and voice notes stay on the device where you added them/);
  await expect(money).toHaveAccessibleDescription(/spending log, budgets and pay periods, bills, rules, tags/);
  await expect(workouts).toHaveAccessibleDescription(/This is Health data, so it travels only while Health sync is on\./);
  // Ticked with the keyboard: the choice is kept on this device, inside the extras' own choice.
  // Session AV lane 2 (the boxes are disabled while the sync that the unlock starts is busy, and a choice is written after a
  // lazy import, so the box follows it a moment later: each waits for its box to be enabled, and is clicked, then its state
  // read, deliberate)
  await expect(journal).toBeEnabled();
  await journal.focus();
  await page.keyboard.press('Space');
  await expect(journal).toBeChecked();
  await expect(journal).toBeFocused();
  await expect.poll(async () => (await stored(page))?.sections).toEqual({journal: true});
  await expect(money).toBeEnabled();
  await money.click();
  await expect(money).toBeChecked();
  await expect.poll(async () => (await stored(page))?.sections).toEqual({journal: true, money: true});
  // "Remove … from the cloud" asks first; "Keep it" keeps focus on the control.
  await group.getByRole('button', {name: 'Remove my journal from the cloud…', exact: true}).click();
  await group.getByRole('button', {name: 'Keep it', exact: true}).click();
  await expect(group.getByRole('button', {name: 'Remove my journal from the cloud…', exact: true})).toBeFocused();
  await expect(money).toBeEnabled();
  await money.click();
  await expect(money).not.toBeChecked();
  await expect.poll(async () => (await stored(page))?.sections).toEqual({journal: true});
  const findings = await axe(page, extras);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
