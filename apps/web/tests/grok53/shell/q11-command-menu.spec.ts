import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../../../lib/whats-new';
import {hydrated, offlineApi} from '../../ah-helpers';

/**
 * Session AL (LS-H36, integrator reading Q11): the shell mounts the command menu. ⌘/Ctrl+K opens it on every page and from
 * inside a text field; its first row is "Ask ZIGi" (Enter with nothing typed opens ZIGi; typed words go to ZIGi's message
 * box); a page row navigates; one Escape closes it and the focus goes back. ⌘/Ctrl+Shift+Z opens ZIGi outside a text field
 * (inside one it stays Redo). NOVA keeps ⌘/Ctrl+K for its own field. A fresh empty profile (only the Welcome marked seen),
 * Brussels time, 1280 × 900 Nebula; every /api request answers 503.
 */
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB'});
test.beforeEach(async ({page, isMobile}) => {
  test.skip(isMobile, 'keyboard shortcuts');
  await offlineApi(page);
  await page.setViewportSize({width: 1280, height: 900});
  await page.clock.install({time: new Date('2026-11-04T09:00:00+01:00')});
  await page.goto('/robots.txt');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}),
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}),
    [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
  });
});
const menu = (page: Page) => page.getByRole('dialog', {name: 'Command menu'});
const field = (page: Page) => menu(page).getByRole('combobox', {name: 'Go to a page, run an action or find a task'});
const zigi = (page: Page) => page.locator('dialog.ai-chat[open]');
const composer = (page: Page) => zigi(page).locator('textarea').first();
async function open(page: Page, path: string) {
  await page.goto(path); await hydrated(page);
  await expect(page.locator('main').first()).toBeVisible();
}

test('Q11: on Today ⌘/Ctrl+K opens the menu with Ask ZIGi first; Enter opens ZIGi with its message box focused', async ({page}) => {
  await open(page, '/app');
  await page.locator('body').press('ControlOrMeta+k');
  await expect(menu(page)).toBeVisible();
  await expect(field(page)).toBeFocused();
  await expect(menu(page).getByRole('option').first()).toHaveText(/^Ask ZIGi/);
  await expect(page.getByRole('dialog', {name: 'Search'})).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(menu(page)).toHaveCount(0);
  await expect(zigi(page)).toHaveCount(1);
  await expect(composer(page)).toBeFocused();
});

test('Q11: typed words go to ZIGi’s message box', async ({page}) => {
  await open(page, '/app');
  await page.locator('body').press('ControlOrMeta+k');
  await field(page).pressSequentially('how is my sleep');
  await expect(menu(page).getByRole('option').first()).toHaveText(/Ask ZIGi: “how is my sleep”/);
  await page.keyboard.press('Enter');
  await expect(zigi(page)).toHaveCount(1);
  await expect(composer(page)).toHaveValue('how is my sleep');
});

test('Q11: a page row navigates', async ({page}) => {
  await open(page, '/app');
  await page.locator('body').press('ControlOrMeta+k');
  await field(page).pressSequentially('habits');
  await expect(menu(page).getByRole('group', {name: 'Pages'}).getByRole('option').first()).toContainText('Habits');
  await menu(page).getByRole('group', {name: 'Pages'}).getByRole('option').first().click();
  await expect(page).toHaveURL(/\/app\/habits$/);
  await expect(menu(page)).toHaveCount(0);
});

test('Q11: one Escape closes the menu and the focus goes back where it was', async ({page}) => {
  await open(page, '/app');
  const search = page.getByRole('button', {name: 'Search'}).filter({visible: true}).first();
  await search.focus();
  await page.keyboard.press('ControlOrMeta+k');
  await expect(menu(page)).toBeVisible();
  await page.keyboard.type('xyz');
  await page.keyboard.press('Escape');
  await expect(menu(page)).toHaveCount(0);
  await expect(search).toBeFocused();
  await expect(zigi(page)).toHaveCount(0);
});

test('Q11: ⌘/Ctrl+K opens the menu from inside a text field; ⌘/Ctrl+Shift+Z there does nothing to ZIGi', async ({page}) => {
  await open(page, '/app/tasks');
  const box = page.getByRole('form', {name: 'Add a task'}).getByRole('textbox', {name: 'New task'});
  await box.click();
  await box.pressSequentially('Fictional: water the plants');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await page.waitForTimeout(400);
  await expect(zigi(page)).toHaveCount(0);
  await expect(box).toBeFocused();
  await expect(box).toHaveValue('Fictional: water the plants');
  await page.keyboard.press('ControlOrMeta+k');
  await expect(menu(page)).toBeVisible();
  await expect(field(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu(page)).toHaveCount(0);
  await expect(box).toBeFocused();
});

test('Q11: ⌘/Ctrl+Shift+Z outside a text field opens ZIGi (and closes it from the panel’s buttons); the menu stays shut', async ({page}) => {
  await open(page, '/app');
  await page.locator('body').press('ControlOrMeta+Shift+z');
  await expect(zigi(page)).toHaveCount(1);
  await expect(menu(page)).toHaveCount(0);
  // Away from the message box (a button in the panel has the focus), the same key closes the panel.
  await zigi(page).getByRole('button').first().focus();
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(zigi(page)).toHaveCount(0);
});

test('Q11: NOVA keeps ⌘/Ctrl+K for its own field; no command menu there', async ({page}) => {
  await open(page, '/app/nova');
  const novaField = page.locator('.nova-command input').first();
  await expect(novaField).toBeVisible();
  await page.locator('body').press('ControlOrMeta+k');
  await expect(novaField).toBeFocused();
  await expect(menu(page)).toHaveCount(0);
});
