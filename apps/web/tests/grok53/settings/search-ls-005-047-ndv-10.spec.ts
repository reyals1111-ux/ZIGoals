import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';
import {openSettings} from '../../settings-open';

// Session AL (lane L6, second pass): global search (Lisbon LS-005/LS-047, Professor PR-102/PR-112, Denver N-DV-10).
// Desktop 1280, a fresh empty profile with three fictional tasks and one Checklist item.
test.use({viewport: {width: 1280, height: 900}, timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await page.clock.setFixedTime(new Date('2026-11-04T10:00:00+01:00'));
  await offlineApi(page); await freshDevice(page);
  await page.evaluate(() => {
    const at = '2026-11-01T08:00:00.000Z';
    localStorage.setItem('zigoals:tasks:v1', JSON.stringify({version: 1, projects: [{id: 'p-home', name: 'Home', colour: 'grey', order: 0}], tasks: [
      {id: 't-bill', title: 'Pay the electricity bill', priority: 'high', level: 1, due: '2026-11-04', labels: ['bills'], createdAt: at},
      {id: 't-dentist', title: 'Book the dentist', priority: 'normal', due: '2026-11-01', createdAt: at},
      {id: 't-passport', title: 'Renew passport', priority: 'normal', projectId: 'p-home', createdAt: at},
    ]}));
  });
});
const palette = (page: Page) => page.getByRole('dialog', {name: 'Search'});
async function openSearch(page: Page) { await page.keyboard.press('/'); await expect(palette(page)).toBeVisible(); return palette(page).getByRole('combobox'); }

test('LS-005: a task is found by its words and opens on Tasks', async ({page}) => {
  await page.goto('/app'); await hydrated(page);
  const box = await openSearch(page);
  await box.fill('dentist');
  const row = palette(page).getByRole('option', {name: /Book the dentist/});
  await expect(row).toContainText('overdue');
  await expect(palette(page).getByRole('group', {name: 'Tasks'})).toBeVisible();
  await row.click();
  await expect(page).toHaveURL(/\/app\/tasks\?task=t-dentist/);
});

test('LS-047: operators — "p1 & today", "#Home", "@bills" — find tasks as on the Tasks page', async ({page}) => {
  await page.goto('/app'); await hydrated(page);
  const box = await openSearch(page);
  // A typed operator names the group "Tasks matching …"; a bare word such as "overdue" keeps the plain "Tasks" group.
  for (const [query, title, name] of [['p1 & today', 'Pay the electricity bill', 'Tasks matching p1 & today'], ['#Home', 'Renew passport', 'Tasks matching #Home'], ['@bills', 'Pay the electricity bill', 'Tasks matching @bills'], ['overdue', 'Book the dentist', 'Tasks']] as const) {
    await box.fill(query);
    const group = palette(page).getByRole('group', {name, exact: true});
    await expect(group.getByRole('option')).toHaveCount(1);
    await expect(group.getByRole('option')).toContainText(title);
  }
});

test('PR-102/PR-112: an Ecosystem project is found by name', async ({page}) => {
  // P14-A (run 2): consumer first (AK X1). On a fresh device the Ecosystem page is off, and Search offers no project of a
  // page the person has not switched on (components/search/search-palette.tsx `pageShown`). So the person first switches
  // Ecosystem on in Settings → Your pages & buttons, as a person does; before that, no Ecosystem group shows.
  await page.goto('/app'); await hydrated(page);
  let box = await openSearch(page);
  await box.fill('valdora');
  await expect(palette(page).getByRole('group', {name: 'Ecosystem projects'})).toHaveCount(0);
  await page.keyboard.press('Escape');
  await openSettings(page); await hydrated(page);
  const ecosystem = page.getByRole('region', {name: 'Your pages & buttons'}).getByRole('switch', {name: 'Ecosystem', exact: true});
  await ecosystem.click(); // a controlled switch: it shows the saved choice once saved
  await expect(ecosystem).toBeChecked();
  await page.goto('/app'); await hydrated(page);
  box = await openSearch(page);
  await box.fill('valdora');
  await expect(palette(page).getByRole('group', {name: 'Ecosystem projects'}).getByRole('option', {name: /Valdora/})).toBeVisible();
});

test('N-DV-10: with Search open over NOVA, one click on "Your day" closes Search and opens Your day', async ({page}) => {
  await page.goto('/app/nova'); await hydrated(page);
  await page.getByRole('button', {name: 'Search ZIGoals'}).click();
  await expect(palette(page)).toBeVisible();
  const day = page.getByRole('button', {name: 'Your day'});
  const box = await day.boundingBox();
  expect(box).not.toBeNull();
  // The palette covers the page as a modal: the click lands on its backdrop, at the button's place.
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(palette(page)).toBeHidden();
  await expect(page.getByRole('dialog', {name: /Your day/}).or(page.getByRole('region', {name: /Your day/})).first()).toBeVisible();
});
